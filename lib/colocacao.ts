// Normaliza o texto de colocacao (como vem raspado do site da ABCCMM, que
// varia bastante: "1", "1º Prêmio", "Campeão(ã) - Jovem", "1 Menção
// Honrosa"...) pro padrao oficial da hierarquia de premiacao da ABCCMM:
// Campeao > Reservado Campeao > 1o-5o Premio > 1a-3a Mencao Honrosa.
// Mesma logica usada tanto pra EXIBIR a colocacao quanto (em SQL, replicada
// em nm_ranking_premiados_pontos.sql) pra pontuar o Ranking de Premiados.

export type ColocacaoOficial = {
  label: string
  pontos: number
  ordem: number // pra ordenar (1 = melhor)
}

export function normalizarColocacao(bruto: string | null): ColocacaoOficial | null {
  if (!bruto) return null
  const s = bruto.toLowerCase()

  if (/reserv/.test(s)) return { label: 'Reservado Campeão', pontos: 17, ordem: 2 }
  if (/campe[ãa]o/.test(s)) return { label: 'Campeão', pontos: 20, ordem: 1 }

  const premio = s.match(/(\d)\s*[ºo]?\s*pr[eê]mio/)
  if (premio) {
    const n = parseInt(premio[1], 10)
    const pontosPremio: Record<number, number> = { 1: 14, 2: 12, 3: 10, 4: 8, 5: 6 }
    if (pontosPremio[n]) return { label: `${n}º Prêmio`, pontos: pontosPremio[n], ordem: 2 + n }
  }

  const mencao = s.match(/(\d)\s*[ªa]?\s*men[cç][ãa]o/)
  if (mencao) {
    const n = parseInt(mencao[1], 10)
    const pontosMencao: Record<number, number> = { 1: 4, 2: 2, 3: 1 }
    if (pontosMencao[n]) return { label: `${n}ª Menção Honrosa`, pontos: pontosMencao[n], ordem: 7 + n }
  }

  // Numero isolado (rank cru de marcha/morfologia/funcional, sem premiacao
  // oficial associada - so mostra a posicao).
  if (/^\d+$/.test(bruto.trim())) return { label: `${bruto.trim()}º`, pontos: 0, ordem: 100 + parseInt(bruto.trim(), 10) }

  return { label: bruto, pontos: 0, ordem: 999 }
}

export function formatColocacaoOficial(bruto: string | null): string {
  return normalizarColocacao(bruto)?.label ?? '—'
}

// A coluna "Andamento" (rotulada como "Marcha" na UI) traz a POSICAO do
// animal naquela prova, nao um texto de colocacao - e uma classificacao
// separada da colocacao geral da categoria (um animal pode ser Campeao da
// categoria e tambem Campeao da marcha, ou so uma das duas). Mesma escala de
// pontos/rotulos da hierarquia oficial, so que indexada pela posicao (rank
// 1 = Campeao, 2 = Reservado, 3-7 = 1o-5o Premio, 8-10 = 1a-3a Mencao).
export function normalizarColocacaoPorRank(rank: string | null): ColocacaoOficial | null {
  if (!rank) return null
  const n = parseInt(rank, 10)
  if (!Number.isFinite(n) || n < 1 || n > 10) return null

  if (n === 1) return { label: 'Campeão', pontos: 20, ordem: 1 }
  if (n === 2) return { label: 'Reservado Campeão', pontos: 17, ordem: 2 }

  const pontosPremio: Record<number, number> = { 3: 14, 4: 12, 5: 10, 6: 8, 7: 6 }
  if (n in pontosPremio) return { label: `${n - 2}º Prêmio`, pontos: pontosPremio[n], ordem: n }

  const pontosMencao: Record<number, number> = { 8: 4, 9: 2, 10: 1 }
  return { label: `${n - 7}ª Menção Honrosa`, pontos: pontosMencao[n], ordem: n }
}

export function formatColocacaoMarcha(rank: string | null): string {
  return normalizarColocacaoPorRank(rank)?.label ?? '—'
}
