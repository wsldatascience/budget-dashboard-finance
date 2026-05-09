import { fmtShort } from '../utils/fmt'
import { getMargens } from '../utils/kpis'

function pp(v) {
  if (v == null) return '—'
  const sign = v > 0 ? '+' : ''
  return `${sign}${v.toFixed(2)} p.p.`
}

function pct(v) {
  if (v == null) return '—'
  return `${v.toFixed(1)}%`
}

function MargemCard({ titulo, valorRea, valorOrc, deltaPP, hint, compact }) {
  const positive = (deltaPP ?? 0) >= 0
  const accent = deltaPP == null ? 'var(--muted)' : positive ? 'var(--green)' : 'var(--red)'
  const arrow  = deltaPP == null ? '' : positive ? '▲' : '▼'

  return (
    <div className="card" style={{ padding: compact ? '10px 12px' : '14px 16px' }}>
      <div className="card-title">{titulo}</div>
      <div style={{ fontSize: compact ? '1.2rem' : '1.55rem', fontWeight: 800, color: accent, lineHeight: 1.1, letterSpacing: '-.01em' }}>
        {pct(valorRea)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: compact ? 4 : 6, fontSize: '.74rem', flexWrap: 'wrap' }}>
        <span style={{ color: accent, fontWeight: 700 }}>{arrow} {pp(deltaPP)}</span>
        <span style={{ color: 'var(--muted2)' }}>vs {pct(valorOrc)}</span>
      </div>
      {hint && !compact && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

function ValorCard({ titulo, valorRea, valorOrc, hint, compact }) {
  const delta = valorRea - valorOrc
  const positive = delta >= 0
  const accent = positive ? 'var(--green)' : 'var(--red)'

  return (
    <div className="card" style={{ padding: compact ? '10px 12px' : '14px 16px' }}>
      <div className="card-title">{titulo}</div>
      <div style={{ fontSize: compact ? '1.1rem' : '1.4rem', fontWeight: 800, color: accent, lineHeight: 1.1 }}>
        {fmtShort(valorRea)}
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: compact ? 4 : 6 }}>
        Orç. {fmtShort(valorOrc)}{!compact && ` · ${hint}`}
      </div>
    </div>
  )
}

export default function MargensPanel({ data, compact }) {
  const m = getMargens(data)
  if (!m) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Margens & EBITDA · Q1 2025
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <div className="grid-4">
        <MargemCard compact={compact} titulo="Margem Bruta"        valorRea={m.margemBruta.realizado}       valorOrc={m.margemBruta.orcado}       deltaPP={m.deltas.margemBruta}       hint="(Rec. Líq. − Custos) / Rec. Líq." />
        <MargemCard compact={compact} titulo="Margem Operacional"  valorRea={m.margemOperacional.realizado} valorOrc={m.margemOperacional.orcado} deltaPP={m.deltas.margemOperacional} hint="Lucro Op. / Rec. Líq." />
        <MargemCard compact={compact} titulo="Margem EBITDA"       valorRea={m.margemEbitda.realizado}      valorOrc={m.margemEbitda.orcado}      deltaPP={m.deltas.margemEbitda}      hint="EBITDA / Rec. Líq." />
        <ValorCard  compact={compact} titulo="EBITDA Realizado"    valorRea={m.ebitda.realizado}            valorOrc={m.ebitda.orcado}            hint="Lucro antes de juros, impostos, depr." />
      </div>

      {!compact && (
        <div className="grid-4">
          <ValorCard titulo="Receita Líquida"    valorRea={m.receitaLiquida.realizado}         valorOrc={m.receitaLiquida.orcado}         hint="Bruta − abatimentos" />
          <ValorCard titulo="Custo dos Serviços" valorRea={m.custoServicos.realizado}           valorOrc={m.custoServicos.orcado}           hint="Custo dos Serviços (CSP)" />
          <ValorCard titulo="Lucro Bruto"        valorRea={m.lucroBruto.realizado}              valorOrc={m.lucroBruto.orcado}              hint="Rec. Líq. − Custos" />
          <ValorCard titulo="Despesas Op."       valorRea={m.despesasOperacionais.realizado}    valorOrc={m.despesasOperacionais.orcado}    hint="SG&A consolidado" />
        </div>
      )}
    </div>
  )
}
