import { useMemo, useState } from 'react'
import { fmtBRL, fmtBRLAcct, fmtPct, fmtPct1, fmtPctAbs, fmtPP, fmtShort, fmtShortAcct } from '../utils/fmt'
import { abatimentosSubProvisionados } from '../utils/kpis'

// Compute realized and variance for every section row by summing
// all account children within the section's scope
function enrichSections(rows) {
  const result = rows.map(r => ({ ...r }))

  for (let i = 0; i < result.length; i++) {
    if (result[i].row_type !== 'section') continue

    const sLevel = result[i].level
    let orcSum = 0, reaSum = 0, found = false

    for (let j = i + 1; j < result.length; j++) {
      const next = result[j]
      if (next.row_type === 'section' && next.level <= sLevel) break
      if (next.row_type === 'account') {
        orcSum += next.orc_q1 || 0
        reaSum += next.rea_q1 || 0
        found = true
      }
    }

    if (found) {
      const vRs  = reaSum - orcSum
      const vPct = orcSum !== 0 ? (vRs / Math.abs(orcSum)) * 100 : null
      result[i].orc_q1_comp  = orcSum
      result[i].rea_q1_comp  = reaSum
      result[i].var_rs_comp  = vRs
      result[i].var_pct_comp = vPct
    }
  }

  return result
}

// Coloring rules:
// - Pro-revenue lines (Receita, Lucro Bruto, EBITDA, Lucro Operacional, Lucro Líquido):
//     positive variance = beat budget = GREEN
// - Anti-revenue lines (Abatimentos, Custos, Despesas, D&A, Resultado Financeiro,
//     IR/CSLL, Participação): positive variance = overshoot = RED
// Section names are matched explicitly so we never let "Lucro" be miscategorized
// as expense (which silently flips EBITDA's color).
const PRO_REVENUE_SECTIONS = new Set([
  'Receita Bruta',
  'Receita Líquida',
  'Lucro Bruto',
  'EBITDA',
  'Lucro Operacional',
  'Lucro Líquido',
])

function varColorAccount(varRs, isReceita) {
  if (varRs == null) return undefined
  if (isReceita) return varRs >= 0 ? 'var(--green)' : 'var(--red)'
  return varRs <= 0 ? 'var(--green)' : 'var(--red)'
}

function varColorSection(varRs, sectionName) {
  if (varRs == null) return undefined
  const proRevenue = PRO_REVENUE_SECTIONS.has(sectionName)
  if (proRevenue) return varRs >= 0 ? 'var(--green)' : 'var(--red)'
  return varRs <= 0 ? 'var(--green)' : 'var(--red)'
}

// Build caveat lookup from EBITDA Pro-forma adjustments + low-realized abatimentos.
// Returns Map: 'acct:<cod>' or 'sec:<name>' -> tooltip message
function buildCaveats(data) {
  const caveats = new Map()
  if (!data) return caveats

  const pf = data?.margens?.ebitda_proforma
  for (const a of pf?.ajustes ?? []) {
    if (a.cod_conta) {
      caveats.set(`acct:${a.cod_conta}`, 'Provisão pendente — ver EBITDA Pro-forma')
    }
  }

  const abatSub = abatimentosSubProvisionados(data?.margens)
  if (abatSub) {
    const msg = `Sem PIS/COFINS/ISS lançados (gap ${fmtShort(abatSub.gap)})`
    caveats.set('sec:Receita Líquida', `${msg} — Receita Líquida ≈ Bruta`)
    caveats.set('sec:Abatimentos',     msg)
  }
  return caveats
}

function CaveatIcon({ message, dark }) {
  if (!message) return null
  const bg = dark ? 'rgba(255,255,255,.15)' : '#fffbeb'
  const fg = dark ? '#fef3c7' : '#b45309'
  const bd = dark ? 'rgba(254,243,199,.4)' : '#fde68a'
  return (
    <span
      title={message}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 15, height: 15, borderRadius: '50%',
        background: bg, color: fg, border: `1px solid ${bd}`,
        fontSize: '.62rem', fontWeight: 800, cursor: 'help',
        marginLeft: 6, lineHeight: 1, flexShrink: 0,
      }}
    >!</span>
  )
}

// ── Level style configs ───────────────────────────────────────────────────────
const LEVEL_STYLE = {
  0: {
    background: 'var(--navy)',
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '.8rem',
  },
  1: {
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: '.78rem',
    borderTop: '2px solid var(--border)',
  },
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ opacity: .25, marginLeft: 3 }}>↕</span>
  return <span style={{ marginLeft: 3 }}>{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function DreTable({ rows: rawRows, data }) {
  const rows      = useMemo(() => enrichSections(rawRows), [rawRows])
  const caveats   = useMemo(() => buildCaveats(data), [data])
  const [compact, setCompact]     = useState(false)
  const [showMonths, setShowMonths] = useState(false)
  const [detalhar, setDetalhar]     = useState(false)  // false = R$ 2,0 mi (default executivo); true = R$ 1.998.066,27
  const [collapsed, setCollapsed]   = useState(new Set())
  const [search, setSearch]         = useState('')

  // Helpers de formatação parametrizados pelo modo "Detalhar"
  const fmtMoney  = detalhar ? fmtBRLAcct : fmtShortAcct  // tabela / accounts: usa convenção contábil (parens)

  // Subtítulo informativo: substitui "X linhas" por números reais
  // Frase desambiguada: "abaixo/acima do orçado" remove a dúvida que um sinal
  // descontextualizado (-2,92%) deixa para o leitor.
  const subtitle = useMemo(() => {
    const m = data?.margens
    if (!m) return null
    const desp = data?.summary
    const parts = [
      `Receita Bruta ${fmtShort(m.receita_bruta.realizado)}`,
      `EBITDA ${fmtShort(m.ebitda.realizado)} (margem ${fmtPct1(m.margem_ebitda_pct.realizado)})`,
    ]
    if (desp?.variacao_pct != null && desp.variacao_pct !== 0) {
      const direction = desp.variacao_pct < 0 ? 'abaixo' : 'acima'
      parts.push(`Despesas ${fmtPctAbs(desp.variacao_pct)} ${direction} do orçado`)
    }
    return parts.join(' · ')
  }, [data])

  function toggleSection(idx) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  // Determine which rows are visible
  const visible = useMemo(() => {
    const vis = new Array(rows.length).fill(true)
    const sq = search.toLowerCase()

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Search filter (only for accounts)
      if (sq && row.row_type === 'account') {
        const hit = row.nome.toLowerCase().includes(sq) ||
          (row.cod_conta || '').includes(sq)
        if (!hit) { vis[i] = false; continue }
      }

      // Compact mode: hide individual accounts
      if (compact && row.row_type === 'account') { vis[i] = false; continue }

      // Collapsed sections
      for (const cidx of collapsed) {
        const cLevel = rows[cidx].level
        if (i > cidx) {
          // check if i is within scope of collapsed section cidx
          let inScope = true
          for (let k = cidx + 1; k < i; k++) {
            if (rows[k].row_type === 'section' && rows[k].level <= cLevel) {
              inScope = false; break
            }
          }
          if (inScope && (rows[i].row_type === 'account' || (rows[i].row_type === 'section' && rows[i].level > cLevel))) {
            vis[i] = false; break
          }
        }
      }
    }
    return vis
  }, [rows, compact, collapsed, search])

  const visCount = visible.filter(Boolean).length

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 2 }}>DRE — Orçado vs Realizado</h2>
          <p style={{ fontSize: '.74rem', color: 'var(--muted)' }}>
            {subtitle ?? `Q1 2025 · ${visCount} linhas`}
          </p>
        </div>

        <input
          placeholder="Buscar conta ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 7, padding: '6px 10px', fontSize: '.8rem', outline: 'none', width: 210 }}
        />

        <button
          onClick={() => setCompact(v => !v)}
          style={{ background: compact ? 'var(--navy)' : 'var(--surface)', color: compact ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 500 }}
          title="Esconder linhas de detalhe (manter apenas seções)"
        >
          {compact ? 'Completo' : 'Compacto'}
        </button>

        <button
          onClick={() => setDetalhar(v => !v)}
          style={{ background: detalhar ? 'var(--navy)' : 'var(--surface)', color: detalhar ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 500 }}
          title="Mostrar valores com centavos (R$ 1.998.066,27) em vez de abreviado (R$ 2,0 mi)"
        >
          {detalhar ? 'Resumir' : 'Detalhar'}
        </button>

        <button
          onClick={() => setShowMonths(v => !v)}
          style={{ background: showMonths ? 'var(--navy)' : 'var(--surface)', color: showMonths ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 500 }}
        >
          {showMonths ? 'Ocultar meses' : 'Ver meses'}
        </button>

        <button
          onClick={() => setCollapsed(new Set())}
          style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 12px', fontSize: '.78rem', cursor: 'pointer' }}
        >
          Expandir tudo
        </button>
      </div>

      {/* Table — sticky thead para manter labels visíveis no scroll */}
      <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 2, boxShadow: '0 1px 0 var(--border)' }}>
            <tr>
              <th style={{ padding: '9px 16px', textAlign: 'left', background: 'var(--surface2)', color: 'var(--muted)', fontSize: '.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: 280 }}>
                Conta / Descrição
              </th>
              {showMonths && <>
                <th style={thNum}>Orç. Jan</th>
                <th style={thNum}>Orç. Fev</th>
                <th style={thNum}>Orç. Mar</th>
              </>}
              <th style={thNum}>Orçado Q1</th>
              <th style={thNum}>Realizado Q1</th>
              <th style={thNum}>Var. R$</th>
              <th style={thNum}>Var. %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              if (!visible[idx]) return null

              // Indicador rows (percent-valued KPIs at the bottom of the DRE)
              if (row.row_type === 'indicator') {
                const orcPct = row.orc_q1
                const reaPct = row.rea_q1
                const dPP    = row.var_rs   // delta in percentage points
                const vColor = dPP == null ? undefined : dPP >= 0 ? 'var(--green)' : 'var(--red)'

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600, fontSize: '.78rem' }}>
                      <span style={{ color: 'var(--muted2)', fontSize: '.66rem', marginRight: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                        Indicador
                      </span>
                      {row.nome}
                    </td>
                    {showMonths && <>
                      <td style={tdNum()}>{fmtPct1(row.orc_jan)}</td>
                      <td style={tdNum()}>{fmtPct1(row.orc_fev)}</td>
                      <td style={tdNum()}>{fmtPct1(row.orc_mar)}</td>
                    </>}
                    <td style={tdNum()}>{fmtPct1(orcPct)}</td>
                    <td style={tdNum()}>{fmtPct1(reaPct)}</td>
                    <td style={{ ...tdNum(), color: vColor, fontWeight: 600 }}>{fmtPP(dPP)}</td>
                    <td style={{ ...tdNum(), color: vColor }}>{row.var_pct != null ? fmtPct(row.var_pct) : '—'}</td>
                  </tr>
                )
              }

              if (row.row_type === 'section') {
                const style = LEVEL_STYLE[row.level] ?? {}
                const isCollapsed = collapsed.has(idx)
                const hasChildren = rows.slice(idx + 1).some(
                  (r, j) => {
                    const abs = idx + 1 + j
                    // stop at same-or-higher level section
                    for (let k = idx + 1; k < abs; k++) {
                      if (rows[k].row_type === 'section' && rows[k].level <= row.level) return false
                    }
                    return r.row_type === 'account' || (r.row_type === 'section' && r.level > row.level)
                  }
                )

                // Prefer backend-computed values (derived sections like
                // Receita Líquida, EBITDA, Lucro Líquido have no leaf children
                // and their values come from the pipeline's _fix_rea pass).
                // Fall back to JS-computed sums for sections with leaf children.
                const orc  = row.orc_q1 ?? row.orc_q1_comp
                const rea  = row.rea_q1 ?? row.rea_q1_comp
                const vRs  = row.var_rs ?? row.var_rs_comp
                const vPct = row.var_pct ?? row.var_pct_comp
                const sectionCaveat = caveats.get(`sec:${row.nome}`)
                // Cor neutra quando caveat ativo (variação não representa boa nem má notícia)
                const vColor = sectionCaveat
                  ? 'var(--muted)'
                  : (vRs != null ? varColorSection(vRs, row.nome) : undefined)

                return (
                  <tr
                    key={idx}
                    onClick={() => hasChildren && toggleSection(idx)}
                    style={{
                      ...style,
                      cursor: hasChildren ? 'pointer' : 'default',
                      borderBottom: row.level === 0 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    <td style={{ padding: `${row.level === 0 ? 10 : 7}px 16px`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasChildren && (
                        <span style={{ fontSize: '.7rem', opacity: .7, width: 14 }}>
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                      )}
                      <span style={{ paddingLeft: row.level === 1 ? 12 : 0 }}>
                        {row.nome}
                      </span>
                      <CaveatIcon message={sectionCaveat} dark={row.level === 0} />
                    </td>
                    {showMonths && <>
                      <td style={tdNum(style.color)}>{fmtMoney(row.orc_jan)}</td>
                      <td style={tdNum(style.color)}>{fmtMoney(row.orc_fev)}</td>
                      <td style={tdNum(style.color)}>{fmtMoney(row.orc_mar)}</td>
                    </>}
                    <td style={tdNum(style.color)}>{fmtMoney(orc)}</td>
                    <td style={tdNum(style.color)}>{fmtMoney(rea)}</td>
                    <td style={{ ...tdNum(), color: vColor ?? (row.level === 0 ? '#fff' : 'var(--muted)'), fontWeight: vRs != null ? 600 : 400 }}>
                      {fmtMoney(vRs)}
                    </td>
                    <td style={{ ...tdNum(), color: vColor ?? (row.level === 0 ? '#fff' : 'var(--muted)') }}>
                      {sectionCaveat ? '—' : (vPct != null ? fmtPct(vPct) : '—')}
                    </td>
                  </tr>
                )
              }

              // Account row (level 2)
              const indent = 32
              const isRec  = row.is_receita
              const acctCaveat = caveats.get(`acct:${row.cod_conta}`)
              // Cor neutra quando provisão pendente — verde "economia" seria enganoso
              const vColor = acctCaveat
                ? 'var(--muted)'
                : varColorAccount(row.var_rs, isRec)

              return (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                >
                  <td style={{ padding: '7px 16px 7px', paddingLeft: indent, color: 'var(--text2)' }}>
                    <span style={{ color: 'var(--muted2)', fontSize: '.71rem', marginRight: 8 }}>{row.cod_conta}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340, display: 'inline-block', verticalAlign: 'middle' }} title={row.nome}>
                      {row.nome.length > 50 ? row.nome.slice(0, 50) + '…' : row.nome}
                    </span>
                    <CaveatIcon message={acctCaveat} />
                  </td>
                  {showMonths && <>
                    <td style={tdNum()}>{fmtMoney(row.orc_jan)}</td>
                    <td style={tdNum()}>{fmtMoney(row.orc_fev)}</td>
                    <td style={tdNum()}>{fmtMoney(row.orc_mar)}</td>
                  </>}
                  <td style={tdNum()}>{fmtMoney(row.orc_q1)}</td>
                  <td style={tdNum()}>{fmtMoney(row.rea_q1)}</td>
                  <td style={{ ...tdNum(), color: vColor, fontWeight: 600 }}>{fmtMoney(row.var_rs)}</td>
                  <td style={{ ...tdNum(), color: vColor }}>
                    {acctCaveat ? '—' : (row.var_pct != null ? fmtPct(row.var_pct) : '—')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const thNum = {
  padding: '9px 16px',
  textAlign: 'right',
  background: 'var(--surface2)',
  color: 'var(--muted)',
  fontSize: '.68rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
}

function tdNum(color) {
  return {
    padding: '7px 16px',
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
    color: color ?? 'var(--text2)',
    whiteSpace: 'nowrap',
  }
}
