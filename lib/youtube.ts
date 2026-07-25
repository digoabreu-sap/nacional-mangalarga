// Aceita um ID de video puro ou varios formatos de URL do YouTube.
export function extrairVideoId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}

// Aceita um Channel ID puro (comeca com UC) ou a URL .../channel/UC...
// Nao aceita @handle (tipo @abccmmoficial) - o YouTube nao permite resolver
// handle -> channel ID sem a Data API; o admin precisa achar o Channel ID
// (em "Sobre" do canal ou YouTube Studio > Configuracoes > Canal > Avancado).
export function extrairChannelId(input: string): string | null {
  const s = input.trim()
  if (/^UC[\w-]{22}$/.test(s)) return s
  const m = s.match(/youtube\.com\/channel\/(UC[\w-]{22})/)
  return m ? m[1] : null
}

export function montarEmbedUrl(fonteTipo: 'video' | 'canal', fonteValor: string): string | null {
  if (fonteTipo === 'video') {
    const id = extrairVideoId(fonteValor)
    return id ? `https://www.youtube.com/embed/${id}` : null
  }
  const channelId = extrairChannelId(fonteValor)
  // live_stream?channel=ID troca sozinho pro que estiver ao vivo no canal
  // no momento - se nao houver live, o player mostra "offline".
  return channelId ? `https://www.youtube.com/embed/live_stream?channel=${channelId}` : null
}
