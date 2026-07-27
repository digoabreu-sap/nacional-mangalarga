'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    const consent = localStorage.getItem('nm_cookie_consent')
    if (consent !== 'accepted') return

    let sid = localStorage.getItem('nm_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      localStorage.setItem('nm_session_id', sid)
    }

    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: pathname, session_id: sid }),
    })
  }, [pathname])

  return null
}

export function trackAnimalClick(animalId: number) {
  const consent = localStorage.getItem('nm_cookie_consent')
  if (consent !== 'accepted') return

  const sid = localStorage.getItem('nm_session_id') || ''
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animal_id: animalId, session_id: sid }),
  })
}

export function trackBannerClick(bannerId: number) {
  const consent = localStorage.getItem('nm_cookie_consent')
  if (consent !== 'accepted') return

  const sid = localStorage.getItem('nm_session_id') || ''
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ banner_id: bannerId, session_id: sid }),
  })
}

export function trackWhatsappClick(animalId: number) {
  const consent = localStorage.getItem('nm_cookie_consent')
  if (consent !== 'accepted') return

  const sid = localStorage.getItem('nm_session_id') || ''
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsapp_animal_id: animalId, session_id: sid }),
  })
}
