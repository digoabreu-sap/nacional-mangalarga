'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'
import { Usuario, supabase } from './supabase'

const DEVICE_ID_KEY = 'nm_device_id'

// Identidade estavel do aparelho (equivalente a um cookie), gerada uma vez e
// guardada no localStorage - base pro cadastro "anonimo" que deixa votar sem
// preencher formulario.
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

type AuthContextType = {
  user: Usuario | null
  loginDirect: (user: Usuario) => void
  logout: () => void
  loading: boolean
  ensureUser: () => Promise<Usuario | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginDirect: () => {},
  logout: () => {},
  loading: true,
  ensureUser: async () => null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const userRef = useRef<Usuario | null>(null)
  const criandoAnonimo = useRef<Promise<Usuario | null> | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('nm_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    setLoading(false)
  }, [])

  useEffect(() => { userRef.current = user }, [user])

  function loginDirect(u: Usuario) {
    setUser(u)
    localStorage.setItem('nm_user', JSON.stringify(u))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('nm_user')
  }

  // Devolve o usuario atual, criando um cadastro "anonimo" (so device_id, sem
  // nome/telefone/email) na hora se ainda nao existir - usado pra votar sem
  // passar pela tela de login. Ninguem chama isso 2x em paralelo (a promise
  // em andamento e reaproveitada).
  async function ensureUser(): Promise<Usuario | null> {
    if (userRef.current) return userRef.current
    if (criandoAnonimo.current) return criandoAnonimo.current

    const promise = (async () => {
      try {
        const deviceId = getDeviceId()
        const { data, error } = await supabase.rpc('nm_usuario_anonimo', { p_device_id: deviceId })
        if (error || !data?.user) return null
        loginDirect(data.user)
        return data.user as Usuario
      } finally {
        criandoAnonimo.current = null
      }
    })()
    criandoAnonimo.current = promise
    return promise
  }

  return (
    <AuthContext.Provider value={{ user, loginDirect, logout, loading, ensureUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
