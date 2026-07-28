'use client'

import { useState, useEffect } from 'react'
import { supabase, Campeonato } from '@/lib/supabase'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import CategoriaCombobox from '@/components/CategoriaCombobox'

type LinhaCampeonato = { categoria: string; tipo_marcha: string; total_animais: number }

export default function Campeonatos() {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])
  const [filterMarcha, setFilterMarcha] = useState<string>('Todas')
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('nm_campeonatos')
        .select('*')
        .order('categoria', { ascending: true })
        .order('tipo_marcha', { ascending: true })

      if (filterMarcha !== 'Todas') query = query.eq('tipo_marcha', filterMarcha)

      const { data } = await query
      setCampeonatos(data ?? [])
      setLoading(false)
    }
    load()
  }, [filterMarcha])

  // "Convencional" e "Exclusivamente Marcha" nao sao categorias, sao a
  // modalidade dentro da categoria (se o animal concorre em morfologia+marcha
  // ou so em marcha) - por isso a lista nunca deve ter uma linha separada por
  // modalidade. Junta tudo numa linha so por categoria+marcha, somando os
  // animais - quem quiser saber se um animal especifico e Excl. Marcha ve
  // isso no proprio card do animal, nao aqui na lista de categorias.
  const linhasPorChave = new Map<string, LinhaCampeonato>()
  for (const c of campeonatos) {
    const key = `${c.categoria}|${c.tipo_marcha}`
    const existente = linhasPorChave.get(key)
    if (existente) existente.total_animais += c.total_animais
    else linhasPorChave.set(key, { categoria: c.categoria, tipo_marcha: c.tipo_marcha, total_animais: c.total_animais })
  }
  const linhas = [...linhasPorChave.values()].sort((a, b) =>
    a.categoria.localeCompare(b.categoria) || a.tipo_marcha.localeCompare(b.tipo_marcha)
  )

  const categoriasDisponiveis = [...new Set(linhas.map(l => l.categoria))].sort()
  const visiveis = filterCategoria === 'Todas'
    ? linhas
    : linhas.filter(l => l.categoria === filterCategoria)

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="text-base font-bold">Campeonatos</h1>
            <span className="ml-auto text-xs text-[var(--text-muted)]">{categoriasDisponiveis.length} categorias</span>
          </div>
          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 mb-2">
            {['Todas', 'MB', 'MP'].map(m => (
              <button
                key={m}
                onClick={() => { setFilterMarcha(m); setLoading(true) }}
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
          <CategoriaCombobox categorias={categoriasDisponiveis} value={filterCategoria} onChange={setFilterCategoria} />
        </div>
      </header>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visiveis.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Nenhum campeonato encontrado</p>
        ) : (
          <div className="space-y-1.5">
            {visiveis.map(l => (
              <Link
                key={`${l.categoria}|${l.tipo_marcha}`}
                href={`/?categoria=${encodeURIComponent(l.categoria)}&marcha=${l.tipo_marcha}`}
                className="flex items-center justify-between bg-[var(--bg-card)] rounded-lg p-3 border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      l.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                    }`}>
                      {l.tipo_marcha}
                    </span>
                    <span className="text-sm font-medium truncate">{l.categoria}</span>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-muted)] ml-2 flex-shrink-0">{l.total_animais} animais</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
