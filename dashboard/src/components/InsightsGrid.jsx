import { fmtShort, fmtPct } from '../utils/fmt'
import { getInsights } from '../utils/kpis'

const TEND_LABEL = { 'Melhorando': 'Decrescente', 'Deteriorando': 'Crescente', 'Estável': 'Estável' }

export default function InsightsGrid({ data }) {
  const { melhorCentro, piorCentro, tendencia, economiaTotal, recomendacao } = getInsights(data)
  const tendLabel = TEND_LABEL[tendencia] ?? tendencia

  const monthly = data.monthly
  const janVar = monthly[0]?.variacao_pct?.toFixed(1) ?? 0
  const marVar = monthly[monthly.length - 1]?.variacao_pct?.toFixed(1) ?? 0

  const items = [
    {
      tag: 'Melhor Resultado',
      title: melhorCentro?.macroCentro ?? '—',
      sub: `Desvio ${melhorCentro ? fmtPct(melhorCentro.variacao_pct) : '—'}`,
      accent: 'var(--green)',
      bg: 'rgba(5,150,105,.06)',
    },
    {
      tag: 'Maior Desvio',
      title: piorCentro?.macroCentro ?? '—',
      sub: `Variação ${piorCentro ? fmtPct(piorCentro.variacao_pct) : '—'}`,
      accent: 'var(--red)',
      bg: 'rgba(220,38,38,.06)',
    },
    {
      tag: 'Tendência de Despesas',
      title: tendLabel,
      sub: `Jan ${janVar}% → Mar ${marVar}%`,
      accent: tendencia === 'Melhorando' ? 'var(--green)' : tendencia === 'Deteriorando' ? 'var(--red)' : 'var(--muted)',
      bg: 'rgba(107,114,128,.05)',
    },
    {
      tag: 'Economia Total Q1',
      title: fmtShort(Math.abs(economiaTotal)),
      sub: 'Abaixo do orçado',
      accent: 'var(--teal)',
      bg: 'rgba(13,148,136,.06)',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {items.map(({ tag, title, sub, accent, bg }) => (
          <div key={tag} style={{ background: bg, border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: '.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600, marginBottom: 4 }}>{tag}</div>
            <div style={{ fontSize: '.95rem', fontWeight: 700, color: accent, lineHeight: 1.2 }}>{title}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 3 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: '.8rem', color: 'var(--text2)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--teal)', flexShrink: 0 }}>→</span>
        <span>{recomendacao}</span>
      </div>
    </div>
  )
}
