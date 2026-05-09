import { fmtShort, fmtPct1, fmtInt } from '../utils/fmt'

// Risco de concentração: escala âmbar→vermelho.
// Top-1 NUNCA é positivo a ponto de virar verde — concentração baixa
// é "neutra/saudável", não "boa". Senior FP&A nunca pinta concentração de verde.
function riskTone(hhi) {
  if (hhi >= 2500) return { fg: '#991b1b', bg: '#fef2f2', border: '#fecaca', label: 'Altamente concentrado' }
  if (hhi >= 1500) return { fg: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Moderadamente concentrado' }
  return                 { fg: '#475569', bg: '#f1f5f9', border: '#cbd5e1', label: 'Pouco concentrado' }
}

export default function ConcentracaoPanel({ data, compact }) {
  const c = data?.receita?.concentracao
  if (!c || !c.top1_convenio) return null

  const tone = riskTone(c.hhi)
  const top5 = c.top5 ?? []
  const maxPct = top5.length ? Math.max(...top5.map(t => t.pct_receita)) : 1

  return (
    <div className="card" style={{ padding: compact ? '14px 16px' : '18px 20px', borderLeft: `4px solid ${tone.fg}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: compact ? 10 : 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">Concentração de Clientes · Q1 2025</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: compact ? '1.5rem' : '2.1rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-.02em', lineHeight: 1 }}>
              {fmtPct1(c.top1_pct)}
            </span>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              de <strong style={{ color: 'var(--text)' }}>{c.top1_convenio}</strong>
            </span>
          </div>
          {!compact && (
            <div style={{ fontSize: '.74rem', color: 'var(--muted2)', marginTop: 4 }}>
              {fmtShort(c.top1_valor)} de receita bruta · contrato único de risco crítico
            </div>
          )}
        </div>

        <div style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 8, padding: compact ? '6px 10px' : '8px 12px', flexShrink: 0 }}>
          <div style={{ fontSize: '.62rem', fontWeight: 700, color: tone.fg, textTransform: 'uppercase', letterSpacing: '.06em' }}>HHI</div>
          <div style={{ fontSize: compact ? '1.1rem' : '1.4rem', fontWeight: 800, color: tone.fg, lineHeight: 1.1, marginTop: 1 }}>{fmtInt(c.hhi)}</div>
          <div style={{ fontSize: '.66rem', color: tone.fg, fontWeight: 600 }}>{tone.label}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: compact ? 16 : 24, flexWrap: 'wrap', borderTop: '1px solid var(--border)', borderBottom: compact ? 'none' : '1px solid var(--border)', padding: compact ? '8px 0 0' : '10px 0', marginBottom: compact ? 0 : 12 }}>
        <Metric label="Top-1" value={fmtPct1(c.top1_pct)} />
        <Metric label="Top-3" value={fmtPct1(c.top3_pct)} />
        <Metric label="Top-5" value={fmtPct1(c.top5_pct)} />
        <Metric label="Convênios" value={fmtInt(c.n_convenios)} />
      </div>

      {!compact && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
            {top5.map((t, i) => {
              const pct = t.pct_receita
              const w = maxPct ? (pct / maxPct) * 100 : 0
              const isTop1 = i === 0
              return (
                <div key={t.convenio} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 70px', alignItems: 'center', gap: 10, fontSize: '.76rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: isTop1 ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.convenio}>
                    {t.convenio}
                  </span>
                  <div style={{ background: 'var(--surface)', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                    <div style={{ width: `${w}%`, height: '100%', background: isTop1 ? tone.fg : '#94a3b8', transition: 'width .25s' }} />
                  </div>
                  <span style={{ textAlign: 'right', color: isTop1 ? tone.fg : 'var(--muted)', fontWeight: isTop1 ? 700 : 500 }}>
                    {fmtPct1(pct)}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--muted2)', marginTop: 12, fontStyle: 'italic' }}>
            Risco: renegociação de tabela ou perda do contrato {c.top1_convenio} impactaria diretamente {fmtPct1(c.top1_pct)} da receita.
          </div>
        </>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '.65rem', color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{value}</div>
    </div>
  )
}
