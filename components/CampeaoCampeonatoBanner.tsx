'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { normalizarColocacao } from '@/lib/colocacao'

type LinhaResultado = {
  num_catalogo: string
  nome_animal: string | null
  colocacao: string | null
  pontuacao_andamento: string | null
}

function parseCampeonatoNome(nome: string): { tipoCampeonato: string; tipoMarcha: string; categoria: string } | null {
  const partes = nome.split(' - ')
  if (partes.length < 3) return null
  const [tipoCampeonato, tipoMarcha, ...resto] = partes
  return { tipoCampeonato, tipoMarcha, categoria: resto.join(' - ') }
}

// Quadro exibido no topo da lista quando o usuario chega numa Home filtrada
// por um campeonato especifico (veio de /campeonatos) e esse campeonato ja
// tem resultado divulgado - mesmo modelo do card "Resultado" da pagina do
// animal, so que aqui mostra QUEM sao os campeoes (categoria e marcha sao
// classificacoes independentes, podem ser animais diferentes).
export default function CampeaoCampeonatoBanner({ campeonatoNome }: { campeonatoNome: string }) {
  const [linhas, setLinhas] = useState<LinhaResultado[] | null>(null)

  useEffect(() => {
    let cancelado = false
    setLinhas(null)
    const parsed = parseCampeonatoNome(campeonatoNome)
    if (!parsed) return
    supabase
      .from('nm_resultados')
      .select('num_catalogo, nome_animal, colocacao, pontuacao_andamento')
      .eq('tipo_campeonato', parsed.tipoCampeonato)
      .eq('tipo_marcha', parsed.tipoMarcha)
      .eq('categoria', parsed.categoria)
      .eq('tipo_prova', 'final')
      .then(({ data }) => { if (!cancelado) setLinhas(data || []) })
    return () => { cancelado = true }
  }, [campeonatoNome])

  if (!linhas || linhas.length === 0) return null

  const campeaoCategoria = linhas.find(l => normalizarColocacao(l.colocacao)?.label === 'Campeão')
  const campeaoMarcha = linhas.find(l => l.pontuacao_andamento === '1')

  if (!campeaoCategoria && !campeaoMarcha) return null

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide">Resultado</h3>
        <Link href="/resultados" className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Ver categoria completa</Link>
      </div>
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] text-center">
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Categoria</p>
          {campeaoCategoria ? (
            <Link href={`/animal/${campeaoCategoria.num_catalogo}`} className="text-sm font-bold hover:text-[var(--accent)] transition-colors">
              {campeaoCategoria.nome_animal}
            </Link>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Marcha</p>
          {campeaoMarcha ? (
            <Link href={`/animal/${campeaoMarcha.num_catalogo}`} className="text-sm font-bold hover:text-[var(--accent)] transition-colors">
              {campeaoMarcha.nome_animal}
            </Link>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">—</p>
          )}
        </div>
      </div>
    </div>
  )
}
