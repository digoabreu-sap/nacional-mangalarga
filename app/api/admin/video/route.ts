import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { montarEmbedUrl } from '@/lib/youtube'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'video')
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data } = await supabase.rpc('nm_get_video_live')
  const status = Array.isArray(data) ? data[0] : data
  return NextResponse.json(status || null)
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { ativo, fonte_tipo, fonte_valor } = await req.json()

  if (ativo && (fonte_tipo !== 'video' && fonte_tipo !== 'canal')) {
    return NextResponse.json({ error: 'Tipo de fonte invalido' }, { status: 400 })
  }

  const embedUrl = fonte_tipo && fonte_valor ? montarEmbedUrl(fonte_tipo, fonte_valor) : null
  if (ativo && !embedUrl) {
    return NextResponse.json({ error: fonte_tipo === 'canal' ? 'Channel ID invalido (precisa comecar com UC...)' : 'Link ou ID de video invalido' }, { status: 400 })
  }

  const { error } = await supabase.rpc('nm_admin_set_video_live', {
    p_ativo: ativo,
    p_embed_url: embedUrl,
    p_fonte_tipo: fonte_tipo || null,
    p_fonte_valor: fonte_valor || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, embed_url: embedUrl })
}
