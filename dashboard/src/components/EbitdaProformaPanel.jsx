import { fmtShort, fmtShortDot, fmtPct1, fmtPP } from '../utils/fmt'

const AMBER     = '#b45309'  // warning solid (texto/realce)
const AMBER_BG  = '#fffbeb'
const AMBER_BD  = '#fde68a'
const SLATE     = '#475569'

function tipoBadge(tipo) {
  const map = {
    depreciacao:       { label: 'D&A',             bg: '#f1f5f9', fg: '#334155' },
    provisao_pessoal:  { label: 'Provisão RH',     bg: '#f1f5f9', fg: '#334155' },
    imposto:           { label: 'IR/CSLL',         bg: '#f1f5f9', fg: '#334155' },
    tributos_servico:  { label: 'PIS/COFINS/ISS',  bg: '#f1f5f9', fg: '#334155' },
  }
  const m = map[tipo] ?? { label: tipo, bg: '#f3f4f6', fg: '#374151' }
  return (
    <span style={{ background: m.bg, color: m.fg, padding: '2px 7px', borderRadius: 4, fontSize: '.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
      {m.label}
    </span>
  )
}

export default function EbitdaProformaPanel({ data, compact }) {
  const pf = data?.margens?.ebitda_proforma
  if (!pf || !pf.ajustes?.length) return null

  const deltaMargemPP = pf.margem_ebitda_proforma_pct != null && pf.margem_ebitda_realizado_pct != null
    ? pf.margem_ebitda_proforma_pct - pf.margem_ebitda_realizado_pct
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
            EBITDA Pro-forma · ajuste por provisões pendentes
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
      )}

      <div className="card" style={{ padding: compact ? '14px 16px' : '18px 20px', borderLeft: `4px solid ${AMBER}` }}>

        {/* Headline: Reportado → Pro-forma */}
        <div style={{ display: 'flex', gap: compact ? 16 : 28, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: compact ? 12 : 28, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="card-title">{compact ? 'EBITDA Pro-forma' : 'EBITDA Reportado'}</div>
              <div style={{ fontSize: compact ? '1.2rem' : '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
                {fmtShortDot(compact ? pf.ebitda_proforma : pf.ebitda_realizado)}
              </div>
              <div style={{ fontSize: '.72rem', color: compact ? AMBER : 'var(--muted2)', marginTop: 4, fontWeight: compact ? 600 : 400 }}>
                {compact
                  ? `Margem ${fmtPct1(pf.margem_ebitda_proforma_pct)} · ${fmtPP(deltaMargemPP)} vs reportado`
                  : `Margem ${fmtPct1(pf.margem_ebitda_realizado_pct)}`}
              </div>
            </div>

            {!compact && <div style={{ alignSelf: 'center', fontSize: '1.4rem', color: 'var(--muted)' }}>→</div>}

            {!compact && (
              <div>
                <div className="card-title">EBITDA Pro-forma</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
                  {fmtShortDot(pf.ebitda_proforma)}
                </div>
                <div style={{ fontSize: '.72rem', color: AMBER, marginTop: 4, fontWeight: 600 }}>
                  Margem {fmtPct1(pf.margem_ebitda_proforma_pct)} · {fmtPP(deltaMargemPP)}
                </div>
              </div>
            )}

            <div>
              <div className="card-title">Ajuste total</div>
              <div style={{ fontSize: compact ? '1.2rem' : '1.6rem', fontWeight: 800, color: AMBER, lineHeight: 1.1 }}>
                {fmtShortDot(pf.ajuste_total_rs)}
              </div>
              <div style={{ fontSize: '.72rem', color: 'var(--muted2)', marginTop: 4 }}>
                {compact ? `${pf.ajustes.length} provisões pendentes` : 'Provisões esperadas não lançadas'}
              </div>
            </div>
          </div>

          <div style={{ background: AMBER_BG, border: `1px solid ${AMBER_BD}`, borderRadius: 8, padding: compact ? '8px 10px' : '10px 14px', maxWidth: compact ? 260 : 380, flexShrink: 0 }}>
            <div style={{ fontSize: '.62rem', fontWeight: 700, color: AMBER, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
              Caveat
            </div>
            <div style={{ fontSize: compact ? '.68rem' : '.74rem', color: '#78350f', lineHeight: 1.4 }}>
              {compact
                ? `Reportado exclui ${fmtShortDot(pf.ajuste_total_rs)} em provisões (13º, PIS/COFINS/ISS).`
                : `O EBITDA reportado deixa de fora ${fmtShortDot(pf.ajuste_total_rs)} em provisões esperadas (13º salário, PIS/COFINS/ISS). D&A e IR/CSLL ficam abaixo do EBITDA — provisioná-las afeta o Lucro Líquido pro-forma, não o EBITDA.`}
            </div>
          </div>
        </div>

        {/* Tabela de ajustes — apenas no modo full */}
        {!compact && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <table style={{ width: '100%', fontSize: '.78rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--muted2)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Conta</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Orçado Q1</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Realizado Q1</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'right' }}>Ajuste</th>
                  <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Afeta EBITDA?</th>
                </tr>
              </thead>
              <tbody>
                {pf.ajustes.map((a, i) => (
                  <tr key={`${a.cod_conta ?? a.nome}-${i}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '7px 8px', color: 'var(--text)', fontWeight: 500 }}>
                      {a.cod_conta && <span style={{ color: 'var(--muted2)', fontSize: '.7rem', marginRight: 6 }}>{a.cod_conta}</span>}
                      {a.nome}
                    </td>
                    <td style={{ padding: '7px 8px' }}>{tipoBadge(a.tipo)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--muted)' }}>{fmtShort(a.orcado_q1)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--muted)' }}>{fmtShort(a.realizado_q1)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: AMBER, fontWeight: 700 }}>{fmtShort(a.ajuste_rs)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'center', color: a.afeta_ebitda ? AMBER : SLATE, fontSize: '.85rem' }}>
                      {a.afeta_ebitda ? 'Sim' : 'Não'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
