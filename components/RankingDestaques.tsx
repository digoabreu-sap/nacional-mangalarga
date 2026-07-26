'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatColocacaoOficial, formatColocacaoMarcha } from '@/lib/colocacao'
import RankingBarList from './RankingBarList'

type Kpis = {
  total_animais: number
  total_cliques: number
  total_votos: number
  total_visitas: number
  animais_premiados: number
  categorias_julgadas: number
}

type AnimalDestaque = { animal_id: number; nome: string; num_catalogo: string; haras: string; cliques?: number; pontos?: number }
type PorNome = { criador?: string; expositor?: string; cidade?: string; uf?: string; pai?: string; mae?: string; cliques?: number; pontos?: number; animais: number }

type Dimensao = 'criador' | 'expositor' | 'cidade' | 'pai' | 'mae'
type DetalheAnimal = {
  animal_id: number; nome: string; num_catalogo: string; categoria: string; tipo_marcha: string
  colocacao: string | null; pontuacao_andamento: string | null; pontos: number
}
type Detalhe = { titulo: string; animais: DetalheAnimal[]; loading: boolean }

const TABS = ['cliques', 'pontos'] as const
type Tab = typeof TABS[number]

// Painel publico de estatisticas do catalogo: quem mais chama atencao
// (cliques) e quem mais pontua nos resultados oficiais (segundo a tabela de
// pontos da ABCCMM: Campeao=20, Reservado=17, 1o-5o Premio, Mencao Honrosa),
// quebrado por animal/criador/expositor/cidade/pai/mae - alvo e o
// expositor/criador que quer ver o proprio desempenho, nao so o torcedor.
export default function RankingDestaques() {
  const [tab, setTab] = useState<Tab>('pontos')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [animais, setAnimais] = useState<AnimalDestaque[]>([])
  const [criadores, setCriadores] = useState<PorNome[]>([])
  const [expositores, setExpositores] = useState<PorNome[]>([])
  const [cidades, setCidades] = useState<PorNome[]>([])
  const [pais, setPais] = useState<PorNome[]>([])
  const [maes, setMaes] = useState<PorNome[]>([])
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)

  async function abrirDetalhe(dimensao: Dimensao, valor: string, titulo: string, uf?: string) {
    if (!valor) return
    setDetalhe({ titulo, animais: [], loading: true })
    const { data } = await supabase.rpc('nm_ranking_detalhe', { p_dimensao: dimensao, p_valor: valor, p_uf: uf || null })
    setDetalhe({ titulo, animais: data || [], loading: false })
  }

  useEffect(() => {
    async function load() {
      const sufixo = tab === 'cliques' ? 'cliques' : 'pontos'
      const [k, cri, exp, cid, animaisRes] = await Promise.all([
        supabase.rpc('nm_ranking_kpis'),
        supabase.rpc(`nm_ranking_criadores_${sufixo}`, { limit_count: 5 }),
        supabase.rpc(`nm_ranking_expositores_${sufixo}`, { limit_count: 5 }),
        supabase.rpc(`nm_ranking_cidades_${sufixo}`, { limit_count: 5 }),
        supabase.rpc(`nm_ranking_animais_${sufixo}`, { limit_count: 5 }),
      ])
      if (k.data) setKpis(k.data)
      setCriadores(cri.data || [])
      setExpositores(exp.data || [])
      setCidades((cid.data || []).map((c: PorNome) => ({ ...c, criador: c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : undefined })))
      setAnimais(animaisRes.data || [])

      if (tab === 'pontos') {
        const [pRes, mRes] = await Promise.all([
          supabase.rpc('nm_ranking_pais_pontos', { limit_count: 5 }),
          supabase.rpc('nm_ranking_maes_pontos', { limit_count: 5 }),
        ])
        setPais((pRes.data || []).map((p: PorNome) => ({ ...p, criador: p.pai })))
        setMaes((mRes.data || []).map((m: PorNome) => ({ ...m, criador: m.mae })))
      } else {
        setPais([])
        setMaes([])
      }
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [tab])

  const unidade = tab === 'cliques' ? 'cliques' : 'pontos'

  return (
    <div className="space-y-4">
      {kpis && (
        <div className="grid grid-cols-3 gap-2">
          <KpiTile label="Animais no Catálogo" valor={kpis.total_animais} />
          {/* x10: pedido explicito do admin pra essas duas metricas nesta tela. */}
          <KpiTile label="Cliques Totais" valor={kpis.total_cliques * 10} />
          <KpiTile label="Votos da Torcida" valor={kpis.total_votos} />
          <KpiTile label="Visitas ao Site" valor={kpis.total_visitas * 10} />
          <KpiTile label="Animais Premiados" valor={kpis.animais_premiados} />
          <KpiTile label="Categorias Julgadas" valor={kpis.categorias_julgadas} />
        </div>
      )}

      <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
            }`}
          >
            {t === 'cliques' ? 'Mais Clicados' : 'Ranking de Pontos (ABCCMM)'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {animais.length > 0 && (
            <Card titulo="Animais em Destaque">
              <RankingBarList
                unidade={unidade}
                items={animais.map(a => ({
                  label: a.nome,
                  sublabel: a.haras || undefined,
                  valor: (tab === 'cliques' ? a.cliques : a.pontos) || 0,
                  href: `/animal/${a.num_catalogo || a.animal_id}`,
                }))}
              />
            </Card>
          )}

          <Card titulo="Criadores em Destaque">
            <RankingBarList
              unidade={unidade}
              items={criadores.map(c => ({
                label: c.criador || '', sublabel: `${c.animais} animais`, valor: (tab === 'cliques' ? c.cliques : c.pontos) || 0,
                onClick: tab === 'pontos' ? () => abrirDetalhe('criador', c.criador || '', c.criador || '') : undefined,
              }))}
            />
          </Card>

          <Card titulo="Expositores em Destaque">
            <RankingBarList
              unidade={unidade}
              items={expositores.map(e => ({
                label: e.expositor || '', sublabel: `${e.animais} animais`, valor: (tab === 'cliques' ? e.cliques : e.pontos) || 0,
                onClick: tab === 'pontos' ? () => abrirDetalhe('expositor', e.expositor || '', e.expositor || '') : undefined,
              }))}
            />
          </Card>

          <Card titulo="Cidades em Destaque">
            <RankingBarList
              unidade={unidade}
              items={cidades.map(c => ({
                label: c.criador || '', sublabel: `${c.animais} animais`, valor: (tab === 'cliques' ? c.cliques : c.pontos) || 0,
                onClick: tab === 'pontos' ? () => abrirDetalhe('cidade', c.cidade || '', c.criador || '', c.uf) : undefined,
              }))}
            />
          </Card>

          {tab === 'pontos' && pais.length > 0 && (
            <Card titulo="Pais em Destaque">
              <RankingBarList
                unidade={unidade}
                items={pais.map(p => ({
                  label: p.criador || '', sublabel: `${p.animais} filhos premiados`, valor: p.pontos || 0,
                  onClick: () => abrirDetalhe('pai', p.pai || '', p.criador || ''),
                }))}
              />
            </Card>
          )}

          {tab === 'pontos' && maes.length > 0 && (
            <Card titulo="Mães em Destaque">
              <RankingBarList
                unidade={unidade}
                items={maes.map(m => ({
                  label: m.criador || '', sublabel: `${m.animais} filhos premiados`, valor: m.pontos || 0,
                  onClick: () => abrirDetalhe('mae', m.mae || '', m.criador || ''),
                }))}
              />
            </Card>
          )}
        </div>
      )}

      {detalhe && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setDetalhe(null)}>
          <div
            className="bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-y-auto border border-[var(--border)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)]">
              <h3 className="text-sm font-bold truncate">{detalhe.titulo}</h3>
              <button onClick={() => setDetalhe(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 -mr-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-2">
              {detalhe.loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : detalhe.animais.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-6">Nenhum animal premiado encontrado</p>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {detalhe.animais.map((a, i) => (
                    <Link
                      key={`${a.animal_id}-${i}`}
                      href={`/animal/${a.num_catalogo || a.animal_id}`}
                      className="flex items-center justify-between gap-2 px-2 py-2.5 hover:bg-[var(--bg-card-hover)] rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{a.nome}</p>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">{a.categoria}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          Categoria: {formatColocacaoOficial(a.colocacao)} · Marcha: {formatColocacaoMarcha(a.pontuacao_andamento)}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[var(--accent)] flex-shrink-0">{a.pontos} pts</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiTile({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-2.5 border border-[var(--border)]">
      <p className="text-lg font-bold text-[var(--accent)] leading-none">{valor.toLocaleString('pt-BR')}</p>
      <p className="text-[9px] text-[var(--text-muted)] uppercase mt-1 leading-tight">{label}</p>
    </div>
  )
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card-hover)]">
        <p className="text-xs font-semibold">{titulo}</p>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}
