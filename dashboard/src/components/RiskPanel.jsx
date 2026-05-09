import { fmtBRL, fmtPct, fmtShort } from '../utils/fmt'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'

const TIP = {
  backgroundColor: '#fff',
  border: '1px solid #e2e8ef',
  borderRadius: 10,
  color: '#1a2744',
  fontSize: 12,
  boxShadow: '0 4px 16px rgba(0,0,0,.10)',
}

function RiskTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div style={TIP}>
      <div style={{ padding: '8px 12px', fontWeight: 700 }}>{label}</div>
      <div style={{ padding: '4px 12px 8px' }}>
        <div>{d.count} contas</div>
        <div>Valor em risco: <strong style={{ color: d.color }}>{fmtShort(d.valor_em_risco)}</strong></div>
      </div>
    </div>
  )
}

function RiskBadge({ nivel }) {
  const cfg = {
    'Alto':          { cls: 'pill pill-red',   label: 'Alto' },
    'Médio':         { cls: 'pill pill-amber',  label: 'Médio' },
    'Baixo':         { cls: 'pill pill-green',  label: 'Baixo' },
    'Sem Orçamento': { cls: 'pill pill-blue',   label: 'S/Orç.' },
  }
  const c = cfg[nivel] ?? { cls: 'pill pill-blue', label: nivel }
  return <span className={c.cls}>{c.label}</span>
}

export default function RiskPanel({ risco }) {
  const { distribuicao, alto_risco } = risco
  const totalValorRisco = distribuicao.reduce((s, d) => s + d.valor_em_risco, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary + Chart */}
      <div className="card">
        <div style={{ marginBottom: 16 }}>
          <h2>Matriz de Risco</h2>
          <p style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 3 }}>
            Classificação por variação orçamentária: Alto &gt;10% · Médio 0–10% · Baixo ≤0%
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {distribuicao.map(d => (
              <div key={d.nivel} style={{
                background: d.nivel === 'Alto' ? 'var(--red-bg)' : d.nivel === 'Médio' ? 'var(--amber-bg)' : d.nivel === 'Baixo' ? 'var(--green-bg)' : 'var(--surface2)',
                border: `1px solid ${d.color}30`,
                borderRadius: 10,
                padding: '12px',
              }}>
                <div style={{ fontSize: '.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Risco {d.nivel}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: d.color, lineHeight: 1 }}>{d.count}</div>
                <div style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: 3 }}>contas</div>
                {d.valor_em_risco > 0 && (
                  <div style={{ fontSize: '.73rem', fontWeight: 600, color: d.color, marginTop: 4 }}>
                    {fmtShort(d.valor_em_risco)} em risco
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distribuicao} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8ef" vertical={false} />
              <XAxis dataKey="nivel" tick={{ fill: '#64748b', fontSize: 11 }} stroke="transparent" />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} stroke="transparent" />
              <Tooltip content={<RiskTooltip />} />
              <Bar dataKey="count" name="Contas" radius={[6, 6, 0, 0]}>
                {distribuicao.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {totalValorRisco > 0 && (
          <div style={{ marginTop: 12, background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 14px', fontSize: '.78rem', color: 'var(--red)', fontWeight: 600 }}>
            ⚠ Valor total em risco (estouros): {fmtShort(totalValorRisco)}
          </div>
        )}
      </div>

      {/* High risk accounts table */}
      {alto_risco.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: 14 }}>Contas de Alto Risco — Top {alto_risco.length}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Conta</th>
                  <th>Grupo</th>
                  <th className="td-num">Orçado Q1</th>
                  <th className="td-num">Realizado Q1</th>
                  <th className="td-num">Variação R$</th>
                  <th className="td-num">Variação %</th>
                  <th>Risco</th>
                </tr>
              </thead>
              <tbody>
                {alto_risco.map(c => (
                  <tr key={c.cod_conta}>
                    <td className="td-code">{c.cod_conta}</td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nome_conta}>
                      {c.nome_conta}
                    </td>
                    <td><span className="pill pill-blue" style={{ fontSize: '.65rem' }}>{c.grupo.slice(0, 18)}</span></td>
                    <td className="td-num">{fmtBRL(c.orc_q1)}</td>
                    <td className="td-num">{fmtBRL(c.rea_q1)}</td>
                    <td className="td-num" style={{ color: 'var(--red)', fontWeight: 600 }}>{fmtBRL(c.var_rs)}</td>
                    <td className="td-num" style={{ color: 'var(--red)' }}>{c.var_pct != null ? fmtPct(c.var_pct) : '—'}</td>
                    <td><RiskBadge nivel="Alto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
