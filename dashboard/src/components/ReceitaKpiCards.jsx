import { fmtShort, fmtShortDot, fmtPct } from '../utils/fmt'
import { abatimentosSubProvisionados } from '../utils/kpis'

const AMBER = '#b45309'

function KpiCard({ title, value, sub, pct, invertSign, accent, caveat }) {
  const isPositive = invertSign ? (pct ?? 0) <= 0 : (pct ?? 0) >= 0
  const badgeClass = pct == null ? 'kpi-badge badge-neutral'
    : isPositive ? 'kpi-badge badge-up' : 'kpi-badge badge-down'
  const arrow = pct == null ? '' : isPositive ? '▲' : '▼'

  const cardStyle = caveat
    ? { borderColor: '#fde68a', borderTopWidth: 2, borderTopColor: AMBER, position: 'relative' }
    : accent
      ? { borderColor: 'rgba(20,184,166,.35)', borderTopWidth: 2, borderTopColor: '#14b8a6' }
      : {}

  return (
    <div className="card" style={cardStyle}>
      {caveat && (
        <span
          title={caveat}
          style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#fffbeb', color: AMBER,
            fontSize: '.66rem', fontWeight: 800,
            border: '1px solid #fde68a', cursor: 'help',
          }}
        >!</span>
      )}
      <div className="card-title">{title}</div>
      <div className="kpi-value" style={accent && !caveat ? { color: '#14b8a6' } : {}}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {pct !== undefined && pct !== null && (
        <span className={badgeClass}>{arrow} {fmtPct(Math.abs(pct))}</span>
      )}
    </div>
  )
}

export default function ReceitaKpiCards({ data }) {
  const summary = data.receita.summary
  const {
    receita_bruta_realizada,
    receita_liquida_estimada, deducoes_orcadas,
    rea_jan, rea_fev, rea_mar,
  } = summary

  const abatSub = abatimentosSubProvisionados(data.margens)
  const rlCaveat = abatSub
    ? `Estimativa: abatimentos realizados (${fmtShort(abatSub.realizado)}) ficaram em apenas ${(abatSub.realizado / abatSub.orcado * 100).toFixed(1)}% do orçado (${fmtShort(abatSub.orcado)}). RL usa o orçado como proxy — ver EBITDA Pro-forma para a leitura comparável.`
    : null

  // Crescimento Jan → Mar
  const growth = rea_jan > 0 ? ((rea_mar - rea_jan) / rea_jan) * 100 : null

  // Melhor mês
  const months = [
    { label: 'Jan', val: rea_jan },
    { label: 'Fev', val: rea_fev },
    { label: 'Mar', val: rea_mar },
  ]
  const best = months.reduce((a, b) => b.val > a.val ? b : a)

  // Top convênio
  const topConv = data.receita?.by_convenio?.length
    ? [...data.receita.by_convenio].sort((a, b) => b.total_q1 - a.total_q1)[0]
    : null
  const topConvName = topConv
    ? (topConv.convenio.length > 22 ? topConv.convenio.slice(0, 22) + '…' : topConv.convenio)
    : '—'

  return (
    <div className="grid-4">
      <KpiCard
        title="Receita Bruta Q1"
        value={fmtShortDot(receita_bruta_realizada)}
        sub="Jan + Fev + Mar realizados"
        accent
      />
      <KpiCard
        title="Crescimento Jan → Mar"
        value={growth != null ? fmtPct(growth) : '—'}
        sub={`${fmtShortDot(rea_jan)} → ${fmtShortDot(rea_mar)}`}
        pct={growth}
        invertSign={false}
      />
      <KpiCard
        title="Receita Líquida Estimada"
        value={fmtShortDot(receita_liquida_estimada)}
        sub={`Deduções orçadas: ${fmtShortDot(deducoes_orcadas)}`}
        caveat={rlCaveat}
      />
      <KpiCard
        title="Maior Payor — Concentração"
        value={topConv ? fmtPct(topConv.pct_receita) : '—'}
        sub={topConv ? `${topConvName} · ${fmtShortDot(topConv.total_q1)}` : 'sem dados'}
      />
    </div>
  )
}
