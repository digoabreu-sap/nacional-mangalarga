// Importa o modulo interno direto (nao o index.js do pacote) - mesmo motivo
// do lib/resultados-pdf.ts: o index.js do pdf-parse@1 roda um auto-teste ao
// ser importado que quebra o build/rota nesse projeto.
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

// Le o "Resumo Parcial" (Mapa de Premiação) que a ABCCMM gera durante o
// evento - um PDF unico com o resultado NAO OFICIAL de todas as categorias
// ja julgadas ate aquele momento, cada uma em ate 3 secoes por
// tipo_marcha: "<Categoria> - Categoria" (classificacao final, so existe
// pra Convencional/Castrado), "<Categoria> - Marcha" (quesito Marcha
// isolado - agrupa Convencional e Exclusivamente Marcha juntos, sem
// distinguir tipo_campeonato) e "<Categoria> - Prova Funcional" (so
// aparece pras categorias de Cavalo/macho). Serve pra agilizar o cadastro
// manual enquanto a sincronizacao oficial (raspada do site da ABCCMM,
// categoria por categoria) ainda nao publicou aquele resultado.
//
// A extracao de texto do pdf-parse NAO preserva a ordem visual das colunas
// da tabela (segue a ordem de desenho no stream do PDF, nao a leitura
// esquerda-pra-direita) - o padrao observado e sempre: linha de valores em
// R$, depois o rotulo de Classificação, depois "NUM - Nome - Registro",
// depois Expositor/Criador. Por isso o rotulo de cada animal fica sempre
// exatamente 1 linha ANTES da linha "NUM - Nome - Registro" (nunca depois).

export type SecaoResumoParcial = 'Categoria' | 'Marcha' | 'Prova Funcional'

export type EntradaResumoParcial = {
  tipo_campeonato: string
  tipo_marcha: 'MB' | 'MP'
  categoria: string
  secao: SecaoResumoParcial
  num_catalogo: string
  colocacao_bruta: string
}

const RE_TIPO = /^\s*(Convencional|Castrado|Exclusivamente Marcha|Progênie)\s*-\s*(MB|MP)\s*$/
const RE_SECAO = /^\s*(.+?)\s*-\s*(Categoria|Marcha|Prova Funcional)\s*$/
const RE_CATALOGO = /^\s*(\d+)\s*-\s*.+-\s*\S+\s*$/
const RE_LABEL = /(Campeão\([ãa]\)[^\n]*|Reserv\.?\s*Campeão\([ãa]\)[^\n]*|\d\s*[ºo]?\s*Prêmio|\d\s*[ªa]?\s*Menção Honrosa)/

export async function parseResumoParcialPdf(buffer: Buffer): Promise<EntradaResumoParcial[]> {
  const { text } = await pdfParse(buffer)
  const linhas = text.split('\n')

  let tipoCampeonato: string | null = null
  let tipoMarcha: 'MB' | 'MP' | null = null
  let categoria: string | null = null
  let secao: SecaoResumoParcial | null = null
  const entradas: EntradaResumoParcial[] = []

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]

    const mTipo = linha.match(RE_TIPO)
    if (mTipo) { tipoCampeonato = mTipo[1]; tipoMarcha = mTipo[2] as 'MB' | 'MP'; continue }

    // So tenta casar cabecalho de secao em linhas que nao comecem com
    // digito - evita falso positivo com a linha de animal ("15 - Nome -
    // Registro"), que tambem tem " - " no meio.
    if (!/^\s*\d/.test(linha)) {
      const mSecao = linha.match(RE_SECAO)
      if (mSecao) { categoria = mSecao[1].trim(); secao = mSecao[2] as SecaoResumoParcial; continue }
    }

    const mCatalogo = linha.match(RE_CATALOGO)
    if (mCatalogo && tipoCampeonato && tipoMarcha && categoria && secao) {
      const mLabel = (linhas[i - 1] || '').match(RE_LABEL)
      if (mLabel) {
        entradas.push({
          tipo_campeonato: tipoCampeonato, tipo_marcha: tipoMarcha, categoria, secao,
          num_catalogo: mCatalogo[1], colocacao_bruta: mLabel[1].trim(),
        })
      }
    }
  }

  return entradas
}
