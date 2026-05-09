import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import { fmtBRL } from '../utils/fmt'

const TIP = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8ef',
  borderRadius: 10,
  color: '#1a2744',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,.10)',
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const isQ2 = ['Abr', 'Mai', 'Jun'].includes(label)
  return (
    <div style={TIP}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8ef', fontWeight: 700, fontSize: 13 }}>
        {label}
        {isQ2 && <span style={{ marginLeft: 8, fontSize: '.7rem', background: 'rgba(59,130,246,.1)', color: '#3b82f6', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>Previsto</span>}
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.filter(p => p.value != null).map(p => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
            <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
            <strong>{fmtBRL(p.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ForecastChart({ series }) {
  const maxVal = Math.max(...series.flatMap(d => [
    d.receita_real ?? 0, d.despesa_real ?? 0,
    d.receita_prev ?? 0, d.despesa_prev ?? 0,
  ]))

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>Evolução Q1 Real + Previsão Q2</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: '.72rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', color: 'var(--muted)' }}>
            ── Real (Q1)
          </span>
          <span style={{ fontSize: '.72rem', background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 6, padding: '3px 10px', color: '#3b82f6' }}>
            ╌╌ Previsto (Q2)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={series} margin={{ right: 16 }}>
          {/* Shaded Q2 region */}
          <ReferenceArea x1="Mar" x2="Jun" fill="rgba(59,130,246,.04)" />

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ef" vertical={false} />
          <XAxis dataKey="mes" stroke="transparent" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis
            tickFormatter={v => `R$${(v / 1e6).toFixed(1)}M`}
            stroke="transparent"
            tick={{ fill: '#64748b', fontSize: 11 }}
            domain={[0, maxVal * 1.15]}
          />
          <ReferenceLine x="Mar" stroke="#94a3b8" strokeDasharray="4 2" label={{ value: 'Q2 →', position: 'insideTopRight', fill: '#94a3b8', fontSize: 10 }} />
          <Tooltip content={<ForecastTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 14, fontSize: 12 }} formatter={v => <span style={{ color: '#64748b' }}>{v}</span>} />

          {/* Q1 real — linha sólida */}
          <Line dataKey="receita_real"  name="Receita Real"    stroke="#14b8a6" strokeWidth={2.5} dot={{ r: 4, fill: '#14b8a6' }} connectNulls={false} />
          <Line dataKey="despesa_real"  name="Despesa Real"    stroke="#1a2744" strokeWidth={2.5} dot={{ r: 4, fill: '#1a2744' }} connectNulls={false} />

          {/* Q2 previsto — linha tracejada */}
          <Line dataKey="receita_prev"  name="Receita Prevista" stroke="#14b8a6" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#fff', stroke: '#14b8a6', strokeWidth: 2 }} connectNulls={false} />
          <Line dataKey="despesa_prev"  name="Despesa Prevista" stroke="#1a2744" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#fff', stroke: '#1a2744', strokeWidth: 2 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
