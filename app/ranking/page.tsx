'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import RankingDestaques from '@/components/RankingDestaques'
import { getCategoriasMistas, ehExcecaoMarcha } from '@/lib/campeonatoMisto'

type RankingItem = { id: number; nome: string; registro: string; haras: string; num_catalogo: number; total_votos: number }
type CampeonatoRanking = { campeonato: string; ranking: RankingItem[] }

const MEDAL_IMGS = ['/medals/medal_1.png', '/medals/medal_2.png', '/medals/medal_3.png']

// nm_votos.campeonato guarda a string composta "{tipo_campeonato} - {tipo_marcha}
// - {categoria}" (ex: "Exclusivamente Marcha - MB - Cavalo Castrado") - aqui a
// gente separa pra exibir so a categoria de verdade, com "Excl. Marcha" como
// selo quando for o caso, em vez de jogar a string crua na tela.
function parseCampeonato(campeonato: string): { tipoCampeonato: string; tipoMarcha: string; categoria: string } {
  const partes = campeonato.split(' - ')
  return {
    tipoCampeonato: partes[0] || '',
    tipoMarcha: partes[1] || '',
    categoria: partes.slice(2).join(' - ') || campeonato,
  }
}

export default function RankingPage() {
  const [secao, setSecao] = useState<'torcida' | 'destaques'>('torcida')
  const [rankings, setRankings] = useState<CampeonatoRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMarcha, setFilterMarcha] = useState<string>('Todas')
  const [categoriasMistas, setCategoriasMistas] = useState<Set<string>>(new Set())

  useEffect(() => {
    getCategoriasMistas().then(setCategoriasMistas)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: votos } = await supabase
        .from('nm_votos')
        .select('campeonato')

      if (!votos || votos.length === 0) {
        setRankings([])
        setLoading(false)
        return
      }

      const unique = [...new Set(votos.map(v => v.campeonato))]

      const results: CampeonatoRanking[] = []
      for (const campeonato of unique) {
        const { data } = await supabase.rpc('nm_ranking_simples', { p_campeonato: campeonato })
        if (data && data.length > 0) {
          results.push({ campeonato, ranking: data })
        }
      }

      results.sort((a, b) => a.campeonato.localeCompare(b.campeonato))
      setRankings(results)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filterMarcha === 'Todas'
    ? rankings
    : rankings.filter(r => r.campeonato.includes(`- ${filterMarcha} -`))

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-base font-bold">Estatísticas</h1>
          </div>
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5">
            {(['destaques', 'torcida'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSecao(s)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  secao === s ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
                }`}
              >
                {s === 'destaques' ? 'Estatísticas' : 'Favoritos da Gameleira'}
              </button>
            ))}
          </div>
          {secao === 'torcida' && (
            <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 mt-2">
              {['Todas', 'MB', 'MP'].map(m => (
                <button
                  key={m}
                  onClick={() => setFilterMarcha(m)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    filterMarcha === m
                      ? m === 'MB' ? 'bg-[var(--mb-color)] text-white' : m === 'MP' ? 'bg-[var(--mp-color)] text-white' : 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {m === 'Todas' ? 'Todas' : m === 'MB' ? 'M. Batida' : 'M. Picada'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full">
        {secao === 'destaques' ? (
          <RankingDestaques />
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Nenhuma votacao ainda</p>
            <p className="text-xs mt-1">Vote nos seus favoritos em cada campeonato</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(r => {
              const { tipoCampeonato, tipoMarcha, categoria } = parseCampeonato(r.campeonato)
              return (
              <div key={r.campeonato} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card-hover)]">
                  <div className="flex items-center gap-2">
                    {tipoMarcha && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        tipoMarcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                      }`}>
                        {tipoMarcha}
                      </span>
                    )}
                    <p className="text-xs font-semibold truncate">{categoria}</p>
                    {ehExcecaoMarcha(categoria, tipoMarcha, tipoCampeonato, categoriasMistas) && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)]/10 text-[var(--accent-dark)] flex-shrink-0">
                        Excl. Marcha
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--accent)]">{r.ranking.reduce((s, a) => s + Number(a.total_votos), 0)} votos</p>
                </div>
                <div className="p-2 space-y-1">
                  {r.ranking.slice(0, 3).map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/animal/${a.num_catalogo || a.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <img src={MEDAL_IMGS[i]} alt={`${i+1}o lugar`} className="w-10 h-10 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{a.nome}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{a.haras || ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[var(--accent)]">{a.total_votos}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">votos</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
