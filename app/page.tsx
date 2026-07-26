'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, Animal } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
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
const CACHE_KEY = 'nm_cache_pista'
const PENDENTES_KEY = 'nm_votos_pendentes'

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 12px center',
}

type Suggestion = { label: string; type: 'haras' | 'criador' | 'expositor'; value: string }
type VotoPendente = { usuarioId: number; animalId: number; campeonato: string }

function lerVotosPendentes(): VotoPendente[] {
  try { return JSON.parse(localStorage.getItem(PENDENTES_KEY) || '[]') } catch { return [] }
}
function salvarVotosPendentes(v: VotoPendente[]) {
  try { localStorage.setItem(PENDENTES_KEY, JSON.stringify(v)) } catch { /* localStorage indisponivel */ }
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>}>
      <HomeContent />
    </Suspense>
  )
}

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, ensureUser } = useAuth()
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
  const [categoriaToast, setCategoriaToast] = useState<string | null>(null)
  const categoriaRef = useRef<{ categoria: string | null; marcha: string | null }>({ categoria: null, marcha: null })
  // Enquanto um voto esta em andamento, evita que a hidratacao de "meu voto"
  // (disparada pela mudanca de `user` quando cria o cadastro anonimo na
  // hora) sobrescreva a atualizacao otimista com dados ainda desatualizados.
  const votandoRef = useRef(false)
  const [categorias, setCategorias] = useState<string[]>([])
  const [criadores, setCriadores] = useState<string[]>([])
  const [expositores, setExpositores] = useState<string[]>([])
  const [harasList, setHarasList] = useState<string[]>([])
  const [campeonatoFilter, setCampeonatoFilter] = useState<string | null>(campeonatoParam)
  const [votosPorAnimal, setVotosPorAnimal] = useState<Record<number, number>>({})
  const [meuVotoPorCampeonato, setMeuVotoPorCampeonato] = useState<Record<string, number | null>>({})
  const [animals, setAnimals] = useState<Animal[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      return cache?.animals || []
    } catch { return [] }
  })
  const [total, setTotal] = useState(() => {
    if (typeof window === 'undefined') return 0
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      return cache?.total || 0
    } catch { return 0 }
  })
  const [loading, setLoading] = useState(false)
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

  // Busca a categoria em pista; se `avisar` for true e o valor mudou desde a
  // ultima vez, mostra um toast (usado quando o admin troca a categoria com
  // a pagina ja aberta - detectado via realtime abaixo).
  const carregarCategoriaAtual = useCallback(async (avisar: boolean) => {
    const { data, error } = await supabase.rpc('nm_get_categoria_atual')
    const atual = Array.isArray(data) ? data[0] : data
    if (!error && atual?.categoria) {
      const mudou = avisar && (categoriaRef.current.categoria !== atual.categoria || categoriaRef.current.marcha !== atual.tipo_marcha)
      categoriaRef.current = { categoria: atual.categoria, marcha: atual.tipo_marcha || null }
      setCategoriaAtual(atual.categoria)
      setMarchaAtual(atual.tipo_marcha || null)
      if (mudou) {
        const label = `Agora na pista: ${atual.categoria}${atual.tipo_marcha ? ` · ${atual.tipo_marcha === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}` : ''}`
        setCategoriaToast(label)
        setTimeout(() => setCategoriaToast(null), 6000)
      }
    } else {
      categoriaRef.current = { categoria: null, marcha: null }
      // Sem categoria configurada no admin - nao ha o que travar, cai pra
      // busca livre no catalogo inteiro.
      setSearchMode(true)
    }
    setCategoriaAtualCarregada(true)
  }, [])

  useEffect(() => {
    carregarCategoriaAtual(false)

    const canal = supabase
      .channel('categoria-atual-mudancas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nm_categoria_atual' }, () => carregarCategoriaAtual(true))
      .subscribe()

    return () => { supabase.removeChannel(canal) }
  }, [carregarCategoriaAtual])

  // Enquanto travado na pista, a categoria/marcha do filtro sempre acompanha
  // a "categoria em pista" atual - o usuario nao escolhe.
  useEffect(() => {
    if (!searchMode && categoriaAtual) {
      setCategoria(categoriaAtual)
      setMarcha(marchaAtual || 'Todas')
    }
  }, [searchMode, categoriaAtual, marchaAtual])

  // Votos da categoria em pista, mostrados na lista da Home. Busca de novo
  // (em vez de tentar remendar o estado local) sempre que alguem vota -
  // mais simples e evita contagem errada, e o volume de votos por
  // categoria e pequeno o suficiente pra isso ser barato.
  useEffect(() => {
    if (searchMode || !categoriaAtual) {
      setVotosPorAnimal({})
      return
    }

    let cancelado = false
    async function carregarVotos() {
      const { data } = await supabase.rpc('nm_votos_por_categoria', {
        p_categoria: categoriaAtual,
        p_tipo_marcha: marchaAtual,
      })
      if (cancelado || !data) return
      const mapa: Record<number, number> = {}
      for (const row of data as { animal_id: number; total_votos: number }[]) {
        mapa[row.animal_id] = Number(row.total_votos)
      }
      setVotosPorAnimal(mapa)
    }
    carregarVotos()

    const canal = supabase
      .channel(`votos-pista-${categoriaAtual}-${marchaAtual}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nm_votos' }, carregarVotos)
      .subscribe()

    return () => {
      cancelado = true
      supabase.removeChannel(canal)
    }
  }, [searchMode, categoriaAtual, marchaAtual])

  // Meu voto em cada campeonato presente na lista atual (pra saber qual
  // coracao pintar de vermelho).
  useEffect(() => {
    if (searchMode || !user || animals.length === 0) { setMeuVotoPorCampeonato({}); return }
    if (votandoRef.current) return
    const campeonatosUnicos = [...new Set(animals.map(a => a.campeonato).filter(Boolean))]
    let cancelado = false
    Promise.all(campeonatosUnicos.map(async camp => {
      const { data } = await supabase.rpc('nm_meu_voto', { p_usuario_id: user.id, p_campeonato: camp })
      return [camp, data && data.length > 0 ? data[0].animal_id : null] as const
    })).then(entries => {
      if (cancelado || votandoRef.current) return
      setMeuVotoPorCampeonato(Object.fromEntries(entries))
    })
    return () => { cancelado = true }
  }, [searchMode, user, animals])

  // Tenta de novo votos que falharam por falta de rede, assim que a conexao volta.
  useEffect(() => {
    async function flush() {
      const pendentes = lerVotosPendentes()
      if (pendentes.length === 0) return
      const restantes: VotoPendente[] = []
      for (const p of pendentes) {
        try {
          const { error } = await supabase.rpc('nm_toggle_voto', { p_usuario_id: p.usuarioId, p_animal_id: p.animalId, p_campeonato: p.campeonato })
          if (error) restantes.push(p)
        } catch {
          restantes.push(p)
        }
      }
      salvarVotosPendentes(restantes)
    }
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  const liderId = useMemo(() => {
    let melhorId: number | null = null
    let melhorTotal = 0
    for (const [idStr, total] of Object.entries(votosPorAnimal)) {
      if (total > melhorTotal) { melhorTotal = total; melhorId = Number(idStr) }
    }
    return melhorTotal > 0 ? melhorId : null
  }, [votosPorAnimal])

  // Voto direto no card, sem abrir a pagina do animal. Otimista: atualiza a
  // tela na hora, e so guarda pra tentar de novo depois se a rede falhar -
  // pensado pro sinal ruim de parque de exposicao.
  async function votarInline(animal: Animal, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!animal.campeonato) return

    // Trava a hidratacao de "meu voto" enquanto isso roda - criar o usuario
    // anonimo muda `user`, o que por si so dispara aquele efeito, e ele
    // poderia sobrescrever a atualizacao otimista abaixo com dados antigos.
    votandoRef.current = true

    // Sem cadastro ainda? Cria um usuario anonimo na hora (so device_id) em
    // vez de mandar pra tela de login - ninguem quer se cadastrar pra votar.
    const votante = user ?? await ensureUser()
    if (!votante) { votandoRef.current = false; return }

    const campeonato = animal.campeonato
    const votoAnterior = meuVotoPorCampeonato[campeonato] ?? null
    const novoVoto = votoAnterior === animal.id ? null : animal.id

    setMeuVotoPorCampeonato(prev => ({ ...prev, [campeonato]: novoVoto }))
    setVotosPorAnimal(prev => {
      const next = { ...prev }
      if (votoAnterior != null) next[votoAnterior] = Math.max(0, (next[votoAnterior] || 0) - 1)
      if (novoVoto != null) next[novoVoto] = (next[novoVoto] || 0) + 1
      return next
    })

    try {
      const { error } = await supabase.rpc('nm_toggle_voto', {
        p_usuario_id: votante.id,
        p_animal_id: animal.id,
        p_campeonato: campeonato,
      })
      if (error) throw error
    } catch {
      salvarVotosPendentes([...lerVotosPendentes(), { usuarioId: votante.id, animalId: animal.id, campeonato }])
    } finally {
      votandoRef.current = false
    }
  }

  function abrirBusca() {
    setSearchMode(true)
    setSearch('')
    setActiveFilter(null)
    setCategoria('Todas')
    setMarcha('Todas')
    // Busca livre deve varrer o catalogo inteiro, nao so a categoria em
    // pista - garante que nenhum filtro de campeonato de uma visita
    // anterior (ex: veio de um link com ?campeonato=X) fique preso.
    setCampeonatoFilter(null)
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

  // Clique em "Ao Vivo" no menu inferior enquanto ja em "/": o Link nao
  // navega (mesma rota), entao o BottomNav avisa por evento pra sairmos da
  // busca livre manualmente.
  useEffect(() => {
    function irAoVivo() { fecharBusca() }
    window.addEventListener('nm-ir-ao-vivo', irAoVivo)
    return () => window.removeEventListener('nm-ir-ao-vivo', irAoVivo)
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
    const modoPista = !searchMode

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
        const pattern = `%${s}%`
        query = query.or(`nome.ilike.${pattern},criador.ilike.${pattern},expositor.ilike.${pattern},pai.ilike.${pattern},mae.ilike.${pattern},haras.ilike.${pattern}`)
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
      // So guarda cache da visao "em pista" (pagina 1) - e o cenario de
      // sinal ruim no parque que queremos amenizar.
      if (modoPista && reset) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ animals: data, total: count ?? 0 })) } catch { /* ignora */ }
      }
    }
    // Em erro de rede (comum no parque com sinal fraco): nao apaga a lista
    // que ja estava na tela, deixa o que tinha (cache ou fetch anterior).
    setLoading(false)
  }, [search, marcha, categoria, campeonatoFilter, activeFilter, searchMode])

  useEffect(() => {
    if (!categoriaAtualCarregada) return
    setPage(0)
    // So limpa a lista visivel na busca livre - na visao travada da pista,
    // mantem o que tiver na tela (cache ou carga anterior) ate o fetch novo
    // responder, em vez de piscar pra vazio a cada troca de categoria.
    if (searchMode) setAnimals([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchAnimals(0, true)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, marcha, categoria, campeonatoFilter, activeFilter, fetchAnimals, categoriaAtualCarregada, searchMode])

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
      {categoriaToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] max-w-[90vw] bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-pulse flex-shrink-0" />
          <span className="truncate">{categoriaToast}</span>
        </div>
      )}
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
          {animals.map(animal => {
            const votos = votosPorAnimal[animal.id] || 0
            const ehLider = !searchMode && animal.id === liderId
            const jaVotei = !searchMode && animal.campeonato != null && meuVotoPorCampeonato[animal.campeonato] === animal.id
            return (
            <Link
              key={animal.id}
              href={`/animal/${animal.num_catalogo || animal.id}`}
              onClick={() => trackAnimalClick(animal.id)}
              className={`block bg-[var(--bg-card)] rounded-xl p-3 border transition-all active:scale-[0.98] ${
                ehLider ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
              }`}
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
                    {ehLider && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white flex items-center gap-1">
                        🏆 Favorito da Torcida
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold truncate">{animal.nome}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{animal.categoria}</p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                  {animal.num_catalogo && (
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] uppercase">Catalogo</p>
                      <p className="text-2xl font-bold text-[var(--accent)] leading-none">{animal.num_catalogo}</p>
                    </div>
                  )}
                  {!searchMode && (
                    <button
                      onClick={e => votarInline(animal, e)}
                      aria-label={jaVotei ? 'Remover meu voto' : 'Votar neste animal'}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                        jaVotei ? 'bg-[var(--accent)] text-white' : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
                      }`}
                    >
                      <span>{jaVotei ? '♥' : '♡'}</span>
                      {votos > 0 && <span>{votos}</span>}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                <span className="font-mono">Reg. {animal.registro}</span>
                {animal.haras && <span className="text-[var(--accent)] truncate">{animal.haras}</span>}
                <span className="truncate">Pai: {animal.pai || '—'}</span>
                <span className="truncate">Mae: {animal.mae || '—'}</span>
              </div>
            </Link>
            )
          })}
        </div>

        {loading && animals.length === 0 && (
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
