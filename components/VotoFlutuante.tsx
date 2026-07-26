'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { supabase, Animal } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

type AnimalLista = Pick<Animal, 'id' | 'nome' | 'num_catalogo' | 'haras' | 'campeonato'>

// Botao flutuante global (fica no layout raiz, como o video ao vivo) pra
// votar no favorito da categoria em pista de qualquer tela do site, sem
// precisar voltar pra Home. Some sozinho se nao houver categoria configurada
// no admin, e na Home (que ja tem a lista com voto inline na tela).
export default function VotoFlutuante() {
  const pathname = usePathname()
  const { user, ensureUser } = useAuth()
  const [categoriaAtual, setCategoriaAtual] = useState<string | null>(null)
  const [marchaAtual, setMarchaAtual] = useState<string | null>(null)
  const [aberto, setAberto] = useState(false)
  const [animais, setAnimais] = useState<AnimalLista[]>([])
  const [votos, setVotos] = useState<Record<number, number>>({})
  const [meuVoto, setMeuVoto] = useState<Record<string, number | null>>({})
  const votandoRef = useRef(false)

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.rpc('nm_get_categoria_atual')
      const atual = Array.isArray(data) ? data[0] : data
      if (atual?.categoria) {
        setCategoriaAtual(atual.categoria)
        setMarchaAtual(atual.tipo_marcha || null)
      }
    }
    carregar()

    const canal = supabase
      .channel('voto-flutuante-categoria')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nm_categoria_atual' }, carregar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  useEffect(() => {
    if (!aberto || !categoriaAtual) return
    let cancelado = false

    async function carregarAnimais() {
      let query = supabase
        .from('nm_animais')
        .select('id, nome, num_catalogo, haras, campeonato')
        .eq('categoria', categoriaAtual)
        .order('num_catalogo_int', { ascending: true, nullsFirst: false })
      if (marchaAtual) query = query.eq('tipo_marcha', marchaAtual)
      const { data } = await query
      if (!cancelado) setAnimais(data || [])
    }

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
      setVotos(mapa)
    }

    carregarAnimais()
    carregarVotos()

    const canal = supabase
      .channel(`voto-flutuante-votos-${categoriaAtual}-${marchaAtual}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nm_votos' }, carregarVotos)
      .subscribe()
    return () => { cancelado = true; supabase.removeChannel(canal) }
  }, [aberto, categoriaAtual, marchaAtual])

  useEffect(() => {
    if (!aberto || !user || animais.length === 0) return
    if (votandoRef.current) return
    let cancelado = false
    const campeonatosUnicos = [...new Set(animais.map(a => a.campeonato).filter(Boolean))]
    Promise.all(campeonatosUnicos.map(async camp => {
      const { data } = await supabase.rpc('nm_meu_voto', { p_usuario_id: user.id, p_campeonato: camp })
      return [camp, data && data.length > 0 ? data[0].animal_id : null] as const
    })).then(entries => {
      if (cancelado || votandoRef.current) return
      setMeuVoto(Object.fromEntries(entries))
    })
    return () => { cancelado = true }
  }, [aberto, user, animais])

  async function votar(animal: AnimalLista) {
    if (!animal.campeonato) return
    votandoRef.current = true
    const votante = user ?? await ensureUser()
    if (!votante) { votandoRef.current = false; return }

    const campeonato = animal.campeonato
    const votoAnterior = meuVoto[campeonato] ?? null
    const novoVoto = votoAnterior === animal.id ? null : animal.id

    setMeuVoto(prev => ({ ...prev, [campeonato]: novoVoto }))
    setVotos(prev => {
      const next = { ...prev }
      if (votoAnterior != null) next[votoAnterior] = Math.max(0, (next[votoAnterior] || 0) - 1)
      if (novoVoto != null) next[novoVoto] = (next[novoVoto] || 0) + 1
      return next
    })

    try {
      await supabase.rpc('nm_toggle_voto', { p_usuario_id: votante.id, p_animal_id: animal.id, p_campeonato: campeonato })
    } finally {
      votandoRef.current = false
    }
  }

  if (pathname === '/' || !categoriaAtual) return null

  return (
    <>
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-20 left-3 z-40 flex items-center gap-1.5 px-3 py-2 bg-[var(--accent)] text-white text-xs font-semibold rounded-full shadow-lg active:scale-95 transition-transform"
        >
          <span>♥</span> Votar
        </button>
      ) : (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40" onClick={() => setAberto(false)}>
          <div
            className="w-full max-w-2xl max-h-[70vh] bg-[var(--bg-primary)] rounded-t-2xl overflow-hidden flex flex-col safe-bottom"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
              <div>
                <p className="text-xs font-bold text-[var(--accent)] uppercase tracking-wide">Vote no favorito</p>
                <p className="text-sm font-semibold">{categoriaAtual}{marchaAtual ? ` · ${marchaAtual === 'MP' ? 'Marcha Picada' : 'Marcha Batida'}` : ''}</p>
              </div>
              <button onClick={() => setAberto(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {animais.length === 0 ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                animais.map(a => {
                  const jaVotei = a.campeonato != null && meuVoto[a.campeonato] === a.id
                  const total = votos[a.id] || 0
                  return (
                    <button
                      key={a.id}
                      onClick={() => votar(a)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors text-left ${
                        jaVotei ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)] hover:bg-[var(--bg-card-hover)]'
                      }`}
                    >
                      <span className="text-sm font-bold text-[var(--accent)] w-10 flex-shrink-0 text-center">{a.num_catalogo || '-'}</span>
                      <span className="text-xs font-medium flex-1 min-w-0 truncate">{a.nome}</span>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        jaVotei ? 'bg-[var(--accent)] text-white' : 'bg-black/5 text-[var(--text-secondary)]'
                      }`}>
                        <span>{jaVotei ? '♥' : '♡'}</span>
                        {total > 0 && <span>{total}</span>}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center py-2 border-t border-[var(--border)] flex-shrink-0">
              1 voto por categoria · toque de novo pra trocar
            </p>
          </div>
        </div>
      )}
    </>
  )
}
