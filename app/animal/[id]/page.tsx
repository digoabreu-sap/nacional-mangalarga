'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { supabase, Animal } from '@/lib/supabase'
import Link from 'next/link'
import { trackAnimalClick } from '@/components/Analytics'
import BottomNav from '@/components/BottomNav'
import VotingPanel from '@/components/VotingPanel'
import { getAnimalSchedule, isToday, isPast } from '@/lib/calendario'
import { formatColocacaoOficial } from '@/lib/colocacao'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start py-2 border-b border-[var(--border)]">
      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{label}</span>
      <span className="text-sm text-right ml-4">{value}</span>
    </div>
  )
}

function GenealogyCard({ label, nome, registro }: { label: string; nome: string; registro: string }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)] flex-1 min-w-0">
      <p className="text-[10px] text-[var(--accent)] font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-semibold truncate">{nome || '—'}</p>
      {registro && <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Reg. {registro}</p>}
    </div>
  )
}

type ResultadoAnimal = { tipo_prova: string; colocacao: string | null; pontuacao: string | null }

function ResultadoCard({ label, resultado }: { label: string; resultado: ResultadoAnimal | undefined }) {
  return (
    <div className="bg-[var(--bg-primary)] rounded-lg p-3 border border-[var(--border)] flex-1 min-w-0 text-center">
      <p className="text-[10px] text-[var(--accent)] font-medium uppercase tracking-wide mb-1">{label}</p>
      {resultado ? (
        <>
          <p className="text-lg font-bold truncate">{formatColocacaoOficial(resultado.colocacao)}</p>
          {resultado.pontuacao && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Pontuacao: {resultado.pontuacao}</p>}
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)] mt-1">Ainda nao julgado</p>
      )}
    </div>
  )
}

export default function AnimalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [animal, setAnimal] = useState<Animal | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFav, setIsFav] = useState(false)
  const [resultados, setResultados] = useState<ResultadoAnimal[]>([])

  useEffect(() => {
    async function load() {
      // O link usa o numero do catalogo (o que aparece pro usuario). Links
      // antigos ainda podem vir com o id interno, entao cai pra ele se nao
      // achar por catalogo.
      const { data: porCatalogo } = await supabase
        .from('nm_animais')
        .select('*')
        .eq('num_catalogo', id)
        .limit(1)
      let found = porCatalogo?.[0] || null
      if (!found) {
        const { data: porId } = await supabase
          .from('nm_animais')
          .select('*')
          .eq('id', id)
          .limit(1)
        found = porId?.[0] || null
      }
      setAnimal(found)
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!animal) return
    const favs = JSON.parse(localStorage.getItem('nm_favoritos') || '[]')
    setIsFav(favs.includes(animal.id))
    trackAnimalClick(animal.id)
  }, [animal])

  useEffect(() => {
    async function loadResultados() {
      if (!animal?.num_catalogo) { setResultados([]); return }
      const { data } = await supabase
        .from('nm_resultados')
        .select('tipo_prova, colocacao, pontuacao')
        .eq('tipo_campeonato', animal.tipo_campeonato)
        .eq('tipo_marcha', animal.tipo_marcha)
        .eq('categoria', animal.categoria)
        .eq('num_catalogo', animal.num_catalogo)
        .in('tipo_prova', ['marcha', 'final'])
      setResultados(data || [])
    }
    loadResultados()
  }, [animal])

  const schedule = useMemo(() => (animal ? getAnimalSchedule(animal) : []), [animal])

  function toggleFav() {
    if (!animal) return
    const favs: number[] = JSON.parse(localStorage.getItem('nm_favoritos') || '[]')
    const numId = animal.id
    if (favs.includes(numId)) {
      const next = favs.filter(f => f !== numId)
      localStorage.setItem('nm_favoritos', JSON.stringify(next))
      setIsFav(false)
    } else {
      favs.push(numId)
      localStorage.setItem('nm_favoritos', JSON.stringify(favs))
      setIsFav(true)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!animal) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-[var(--text-muted)]">Animal nao encontrado</p>
      <Link href="/" className="text-[var(--accent)] text-sm">Voltar</Link>
    </div>
  )

  return (
    <main className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">{animal.nome}</h1>
            <p className="text-[10px] text-[var(--text-muted)]">{animal.categoria}{(animal.tipo_campeonato === 'Exclusivamente Marcha' || animal.tambem_excl_marcha) ? ' · Excl. Marcha' : ''}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
        {/* Name & Badges */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  animal.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                }`}>
                  {animal.tipo_marcha === 'MB' ? 'Marcha Batida' : 'Marcha Picada'}
                </span>
                {(animal.tipo_campeonato === 'Exclusivamente Marcha' || animal.tambem_excl_marcha) && (
                  <span className="text-xs font-bold px-2 py-1 rounded bg-[var(--accent-dark)]/10 text-[var(--accent-dark)]">
                    Excl. Marcha
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1">{animal.nome}</h2>
              <p className="text-sm text-[var(--text-secondary)]">{animal.campeonato}</p>
            </div>
            <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
              <button onClick={toggleFav} className="p-1 -mr-1">
                <svg className={`w-5 h-5 ${isFav ? 'text-red-400 fill-red-400' : 'text-[var(--text-muted)]'}`} viewBox="0 0 24 24" stroke="currentColor" fill={isFav ? 'currentColor' : 'none'}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              {animal.num_catalogo && (
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase">Catalogo</p>
                  <p className="text-3xl font-bold text-[var(--accent)]">{animal.num_catalogo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resultado (destaque para Marcha e Final/Categoria) */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide">Resultado</h3>
            <Link href="/resultados" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Ver categoria completa</Link>
          </div>
          <div className="flex gap-2">
            <ResultadoCard label="Marcha" resultado={resultados.find(r => r.tipo_prova === 'marcha')} />
            <ResultadoCard label="Categoria" resultado={resultados.find(r => r.tipo_prova === 'final')} />
          </div>
        </div>

        {/* Quando entra na pista (vinculo com o calendario pela categoria/campeonato) */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">Quando entra na pista</h3>
          </div>

          {schedule.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              Horario ainda nao disponivel para esta categoria. Consulte a{' '}
              <Link href="/calendario" className="text-[var(--accent)]">programacao completa</Link>.
            </p>
          ) : (
            <div className="space-y-2">
              {schedule.map((s, i) => {
                const today = isToday(s.date)
                const past = isPast(s.date)
                return (
                  <Link
                    key={`${s.date}-${i}`}
                    href="/calendario"
                    className={`flex items-center gap-3 rounded-lg p-2.5 border transition-all active:scale-[0.98] ${
                      today ? 'border-[var(--accent)] bg-[var(--accent)]/5' :
                      past ? 'border-[var(--border)] opacity-60' :
                      'border-[var(--border)] bg-[var(--bg-primary)]'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center flex-shrink-0 ${
                      today ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]'
                    }`}>
                      <span className="text-base font-bold leading-none">{s.date.split('/')[0]}</span>
                      <span className="text-[9px] font-medium uppercase leading-none mt-0.5">
                        {parseInt(s.date.split('/')[1]) === 8 ? 'AGO' : 'JUL'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          s.kind === 'morfologia' ? 'bg-black/5 text-[var(--text-primary)]' :
                          s.kind === 'marcha' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' :
                          'bg-black/5 text-[var(--text-secondary)]'
                        }`}>
                          {s.kind === 'morfologia' ? 'Morfologia' : s.kind === 'marcha' ? 'Marcha' : 'Campeonato'}
                        </span>
                        {today && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white uppercase">Hoje</span>}
                      </div>
                      <p className="text-xs font-medium mt-1 truncate">{s.evt.replace(/\s*\((MB|MP)\)\s*$/, '')}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.weekday} · a partir das {s.time}</p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
              <p className="text-[10px] text-[var(--text-muted)] pt-1">
                Horario de inicio do dia. A ordem exata das provas pode variar — acompanhe pela programacao.
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">Dados do Animal</h3>
          <InfoRow label="Registro" value={animal.registro} />
          <InfoRow label="Chip" value={animal.chip} />
          <InfoRow label="No Catalogo" value={animal.num_catalogo ? `#${animal.num_catalogo}` : null} />
          <InfoRow label="Nascimento" value={animal.data_nascimento} />
          <InfoRow label="Idade" value={animal.idade} />
          <InfoRow label="Categoria" value={animal.categoria} />
        </div>

        {/* Genealogy */}
        {(animal.pai || animal.mae) && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-3">Genealogia</h3>
          <div className="flex gap-2">
            <GenealogyCard label="Pai" nome={animal.pai} registro={animal.pai_registro} />
            <GenealogyCard label="Mae" nome={animal.mae} registro={animal.mae_registro} />
          </div>
        </div>
        )}

        {/* Owner Info */}
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">Propriedade</h3>
          <InfoRow label="Criador" value={animal.criador} />
          <InfoRow label="Expositor" value={animal.expositor} />
          <InfoRow label="Haras" value={animal.haras} />
          <InfoRow label="Cidade" value={animal.cidade && animal.uf ? `${animal.cidade} - ${animal.uf}` : animal.cidade} />
        </div>

        {/* Voting */}
        <VotingPanel animalId={animal.id} campeonato={animal.campeonato} />

        {/* Share */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: animal.nome,
                text: `${animal.nome} - ${animal.campeonato} | 43ª Nacional Mangalarga Marchador`,
                url: window.location.href,
              })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          className="w-full py-3 bg-[var(--accent)] text-white font-semibold rounded-xl text-sm active:scale-[0.98] transition-transform"
        >
          Compartilhar Animal
        </button>
      </div>

      <BottomNav />
    </main>
  )
}
