'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase, Animal } from '@/lib/supabase'
import Link from 'next/link'
import Banner from '@/components/Banner'
import BottomNav from '@/components/BottomNav'
import VideoAoVivo from '@/components/VideoAoVivo'
import { trackAnimalClick } from '@/components/Analytics'

const MARCHAS = [
  { value: 'Todas', label: 'Todas' },
  { value: 'MB', label: 'M. Batida' },
  { value: 'MP', label: 'M. Picada' },
]
const PER_PAGE = 30

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 12px center',
}

type Suggestion = { label: string; type: 'haras' | 'criador' | 'expositor'; value: string }

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const campeonatoParam = searchParams.get('campeonato')

  // Modo padrao: trava na categoria "em pista" configurada no admin, sem
  // filtro editavel - evita o usuario ficar mexendo em filtro toda hora.
  // A busca livre (com filtros de marcha/categoria) so aparece quando o
  // usuario aciona o icone de busca (ou chega aqui via link de campeonato).
  const [searchMode, setSearchMode] = useState(() => !!campeonatoParam)

  const [search, setSearch] = useState('')
  const [marcha, setMarcha] = useState<string>('Todas')
  const [categoria, setCategoria] = useState<string>('Todas')
  const [categoriaAtual, setCategoriaAtual] = useState<string | null>(null)
  const [marchaAtual, setMarchaAtual] = useState<string | null>(null)
  const [categoriaAtualCarregada, setCategoriaAtualCarregada] = useState(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [criadores, setCriadores] = useState<string[]>([])
  const [expositores, setExpositores] = useState<string[]>([])
  const [harasList, setHarasList] = useState<string[]>([])
  const [campeonatoFilter, setCampeonatoFilter] = useState<string | null>(campeonatoParam)
  const [animals, setAnimals] = useState<Animal[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeFilter, setActiveFilter] = useState<{ type: string; value: string } | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCampeonatoFilter(campeonatoParam)
  }, [campeonatoParam])

  useEffect(() => {
    async function loadFilters() {
      const [catRes, criRes, expRes, harRes] = await Promise.all([
        supabase.rpc('nm_distinct_categorias'),
        supabase.rpc('nm_distinct_criadores'),
        supabase.rpc('nm_distinct_expositores'),
        supabase.rpc('nm_distinct_haras'),
      ])
      if (catRes.data) setCategorias(catRes.data.map((d: { categoria: string }) => d.categoria).filter(Boolean))
      if (criRes.data) setCriadores(criRes.data.map((d: { criador: string }) => d.criador).filter(Boolean))
      if (expRes.data) setExpositores(expRes.data.map((d: { expositor: string }) => d.expositor).filter(Boolean))
      if (harRes.data) setHarasList(harRes.data.map((d: { haras: string }) => d.haras).filter(Boolean))
    }
    loadFilters()
  }, [])

  useEffect(() => {
    async function loadCategoriaAtual() {
      const { data, error } = await supabase.rpc('nm_get_categoria_atual')
      const atual = Array.isArray(data) ? data[0] : data
      if (!error && atual?.categoria) {
        setCategoriaAtual(atual.categoria)
        setMarchaAtual(atual.tipo_marcha || null)
      } else {
        // Sem categoria configurada no admin - nao ha o que travar, cai pra
        // busca livre no catalogo inteiro.
        setSearchMode(true)
      }
      setCategoriaAtualCarregada(true)
    }
    loadCategoriaAtual()
  }, [])

  // Enquanto travado na pista, a categoria/marcha do filtro sempre acompanha
  // a "categoria em pista" atual - o usuario nao escolhe.
  useEffect(() => {
    if (!searchMode && categoriaAtual) {
      setCategoria(categoriaAtual)
      setMarcha(marchaAtual || 'Todas')
    }
  }, [searchMode, categoriaAtual, marchaAtual])

  function abrirBusca() {
    setSearchMode(true)
    setSearch('')
    setActiveFilter(null)
    setCategoria('Todas')
    setMarcha('Todas')
  }

  function fecharBusca() {
    setSearchMode(false)
    setSearch('')
    setActiveFilter(null)
    setShowSuggestions(false)
    setCampeonatoFilter(null)
    // categoria/marcha voltam pra "em pista" sozinhas pelo efeito acima.
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (q.length < 2) return []
    const results: Suggestion[] = []
    for (const h of harasList) {
      if (h.toLowerCase().includes(q)) results.push({ label: h, type: 'haras', value: h })
      if (results.length >= 5) break
    }
    for (const c of criadores) {
      if (c.toLowerCase().includes(q)) results.push({ label: c, type: 'criador', value: c })
      if (results.length >= 10) break
    }
    for (const e of expositores) {
      if (e.toLowerCase().includes(q)) results.push({ label: e, type: 'expositor', value: e })
      if (results.length >= 15) break
    }
    return results.slice(0, 8)
  }, [search, harasList, criadores, expositores])

  const fetchAnimals = useCallback(async (pageNum: number, reset: boolean) => {
    setLoading(true)
    const from = pageNum * PER_PAGE
    const to = from + PER_PAGE - 1

    let query = supabase
      .from('nm_animais')
      .select('*', { count: 'exact' })
      .order('num_catalogo_int', { ascending: true, nullsFirst: false })
      .range(from, to)

    if (activeFilter) {
      if (activeFilter.type === 'haras') query = query.eq('haras', activeFilter.value)
      else if (activeFilter.type === 'criador') query = query.eq('criador', activeFilter.value)
      else if (activeFilter.type === 'expositor') query = query.eq('expositor', activeFilter.value)
    } else if (search.trim()) {
      const s = search.trim()
      if (/^\d+$/.test(s)) {
        query = query.or(`registro.eq.${s},chip.eq.${s},num_catalogo.eq.${s}`)
      } else {
        query = query.ilike('nome', `%${s}%`)
      }
    }
    if (marcha !== 'Todas') query = query.eq('tipo_marcha', marcha)
    if (categoria !== 'Todas') query = query.eq('categoria', categoria)
    if (campeonatoFilter) query = query.eq('campeonato', campeonatoFilter)

    const { data, count, error } = await query

    if (!error && data) {
      if (reset) {
        setAnimals(data)
      } else {
        setAnimals(prev => [...prev, ...data])
      }
      setTotal(count ?? 0)
      setHasMore(data.length === PER_PAGE)
    }
    setLoading(false)
  }, [search, marcha, categoria, campeonatoFilter, activeFilter])

  useEffect(() => {
    if (!categoriaAtualCarregada) return
    setPage(0)
    setAnimals([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchAnimals(0, true)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, marcha, categoria, campeonatoFilter, activeFilter, fetchAnimals, categoriaAtualCarregada])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        const nextPage = page + 1
        setPage(nextPage)
        fetchAnimals(nextPage, false)
      }
    }, { threshold: 0.1 })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [page, loading, hasMore, fetchAnimals])

  function selectSuggestion(s: Suggestion) {
    setActiveFilter({ type: s.type, value: s.value })
    setSearch(s.label)
    setShowSuggestions(false)
    setCategoria('Todas')
    setMarcha('Todas')
  }

  function clearSearch() {
    setSearch('')
    setActiveFilter(null)
    setShowSuggestions(false)
  }

  const typeLabel = { haras: 'Haras', criador: 'Criador', expositor: 'Expositor' }
  const typeColor = { haras: 'text-[var(--accent)]', criador: 'text-[var(--text-primary)]', expositor: 'text-[var(--text-secondary)]' }

  return (
    <main className="flex flex-col min-h-screen">
      <Banner posicao="header_topo" />
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 pt-4 pb-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              MM
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">43ª Nacional</h1>
              <p className="text-xs text-[var(--text-muted)]">Mangalarga Marchador</p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-[var(--accent)] leading-none">{total.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase">animais</p>
              </div>
              {!searchMode ? (
                <button
                  onClick={abrirBusca}
                  aria-label="Buscar"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              ) : categoriaAtual && (
                <button
                  onClick={fecharBusca}
                  aria-label="Voltar pra pista atual"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <Banner posicao="topo" />

          {!searchMode && categoriaAtual && (
            <div className="mb-1 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl px-4 py-3 text-center">
              <p className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-semibold">Agora na Pista</p>
              <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                {categoriaAtual}{marchaAtual && <span className="text-[var(--accent)]"> · {marchaAtual === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}</span>}
              </p>
            </div>
          )}

          {searchMode && (
            <>
              {campeonatoFilter && (
                <div className="flex items-center gap-2 mb-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg px-3 py-2">
                  <span className="text-xs text-[var(--accent)] flex-1 truncate">{campeonatoFilter}</span>
                  <button onClick={() => setCampeonatoFilter(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}

              {/* Search with autocomplete */}
              <div className="relative mb-3" ref={searchRef}>
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar animal, haras, criador, expositor..."
                  value={search}
                  onChange={e => {
                    const value = e.target.value
                    setSearch(value)
                    setActiveFilter(null)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                  className="w-full pl-10 pr-10 py-2.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                {(search || activeFilter) && (
                  <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}

                {/* Active filter badge */}
                {activeFilter && (
                  <div className="absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className={`text-[9px] font-bold uppercase ${typeColor[activeFilter.type as keyof typeof typeColor]}`}>
                      {typeLabel[activeFilter.type as keyof typeof typeLabel]}:
                    </span>
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && !activeFilter && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl z-50">
                    {suggestions.map((s, i) => (
                      <button
                        key={`${s.type}-${s.value}-${i}`}
                        onClick={() => selectSuggestion(s)}
                        className="w-full px-4 py-2.5 text-left hover:bg-[var(--bg-card-hover)] transition-colors flex items-center gap-3 border-b border-[var(--border)] last:border-0"
                      >
                        <span className={`text-[9px] font-bold uppercase w-16 flex-shrink-0 ${typeColor[s.type]}`}>
                          {typeLabel[s.type]}
                        </span>
                        <span className="text-sm truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {/* Row 1: Marcha + Filtros toggle */}
                <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                  <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 flex-shrink-0">
                    {MARCHAS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setMarcha(m.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          marcha === m.value
                            ? m.value === 'MB' ? 'bg-[var(--mb-color)] text-white' : m.value === 'MP' ? 'bg-[var(--mp-color)] text-white' : 'bg-[var(--accent)] text-white'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categoria always visible */}
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none"
                  style={selectStyle}>
                  <option value="Todas">Todas as categorias</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </header>

      <div className="px-4 pt-3 max-w-2xl mx-auto w-full">
        <Link
          href="/calendario"
          className="flex items-center gap-3 bg-black/[0.03] border border-black/10 rounded-xl p-3 hover:border-black/20 transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Programacao de Julgamentos</p>
            <p className="text-[10px] text-[var(--text-muted)]">18/07 a 01/08 · Confira o calendario completo</p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="px-4 pt-2 max-w-2xl mx-auto w-full">
        <Link
          href="/resultados"
          className="flex items-center gap-3 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-xl p-3 hover:border-[var(--accent)]/40 transition-all active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--accent)]">Resultados por Categoria</p>
            <p className="text-[10px] text-[var(--text-muted)]">Marcha, Morfologia, Funcional e Categoria</p>
          </div>
          <svg className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full">
        <div className="space-y-2">
          {animals.map(animal => (
            <Link
              key={animal.id}
              href={`/animal/${animal.num_catalogo || animal.id}`}
              onClick={() => trackAnimalClick(animal.id)}
              className="block bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      animal.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                    }`}>
                      {animal.tipo_marcha === 'MB' ? 'M. Batida' : 'M. Picada'}
                    </span>
                    {(animal.tipo_campeonato === 'Exclusivamente Marcha' || animal.tambem_excl_marcha) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)]/10 text-[var(--accent-dark)]">
                        Excl. Marcha
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold truncate">{animal.nome}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{animal.categoria}</p>
                </div>
                {animal.num_catalogo && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase">Catalogo</p>
                    <p className="text-2xl font-bold text-[var(--accent)] leading-none">{animal.num_catalogo}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                <span className="font-mono">Reg. {animal.registro}</span>
                {animal.haras && <span className="text-[var(--accent)] truncate">{animal.haras}</span>}
                <span className="truncate">Pai: {animal.pai || '—'}</span>
                <span className="truncate">Mae: {animal.mae || '—'}</span>
              </div>
            </Link>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && animals.length === 0 && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">Nenhum animal encontrado</p>
            <p className="text-xs mt-1">Tente outros filtros ou termos de busca</p>
          </div>
        )}

        {hasMore && <div ref={sentinelRef} className="h-10" />}
      </div>

      <Banner posicao="rodape" />

      <BottomNav />
      <Banner posicao="nav_rodape" />
      {!searchMode && <VideoAoVivo />}
    </main>
  )
}
