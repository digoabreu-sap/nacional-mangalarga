import { NextRequest, NextResponse } from 'next/server'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'
import { parseResultadoPdf } from '@/lib/resultados-pdf'

function autorizado(req: NextRequest) {
  return temPermissao(decodeAdminToken(req), 'resultados')
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('pdf')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo PDF enviado' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'PDF maior que 10MB' }, { status: 400 })
  }

  let parsed
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    parsed = await parseResultadoPdf(buffer)
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler o PDF: ${(e as Error).message}` }, { status: 400 })
  }

  if (!parsed.tipo_campeonato || !parsed.tipo_marcha || !parsed.categoria) {
    return NextResponse.json({ error: 'Nao foi possivel identificar o campeonato/categoria neste PDF' }, { status: 400 })
  }
  if (parsed.linhas.length === 0) {
    return NextResponse.json({ error: 'Nao foi possivel ler nenhuma linha de resultado neste PDF' }, { status: 400 })
  }

  return NextResponse.json(parsed)
}
