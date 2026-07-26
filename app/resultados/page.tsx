'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase, Campeonato } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { normalizarColocacao, formatColocacaoOficial } from '@/lib/colocacao'

type ResultadoLinha = {
  num_catalogo: string
  nome_animal: string | null
  pontuacao_funcional: string | null
  pontuacao_morfologia: string | null
  pontuacao_andamento: string | null
  colocacao: string | null
}

// Mesmo formato da pagina "Resultado Final" da ABCCMM: Nº, Competidor,
// Funcional, Morfologia, Andamento (=marcha) e Classificação numa unica
// tabela, em vez de 4 provas separadas.
function ResultadoFinalTable({ linhas, catalogosExistentes }: { linhas: ResultadoLinha[]; catalogosExistentes: Set<string> }) {
  if (linhas.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] py-2">Ainda nao julgado</p>
  }
  const ordenadas = [...linhas].sort((a, b) => {
    const oa = normalizarColocacao(a.colocacao)?.ordem ?? 999
    const ob = normalizarColocacao(b.colocacao)?.ordem ?? 999
    return oa - ob
  })
  const colunas = 'grid grid-cols-[2rem_1fr_3rem_3rem_3rem_5.5rem] gap-2 items-center px-1'

  return (
    <div className="text-xs overflow-x-auto">
      <div className={`${colunas} text-[var(--text-muted)] border-b border-[var(--border)] py-1.5 min-w-[26rem]`}>
        <span>Nº</span>
        <span>Competidor</span>
        <span className="text-right">Func.</span>
        <span className="text-right">Morf.</span>
        <span className="text-right">Andam.</span>
        <span className="text-right">Classificação</span>
      </div>
      {ordenadas.map((l, i) => {
        const existe = catalogosExistentes.has(l.num_catalogo)
        const conteudo = (
          <>
            <span className="text-[var(--text-muted)]">{l.num_catalogo}</span>
            <span className="truncate">{l.nome_animal}</span>
            <span className="text-right text-[var(--text-muted)]">{l.pontuacao_funcional ?? '—'}</span>
            <span className="text-right text-[var(--text-muted)]">{l.pontuacao_morfologia ?? '—'}</span>
            <span className="text-right text-[var(--text-muted)]">{l.pontuacao_andamento ?? '—'}</span>
            <span className="text-right font-semibold">{formatColocacaoOficial(l.colocacao)}</span>
          </>
        )
        return existe ? (
          <Link key={i} href={`/animal/${l.num_catalogo}`} className={`${colunas} py-1.5 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-card-hover)] min-w-[26rem]`}>
            {conteudo}
          </Link>
        ) : (
          <div key={i} className={`${colunas} py-1.5 border-b border-[var(--border)] last:border-0 min-w-[26rem]`}>{conteudo}</div>
        )
      })}
    </div>
  )
}

function CategoriaResultado({ campeonato }: { campeonato: Campeonato }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [linhas, setLinhas] = useState<ResultadoLinha[]>([])
  const [catalogosExistentes, setCatalogosExistentes] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  async function toggle() {
    const next = !expanded
    setExpanded(next)
    if (next && !loaded) {
      setLoading(true)
      const [resultadosRes, animaisRes] = await Promise.all([
        supabase
          .from('nm_resultados')
          .select('num_catalogo, nome_animal, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento, colocacao')
          .eq('tipo_campeonato', campeonato.tipo_campeonato)
          .eq('tipo_marcha', campeonato.tipo_marcha)
          .eq('categoria', campeonato.categoria)
          .eq('tipo_prova', 'final'),
        supabase
          .from('nm_animais')
          .select('num_catalogo')
          .eq('tipo_campeonato', campeonato.tipo_campeonato)
          .eq('tipo_marcha', campeonato.tipo_marcha)
          .eq('categoria', campeonato.categoria),
      ])

      setLinhas(resultadosRes.data || [])

      const existentes = new Set<string>()
      for (const a of animaisRes.data || []) {
        if (a.num_catalogo) existentes.add(a.num_catalogo)
      }
      setCatalogosExistentes(existentes)

      setLoaded(true)
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-2 p-3 text-left bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              campeonato.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
            }`}>
              {campeonato.tipo_marcha}
            </span>
            <span className="text-sm font-medium truncate">{campeonato.categoria}</span>
          </div>
        </div>
        <svg className={`w-4 h-4 text-[var(--text-muted)] flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-primary)] p-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResultadoFinalTable linhas={linhas} catalogosExistentes={catalogosExistentes} />
          )}
        </div>
      )}
    </div>
  )
}

export default function ResultadosPage() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [filterMarcha, setFilterMarcha] = useState<string>('Todas')
  const [loading, setLoading] = useState(true)
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)

  const loadCampeonatos = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('nm_campeonatos').select('*').order('categoria', { ascending: true })
    if (filterMarcha !== 'Todas') query = query.eq('tipo_marcha', filterMarcha)
    const { data } = await query
    setCampeonatos(data ?? [])
    setLoading(false)
  }, [filterMarcha])

  useEffect(() => { loadCampeonatos() }, [loadCampeonatos])

  useEffect(() => {
    async function loadSync() {
      const { data } = await supabase.rpc('nm_get_resultados_sync')
      const status = Array.isArray(data) ? data[0] : data
      setUltimaSync(status?.ultima_sincronizacao || null)
    }
    loadSync()
  }, [])

  const grouped: Record<string, Campeonato[]> = {}
  for (const c of campeonatos) {
    const key = c.tipo_campeonato
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(c)
  }

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-base font-bold">Resultados por Categoria</h1>
          </div>
          {ultimaSync && (
            <p className="text-[10px] text-[var(--text-muted)] mb-3 ml-8">
              Atualizado em {new Date(ultimaSync).toLocaleString('pt-BR')}
            </p>
          )}
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5">
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
                {m === 'Todas' ? 'Todas' : m === 'MB' ? 'Marcha Batida' : 'Marcha Picada'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          Object.entries(grouped).map(([tipo, items]) => (
            <div key={tipo}>
              <h2 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2 px-1">{tipo}</h2>
              <div className="space-y-2">
                {items.map(c => <CategoriaResultado key={c.id} campeonato={c} />)}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </main>
  )
}
