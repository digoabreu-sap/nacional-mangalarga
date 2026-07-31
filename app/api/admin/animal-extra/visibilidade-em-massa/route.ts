import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'animais')
}

// Ferramenta de alteracao em massa (aba Animais): Ocultar/Exibir Todos de
// uma vez os dados adicionais "fora catalogo" (Instagram/YouTube/texto).
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { visivel } = await req.json()
  if (typeof visivel !== 'boolean') return NextResponse.json({ error: 'visivel (boolean) e obrigatorio' }, { status: 400 })

  const { data, error } = await supabase.rpc('nm_admin_set_todos_animal_extra_visivel', { p_visivel: visivel })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, afetados: data })
}
