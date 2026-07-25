'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'

const MEDAL_IMGS = ['/medals/medal_1.png', '/medals/medal_2.png', '/medals/medal_3.png']

type RankingItem = { id: number; nome: string; registro: string; haras: string; num_catalogo: number; total_votos: number }
type ResultadoOficial = { nome_animal: string | null; colocacao: string | null }

export default function VotingPanel({ animalId, campeonato }: { animalId: number; campeonato: string }) {
  const { user } = useAuth()
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [myVote, setMyVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultadoOficial, setResultadoOficial] = useState<ResultadoOficial | null>(null)

  useEffect(() => {
    loadRanking()
    if (user) loadMyVote()
    loadResultadoOficial()
  }, [campeonato, user])

  async function loadRanking() {
    const { data } = await supabase.rpc('nm_ranking_simples', { p_campeonato: campeonato })
    setRanking(data || [])
  }

  // Compara o favorito da torcida com o campeao oficial, quando o resultado
  // ja saiu. campeonato vem como "TipoCampeonato - Marcha - Categoria".
  async function loadResultadoOficial() {
    const partes = campeonato.split(' - ')
    if (partes.length < 3) { setResultadoOficial(null); return }
    const [tipoCampeonato, tipoMarcha, ...resto] = partes
    const categoriaNome = resto.join(' - ')
    const { data } = await supabase
      .from('nm_resultados')
      .select('nome_animal, colocacao')
      .eq('tipo_campeonato', tipoCampeonato)
      .eq('tipo_marcha', tipoMarcha)
      .eq('categoria', categoriaNome)
      .eq('tipo_prova', 'final')
      .ilike('colocacao', '%Campe%')
      .not('colocacao', 'ilike', '%Reserv%')
      .limit(1)
    setResultadoOficial(data && data.length > 0 ? data[0] : null)
  }

  async function loadMyVote() {
    if (!user) return
    const { data } = await supabase.rpc('nm_meu_voto', { p_usuario_id: user.id, p_campeonato: campeonato })
    setMyVote(data && data.length > 0 ? data[0].animal_id : null)
  }

  async function toggleVote() {
    if (!user || loading) return
    setLoading(true)
    const { data } = await supabase.rpc('nm_toggle_voto', {
      p_usuario_id: user.id,
      p_animal_id: animalId,
      p_campeonato: campeonato,
    })
    if (data?.voted) {
      setMyVote(animalId)
    } else {
      setMyVote(null)
    }
    await loadRanking()
    setLoading(false)
  }

  const voted = myVote === animalId
  const votedOther = myVote !== null && myVote !== animalId

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card-hover)]">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Votacao Popular</h3>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Escolha seu favorito nesta categoria</p>
      </div>

      <div className="p-4">
        {!user ? (
          <div className="text-center py-2">
            <p className="text-xs text-[var(--text-muted)] mb-2">Faca login para votar</p>
            <a href="/login" className="inline-block px-4 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-lg">
              Entrar
            </a>
          </div>
        ) : (
          <div className="mb-4">
            <button
              onClick={toggleVote}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.97] ${
                voted
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'
              }`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" fill={voted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  {voted ? 'Meu voto neste animal' : votedOther ? 'Trocar meu voto para este' : 'Votar neste animal'}
                </>
              )}
            </button>
            {votedOther && (
              <p className="text-[10px] text-[var(--accent-dark)] text-center mt-1.5">Voce ja votou em outro animal desta categoria</p>
            )}
          </div>
        )}

        {ranking.length > 0 && (
          <div>
            <h4 className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-semibold mb-2">Ranking</h4>
            <div className="space-y-1.5">
              {ranking.slice(0, 3).map((r, i) => (
                <Link
                  key={r.id}
                  href={`/animal/${r.num_catalogo || r.id}`}
                  className={`flex items-center gap-2 rounded-lg p-2 transition-colors ${
                    r.id === animalId ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/20' : 'bg-[var(--bg-primary)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                >
                  <img src={MEDAL_IMGS[i]} alt={`${i+1}o lugar`} className="w-8 h-8 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">{r.nome}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{r.haras || ''}</p>
                  </div>
                  <span className="text-sm font-bold text-[var(--accent)]">{r.total_votos}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {resultadoOficial && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
            <h4 className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-semibold mb-2">Resultado Oficial</h4>
            <p className="text-sm font-bold">{resultadoOficial.nome_animal}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{resultadoOficial.colocacao}</p>
            {ranking.length > 0 && (
              <p className="text-xs font-semibold mt-2 text-[var(--accent)]">
                {ranking[0].nome === resultadoOficial.nome_animal
                  ? '🎉 A torcida acertou o campeão!'
                  : `A torcida tinha elegido ${ranking[0].nome} como favorito.`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
