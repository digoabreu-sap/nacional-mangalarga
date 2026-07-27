import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

export async function GET(req: NextRequest) {
  if (!temPermissao(decodeAdminToken(req), 'leads')) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const { data, error } = await supabase.rpc('nm_list_usuarios')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
