import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const { data, error } = await supabase
    .rpc('nm_admin_login', { p_email: email, p_password: password })

  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: 'Credenciais invalidas' }, { status: 401 })
  }

  const admin = data[0]
  const token = Buffer.from(JSON.stringify({
    id: admin.id, email: admin.email, nome: admin.nome,
    is_master: admin.is_master, permissoes: admin.permissoes || [],
    exp: Date.now() + 86400000,
  })).toString('base64')

  return NextResponse.json({
    token,
    admin: { id: admin.id, email: admin.email, nome: admin.nome, is_master: admin.is_master, permissoes: admin.permissoes || [] },
  })
}
