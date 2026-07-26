'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'
import { supabase, Campeonato } from '@/lib/supabase'
import { SCHEDULE, getEventType, getMarchaType, isToday, isPast, findCampeonatoParaEvento } from '@/lib/calendario'

export default function CalendarioPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'todos' | 'MB' | 'MP'>('todos')
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [expandedDay, setExpandedDay] = useState<string | null>(() => {
    const today = SCHEDULE.find(s => isToday(s.date))
    return today?.date || null
  })
  const destaqueRef = useRef<HTMLDivElement>(null)

  const nextIdx = SCHEDULE.findIndex(s => !isPast(s.date))

  // Pra deixar cada prova do calendario clicavel, levando pro catalogo
  // filtrado daquela categoria.
  useEffect(() => {
    supabase.from('nm_campeonatos').select('*').then(({ data }) => setCampeonatos(data || []))
  }, [])

  // Ao abrir a pagina, leva direto pro dia de hoje (ou o proximo, se hoje
  // estiver fora do periodo da expo) - sem isso o usuario tinha que rolar
  // manualmente por todos os dias ja passados pra achar o de hoje.
  useEffect(() => {
    destaqueRef.current?.scrollIntoView({ block: 'start' })
  }, [])

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <div>
              <h1 className="text-base font-bold">Programacao de Julgamentos</h1>
              <p className="text-[10px] text-[var(--text-muted)]">18/07 a 01/08 · Parque da Gameleira - BH/MG</p>
            </div>
          </div>
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5">
            {(['todos', 'MB', 'MP'] as const).map(m => (
              <button
                key={m}
                onClick={() => setFilter(m)}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  filter === m
                    ? m === 'MB' ? 'bg-[var(--mb-color)] text-white' : m === 'MP' ? 'bg-[var(--mp-color)] text-white' : 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {m === 'todos' ? 'Todos' : m === 'MB' ? 'M. Batida' : 'M. Picada'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full space-y-2">
        {SCHEDULE.map((day, idx) => {
          const today = isToday(day.date)
          const past = isPast(day.date)
          const expanded = expandedDay === day.date
          const isNext = idx === nextIdx && !today

          const filteredEvents = filter === 'todos'
            ? day.events
            : day.events.filter(e => {
                const mt = getMarchaType(e)
                return mt === null || mt === filter
              })

          if (filteredEvents.length === 0) return null

          return (
            <div
              key={day.date}
              ref={today || isNext ? destaqueRef : undefined}
              className={`rounded-xl border overflow-hidden transition-all scroll-mt-24 ${
                today ? 'border-[var(--accent)] bg-[var(--accent)]/5' :
                isNext ? 'border-[var(--accent-dark)]/50 bg-[var(--accent-dark)]/5' :
                day.highlight ? 'border-[var(--accent-dark)]/30' :
                past ? 'border-[var(--border)] opacity-60' :
                'border-[var(--border)]'
              }`}
            >
              <button
                onClick={() => setExpandedDay(expanded ? null : day.date)}
                className="w-full flex items-center gap-3 p-3 text-left bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                  today ? 'bg-[var(--accent)] text-white' :
                  isNext ? 'bg-[var(--accent-dark)] text-white' :
                  day.highlight ? 'bg-[var(--accent-dark)]/20 text-[var(--accent-dark)]' :
                  'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                }`}>
                  <span className="text-lg font-bold leading-none">{day.date.split('/')[0]}</span>
                  <span className="text-[9px] font-medium uppercase leading-none mt-0.5">
                    {parseInt(day.date.split('/')[1]) === 8 ? 'AGO' : 'JUL'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{day.weekday}</p>
                    {today && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white uppercase">Hoje</span>}
                    {isNext && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)] text-white uppercase">Proximo</span>}
                    {day.highlight && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)]/20 text-[var(--accent-dark)] uppercase">Finais</span>}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Inicio {day.time} · {filteredEvents.length} {filteredEvents.length === 1 ? 'prova' : 'provas'}
                  </p>
                </div>
                <svg className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded && (
                <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]">
                  {filteredEvents.map((evt, i) => {
                    const type = getEventType(evt)
                    const mt = getMarchaType(evt)
                    const nomeCampeonato = campeonatos.length > 0 ? findCampeonatoParaEvento(evt, campeonatos) : null
                    return (
                      <div
                        key={i}
                        onClick={nomeCampeonato ? () => router.push(`/?campeonato=${encodeURIComponent(nomeCampeonato)}`) : undefined}
                        className={`flex items-start gap-2.5 px-3 py-2 border-b border-[var(--border)] last:border-b-0 ${
                          nomeCampeonato ? 'cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors' : ''
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          type === 'especial' ? 'bg-[var(--accent-dark)]' :
                          type === 'morfologia' ? 'bg-[var(--text-primary)]' :
                          type === 'marcha' ? 'bg-[var(--accent)]' :
                          type === 'progenie' ? 'bg-[var(--text-secondary)]' :
                          'bg-[var(--text-muted)]'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs ${type === 'especial' ? 'font-bold text-[var(--accent-dark)]' : ''} ${nomeCampeonato ? 'text-[var(--accent)] underline decoration-dotted underline-offset-2' : ''}`}>{evt}</p>
                        </div>
                        {mt && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0 ${
                            mt === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                          }`}>{mt}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        <div className="text-center py-4">
          <p className="text-[10px] text-[var(--text-muted)]">Programacao sujeita a mudancas sem aviso previo</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Transmissao ao vivo pelo YouTube da ABCCMM</p>
        </div>
      </div>

      <BottomNav />
    </main>
  )
}
