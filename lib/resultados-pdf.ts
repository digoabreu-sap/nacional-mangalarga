// Importa o modulo interno direto (nao o index.js do pacote): o index.js
// do pdf-parse@1 tem um bloco de "auto-teste" que roda ao ser importado
// quando `module.parent` da bundler (Turbopack) fica undefined, tentando ler
// um PDF de exemplo que nao existe no projeto e quebrando o build/rota.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

// Le o PDF de resultado que a ABCCMM gera pra cada prova (Morfologia,
// Funcional, Andamento...) - formato fixo: cabecalho com "Campeonato:
// <Tipo> - <MB|MP> <Categoria>" e "Tipo competição: <Prova>", seguido de
// uma tabela Colete/Nome Competidor/Colocação. A extracao de texto do PDF
// nao preserva a ordem visual dos rotulos/valores (e uma quirk normal de
// extracao de PDF), entao o parser usa ancoras fixas em vez de depender de
// posicao de linha.

export type CampoResultado = 'pontuacao_funcional' | 'pontuacao_morfologia' | 'pontuacao_andamento' | 'colocacao'

export type LinhaPdfResultado = { num_catalogo: string; nome_animal: string; valor: string }

export type ResultadoPdfParseado = {
  tipo_campeonato: string | null
  tipo_marcha: string | null
  categoria: string | null
  tipo_competicao: string | null
  campo: CampoResultado
  linhas: LinhaPdfResultado[]
}

function normalizarChave(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function mapearCampo(tipoCompeticao: string): CampoResultado {
  const t = normalizarChave(tipoCompeticao)
  if (t.includes('morfologia')) return 'pontuacao_morfologia'
  if (t.includes('funcional')) return 'pontuacao_funcional'
  if (t.includes('andamento') || t === 'marcha') return 'pontuacao_andamento'
  return 'colocacao'
}

export async function parseResultadoPdf(buffer: Buffer): Promise<ResultadoPdfParseado> {
  const { text } = await pdfParse(buffer)

  // A extracao de texto do PDF as vezes gruda palavras vizinhas sem espaco
  // (ex: "MBÉgua Maior", "421QNEGRA DA MURITIBA"), dependendo da lib/versao
  // usada - por isso os "\s*" no lugar de "\s+" onde o espaco nao e garantido.
  const campMatch = text.match(/^(.+?)\s*-\s*(MB|MP)\s*(.+?)\s*\nNome Competidor\s*Colocação/m)
  const tipoMatch = text.match(/^(Morfologia|Funcional|Andamento|Marcha)\s*$/m)

  const linhas: LinhaPdfResultado[] = []
  for (const linha of text.split('\n')) {
    // O titulo do evento ("43ª Exposição Nacional...") comeca com o numero
    // da edicao, entao bate com o mesmo regex de linha de resultado - exclui
    // explicitamente pra nao virar uma linha falsa (colete "43").
    if (/exposiç[ãa]o nacional/i.test(linha)) continue
    const m = linha.match(/^\s*(\d+)\s*(.+)\s+(\S+)\s*$/)
    if (!m) continue
    linhas.push({ num_catalogo: m[1], nome_animal: m[2].trim(), valor: m[3].trim() })
  }

  return {
    tipo_campeonato: campMatch?.[1]?.trim() || null,
    tipo_marcha: (campMatch?.[2] as 'MB' | 'MP' | undefined) || null,
    categoria: campMatch?.[3]?.trim() || null,
    tipo_competicao: tipoMatch?.[1] || null,
    campo: tipoMatch ? mapearCampo(tipoMatch[1]) : 'colocacao',
    linhas,
  }
}
