'use client'

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, Animal } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import Banner from '@/components/Banner'
import BottomNav from '@/components/BottomNav'
import CategoriaCombobox from '@/components/CategoriaCombobox'
import CampeaoCampeonatoBanner from '@/components/CampeaoCampeonatoBanner'
import { trackAnimalClick, trackWhatsappClick } from '@/components/Analytics'
import { formatColocacaoOficial, formatColocacaoMarcha, normalizarColocacao, normalizarColocacaoPorRank } from '@/lib/colocacao'
import { getCategoriasMistas, ehExcecaoMarcha } from '@/lib/campeonatoMisto'
import { tipoDaCategoriaEspecial } from '@/lib/campeoesDosCampeoes'

const MARCHAS = [
  { value: 'Todas', label: 'Todas' },
  { value: 'MB', label: 'M. Batida' },
  { value: 'MP', label: 'M. Picada' },
]
const PER_PAGE = 30
const CACHE_KEY = 'nm_cache_pista'
const PENDENTES_KEY = 'nm_votos_pendentes'
const MARCACOES_LOCAIS_KEY = 'nm_marcacoes_locais'
const MAX_ENTRE_7 = 7
const MAX_OITAVA_A_TREZE = 6

type Suggestion = { label: string; type: 'haras' | 'criador' | 'expositor'; value: string }
type VotoPendente = { usuarioId: number; animalId: number; campeonato: string }
type ResultadoResumo = { colocacao: string | null; pontuacao_funcional: string | null; pontuacao_morfologia: string | null; pontuacao_andamento: string | null }
type Pista = { id: number; categoria: string; tipo_marcha: string | null; fase_julgamento: string | null; simulacao_habilitada?: boolean }
// As listas guardam a ORDEM manual (indice = posicao-1 na marcha, 1a7 e
// 8a13) - nao sao so um Set, a posicao dentro do array e que vira a
// "posicao na marcha" mostrada/usada na simulacao.
type MarcacoesCategoria = { entre7: number[]; oitavaATreze: number[]; retirado: number[] }
// Uma entrada por categoria+marcha - "Entre os 7"/"8 a 13" sao limites da
// final daquela marcha especifica, nao do evento inteiro.
type MarcacoesLocais = Record<string, MarcacoesCategoria>
const FASE_LABEL: Record<string, string> = { morfologia: 'Morfologia', marcha: 'Marcha', funcional: 'Prova Funcional' }

function lerVotosPendentes(): VotoPendente[] {
  try { return JSON.parse(localStorage.getItem(PENDENTES_KEY) || '[]') } catch { return [] }
}
function salvarVotosPendentes(v: VotoPendente[]) {
  try { localStorage.setItem(PENDENTES_KEY, JSON.stringify(v)) } catch { /* localStorage indisponivel */ }
}

// "Entre os 7" / "Retirado" marcados pelo proprio usuario (fallback quando o
// admin nao define nada pra categoria) - vive so no aparelho dele, nunca vai
// pro banco nem e visto por outros usuarios.
function chaveMarcacoes(categoria: string, tipoMarcha: string): string {
  return `${categoria}||${tipoMarcha}`
}
function lerMarcacoesLocais(): MarcacoesLocais {
  try {
    const raw = JSON.parse(localStorage.getItem(MARCACOES_LOCAIS_KEY) || 'null')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    // Formato antigo (antes de existir por categoria) guardava entre7/retirado
    // direto na raiz, sem saber de qual categoria eram - descarta em vez de
    // aplicar o limite de 7 errado numa categoria nova.
    if (Array.isArray((raw as { entre7?: unknown }).entre7) || Array.isArray((raw as { retirado?: unknown }).retirado)) return {}
    return raw
  } catch { return {} }
}
function salvarMarcacoesLocais(v: MarcacoesLocais) {
  try { localStorage.setItem(MARCACOES_LOCAIS_KEY, JSON.stringify(v)) } catch { /* localStorage indisponivel */ }
}
function removerDe(lista: number[], id: number) {
  const idx = lista.indexOf(id)
  if (idx >= 0) lista.splice(idx, 1)
}
function marcacoesDaCategoria(v: MarcacoesLocais, categoria: string, tipoMarcha: string): MarcacoesCategoria {
  const atual = v[chaveMarcacoes(categoria, tipoMarcha)]
  // "oitavaATreze" e mais novo que o resto do formato - dados salvos antes
  // dele nao tem essa chave, entao cai pro default vazio.
  return { entre7: atual?.entre7 || [], oitavaATreze: atual?.oitavaATreze || [], retirado: atual?.retirado || [] }
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
  // categoria/marcha (sem campeonato) chegam de listas que navegam por
  // categoria de verdade (Potro, Égua, Castrado...), sem travar num
  // tipo_campeonato especifico - assim animais Convencional e Exclusivamente
  // Marcha da mesma categoria aparecem juntos, sem segregar em duas telas.
  const categoriaParam = searchParams.get('categoria')
  const marchaParam = searchParams.get('marcha')

  // Modo padrao: trava na categoria "em pista" configurada no admin, sem
  // filtro editavel - evita o usuario ficar mexendo em filtro toda hora.
  // A busca livre (com filtros de marcha/categoria) so aparece quando o
  // usuario aciona o icone de busca (ou chega aqui via link de campeonato
  // ou do icone de busca flutuante global, com ?busca=1).
  const [searchMode, setSearchMode] = useState(() => !!campeonatoParam || !!buscaParam || !!categoriaParam)
  // So foca (e abre o teclado no celular) quando o usuario clicou de
  // proposito num icone de busca (o da propria Home ou o flutuante global)
  // - chegar aqui por um link de campeonato (calendario/campeonatos) nao
  // deve abrir o teclado sozinho.
  const [autoFocusBusca, setAutoFocusBusca] = useState(() => !!buscaParam)

  const [search, setSearch] = useState('')
  const [marcha, setMarcha] = useState<string>(() => marchaParam || 'Todas')
  const [categoria, setCategoria] = useState<string>(() => categoriaParam || 'Todas')
  // Ate 2 "pistas" (rings) podem estar em julgamento ao mesmo tempo - o
  // usuario escolhe qual acompanhar quando ha 2 configuradas. categoriaAtual/
  // marchaAtual sempre refletem a pista atualmente selecionada, entao toda a
  // logica de filtro/voto que ja dependia delas continua igual.
  const [pistas, setPistas] = useState<Pista[]>([])
  const [pistaSelecionadaId, setPistaSelecionadaId] = useState<number | null>(null)
  const [categoriaAtual, setCategoriaAtual] = useState<string | null>(null)
  const [marchaAtual, setMarchaAtual] = useState<string | null>(null)
  const [faseAtual, setFaseAtual] = useState<string | null>(null)
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
  const [categoriasMistas, setCategoriasMistas] = useState<Set<string>>(new Set())
  useEffect(() => {
    getCategoriasMistas().then(setCategoriasMistas)
  }, [])
  // Comeca vazio (bate com o SSR, que nao tem acesso a localStorage) e so le
  // o valor real depois de montado, no useEffect abaixo - ler direto no
  // useState quebraria a hidratacao (server sempre renderiza vazio).
  const [marcacoesLocais, setMarcacoesLocais] = useState<MarcacoesLocais>({})
  useEffect(() => {
    setMarcacoesLocais(lerMarcacoesLocais())
  }, [])
  // Marca os catalogos ja consultados (independente de ter achado resultado
  // ou nao) pra nao reconsultar toda hora - so o que ainda nao foi tentado
  // entra na proxima busca em lote.
  const catalogosConsultadosRef = useRef<Set<string>>(new Set())
  // Comeca vazio (bate com o SSR) e so le o cache depois de montado, no
  // useEffect abaixo - ler localStorage direto no useState quebra a
  // hidratacao assim que o cache deixa de estar vazio (ex: apos reload).
  const [animals, setAnimals] = useState<Animal[]>([])
  const [total, setTotal] = useState(0)
  useEffect(() => {
    try {
      const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
      if (cache?.animals?.length) {
        setAnimals(cache.animals)
        setTotal(cache.total || 0)
      }
    } catch { /* ignora */ }
  }, [])
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
    if (categoriaParam) setCategoria(categoriaParam)
    if (marchaParam) setMarcha(marchaParam)
  }, [categoriaParam, marchaParam])

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
        if (!antiga || antiga.categoria !== p.categoria || antiga.tipo_marcha !== p.tipo_marcha || antiga.fase_julgamento !== p.fase_julgamento) {
          const prefixo = novasPistas.length > 1 ? `Pista ${p.id}: ` : ''
          const fase = p.fase_julgamento && FASE_LABEL[p.fase_julgamento] ? ` · Julgamento de ${FASE_LABEL[p.fase_julgamento]}` : ''
          const label = `Agora na pista: ${prefixo}${p.categoria}${p.tipo_marcha ? ` · ${p.tipo_marcha === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}` : ''}${fase}`
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

  // categoriaAtual/marchaAtual/faseAtual sempre refletem a pista selecionada.
  useEffect(() => {
    const p = pistas.find(x => x.id === pistaSelecionadaId) || null
    setCategoriaAtual(p?.categoria || null)
    setMarchaAtual(p?.tipo_marcha || null)
    setFaseAtual(p?.fase_julgamento || null)
  }, [pistas, pistaSelecionadaId])

  // Enquanto travado na pista, a categoria/marcha do filtro sempre acompanha
  // a "categoria em pista" atual - o usuario nao escolhe.
  useEffect(() => {
    if (!searchMode && categoriaAtual) {
      setCategoria(categoriaAtual)
      setMarcha(marchaAtual || 'Todas')
    }
  }, [searchMode, categoriaAtual, marchaAtual])

  // O admin liga/desliga a simulacao (tags + reordenar + marcha/classificacao
  // ao vivo) por pista, na aba Categoria. Trata ausencia do campo (RPC antiga,
  // antes da migracao rodar) como ligado, pra nao "sumir" a feature no meio
  // do evento so por causa do timing do deploy.
  const simulacaoHabilitada = useMemo(() => {
    const p = pistas.find(x => x.id === pistaSelecionadaId) || null
    return p?.simulacao_habilitada !== false
  }, [pistas, pistaSelecionadaId])

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

  // Se o admin ja definiu Entre os 7/Retirado pra essa categoria (algum
  // animal carregado tem uma das flags), essa vira a fonte oficial e some o
  // controle local do usuario. Sem isso, cada usuario controla por conta
  // propria (so no aparelho dele).
  const adminDefiniuEntreOsSeteOuRetirado = useMemo(
    () => animals.some(a => a.finalista_marcha || a.retirado),
    [animals]
  )
  // Campeonato encerrado: ja saiu resultado oficial (colocacao) publicado
  // pra essa categoria+marcha. Nesse ponto as marcacoes locais (Entre os
  // 7/8 a 13/Retirado) perderam a validade - o card ja mostra a
  // Classificacao oficial - entao paramos de usa-las pra exibir/editar e
  // limpamos elas (efeito mais abaixo). Tambem vale (sem simulacao nenhuma)
  // pros Campeao dos Campeoes/Grande Campeonato: e uma lista curada com os
  // proprios campeoes ja definidos - nao faz sentido escolher "Entre os 7"
  // dentro dela.
  const campeonatoEncerrado = useMemo(
    () => tipoDaCategoriaEspecial(categoria) !== null ||
      animals.some(a => a.num_catalogo && !!resultadosPorCatalogo[a.num_catalogo]?.colocacao),
    [animals, resultadosPorCatalogo, categoria]
  )
  // Depois que o campeonato encerra (resultado oficial publicado), apaga de
  // vez as marcacoes locais dessa categoria+marcha - nao tem mais utilidade
  // nenhuma e so ficariam lixo acumulado no localStorage pro resto do
  // evento (cada categoria+marcha julgada abre espaco pra "sujeira" se nao
  // limpar). Nao roda pros Campeao dos Campeoes/Grande Campeonato: ali
  // "animals" e uma lista curada com o categoria/marcha DE VERDADE de cada
  // animal (varias categorias diferentes misturadas) - limpar por essas
  // chaves apagaria sem querer as marcacoes locais da categoria propria de
  // cada animal, so por causa de estar navegando nesse roster.
  useEffect(() => {
    if (!campeonatoEncerrado || tipoDaCategoriaEspecial(categoria) !== null) return
    const chaves = new Set(animals.map(a => chaveMarcacoes(a.categoria, a.tipo_marcha)))
    setMarcacoesLocais(prev => {
      let mudou = false
      const next = { ...prev }
      for (const chave of chaves) {
        if (chave in next) { delete next[chave]; mudou = true }
      }
      if (!mudou) return prev
      salvarMarcacoesLocais(next)
      return next
    })
  }, [campeonatoEncerrado, animals])
  const animalsExibidos = useMemo(() => {
    if (adminDefiniuEntreOsSeteOuRetirado || campeonatoEncerrado || !simulacaoHabilitada) return animals
    const porId = new Map(animals.map(a => [a.id, a]))
    const usados = new Set<number>()
    const entre7Ordenados: Animal[] = []
    const oitavaOrdenados: Animal[] = []
    // Normalmente so tem 1 categoria+marcha na lista (visao travada da
    // pista), mas percorre todas as combinacoes presentes por seguranca.
    const chaves = new Set(animals.map(a => chaveMarcacoes(a.categoria, a.tipo_marcha)))
    for (const chave of chaves) {
      const [categoria, tipoMarcha] = chave.split('||')
      const marc = marcacoesDaCategoria(marcacoesLocais, categoria, tipoMarcha)
      for (const id of marc.entre7) {
        const a = porId.get(id)
        if (a && !usados.has(id)) { entre7Ordenados.push(a); usados.add(id) }
      }
      for (const id of marc.oitavaATreze) {
        const a = porId.get(id)
        if (a && !usados.has(id)) { oitavaOrdenados.push(a); usados.add(id) }
      }
    }
    const meio: Animal[] = []
    const baixa: Animal[] = []
    for (const a of animals) {
      if (usados.has(a.id)) continue
      const marc = marcacoesDaCategoria(marcacoesLocais, a.categoria, a.tipo_marcha)
      if (marc.retirado.includes(a.id)) baixa.push(a)
      else meio.push(a)
    }
    return [...entre7Ordenados, ...oitavaOrdenados, ...meio, ...baixa]
  }, [animals, adminDefiniuEntreOsSeteOuRetirado, campeonatoEncerrado, marcacoesLocais, simulacaoHabilitada])

  // Simula a posicao na marcha (1 a 13: 7 do "Entre os 7" + 6 do "8 a 13",
  // na ordem em que o usuario organizou os cards) e a nota de classificacao
  // = morfologia ajustada + posicao na marcha - qtd de animais Exclusivamente
  // Marcha a frente dele na marcha (eles ocupam posicao na marcha mas nao
  // disputam o campeonato Convencional).
  //
  // Morfologia ajustada (confirmado com o apurador oficial): quando um
  // animal e Retirado antes de completar os finalistas, os animais que
  // estavam atras dele na morfologia sobem 1 posicao cada - a colocacao de
  // morfologia nunca fica com "buraco". Ex.: se os colocados 4 e 5 da
  // morfologia forem retirados, quem era 7 na morfologia passa a ser 5
  // (7 - 2 retirados a frente).
  //
  // So calcula pra quem ja tem morfologia oficial publicada. Depois ordena
  // por essa nota (menor = melhor, mesma logica do "Total" da apuracao
  // oficial), desempatando por quem tem melhor nota na funcional, e usa a
  // mesma tabela de colocacao (Campeao/Reservado/Premios/Mencoes) ja usada
  // no resto do site. Isso e so uma simulacao pessoal - nunca e salva como
  // resultado oficial.
  const simulacaoMarcha = useMemo(() => {
    const posicoes = new Map<number, number>()
    const classificacoes = new Map<number, { valor: number; label: string }>()
    if (adminDefiniuEntreOsSeteOuRetirado || campeonatoEncerrado || !simulacaoHabilitada) return { posicoes, classificacoes }
    const porId = new Map(animals.map(a => [a.id, a]))
    const chaves = new Set(animals.map(a => chaveMarcacoes(a.categoria, a.tipo_marcha)))
    const ordemCombinada: Animal[] = []
    const retiradosIds = new Set<number>()
    for (const chave of chaves) {
      const [categoria, tipoMarcha] = chave.split('||')
      const marc = marcacoesDaCategoria(marcacoesLocais, categoria, tipoMarcha)
      // "8 a 13" sempre comeca na posicao 8, mesmo que "Entre os 7" ainda
      // nao esteja completo (7 vagas) - as posicoes sao fixas por tag, nao
      // dependem de quantos ja foram marcados.
      marc.entre7.forEach((id, i) => {
        const a = porId.get(id)
        if (a) { ordemCombinada.push(a); posicoes.set(a.id, i + 1) }
      })
      marc.oitavaATreze.forEach((id, i) => {
        const a = porId.get(id)
        if (a) { ordemCombinada.push(a); posicoes.set(a.id, i + 1 + MAX_ENTRE_7) }
      })
      for (const id of marc.retirado) retiradosIds.add(id)
    }

    const morfologiaBruta = (a: Animal) => {
      const bruta = a.num_catalogo ? resultadosPorCatalogo[a.num_catalogo]?.pontuacao_morfologia : null
      return bruta != null ? parseFloat(bruta) : NaN
    }
    const morfologiaRetirados = [...retiradosIds]
      .map(id => porId.get(id))
      .map(a => (a ? morfologiaBruta(a) : NaN))
      .filter(Number.isFinite)

    const candidatos: { animal: Animal; valor: number; desempate: number }[] = []
    for (const a of ordemCombinada) {
      if (a.tipo_campeonato !== 'Convencional') continue
      const morfologia = morfologiaBruta(a)
      if (!Number.isFinite(morfologia)) continue
      const retiradosAFrente = morfologiaRetirados.filter(m => m < morfologia).length
      const morfologiaAjustada = morfologia - retiradosAFrente

      const posicao = posicoes.get(a.id)!
      const explMarchaAFrente = ordemCombinada.filter(
        o => (posicoes.get(o.id) || 0) < posicao && o.tipo_campeonato !== 'Convencional'
      ).length

      // Desempate: animais ate 39 meses (Potro/Potra) usam Morfologia, acima
      // disso usam Prova Funcional - regra oficial (regulamento ABCCMM).
      const ehJovem = /^potr[ao]\b/i.test(a.categoria)
      const desempate = ehJovem
        ? morfologiaAjustada
        : (() => {
            const funcBruta = a.num_catalogo ? resultadosPorCatalogo[a.num_catalogo]?.pontuacao_funcional : null
            return funcBruta != null ? parseFloat(funcBruta) : Infinity
          })()

      candidatos.push({ animal: a, valor: morfologiaAjustada + posicao - explMarchaAFrente, desempate })
    }
    candidatos.sort((x, y) => x.valor - y.valor || x.desempate - y.desempate)
    candidatos.forEach((c, i) => {
      classificacoes.set(c.animal.id, { valor: c.valor, label: formatColocacaoMarcha(String(i + 1)) })
    })
    return { posicoes, classificacoes }
  }, [animals, marcacoesLocais, adminDefiniuEntreOsSeteOuRetirado, campeonatoEncerrado, resultadosPorCatalogo, simulacaoHabilitada])

  // "Entre os 7" / "8 a 13" / "Retirado": o admin pode definir no painel
  // (Categoria) - dado compartilhado, valendo pra todo mundo. Se o admin NAO
  // definiu nada pra essa categoria, cada usuario pode marcar por conta
  // propria, mas so no proprio aparelho (localStorage) - nunca mexe no banco
  // nem aparece pra outros usuarios. Os limites (7 e 6) sao por
  // categoria+marcha (a final daquela marcha), nao do evento inteiro. Uma
  // tag e sempre exclusiva das outras duas - marcar uma tira as demais.
  function toggleEntreOs7Local(animal: Animal, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const chave = chaveMarcacoes(animal.categoria, animal.tipo_marcha)
    setMarcacoesLocais(prev => {
      const atual = marcacoesDaCategoria(prev, animal.categoria, animal.tipo_marcha)
      const entre7 = atual.entre7.slice()
      const oitavaATreze = atual.oitavaATreze.slice()
      const retirado = atual.retirado.slice()
      const idx = entre7.indexOf(animal.id)
      if (idx >= 0) {
        entre7.splice(idx, 1)
      } else {
        if (entre7.length >= MAX_ENTRE_7) {
          setCategoriaToast(`Você já marcou ${MAX_ENTRE_7} animais como Entre os 7 nessa categoria`)
          setTimeout(() => setCategoriaToast(null), 4000)
          return prev
        }
        entre7.push(animal.id)
        removerDe(oitavaATreze, animal.id)
        removerDe(retirado, animal.id)
      }
      const next = { ...prev, [chave]: { entre7, oitavaATreze, retirado } }
      salvarMarcacoesLocais(next)
      return next
    })
  }

  function toggleOitavaATrezeLocal(animal: Animal, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const chave = chaveMarcacoes(animal.categoria, animal.tipo_marcha)
    setMarcacoesLocais(prev => {
      const atual = marcacoesDaCategoria(prev, animal.categoria, animal.tipo_marcha)
      const entre7 = atual.entre7.slice()
      const oitavaATreze = atual.oitavaATreze.slice()
      const retirado = atual.retirado.slice()
      const idx = oitavaATreze.indexOf(animal.id)
      if (idx >= 0) {
        oitavaATreze.splice(idx, 1)
      } else {
        if (oitavaATreze.length >= MAX_OITAVA_A_TREZE) {
          setCategoriaToast(`Você já marcou ${MAX_OITAVA_A_TREZE} animais como 8 a 13 nessa categoria`)
          setTimeout(() => setCategoriaToast(null), 4000)
          return prev
        }
        oitavaATreze.push(animal.id)
        removerDe(entre7, animal.id)
        removerDe(retirado, animal.id)
      }
      const next = { ...prev, [chave]: { entre7, oitavaATreze, retirado } }
      salvarMarcacoesLocais(next)
      return next
    })
  }

  function toggleRetiradoLocal(animal: Animal, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const chave = chaveMarcacoes(animal.categoria, animal.tipo_marcha)
    setMarcacoesLocais(prev => {
      const atual = marcacoesDaCategoria(prev, animal.categoria, animal.tipo_marcha)
      const entre7 = atual.entre7.slice()
      const oitavaATreze = atual.oitavaATreze.slice()
      const retirado = atual.retirado.slice()
      const idx = retirado.indexOf(animal.id)
      if (idx >= 0) {
        retirado.splice(idx, 1)
      } else {
        retirado.push(animal.id)
        removerDe(entre7, animal.id)
        removerDe(oitavaATreze, animal.id)
      }
      const next = { ...prev, [chave]: { entre7, oitavaATreze, retirado } }
      salvarMarcacoesLocais(next)
      return next
    })
  }

  // Move o animal pra cima/baixo DENTRO do proprio subgrupo (Entre os 7 so
  // troca de posicao com outro Entre os 7, 8 a 13 so com outro 8 a 13) -
  // e essa ordem que vira a posicao simulada na marcha. Usada tanto pelas
  // setas (1 passo por clique) quanto pelo arrastar (1 passo a cada tanto de
  // deslocamento do dedo/mouse).
  function moverAnimalPasso(categoria: string, tipoMarcha: string, animalId: number, grupo: 'entre7' | 'oitavaATreze', direcao: -1 | 1) {
    const chave = chaveMarcacoes(categoria, tipoMarcha)
    setMarcacoesLocais(prev => {
      const atual = marcacoesDaCategoria(prev, categoria, tipoMarcha)
      const lista = atual[grupo].slice()
      const idx = lista.indexOf(animalId)
      const novoIdx = idx + direcao
      if (idx < 0 || novoIdx < 0 || novoIdx >= lista.length) return prev
      ;[lista[idx], lista[novoIdx]] = [lista[novoIdx], lista[idx]]
      const next = { ...prev, [chave]: { ...atual, [grupo]: lista } }
      salvarMarcacoesLocais(next)
      return next
    })
  }

  function moverAnimalLocal(animal: Animal, grupo: 'entre7' | 'oitavaATreze', direcao: -1 | 1, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    moverAnimalPasso(animal.categoria, animal.tipo_marcha, animal.id, grupo, direcao)
  }

  // Segurar e arrastar (pra cima/baixo) como alternativa as setas: a cada
  // ARRASTO_LIMIAR_PX de deslocamento, avanca 1 posicao (mesma logica das
  // setas), reaproveitando o passo unico em vez de tentar seguir o dedo em
  // tempo real - mais simples e robusto no touch do celular.
  const ARRASTO_LIMIAR_PX = 36
  const arrastoRef = useRef<{ categoria: string; tipoMarcha: string; animalId: number; grupo: 'entre7' | 'oitavaATreze'; startY: number; limpar: () => void } | null>(null)

  // Escuta o movimento no `window` (em vez de setPointerCapture no proprio
  // handle) porque o card se reordena no DOM a cada passo - um elemento que
  // se move na arvore pode perder a captura de ponteiro no meio do gesto.
  // Ouvindo no window, o gesto continua ate o dedo/mouse soltar, nao importa
  // quantas vezes o handle tenha mudado de posicao.
  function onArrastoPointerDown(animal: Animal, grupo: 'entre7' | 'oitavaATreze', e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (arrastoRef.current?.limpar) arrastoRef.current.limpar()
    const estado = { categoria: animal.categoria, tipoMarcha: animal.tipo_marcha, animalId: animal.id, grupo, startY: e.clientY, limpar: () => {} }
    const mover = (ev: PointerEvent) => {
      const deltaY = ev.clientY - estado.startY
      if (Math.abs(deltaY) >= ARRASTO_LIMIAR_PX) {
        moverAnimalPasso(estado.categoria, estado.tipoMarcha, estado.animalId, estado.grupo, deltaY > 0 ? 1 : -1)
        estado.startY = ev.clientY
      }
    }
    const soltar = () => {
      arrastoRef.current = null
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
    estado.limpar = soltar
    arrastoRef.current = estado
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
  }

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

    // Campeao dos Campeoes/Grande Campeonato: nao tem categoria de verdade
    // em nm_animais (juntam animais de varias categorias - o admin monta a
    // lista na mao), entao busca em nm_campeoes_dos_campeoes em vez de
    // filtrar nm_animais por categoria. Lista curta e curada - sem
    // paginacao, busca livre ou filtro de haras/criador (nao fazem sentido
    // aqui).
    const tipoEspecial = tipoDaCategoriaEspecial(categoria)
    if (tipoEspecial) {
      if (!reset) { setLoading(false); return }
      const marchasParaBuscar: ('MB' | 'MP')[] = marcha === 'Todas' ? ['MB', 'MP'] : [marcha as 'MB' | 'MP']
      const respostas = await Promise.all(
        marchasParaBuscar.map(m => supabase.rpc('nm_campeoes_dos_campeoes_listar', { p_tipo: tipoEspecial, p_tipo_marcha: m }))
      )
      const linhas = respostas.flatMap(r => r.data || []) as {
        num_catalogo: string; nome: string; categoria: string; tipo_marcha: string
        registro: string | null; haras: string | null; expositor: string | null; ordem: number
        pai: string | null; pai_registro: string | null; mae: string | null; mae_registro: string | null
      }[]
      // Ordem por numero de catalogo (nao pela ordem que o admin inseriu em
      // Campeoes) - mais facil de achar um animal especifico na lista.
      linhas.sort((a, b) => (parseInt(a.num_catalogo, 10) || 0) - (parseInt(b.num_catalogo, 10) || 0))
      const animaisEspeciais: Animal[] = linhas.map((l, i) => ({
        id: -(i + 1),
        id_catalogo: 0,
        nome: l.nome,
        num_catalogo: l.num_catalogo,
        registro: l.registro || '',
        chip: '',
        data_nascimento: '',
        idade: '',
        campeonato: `${categoria} - ${l.tipo_marcha}`,
        tipo_campeonato: 'Convencional',
        tipo_marcha: l.tipo_marcha,
        categoria: l.categoria,
        pai: l.pai || '', pai_registro: l.pai_registro || '', mae: l.mae || '', mae_registro: l.mae_registro || '',
        criador: '', expositor: l.expositor || '',
        haras: l.haras, cidade: null, uf: null,
        destaque: false, tambem_excl_marcha: false, finalista_marcha: false, retirado: false,
      }))
      setAnimals(animaisEspeciais)
      setTotal(animaisEspeciais.length)
      setHasMore(false)
      setLoading(false)
      return
    }

    const from = pageNum * PER_PAGE
    const to = from + PER_PAGE - 1
    const modoPista = !searchMode

    let query = supabase
      .from('nm_animais')
      .select('*', { count: 'exact' })
      .range(from, to)

    // "Entre os 7" sempre no topo, "Retirado" sempre no final - o resto no
    // meio, pelo numero do catalogo. Um animal nunca e as duas coisas ao
    // mesmo tempo, entao esses 3 criterios juntos bastam.
    query = query
      .order('finalista_marcha', { ascending: false })
      .order('retirado', { ascending: true })
      .order('num_catalogo_int', { ascending: true, nullsFirst: false })

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
                {faseAtual && FASE_LABEL[faseAtual] && (
                  <p className="text-xs font-semibold text-[var(--accent-dark)] mt-1">
                    Julgamento de {FASE_LABEL[faseAtual]}
                  </p>
                )}
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
                <CategoriaCombobox categorias={categorias} value={categoria} onChange={setCategoria} />
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
        {campeonatoFilter && <CampeaoCampeonatoBanner campeonatoNome={campeonatoFilter} />}
        <div className="space-y-2">
          {animalsExibidos.map(animal => {
            const votos = votosPorAnimal[animal.id] || 0
            const ehLider = !searchMode && animal.id === liderId
            const jaVotei = !searchMode && animal.campeonato != null && meuVotoPorCampeonato[animal.campeonato] === animal.id
            const resultado = animal.num_catalogo ? resultadosPorCatalogo[animal.num_catalogo] : undefined
            const marcLocal = marcacoesDaCategoria(marcacoesLocais, animal.categoria, animal.tipo_marcha)
            const finalistaAtivo = adminDefiniuEntreOsSeteOuRetirado
              ? animal.finalista_marcha
              : !campeonatoEncerrado && marcLocal.entre7.includes(animal.id)
            const oitavaAtiva = !adminDefiniuEntreOsSeteOuRetirado && !campeonatoEncerrado && marcLocal.oitavaATreze.includes(animal.id)
            const retiradoAtivo = adminDefiniuEntreOsSeteOuRetirado
              ? animal.retirado
              : !campeonatoEncerrado && marcLocal.retirado.includes(animal.id)
            const podeEditarLocal = !adminDefiniuEntreOsSeteOuRetirado && !campeonatoEncerrado && !searchMode && simulacaoHabilitada
            // Sempre segue o cadastro do animal no catalogo - nunca editavel
            // (o regulamento nao permite reclassificacao ao vivo dessa
            // informacao, e o cadastro (Catalogo PDF/base de dados) e a
            // unica fonte oficial). Usa a mesma logica ja aplicada na pagina
            // do animal (task #13): so conta tipo_campeonato != Convencional
            // quando a categoria+marcha realmente tem os dois modos - senao
            // vira falso-positivo (categoria inteira cadastrada com um so
            // tipo_campeonato que nao seja literalmente "Convencional").
            // Nas listas de Campeao dos Campeoes/Grande Campeonato, o
            // animal pode estar ali por ter sido Campeao de Marcha da
            // categoria dele (Art. 73 par. 5 do regulamento incorpora
            // esses ao grupo pro julgamento do quesito Marcha) sem ter
            // sido Campeao/Reservado da Categoria - nesse caso ele so
            // disputa a marcha aqui dentro, igual um animal
            // Exclusivamente Marcha, entao mostra o mesmo selo.
            const campeaoDeMarchaSemCategoria = tipoDaCategoriaEspecial(categoria) !== null &&
              normalizarColocacaoPorRank(resultado?.pontuacao_andamento ?? null)?.ordem === 1 &&
              ![1, 2].includes(normalizarColocacao(resultado?.colocacao ?? null)?.ordem ?? -1)
            const exclMarchaAtivo = ehExcecaoMarcha(animal.categoria, animal.tipo_marcha, animal.tipo_campeonato, categoriasMistas) ||
              animal.tambem_excl_marcha || campeaoDeMarchaSemCategoria
            const idxEntre7 = marcLocal.entre7.indexOf(animal.id)
            const idxOitava = marcLocal.oitavaATreze.indexOf(animal.id)
            const posicaoSimulada = simulacaoMarcha.posicoes.get(animal.id)
            const classificacaoSimulada = simulacaoMarcha.classificacoes.get(animal.id)
            return (
            <Link
              key={animal.id}
              href={`/animal/${animal.num_catalogo || animal.id}`}
              onClick={() => trackAnimalClick(animal.id)}
              className={`block bg-[var(--bg-card)] rounded-xl p-4 border transition-all active:scale-[0.98] ${
                retiradoAtivo ? 'opacity-50' : ''
              } ${
                finalistaAtivo ? 'border-[var(--accent-dark)] shadow-[0_0_0_1px_var(--accent-dark)]' :
                oitavaAtiva ? 'border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]' :
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
                    {exclMarchaAtivo && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-red-600/10 text-red-600 dark:text-red-400">
                        Excl. Marcha
                      </span>
                    )}
                    {/* Se o admin ja definiu isso pra categoria, vira selo
                        informativo (dado oficial, compartilhado). Senao, cada
                        usuario marca por conta propria (so no aparelho dele),
                        podendo tambem reordenar dentro do proprio grupo pra
                        simular a posicao na marcha. */}
                    {podeEditarLocal ? (
                      <button
                        onClick={e => toggleEntreOs7Local(animal, e)}
                        aria-label={finalistaAtivo ? 'Remover dos Entre os 7 (marcação pessoal)' : 'Marcar como Entre os 7 (marcação pessoal)'}
                        title="Marcação pessoal - só aparece pra você"
                        className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition-all active:scale-90 ${
                          finalistaAtivo ? 'bg-[var(--accent-dark)] text-white' : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
                        }`}
                      >
                        🏁 Entre os 7
                      </button>
                    ) : finalistaAtivo && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--accent-dark)] text-white flex items-center gap-1">
                        🏁 Entre os 7
                      </span>
                    )}
                    {finalistaAtivo && podeEditarLocal && (
                      <span className="flex items-center">
                        <button
                          onClick={e => moverAnimalLocal(animal, 'entre7', -1, e)}
                          disabled={idxEntre7 <= 0}
                          aria-label="Mover pra cima (Entre os 7)"
                          title="Mover pra cima"
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-25 active:scale-90"
                        >▲</button>
                        <button
                          onClick={e => moverAnimalLocal(animal, 'entre7', 1, e)}
                          disabled={idxEntre7 < 0 || idxEntre7 >= marcLocal.entre7.length - 1}
                          aria-label="Mover pra baixo (Entre os 7)"
                          title="Mover pra baixo"
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-25 active:scale-90"
                        >▼</button>
                        <span
                          onPointerDown={e => onArrastoPointerDown(animal, 'entre7', e)}
                          onClick={e => e.stopPropagation()}
                          aria-label="Segurar e arrastar pra reordenar (Entre os 7)"
                          title="Segure e arraste pra cima/baixo"
                          style={{ touchAction: 'none' }}
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] cursor-grab active:cursor-grabbing select-none"
                        >⠿</span>
                      </span>
                    )}
                    {podeEditarLocal ? (
                      <button
                        onClick={e => toggleOitavaATrezeLocal(animal, e)}
                        aria-label={oitavaAtiva ? 'Remover do 8 a 13 (marcação pessoal)' : 'Marcar como 8 a 13 (marcação pessoal)'}
                        title="Marcação pessoal - só aparece pra você"
                        className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 transition-all active:scale-90 ${
                          oitavaAtiva ? 'bg-[var(--accent)] text-white' : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
                        }`}
                      >
                        8 a 13
                      </button>
                    ) : oitavaAtiva && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white flex items-center gap-1">
                        8 a 13
                      </span>
                    )}
                    {oitavaAtiva && podeEditarLocal && (
                      <span className="flex items-center">
                        <button
                          onClick={e => moverAnimalLocal(animal, 'oitavaATreze', -1, e)}
                          disabled={idxOitava <= 0}
                          aria-label="Mover pra cima (8 a 13)"
                          title="Mover pra cima"
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-25 active:scale-90"
                        >▲</button>
                        <button
                          onClick={e => moverAnimalLocal(animal, 'oitavaATreze', 1, e)}
                          disabled={idxOitava < 0 || idxOitava >= marcLocal.oitavaATreze.length - 1}
                          aria-label="Mover pra baixo (8 a 13)"
                          title="Mover pra baixo"
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] disabled:opacity-25 active:scale-90"
                        >▼</button>
                        <span
                          onPointerDown={e => onArrastoPointerDown(animal, 'oitavaATreze', e)}
                          onClick={e => e.stopPropagation()}
                          aria-label="Segurar e arrastar pra reordenar (8 a 13)"
                          title="Segure e arraste pra cima/baixo"
                          style={{ touchAction: 'none' }}
                          className="w-5 h-5 flex items-center justify-center text-[var(--text-secondary)] cursor-grab active:cursor-grabbing select-none"
                        >⠿</span>
                      </span>
                    )}
                    {podeEditarLocal ? (
                      <button
                        onClick={e => toggleRetiradoLocal(animal, e)}
                        aria-label={retiradoAtivo ? 'Desmarcar retirado (marcação pessoal)' : 'Marcar como retirado (marcação pessoal)'}
                        title="Marcação pessoal - só aparece pra você"
                        className={`text-xs font-bold px-1.5 py-0.5 rounded transition-all active:scale-90 ${
                          retiradoAtivo ? 'bg-black/20 text-[var(--text-primary)]' : 'bg-black/5 text-[var(--text-secondary)] hover:bg-black/10'
                        }`}
                      >
                        Retirado
                      </button>
                    ) : retiradoAtivo && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-black/10 text-[var(--text-secondary)]">
                        Retirado
                      </span>
                    )}
                    {ehLider && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-white flex items-center gap-1">
                        🏆 Favorito da Torcida
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-base font-semibold">{animal.nome}</h3>
                    {whatsappConfig?.numero && (
                      <button
                        onClick={e => abrirWhatsapp(animal, e)}
                        aria-label="Comprar - falar no WhatsApp"
                        title="Compre - Falar no WhatsApp"
                        className="flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full bg-[#25D366] text-white text-[10px] font-semibold transition-all active:scale-90 flex-shrink-0"
                      >
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 004.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2m0 1.67c2.24 0 4.35.87 5.93 2.46a8.23 8.23 0 012.42 5.85c0 4.55-3.7 8.25-8.36 8.25a8.3 8.3 0 01-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 01-1.26-4.39c0-4.55 3.71-8.31 8.27-8.31M8.53 7.33c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.55c.12.16 1.72 2.73 4.29 3.75 2.12.85 2.55.68 3.01.64.46-.05 1.49-.61 1.7-1.19.21-.59.21-1.09.15-1.19-.06-.11-.22-.17-.47-.3-.24-.12-1.48-.73-1.71-.81-.23-.09-.4-.13-.56.13-.17.25-.64.81-.79.98-.14.16-.29.18-.53.06-.25-.13-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.12-.14.16-.25.24-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.37-.78-1.87-.2-.48-.4-.42-.56-.42h-.48" /></svg>
                        Compre
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">{animal.categoria}</p>
                  {/* Marcha/Classificacao usam o mesmo label de sempre
                      (Campeao/Reservado/Premios/Mencoes) - o numero cru so
                      existe internamente, pra ordenar. Quando ainda nao ha
                      resultado oficial dessas duas, mostra o valor simulado
                      (baseado em como o usuario organizou os cards) em
                      vermelho, no MESMO label, pra deixar claro que nao e
                      oficial ainda. */}
                  {(resultado || (podeEditarLocal && posicaoSimulada != null)) && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Morfologia: {resultado?.pontuacao_morfologia ?? '—'} · Funcional: {resultado?.pontuacao_funcional ?? '—'} · Marcha:{' '}
                      {resultado?.pontuacao_andamento ? (
                        formatColocacaoMarcha(resultado.pontuacao_andamento)
                      ) : podeEditarLocal && posicaoSimulada != null ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">{formatColocacaoMarcha(String(posicaoSimulada))}</span>
                      ) : '—'} · Classificação:{' '}
                      {resultado?.colocacao ? (
                        formatColocacaoOficial(resultado.colocacao)
                      ) : podeEditarLocal && classificacaoSimulada ? (
                        <span className="text-red-600 dark:text-red-400 font-semibold">{classificacaoSimulada.label}</span>
                      ) : '—'}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  {animal.num_catalogo && (
                    <div className="text-center">
                      <p className="text-xs text-[var(--text-muted)] uppercase">Catalogo</p>
                      <p className="text-3xl font-bold text-[var(--accent)] leading-none">{animal.num_catalogo}</p>
                    </div>
                  )}
                  {!searchMode && !retiradoAtivo && (
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
              </div>

              <div className="mt-3 pt-2 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span className="font-mono">Reg. {animal.registro}</span>
                  {animal.haras && <span className="text-[var(--accent)]">{animal.haras}</span>}
                  <span>Pai: {animal.pai || '—'}</span>
                  <span>Mae: {animal.mae || '—'}</span>
                </div>
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
