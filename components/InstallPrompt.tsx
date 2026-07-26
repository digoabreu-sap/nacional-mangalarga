'use client'

import { useState, useEffect, useRef } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false)
  const [iosMode, setIosMode] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (localStorage.getItem('nm_install_prompt_seen')) return
    if (isStandalone()) return
    if (!/android|iphone|ipad|ipod/i.test(navigator.userAgent)) return

    // Evita empilhar com o aviso de cookies, que aparece na mesma posicao.
    function revelar(ios: boolean) {
      function tentar() {
        if (localStorage.getItem('nm_cookie_consent')) {
          setIosMode(ios)
          setShow(true)
          return
        }
        setTimeout(tentar, 500)
      }
      tentar()
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      revelar(false)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    let timer: ReturnType<typeof setTimeout> | undefined
    if (isIOS()) {
      timer = setTimeout(() => revelar(true), 2000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      if (timer) clearTimeout(timer)
    }
  }, [])

  function dismiss() {
    localStorage.setItem('nm_install_prompt_seen', '1')
    setShow(false)
  }

  async function install() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    await deferredPrompt.current.userChoice
    dismiss()
  }

  if (!show) return null

  return (
    <div className="fixed bottom-16 left-4 right-4 z-[95] max-w-lg mx-auto bg-[var(--bg-card)] border border-[var(--accent)]/40 rounded-xl p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instale o app Nacional MM</p>
          {iosMode ? (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Toque em <strong>Compartilhar</strong> e depois em <strong>&quot;Adicionar à Tela de Início&quot;</strong> para acessar direto do seu celular.
            </p>
          ) : (
            <p className="text-xs text-[var(--text-muted)] mt-1">Adicione um atalho na tela inicial do seu celular para acessar rapidinho.</p>
          )}
        </div>
        <button onClick={dismiss} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0" aria-label="Fechar">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        {iosMode ? (
          <button onClick={dismiss} className="flex-1 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">Entendi</button>
        ) : (
          <>
            <button onClick={install} className="flex-1 py-2 bg-[var(--accent)] text-white font-semibold rounded-lg text-sm">Instalar</button>
            <button onClick={dismiss} className="flex-1 py-2 bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] rounded-lg text-sm">Agora não</button>
          </>
        )}
      </div>
    </div>
  )
}
