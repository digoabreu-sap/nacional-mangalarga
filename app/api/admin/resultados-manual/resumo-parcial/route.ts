import { NextRequest, NextResponse } from 'next/server'
import { decodeAdminToken, temPermissao } from '@/lib/adminAuth'
import { parseResumoParcialPdf } from '@/lib/resumoParcialPdf'

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

  let entradas
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    entradas = await parseResumoParcialPdf(buffer)
  } catch (e) {
    return NextResponse.json({ error: `Falha ao ler o PDF: ${(e as Error).message}` }, { status: 400 })
  }

  if (entradas.length === 0) {
    return NextResponse.json({ error: 'Nao foi possivel ler nenhum resultado (Mapa de Premiação) neste PDF' }, { status: 400 })
  }

  return NextResponse.json({ entradas })
}
