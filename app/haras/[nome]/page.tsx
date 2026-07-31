'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

type Haras = {
  id: number; nome: string; cidade: string | null; uf: string | null; expositor: string | null
  site_url: string | null; instagram_url: string | null; telefone: string | null
}
type AnimalDoHaras = { id: number; num_catalogo: string | null; nome: string; categoria: string }

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start py-2 border-b border-[var(--border)] last:border-b-0">
      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{label}</span>
      <span className="text-sm text-right ml-4">{value}</span>
    </div>
  )
}

export default function HarasDetail({ params }: { params: Promise<{ nome: string }> }) {
  const { nome } = use(params)
  const [haras, setHaras] = useState<Haras | null | undefined>(undefined)
  const [animais, setAnimais] = useState<AnimalDoHaras[]>([])

  useEffect(() => {
    const nomeDecodificado = decodeURIComponent(nome)
    supabase.rpc('nm_get_haras_by_nome', { p_nome: nomeDecodificado }).then(({ data }) => {
      const atual = Array.isArray(data) ? data[0] : data
      setHaras(atual || null)
    })
    supabase
      .from('nm_animais')
      .select('id, num_catalogo, nome, categoria')
      .ilike('haras', nomeDecodificado)
      .order('nome')
      .then(({ data }) => setAnimais(data || []))
  }, [nome])

  if (haras === undefined) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!haras) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-[var(--text-muted)]">Haras não encontrado</p>
      <Link href="/" className="text-[var(--accent)] text-sm">Voltar</Link>
    </div>
  )

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-sm font-bold truncate flex-1">{haras.nome}</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h2 className="text-xl font-bold">{haras.nome}</h2>
            {haras.instagram_url && (
              <a
                href={haras.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram do haras"
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-black/5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47-.66.26-1.22.6-1.77 1.16-.56.55-.9 1.11-1.16 1.77-.25.64-.42 1.37-.47 2.43C2 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.06.22 1.79.47 2.43.26.66.6 1.22 1.16 1.77.55.56 1.11.9 1.77 1.16.64.25 1.37.42 2.43.47C8.94 22 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47.66-.26 1.22-.6 1.77-1.16.56-.55.9-1.11 1.16-1.77.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43-.26-.66-.6-1.22-1.16-1.77-.55-.56-1.11-.9-1.77-1.16-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2m0 1.8c2.67 0 2.99.01 4.04.06.98.04 1.5.21 1.85.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.13.35.29.87.34 1.85.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.98-.21 1.5-.34 1.85-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.13-.87.29-1.85.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.98-.04-1.5-.21-1.85-.34-.47-.18-.8-.4-1.15-.75-.35-.35-.57-.68-.75-1.15-.13-.35-.29-.87-.34-1.85C3.81 14.99 3.8 14.67 3.8 12s.01-2.99.06-4.04c.04-.98.21-1.5.34-1.85.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.13.87-.29 1.85-.34C9.01 3.81 9.33 3.8 12 3.8m0 3.05a5.15 5.15 0 100 10.3 5.15 5.15 0 000-10.3m0 8.5a3.35 3.35 0 110-6.7 3.35 3.35 0 010 6.7m6.55-8.7a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0" />
                </svg>
              </a>
            )}
          </div>
          <InfoRow label="Cidade" value={haras.cidade && haras.uf ? `${haras.cidade} - ${haras.uf}` : haras.cidade} />
          <InfoRow label="Expositor" value={haras.expositor} />
          <InfoRow label="Telefone" value={haras.telefone} />
          {haras.site_url && (
            <div className="flex justify-between items-start py-2">
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">Site</span>
              <a href={haras.site_url} target="_blank" rel="noopener noreferrer" className="text-sm text-right ml-4 text-[var(--accent)] underline break-all">
                {haras.site_url}
              </a>
            </div>
          )}
        </div>

        {animais.length > 0 && (
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
            <h3 className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wide mb-2">
              Animais deste Haras ({animais.length})
            </h3>
            <div className="space-y-1">
              {animais.map(a => (
                <Link
                  key={a.id}
                  href={`/animal/${a.num_catalogo || a.id}`}
                  className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg text-sm hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate">{a.nome}</span>
                  <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{a.categoria}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
