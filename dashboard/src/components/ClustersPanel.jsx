import { fmtShort, fmtPct } from '../utils/fmt'

function ClusterChip({ cluster }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${cluster.color}30`,
      borderLeft: `3px solid ${cluster.color}`,
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600, marginBottom: 3 }}>
            {cluster.faixa || `Faixa ${cluster.rank + 1}`}
          </div>
          <div style={{ fontWeight: 700, fontSize: '.9rem', color: cluster.color }}>
            {cluster.icon} {cluster.label}
          </div>
        </div>
        <div style={{ background: `${cluster.color}15`, borderRadius: 8, padding: '4px 10px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: cluster.color, lineHeight: 1 }}>{cluster.count}</div>
          <div style={{ fontSize: '.62rem', color: 'var(--muted)' }}>contas</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: '.66rem', color: 'var(--muted)', marginBottom: 1 }}>Realizado</div>
          <div style={{ fontWeight: 600, fontSize: '.82rem' }}>{fmtShort(cluster.valor_total)}</div>
        </div>
        <div>
          <div style={{ fontSize: '.66rem', color: 'var(--muted)', marginBottom: 1 }}>Var. % média</div>
          <div style={{ fontWeight: 600, fontSize: '.82rem', color: cluster.color }}>{fmtPct(cluster.var_pct_media)}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {cluster.exemplos.slice(0, 2).map(e => (
          <div key={e.cod_conta} style={{ fontSize: '.71rem', color: 'var(--muted)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--muted2)', marginRight: 4 }}>{e.cod_conta}</span>
            {e.nome_conta.length > 30 ? e.nome_conta.slice(0, 30) + '…' : e.nome_conta}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ClustersPanel({ clusters }) {
  const total = clusters.reduce((s, c) => s + c.count, 0)

  return (
    <div className="card">
      <div style={{ marginBottom: 16 }}>
        <h2>Segmentação de Contas</h2>
        <p style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 3 }}>
          {total} contas classificadas em 4 faixas de variação orçamentária
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {clusters.map(c => <ClusterChip key={c.cluster_id} cluster={c} />)}
      </div>
    </div>
  )
}
