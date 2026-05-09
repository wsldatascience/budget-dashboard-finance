import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { fmtBRL, fmtShort } from '../utils/fmt'

const TIP = {
  backgroundColor: '#0D1728',
  border: '1px solid rgba(80,120,200,0.2)',
  borderRadius: 10,
  color: '#E4ECFA',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,.40)',
}

function BRLTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TIP}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(80,120,200,0.14)', fontWeight: 700 }}>{label}</div>
      <div style={{ padding: '8px 12px' }}>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: <strong>{fmtBRL(p.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

const COLORS = ['#00C2D4','#0ea5e9','#7C87F5','#0FD98A','#FFBA35','#38bdf8','#a78bfa','#10b981']

export function ReceitaMensalChart({ summary }) {
  const data = [
    { mes: 'Jan', realizado: summary.rea_jan, growth: null },
    {
      mes: 'Fev',
      realizado: summary.rea_fev,
      growth: summary.rea_jan > 0 ? (summary.rea_fev - summary.rea_jan) / summary.rea_jan * 100 : null,
    },
    {
      mes: 'Mar',
      realizado: summary.rea_mar,
      growth: summary.rea_fev > 0 ? (summary.rea_mar - summary.rea_fev) / summary.rea_fev * 100 : null,
    },
  ]

  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>Receita Bruta por Mês</h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barSize={56} margin={{ top: 40, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,120,200,0.1)" vertical={false} />
          <XAxis dataKey="mes" stroke="transparent" tick={{ fill: '#546A8A', fontSize: 12 }} />
          <YAxis tickFormatter={v => `R$${(v / 1e6).toFixed(1)}M`} stroke="transparent" tick={{ fill: '#546A8A', fontSize: 11 }} />
          <Tooltip content={<BRLTooltip />} />
          <Bar dataKey="realizado" name="Realizado" fill="#00C2D4" radius={[6, 6, 0, 0]}>
            <LabelList
              content={({ x, y, width, value, index }) => {
                const row = data[index]
                const g = row?.growth
                const gColor = g == null ? 'transparent' : g >= 0 ? '#0FD98A' : '#FF4E5B'
                const gLabel = g == null ? '' : `${g >= 0 ? '▲' : '▼'} ${Math.abs(g).toFixed(1)}%`
                return (
                  <g>
                    <text x={x + width / 2} y={y - 20} textAnchor="middle" fill="#8BA4C8" fontSize={11} fontWeight={700}>
                      {fmtShort(value)}
                    </text>
                    {g != null && (
                      <text x={x + width / 2} y={y - 6} textAnchor="middle" fill={gColor} fontSize={10} fontWeight={700}>
                        {gLabel}
                      </text>
                    )}
                  </g>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReceitaConvenioChart({ data }) {
  const top = [...data].sort((a, b) => b.total_q1 - a.total_q1).slice(0, 10)
  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>Receita por Convênio — Top 10</h2>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={top} layout="vertical" barSize={20} margin={{ left: 8, right: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,120,200,0.1)" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `R$${(v / 1e6).toFixed(1)}M`}
            stroke="transparent"
            tick={{ fill: '#546A8A', fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="convenio"
            width={140}
            tick={{ fill: '#8BA4C8', fontSize: 11 }}
            stroke="transparent"
          />
          <Tooltip content={<BRLTooltip />} />
          <Bar dataKey="total_q1" name="Receita Q1" radius={[0, 6, 6, 0]}>
            {top.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
            <LabelList
              dataKey="pct_receita"
              position="right"
              formatter={v => `${v.toFixed(1)}%`}
              style={{ fill: '#8BA4C8', fontSize: 11 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ReceitaGrupoChart({ data }) {
  const sorted = [...data].sort((a, b) => b.total_q1 - a.total_q1)
  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>Mix de Receita — Grupo de Produto</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={sorted} barSize={36}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(80,120,200,0.1)" vertical={false} />
          <XAxis
            dataKey="grupo_produto"
            stroke="transparent"
            tick={{ fill: '#546A8A', fontSize: 10 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={48}
          />
          <YAxis tickFormatter={v => `R$${(v / 1e6).toFixed(1)}M`} stroke="transparent" tick={{ fill: '#546A8A', fontSize: 11 }} />
          <Tooltip content={<BRLTooltip />} />
          <Bar dataKey="total_q1" name="Receita Q1" radius={[6, 6, 0, 0]}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
