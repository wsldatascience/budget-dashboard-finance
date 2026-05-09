import { useState, useMemo, useEffect } from 'react'
import { fmtBRL, fmtPct } from '../utils/fmt'

const COLS = [
  { key: 'cod_conta',   label: 'Código',     num: false },
  { key: 'nome_conta',  label: 'Conta',      num: false },
  { key: 'grupo',       label: 'Grupo',      num: false },
  { key: 'orc_q1',     label: 'Orçado Q1',   num: true  },
  { key: 'rea_q1',     label: 'Realizado Q1', num: true  },
  { key: 'var_rs',     label: 'Variação R$', num: true  },
  { key: 'var_pct',    label: 'Variação %',  num: true  },
]

const MONTH_COLS = [
  { key: 'orc_jan', label: 'Orc. Jan', num: true },
  { key: 'rea_jan', label: 'Rea. Jan', num: true },
  { key: 'orc_fev', label: 'Orc. Fev', num: true },
  { key: 'rea_fev', label: 'Rea. Fev', num: true },
  { key: 'orc_mar', label: 'Orc. Mar', num: true },
  { key: 'rea_mar', label: 'Rea. Mar', num: true },
]

const PAGE_SIZE_OPTIONS = [25, 50, 100]

export default function ContaTable({ data, onExport }) {
  const [search, setSearch]       = useState('')
  const [grupo,  setGrupo]        = useState('Todos')
  const [sortKey, setSortKey]     = useState('var_rs')
  const [sortDir, setSortDir]     = useState('asc')
  const [showMonths, setShowMonths] = useState(false)
  const [pageSize, setPageSize]   = useState(25)
  const [page, setPage]           = useState(1)

  const uniqueGroups = useMemo(() => ['Todos', ...new Set(data.map(d => d.grupo))], [data])

  const filtered = useMemo(() => {
    let rows = data
    if (grupo !== 'Todos') rows = rows.filter(r => r.grupo === grupo)
    if (search) {
      const q = search.toLowerCase()
      rows = rows.filter(r =>
        r.nome_conta.toLowerCase().includes(q) ||
        r.cod_conta.toString().includes(q)
      )
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [data, grupo, search, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageStart  = (safePage - 1) * pageSize
  const pageRows   = filtered.slice(pageStart, pageStart + pageSize)

  // Reset to page 1 when filters/sort change result set
  useEffect(() => { setPage(1) }, [search, grupo, sortKey, sortDir, pageSize])

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const SortIcon = ({ k }) => {
    if (sortKey !== k) return <span style={{ opacity: .3, marginLeft: 4 }}>↕</span>
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const cols = showMonths ? [...COLS, ...MONTH_COLS] : COLS

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <h2>Detalhamento por Conta ({filtered.length} contas)</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onExport && (
            <button onClick={onExport}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '5px 12px', fontSize: '.78rem', cursor: 'pointer' }}>
              ↓ CSV
            </button>
          )}
          <button
            onClick={() => setShowMonths(v => !v)}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '5px 12px', fontSize: '.78rem', cursor: 'pointer' }}
          >
            {showMonths ? 'Ocultar meses' : 'Ver meses'}
          </button>
        </div>
      </div>

      <div className="filter-bar" style={{ marginBottom: 14 }}>
        <input
          placeholder="Buscar conta ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        <select value={grupo} onChange={e => setGrupo(e.target.value)}>
          {uniqueGroups.map(g => <option key={g}>{g}</option>)}
        </select>
        <span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>
          Total: <strong style={{ color: 'var(--text)' }}>{fmtBRL(filtered.reduce((s, r) => s + (r.rea_q1 || 0), 0))}</strong> realizado
        </span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)} style={c.num ? { textAlign: 'right' } : {}}>
                  {c.label}<SortIcon k={c.key} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(r => (
              <tr key={r.cod_conta}>
                <td className="td-code">{r.cod_conta}</td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.nome_conta}>{r.nome_conta}</td>
                <td><span className="pill pill-blue">{r.grupo}</span></td>
                <td className="td-num">{fmtBRL(r.orc_q1)}</td>
                <td className="td-num">{fmtBRL(r.rea_q1)}</td>
                <td className="td-num" style={{ color: r.var_rs <= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmtBRL(r.var_rs)}
                </td>
                <td className="td-num">
                  <span className={r.var_pct == null ? 'pill pill-blue' : r.var_pct > 0 ? 'pill pill-red' : 'pill pill-green'}>
                    {fmtPct(r.var_pct)}
                  </span>
                </td>
                {showMonths && <>
                  <td className="td-num">{fmtBRL(r.orc_jan)}</td>
                  <td className="td-num">{fmtBRL(r.rea_jan)}</td>
                  <td className="td-num">{fmtBRL(r.orc_fev)}</td>
                  <td className="td-num">{fmtBRL(r.rea_fev)}</td>
                  <td className="td-num">{fmtBRL(r.orc_mar)}</td>
                  <td className="td-num">{fmtBRL(r.rea_mar)}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10, fontSize: '.78rem', color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>
            Mostrando <strong style={{ color: 'var(--text)' }}>{filtered.length === 0 ? 0 : pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)}</strong> de <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong>
          </span>
          <span style={{ color: 'var(--border)' }}>·</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            por página
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              style={{ padding: '3px 6px', fontSize: '.78rem' }}
            >
              {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 9px', fontSize: '.78rem', cursor: safePage === 1 ? 'default' : 'pointer', opacity: safePage === 1 ? .4 : 1 }}
          >«</button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 9px', fontSize: '.78rem', cursor: safePage === 1 ? 'default' : 'pointer', opacity: safePage === 1 ? .4 : 1 }}
          >‹</button>
          <span style={{ padding: '0 6px' }}>
            Página <strong style={{ color: 'var(--text)' }}>{safePage}</strong> de <strong style={{ color: 'var(--text)' }}>{totalPages}</strong>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 9px', fontSize: '.78rem', cursor: safePage === totalPages ? 'default' : 'pointer', opacity: safePage === totalPages ? .4 : 1 }}
          >›</button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 9px', fontSize: '.78rem', cursor: safePage === totalPages ? 'default' : 'pointer', opacity: safePage === totalPages ? .4 : 1 }}
          >»</button>
        </div>
      </div>
    </div>
  )
}
