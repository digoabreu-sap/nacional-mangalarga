'use client'

import { useState, useEffect } from 'react'
import { supabase, Animal } from '@/lib/supabase'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { formatColocacaoOficial } from '@/lib/colocacao'

type ResultadoResumo = { colocacao: string | null; pontuacao_funcional: string | null; pontuacao_morfologia: string | null; pontuacao_andamento: string | null }

export default function Favoritos() {
  const [animals, setAnimals] = useState<Animal[]>([])
  const [resultadosPorCatalogo, setResultadosPorCatalogo] = useState<Record<string, ResultadoResumo>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const favs: number[] = JSON.parse(localStorage.getItem('nm_favoritos') || '[]')
      if (favs.length === 0) {
        setLoading(false)
        return
      }
      const { data } = await supabase
        .from('nm_animais')
        .select('*')
        .in('id', favs)
        .order('num_catalogo_int', { ascending: true, nullsFirst: false })
      setAnimals(data ?? [])
      setLoading(false)

      const catalogos = (data ?? []).map(a => a.num_catalogo).filter((n): n is string => !!n)
      if (catalogos.length > 0) {
        const { data: resultados } = await supabase
          .from('nm_resultados')
          .select('num_catalogo, colocacao, pontuacao_funcional, pontuacao_morfologia, pontuacao_andamento')
          .eq('tipo_prova', 'final')
          .in('num_catalogo', catalogos)
        if (resultados) {
          setResultadosPorCatalogo(Object.fromEntries(resultados.map(r => [r.num_catalogo, r])))
        }
      }
    }
    load()
  }, [])

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-base font-bold">Meus Favoritos</h1>
          <span className="ml-auto text-xs text-[var(--text-muted)]">{animals.length} animais</span>
        </div>
      </header>

      <div className="flex-1 px-4 py-3 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : animals.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-sm">Nenhum favorito ainda</p>
            <p className="text-xs mt-1">Toque no coracao na pagina do animal para salvar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {animals.map(animal => {
              const resultado = animal.num_catalogo ? resultadosPorCatalogo[animal.num_catalogo] : undefined
              return (
              <Link
                key={animal.id}
                href={`/animal/${animal.num_catalogo || animal.id}`}
                className="block bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] hover:border-[var(--accent)]/30 transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        animal.tipo_marcha === 'MB' ? 'bg-[var(--mb-color)]/10 text-[var(--mb-color)]' : 'bg-[var(--mp-color)]/10 text-[var(--mp-color)]'
                      }`}>
                        {animal.tipo_marcha}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold">{animal.nome}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">{animal.categoria}</p>
                    {resultado && (
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        Morfologia: {resultado.pontuacao_morfologia ?? '—'} · Funcional: {resultado.pontuacao_funcional ?? '—'} · Marcha: {resultado.pontuacao_andamento ?? '—'} · Classificação: {formatColocacaoOficial(resultado.colocacao)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-[var(--text-muted)] font-mono">Reg. {animal.registro}</p>
                    {animal.haras && (
                      <p className="text-xs text-[var(--accent)] mt-0.5 max-w-[120px]">{animal.haras}</p>
                    )}
                  </div>
                </div>
              </Link>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
