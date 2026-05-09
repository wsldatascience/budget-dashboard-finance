import { fmtShort, fmtPct } from '../utils/fmt'

function getDesvios(data, n) {
  const rows = (data.all_contas ?? [])
    .filter(c => c.orc_q1 > 0)
    .map(c => ({
      cod:      c.cod_conta,
      nome:     c.nome_conta,
      grupo:    c.grupo,
      orcado:   c.orc_q1,
      realizado: c.rea_q1,
      varRs:    c.var_rs,
      varPct:   c.var_pct,
      execPct:  c.orc_q1 > 0 ? (c.rea_q1 / c.orc_q1) * 100 : 0,
    }))

  const estouros = [...rows]
    .filter(r => r.varRs > 0)
    .sort((a, b) => b.varRs - a.varRs)
    .slice(0, n)

  const economias = [...rows]
    .filter(r => r.varRs < 0)
    .sort((a, b) => a.varRs - b.varRs)
    .slice(0, n)

  return { estouros, economias }
}

function DesvioItem({ item, type, rank }) {
  const isOver   = type === 'over'
  const col      = isOver ? '#FF4E5B' : '#0FD98A'
  const fill     = Math.min(item.execPct, 100)
  const varSign  = item.varRs > 0 ? '+' : ''

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: '10px 0',
      borderBottom: '1px solid var(--border2)',
    }}>
      {/* Nome + rank + valor */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
          background: isOver ? 'rgba(255,78,91,.12)' : 'rgba(15,217,138,.12)',
          color: col, fontSize: '.65rem', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{rank}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            title={item.nome}>{item.nome}</div>
          <div style={{ fontSize: '.67rem', color: 'var(--muted2)', marginTop: 1 }}>{item.grupo}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
            {varSign}{fmtShort(item.varRs)}
          </div>
          <div style={{ fontSize: '.65rem', fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace" }}>
            {fmtPct(item.varPct)}
          </div>
        </div>
      </div>

      {/* Barra de execução + valores */}
      <div style={{ paddingLeft: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '.60rem', color: 'var(--muted2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Execução</span>
          <span style={{ fontSize: '.63rem', fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace" }}>
            {item.execPct.toFixed(0)}% · {fmtShort(item.realizado)} de {fmtShort(item.orcado)}
          </span>
        </div>
        <div style={{ height: 4, background: 'rgba(80,120,200,0.12)', borderRadius: 3 }}>
          <div style={{ width: `${fill}%`, height: '100%', background: col, borderRadius: 3, opacity: .8, transition: 'width .4s ease' }} />
        </div>
      </div>
    </div>
  )
}

export default function TopVariancesPanel({ data, n = 5 }) {
  const { estouros, economias } = getDesvios(data, n)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Principais Desvios Orçamentários</h2>
        <div style={{ display: 'flex', gap: 14, fontSize: '.70rem', color: 'var(--muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF4E5B', display: 'inline-block' }} />
            {estouros.length} estouro{estouros.length !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0FD98A', display: 'inline-block' }} />
            {economias.length} economia{economias.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* Estouros */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,78,91,.15)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#FF4E5B', opacity: .7, flexShrink: 0 }} />
            <span style={{ fontSize: '.62rem', fontWeight: 800, color: '#FF4E5B', textTransform: 'uppercase', letterSpacing: '.1em' }}>Estouros · acima do orçado</span>
          </div>
          {estouros.length === 0 ? (
            <div style={{ fontSize: '.74rem', color: 'var(--muted2)', fontStyle: 'italic', padding: '12px 0' }}>Nenhum estouro no período</div>
          ) : (
            estouros.map((item, i) => <DesvioItem key={item.cod} item={item} type="over" rank={i + 1} />)
          )}
        </div>

        {/* Economias */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(15,217,138,.15)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0FD98A', opacity: .7, flexShrink: 0 }} />
            <span style={{ fontSize: '.62rem', fontWeight: 800, color: '#0FD98A', textTransform: 'uppercase', letterSpacing: '.1em' }}>Economias · abaixo do orçado</span>
          </div>
          {economias.length === 0 ? (
            <div style={{ fontSize: '.74rem', color: 'var(--muted2)', fontStyle: 'italic', padding: '12px 0' }}>Nenhuma economia no período</div>
          ) : (
            economias.map((item, i) => <DesvioItem key={item.cod} item={item} type="under" rank={i + 1} />)
          )}
        </div>

      </div>
    </div>
  )
}
