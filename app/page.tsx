'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, Animal } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import Banner from '@/components/Banner'
import BottomNav from '@/components/BottomNav'
import { trackAnimalClick, trackWhatsappClick } from '@/components/Analytics'
import { formatColocacaoOficial } from '@/lib/colocacao'

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
type ResultadoResumo = { colocacao: string | null; pontuacao_funcional: string | null; pontuacao_morfologia: string | null; pontuacao_andamento: string | null }
type Pista = { id: number; categoria: string; tipo_marcha: string | null }

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
  const buscaParam = searchParams.get('busca')

  // Modo padrao: trava na categoria "em pista" configurada no admin, sem
  // filtro editavel - evita o usuario ficar mexendo em filtro toda hora.
  // A busca livre (com filtros de marcha/categoria) so aparece quando o
  // usuario aciona o icone de busca (ou chega aqui via link de campeonato
  // ou do icone de busca flutuante global, com ?busca=1).
  const [searchMode, setSearchMode] = useState(() => !!campeonatoParam || !!buscaParam)
  // So foca (e abre o teclado no celular) quando o usuario clicou de
  // proposito num icone de busca (o da propria Home ou o flutuante global)
  // - chegar aqui por um link de campeonato (calendario/campeonatos) nao
  // deve abrir o teclado sozinho.
  const [autoFocusBusca, setAutoFocusBusca] = useState(() => !!buscaParam)

  const [search, setSearch] = useState('')
  const [marcha, setMarcha] = useState<string>('Todas')
  const [categoria, setCategoria] = useState<string>('Todas')
  // Ate 2 "pistas" (rings) podem estar em julgamento ao mesmo tempo - o
  // usuario escolhe qual acompanhar quando ha 2 configuradas. categoriaAtual/
  // marchaAtual sempre refletem a pista atualmente selecionada, entao toda a
  // logica de filtro/voto que ja dependia delas continua igual.
  const [pistas, setPistas] = useState<Pista[]>([])
  const [pistaSelecionadaId, setPistaSelecionadaId] = useState<number | null>(null)
  const [categoriaAtual, setCategoriaAtual] = useState<string | null>(null)
  const [marchaAtual, setMarchaAtual] = useState<string | null>(null)
  const [categoriaAtualCarregada, setCategoriaAtualCarregada] = useState(false)
  const [categoriaToast, setCategoriaToast] = useState<string | null>(null)
  const pistasRef = useRef<Pista[]>([])
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
  const [whatsappConfig, setWhatsappConfig] = useState<{ numero: string | null; mensagem_template: string | null } | null>(null)
  const [resultadosPorCatalogo, setResultadosPorCatalogo] = useState<Record<string, ResultadoResumo>>({})
  // Marca os catalogos ja consultados (independente de ter achado resultado
  // ou nao) pra nao reconsultar toda hora - so o que ainda nao foi tentado
  // entra na proxima busca em lote.
  const catalogosConsultadosRef = useRef<Set<string>>(new Set())
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
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCampeonatoFilter(campeonatoParam)
  }, [campeonatoParam])

  useEffect(() => {
    supabase.rpc('nm_get_whatsapp_config').then(({ data }) => {
      const atual = Array.isArray(data) ? data[0] : data
      if (atual?.numero) setWhatsappConfig(atual)
    })
  }, [])

  // Resultado ja divulgado de cada animal visivel na lista, buscado em
  // lote (so os catalogos ainda nao consultados a cada pagina nova).
  useEffect(() => {
    const pendentes = animals
      .map(a => a.num_catalogo)
      .filter((n): n is string => !!n && !catalogosConsultadosRef.current.has(n))
    if (pendentes.length === 0) return
    pendentes.forEach(n => catalogosConsultadosRef.current.add(n))

    supabase
      .from('nm_resultados')
      .select('num_catalogo, colocacao, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento')
      .eq('tipo_prova', 'final')
      .in('num_catalogo', pendentes)
      .then(({ data }) => {
        if (!data || data.length === 0) return
        setResultadosPorCatalogo(prev => {
          const next = { ...prev }
          for (const r of data) next[r.num_catalogo] = r
          return next
        })
      })
  }, [animals])

  function abrirWhatsapp(animal: Animal, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!whatsappConfig?.numero) return
    trackWhatsappClick(animal.id)
    const numeroLimpo = whatsappConfig.numero.replace(/\D/g, '')
    const identificacao = `${animal.nome}${animal.num_catalogo ? ` (Catálogo #${animal.num_catalogo})` : ''}`
    const mensagem = (whatsappConfig.mensagem_template || 'Olá! Tenho interesse no animal {animal} da 43ª Nacional do Cavalo Mangalarga Marchador.')
      .replace('{animal}', identificacao)
    window.open(`https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`, '_blank')
  }

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

  // Busca as pistas em julgamento (0-2); se `avisar` for true e alguma
  // mudou desde a ultima vez, mostra um toast (usado quando o admin troca a
  // categoria com a pagina ja aberta - detectado via realtime abaixo).
  const carregarCategoriaAtual = useCallback(async (avisar: boolean) => {
    const { data, error } = await supabase.rpc('nm_get_categoria_atual')
    const novasPistas: Pista[] = !error && Array.isArray(data) ? data.filter((p: Pista) => p.categoria) : []

    if (avisar) {
      for (const p of novasPistas) {
        const antiga = pistasRef.current.find(x => x.id === p.id)
        if (!antiga || antiga.categoria !== p.categoria || antiga.tipo_marcha !== p.tipo_marcha) {
          const prefixo = novasPistas.length > 1 ? `Pista ${p.id}: ` : ''
          const label = `Agora na pista: ${prefixo}${p.categoria}${p.tipo_marcha ? ` · ${p.tipo_marcha === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}` : ''}`
          setCategoriaToast(label)
          setTimeout(() => setCategoriaToast(null), 6000)
          break // so 1 toast por vez, mesmo que as 2 pistas mudem juntas
        }
      }
    }
    pistasRef.current = novasPistas
    setPistas(novasPistas)

    if (novasPistas.length === 0) {
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

  // Mantem a pista selecionada valida (some se a categoria foi limpa, ou
  // escolhe a primeira disponivel se ainda nao ha selecao).
  useEffect(() => {
    if (pistas.length === 0) { setPistaSelecionadaId(null); return }
    setPistaSelecionadaId(prev => (prev !== null && pistas.some(p => p.id === prev)) ? prev : pistas[0].id)
  }, [pistas])

  // categoriaAtual/marchaAtual sempre refletem a pista selecionada.
  useEffect(() => {
    const p = pistas.find(x => x.id === pistaSelecionadaId) || null
    setCategoriaAtual(p?.categoria || null)
    setMarchaAtual(p?.tipo_marcha || null)
  }, [pistas, pistaSelecionadaId])

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
    setAutoFocusBusca(true)
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
    setAutoFocusBusca(false)
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

  // Foco do campo de busca e sempre imperativo e "de um tiro so", disparado
  // exclusivamente pelo clique no icone de busca (abrirBusca) - nunca pela
  // prop `autoFocus` do input, que dispara em QUALQUER (re)montagem do
  // componente. Isso garante que nenhuma navegacao entre paginas (voltar
  // pro "/", trocar querystring, cache do router etc.) abra o teclado
  // sozinha; so um clique de verdade no icone foca.
  useEffect(() => {
    if (autoFocusBusca) {
      searchInputRef.current?.focus()
      setAutoFocusBusca(false)
    }
  }, [autoFocusBusca])

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-base font-bold leading-tight">43ª Nacional</h1>
              <p className="text-xs text-[var(--text-muted)]">Cavalo Mangalarga Marchador</p>
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
            <div className="mb-1 space-y-1.5">
              {pistas.length > 1 && (
                <div className="flex gap-1.5">
                  {pistas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setPistaSelecionadaId(p.id)}
                      className={`flex-1 min-w-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold truncate transition-colors ${
                        pistaSelecionadaId === p.id
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {p.categoria}{p.tipo_marcha ? ` · ${p.tipo_marcha}` : ''}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-xl px-4 py-3 text-center">
                <p className="text-[10px] text-[var(--accent)] uppercase tracking-wide font-semibold">Agora na Pista</p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {categoriaAtual}{marchaAtual && <span className="text-[var(--accent)]"> · {marchaAtual === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}</span>}
                </p>
              </div>
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
                  ref={searchInputRef}
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
            const resultado = animal.num_catalogo ? resultadosPorCatalogo[animal.num_catalogo] : undefined
            return (
            <Link
              key={animal.id}
              href={`/animal/${animal.num_catalogo || animal.id}`}
              onClick={() => trackAnimalClick(animal.id)}
              className={`block bg-[var(--bg-card)] rounded-xl p-4 border transition-all active:scale-[0.98] ${
                ehLider ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' : 'border-[var(--border)] hover:border-[var(--accent)]/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      animal.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                    }`}>
                      {animal.tipo_marcha === 'MB' ? 'M. Batida' : 'M. Picada'}
                    </span>
                    {(animal.tipo_campeonato === 'Exclusivamente Marcha' || animal.tambem_excl_marcha) && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)]/10 text-[var(--accent-dark)]">
                        Excl. Marcha
                      </span>
                    )}
                    {ehLider && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white flex items-center gap-1">
                        🏆 Favorito da Torcida
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold">{animal.nome}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{animal.categoria}</p>
                  {resultado && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Morfologia: {resultado.pontuacao_morfologia ?? '—'} · Funcional: {resultado.pontuacao_funcional ?? '—'} · Marcha: {resultado.pontuacao_andamento ?? '—'} · Classificação: {formatColocacaoOficial(resultado.colocacao)}
                    </p>
                  )}
                </div>
                {animal.num_catalogo && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[var(--text-muted)] uppercase">Catalogo</p>
                    <p className="text-3xl font-bold text-[var(--accent)] leading-none">{animal.num_catalogo}</p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="font-mono">Reg. {animal.registro}</span>
                  {animal.haras && <span className="text-[var(--accent)]">{animal.haras}</span>}
                  <span>Pai: {animal.pai || '—'}</span>
                  <span>Mae: {animal.mae || '—'}</span>
                </div>

                {/* Botoes de acao ficam separados aqui embaixo (nao mais
                    colados no canto superior direito, debaixo do numero do
                    catalogo) - reduz clique acidental de quem rola a lista
                    com o polegar direito, que naturalmente passa por cima
                    daquele canto a cada card. */}
                {(whatsappConfig?.numero || !searchMode) && (
                  <div className="flex items-center justify-end gap-2 mt-2">
                    {whatsappConfig?.numero && (
                      <button
                        onClick={e => abrirWhatsapp(animal, e)}
                        aria-label="Comprar - falar no WhatsApp"
                        title="Compre - Falar no WhatsApp"
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-[#25D366] text-white transition-all active:scale-90"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2m0 1.67c2.24 0 4.35.87 5.93 2.46a8.23 8.23 0 012.42 5.85c0 4.55-3.7 8.25-8.36 8.25a8.3 8.3 0 01-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.39c0-4.55 3.71-8.31 8.27-8.31M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.72 2.73 4.29 3.75 2.12.85 2.55.68 3.01.64.46-.05 1.49-.61 1.7-1.19.21-.59.21-1.09.15-1.19-.06-.11-.22-.17-.47-.3-.24-.12-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.64.81-.79.98-.14.16-.29.18-.53.06-.25-.13-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.24-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.37-.78-1.87-.2-.48-.4-.42-.56-.42h-.48" /></svg>
                      </button>
                    )}
                    {!searchMode && (
                      <button
                        onClick={e => votarInline(animal, e)}
                        aria-label={jaVotei ? 'Remover meu voto' : 'Votar neste animal'}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                          jaVotei ? 'bg-[var(--accent)] text-white' : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
                        }`}
                      >
                        <span className="text-xs">🏆</span>
                        {votos > 0 && <span>{votos}</span>}
                      </button>
                    )}
                  </div>
                )}
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
    </main>
  )
}
