'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { trackBannerClick } from '@/components/Analytics'

type BannerData = {
  id: number
  posicao: string
  titulo: string | null
  imagem_url: string | null
  link_url: string | null
  html_content: string | null
  ativo: boolean
  ordem: number
  tamanho_pct: number
}

export default function Banner({ posicao }: { posicao: 'topo' | 'rodape' | 'header_topo' | 'nav_rodape' }) {
  const [banners, setBanners] = useState<BannerData[]>([])
  const [espacamentoPx, setEspacamentoPx] = useState(12)

  useEffect(() => {
    supabase
      .from('nm_banners')
      .select('*')
      .eq('posicao', posicao)
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .then(({ data }) => {
        // So conta banner com conteudo de fato renderizavel - uma linha ativa
        // sem imagem/html nao deve contar para o "letreiro" entrar em modo
        // rotativo (visualmente parece um banner "tentando carregar" o vazio).
        const comConteudo = (data || []).filter(b => b.html_content || b.imagem_url)
        setBanners(comConteudo)
      })
    supabase.rpc('nm_get_banner_config').then(({ data }) => {
      const config = Array.isArray(data) ? data[0] : data
      if (config?.espacamento_px != null) setEspacamentoPx(config.espacamento_px)
    })
  }, [posicao])

  if (banners.length === 0) return null

  // Altura util do letreiro (container h-20 = 80px menos os 16px de py-2).
  const alturaBase = 64

  function renderBanner(b: BannerData) {
    const alturaBanner = alturaBase * ((b.tamanho_pct || 100) / 100)
    if (b.html_content) {
      // HTML customizado pode ter (ou nao) seu proprio link - clique em
      // qualquer ponto do banner ja conta como interacao, mesmo sem <a>.
      return (
        <div onClick={() => trackBannerClick(b.id)} dangerouslySetInnerHTML={{ __html: b.html_content }} style={{ height: alturaBanner }} className="rounded-lg overflow-hidden" />
      )
    }
    if (b.imagem_url) {
      const img = <img src={b.imagem_url} alt={b.titulo || 'Banner'} style={{ height: alturaBanner }} className="w-auto rounded-lg object-contain" />
      return b.link_url ? (
        <a href={b.link_url} target="_blank" rel="noopener noreferrer" onClick={() => trackBannerClick(b.id)} className="block" style={{ height: alturaBanner }}>{img}</a>
      ) : img
    }
    return null
  }

  // Com 1 banner so, mostra fixo. Com 2+, "letreiro" rolando na horizontal
  // (a lista e duplicada para o loop ficar sem costura).
  const scrolling = banners.length > 1
  const duracao = banners.length * 6

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-2 h-20 overflow-hidden">
      {scrolling ? (
        <div
          className="flex h-full items-center w-max animate-banner-marquee"
          style={{ animationDuration: `${duracao}s`, gap: espacamentoPx }}
        >
          {[...banners, ...banners].map((b, i) => (
            <div key={`${b.id}-${i}`} className="flex-shrink-0">{renderBanner(b)}</div>
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">{renderBanner(banners[0])}</div>
      )}
    </div>
  )
}
