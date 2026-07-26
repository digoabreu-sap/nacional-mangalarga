'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RankingBarList from './RankingBarList'

type Kpis = {
  total_animais: number
  total_cliques: number
  total_votos: number
  total_visitas: number
  animais_premiados: number
  categorias_julgadas: number
}

type AnimalDestaque = { animal_id: number; nome: string; num_catalogo: string; haras: string; cliques?: number; premios?: number }
type PorNome = { criador?: string; expositor?: string; cidade?: string; uf?: string; cliques?: number; premios?: number; animais: number }

const TABS = ['cliques', 'premios'] as const
type Tab = typeof TABS[number]

// Painel publico de estatisticas do catalogo: quem mais chama atencao
// (cliques) e quem mais colhe premio (resultado oficial), quebrado por
// animal/criador/expositor/cidade - alvo e o expositor/criador que quer ver
// o proprio desempenho, nao so o torcedor.
export default function RankingDestaques() {
  const [tab, setTab] = useState<Tab>('cliques')
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [animais, setAnimais] = useState<AnimalDestaque[]>([])
  const [criadores, setCriadores] = useState<PorNome[]>([])
  const [expositores, setExpositores] = useState<PorNome[]>([])
  const [cidades, setCidades] = useState<PorNome[]>([])

  useEffect(() => {
    async function load() {
      const [k, cri, exp, cid] = await Promise.all([
        supabase.rpc('nm_ranking_kpis'),
        supabase.rpc(tab === 'cliques' ? 'nm_ranking_criadores_cliques' : 'nm_ranking_criadores_premios', { limit_count: 5 }),
        supabase.rpc(tab === 'cliques' ? 'nm_ranking_expositores_cliques' : 'nm_ranking_expositores_premios', { limit_count: 5 }),
        supabase.rpc(tab === 'cliques' ? 'nm_ranking_cidades_cliques' : 'nm_ranking_cidades_premios', { limit_count: 5 }),
      ])
      if (k.data) setKpis(k.data)
      setCriadores(cri.data || [])
      setExpositores(exp.data || [])
      setCidades((cid.data || []).map((c: PorNome) => ({ ...c, criador: c.cidade ? `${c.cidade}${c.uf ? '/' + c.uf : ''}` : undefined })))

      const { data: animaisData } = await supabase.rpc(
        tab === 'cliques' ? 'nm_ranking_animais_cliques' : 'nm_ranking_animais_premios',
        { limit_count: 5 }
      )
      setAnimais(animaisData || [])
      setLoading(false)
    }
    setLoading(true)
    load()
  }, [tab])

  const unidade = tab === 'cliques' ? 'cliques' : 'prêmios'

  return (
    <div className="space-y-4">
      {kpis && (
        <div className="grid grid-cols-3 gap-2">
          <KpiTile label="Animais no Catálogo" valor={kpis.total_animais} />
          <KpiTile label="Cliques Totais" valor={kpis.total_cliques} />
          <KpiTile label="Votos da Torcida" valor={kpis.total_votos} />
          <KpiTile label="Visitas ao Site" valor={kpis.total_visitas} />
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
            {t === 'cliques' ? 'Mais Clicados' : 'Mais Premiados'}
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
                  valor: (tab === 'cliques' ? a.cliques : a.premios) || 0,
                  href: `/animal/${a.num_catalogo || a.animal_id}`,
                }))}
              />
            </Card>
          )}

          <Card titulo="Criadores em Destaque">
            <RankingBarList
              unidade={unidade}
              items={criadores.map(c => ({ label: c.criador || '', sublabel: `${c.animais} animais`, valor: (tab === 'cliques' ? c.cliques : c.premios) || 0 }))}
            />
          </Card>

          <Card titulo="Expositores em Destaque">
            <RankingBarList
              unidade={unidade}
              items={expositores.map(e => ({ label: e.expositor || '', sublabel: `${e.animais} animais`, valor: (tab === 'cliques' ? e.cliques : e.premios) || 0 }))}
            />
          </Card>

          <Card titulo="Cidades em Destaque">
            <RankingBarList
              unidade={unidade}
              items={cidades.map(c => ({ label: c.criador || '', sublabel: `${c.animais} animais`, valor: (tab === 'cliques' ? c.cliques : c.premios) || 0 }))}
            />
          </Card>
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
