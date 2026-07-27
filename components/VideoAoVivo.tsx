'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const HEADER_H = 26 // altura da barra de titulo, em px - some ao calcular a altura total do player
const MIN_WIDTH = 140
const MAX_WIDTH = 480
const MARGEM = 8

type Pos = { x: number; y: number }

function clampPos(pos: Pos, width: number, height: number): Pos {
  const maxX = Math.max(MARGEM, window.innerWidth - width - MARGEM)
  const maxY = Math.max(MARGEM, window.innerHeight - height - MARGEM)
  return { x: Math.min(Math.max(pos.x, MARGEM), maxX), y: Math.min(Math.max(pos.y, MARGEM), maxY) }
}

export default function VideoAoVivo() {
  const pathname = usePathname()
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [ativoAdmin, setAtivoAdmin] = useState(false)
  const [visivel, setVisivel] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const [width, setWidth] = useState(224)

  // Arrasto e redimensionamento usam refs (nao re-renderizam a cada pixel de
  // movimento) - o estado (pos/width) so e atualizado no fim do gesto.
  const arrastoRef = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

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

    const savedWidth = Number(localStorage.getItem('nm_video_width'))
    const w = savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH ? savedWidth : 224
    setWidth(w)

    const savedPos = localStorage.getItem('nm_video_pos')
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos)
        setPos(clampPos(parsed, w, w / (16 / 9) + HEADER_H))
        return
      } catch { /* posicao salva invalida, cai pro default abaixo */ }
    }
    setPos({ x: window.innerWidth - w - 12, y: window.innerHeight - (w / (16 / 9) + HEADER_H) - 84 })
  }, [])

  // Se a janela mudar de tamanho (ex: rotacionar o celular), garante que o
  // player nao fique preso fora da area visivel.
  useEffect(() => {
    function onResize() {
      setPos(p => p ? clampPos(p, width, width / (16 / 9) + HEADER_H) : p)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [width])

  const onDragMove = useCallback((e: PointerEvent) => {
    if (!arrastoRef.current) return
    setPos({ x: e.clientX - arrastoRef.current.offsetX, y: e.clientY - arrastoRef.current.offsetY })
  }, [])

  const onDragEnd = useCallback((e: PointerEvent) => {
    if (!arrastoRef.current) return
    arrastoRef.current = null
    setPos(p => {
      if (!p) return p
      const h = boxRef.current?.offsetHeight ?? width / (16 / 9) + HEADER_H
      const clamped = clampPos(p, width, h)
      localStorage.setItem('nm_video_pos', JSON.stringify(clamped))
      return clamped
    })
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
  }, [onDragMove, width])

  function iniciarArrasto(e: React.PointerEvent) {
    if (!pos) return
    arrastoRef.current = { offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y }
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', onDragEnd)
  }

  const onResizeMove = useCallback((e: PointerEvent) => {
    if (!resizeRef.current) return
    const novaLargura = Math.min(Math.max(resizeRef.current.startWidth + (e.clientX - resizeRef.current.startX), MIN_WIDTH), MAX_WIDTH)
    setWidth(novaLargura)
  }, [])

  const onResizeEnd = useCallback(() => {
    if (!resizeRef.current) return
    resizeRef.current = null
    setWidth(w => {
      localStorage.setItem('nm_video_width', String(w))
      setPos(p => (p ? clampPos(p, w, w / (16 / 9) + HEADER_H) : p))
      return w
    })
    window.removeEventListener('pointermove', onResizeMove)
    window.removeEventListener('pointerup', onResizeEnd)
  }, [onResizeMove])

  function iniciarResize(e: React.PointerEvent) {
    e.stopPropagation()
    resizeRef.current = { startX: e.clientX, startWidth: width }
    window.addEventListener('pointermove', onResizeMove)
    window.addEventListener('pointerup', onResizeEnd)
  }

  function esconder() {
    setVisivel(false)
    localStorage.setItem('nm_video_visivel', '0')
  }

  function mostrar() {
    setVisivel(true)
    localStorage.setItem('nm_video_visivel', '1')
  }

  if (pathname.startsWith('/admin')) return null
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

  if (!pos) return null

  return (
    <div
      ref={boxRef}
      className="fixed z-40 rounded-xl overflow-hidden shadow-2xl border border-[var(--border)] bg-black select-none"
      style={{ left: pos.x, top: pos.y, width }}
    >
      <div
        onPointerDown={iniciarArrasto}
        className="flex items-center justify-between px-2 py-1 bg-black/80 touch-none cursor-grab active:cursor-grabbing"
      >
        <span className="text-[10px] text-white font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> AO VIVO
        </span>
        <button onClick={esconder} title="Esconder" className="text-white/70 hover:text-white text-xs leading-none">
          ✕
        </button>
      </div>
      <div className="aspect-video">
        <iframe
          src={`${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div
        onPointerDown={iniciarResize}
        title="Redimensionar"
        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize touch-none flex items-end justify-end p-0.5"
      >
        <svg className="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 22H16V20H20V16H22V22ZM22 12H20V14H22V12ZM14 22H12V20H14V22Z" />
        </svg>
      </div>
    </div>
  )
}
