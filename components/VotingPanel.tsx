'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { formatColocacaoOficial } from '@/lib/colocacao'

const MEDAL_IMGS = ['/medals/medal_1.png', '/medals/medal_2.png', '/medals/medal_3.png']

type RankingItem = { id: number; nome: string; registro: string; haras: string; num_catalogo: number; total_votos: number }
type ResultadoOficial = { nome_animal: string | null; colocacao: string | null }

export default function VotingPanel({ animalId, campeonato }: { animalId: number; campeonato: string }) {
  const { user, ensureUser } = useAuth()
  const [ranking, setRanking] = useState<RankingItem[]>([])
  const [myVote, setMyVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [resultadoOficial, setResultadoOficial] = useState<ResultadoOficial | null>(null)
  // Enquanto um voto esta em andamento, evita que a hidratacao de "meu voto"
  // (disparada pela mudanca de `user` ao criar o cadastro anonimo na hora)
  // sobrescreva o estado com dados ainda desatualizados.
  const votandoRef = useRef(false)

  useEffect(() => {
    if (!campeonato) return
    loadRanking()
    if (user && !votandoRef.current) loadMyVote()
    loadResultadoOficial()
  }, [campeonato, user])

  async function loadRanking() {
    if (!campeonato) return
    const { data } = await supabase.rpc('nm_ranking_simples', { p_campeonato: campeonato })
    setRanking(data || [])
  }

  // Compara o favorito da torcida com o campeao oficial, quando o resultado
  // ja saiu. campeonato vem como "TipoCampeonato - Marcha - Categoria". Se o
  // dado do animal vier sem campeonato (falha de raspagem), so ignora - nao
  // deixa a pagina inteira quebrar por causa do painel de votacao.
  async function loadResultadoOficial() {
    if (!campeonato) { setResultadoOficial(null); return }
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
    if (loading) return
    setLoading(true)
    votandoRef.current = true
    const votante = user ?? await ensureUser()
    if (!votante) { setLoading(false); votandoRef.current = false; return }
    const { data } = await supabase.rpc('nm_toggle_voto', {
      p_usuario_id: votante.id,
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
    votandoRef.current = false
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
                <span className="text-lg leading-none">🏆</span>
                {voted ? 'Meu voto neste animal' : votedOther ? 'Trocar meu voto para este' : 'Votar neste animal'}
              </>
            )}
          </button>
          {votedOther && (
            <p className="text-[10px] text-[var(--accent-dark)] text-center mt-1.5">Voce ja votou em outro animal desta categoria</p>
          )}
          {!user && (
            <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
              Vote sem cadastro. <a href="/login" className="text-[var(--accent)] underline">Quer receber novidades?</a>
            </p>
          )}
        </div>

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
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatColocacaoOficial(resultadoOficial.colocacao)}</p>
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
