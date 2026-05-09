import { useState } from 'react'
import { fmtShort, fmtPct } from '../utils/fmt'
import { getCostCenters } from '../utils/kpis'

const GREEN = '#0FD98A'
const RED   = '#FF4E5B'
const varCol = v => (v ?? 0) > 0 ? RED : GREEN

const L1_CONFIG = {
  'Custo dos Serviços (CSP)':  { accent: '#00C2D4', tag: 'CSP' },
  'Despesas Operacionais':      { accent: '#7C87F5', tag: 'DESP. OP.' },
  'Depreciação e Amortização':  { accent: '#546A8A', tag: 'D&A' },
}

/* ── Barra de composição: onde vai o dinheiro ─────────────────────── */
function CompositionBar({ centers, totRea }) {
  return (
    <div>
      <div style={{ display: 'flex', height: 8, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
        {centers.map(c => {
          const cfg   = L1_CONFIG[c.macroCentro] ?? L1_CONFIG['Depreciação e Amortização']
          const share = totRea > 0 ? (c.realizado / totRea) * 100 : 0
          return (
            <div key={c.macroCentro} style={{ width: `${share}%`, background: cfg.accent, opacity: .65, transition: 'width .4s ease', minWidth: 2 }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', marginTop: 6, gap: 16 }}>
        {centers.map(c => {
          const cfg   = L1_CONFIG[c.macroCentro] ?? L1_CONFIG['Depreciação e Amortização']
          const share = totRea > 0 ? (c.realizado / totRea) * 100 : 0
          const over  = c.variacao_rs > 0
          return (
            <div key={c.macroCentro} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.accent, opacity: .7, flexShrink: 0 }} />
              <span style={{ fontSize: '.67rem', color: 'var(--muted2)', fontWeight: 600 }}>{cfg.tag}</span>
              <span style={{ fontSize: '.67rem', fontFamily: "'DM Mono', monospace", color: 'var(--muted)', fontWeight: 700 }}>{share.toFixed(1)}%</span>
              <span style={{ fontSize: '.62rem', fontWeight: 700, color: over ? RED : GREEN }}>
                {over ? '▲' : '▼'}{fmtPct(Math.abs(c.variacao_pct))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Barra de execução com rótulo ─────────────────────────────────── */
function ExecBar({ orcado, realizado, showPct = false }) {
  const raw  = orcado > 0 ? (realizado / orcado) * 100 : 0
  const fill = Math.min(raw, 100)
  const over = realizado > orcado
  const col  = over ? RED : GREEN
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
      <div style={{ position: 'relative', flex: 1, height: 4, background: 'rgba(80,120,200,0.12)', borderRadius: 3 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${fill}%`, background: col, borderRadius: 3, opacity: .8, transition: 'width .4s ease' }} />
        {over && (
          <div style={{ position: 'absolute', right: 0, top: -1, height: 6, width: `${Math.min(raw - 100, 20)}%`, background: RED, borderRadius: 3, opacity: .3 }} />
        )}
      </div>
      {showPct && (
        <span style={{ fontSize: '.62rem', fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace", flexShrink: 0, minWidth: 36, textAlign: 'right' }}>
          {raw.toFixed(0)}%
        </span>
      )}
    </div>
  )
}

/* ── Level 3: conta individual ────────────────────────────────────── */
function ContaRow({ c, isLast }) {
  const col = varCol(c.variacao_rs)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 96px 96px 68px',
      gap: 10, padding: '8px 16px 8px 36px', alignItems: 'center',
      borderBottom: !isLast ? '1px solid rgba(80,120,200,0.05)' : 'none',
    }}>
      <div>
        <div style={{ fontSize: '.70rem', color: 'var(--text2)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }} title={c.nome}>{c.nome}</div>
        <ExecBar orcado={c.orcado} realizado={c.realizado} showPct />
      </div>
      <div style={{ fontSize: '.71rem', fontWeight: 600, color: 'var(--text2)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(c.realizado)}</div>
      <div style={{ fontSize: '.71rem', color: 'var(--muted)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(c.orcado)}</div>
      <div style={{ fontSize: '.71rem', fontWeight: 700, color: col, textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>
        {c.variacao_pct != null ? fmtPct(c.variacao_pct) : '—'}
      </div>
    </div>
  )
}

/* ── Level 2: sub-grupo ────────────────────────────────────────────── */
function SubGrupoRow({ sg, expanded, onToggle, isLast }) {
  const col = varCol(sg.variacao_rs)
  return (
    <>
      <div
        onClick={onToggle}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 96px 96px 68px',
          gap: 10, padding: '10px 16px', alignItems: 'center',
          cursor: sg.contas?.length ? 'pointer' : 'default',
          borderBottom: (!isLast || expanded) ? '1px solid rgba(80,120,200,0.07)' : 'none',
          transition: 'background .1s', userSelect: 'none',
        }}
        onMouseEnter={e => { if (sg.contas?.length) e.currentTarget.style.background = 'rgba(80,120,200,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {sg.contas?.length > 0 && (
              <span style={{ fontSize: '.62rem', color: 'var(--muted)', display: 'inline-block', transition: 'transform .15s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
            )}
            <span style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--text2)' }}>{sg.nome}</span>
          </div>
          <ExecBar orcado={sg.orcado} realizado={sg.realizado} showPct />
        </div>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(sg.realizado)}</div>
        <div style={{ fontSize: '.74rem', color: 'var(--muted)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(sg.orcado)}</div>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: col, textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{fmtPct(sg.variacao_pct)}</div>
      </div>

      {expanded && sg.contas?.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,.14)', borderBottom: '1px solid rgba(80,120,200,0.07)', animation: 'fadeUp .15s ease both' }}>
          {sg.contas.map((c, i) => <ContaRow key={c.cod} c={c} isLast={i === sg.contas.length - 1} />)}
        </div>
      )}
    </>
  )
}

/* ── Level 1: seção ────────────────────────────────────────────────── */
function L1Section({ c, expandL2, onToggleL2, isWorst }) {
  const cfg  = L1_CONFIG[c.macroCentro] ?? L1_CONFIG['Depreciação e Amortização']
  const col  = varCol(c.variacao_rs)
  const over = c.variacao_rs > 0

  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${isWorst ? 'rgba(255,78,91,0.2)' : 'rgba(80,120,200,0.1)'}`,
    }}>
      {/* Section header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 96px 96px 68px',
        gap: 10, padding: '11px 16px', alignItems: 'center',
        background: isWorst ? 'rgba(255,78,91,0.04)' : 'rgba(80,120,200,0.06)',
        borderLeft: `3px solid ${over ? RED : cfg.accent}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status icon */}
          <span style={{
            width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
            background: over ? 'rgba(255,78,91,.12)' : 'rgba(15,217,138,.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.6rem', fontWeight: 800, color: over ? RED : GREEN,
          }}>
            {over ? '!' : '✓'}
          </span>
          <span style={{
            fontSize: '.58rem', fontWeight: 800, letterSpacing: '.08em',
            color: cfg.accent, background: `${cfg.accent}18`,
            padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase', whiteSpace: 'nowrap',
          }}>{cfg.tag}</span>
          <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)' }}>{c.macroCentro}</span>
        </div>
        <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(c.realizado)}</div>
        <div style={{ fontSize: '.76rem', color: 'var(--muted)', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{fmtShort(c.orcado)}</div>
        <div style={{ fontSize: '.82rem', fontWeight: 700, color: col, textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{fmtPct(c.variacao_pct)}</div>
      </div>

      {/* Sub-groups */}
      <div>
        {c.subGrupos?.map((sg, i) => (
          <SubGrupoRow
            key={sg.nome} sg={sg}
            expanded={!!expandL2[sg.nome]}
            onToggle={() => onToggleL2(sg.nome)}
            isLast={i === c.subGrupos.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Panel ──────────────────────────────────────────────────────────── */
export default function CostCentersPanel({ data }) {
  const centers  = getCostCenters(data)
  const [expandL2, setExpandL2] = useState({})

  const totOrc    = centers.reduce((s, c) => s + c.orcado, 0)
  const totRea    = centers.reduce((s, c) => s + c.realizado, 0)
  const totVar    = totOrc !== 0 ? (totRea - totOrc) / Math.abs(totOrc) * 100 : 0
  const totCol    = varCol(totRea - totOrc)
  const overCount = centers.filter(c => c.variacao_rs > 0).length
  const execPct   = totOrc > 0 ? (totRea / totOrc) * 100 : 0
  const worstCenter = centers.filter(c => c.variacao_rs > 0).sort((a, b) => b.variacao_pct - a.variacao_pct)[0]

  const verdictOk = overCount === 0
  const verdictTxt = verdictOk
    ? `Todas as categorias dentro do orçado · execução ${execPct.toFixed(1)}%`
    : `${overCount} de ${centers.length} categorias acima do orçado · execução ${execPct.toFixed(1)}%`

  return (
    <div className="card">

      {/* ── Cabeçalho com veredito ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 20 }}>
        <div>
          <h2 style={{ marginBottom: 5 }}>Estrutura de Custos</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: verdictOk ? 'rgba(15,217,138,.12)' : 'rgba(255,78,91,.12)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.58rem', fontWeight: 800, color: verdictOk ? GREEN : RED,
            }}>{verdictOk ? '✓' : '!'}</span>
            <span style={{ fontSize: '.74rem', color: 'var(--muted)' }}>{verdictTxt}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '.6rem', color: 'var(--muted2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Total Realizado</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '.9rem', fontWeight: 700, color: 'var(--text)' }}>
            {fmtShort(totRea)}
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: totCol, marginLeft: 8 }}>{fmtPct(totVar)}</span>
          </div>
        </div>
      </div>

      {/* ── Composição visual ── */}
      <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border2)' }}>
        <div style={{ fontSize: '.60rem', fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.09em', marginBottom: 8 }}>Composição do custo total</div>
        <CompositionBar centers={centers} totRea={totRea} />
      </div>

      {/* ── Cabeçalho de colunas ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 96px 96px 68px',
        gap: 10, padding: '0 16px 8px',
        fontSize: '.60rem', fontWeight: 700, color: 'var(--muted2)',
        textTransform: 'uppercase', letterSpacing: '.09em',
        borderBottom: '1px solid var(--border)', marginBottom: 10,
      }}>
        <span>Categoria</span>
        <span style={{ textAlign: 'right' }}>Realizado</span>
        <span style={{ textAlign: 'right' }}>Orçado</span>
        <span style={{ textAlign: 'right' }}>Var %</span>
      </div>

      {/* ── Seções L1 ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {centers.map(c => (
          <L1Section
            key={c.macroCentro} c={c}
            expandL2={expandL2}
            onToggleL2={name => setExpandL2(p => ({ ...p, [name]: !p[name] }))}
            isWorst={worstCenter?.macroCentro === c.macroCentro}
          />
        ))}
      </div>
    </div>
  )
}
