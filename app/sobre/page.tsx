'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'

const URL_OU_EMAIL = /((?:https?:\/\/)[^\s]+)|([\w.+-]+@[\w-]+\.[\w.-]+)/g

// Sem editor de rich text no admin - o texto e plano, mas URL e email
// escritos nele viram link clicavel automaticamente aqui na exibicao.
function linkify(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = []
  let ultimo = 0
  let match: RegExpExecArray | null
  let i = 0
  while ((match = URL_OU_EMAIL.exec(texto))) {
    if (match.index > ultimo) partes.push(texto.slice(ultimo, match.index))
    const valor = match[0]
    partes.push(
      match[1] ? (
        <a key={i} href={valor} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline break-all">{valor}</a>
      ) : (
        <a key={i} href={`mailto:${valor}`} className="text-[var(--accent)] underline break-all">{valor}</a>
      )
    )
    ultimo = match.index + valor.length
    i++
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

export default function SobrePage() {
  const [texto, setTexto] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('nm_get_sobre').then(({ data }) => {
      const atual = Array.isArray(data) ? data[0] : data
      setTexto(atual?.texto || null)
      setLoading(false)
    })
  }, [])

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-base font-bold">Sobre</h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : texto ? (
          <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] text-sm leading-relaxed whitespace-pre-wrap">
            {linkify(texto)}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-8">Em breve.</p>
        )}
      </div>

      <BottomNav />
    </main>
  )
}
