import { fmtBRL, fmtPct } from '../utils/fmt'

export default function AnomaliesTable({ anomalias }) {
  const estouros  = anomalias.filter(a => a.tipo === 'Estouro').length
  const economias = anomalias.filter(a => a.tipo === 'Economia').length

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2>Anomalias Detectadas</h2>
          <p style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 3 }}>
            {anomalias.length} contas com comportamento atípico detectadas por modelo estatístico
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="pill pill-red">{estouros} Estouros</span>
          <span className="pill pill-green">{economias} Economias</span>
        </div>
      </div>

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
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {anomalias.map(a => {
              const isEstouro = a.tipo === 'Estouro'
              const varColor  = isEstouro ? 'var(--red)' : 'var(--green)'
              return (
                <tr key={a.cod_conta}>
                  <td className="td-code">{a.cod_conta}</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.nome_conta}>
                    {a.nome_conta}
                  </td>
                  <td><span className="pill pill-blue" style={{ fontSize: '.65rem' }}>{a.grupo.slice(0, 20)}</span></td>
                  <td className="td-num">{fmtBRL(a.orc_q1)}</td>
                  <td className="td-num">{fmtBRL(a.rea_q1)}</td>
                  <td className="td-num" style={{ color: varColor, fontWeight: 600 }}>{fmtBRL(a.var_rs)}</td>
                  <td className="td-num" style={{ color: varColor }}>
                    {a.var_pct != null ? fmtPct(a.var_pct) : '—'}
                  </td>
                  <td><span className={isEstouro ? 'pill pill-red' : 'pill pill-green'}>{a.tipo}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
