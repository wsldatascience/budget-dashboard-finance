import { fmtShortDot as fmtShort, fmtPct, fmtPct1 } from '../utils/fmt'
import { abatimentosSubProvisionados } from '../utils/kpis'

const AMBER = '#b45309'

function variance(rea, orc) {
  if (rea == null || orc == null) return { rs: null, pct: null }
  const rs = rea - orc
  const pct = orc !== 0 ? (rs / Math.abs(orc)) * 100 : null
  return { rs, pct }
}

// Quando há caveat ativo (provisão pendente / ROL ≈ Bruta), a variação NÃO
// representa boa nem má notícia — a leitura está distorcida. Usar tom neutro
// evita o sinal verde/vermelho enganoso.
function KpiCard({ label, rea, orc, marginPct, caveat }) {
  const v = variance(rea, orc)
  const accent = caveat ? 'var(--muted)'
    : v.rs == null ? 'var(--muted)'
    : v.rs >= 0 ? 'var(--green)' : 'var(--red)'
  const arrow = caveat || v.rs == null ? '' : v.rs >= 0 ? '▲' : '▼'

  return (
    <div className="card" style={{ padding: '14px 16px', position: 'relative' }}>
      {caveat && (
        <span
          title={caveat}
          style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#fffbeb', color: AMBER,
            fontSize: '.66rem', fontWeight: 800,
            border: '1px solid #fde68a', cursor: 'help',
          }}
        >!</span>
      )}
      <div className="card-title">{label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-.01em' }}>
        {fmtShort(rea)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '.72rem', flexWrap: 'wrap' }}>
        {v.rs != null && (
          <span style={{ color: accent, fontWeight: 700 }}>
            {arrow} {fmtShort(Math.abs(v.rs))}
            {v.pct != null && <span style={{ marginLeft: 6, opacity: .85, fontWeight: 600 }}>· {fmtPct(v.pct)}</span>}
          </span>
        )}
        {v.rs != null && <span style={{ color: 'var(--muted2)' }}>vs orçado</span>}
      </div>
      {marginPct != null && (
        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: 4 }}>
          Margem <strong style={{ color: 'var(--text2)' }}>{fmtPct1(marginPct)}</strong>
        </div>
      )}
    </div>
  )
}

export default function DreKpiStrip({ data }) {
  const m = data?.margens
  if (!m) return null

  const luLiq = data.dre?.find(r => r.nome === 'Lucro Líquido')
  const pf    = m.ebitda_proforma

  const abatSub = abatimentosSubProvisionados(m)
  const abatCaveat = abatSub
    ? `Sem ${fmtShort(abatSub.gap)} de abatimentos (PIS/COFINS/ISS) lançados — ROL ≈ Receita Bruta`
    : null

  const ebitdaCaveat = pf
    ? `EBITDA Pro-forma considerando provisões: ${fmtShort(pf.ebitda_proforma)} (margem ${fmtPct1(pf.margem_ebitda_proforma_pct)})`
    : null

  const lucroLiqCaveat = pf
    ? `Não considera IR/CSLL/D&A (provisões pendentes ~${fmtShort(pf.ajuste_total_rs)})`
    : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
      <KpiCard
        label="Receita Bruta"
        rea={m.receita_bruta.realizado}
        orc={m.receita_bruta.orcado}
      />
      <KpiCard
        label="Receita Líquida"
        rea={m.receita_liquida.realizado}
        orc={m.receita_liquida.orcado}
        caveat={abatCaveat}
      />
      <KpiCard
        label="Lucro Bruto"
        rea={m.lucro_bruto.realizado}
        orc={m.lucro_bruto.orcado}
        marginPct={m.margem_bruta_pct.realizado}
      />
      <KpiCard
        label="EBITDA"
        rea={m.ebitda.realizado}
        orc={m.ebitda.orcado}
        marginPct={m.margem_ebitda_pct.realizado}
        caveat={ebitdaCaveat}
      />
      <KpiCard
        label="Lucro Líquido"
        rea={luLiq?.rea_q1}
        orc={luLiq?.orc_q1}
        caveat={lucroLiqCaveat}
      />
    </div>
  )
}
