import * as cheerio from 'cheerio'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://resultados.abccmm.org.br/'

export type TipoProva = 'marcha' | 'morfologia' | 'funcional' | 'final'

const TIPOS_PROVA: TipoProva[] = ['marcha', 'morfologia', 'funcional', 'final']

export type ClasseResultado = {
  tipoCampeonato: string
  tipoMarcha: string
  categoria: string
  categoriaAbccmm: number
  campeonatoAbccmm: number
  eventoAbccmm: number
  // Nem toda categoria tem as 4 provas (ex: potros nao tem prova funcional) -
  // ausente aqui, em vez de apontar pra URL errada (a home do site, se o
  // href da coluna estiver vazio).
  urls: Partial<Record<TipoProva, string>>
}

export type LinhaResultado = {
  numCatalogo: string
  nomeAnimal: string
  idAnimalAbccmm: number | null
  pontuacao: string | null
  colocacao: string | null
}

function parseQueryParam(url: string, param: string): number | null {
  const match = url.match(new RegExp(`[?&]${param}=(\\d+)`))
  return match ? parseInt(match[1], 10) : null
}

// "fetch failed" do Node/undici e so um envelope: a causa real (DNS, TLS,
// timeout, conexao recusada) fica em error.cause. Sem isso a mensagem nao diz
// nada sobre o que de fato deu errado.
function describeFetchError(e: unknown): string {
  const err = e as (Error & { cause?: unknown }) | undefined
  const parts: string[] = []
  let atual: unknown = err
  let voltas = 0
  while (atual && voltas < 5) {
    const msg = atual instanceof Error ? atual.message : String(atual)
    if (msg && !parts.includes(msg)) parts.push(msg)
    atual = atual instanceof Error ? (atual as Error & { cause?: unknown }).cause : undefined
    voltas++
  }
  return parts.join(' <- ') || 'erro desconhecido'
}

const FETCH_HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; NacionalMMBot/1.0)' }
// 30s por tentativa deixava o pior caso por tarefa (timeout + 2 retries)
// passar de 1min e meio - com ~200+ categorias x 4 provas, isso sozinho ja
// come boa parte (ou tudo) do tempo disponivel da funcao antes de terminar
// de processar o catalogo inteiro. Reduzido pra girar o pool de concorrencia
// mais rapido; o site costuma responder bem antes disso quando esta de pe.
const FETCH_TIMEOUT_MS = 15000
const FETCH_RETRIES = 2

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// resultados.abccmm.org.br e um site pequeno/lento e falha bastante sob
// concorrencia (timeouts intermitentes) - tenta de novo antes de desistir.
async function fetchComTimeout(url: string): Promise<Response> {
  let ultimoErro: unknown
  for (let tentativa = 0; tentativa <= FETCH_RETRIES; tentativa++) {
    try {
      return await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    } catch (e) {
      ultimoErro = e
      if (tentativa < FETCH_RETRIES) await sleep(1000 * (tentativa + 1))
    }
  }
  throw ultimoErro
}

// Busca o indice de categorias/marcha/campeonato e os links das 4 provas de cada uma.
export async function fetchClasses(): Promise<ClasseResultado[]> {
  let res: Response
  try {
    res = await fetchComTimeout(`${BASE_URL}Resultados.aspx`)
  } catch (e) {
    throw new Error(describeFetchError(e))
  }
  if (!res.ok) throw new Error(`Resultados.aspx respondeu ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  const classes: ClasseResultado[] = []

  $('tr').each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length < 5) return

    const label = $(cells[0]).text().trim()
    const partes = label.split(' - ').map(s => s.trim()).filter(Boolean)
    if (partes.length < 3) return
    const [tipoCampeonato, tipoMarcha, ...resto] = partes
    const categoria = resto.join(' - ').trim()
    if ((tipoMarcha !== 'MB' && tipoMarcha !== 'MP') || !categoria) return

    const marchaHref = $(cells[1]).find('a').attr('href') || ''
    const morfologiaHref = $(cells[2]).find('a').attr('href') || ''
    const funcionalHref = $(cells[3]).find('a').attr('href') || ''
    const finalHref = $(cells[4]).find('a').attr('href') || ''
    if (!marchaHref) return

    const categoriaAbccmm = parseQueryParam(marchaHref, 'categoria')
    const campeonatoAbccmm = parseQueryParam(marchaHref, 'campeonato')
    const eventoAbccmm = parseQueryParam(marchaHref, 'evento')
    if (categoriaAbccmm == null || campeonatoAbccmm == null || eventoAbccmm == null) return

    classes.push({
      tipoCampeonato,
      tipoMarcha,
      categoria,
      categoriaAbccmm,
      campeonatoAbccmm,
      eventoAbccmm,
      urls: {
        marcha: new URL(marchaHref, BASE_URL).toString(),
        ...(morfologiaHref ? { morfologia: new URL(morfologiaHref, BASE_URL).toString() } : {}),
        ...(funcionalHref ? { funcional: new URL(funcionalHref, BASE_URL).toString() } : {}),
        ...(finalHref ? { final: new URL(finalHref, BASE_URL).toString() } : {}),
      },
    })
  })

  return classes
}

// Busca uma tabela de resultado (Andamento/Morfologia/Funcional/Final). Uma
// categoria ainda nao julgada simplesmente retorna uma tabela vazia.
export async function fetchResultTable(url: string): Promise<LinhaResultado[]> {
  let res: Response
  try {
    res = await fetchComTimeout(url)
  } catch (e) {
    throw new Error(describeFetchError(e))
  }
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  // A pagina de Resultado Final tem uma tabela "mGrid" vazia (placeholder de
  // layout, id contem "tblMarchadorIdeal") ANTES da tabela de verdade
  // (id contem "grvDetalhe") - sem exigir linha de dados aqui, ".first()"
  // pegava a vazia e a prova de final ficava sem nenhum resultado salvo.
  // Colunas variam por prova: Final tem 6 (N, Competidor, Funcional,
  // Morfologia, Andamento, Classificacao), mas Morfologia/Funcional isolados
  // podem ter so 3 (N, Competidor, Pontuacao) - exigir 4 aqui descartava
  // essas provas inteiras.
  const tabela = $('table')
    .filter((_, el) => {
      const $el = $(el)
      const id = $el.attr('id') || ''
      const cls = $el.attr('class') || ''
      if (!(id.includes('grv') || cls.includes('mGrid'))) return false
      return $el.find('tr').toArray().some(tr => {
        const $tr = $(tr)
        return $tr.find('th').length === 0 && $tr.find('td').length >= 3
      })
    })
    .first()

  const linhas: LinhaResultado[] = []
  if (tabela.length === 0) return linhas

  tabela.find('tr').each((_, tr) => {
    const $tr = $(tr)
    if ($tr.find('th').length > 0) return // linha de cabecalho

    const cells = $tr.find('td')
    if (cells.length < 3) return

    const numCatalogo = $(cells[0]).text().trim()
    if (!numCatalogo) return

    const link = $(cells[1]).find('a')
    const nomeAnimal = (link.text() || $(cells[1]).text()).trim()
    const hrefAnimal = link.attr('href') || ''
    const idMatch = hrefAnimal.match(/idAnimal=(\d+)/)
    const idAnimalAbccmm = idMatch ? parseInt(idMatch[1], 10) : null

    // Com 3 colunas so ha pontuacao (sem colocacao separada ainda); com 4+
    // as duas ultimas sao pontuacao e colocacao/classificacao.
    const pontuacao = cells.length >= 4 ? ($(cells[cells.length - 2]).text().trim() || null) : ($(cells[cells.length - 1]).text().trim() || null)
    const colocacao = cells.length >= 4 ? ($(cells[cells.length - 1]).text().trim() || null) : null

    linhas.push({ numCatalogo, nomeAnimal, idAnimalAbccmm, pontuacao, colocacao })
  })

  return linhas
}

async function withConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let idx = 0
  async function run() {
    while (idx < items.length) {
      const current = idx++
      await worker(items[current])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
}

export type RefreshSummary = {
  classesProcessadas: number
  linhasAtualizadas: number
  erros: string[]
}

const BATCH = 300

// Busca o indice de categorias e as 4 provas de cada uma, e grava tudo no
// Supabase. Concorrencia limitada para nao sobrecarregar o site da ABCCMM.
//
// Salva incrementalmente (a cada BATCH linhas prontas) em vez de acumular
// tudo em memoria e so gravar no final: com ~200+ categorias x 4 provas e o
// site da ABCCMM sendo lento/instavel, a sincronizacao inteira pode passar
// dos 300s de limite da funcao na Vercel - se so salvasse no final, um
// timeout no meio do caminho perdia TUDO que ja tinha sido raspado com
// sucesso. Salvando aos poucos, o que ja foi processado fica gravado mesmo
// que a funcao seja encerrada antes de terminar (a proxima sincronizacao
// so completa o que faltou).
export async function refreshAllResults(): Promise<RefreshSummary> {
  const erros: string[] = []

  let classes: ClasseResultado[]
  try {
    classes = await fetchClasses()
  } catch (e) {
    return { classesProcessadas: 0, linhasAtualizadas: 0, erros: [`Falha ao buscar Resultados.aspx: ${(e as Error).message}`] }
  }

  const tarefas = classes.flatMap(classe =>
    TIPOS_PROVA.filter(tipo => classe.urls[tipo]).map(tipo => ({ classe, tipo }))
  )
  const semLink: Record<TipoProva, number> = { marcha: 0, morfologia: 0, funcional: 0, final: 0 }
  for (const classe of classes) {
    for (const tipo of TIPOS_PROVA) {
      if (!classe.urls[tipo]) semLink[tipo]++
    }
  }
  let pendentes: Record<string, unknown>[] = []
  let totalSalvo = 0

  async function flush() {
    if (pendentes.length === 0) return
    const lote = pendentes
    pendentes = []
    const { error } = await supabase.rpc('nm_admin_upsert_resultados', { p_rows: lote })
    if (error) erros.push(`Falha ao salvar lote de ${lote.length} linhas: ${error.message}`)
    else totalSalvo += lote.length
  }

  await withConcurrency(tarefas, 3, async ({ classe, tipo }) => {
    try {
      const url = classe.urls[tipo]
      if (!url) return
      const resultado = await fetchResultTable(url)
      for (const linha of resultado) {
        pendentes.push({
          tipo_campeonato: classe.tipoCampeonato,
          tipo_marcha: classe.tipoMarcha,
          categoria: classe.categoria,
          tipo_prova: tipo,
          num_catalogo: linha.numCatalogo,
          nome_animal: linha.nomeAnimal,
          id_animal_abccmm: linha.idAnimalAbccmm,
          categoria_abccmm: classe.categoriaAbccmm,
          campeonato_abccmm: classe.campeonatoAbccmm,
          evento_abccmm: classe.eventoAbccmm,
          pontuacao: linha.pontuacao,
          colocacao: linha.colocacao,
        })
      }
      if (pendentes.length >= BATCH) await flush()
    } catch (e) {
      erros.push(`${classe.tipoCampeonato} ${classe.tipoMarcha} ${classe.categoria} (${tipo}): ${(e as Error).message}`)
    }
  })

  await flush()

  // Nao e erro (categoria pode legitimamente nao ter uma prova - ex: potro
  // sem funcional), mas ajuda a diferenciar "nao tem link" de "falhou ao
  // buscar" quando uma prova aparece sistematicamente vazia.
  const semLinkMsg = TIPOS_PROVA
    .filter(tipo => semLink[tipo] > 0)
    .map(tipo => `${tipo}: ${semLink[tipo]} categorias sem link nessa prova`)
  if (semLinkMsg.length > 0) erros.push(`[info] ${semLinkMsg.join(' | ')}`)

  return { classesProcessadas: classes.length, linhasAtualizadas: totalSalvo, erros }
}
