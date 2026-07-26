'use client'

import { useState, useEffect, useCallback } from 'react'
import { APP_VERSION, formatVersionComDataHora } from '@/lib/version'
import DailyViewsChart from '@/components/admin/DailyViewsChart'

const TAB_LABELS: Record<'analytics' | 'leads' | 'categoria' | 'video' | 'resultados' | 'banners' | 'admins', string> = {
  analytics: 'Analytics',
  leads: 'Leads',
  categoria: 'Categoria',
  video: 'Vídeo',
  resultados: 'Resultados',
  banners: 'Banners',
  admins: 'Admins',
}

type Admin = { id: number; email: string; nome: string }
type Banner = { id: number; posicao: string; titulo: string; imagem_url: string; link_url: string; html_content: string; ativo: boolean; ordem: number }
type TopAnimal = { animal_id: number; nome: string; categoria: string; tipo_marcha: string; click_count: number }
type DailyView = { dia: string; total: number }

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [tab, setTab] = useState<'banners' | 'analytics' | 'admins' | 'leads' | 'categoria' | 'resultados' | 'video'>('analytics')

  useEffect(() => {
    document.title = `Admin - Nacional MM (${formatVersionComDataHora()})`
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('nm_admin_token')
    const a = localStorage.getItem('nm_admin_user')
    if (t && a) {
      try {
        const payload = JSON.parse(atob(t))
        if (payload.exp > Date.now()) {
          setToken(t)
          setAdmin(JSON.parse(a))
        } else {
          localStorage.removeItem('nm_admin_token')
          localStorage.removeItem('nm_admin_user')
        }
      } catch { /* invalid token */ }
    }
  }, [])

  if (!token || !admin) return <LoginForm onLogin={(t, a) => { setToken(t); setAdmin(a) }} />

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin - Nacional MM</h1>
            <p className="text-xs text-[var(--text-muted)]">Ola, {admin.nome}</p>
          </div>
          <div className="text-right">
            <button
              onClick={() => { localStorage.removeItem('nm_admin_token'); localStorage.removeItem('nm_admin_user'); setToken(null); setAdmin(null) }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Sair
            </button>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatVersionComDataHora()}</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {(['analytics', 'leads', 'categoria', 'video', 'resultados', 'banners', 'admins'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                tab === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {tab === 'analytics' && <AnalyticsPanel token={token} />}
        {tab === 'leads' && <LeadsPanel token={token} />}
        {tab === 'categoria' && <CategoriaPanel token={token} />}
        {tab === 'video' && <VideoPanel token={token} />}
        {tab === 'resultados' && <ResultadosPanel token={token} />}
        {tab === 'banners' && <BannersPanel token={token} />}
        {tab === 'admins' && <AdminsPanel token={token} />}
      </div>
    </main>
  )
}

function LoginForm({ onLogin }: { onLogin: (token: string, admin: Admin) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao fazer login')
      setLoading(false)
      return
    }
    localStorage.setItem('nm_admin_token', data.token)
    localStorage.setItem('nm_admin_user', JSON.stringify(data.admin))
    onLogin(data.token, data.admin)
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border)]">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain mx-auto mb-3" />
          <h1 className="text-lg font-bold">Admin</h1>
          <p className="text-xs text-[var(--text-muted)]">43a Nacional Mangalarga Marchador</p>
        </div>
        {error && <p className="text-red-400 text-sm mb-3 text-center">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full mb-3 py-2.5 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full mb-4 py-2.5 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]" />
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-[var(--accent)] text-white font-semibold rounded-lg text-sm disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

type Lead = { id: number; nome: string; email: string | null; telefone: string | null; created_at: string; total_votos: number }

function LeadsPanel({ token }: { token: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/leads', { headers: { 'Authorization': `Bearer ${token}` } })
      const data = await res.json()
      setLeads(data || [])
      setLoading(false)
    }
    load()
  }, [token])

  function exportCSV() {
    const header = 'Nome,Email,Telefone,Votos,Data Cadastro'
    const rows = leads.map(l =>
      `"${l.nome}","${l.email || ''}","${l.telefone || ''}",${l.total_votos},"${new Date(l.created_at).toLocaleDateString('pt-BR')}"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_nacional_mm_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Usuarios Cadastrados ({leads.length})</h3>
        {leads.length > 0 && (
          <button onClick={exportCSV} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
            Exportar CSV
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase">Total</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{leads.length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase">Com Email</p>
          <p className="text-2xl font-bold text-[var(--accent-dark)]">{leads.filter(l => l.email).length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase">Com Telefone</p>
          <p className="text-2xl font-bold text-green-400">{leads.filter(l => l.telefone).length}</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhum usuario cadastrado ainda</p>
      ) : (
        <div className="space-y-2">
          {leads.map(l => (
            <div key={l.id} className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{l.nome}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {l.email && <span className="mr-3">{l.email}</span>}
                    {l.telefone && <span>{l.telefone}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[var(--accent)]">{l.total_votos} votos</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{new Date(l.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VideoPanel({ token }: { token: string }) {
  const [ativo, setAtivo] = useState(false)
  const [fonteTipo, setFonteTipo] = useState<'video' | 'canal'>('canal')
  const [fonteValor, setFonteValor] = useState('')
  const [embedAtual, setEmbedAtual] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/video', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    if (data) {
      setAtivo(data.ativo || false)
      setFonteTipo(data.fonte_tipo || 'canal')
      setFonteValor(data.fonte_valor || '')
      setEmbedAtual(data.embed_url || null)
    }
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function save(novoAtivo: boolean) {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/video', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: novoAtivo, fonte_tipo: fonteTipo, fonte_valor: fonteValor }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(data.error || 'Erro ao salvar'); return }
    setAtivo(novoAtivo)
    setEmbedAtual(data.embed_url)
    setMsg('Salvo!')
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] appearance-none"

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Video ao Vivo (Home)</h3>
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
        <p className="text-xs text-[var(--text-muted)]">
          Status: <span className={ativo ? 'text-green-400 font-semibold' : 'text-[var(--text-primary)]'}>{ativo ? 'Ativo (aparece na Home)' : 'Desativado'}</span>
        </p>

        <div className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-0.5">
          {(['canal', 'video'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setFonteTipo(t)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                fonteTipo === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              {t === 'canal' ? 'Sempre o que estiver ao vivo no canal' : 'Video/live especifico'}
            </button>
          ))}
        </div>

        {fonteTipo === 'canal' ? (
          <div>
            <input
              placeholder="Channel ID do @abccmmoficial (comeca com UC...)"
              value={fonteValor}
              onChange={e => setFonteValor(e.target.value)}
              className={inputClass}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Nao e o @abccmmoficial nem o link do canal - precisa do Channel ID (ex: UCxxxxxxxxxxxxxxxxxxxxxxxx).
              Acha em &quot;Sobre&quot; do canal no YouTube ou no YouTube Studio &gt; Configuracoes &gt; Canal &gt; Avancado.
              Assim que configurado, o player mostra sozinho sempre a live atual do canal (ou &quot;offline&quot; quando nao tem nenhuma).
            </p>
          </div>
        ) : (
          <div>
            <input
              placeholder="Link do video/live do YouTube (ou so o ID)"
              value={fonteValor}
              onChange={e => setFonteValor(e.target.value)}
              className={inputClass}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Aceita link completo (youtube.com/watch?v=..., youtu.be/..., .../live/...) ou so o ID do video.</p>
          </div>
        )}

        {embedAtual && (
          <p className="text-[10px] text-[var(--text-muted)] break-all">Embed atual: {embedAtual}</p>
        )}

        {msg && <p className={`text-sm ${msg === 'Salvo!' ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}

        <div className="flex gap-2">
          <button onClick={() => save(true)} disabled={saving || !fonteValor.trim()} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar e Ativar'}
          </button>
          {ativo && (
            <button onClick={() => save(false)} disabled={saving} className="px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm font-semibold disabled:opacity-50">
              Desativar
            </button>
          )}
        </div>

        <p className="text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border)]">
          Isso liga/desliga globalmente pra todo mundo. Cada visitante ainda pode esconder o video pra si mesmo (ou trocar a posicao na tela) sem afetar os outros.
        </p>
      </div>
    </div>
  )
}

function CategoriaPanel({ token }: { token: string }) {
  const [categorias, setCategorias] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [currentMarcha, setCurrentMarcha] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [selectedMarcha, setSelectedMarcha] = useState<'MB' | 'MP'>('MB')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categoria-atual', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setCategorias(data.categorias || [])
    setCurrent(data.categoria || null)
    setCurrentMarcha(data.tipo_marcha || null)
    setSelected(data.categoria || '')
    setSelectedMarcha(data.tipo_marcha || 'MB')
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/categoria-atual', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoria: selected || null, tipo_marcha: selected ? selectedMarcha : null }),
    })
    setSaving(false)
    if (res.ok) {
      setCurrent(selected || null)
      setCurrentMarcha(selected ? selectedMarcha : null)
      setMsg('Categoria em andamento atualizada!')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Erro ao salvar')
    }
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] appearance-none"

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Categoria em Andamento</h3>
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
        <p className="text-xs text-[var(--text-muted)]">
          Agora na pista: <span className="text-[var(--accent)] font-semibold">
            {current ? `${current} (${currentMarcha === 'MP' ? 'Marcha Picada' : 'Marcha Batida'})` : 'Nenhuma configurada'}
          </span>
        </p>
        <select value={selected} onChange={e => setSelected(e.target.value)} className={inputClass}>
          <option value="">Nenhuma</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-0.5">
          {(['MB', 'MP'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMarcha(m)}
              className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedMarcha === m ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              {m === 'MB' ? 'Marcha Batida' : 'Marcha Picada'}
            </button>
          ))}
        </div>
        {msg && <p className="text-sm text-green-400">{msg}</p>}
        <button onClick={save} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

type SyncStatus = { ultima_sincronizacao: string | null; classes_processadas: number | null; linhas_atualizadas: number | null; erro: string | null }

function ResultadosPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [ultimoResumo, setUltimoResumo] = useState<{ classesProcessadas: number; linhasAtualizadas: number; erros: string[] } | null>(null)

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/admin/resultados', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setStatus(data)
    setLoading(false)
  }, [token])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function atualizar() {
    setSyncing(true)
    setUltimoResumo(null)
    const res = await fetch('/api/admin/resultados', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    setUltimoResumo(data)
    setSyncing(false)
    loadStatus()
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Resultados (resultados.abccmm.org.br)</h3>
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
        <p className="text-xs text-[var(--text-muted)]">
          Ultima sincronizacao: <span className="text-[var(--text-primary)]">{status?.ultima_sincronizacao ? new Date(status.ultima_sincronizacao).toLocaleString('pt-BR') : 'nunca'}</span>
        </p>
        {status?.classes_processadas != null && (
          <p className="text-xs text-[var(--text-muted)]">
            {status.classes_processadas} categorias · {status.linhas_atualizadas} resultados
          </p>
        )}
        {status?.erro && (
          <p className="text-xs text-red-400">Ultimo erro: {status.erro}</p>
        )}
        <button onClick={atualizar} disabled={syncing} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {syncing ? 'Atualizando... (pode levar alguns minutos)' : 'Atualizar Resultados'}
        </button>
        <p className="text-[10px] text-[var(--text-muted)]">
          A base tambem e atualizada automaticamente a cada 15 minutos pelo servidor.
        </p>
        {ultimoResumo && (
          <div className="text-xs pt-2 border-t border-[var(--border)]">
            <p className="text-green-400">{ultimoResumo.classesProcessadas} categorias processadas, {ultimoResumo.linhasAtualizadas} resultados salvos.</p>
            {ultimoResumo.erros.length > 0 && (
              <p className="text-red-400 mt-1">{ultimoResumo.erros.length} erro(s): {ultimoResumo.erros.slice(0, 12).join(' | ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsPanel({ token }: { token: string }) {
  const [topAnimals, setTopAnimals] = useState<TopAnimal[]>([])
  const [dailyViews, setDailyViews] = useState<DailyView[]>([])
  const [totalViews, setTotalViews] = useState(0)
  const [totalClicks, setTotalClicks] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      const [topRes, viewsRes, totalVRes, totalCRes] = await Promise.all([
        fetch('/api/admin/stats?type=top_animals', { headers }),
        fetch('/api/admin/stats?type=daily_views', { headers }),
        fetch('/api/admin/stats?type=total_views', { headers }),
        fetch('/api/admin/stats?type=total_clicks', { headers }),
      ])
      const [top, views, tv, tc] = await Promise.all([topRes.json(), viewsRes.json(), totalVRes.json(), totalCRes.json()])
      setTopAnimals(top)
      setDailyViews(views)
      setTotalViews(tv.total || 0)
      setTotalClicks(tc.total || 0)
      setLoading(false)
    }
    load()
  }, [token])

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase">Page Views (7d)</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] uppercase">Cliques Animais</p>
          <p className="text-2xl font-bold text-[var(--accent)]">{totalClicks.toLocaleString()}</p>
        </div>
      </div>

      {dailyViews.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--accent)] uppercase mb-3">Visitas Diarias</h3>
          <DailyViewsChart dados={dailyViews} />
        </div>
      )}

      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--accent)] uppercase mb-3">Top 20 Animais Mais Clicados</h3>
        {topAnimals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ainda sem dados de cliques</p>
        ) : (
          <div className="space-y-2">
            {topAnimals.map((a, i) => (
              <div key={a.animal_id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-xs font-bold text-[var(--accent)] w-6">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.nome}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{a.categoria} - {a.tipo_marcha === 'MB' ? 'M. Batida' : 'M. Picada'}</p>
                </div>
                <span className="text-sm font-bold text-[var(--accent)]">{a.click_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function BannersPanel({ token }: { token: string }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [cliques, setCliques] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0 })

  const loadBanners = useCallback(async () => {
    const [bannersRes, cliquesRes] = await Promise.all([
      fetch('/api/admin/banners', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/stats?type=banner_clicks', { headers: { 'Authorization': `Bearer ${token}` } }),
    ])
    const data = await bannersRes.json()
    const cliquesData: { banner_id: number; cliques: number }[] = await cliquesRes.json()
    setBanners(data)
    setCliques(Object.fromEntries((cliquesData || []).map(c => [c.banner_id, c.cliques])))
    setLoading(false)
  }, [token])

  useEffect(() => { loadBanners() }, [loadBanners])

  async function saveBanner(e: React.FormEvent) {
    e.preventDefault()
    const method = editingId ? 'PUT' : 'POST'
    const body = editingId ? { ...form, id: editingId } : form
    await fetch('/api/admin/banners', {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setShowForm(false)
    setEditingId(null)
    setForm({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0 })
    loadBanners()
  }

  async function deleteBanner(id: number) {
    await fetch('/api/admin/banners', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadBanners()
  }

  async function toggleBanner(b: Banner) {
    await fetch('/api/admin/banners', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, ativo: !b.ativo }),
    })
    loadBanners()
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Banners ({banners.length})</h3>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0 }) }}
          className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
          + Novo Banner
        </button>
      </div>

      {showForm && (
        <form onSubmit={saveBanner} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={form.posicao} onChange={e => setForm({ ...form, posicao: e.target.value })} className={inputClass}>
              <option value="topo">Topo</option>
              <option value="rodape">Rodape</option>
            </select>
            <input type="number" placeholder="Ordem" value={form.ordem} onChange={e => setForm({ ...form, ordem: Number(e.target.value) })} className={inputClass} />
          </div>
          <input placeholder="Titulo (opcional)" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className={inputClass} />
          <input placeholder="URL da imagem" value={form.imagem_url} onChange={e => setForm({ ...form, imagem_url: e.target.value })} className={inputClass} />
          <input placeholder="Link de destino (opcional)" value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} className={inputClass} />
          <textarea placeholder="HTML personalizado (opcional, substitui imagem)" value={form.html_content} onChange={e => setForm({ ...form, html_content: e.target.value })} rows={3} className={inputClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} />
            Ativo
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold">
              {editingId ? 'Salvar' : 'Criar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {banners.map(b => (
          <div key={b.id} className={`bg-[var(--bg-card)] rounded-xl p-3 border ${b.ativo ? 'border-[var(--accent)]/30' : 'border-[var(--border)] opacity-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${b.posicao === 'topo' ? 'bg-black/10 text-[var(--text-primary)]' : 'bg-[var(--accent-dark)]/10 text-[var(--accent-dark)]'}`}>
                  {b.posicao.toUpperCase()}
                </span>
                <span className="text-sm ml-2">{b.titulo || '(sem titulo)'}</span>
                <span className="text-[10px] text-[var(--text-muted)] ml-2">Ordem: {b.ordem}</span>
                <span className="text-[10px] text-[var(--accent)] font-semibold ml-2">{cliques[b.id] || 0} cliques</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleBanner(b)} className={`text-xs ${b.ativo ? 'text-green-400' : 'text-red-400'}`}>
                  {b.ativo ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => { setEditingId(b.id); setForm({ posicao: b.posicao, titulo: b.titulo || '', imagem_url: b.imagem_url || '', link_url: b.link_url || '', html_content: b.html_content || '', ativo: b.ativo, ordem: b.ordem }); setShowForm(true) }}
                  className="text-xs text-[var(--accent)]">Editar</button>
                <button onClick={() => deleteBanner(b.id)} className="text-xs text-red-400">Excluir</button>
              </div>
            </div>
            {b.imagem_url && <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">{b.imagem_url}</p>}
          </div>
        ))}
        {banners.length === 0 && <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhum banner cadastrado</p>}
      </div>
    </div>
  )
}

function AdminsPanel({ token }: { token: string }) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '' })
  const [msg, setMsg] = useState('')

  const loadAdmins = useCallback(async () => {
    const res = await fetch('/api/admin/admins', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setAdmins(data)
    setLoading(false)
  }, [token])

  useEffect(() => { loadAdmins() }, [loadAdmins])

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error); return }
    setShowForm(false)
    setForm({ email: '', password: '', nome: '' })
    setMsg('Admin adicionado!')
    loadAdmins()
    setTimeout(() => setMsg(''), 3000)
  }

  async function removeAdmin(id: number) {
    await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadAdmins()
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Administradores ({admins.length})</h3>
        <button onClick={() => setShowForm(true)} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
          + Novo Admin
        </button>
      </div>

      {msg && <p className="text-sm text-green-400">{msg}</p>}

      {showForm && (
        <form onSubmit={addAdmin} className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
          <input placeholder="Nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required className={inputClass} />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required className={inputClass} />
          <input type="password" placeholder="Senha" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required className={inputClass} />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold">Adicionar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {admins.map(a => (
          <div key={a.id} className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{a.nome}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{a.email}</p>
            </div>
            {admins.length > 1 && (
              <button onClick={() => removeAdmin(a.id)} className="text-xs text-red-400">Remover</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
