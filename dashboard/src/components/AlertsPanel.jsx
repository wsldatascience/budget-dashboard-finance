import { fmtBRL } from '../utils/fmt'

export default function AlertsPanel({ quality }) {
  const { missing_contas, unplanned_spending } = quality
  const totalMissing   = missing_contas.reduce((s, r) => s + r.valor, 0)
  const totalUnplanned = unplanned_spending.reduce((s, r) => s + r.valor_realizado, 0)

  return (
    <div className="card">
      <h2 style={{ marginBottom: 14 }}>Alertas de Qualidade</h2>

      {missing_contas.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: 'var(--red)', fontWeight: 600, fontSize: '.82rem', marginBottom: 8 }}>
            ⚠ {missing_contas.length} conta(s) realizadas SEM mapeamento na DRE — {fmtBRL(totalMissing)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Conta</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {missing_contas.map(r => (
                  <tr key={r.cod_conta}>
                    <td className="td-code">{r.cod_conta}</td>
                    <td>{r.nome_conta}</td>
                    <td className="td-num text-red">{fmtBRL(r.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {unplanned_spending.length > 0 && (
        <div>
          <div style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: '.82rem', marginBottom: 8 }}>
            ⚡ {unplanned_spending.length} conta(s) com gasto NÃO orçado — {fmtBRL(totalUnplanned)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Conta</th>
                  <th style={{ textAlign: 'right' }}>Realizado</th>
                </tr>
              </thead>
              <tbody>
                {unplanned_spending.map(r => (
                  <tr key={r.cod_conta}>
                    <td className="td-code">{r.cod_conta}</td>
                    <td>{r.nome_conta}</td>
                    <td className="td-num" style={{ color: 'var(--yellow)' }}>{fmtBRL(r.valor_realizado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {missing_contas.length === 0 && unplanned_spending.length === 0 && (
        <p style={{ color: 'var(--green)', fontSize: '.85rem' }}>✔ Nenhum alerta de qualidade encontrado.</p>
      )}
    </div>
  )
}
