'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { user, loginDirect, logout, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'telefone' | 'email'>('telefone')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!nome.trim()) { setError('Digite seu nome'); return }
    const destino = mode === 'email' ? email.trim() : telefone.trim()
    if (!destino) { setError(mode === 'email' ? 'Digite seu email' : 'Digite seu telefone'); return }

    setSubmitting(true)
    // Se ja existe um cadastro anonimo neste aparelho (criado na hora de
    // votar), completa ele em vez de criar um usuario novo - assim o
    // historico de votos nao se perde.
    const { data, error: err } = user
      ? await supabase.rpc('nm_completar_cadastro', {
          p_usuario_id: user.id,
          p_nome: nome.trim(),
          p_tipo: mode,
          p_destino: destino,
        })
      : await supabase.rpc('nm_login_simples', {
          p_nome: nome.trim(),
          p_tipo: mode,
          p_destino: destino,
        })

    if (err || !data?.user) {
      setError('Erro ao entrar. Tente novamente.')
      setSubmitting(false)
      return
    }

    loginDirect(data.user)
    router.push('/')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (user && (user.email || user.telefone)) return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-base font-bold">Minha Conta</h1>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-2xl font-bold mb-4">
          {user.nome.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-lg font-bold mb-1">{user.nome}</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">{user.email || user.telefone}</p>
        <button
          onClick={() => { logout(); router.push('/') }}
          className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium"
        >
          Sair
        </button>
      </div>
    </main>
  )

  return (
    <main className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <h1 className="text-base font-bold">Entrar</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">
              MM
            </div>
            <h2 className="text-lg font-bold">43a Nacional</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {user ? 'Complete seu cadastro para receber novidades' : 'Entre para votar nos seus favoritos'}
            </p>
          </div>

          <div className="flex gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 mb-4">
            <button
              onClick={() => setMode('telefone')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                mode === 'telefone' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              Telefone
            </button>
            <button
              onClick={() => setMode('email')}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                mode === 'email' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              Email
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full py-2.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            {mode === 'telefone' ? (
              <input
                type="tel"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                className="w-full py-2.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            ) : (
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full py-2.5 px-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            )}
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[var(--accent)] text-white font-semibold rounded-lg text-sm disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : user ? 'Salvar cadastro' : 'Entrar e votar'}
            </button>
          </form>

          <p className="text-[10px] text-[var(--text-muted)] text-center mt-4">
            {user
              ? 'Seus votos ja contam mesmo sem completar o cadastro.'
              : 'Voce pode votar sem cadastro. Complete depois se quiser receber novidades.'}
          </p>
        </div>
      </div>
    </main>
  )
}
