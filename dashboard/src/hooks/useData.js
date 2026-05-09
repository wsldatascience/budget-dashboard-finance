import { useState, useEffect, useCallback } from 'react'

function httpError(status) {
  if (status === 401 || status === 403) return `Sessão expirada ou sem permissão (${status}). Faça login novamente.`
  if (status >= 500)                    return `Servidor com falha (${status}). Verifique se o servidor está rodando.`
  return `Erro ao carregar dados (HTTP ${status}).`
}

export function useData(authHeader) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const load = useCallback(() => {
    if (!authHeader) return
    setLoading(true)
    setError(null)
    fetch('/dashboard_data.json', { headers: { Authorization: authHeader } })
      .then(r => { if (!r.ok) throw new Error(httpError(r.status)); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [authHeader])

  useEffect(() => { load() }, [load])

  return { data, loading, error, retry: load }
}
