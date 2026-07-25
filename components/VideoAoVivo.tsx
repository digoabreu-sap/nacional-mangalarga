'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Posicao = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
const POSICOES: Posicao[] = ['bottom-right', 'bottom-left', 'top-left', 'top-right']
const POSICAO_CLASSES: Record<Posicao, string> = {
  'bottom-right': 'bottom-20 right-3',
  'bottom-left': 'bottom-20 left-3',
  'top-right': 'top-20 right-3',
  'top-left': 'top-20 left-3',
}

export default function VideoAoVivo() {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [ativoAdmin, setAtivoAdmin] = useState(false)
  const [visivel, setVisivel] = useState(true)
  const [posicao, setPosicao] = useState<Posicao>('bottom-right')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.rpc('nm_get_video_live').then(({ data }) => {
      const atual = Array.isArray(data) ? data[0] : data
      if (atual?.ativo && atual?.embed_url) {
        setAtivoAdmin(true)
        setEmbedUrl(atual.embed_url)
      }
      setLoaded(true)
    })

    const v = localStorage.getItem('nm_video_visivel')
    if (v !== null) setVisivel(v === '1')
    const p = localStorage.getItem('nm_video_posicao') as Posicao | null
    if (p && POSICOES.includes(p)) setPosicao(p)
  }, [])

  function trocarPosicao() {
    const idx = POSICOES.indexOf(posicao)
    const proxima = POSICOES[(idx + 1) % POSICOES.length]
    setPosicao(proxima)
    localStorage.setItem('nm_video_posicao', proxima)
  }

  function esconder() {
    setVisivel(false)
    localStorage.setItem('nm_video_visivel', '0')
  }

  function mostrar() {
    setVisivel(true)
    localStorage.setItem('nm_video_visivel', '1')
  }

  if (!loaded || !ativoAdmin || !embedUrl) return null

  if (!visivel) {
    return (
      <button
        onClick={mostrar}
        className="fixed bottom-20 right-3 z-40 flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-full shadow-lg active:scale-95 transition-transform"
      >
        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        Ao Vivo
      </button>
    )
  }

  return (
    <div className={`fixed z-40 w-52 sm:w-64 rounded-xl overflow-hidden shadow-2xl border border-[var(--border)] bg-black ${POSICAO_CLASSES[posicao]}`}>
      <div className="flex items-center justify-between px-2 py-1 bg-black/80">
        <span className="text-[10px] text-white font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> AO VIVO
        </span>
        <div className="flex items-center gap-2">
          <button onClick={trocarPosicao} title="Mudar posicao" className="text-white/70 hover:text-white text-xs leading-none">
            ⤡
          </button>
          <button onClick={esconder} title="Esconder" className="text-white/70 hover:text-white text-xs leading-none">
            ✕
          </button>
        </div>
      </div>
      <div className="aspect-video">
        <iframe
          src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
