import { NextRequest } from 'next/server'

// Abas que podem ser concedidas individualmente a um admin restrito. A aba
// "admins" (gerenciar outros admins/permissoes) fica de fora de proposito -
// e sempre exclusiva de quem e is_master, pra evitar que um admin restrito
// se autopromova.
export const ABAS_PERMISSAO = ['analytics', 'leads', 'categoria', 'video', 'resultados', 'campeoes', 'banners', 'sobre', 'whatsapp', 'aparencia'] as const
export type AbaPermissao = typeof ABAS_PERMISSAO[number]

export type AdminTokenPayload = {
  id: number
  email: string
  nome: string
  is_master: boolean
  permissoes: AbaPermissao[]
  exp: number
}

// O token e so um payload base64 (sem assinatura) - resolve o "quem esta
// logado" mas nao e resistente a forjar. Mantido assim pra bater com o
// resto do login/admin (nm_admin_login etc), que ja segue esse padrao.
export function decodeAdminToken(req: NextRequest): AdminTokenPayload | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString())
    if (!payload.exp || payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export function temPermissao(payload: AdminTokenPayload | null, aba: AbaPermissao): boolean {
  if (!payload) return false
  return !!payload.is_master || (payload.permissoes || []).includes(aba)
}
