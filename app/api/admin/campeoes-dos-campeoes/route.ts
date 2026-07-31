import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'campeoes')
}

const TIPOS_VALIDOS = ['castrado', 'macho', 'femea']
const MARCHAS_VALIDAS = ['MB', 'MP']

function validarTipoMarcha(tipo: unknown, tipoMarcha: unknown) {
  return typeof tipo === 'string' && TIPOS_VALIDOS.includes(tipo) &&
    typeof tipoMarcha === 'string' && MARCHAS_VALIDAS.includes(tipoMarcha)
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const tipo = req.nextUrl.searchParams.get('tipo')
  const tipoMarcha = req.nextUrl.searchParams.get('tipo_marcha')
  if (!validarTipoMarcha(tipo, tipoMarcha)) {
    return NextResponse.json({ error: 'tipo (castrado/macho/femea) e tipo_marcha (MB/MP) sao obrigatorios' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('nm_campeoes_dos_campeoes_listar', {
    p_tipo: tipo, p_tipo_marcha: tipoMarcha,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ animais: data || [] })
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { tipo, tipo_marcha, num_catalogo } = await req.json()
  if (!validarTipoMarcha(tipo, tipo_marcha) || !num_catalogo) {
    return NextResponse.json({ error: 'tipo, tipo_marcha e num_catalogo sao obrigatorios' }, { status: 400 })
  }

  const { error } = await supabase.rpc('nm_admin_add_campeao_dos_campeoes', {
    p_tipo: tipo, p_tipo_marcha: tipo_marcha, p_num_catalogo: String(num_catalogo).trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { tipo, tipo_marcha, num_catalogo } = await req.json()
  if (!validarTipoMarcha(tipo, tipo_marcha) || !num_catalogo) {
    return NextResponse.json({ error: 'tipo, tipo_marcha e num_catalogo sao obrigatorios' }, { status: 400 })
  }

  const { error } = await supabase.rpc('nm_admin_remove_campeao_dos_campeoes', {
    p_tipo: tipo, p_tipo_marcha: tipo_marcha, p_num_catalogo: String(num_catalogo).trim(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
