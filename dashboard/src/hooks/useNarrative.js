import { useState, useEffect } from 'react'

export function useNarrative(authHeader) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!authHeader) return
    fetch('/narrative.json', { headers: { Authorization: authHeader } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [authHeader])

  return { data, loading, error }
}
