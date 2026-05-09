import { fmtShortDot, fmtPct } from '../utils/fmt'

function KpiCard({ title, value, sub, pct, invertSign }) {
  const isPositive = invertSign ? (pct ?? 0) <= 0 : (pct ?? 0) >= 0
  const badgeClass = pct == null ? 'kpi-badge badge-neutral'
    : isPositive ? 'kpi-badge badge-up' : 'kpi-badge badge-down'
  const arrow = pct == null ? '' : isPositive ? '▲' : '▼'

  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {pct !== undefined && (
        <span className={badgeClass}>{arrow} {fmtPct(pct)}</span>
      )}
    </div>
  )
}

export default function KpiCards({ summary }) {
  const { total_orcado, total_realizado, variacao_rs, variacao_pct } = summary
  return (
    <div className="grid-4">
      <KpiCard title="Total Orçado Q1" value={fmtShortDot(total_orcado)} sub="Jan + Fev + Mar" />
      <KpiCard title="Total Realizado" value={fmtShortDot(total_realizado)} sub="XPTO CAMPINAS" />
      <KpiCard
        title="Variação R$"
        value={fmtShortDot(variacao_rs)}
        sub="Realizado − Orçado"
        pct={variacao_pct}
        invertSign={true}
      />
      <KpiCard
        title="Execução Orçamentária"
        value={fmtPct(variacao_pct != null ? 100 + variacao_pct : null)}
        sub="% do orçado executado"
      />
    </div>
  )
}
