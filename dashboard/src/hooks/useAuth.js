import { useState, useCallback } from 'react'

const STORAGE_KEY = 'fpna_auth'

function encodeBasic(user, pass) {
  return 'Basic ' + btoa(`${user}:${pass}`)
}

function loadStored() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [auth, setAuth] = useState(loadStored)

  const login = useCallback(async (username, password) => {
    const header = encodeBasic(username, password)
    const res = await fetch('/dashboard_data.json', {
      headers: { Authorization: header },
    })
    if (!res.ok) throw new Error('Credenciais inválidas')
    const creds = { username, header }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds))
    setAuth(creds)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setAuth(null)
  }, [])

  return { auth, login, logout }
}
