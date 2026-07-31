import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'animais')
}

// GET ?q=termo -> busca animais por catalogo/nome/registro (pra achar o
// registro certo antes de editar). GET ?registro=X -> dados adicionais ja
// cadastrados (ou null) + os dados basicos do animal pra exibir na tela.
// GET ?resumo=1 -> contagem total/visiveis, pra ferramenta de alteracao em massa.
export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  if (req.nextUrl.searchParams.get('resumo')) {
    const { data } = await supabase.rpc('nm_admin_list_animal_extra')
    const lista: { visivel: boolean }[] = data || []
    return NextResponse.json({ total: lista.length, visiveis: lista.filter(l => l.visivel).length })
  }

  const q = req.nextUrl.searchParams.get('q')
  if (q) {
    const termo = q.trim()
    if (termo.length < 2) return NextResponse.json({ animais: [] })
    const { data } = await supabase
      .from('nm_animais')
      .select('id, num_catalogo, nome, registro, categoria')
      .or(`nome.ilike.%${termo}%,num_catalogo.eq.${termo},registro.ilike.%${termo}%`)
      .order('nome')
      .limit(20)
    return NextResponse.json({ animais: data || [] })
  }

  const registro = req.nextUrl.searchParams.get('registro')
  if (!registro) return NextResponse.json({ error: 'q ou registro sao obrigatorios' }, { status: 400 })

  // Usa a versao ADMIN (nao filtra por visivel) - precisa ver/editar mesmo
  // o que estiver oculto da pagina publica.
  const [{ data: extra }, { data: animais }] = await Promise.all([
    supabase.rpc('nm_admin_get_animal_extra', { p_registro: registro }),
    supabase.from('nm_animais').select('num_catalogo, nome, categoria').eq('registro', registro).order('num_catalogo').limit(1),
  ])
  return NextResponse.json({ extra: extra || null, animal: animais?.[0] || null })
}

export async function PUT(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const body = await req.json()
  const registro = (body.registro || '').trim()
  if (!registro) return NextResponse.json({ error: 'registro e obrigatorio' }, { status: 400 })

  const { data, error } = await supabase.rpc('nm_admin_set_animal_extra', {
    p_registro: registro,
    p_instagram_url: body.instagram_url || null,
    p_youtube_url: body.youtube_url || null,
    p_texto: body.texto || null,
    p_visivel: body.visivel ?? true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ extra: data })
}
