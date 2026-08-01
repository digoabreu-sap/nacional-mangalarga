import { formatColocacaoOficial, formatColocacaoMarcha } from './colocacao'
import { tipoDaCategoriaEspecial } from './campeoesDosCampeoes'

// Separa as linhas de nm_resultados de um animal (identificado por
// num_catalogo) entre o resultado da SUA categoria de origem (o "principal",
// mesmo formato exibido sempre) e resultados extras em OUTRO campeonato -
// hoje isso acontece quando o animal tambem disputa um dos Grandes
// Campeonatos/Campeao dos Campeoes (Art. 73-76 do regulamento), que geram
// uma segunda linha em nm_resultados pra o mesmo num_catalogo, com
// categoria/tipo_campeonato proprios (o texto exato vem de como a ABCCMM
// publica esse campeonato - nao precisamos adivinhar, so identificar que e
// "outra" linha comparando com a categoria/marcha/tipo do proprio animal).
export type ResultadoComContexto = {
  categoria: string
  tipo_marcha: string
  tipo_campeonato: string
  colocacao: string | null
  pontuacao_funcional: string | null
  pontuacao_morfologia: string | null
  pontuacao_andamento: string | null
  origem: string
}

export function separarResultadoPrincipal<T extends ResultadoComContexto>(
  linhas: T[],
  animal: { categoria: string | null; tipo_marcha: string | null; tipo_campeonato?: string | null }
): { principal: T | null; extras: T[] } {
  if (linhas.length === 0) return { principal: null, extras: [] }
  const exato = linhas.find(l =>
    l.categoria === animal.categoria && l.tipo_marcha === animal.tipo_marcha && l.tipo_campeonato === animal.tipo_campeonato
  )
  const principal = exato ?? linhas.find(l => l.categoria === animal.categoria && l.tipo_marcha === animal.tipo_marcha) ?? null
  // So conta como resultado "extra" de verdade quando ja tem alguma nota
  // lancada (colocacao ou pontuacao_andamento) - a ABCCMM as vezes cria a
  // linha da categoria/campeonato assim que ele e definido (ex: os animais
  // do Grande Campeonato Jovem da Raca), bem antes de ele ser julgado. Sem
  // esse filtro, aparecia um selo extra vazio ("—") pra todo mundo que so
  // esta INSCRITO no campeonato, ainda sem resultado nenhum.
  const extras = linhas.filter(l => l !== principal && (l.colocacao || l.pontuacao_andamento))
  return { principal, extras }
}

// Classificacao pra exibir no selo de resultado extra: prefere a colocacao
// (quesito Categoria combinado), mas cai pro rank de Marcha quando so ele
// existe - igual ja fazemos pro resto do site pra campeonatos marcha-only
// (Castrado e afins nunca tem colocacao preenchida, so pontuacao_andamento;
// sem esse fallback, o selo mostrava "—" pra todo mundo mesmo com nota
// lancada, porque so olhava colocacao).
export function formatClassificacaoExtra(l: ResultadoComContexto): string {
  return l.colocacao ? formatColocacaoOficial(l.colocacao) : formatColocacaoMarcha(l.pontuacao_andamento)
}

// So o nome da categoria/campeonato - sem o tipo_campeonato como prefixo
// (que hoje e so um rotulo interno tecnico, tipo "Grande Campeonato" pros
// cadastrados manualmente - nao acrescenta nada pro usuario e so deixava o
// selo mais verboso: "Grande Campeonato · Campeão dos Campeões Castrado").
export function formatTituloExtra(l: ResultadoComContexto): string {
  return l.categoria
}

// Castrado (e o Campeao dos Campeoes Castrado) nao disputa Categoria
// combinada de verdade - o premio que ocupa essa mesma coluna/campo
// (colocacao) e o "Marchador Ideal" (soma Funcional + Marcha), um premio
// proprio e diferente do quesito Categoria das demais categorias. So muda
// o ROTULO exibido pro usuario - o dado em si continua vindo do mesmo
// campo colocacao, sem mudanca de schema.
export function ehCampeonatoCastrado(tipoCampeonato: string | null | undefined, categoria: string | null | undefined): boolean {
  return tipoCampeonato === 'Castrado' || tipoDaCategoriaEspecial(categoria ?? '') === 'castrado'
}

export function labelColocacao(tipoCampeonato: string | null | undefined, categoria: string | null | undefined): string {
  return ehCampeonatoCastrado(tipoCampeonato, categoria) ? 'Marchador Ideal' : 'Categoria'
}
