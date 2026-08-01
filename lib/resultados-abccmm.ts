import * as cheerio from 'cheerio'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://resultados.abccmm.org.br/'

// Antes raspava 4 paginas por categoria (Marcha/Morfologia/Funcional/Final).
// A pagina "Final" (DetalheFinal.aspx) ja traz tudo isso numa unica tabela
// (colunas Nº/Competidor/Funcional/Morfologia/Andamento/Classificação),
// entao so ela e buscada agora - 1 request por categoria em vez de ate 4,
// o que ataca direto tanto a demora da sincronizacao quanto a falta de
// dado nas provas que raramente tinham link proprio na pagina indice.

export type ClasseResultado = {
  tipoCampeonato: string
  tipoMarcha: string
  categoria: string
  categoriaAbccmm: number
  campeonatoAbccmm: number
  eventoAbccmm: number
  urlFinal: string
  // Link da coluna "Marcha" (2a coluna) - usado como fallback quando a
  // pagina Final vem vazia. Categorias Castrado (e potencialmente
  // Exclusivamente Marcha) nao tem quesito "Categoria" combinado - so
  // marcha, entao a pagina Final delas nunca tem linha nenhuma mesmo
  // depois de julgadas; o resultado de verdade so aparece na pagina de Marcha.
  urlMarcha: string | null
}

export type LinhaResultado = {
  numCatalogo: string
  nomeAnimal: string
  idAnimalAbccmm: number | null
  pontuacaoFuncional: string | null
  pontuacaoMorfologia: string | null
  pontuacaoAndamento: string | null
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

// Busca o indice de categorias/marcha/campeonato e o link da pagina Final de
// cada uma (5a coluna da tabela indice - as 3 primeiras sao Marcha/
// Morfologia/Funcional isoladas, que nao usamos mais).
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

    const finalHref = $(cells[4]).find('a').attr('href') || ''
    if (!finalHref) return

    const categoriaAbccmm = parseQueryParam(finalHref, 'categoria')
    const campeonatoAbccmm = parseQueryParam(finalHref, 'campeonato')
    const eventoAbccmm = parseQueryParam(finalHref, 'evento')
    if (categoriaAbccmm == null || campeonatoAbccmm == null || eventoAbccmm == null) return

    const marchaHref = $(cells[1]).find('a').attr('href') || ''

    classes.push({
      tipoCampeonato,
      tipoMarcha,
      categoria,
      categoriaAbccmm,
      campeonatoAbccmm,
      eventoAbccmm,
      urlFinal: new URL(finalHref, BASE_URL).toString(),
      urlMarcha: marchaHref ? new URL(marchaHref, BASE_URL).toString() : null,
    })
  })

  return classes
}

// Nomes de coluna variam pouco (acentuacao, "Nº" vs "N"), entao casa por
// prefixo normalizado em vez de igualdade exata.
function normalizarCabecalho(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Busca a tabela de Resultado Final de uma categoria (modo 'final'), ou a
// pagina de Andamento/Marcha usada como fallback (modo 'marcha') pra
// categorias sem quesito Categoria combinado (Castrado). Le os indices das
// colunas pelo cabecalho (em vez de posicao fixa) porque a tabela varia de
// formato: a Final tem Funcional/Morfologia/Andamento/Classificação, mas a
// de Andamento tem uma coluna por arbitro (nomes variaveis, nao da pra
// casar por texto) + Total + "Classif." (abreviado, e so um numero de
// posicao/rank cru - nao um texto de colocacao como "Campeão"). Por isso
// no modo 'marcha' esse numero vira pontuacao_andamento (mesmo padrao de
// rank cru usado em todo o resto do app pro quesito Marcha isolado), nunca
// colocacao (que so faz sentido pra a classificacao combinada da Categoria,
// que Castrado nao tem). Uma categoria ainda nao julgada simplesmente
// retorna uma tabela vazia.
export async function fetchResultTable(url: string, modo: 'final' | 'marcha' = 'final'): Promise<LinhaResultado[]> {
  let res: Response
  try {
    res = await fetchComTimeout(url)
  } catch (e) {
    throw new Error(describeFetchError(e))
  }
  if (!res.ok) throw new Error(`${url} respondeu ${res.status}`)
  const html = await res.text()
  const $ = cheerio.load(html)

  // A pagina tem uma tabela "mGrid" vazia (placeholder de layout, id contem
  // "tblMarchadorIdeal") ANTES da tabela de verdade (id contem "grvDetalhe")
  // - sem exigir linha de dados aqui, ".first()" pegava a vazia e a
  // categoria ficava sem nenhum resultado salvo.
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

  const colIndex: Record<string, number> = {}
  const headerRow = tabela.find('tr').filter((_, tr) => $(tr).find('th').length > 0).first()
  headerRow.find('th').each((idx, th) => {
    colIndex[normalizarCabecalho($(th).text())] = idx
  })
  // Prefixo em vez de igualdade exata: a pagina de Andamento abrevia pra
  // "Classif." em vez de "Classificação".
  const encontrarColuna = (prefixo: string): number | undefined => {
    const chave = Object.keys(colIndex).find(k => k.startsWith(prefixo))
    return chave !== undefined ? colIndex[chave] : undefined
  }
  const idxFuncional = encontrarColuna('funcional')
  const idxMorfologia = encontrarColuna('morfologia')
  const idxAndamento = encontrarColuna('andamento')
  const idxClassificacao = encontrarColuna('classif')

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

    const celTexto = (idx: number | undefined) =>
      idx != null && idx < cells.length ? ($(cells[idx]).text().trim() || null) : null

    linhas.push({
      numCatalogo,
      nomeAnimal,
      idAnimalAbccmm,
      pontuacaoFuncional: modo === 'final' ? celTexto(idxFuncional) : null,
      pontuacaoMorfologia: modo === 'final' ? celTexto(idxMorfologia) : null,
      pontuacaoAndamento: modo === 'final' ? celTexto(idxAndamento) : celTexto(idxClassificacao),
      colocacao: modo === 'final' ? celTexto(idxClassificacao) : null,
    })
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

// Busca o indice de categorias e a pagina Final de cada uma, e grava tudo no
// Supabase. Concorrencia limitada para nao sobrecarregar o site da ABCCMM.
//
// Salva incrementalmente (a cada BATCH linhas prontas) em vez de acumular
// tudo em memoria e so gravar no final: com 200+ categorias e o site da
// ABCCMM sendo lento/instavel, a sincronizacao inteira pode passar do limite
// de tempo da funcao na Vercel - se so salvasse no final, um timeout no meio
// do caminho perdia TUDO que ja tinha sido raspado com sucesso. Salvando aos
// poucos, o que ja foi processado fica gravado mesmo que a funcao seja
// encerrada antes de terminar (a proxima sincronizacao completa o resto).
export async function refreshAllResults(): Promise<RefreshSummary> {
  const erros: string[] = []

  let classes: ClasseResultado[]
  try {
    classes = await fetchClasses()
  } catch (e) {
    return { classesProcessadas: 0, linhasAtualizadas: 0, erros: [`Falha ao buscar Resultados.aspx: ${(e as Error).message}`] }
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

  await withConcurrency(classes, 4, async (classe) => {
    try {
      let resultado = await fetchResultTable(classe.urlFinal, 'final')
      // Categorias Castrado (e possivelmente Exclusivamente Marcha) nao
      // tem quesito "Categoria" combinado - a pagina Final delas fica
      // sempre vazia mesmo depois de julgadas. Se a Final nao trouxe nada,
      // tenta a pagina de Andamento/Marcha antes de desistir: pra esse
      // tipo de campeonato ela e o resultado de verdade (mas o formato e
      // diferente - uma coluna por arbitro + "Classif.", que vira
      // pontuacao_andamento, nunca colocacao).
      if (resultado.length === 0 && classe.urlMarcha) {
        resultado = await fetchResultTable(classe.urlMarcha, 'marcha')
      }
      for (const linha of resultado) {
        pendentes.push({
          tipo_campeonato: classe.tipoCampeonato,
          tipo_marcha: classe.tipoMarcha,
          categoria: classe.categoria,
          tipo_prova: 'final',
          num_catalogo: linha.numCatalogo,
          nome_animal: linha.nomeAnimal,
          id_animal_abccmm: linha.idAnimalAbccmm,
          categoria_abccmm: classe.categoriaAbccmm,
          campeonato_abccmm: classe.campeonatoAbccmm,
          evento_abccmm: classe.eventoAbccmm,
          pontuacao_funcional: linha.pontuacaoFuncional,
          pontuacao_morfologia: linha.pontuacaoMorfologia,
          pontuacao_andamento: linha.pontuacaoAndamento,
          colocacao: linha.colocacao,
        })
      }
      if (pendentes.length >= BATCH) await flush()
    } catch (e) {
      erros.push(`${classe.tipoCampeonato} ${classe.tipoMarcha} ${classe.categoria}: ${(e as Error).message}`)
    }
  })

  await flush()

  return { classesProcessadas: classes.length, linhasAtualizadas: totalSalvo, erros }
}
