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
//
// O titulo de cada secao (ex: "Cavalo Adulto - Categoria") vem sempre
// IMEDIATAMENTE depois da linha de cabecalho de coluna fixa
// "ClassificaçãoExp. não criadorExp. CriadorExpositorAnimal" - confirmado
// contra o PDF real (355 secoes, todas com essa mesma linha logo antes do
// titulo). Usamos ela como ancora confiavel em vez de tentar casar
// RE_SECAO em qualquer linha solta: title compostos como "Cavalo Castrado
// Máster - Prova Funcional - Marcha Castrado" ou "Raça Adulto - Fêmea -
// Campeão(a) da Raça" (Grande Campeonato/Marchador Ideal - 38 dos 355
// titulos no PDF de teste) NAO batem no formato simples "Categoria -
// Quesito" e ficavam sem reconhecer - sem a ancora, o codigo simplesmente
// mantinha categoria/secao com o valor da secao ANTERIOR, e os animais
// dali pra frente ficavam silenciosamente atribuidos ao quesito errado
// (ex: nota de Prova Funcional gravada como se fosse Marcha) ate a
// proxima secao reconhecida - causando divergencias falsas na comparacao
// com o oficial. Agora, ao achar a ancora, sempre INVALIDA
// categoria/secao primeiro; so re-preenche se o titulo seguinte bater no
// formato conhecido - uma secao com titulo nao reconhecido fica
// corretamente IGNORADA (nenhum animal dela entra na lista) em vez de
// contaminar a secao seguinte.
const RE_ANCORA_SECAO = /^Classificação\s*Exp\.\s*não criador\s*Exp\.\s*Criador\s*Expositor\s*Animal\s*$/

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

    if (RE_ANCORA_SECAO.test(linha)) {
      const mSecao = (linhas[i + 1] || '').match(RE_SECAO)
      if (mSecao) { categoria = mSecao[1].trim(); secao = mSecao[2] as SecaoResumoParcial }
      else { categoria = null; secao = null }
      continue
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
