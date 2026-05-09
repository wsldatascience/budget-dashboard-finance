import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { fmtBRL, fmtPct } from '../utils/fmt'

const TIP = {
  backgroundColor: '#0D1728',
  border: '1px solid rgba(80,120,200,0.2)',
  borderRadius: 12,
  color: '#E4ECFA',
  fontSize: 12,
  fontFamily: "'Outfit', sans-serif",
  boxShadow: '0 8px 32px rgba(0,0,0,.5)',
}

function ComboTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TIP}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid rgba(80,120,200,0.15)', fontWeight: 700, fontSize: 13, color: '#E4ECFA', letterSpacing: '.02em' }}>{label}</div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {payload.map(p => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 28 }}>
            <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
            <strong style={{ fontFamily: "'DM Mono', monospace" }}>
              {p.name === 'Variação %' ? fmtPct(p.value) : fmtBRL(p.value)}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MonthlyComboChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.orcado, d.realizado)))

  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>Evolução Mensal · Despesas</h2>
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={data} barGap={4} margin={{ right: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,120,200,0.1)" vertical={false} />
          <XAxis
            dataKey="mes"
            stroke="transparent"
            tick={{ fill: '#546A8A', fontSize: 12, fontFamily: 'Outfit' }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={v => `R$${(v / 1e6).toFixed(1)}M`}
            stroke="transparent"
            tick={{ fill: '#546A8A', fontSize: 11, fontFamily: 'Outfit' }}
            domain={[0, maxVal * 1.15]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={v => `${v}%`}
            stroke="transparent"
            tick={{ fill: '#546A8A', fontSize: 11, fontFamily: 'Outfit' }}
          />
          <ReferenceLine yAxisId="right" y={0} stroke="rgba(80,120,200,0.18)" strokeDasharray="4 2" />
          <Tooltip content={<ComboTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 14, fontFamily: 'Outfit' }}
            formatter={v => <span style={{ color: '#8BA4C8' }}>{v}</span>}
          />
          <Bar yAxisId="left" dataKey="orcado"    name="Orçado"    fill="#1E3A5F" radius={[5,5,0,0]} barSize={36} />
          <Bar yAxisId="left" dataKey="realizado" name="Realizado" fill="#0FD98A" radius={[5,5,0,0]} barSize={36} />
          <Line
            yAxisId="right"
            dataKey="variacao_pct"
            name="Variação %"
            stroke="#FFBA35"
            strokeWidth={2.5}
            dot={{ fill: '#FFBA35', r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: '#FFBA35', strokeWidth: 0 }}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
