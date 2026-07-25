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
  urls: Record<TipoProva, string>
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
const FETCH_TIMEOUT_MS = 30000
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
        morfologia: new URL(morfologiaHref, BASE_URL).toString(),
        funcional: new URL(funcionalHref, BASE_URL).toString(),
        final: new URL(finalHref, BASE_URL).toString(),
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
  const tabela = $('table')
    .filter((_, el) => {
      const $el = $(el)
      const id = $el.attr('id') || ''
      const cls = $el.attr('class') || ''
      if (!(id.includes('grv') || cls.includes('mGrid'))) return false
      return $el.find('tr').toArray().some(tr => {
        const $tr = $(tr)
        return $tr.find('th').length === 0 && $tr.find('td').length >= 4
      })
    })
    .first()

  const linhas: LinhaResultado[] = []
  if (tabela.length === 0) return linhas

  tabela.find('tr').each((_, tr) => {
    const $tr = $(tr)
    if ($tr.find('th').length > 0) return // linha de cabecalho

    const cells = $tr.find('td')
    if (cells.length < 4) return

    const numCatalogo = $(cells[0]).text().trim()
    if (!numCatalogo) return

    const link = $(cells[1]).find('a')
    const nomeAnimal = (link.text() || $(cells[1]).text()).trim()
    const hrefAnimal = link.attr('href') || ''
    const idMatch = hrefAnimal.match(/idAnimal=(\d+)/)
    const idAnimalAbccmm = idMatch ? parseInt(idMatch[1], 10) : null

    const pontuacao = $(cells[cells.length - 2]).text().trim() || null
    const colocacao = $(cells[cells.length - 1]).text().trim() || null

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

// Busca o indice de categorias e as 4 provas de cada uma, e grava tudo no
// Supabase. Concorrencia limitada para nao sobrecarregar o site da ABCCMM.
export async function refreshAllResults(): Promise<RefreshSummary> {
  const erros: string[] = []

  let classes: ClasseResultado[]
  try {
    classes = await fetchClasses()
  } catch (e) {
    return { classesProcessadas: 0, linhasAtualizadas: 0, erros: [`Falha ao buscar Resultados.aspx: ${(e as Error).message}`] }
  }

  const linhas: Record<string, unknown>[] = []
  const tarefas = classes.flatMap(classe => TIPOS_PROVA.map(tipo => ({ classe, tipo })))

  await withConcurrency(tarefas, 3, async ({ classe, tipo }) => {
    try {
      const resultado = await fetchResultTable(classe.urls[tipo])
      for (const linha of resultado) {
        linhas.push({
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
    } catch (e) {
      erros.push(`${classe.tipoCampeonato} ${classe.tipoMarcha} ${classe.categoria} (${tipo}): ${(e as Error).message}`)
    }
  })

  const BATCH = 500
  for (let i = 0; i < linhas.length; i += BATCH) {
    const lote = linhas.slice(i, i + BATCH)
    const { error } = await supabase.rpc('nm_admin_upsert_resultados', { p_rows: lote })
    if (error) erros.push(`Falha ao salvar lote ${i}-${i + lote.length}: ${error.message}`)
  }

  return { classesProcessadas: classes.length, linhasAtualizadas: linhas.length, erros }
}
