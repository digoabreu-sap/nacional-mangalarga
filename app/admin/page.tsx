'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { APP_VERSION, formatVersionComDataHora } from '@/lib/version'
import { normalizarColocacao } from '@/lib/colocacao'
import { StatusCor, TemaCoresConfig, DEFAULT_CORES, STATUS_LABEL, corEfetiva, hexParaRgba } from '@/lib/temaCores'
import DailyViewsChart from '@/components/admin/DailyViewsChart'

type AbaAdmin = 'analytics' | 'leads' | 'categoria' | 'video' | 'resultados' | 'campeoes' | 'banners' | 'sobre' | 'whatsapp' | 'aparencia' | 'admins'

const TAB_LABELS: Record<AbaAdmin, string> = {
  analytics: 'Analytics',
  leads: 'Leads',
  categoria: 'Categoria',
  video: 'Vídeo',
  resultados: 'Resultados',
  campeoes: 'Campeões',
  banners: 'Banners',
  sobre: 'Sobre',
  whatsapp: 'WhatsApp',
  aparencia: 'Aparência',
  admins: 'Admins',
}
const TODAS_ABAS: AbaAdmin[] = ['analytics', 'leads', 'categoria', 'video', 'resultados', 'campeoes', 'banners', 'sobre', 'whatsapp', 'aparencia', 'admins']
// Checkboxes de permissao concedidas por aba - "admins" fica de fora (so
// quem e is_master mexe em admins/permissoes, pra ninguem restrito se
// autopromover).
const ABAS_PERMISSAO: Exclude<AbaAdmin, 'admins'>[] = ['analytics', 'leads', 'categoria', 'video', 'resultados', 'campeoes', 'banners', 'sobre', 'whatsapp', 'aparencia']

type Admin = { id: number; email: string; nome: string; is_master: boolean; permissoes: string[] }
type Banner = { id: number; posicao: string; titulo: string; imagem_url: string; link_url: string; html_content: string; ativo: boolean; ordem: number; tamanho_pct: number }
type TopAnimal = { animal_id: number; nome: string; categoria: string; tipo_marcha: string; click_count: number }
type DailyView = { dia: string; total: number }

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [tab, setTab] = useState<AbaAdmin>('analytics')
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    document.title = `Admin - Nacional MM (${formatVersionComDataHora()})`
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('nm_admin_token')
    const a = localStorage.getItem('nm_admin_user')
    if (t && a) {
      try {
        const payload = JSON.parse(atob(t))
        const admLido = JSON.parse(a)
        // Sessao salva antes da feature de permissoes por aba nao tem
        // is_master/permissoes nem no token nem no localStorage - nao da pra
        // saber o nivel de acesso real sem logar de novo, entao forca um
        // novo login em vez de deixar a pessoa presa numa tela "sem
        // permissao" (ela pode muito bem ser master, so o dado esta stale).
        const sessaoDesatualizada = !('is_master' in admLido) || !('is_master' in payload)
        if (payload.exp > Date.now() && !sessaoDesatualizada) {
          setToken(t)
          setAdmin({ ...admLido, is_master: !!admLido.is_master, permissoes: admLido.permissoes || [] })
        } else {
          localStorage.removeItem('nm_admin_token')
          localStorage.removeItem('nm_admin_user')
        }
      } catch { /* invalid token */ }
    }
  }, [])

  if (!token || !admin) return <LoginForm onLogin={(t, a) => { setToken(t); setAdmin(a) }} />

  const abasVisiveis = TODAS_ABAS.filter(a => a === 'admins' ? admin.is_master : (admin.is_master || (admin.permissoes || []).includes(a)))
  const tabAtual = abasVisiveis.includes(tab) ? tab : abasVisiveis[0]

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">{TAB_LABELS[tabAtual]}</h1>
              <p className="text-xs text-[var(--text-muted)]">Ola, {admin.nome}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
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

      {/* Menu lateral - some/aparece por cima do conteudo (nao empurra
          layout), pra caber as 11 abas sem precisar rolar uma barra
          horizontal como antes. */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuAberto(false)} />
          <nav className="relative w-64 max-w-[80vw] h-full bg-[var(--bg-card)] border-r border-[var(--border)] overflow-y-auto p-3 flex flex-col gap-1 shadow-2xl">
            <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-[var(--border)]">
              <span className="text-sm font-bold">Menu</span>
              <button onClick={() => setMenuAberto(false)} aria-label="Fechar menu" className="w-7 h-7 flex items-center justify-center text-[var(--text-secondary)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {abasVisiveis.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setMenuAberto(false) }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  tabAtual === t ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-4">
        {abasVisiveis.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">Nenhuma permissao configurada pra este acesso. Fale com um administrador master.</p>
        )}
        {tabAtual === 'analytics' && <AnalyticsPanel token={token} />}
        {tabAtual === 'leads' && <LeadsPanel token={token} />}
        {tabAtual === 'categoria' && <CategoriaPanel token={token} />}
        {tabAtual === 'video' && <VideoPanel token={token} />}
        {tabAtual === 'resultados' && <ResultadosPanel token={token} />}
        {tabAtual === 'campeoes' && <CampeoesPanel token={token} />}
        {tabAtual === 'banners' && <BannersPanel token={token} />}
        {tabAtual === 'sobre' && <SobrePanel token={token} />}
        {tabAtual === 'whatsapp' && <WhatsappPanel token={token} />}
        {tabAtual === 'aparencia' && <AparenciaPanel token={token} />}
        {tabAtual === 'admins' && <AdminsPanel token={token} />}
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

type Pista = { id: number; categoria: string | null; tipo_marcha: string | null; fase_julgamento: string | null; simulacao_habilitada?: boolean }
const FASES_JULGAMENTO = [
  { value: '', label: 'Nenhuma' },
  { value: 'morfologia', label: 'Morfologia' },
  { value: 'marcha', label: 'Marcha' },
  { value: 'funcional', label: 'Prova Funcional' },
] as const
const FASE_LABEL: Record<string, string> = { morfologia: 'Morfologia', marcha: 'Marcha', funcional: 'Prova Funcional' }

function CategoriaPanel({ token }: { token: string }) {
  const [categorias, setCategorias] = useState<string[]>([])
  const [pistas, setPistas] = useState<Pista[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/categoria-atual', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setCategorias(data.categorias || [])
    setPistas(data.pistas || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function salvarPista(id: number, categoria: string, tipoMarcha: 'MB' | 'MP', fase: string, simulacaoHabilitada: boolean) {
    const res = await fetch('/api/admin/categoria-atual', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        categoria: categoria || null,
        tipo_marcha: categoria ? tipoMarcha : null,
        fase_julgamento: categoria ? (fase || null) : null,
        simulacao_habilitada: simulacaoHabilitada,
      }),
    })
    if (res.ok) await load()
    return res.ok
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Categoria em Andamento</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Configure ate 2 categorias ao mesmo tempo (2 rings julgando em paralelo). Quando as duas estiverem preenchidas, o visitante ve as duas no topo do site e escolhe entre elas quando quiser.
      </p>
      {pistas.map(pista => (
        <PistaBlock key={pista.id} pista={pista} categorias={categorias} onSave={salvarPista} token={token} />
      ))}
    </div>
  )
}

function PistaBlock({ pista, categorias, onSave, token }: {
  pista: Pista
  categorias: string[]
  onSave: (id: number, categoria: string, marcha: 'MB' | 'MP', fase: string, simulacaoHabilitada: boolean) => Promise<boolean>
  token: string
}) {
  const [selected, setSelected] = useState(pista.categoria || '')
  const [selectedMarcha, setSelectedMarcha] = useState<'MB' | 'MP'>((pista.tipo_marcha as 'MB' | 'MP') || 'MB')
  const [selectedFase, setSelectedFase] = useState(pista.fase_julgamento || '')
  const [simulacaoHabilitada, setSimulacaoHabilitada] = useState(pista.simulacao_habilitada !== false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [busca, setBusca] = useState('')

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] appearance-none"
  const categoriasFiltradas = busca.trim()
    ? categorias.filter(c => c.toLowerCase().includes(busca.trim().toLowerCase()) || c === selected)
    : categorias

  async function save() {
    setSaving(true)
    setMsg('')
    const ok = await onSave(pista.id, selected, selectedMarcha, selectedFase, simulacaoHabilitada)
    setSaving(false)
    setMsg(ok ? 'Atualizada!' : 'Erro ao salvar')
    if (ok) setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
      <p className="text-xs text-[var(--text-muted)]">
        Pista {pista.id} — <span className="text-[var(--accent)] font-semibold">
          {pista.categoria
            ? `${pista.categoria} (${pista.tipo_marcha === 'MP' ? 'Marcha Picada' : 'Marcha Batida'})${pista.fase_julgamento ? ` · ${FASE_LABEL[pista.fase_julgamento]}` : ''}`
            : 'Nenhuma configurada'}
        </span>
      </p>
      <input
        type="text"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Pesquisar categoria..."
        className={inputClass}
      />
      <select value={selected} onChange={e => setSelected(e.target.value)} className={inputClass}>
        <option value="">Nenhuma</option>
        {categoriasFiltradas.map(c => <option key={c} value={c}>{c}</option>)}
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
      <div>
        <label className="text-xs text-[var(--text-muted)] block mb-1">Quesito sendo julgado agora</label>
        <div className="grid grid-cols-2 gap-1 bg-[var(--bg-primary)] rounded-lg p-0.5">
          {FASES_JULGAMENTO.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedFase(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                selectedFase === f.value ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-2 bg-[var(--bg-primary)] rounded-lg p-3">
        <span className="text-xs">
          <span className="block font-medium">Simulação ao vivo pro público</span>
          <span className="block text-[var(--text-muted)] mt-0.5">
            Se ligado (padrão), quando você não definir os finalistas aqui embaixo, cada visitante pode marcar Entre os 7/8 a 13/Retirado e reordenar por conta própria (só no aparelho dele).
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={simulacaoHabilitada}
          onClick={() => setSimulacaoHabilitada(v => !v)}
          className={`flex-shrink-0 w-11 h-6 rounded-full transition-colors relative ${simulacaoHabilitada ? 'bg-[var(--accent)]' : 'bg-black/20'}`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${simulacaoHabilitada ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </label>
      {msg && <p className="text-sm text-green-400">{msg}</p>}
      <button onClick={save} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
      {pista.categoria && pista.tipo_marcha && (
        <FinalistasMarchaPanel token={token} categoria={pista.categoria} tipoMarcha={pista.tipo_marcha} />
      )}
    </div>
  )
}

type AnimalFinalista = { id: number; nome: string; num_catalogo: string | null; haras: string | null; finalista_marcha: boolean; retirado: boolean }

// Se o admin nao definir nada aqui, o proprio usuario pode marcar por conta
// propria na Home - mas so localmente (nao mexe nesses dados). Este painel e
// a fonte "oficial", compartilhada com todo mundo.
function FinalistasMarchaPanel({ token, categoria, tipoMarcha }: { token: string; categoria: string; tipoMarcha: string }) {
  const [animais, setAnimais] = useState<AnimalFinalista[]>([])
  const [classificados, setClassificados] = useState<Set<number>>(new Set())
  const [retirados, setRetirados] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ categoria, tipo_marcha: tipoMarcha })
    const res = await fetch(`/api/admin/finalistas-marcha?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    const lista: AnimalFinalista[] = data.animais || []
    setAnimais(lista)
    setClassificados(new Set(lista.filter(a => a.finalista_marcha).map(a => a.id)))
    setRetirados(new Set(lista.filter(a => a.retirado).map(a => a.id)))
    setLoading(false)
  }, [token, categoria, tipoMarcha])

  useEffect(() => { load() }, [load])

  function toggleClassificado(id: number) {
    setClassificados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 7) next.add(id)
      return next
    })
  }

  function toggleRetirado(id: number) {
    setRetirados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function salvar() {
    setSaving(true)
    setMsg('')
    const [resClassificados, resRetirados] = await Promise.all([
      fetch('/api/admin/finalistas-marcha', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, tipo_marcha: tipoMarcha, animal_ids: [...classificados] }),
      }),
      fetch('/api/admin/retirados', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria, tipo_marcha: tipoMarcha, animal_ids: [...retirados] }),
      }),
    ])
    setSaving(false)
    setMsg(resClassificados.ok && resRetirados.ok ? 'Atualizado!' : 'Erro ao salvar')
    if (resClassificados.ok && resRetirados.ok) setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-1 space-y-2">
      <p className="text-xs text-[var(--text-muted)]">
        Entre os 7 ({classificados.size}/7) e retirados da prova — se voce nao definir aqui, cada usuario pode marcar por conta propria (so no aparelho dele).
      </p>
      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
      ) : animais.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Nenhum animal encontrado nessa categoria.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1 bg-[var(--bg-primary)] rounded-lg p-2">
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] uppercase font-semibold px-1 pb-1 border-b border-[var(--border)]">
            <span className="w-8 flex-shrink-0"></span>
            <span className="flex-1">Animal</span>
            <span className="w-16 flex-shrink-0 text-center">Entre 7</span>
            <span className="w-16 flex-shrink-0 text-center">Retirado</span>
          </div>
          {animais.map(a => {
            const marcado = classificados.has(a.id)
            const desabilitadoClass = !marcado && classificados.size >= 7
            const retirado = retirados.has(a.id)
            return (
              <div key={a.id} className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-[var(--bg-card-hover)]">
                <span className="font-mono text-[var(--text-muted)] w-8 flex-shrink-0">{a.num_catalogo || '—'}</span>
                <span className={`flex-1 truncate ${retirado ? 'line-through text-[var(--text-muted)]' : ''}`}>{a.nome}</span>
                <span className="w-16 flex-shrink-0 flex justify-center">
                  <input type="checkbox" checked={marcado} disabled={desabilitadoClass} onChange={() => toggleClassificado(a.id)} />
                </span>
                <span className="w-16 flex-shrink-0 flex justify-center">
                  <input type="checkbox" checked={retirado} onChange={() => toggleRetirado(a.id)} />
                </span>
              </div>
            )
          })}
        </div>
      )}
      {msg && <p className="text-sm text-green-400">{msg}</p>}
      <button onClick={salvar} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
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

      <ResultadoManualPanel token={token} />
    </div>
  )
}

type CampeonatoOpt = { id: number; nome: string; tipo_campeonato: string; tipo_marcha: string; categoria: string }
type AnimalOpt = { id: number; num_catalogo: string; nome: string }
type ResultadoManualRow = {
  num_catalogo: string; nome_animal: string | null
  pontuacao_funcional: string | null; pontuacao_morfologia: string | null; pontuacao_andamento: string | null
  colocacao: string | null; origem: string
}
type LinhaEdit = {
  num_catalogo: string; nome_animal: string
  pontuacao_funcional: string; pontuacao_morfologia: string; pontuacao_andamento: string; colocacao: string
  origem: string
}
type CampoEditavel = 'pontuacao_funcional' | 'pontuacao_morfologia' | 'pontuacao_andamento' | 'colocacao'
type PdfParseado = {
  tipo_campeonato: string
  tipo_marcha: 'MB' | 'MP'
  categoria: string
  tipo_competicao: string | null
  campo: CampoEditavel
  linhas: { num_catalogo: string; nome_animal: string; valor: string }[]
}

function normalizarTextoComparacao(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// nm_campeonatos.nome vem cru ("Convencional - MB - Cavalo Adulto"), mas a
// aba Campeonatos que o usuario ve mostra so a categoria + um selo MB/MP
// (Convencional/Exclusivamente Marcha sao modalidade, nao aparecem no
// nome - unificados numa linha so la, task #16). Reproduz esse mesmo
// formato aqui pra bater visualmente - so acrescenta a modalidade quando
// nao for Convencional (senao nao da pra distinguir as duas linhas no
// seletor).
function nomeExibicaoCampeonato(c: { categoria: string; tipo_marcha: string; tipo_campeonato: string }): string {
  const sufixo = c.tipo_campeonato !== 'Convencional' ? ` · ${c.tipo_campeonato}` : ''
  return `${c.categoria} (${c.tipo_marcha})${sufixo}`
}

function montarLinhasEdit(animais: AnimalOpt[], resultados: ResultadoManualRow[]): LinhaEdit[] {
  return animais
    .map(a => {
      const existente = resultados.find(l => l.num_catalogo === a.num_catalogo)
      return {
        num_catalogo: a.num_catalogo,
        nome_animal: existente?.nome_animal || a.nome,
        pontuacao_funcional: existente?.pontuacao_funcional || '',
        pontuacao_morfologia: existente?.pontuacao_morfologia || '',
        pontuacao_andamento: existente?.pontuacao_andamento || '',
        colocacao: existente?.colocacao || '',
        origem: existente?.origem || '',
      }
    })
    .sort((a, b) => (parseInt(a.num_catalogo, 10) || 0) - (parseInt(b.num_catalogo, 10) || 0))
}

// Aplica os valores lidos do PDF na coluna certa (campo) de cada linha, por
// numero de catalogo - nunca mexe em linha ja OFICIAL (mesma regra do
// cadastro manual: resultado raspado da ABCCMM sempre prevalece).
function aplicarPdfNasLinhas(parseado: PdfParseado, linhas: LinhaEdit[]): LinhaEdit[] {
  const porNumCatalogo = new Map(parseado.linhas.map(l => [l.num_catalogo, l.valor]))
  return linhas.map(l => {
    if (l.origem === 'abccmm') return l
    const valor = porNumCatalogo.get(l.num_catalogo)
    if (valor === undefined) return l
    return { ...l, [parseado.campo]: valor }
  })
}

// Lista indexada da hierarquia oficial de colocacao (mesma escala de
// lib/colocacao.ts: 1=Campeao, 2=Reservado, 3-7=1o-5o Premio,
// 8-10=1a-3a Mencao Honrosa) - usada tanto pro listbox de Classificacao
// quanto pra converter o rotulo textual do Resumo Parcial (que usa a
// mesma nomenclatura pros quesitos Marcha/Funcional) numa posicao
// numerica, ja que pontuacao_andamento/pontuacao_funcional guardam
// sempre um rank cru (1, 2, 3...), nao um texto de colocacao.
const OPCOES_COLOCACAO = [
  { valor: 'Campeão', label: '1 - Campeão(ã)' },
  { valor: 'Reservado Campeão', label: '2 - Reservado Campeão(ã)' },
  { valor: '1º Prêmio', label: '3 - 1º Prêmio' },
  { valor: '2º Prêmio', label: '4 - 2º Prêmio' },
  { valor: '3º Prêmio', label: '5 - 3º Prêmio' },
  { valor: '4º Prêmio', label: '6 - 4º Prêmio' },
  { valor: '5º Prêmio', label: '7 - 5º Prêmio' },
  { valor: '1ª Menção Honrosa', label: '8 - 1ª Menção Honrosa' },
  { valor: '2ª Menção Honrosa', label: '9 - 2ª Menção Honrosa' },
  { valor: '3ª Menção Honrosa', label: '10 - 3ª Menção Honrosa' },
]

type SecaoResumoParcial = 'Categoria' | 'Marcha' | 'Prova Funcional'
type EntradaResumoParcial = {
  tipo_campeonato: string; tipo_marcha: 'MB' | 'MP'; categoria: string
  secao: SecaoResumoParcial; num_catalogo: string; colocacao_bruta: string
}

// Aplica os resultados do Resumo Parcial (Mapa de Premiação) na categoria
// aberta: secao "Categoria" vira o campo colocacao (so quando o
// tipo_campeonato do PDF bate com o campeonato aberto - Exclusivamente
// Marcha nunca tem secao de Categoria, so de Marcha). "Marcha" e "Prova
// Funcional" viram pontuacao_andamento/pontuacao_funcional, convertendo o
// rotulo textual pra posicao numerica via a mesma tabela de OPCOES_COLOCACAO
// (o PDF junta Convencional e Exclusivamente Marcha na mesma secao de
// Marcha sem distinguir tipo_campeonato - mas so os animais realmente
// cadastrados nessa categoria aparecem em linhasEdit, entao casar por
// numero de catalogo ja filtra certo sozinho).
function aplicarResumoParcialNasLinhas(
  entradas: EntradaResumoParcial[],
  campeonato: CampeonatoOpt,
  linhas: LinhaEdit[],
): { linhas: LinhaEdit[]; aplicados: number } {
  const atualizadas = new Map<string, LinhaEdit>(linhas.map(l => [l.num_catalogo, l]))
  let aplicados = 0

  for (const e of entradas) {
    if (e.tipo_marcha !== campeonato.tipo_marcha) continue
    if (normalizarTextoComparacao(e.categoria) !== normalizarTextoComparacao(campeonato.categoria)) continue
    const linha = atualizadas.get(e.num_catalogo)
    if (!linha || linha.origem === 'abccmm') continue

    // Normaliza o rotulo bruto do PDF ("Campeão(ã) - Jovem", "Campeão(a)",
    // "1 Prêmio"...) pro rotulo canonico da hierarquia (mesma tabela de
    // OPCOES_COLOCACAO) - assim o valor gravado sempre casa com uma opcao
    // do listbox de Classificacao, em vez de sobrar como texto solto.
    const normalizado = normalizarColocacao(e.colocacao_bruta)
    if (!normalizado || normalizado.ordem > 10) continue

    if (e.secao === 'Categoria') {
      if (normalizarTextoComparacao(e.tipo_campeonato) !== normalizarTextoComparacao(campeonato.tipo_campeonato)) continue
      atualizadas.set(e.num_catalogo, { ...linha, colocacao: normalizado.label })
      aplicados++
    } else {
      const campo = e.secao === 'Marcha' ? 'pontuacao_andamento' : 'pontuacao_funcional'
      atualizadas.set(e.num_catalogo, { ...linha, [campo]: String(normalizado.ordem) })
      aplicados++
    }
  }

  return { linhas: linhas.map(l => atualizadas.get(l.num_catalogo) || l), aplicados }
}

// Cadastro manual de resultado (enquanto a ABCCMM ainda nao publicou o
// oficial daquela categoria), no mesmo formato de tabela da pagina Final da
// ABCCMM - toda a categoria de uma vez, pra digitar tabulando entre campos
// e salvar tudo com 1 clique, em vez de selecionar animal por animal. O
// resultado raspado sempre prevalece: o RPC de upsert manual ignora
// silenciosamente a escrita se ja existir uma linha de origem 'abccmm' pra
// aquele animal (por isso linhas oficiais aparecem travadas pra edicao).
type CampeonatoPendente = CampeonatoOpt & { total_animais: number; registrados: number }

function ResultadoManualPanel({ token }: { token: string }) {
  const [campeonatos, setCampeonatos] = useState<CampeonatoOpt[]>([])
  const [pendentes, setPendentes] = useState<CampeonatoPendente[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [linhasEdit, setLinhasEdit] = useState<LinhaEdit[]>([])
  const [loadingLinhas, setLoadingLinhas] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [pdfParseado, setPdfParseado] = useState<PdfParseado | null>(null)
  const [resumoLoading, setResumoLoading] = useState(false)
  const [resumoMsg, setResumoMsg] = useState('')
  const [resumoEntradas, setResumoEntradas] = useState<EntradaResumoParcial[] | null>(null)
  const [resumoNomeArquivo, setResumoNomeArquivo] = useState('')
  const [busca, setBusca] = useState('')
  // Quando o PDF acha a categoria certa sozinho, a gente monta e mescla as
  // linhas na mao e muda selectedId so pra atualizar o combo - sem essa
  // trava, o efeito abaixo (que reage a mudanca de selectedId) recarregaria
  // a categoria do zero e jogaria fora o que acabou de vir do PDF.
  const pularProximoLoadRef = useRef(false)

  const carregarListaCampeonatos = useCallback(() => {
    fetch('/api/admin/resultados-manual', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setCampeonatos(data.campeonatos || [])
        setPendentes(data.pendentes || [])
      })
  }, [token])

  useEffect(() => { carregarListaCampeonatos() }, [carregarListaCampeonatos])

  const campeonato = campeonatos.find(c => String(c.id) === selectedId) || null
  const campeonatosFiltrados = busca.trim()
    ? campeonatos.filter(c => nomeExibicaoCampeonato(c).toLowerCase().includes(busca.trim().toLowerCase()) || String(c.id) === selectedId)
    : campeonatos

  const loadDados = useCallback(async () => {
    if (!campeonato) { setLinhasEdit([]); return }
    setLoadingLinhas(true)
    const params = new URLSearchParams({ tipo_campeonato: campeonato.tipo_campeonato, tipo_marcha: campeonato.tipo_marcha, categoria: campeonato.categoria })
    const res = await fetch(`/api/admin/resultados-manual?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setLinhasEdit(montarLinhasEdit(data.animais || [], data.resultados || []))
    setLoadingLinhas(false)
  }, [token, campeonato?.tipo_campeonato, campeonato?.tipo_marcha, campeonato?.categoria])

  useEffect(() => {
    if (pularProximoLoadRef.current) { pularProximoLoadRef.current = false; return }
    loadDados()
  }, [loadDados])

  function atualizarCampo(numCatalogo: string, campo: CampoEditavel, valor: string) {
    setLinhasEdit(prev => prev.map(l => l.num_catalogo === numCatalogo ? { ...l, [campo]: valor } : l))
  }

  async function carregarPdf(file: File) {
    setPdfLoading(true)
    setPdfMsg('')
    setPdfParseado(null)
    const formData = new FormData()
    formData.append('pdf', file)
    const res = await fetch('/api/admin/resultados-manual/pdf', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    })
    const data = await res.json()
    setPdfLoading(false)
    if (!res.ok) { setPdfMsg(data.error || 'Erro ao ler o PDF'); return }

    const encontrado = campeonatos.find(c =>
      normalizarTextoComparacao(c.tipo_campeonato) === normalizarTextoComparacao(data.tipo_campeonato) &&
      c.tipo_marcha === data.tipo_marcha &&
      normalizarTextoComparacao(c.categoria) === normalizarTextoComparacao(data.categoria)
    )

    if (encontrado) {
      const params = new URLSearchParams({ tipo_campeonato: encontrado.tipo_campeonato, tipo_marcha: encontrado.tipo_marcha, categoria: encontrado.categoria })
      const res2 = await fetch(`/api/admin/resultados-manual?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const dados2 = await res2.json()
      const linhasBase = montarLinhasEdit(dados2.animais || [], dados2.resultados || [])
      pularProximoLoadRef.current = true
      setLinhasEdit(aplicarPdfNasLinhas(data, linhasBase))
      setSelectedId(String(encontrado.id))
      setPdfMsg(`PDF aplicado (${data.tipo_competicao || 'resultado'}) em "${nomeExibicaoCampeonato(encontrado)}" - revise e clique em Salvar Todos.`)
    } else {
      setPdfParseado(data)
      setPdfMsg(`PDF lido (${data.tipo_competicao || 'resultado'}): ${data.tipo_campeonato} - ${data.tipo_marcha} ${data.categoria}. Nao achei essa categoria na lista - selecione a categoria certa e clique em "Aplicar PDF Carregado".`)
    }
  }

  function aplicarPdfPendente() {
    if (!pdfParseado || !campeonato) return
    setLinhasEdit(prev => aplicarPdfNasLinhas(pdfParseado, prev))
    setPdfMsg(`PDF aplicado (${pdfParseado.tipo_competicao || 'resultado'}) - revise e clique em Salvar Todos.`)
    setPdfParseado(null)
  }

  async function carregarResumoParcial(file: File) {
    setResumoLoading(true)
    setResumoMsg('')
    const formData = new FormData()
    formData.append('pdf', file)
    const res = await fetch('/api/admin/resultados-manual/resumo-parcial', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    })
    const data = await res.json()
    setResumoLoading(false)
    if (!res.ok) { setResumoMsg(data.error || 'Erro ao ler o PDF'); return }
    setResumoEntradas(data.entradas)
    setResumoNomeArquivo(file.name)
    setResumoMsg(`${data.entradas.length} resultado(s) lido(s) de "${file.name}" - selecione uma categoria e clique em "Buscar no Resumo Parcial".`)
  }

  function buscarNoResumoParcial() {
    if (!resumoEntradas || !campeonato) return
    const { linhas, aplicados } = aplicarResumoParcialNasLinhas(resumoEntradas, campeonato, linhasEdit)
    setLinhasEdit(linhas)
    setResumoMsg(aplicados > 0
      ? `${aplicados} resultado(s) encontrado(s) no Resumo Parcial para essa categoria - revise e clique em Salvar Todos.`
      : 'Nenhum resultado encontrado no Resumo Parcial para essa categoria ainda.')
  }

  async function salvarTudo() {
    if (!campeonato) return
    const comDados = linhasEdit.filter(l => l.origem !== 'abccmm' && (l.pontuacao_funcional || l.pontuacao_morfologia || l.pontuacao_andamento || l.colocacao))
    if (comDados.length === 0) { setMsg('Nenhum dado novo pra salvar.'); return }
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/resultados-manual', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo_campeonato: campeonato.tipo_campeonato, tipo_marcha: campeonato.tipo_marcha, categoria: campeonato.categoria,
        linhas: comDados,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const data = await res.json()
      setMsg(`${data.salvos} resultado(s) salvo(s)${data.ignorados?.length ? ` · ${data.ignorados.length} ignorado(s) por ja ter oficial` : ''}.`)
      setTimeout(() => setMsg(''), 5000)
      loadDados()
      carregarListaCampeonatos()
    } else {
      setMsg('Erro ao salvar')
    }
  }

  async function excluir(numCatalogo: string) {
    if (!campeonato) return
    await fetch('/api/admin/resultados-manual', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo_campeonato: campeonato.tipo_campeonato, tipo_marcha: campeonato.tipo_marcha, categoria: campeonato.categoria, num_catalogo: numCatalogo }),
    })
    loadDados()
    carregarListaCampeonatos()
  }

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
  const cellInputClass = "w-full py-1 px-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-sm font-semibold">Cadastro Manual de Resultado</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Use enquanto a ABCCMM ainda nao publicou o resultado oficial dessa categoria. Preencha a tabela (tab entre os campos) e clique em Salvar Todos uma unica vez. Assim que a sincronizacao encontrar o oficial, ele sempre substitui o que foi cadastrado aqui - linhas ja OFICIAIS aparecem travadas.
      </p>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">
            Pendentes de cadastro <span className="text-[var(--text-muted)] font-normal">({pendentes.length})</span>
          </p>
          <button onClick={carregarListaCampeonatos} className="text-[10px] text-[var(--accent)]">Atualizar lista</button>
        </div>
        {pendentes.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Nenhuma categoria pendente - todo mundo com colocacao registrada.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto space-y-1">
            {pendentes.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(String(p.id)); setBusca(''); setPdfParseado(null); setPdfMsg('') }}
                className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                  String(p.id) === selectedId ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-[var(--bg-card-hover)]'
                }`}
              >
                <span className="truncate">{nomeExibicaoCampeonato(p)}</span>
                <span className="flex-shrink-0 font-mono text-[var(--text-muted)]">{p.registrados}/{p.total_animais}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className={`px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm font-semibold ${pdfLoading ? 'opacity-50' : 'cursor-pointer hover:border-[var(--accent)]/50'}`}>
          {pdfLoading ? 'Lendo PDF...' : 'Carregar PDF de Resultado'}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={pdfLoading}
            onChange={e => { const f = e.target.files?.[0]; if (f) carregarPdf(f); e.target.value = '' }}
          />
        </label>
        {pdfParseado && campeonato && (
          <button onClick={aplicarPdfPendente} className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
            Aplicar PDF Carregado
          </button>
        )}
      </div>
      {pdfMsg && <p className="text-xs text-[var(--accent)]">{pdfMsg}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <label className={`px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-sm font-semibold ${resumoLoading ? 'opacity-50' : 'cursor-pointer hover:border-[var(--accent)]/50'}`}>
          {resumoLoading ? 'Lendo Resumo Parcial...' : resumoNomeArquivo ? 'Trocar Resumo Parcial' : 'Carregar Resumo Parcial'}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={resumoLoading}
            onChange={e => { const f = e.target.files?.[0]; if (f) carregarResumoParcial(f); e.target.value = '' }}
          />
        </label>
        {resumoEntradas && campeonato && (
          <button onClick={buscarNoResumoParcial} className="px-3 py-2 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
            Buscar no Resumo Parcial
          </button>
        )}
      </div>
      {resumoMsg && <p className="text-xs text-[var(--accent)]">{resumoMsg}</p>}

      <input
        type="text"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Pesquisar categoria..."
        className={inputClass}
      />
      <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={inputClass}>
        <option value="">Selecione a categoria...</option>
        {campeonatosFiltrados.map(c => <option key={c.id} value={c.id}>{nomeExibicaoCampeonato(c)}</option>)}
      </select>

      {campeonato && (
        loadingLinhas ? (
          <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
        ) : linhasEdit.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">Nenhum animal cadastrado nessa categoria.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs border-collapse min-w-[38rem]">
                <thead>
                  <tr className="text-[var(--text-muted)] text-left">
                    <th className="py-1.5 pr-2 font-medium">Nº</th>
                    <th className="py-1.5 pr-2 font-medium">Competidor</th>
                    <th className="py-1.5 pr-2 font-medium w-16">Func.</th>
                    <th className="py-1.5 pr-2 font-medium w-16">Morf.</th>
                    <th className="py-1.5 pr-2 font-medium w-16">Marcha</th>
                    <th className="py-1.5 pr-2 font-medium w-32">Classificação</th>
                    <th className="py-1.5 font-medium w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {linhasEdit.map(l => {
                    const oficial = l.origem === 'abccmm'
                    return (
                      <tr key={l.num_catalogo} className="border-t border-[var(--border)]">
                        <td className="py-1.5 pr-2 text-[var(--text-muted)]">{l.num_catalogo}</td>
                        <td className="py-1.5 pr-2 truncate max-w-[9rem]" title={l.nome_animal}>{l.nome_animal}</td>
                        {oficial ? (
                          <>
                            <td className="py-1.5 pr-2 text-[var(--text-muted)]">{l.pontuacao_funcional || '—'}</td>
                            <td className="py-1.5 pr-2 text-[var(--text-muted)]">{l.pontuacao_morfologia || '—'}</td>
                            <td className="py-1.5 pr-2 text-[var(--text-muted)]">{l.pontuacao_andamento || '—'}</td>
                            <td className="py-1.5 pr-2 text-[var(--text-muted)]">{l.colocacao || '—'}</td>
                            <td className="py-1.5"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/10 whitespace-nowrap">OFICIAL</span></td>
                          </>
                        ) : (
                          <>
                            <td className="py-1.5 pr-2">
                              <input value={l.pontuacao_funcional} onChange={e => atualizarCampo(l.num_catalogo, 'pontuacao_funcional', e.target.value)} className={cellInputClass} />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input value={l.pontuacao_morfologia} onChange={e => atualizarCampo(l.num_catalogo, 'pontuacao_morfologia', e.target.value)} className={cellInputClass} />
                            </td>
                            <td className="py-1.5 pr-2">
                              <input value={l.pontuacao_andamento} onChange={e => atualizarCampo(l.num_catalogo, 'pontuacao_andamento', e.target.value)} className={cellInputClass} />
                            </td>
                            <td className="py-1.5 pr-2">
                              <select
                                value={l.colocacao}
                                onChange={e => atualizarCampo(l.num_catalogo, 'colocacao', e.target.value)}
                                className={cellInputClass}
                              >
                                <option value="">—</option>
                                {OPCOES_COLOCACAO.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
                                {l.colocacao && !OPCOES_COLOCACAO.some(o => o.valor === l.colocacao) && (
                                  <option value={l.colocacao}>{l.colocacao}</option>
                                )}
                              </select>
                            </td>
                            <td className="py-1.5">
                              {l.origem === 'manual' && (
                                <button type="button" onClick={() => excluir(l.num_catalogo)} className="text-[10px] text-red-400 whitespace-nowrap">Excluir</button>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {msg && <p className="text-xs text-[var(--accent)]">{msg}</p>}
            <button onClick={salvarTudo} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar Todos'}
            </button>
          </>
        )
      )}
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
  const [form, setForm] = useState({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0, tamanho_pct: 100 })
  const [espacamento, setEspacamento] = useState(12)
  const [salvandoEspacamento, setSalvandoEspacamento] = useState(false)
  const [msgEspacamento, setMsgEspacamento] = useState('')

  const loadBanners = useCallback(async () => {
    const [bannersRes, cliquesRes, configRes] = await Promise.all([
      fetch('/api/admin/banners', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/stats?type=banner_clicks', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('/api/admin/banner-config', { headers: { 'Authorization': `Bearer ${token}` } }),
    ])
    const data = await bannersRes.json()
    const cliquesData: { banner_id: number; cliques: number }[] = await cliquesRes.json()
    const config = await configRes.json()
    setBanners(data)
    setCliques(Object.fromEntries((cliquesData || []).map(c => [c.banner_id, c.cliques])))
    setEspacamento(config.espacamento_px ?? 12)
    setLoading(false)
  }, [token])

  useEffect(() => { loadBanners() }, [loadBanners])

  async function salvarEspacamento() {
    setSalvandoEspacamento(true)
    setMsgEspacamento('')
    const res = await fetch('/api/admin/banner-config', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ espacamento_px: espacamento }),
    })
    setSalvandoEspacamento(false)
    setMsgEspacamento(res.ok ? 'Atualizado!' : 'Erro ao salvar')
    if (res.ok) setTimeout(() => setMsgEspacamento(''), 3000)
  }

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
    setForm({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0, tamanho_pct: 100 })
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
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-2">
        <h3 className="text-sm font-semibold">Espaçamento entre banners (letreiro)</h3>
        <p className="text-xs text-[var(--text-muted)]">Distância em pixels entre um banner e o próximo, quando há 2 ou mais rolando.</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={80}
            value={espacamento}
            onChange={e => setEspacamento(Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
          <span className="text-xs text-[var(--text-muted)]">px</span>
          <button onClick={salvarEspacamento} disabled={salvandoEspacamento} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold disabled:opacity-50">
            {salvandoEspacamento ? 'Salvando...' : 'Salvar'}
          </button>
          {msgEspacamento && <span className="text-xs text-green-400">{msgEspacamento}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Banners ({banners.length})</h3>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ posicao: 'topo', titulo: '', imagem_url: '', link_url: '', html_content: '', ativo: true, ordem: 0, tamanho_pct: 100 }) }}
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
          <div>
            <label className="text-xs text-[var(--text-muted)] block mb-1">Tamanho ({form.tamanho_pct}% do padrão) — ajuste pra este banner não ficar maior/menor que os outros</label>
            <input
              type="range"
              min={20}
              max={200}
              step={5}
              value={form.tamanho_pct}
              onChange={e => setForm({ ...form, tamanho_pct: Number(e.target.value) })}
              className="w-full"
            />
          </div>
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
                <span className="text-[10px] text-[var(--text-muted)] ml-2">Tamanho: {b.tamanho_pct ?? 100}%</span>
                <span className="text-[10px] text-[var(--accent)] font-semibold ml-2">{cliques[b.id] || 0} cliques</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleBanner(b)} className={`text-xs ${b.ativo ? 'text-green-400' : 'text-red-400'}`}>
                  {b.ativo ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => { setEditingId(b.id); setForm({ posicao: b.posicao, titulo: b.titulo || '', imagem_url: b.imagem_url || '', link_url: b.link_url || '', html_content: b.html_content || '', ativo: b.ativo, ordem: b.ordem, tamanho_pct: b.tamanho_pct ?? 100 }); setShowForm(true) }}
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

function PermissoesCheckboxes({ isMaster, permissoes, onChangeMaster, onTogglePermissao }: {
  isMaster: boolean
  permissoes: string[]
  onChangeMaster: (v: boolean) => void
  onTogglePermissao: (aba: string) => void
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isMaster} onChange={e => onChangeMaster(e.target.checked)} />
        Administrador master (acesso total a todas as abas, inclusive Admins)
      </label>
      {!isMaster && (
        <div className="grid grid-cols-2 gap-1.5 pl-1">
          {ABAS_PERMISSAO.map(aba => (
            <label key={aba} className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={permissoes.includes(aba)} onChange={() => onTogglePermissao(aba)} />
              {TAB_LABELS[aba]}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function SobrePanel({ token }: { token: string }) {
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/sobre', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setTexto(data?.texto || ''); setLoading(false) })
  }, [token])

  async function salvar() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/sobre', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Salvo!')
      setTimeout(() => setMsg(''), 3000)
    } else {
      setMsg('Erro ao salvar')
    }
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Sobre</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Texto exibido na tela &quot;Sobre&quot; do app (acessivel pelo icone de informacao na barra inferior). Fale sobre os desenvolvedores e inclua contatos pra parcerias - links (https://...) e emails escritos no texto viram clicaveis automaticamente, sem precisar de nenhuma formatacao especial.
      </p>
      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={12}
        placeholder={'Ex: Este app foi desenvolvido por Fulano e Ciclano.\n\nContato para parcerias: contato@exemplo.com\nInstagram: https://instagram.com/exemplo'}
        className="w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
      />
      {msg && <p className="text-sm text-green-400">{msg}</p>}
      <button onClick={salvar} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  )
}

type TipoCampeaoDosCampeoes = 'macho' | 'femea' | 'castrado' | 'grande_jovem_macho' | 'grande_jovem_femea'
type AnimalCampeaoDosCampeoes = {
  num_catalogo: string; nome: string; categoria: string; tipo_marcha: string
  registro: string | null; haras: string | null; expositor: string | null; ordem: number
}

const CAMPEOES_TIPO_LABEL: Record<TipoCampeaoDosCampeoes, string> = {
  macho: 'Campeão dos Campeões',
  femea: 'Campeã das Campeãs',
  castrado: 'Campeão dos Campeões Castrado',
  grande_jovem_macho: 'Grande Campeonato Jovem da Raça — Machos',
  grande_jovem_femea: 'Grande Campeonato Jovem da Raça — Fêmeas',
}

// 6 campeonatos no total (3 tipos x 2 marchas). Diferente do resto do site,
// esses juntam animais de VARIAS categorias (os campeoes de marcha de cada
// categoria voltam a pista - Art. 76 do regulamento), entao nao da pra
// calcular automaticamente por categoria+marcha - o admin monta a lista na
// mao, inserindo/removendo pelo numero de catalogo.
function CampeoesPanel({ token }: { token: string }) {
  const [tipo, setTipo] = useState<TipoCampeaoDosCampeoes>('macho')
  const [tipoMarcha, setTipoMarcha] = useState<'MB' | 'MP'>('MB')
  const [animais, setAnimais] = useState<AnimalCampeaoDosCampeoes[]>([])
  const [loading, setLoading] = useState(true)
  const [numCatalogoInput, setNumCatalogoInput] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ tipo, tipo_marcha: tipoMarcha })
    const res = await fetch(`/api/admin/campeoes-dos-campeoes?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setAnimais(data.animais || [])
    setLoading(false)
  }, [token, tipo, tipoMarcha])

  useEffect(() => { load() }, [load])

  async function adicionar() {
    const numCatalogo = numCatalogoInput.trim()
    if (!numCatalogo) return
    setAdicionando(true)
    setErro('')
    setMsg('')
    const res = await fetch('/api/admin/campeoes-dos-campeoes', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, tipo_marcha: tipoMarcha, num_catalogo: numCatalogo }),
    })
    const data = await res.json()
    setAdicionando(false)
    if (!res.ok) {
      setErro(data.error?.includes('nao encontrado') ? `Nenhum animal com catálogo ${numCatalogo}` : (data.error || 'Erro ao adicionar'))
      return
    }
    setNumCatalogoInput('')
    setMsg('Adicionado!')
    setTimeout(() => setMsg(''), 2000)
    load()
  }

  async function remover(numCatalogo: string) {
    setRemovendo(numCatalogo)
    await fetch('/api/admin/campeoes-dos-campeoes', {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, tipo_marcha: tipoMarcha, num_catalogo: numCatalogo }),
    })
    setRemovendo(null)
    load()
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Campeão dos Campeões / Campeã das Campeãs</h3>
      <p className="text-xs text-[var(--text-muted)]">
        Monte a lista de cada um dos 6 campeonatos inserindo o número de catálogo do animal. Diferente do resto do site, esses campeonatos juntam animais de categorias diferentes (os campeões de marcha de cada categoria), então não tem como calcular automaticamente - a lista é só o cadastro dos participantes, não calcula resultado.
      </p>

      <div className="flex gap-2 flex-wrap">
        {(Object.keys(CAMPEOES_TIPO_LABEL) as TipoCampeaoDosCampeoes[]).map(t => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tipo === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            {CAMPEOES_TIPO_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {(['MB', 'MP'] as const).map(m => (
          <button
            key={m}
            onClick={() => setTipoMarcha(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tipoMarcha === m ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            {m === 'MB' ? 'Marcha Batida' : 'Marcha Picada'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-start pt-1">
        <input
          value={numCatalogoInput}
          onChange={e => { setNumCatalogoInput(e.target.value); setErro('') }}
          onKeyDown={e => { if (e.key === 'Enter') adicionar() }}
          placeholder="Número de catálogo"
          className="flex-1 py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={adicionar}
          disabled={adicionando || !numCatalogoInput.trim()}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {adicionando ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {msg && <p className="text-sm text-green-400">{msg}</p>}

      <p className="text-xs text-[var(--text-muted)] pt-2">
        {CAMPEOES_TIPO_LABEL[tipo]} — {tipoMarcha === 'MB' ? 'Marcha Batida' : 'Marcha Picada'} ({animais.length} animal{animais.length === 1 ? '' : 'is'})
      </p>
      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
      ) : animais.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Nenhum animal ainda nesse campeonato.</p>
      ) : (
        <div className="space-y-1">
          {animais.map(a => (
            <div key={a.num_catalogo} className="flex items-center gap-2 text-sm py-2 px-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border)]">
              <span className="font-mono text-[var(--text-muted)] w-10 flex-shrink-0">{a.num_catalogo}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{a.nome}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{a.categoria}{a.haras ? ` · ${a.haras}` : ''}</p>
              </div>
              <button
                onClick={() => remover(a.num_catalogo)}
                disabled={removendo === a.num_catalogo}
                className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 flex-shrink-0"
              >
                {removendo === a.num_catalogo ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type WhatsappTopAnimal = { animal_id: number; nome: string; num_catalogo: string; categoria: string; tipo_marcha: string; cliques: number }

function WhatsappPanel({ token }: { token: string }) {
  const [numero, setNumero] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [totalCliques, setTotalCliques] = useState(0)
  const [topAnimais, setTopAnimais] = useState<WhatsappTopAnimal[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/whatsapp', { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    setNumero(data.numero || '')
    setMensagem(data.mensagem_template || '')
    setTotalCliques(data.total_cliques || 0)
    setTopAnimais(data.top_animais || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function salvar() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/whatsapp', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero, mensagem_template: mensagem }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('Salvo!')
      setTimeout(() => setMsg(''), 3000)
      load()
    } else {
      setMsg('Erro ao salvar')
    }
  }

  if (loading) return <div className="text-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>

  const inputClass = "w-full py-2 px-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Botão &quot;Compre&quot; (WhatsApp)</h3>
      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] space-y-3">
        <p className="text-xs text-[var(--text-muted)]">
          Numero que recebe a mensagem quando alguem clica em &quot;Compre&quot; na pagina de um animal. So digitos, com DDI e DDD (ex: 5511999999999). O botao some do site se o numero estiver vazio.
        </p>
        <input placeholder="5511999999999" value={numero} onChange={e => setNumero(e.target.value)} className={inputClass} />
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Mensagem pre-preenchida. Use <code className="bg-black/10 px-1 rounded">{'{animal}'}</code> onde quiser que entre o nome/catalogo do animal.
        </p>
        <textarea
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          rows={3}
          placeholder="Olá! Tenho interesse no animal {animal} da 43ª Nacional do Cavalo Mangalarga Marchador."
          className={inputClass}
        />
        {msg && <p className="text-sm text-green-400">{msg}</p>}
        <button onClick={salvar} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
        <p className="text-[10px] text-[var(--text-muted)] uppercase">Cliques em &quot;Compre&quot; (total)</p>
        <p className="text-2xl font-bold text-[var(--accent)]">{totalCliques.toLocaleString()}</p>
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--accent)] uppercase mb-3">Animais com mais cliques em &quot;Compre&quot;</h3>
        {topAnimais.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Ainda sem cliques registrados</p>
        ) : (
          <div className="space-y-2">
            {topAnimais.map((a, i) => (
              <div key={a.animal_id} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                <span className="text-xs font-bold text-[var(--accent)] w-6">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.nome}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{a.categoria} - {a.tipo_marcha === 'MB' ? 'M. Batida' : 'M. Picada'}</p>
                </div>
                <span className="text-sm font-bold text-[var(--accent)]">{a.cliques}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminsPanel({ token }: { token: string }) {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', nome: '', is_master: false, permissoes: [] as string[] })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ is_master: false, permissoes: [] as string[] })
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
    setForm({ email: '', password: '', nome: '', is_master: false, permissoes: [] })
    setMsg('Admin adicionado!')
    loadAdmins()
    setTimeout(() => setMsg(''), 3000)
  }

  function abrirEdicao(a: Admin) {
    setEditingId(a.id)
    setEditForm({ is_master: a.is_master, permissoes: a.permissoes || [] })
  }

  async function salvarPermissoes(id: number) {
    await fetch('/api/admin/admins', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    setEditingId(null)
    loadAdmins()
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
          <PermissoesCheckboxes
            isMaster={form.is_master}
            permissoes={form.permissoes}
            onChangeMaster={v => setForm({ ...form, is_master: v })}
            onTogglePermissao={aba => setForm({ ...form, permissoes: form.permissoes.includes(aba) ? form.permissoes.filter(p => p !== aba) : [...form.permissoes, aba] })}
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold">Adicionar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {admins.map(a => (
          <div key={a.id} className="bg-[var(--bg-card)] rounded-xl p-3 border border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{a.nome}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{a.email}</p>
                <p className="text-[10px] mt-1">
                  {a.is_master ? (
                    <span className="text-[var(--accent)] font-semibold">Master (acesso total)</span>
                  ) : (a.permissoes || []).length > 0 ? (
                    <span className="text-[var(--text-muted)]">{(a.permissoes || []).map(p => TAB_LABELS[p as AbaAdmin]).join(', ')}</span>
                  ) : (
                    <span className="text-red-400">Sem permissoes</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => (editingId === a.id ? setEditingId(null) : abrirEdicao(a))} className="text-xs text-[var(--accent)]">
                  {editingId === a.id ? 'Fechar' : 'Editar permissões'}
                </button>
                {admins.length > 1 && (
                  <button onClick={() => removeAdmin(a.id)} className="text-xs text-red-400">Remover</button>
                )}
              </div>
            </div>
            {editingId === a.id && (
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <PermissoesCheckboxes
                  isMaster={editForm.is_master}
                  permissoes={editForm.permissoes}
                  onChangeMaster={v => setEditForm({ ...editForm, is_master: v })}
                  onTogglePermissao={aba => setEditForm({ ...editForm, permissoes: editForm.permissoes.includes(aba) ? editForm.permissoes.filter(p => p !== aba) : [...editForm.permissoes, aba] })}
                />
                <button onClick={() => salvarPermissoes(a.id)} className="px-3 py-1.5 bg-[var(--accent)] text-white rounded-lg text-xs font-semibold">
                  Salvar permissões
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_CORES_LISTA: StatusCor[] = ['excl_marcha', 'entre_os_7', 'oitava_a_treze', 'retirado', 'marcha']

function AparenciaPanel({ token }: { token: string }) {
  const [config, setConfig] = useState<TemaCoresConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/admin/tema-cores', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { setConfig(data.config || {}); setLoading(false) })
  }, [token])

  function atualizarCampo<K extends keyof (typeof DEFAULT_CORES)[StatusCor]>(status: StatusCor, campo: K, valor: (typeof DEFAULT_CORES)[StatusCor][K]) {
    setConfig(prev => ({ ...prev, [status]: { ...corEfetiva(status, prev), [campo]: valor } }))
  }

  function restaurarPadrao(status: StatusCor) {
    setConfig(prev => {
      const copia = { ...prev }
      delete copia[status]
      return copia
    })
  }

  async function salvar() {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/tema-cores', {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    })
    setSaving(false)
    setMsg(res.ok ? 'Cores salvas - ja valem pro Ao Vivo.' : 'Erro ao salvar')
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 pt-2">
      <div>
        <h3 className="text-sm font-semibold">Cores das Tags e Cards (Ao Vivo)</h3>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Personalize a cor da tag (fonte/fundo) e do card (fundo/contorno/transparência) de cada status. A cor padrão é a que o site já usa hoje - &quot;Restaurar padrão&quot; volta pra ela a qualquer momento.
        </p>
      </div>

      {STATUS_CORES_LISTA.map(status => {
        const cor = corEfetiva(status, config)
        const temOverride = !!config[status] && Object.keys(config[status] as object).length > 0
        return (
          <div key={status} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{STATUS_LABEL[status]}</h4>
              <button onClick={() => restaurarPadrao(status)} disabled={!temOverride} className="text-[10px] text-[var(--accent)] disabled:opacity-30 disabled:cursor-default">
                Restaurar padrão
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ backgroundColor: hexParaRgba(cor.tagBg, cor.tagBgOpacity), color: cor.tagFg }}>
                {STATUS_LABEL[status]}
              </span>
              {cor.afetaCard && (
                <div
                  className="flex-1 rounded-lg border p-2 text-[10px] text-[var(--text-muted)]"
                  style={{ backgroundColor: cor.cardBg, borderColor: cor.cardBorder, opacity: cor.cardOpacity / 100 }}
                >
                  Pré-visualização do card
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              <CampoCor label="Cor da tag (fundo)" valor={cor.tagBg} onChange={v => atualizarCampo(status, 'tagBg', v)} />
              <CampoOpacidade label="Opacidade do fundo" valor={cor.tagBgOpacity} onChange={v => atualizarCampo(status, 'tagBgOpacity', v)} />
              <CampoCor label="Cor da tag (fonte)" valor={cor.tagFg} onChange={v => atualizarCampo(status, 'tagFg', v)} />
            </div>

            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
              <input
                type="checkbox"
                checked={cor.afetaCard}
                onChange={e => atualizarCampo(status, 'afetaCard', e.target.checked)}
                className="w-4 h-4 accent-[var(--accent)]"
              />
              Essa tag também formata o card (fundo, contorno e transparência)
            </label>

            {cor.afetaCard && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <CampoCor label="Fundo do card" valor={cor.cardBg} onChange={v => atualizarCampo(status, 'cardBg', v)} />
                <CampoCor label="Contorno do card" valor={cor.cardBorder} onChange={v => atualizarCampo(status, 'cardBorder', v)} />
                <CampoOpacidade label="Transparência do card" valor={cor.cardOpacity} onChange={v => atualizarCampo(status, 'cardOpacity', v)} />
              </div>
            )}
          </div>
        )
      })}

      {msg && <p className="text-xs text-[var(--accent)]">{msg}</p>}
      <button onClick={salvar} disabled={saving} className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm font-semibold disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar Cores'}
      </button>
    </div>
  )
}

function CampoCor({ label, valor, onChange }: { label: string; valor: string; onChange: (v: string) => void }) {
  return (
    <label className="text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2">
      {label}
      <input type="color" value={valor} onChange={e => onChange(e.target.value)} className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer bg-transparent flex-shrink-0" />
    </label>
  )
}

function CampoOpacidade({ label, valor, onChange }: { label: string; valor: number; onChange: (v: number) => void }) {
  return (
    <label className="text-xs text-[var(--text-secondary)] flex flex-col gap-1">
      <span className="flex items-center justify-between">{label}<span className="font-mono">{valor}%</span></span>
      <input type="range" min={0} max={100} value={valor} onChange={e => onChange(Number(e.target.value))} />
    </label>
  )
}
