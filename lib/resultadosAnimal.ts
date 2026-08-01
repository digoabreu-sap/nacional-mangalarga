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
