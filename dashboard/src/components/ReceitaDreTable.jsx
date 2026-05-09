import { fmtBRL, fmtPct } from '../utils/fmt'

export default function ReceitaDreTable({ data, compact }) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: 16 }}>{compact ? 'DRE — Contas 31xx' : 'DRE — Receita e Abatimentos (31xx)'}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Conta</th>
              <th className="td-num">Orçado Q1</th>
              <th className="td-num">Realizado Q1</th>
              <th className="td-num">Variação R$</th>
              <th className="td-num">Variação %</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const isReceita = row.cod_conta === '310101'
              // Abatimentos: variacao_rs > 0 means MORE deductions than budgeted → bad for net revenue → RED
              // Receita bruta: variacao_rs > 0 means MORE revenue than budgeted → good → GREEN
              const varColor = row.variacao_rs === 0 || row.variacao_rs == null
                ? 'var(--muted)'
                : isReceita
                  ? (row.variacao_rs > 0 ? 'var(--green)' : 'var(--red)')
                  : (row.variacao_rs > 0 ? 'var(--red)' : 'var(--green)')
              return (
                <tr key={row.cod_conta} style={isReceita ? { background: 'rgba(20,184,166,.06)' } : {}}>
                  <td className="td-code">{row.cod_conta}</td>
                  <td style={isReceita ? { fontWeight: 600, color: '#14b8a6' } : {}}>
                    {row.nome_conta}
                  </td>
                  <td className="td-num">
                    {row.valor_orcado > 0 ? fmtBRL(row.valor_orcado) : <span className="text-muted">—</span>}
                  </td>
                  <td className="td-num" style={isReceita ? { color: '#14b8a6', fontWeight: 600 } : {}}>
                    {row.valor_realizado > 0 ? fmtBRL(row.valor_realizado) : <span className="text-muted">—</span>}
                  </td>
                  <td className="td-num" style={{ color: varColor }}>
                    {row.variacao_rs != null && row.variacao_rs !== 0 ? fmtBRL(row.variacao_rs) : <span className="text-muted">—</span>}
                  </td>
                  <td className="td-num" style={{ color: varColor }}>
                    {row.variacao_pct != null ? fmtPct(row.variacao_pct) : <span className="text-muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
