import { fmtShortDot as fmtShort, fmtPct } from '../utils/fmt'

function ForecastRow({ label, value, accent, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <span style={{ fontSize: '.82rem', color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
        {sub && <span style={{ fontSize: '.72rem', color: 'var(--muted)', marginLeft: 6 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: '.95rem', fontWeight: 700, color: accent, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function ScenarioInline({ otimista, realista, pessimista }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: '.72rem', marginTop: 6, flexWrap: 'wrap' }}>
      <span><span style={{ color: 'var(--green)', fontWeight: 600 }}>▲ Otim.</span> <span style={{ color: 'var(--muted)' }}>{fmtShort(otimista)}</span></span>
      <span><span style={{ color: 'var(--muted)', fontWeight: 600 }}>· Base</span> <span style={{ color: 'var(--muted)' }}>{fmtShort(realista)}</span></span>
      <span><span style={{ color: 'var(--red)', fontWeight: 600 }}>▼ Pess.</span> <span style={{ color: 'var(--muted)' }}>{fmtShort(pessimista)}</span></span>
    </div>
  )
}

export default function ForecastKpis({ forecast }) {
  const { receita, despesas, margem } = forecast

  const recGrowth = ((receita.q2_previsto - receita.q1_total) / Math.abs(receita.q1_total)) * 100
  const despGrowth = ((despesas.q2_previsto - despesas.q1_total) / Math.abs(despesas.q1_total)) * 100
  const despAccent = despesas.tendencia === 'crescente' ? 'var(--red)' : 'var(--green)'
  const margPos = margem.q2_prevista >= 0

  return (
    <div className="card">
      <ForecastRow
        label="Receita Q2"
        sub={`vs Q1 ${fmtPct(recGrowth)}`}
        value={fmtShort(receita.q2_previsto)}
        accent="var(--teal)"
      />
      <ScenarioInline otimista={receita.q2_otimista} realista={receita.q2_previsto} pessimista={receita.q2_pessimista} />

      <div style={{ margin: '8px 0' }} />

      <ForecastRow
        label="Despesas Q2"
        sub={`vs Q1 ${fmtPct(despGrowth)}`}
        value={fmtShort(despesas.q2_previsto)}
        accent={despAccent}
      />
      <ScenarioInline otimista={despesas.q2_otimista} realista={despesas.q2_previsto} pessimista={despesas.q2_pessimista} />

      <div style={{ margin: '8px 0' }} />

      <ForecastRow
        label="Margem Q2"
        value={fmtShort(margem.q2_prevista)}
        accent={margPos ? 'var(--green)' : 'var(--red)'}
      />
      <ScenarioInline otimista={margem.q2_otimista} realista={margem.q2_prevista} pessimista={margem.q2_pessimista} />

      <div style={{ marginTop: 14, fontSize: '.7rem', color: 'var(--muted2)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        {receita.aviso || 'Previsão indicativa baseada em Q1. Validade: 30 dias.'}
      </div>
    </div>
  )
}
