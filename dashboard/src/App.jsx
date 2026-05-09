import { useState } from 'react'
import { useData } from './hooks/useData'
import { useMlData } from './hooks/useMlData'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/LoginScreen'
import NarrativePanel from './components/NarrativePanel'
import MonthlyComboChart from './components/MonthlyComboChart'
import CostCentersPanel from './components/CostCentersPanel'
import TopVariancesPanel from './components/TopVariancesPanel'
import InsightsGrid from './components/InsightsGrid'
import ReceitaKpiCards from './components/ReceitaKpiCards'
import { ReceitaMensalChart, ReceitaConvenioChart, ReceitaGrupoChart } from './components/ReceitaCharts'
import ReceitaDreTable from './components/ReceitaDreTable'
import ContaTable from './components/ContaTable'
import AlertsPanel from './components/AlertsPanel'
import ForecastChart from './components/ForecastChart'
import ForecastKpis from './components/ForecastKpis'
import WhatIfSimulator from './components/WhatIfSimulator'
import AnomaliesTable from './components/AnomaliesTable'
import ClustersPanel from './components/ClustersPanel'
import RiskPanel from './components/RiskPanel'
import DreTable from './components/DreTable'
import MargensPanel from './components/MargensPanel'
import EbitdaProformaPanel from './components/EbitdaProformaPanel'
import ConcentracaoPanel from './components/ConcentracaoPanel'
import DreKpiStrip from './components/DreKpiStrip'
import { fmtShort, fmtBRL, fmtPct } from './utils/fmt'
import { getKPIs } from './utils/kpis'

// ── Layout primitives ─────────────────────────────────────────────────────────
function Page({ children }) {
  return (
    <div style={{ maxWidth: 1520, margin: '0 auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {children}
    </div>
  )
}

function SectionTitle({ label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '.1em', whiteSpace: 'nowrap' }}>{label}</span>
        {sub && <div style={{ fontSize: '.65rem', color: 'var(--muted2)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  )
}

// ── Sub-navigation strip ──────────────────────────────────────────────────────
function SubNav({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'inline-flex',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 4,
      gap: 2,
    }}>
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            background: active === t.id
              ? 'linear-gradient(135deg, #0A2540 0%, #122E50 100%)'
              : 'none',
            border: active === t.id ? '1px solid rgba(80,140,210,0.2)' : '1px solid transparent',
            cursor: 'pointer',
            padding: '8px 22px',
            borderRadius: 8,
            fontSize: '.85rem',
            fontWeight: active === t.id ? 600 : 400,
            color: active === t.id ? '#E4ECFA' : 'var(--muted)',
            transition: 'all .15s',
            whiteSpace: 'nowrap',
            letterSpacing: '.01em',
            boxShadow: active === t.id ? '0 2px 12px rgba(0,0,0,.3)' : 'none',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Header ────────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: 'dashboard',    label: 'Resumo Executivo' },
  { id: 'analise',      label: 'Despesas' },
  { id: 'receita',      label: 'Receita' },
  { id: 'dre',          label: 'DRE' },
  { id: 'inteligencia', label: 'Inteligência IA' },
]

function Header({ view, onView, empresa, periodo, onLogout }) {
  const title = NAV_TABS.find(t => t.id === view)?.label ?? ''

  return (
    <div style={{
      background: 'linear-gradient(180deg, #0A1525 0%, #060C1A 100%)',
      borderBottom: '1px solid rgba(80,120,200,0.12)',
      color: '#fff',
      padding: '0 36px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 24px rgba(0,0,0,.4)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 0 12px' }}>
        <div>
          <div style={{ fontSize: '.65rem', color: 'rgba(255,255,255,.28)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
            FP&amp;A Analytics · {empresa} · {periodo}
          </div>
          <h1 style={{ color: '#E4ECFA', fontSize: '1.55rem', fontWeight: 700, margin: 0, letterSpacing: '-.02em', fontFamily: "'Outfit', sans-serif" }}>
            {title}
          </h1>
        </div>
        <button
          onClick={onLogout}
          style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: 'rgba(255,255,255,.45)', borderRadius: 8, padding: '7px 16px', fontSize: '.8rem', fontWeight: 500, cursor: 'pointer', letterSpacing: '.02em', transition: 'all .15s' }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,.09)'; e.target.style.color = 'rgba(255,255,255,.7)' }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,.05)'; e.target.style.color = 'rgba(255,255,255,.45)' }}
        >
          Sair
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,.05)' }}>
        {NAV_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onView(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 22px',
              fontSize: '.87rem', fontWeight: view === t.id ? 600 : 400,
              color: view === t.id ? '#E4ECFA' : 'rgba(255,255,255,.35)',
              borderBottom: `2px solid ${view === t.id ? '#0FD98A' : 'transparent'}`,
              marginBottom: -1, transition: 'all .15s',
              letterSpacing: '.01em',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Hero card ────────────────────────────────────────────────────────────────
function getUrgency(data) {
  const monthly = data?.monthly ?? []
  if (monthly.length === 0) return null
  const worstMonth = [...monthly].sort((a, b) => (b.variacao_pct ?? 0) - (a.variacao_pct ?? 0))[0]
  const trendDelta = monthly.length >= 2
    ? (monthly[monthly.length - 1].variacao_pct ?? 0) - (monthly[0].variacao_pct ?? 0)
    : 0
  const trendDirection = trendDelta > 0.5 ? 'up' : trendDelta < -0.5 ? 'down' : 'flat'
  const topOverrun = data?.ranking_above?.[0] ?? null
  return { worstMonth, trendDirection, trendDelta, topOverrun }
}

/* Célula da equação: Receita − Despesas = Margem */
function EqCell({ label, value, orcado, varPct, pos, highlight }) {
  const col       = pos ? '#0FD98A' : '#FF4E5B'
  const hasOrcado = orcado != null && orcado > 0 && varPct != null
  return (
    <div style={{
      background: highlight ? 'rgba(80,120,200,0.07)' : 'var(--surface2)',
      border: highlight ? '1px solid rgba(80,120,200,0.18)' : '1px solid var(--border2)',
      borderRadius: 10, padding: '12px 14px', textAlign: 'center',
    }}>
      <div className="card-title" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: hasOrcado && highlight ? col : 'var(--text)', fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums', marginBottom: hasOrcado ? 5 : 0, lineHeight: 1 }}>
        {fmtShort(value)}
      </div>
      {hasOrcado ? (
        <>
          <div style={{ fontSize: '.67rem', fontWeight: 700, color: col, marginBottom: 3 }}>
            {pos ? '▲' : '▼'} {fmtPct(Math.abs(varPct))} vs orç.
          </div>
          <div style={{ fontSize: '.63rem', color: 'var(--muted2)', fontFamily: "'DM Mono', monospace" }}>
            Orç. {fmtShort(orcado)}
          </div>
        </>
      ) : (
        <div style={{ fontSize: '.63rem', color: 'var(--muted2)', fontStyle: 'italic', marginTop: 6 }}>
          sem orçamento
        </div>
      )}
    </div>
  )
}

function ResultadoHero({ kpis, data, onAnalise }) {
  const pos    = kpis.variacaoMargemPct >= 0
  const recPos = kpis.receitaVarPct != null ? kpis.receitaVarPct >= 0 : null
  const dspPos = kpis.despesaVarPct <= 0
  const urgency = getUrgency(data)

  const gapAbs = Math.abs(kpis.variacaoMargem)
  const verdictLabel = pos ? 'Resultado acima do orçado' : 'Resultado abaixo do orçado'
  const verdictSub   = pos
    ? `Margem superior ao planejado em ${fmtShort(gapAbs)} no trimestre`
    : `Custos cresceram mais rápido que a receita — gap de ${fmtShort(gapAbs)} vs orçado`

  const trendDir = urgency?.trendDirection
  const worstOver = (urgency?.worstMonth?.variacao_pct ?? 0) > 0

  return (
    <div className="card" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

      {/* ── Título + CTA ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="card-title">Resultado Operacional · Q1 2025</div>
        <button
          onClick={onAnalise}
          style={{ background: 'rgba(80,140,210,0.1)', color: 'var(--teal)', border: '1px solid rgba(0,194,212,0.2)', borderRadius: 8, padding: '7px 16px', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,194,212,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(80,140,210,0.1)' }}
        >
          Análise detalhada →
        </button>
      </div>

      {/* ── Veredito ── */}
      <div style={{
        padding: '14px 18px', borderRadius: 10,
        background: pos ? 'rgba(15,217,138,.06)' : 'rgba(255,78,91,.06)',
        border: `1px solid ${pos ? 'rgba(15,217,138,.18)' : 'rgba(255,78,91,.18)'}`,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: pos ? 'rgba(15,217,138,.12)' : 'rgba(255,78,91,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', color: pos ? '#0FD98A' : '#FF4E5B',
        }}>
          {pos ? '✓' : '!'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '.82rem', fontWeight: 700, color: pos ? '#0FD98A' : '#FF4E5B', marginBottom: 3 }}>{verdictLabel}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{verdictSub}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: pos ? '#0FD98A' : '#FF4E5B', fontFamily: "'DM Mono', monospace", lineHeight: 1, letterSpacing: '-.02em' }}>
            {fmtShort(kpis.margemRealizada)}
          </div>
          <div style={{ fontSize: '.65rem', color: 'var(--muted2)', fontFamily: "'DM Mono', monospace", marginTop: 3 }}>
            Orç. {fmtShort(kpis.margemOrcada)}
          </div>
        </div>
      </div>

      {/* ── Equação: Receita − Despesas = Margem ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 20px 1fr 20px 1fr', gap: 6, alignItems: 'center' }}>
        <EqCell label="Receita"   value={kpis.receitaRealizada}  orcado={kpis.receitaOrcada}  varPct={kpis.receitaVarPct}       pos={recPos} />
        <div style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--muted2)', fontWeight: 300 }}>−</div>
        <EqCell label="Despesas"  value={kpis.despesaRealizada}  orcado={kpis.despesaOrcada}  varPct={kpis.despesaVarPct}       pos={dspPos} />
        <div style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--muted2)', fontWeight: 300 }}>=</div>
        <EqCell label="Margem"    value={kpis.margemRealizada}   orcado={kpis.margemOrcada}   varPct={kpis.variacaoMargemPct}   pos={pos}    highlight />
      </div>

      {/* ── Sinal de ação ── */}
      {urgency && (
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 0, flexWrap: 'wrap' }}>
          {urgency.worstMonth && (
            <div style={{ flex: '1 1 120px', paddingRight: 16, borderRight: '1px solid var(--border)' }}>
              <div className="card-title" style={{ marginBottom: 3 }}>Pior mês</div>
              <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)' }}>{urgency.worstMonth.mes}</span>
              <span style={{ fontSize: '.78rem', fontWeight: 700, color: worstOver ? '#FF4E5B' : '#0FD98A', marginLeft: 6 }}>
                {fmtPct(urgency.worstMonth.variacao_pct)} vs orç.
              </span>
            </div>
          )}
          <div style={{ flex: '1 1 160px', padding: '0 16px', borderRight: urgency.topOverrun ? '1px solid var(--border)' : 'none' }}>
            <div className="card-title" style={{ marginBottom: 3 }}>Tendência</div>
            <span style={{ fontSize: '.8rem', fontWeight: 700, color: trendDir === 'up' ? '#FF4E5B' : trendDir === 'down' ? '#0FD98A' : 'var(--muted)' }}>
              {trendDir === 'up' ? 'Custos crescendo' : trendDir === 'down' ? 'Custos caindo' : 'Custos estáveis'}
            </span>
          </div>
          {urgency.topOverrun && (
            <div style={{ flex: '2 1 180px', paddingLeft: 16, minWidth: 0 }}>
              <div className="card-title" style={{ marginBottom: 3 }}>Maior estouro</div>
              <span style={{ fontSize: '.8rem', fontWeight: 700, color: '#FF4E5B', marginRight: 6 }}>{fmtShort(urgency.topOverrun.variacao_rs)}</span>
              <span style={{ fontSize: '.76rem', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: '60%', verticalAlign: 'bottom' }} title={urgency.topOverrun.nome_conta}>
                {urgency.topOverrun.nome_conta}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Dashboard view ─────────────────────────────────────────────────────────────
// Sub: "Resultado Q1" | "Margens & Concentração"
function DashboardView({ data, onAnalise }) {
  const [sub, setSub] = useState('resultado')
  const kpis = getKPIs(data)

  return (
    <Page>
      <SubNav
        tabs={[
          { id: 'resultado', label: 'Resultado Q1' },
          { id: 'margens',   label: 'Margens & Concentração' },
        ]}
        active={sub}
        onChange={setSub}
      />

      {sub === 'resultado' && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'stretch' }}>
          <ResultadoHero kpis={kpis} data={data} onAnalise={onAnalise} />
          <MonthlyComboChart data={data.monthly} />
        </div>
      )}

      {sub === 'margens' && (
        <>
          <ConcentracaoPanel data={data} />
          <MargensPanel data={data} />
          <EbitdaProformaPanel data={data} />
        </>
      )}
    </Page>
  )
}

// ── Despesas Summary card ─────────────────────────────────────────────────────
function DespesasSummary({ kpis, data }) {
  const over    = kpis.despesaVar > 0
  const col     = over ? '#FF4E5B' : '#0FD98A'
  const execPct = kpis.despesaOrcada > 0 ? (kpis.despesaRealizada / kpis.despesaOrcada) * 100 : 0
  const fill    = Math.min(execPct, 100)

  const contasAcima = (data.all_contas ?? []).filter(c => c.orc_q1 > 0 && c.var_rs > 0).length
  const contasTotal = (data.all_contas ?? []).filter(c => c.orc_q1 > 0).length

  const varSign = kpis.despesaVar > 0 ? '+' : ''

  return (
    <div className="card" style={{ padding: '20px 26px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>

        {/* ── Bloco principal ── */}
        <div style={{ flex: '1 1 320px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Despesas Q1 2025</div>
            <span style={{
              fontSize: '.68rem', fontWeight: 700, fontFamily: "'DM Mono', monospace",
              color: col,
              background: over ? 'rgba(255,78,91,.1)' : 'rgba(15,217,138,.1)',
              padding: '2px 9px', borderRadius: 20,
            }}>
              {over ? '▲' : '▼'} {fmtPct(Math.abs(kpis.despesaVarPct))} vs orçado
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: col, letterSpacing: '-.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: "'DM Mono', monospace" }}>
              {fmtShort(kpis.despesaRealizada)}
            </span>
            <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: "'DM Mono', monospace" }}>
              de {fmtShort(kpis.despesaOrcada)} orçados
            </span>
          </div>

          {/* Barra de execução */}
          <div style={{ marginBottom: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: '.60rem', color: 'var(--muted2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em' }}>Execução orçamentária</span>
              <span style={{ fontSize: '.68rem', fontWeight: 700, color: col, fontFamily: "'DM Mono', monospace" }}>{execPct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(80,120,200,0.12)', borderRadius: 4 }}>
              <div style={{ width: `${fill}%`, height: '100%', background: col, borderRadius: 4, opacity: .85, transition: 'width .4s ease' }} />
            </div>
          </div>
        </div>

        {/* ── Mini métricas ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: '0 0 auto' }}>
          {[
            {
              label: 'Variação R$',
              value: `${varSign}${fmtShort(kpis.despesaVar)}`,
              color: col,
            },
            {
              label: 'Contas acima do orçado',
              value: `${contasAcima} de ${contasTotal}`,
              color: contasAcima > 0 ? '#FF4E5B' : '#0FD98A',
            },
            {
              label: 'Margem operacional',
              value: fmtShort(kpis.margemRealizada),
              color: kpis.margemRealizada >= kpis.margemOrcada ? '#0FD98A' : '#FF4E5B',
            },
            {
              label: 'Execução sobre orçado',
              value: `${execPct.toFixed(1)}%`,
              color: col,
            },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--surface2)', borderRadius: 9, padding: '10px 13px', border: '1px solid var(--border2)' }}>
              <div className="card-title" style={{ marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: '.92rem', fontWeight: 700, color: m.color, fontFamily: "'DM Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

// ── Análise de Despesas ────────────────────────────────────────────────────────
// Sub: "Visão Geral" | "Contas"
function AnaliseView({ data, initialSearch = '' }) {
  const [sub, setSub] = useState(initialSearch ? 'contas' : 'geral')
  const [centroFilter, setCentroFilter] = useState('all')
  const [search, setSearch] = useState(initialSearch)
  const kpis = getKPIs(data)

  function handleExport() {
    const rows = data.all_contas.map(c =>
      [c.cod_conta, c.nome_conta, c.grupo, c.orc_q1, c.rea_q1, c.var_rs, c.var_pct].join(';')
    )
    const csv = ['Codigo;Conta;Grupo;Orcado Q1;Realizado Q1;Variacao RS;Variacao Pct', ...rows].join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = 'analise_q1_2025.csv'
    a.click()
  }

  const filteredContas = data.all_contas.filter(c => {
    const mc = centroFilter === 'all' || c.grupo === centroFilter
    const ms = !search || c.nome_conta.toLowerCase().includes(search.toLowerCase()) || c.cod_conta.includes(search)
    return mc && ms
  })

  const centers = [...new Set(data.by_group.map(g => g.grupo))].sort()

  return (
    <Page>
      <SubNav
        tabs={[
          { id: 'geral',  label: 'Visão Geral' },
          { id: 'contas', label: 'Contas & Desvios' },
        ]}
        active={sub}
        onChange={setSub}
      />

      {sub === 'geral' && (
        <>
          <DespesasSummary kpis={kpis} data={data} />
          <MonthlyComboChart data={data.monthly} />
          <CostCentersPanel data={data} />
        </>
      )}

      {sub === 'contas' && (
        <>
          <TopVariancesPanel data={data} n={5} />
          <ContaTable data={data.all_contas} onExport={handleExport} />
          <AlertsPanel quality={data.quality} />
        </>
      )}
    </Page>
  )
}

// ── Receita ───────────────────────────────────────────────────────────────────
// Sub: "Visão Geral" | "Convênios & Contas DRE"
function ReceitaView({ data }) {
  const [sub, setSub] = useState('geral')

  return (
    <Page>
      <SubNav
        tabs={[
          { id: 'geral',    label: 'Visão Geral' },
          { id: 'convenios', label: 'Convênios & Contas DRE' },
        ]}
        active={sub}
        onChange={setSub}
      />

      {sub === 'geral' && (
        <>
          <ReceitaKpiCards data={data} />
          <div className="grid-2">
            <ReceitaMensalChart summary={data.receita.summary} />
            <ReceitaGrupoChart  data={data.receita.by_grupo} />
          </div>
        </>
      )}

      {sub === 'convenios' && (
        <>
          <ReceitaConvenioChart data={data.receita.by_convenio} />
          <ReceitaDreTable      data={data.receita.dre_accounts} />
        </>
      )}
    </Page>
  )
}

// ── DRE ───────────────────────────────────────────────────────────────────────
function DreView({ data }) {
  return (
    <Page>
      <DreKpiStrip data={data} />
      <DreTable rows={data.dre} data={data} />
    </Page>
  )
}

// ── Inteligência IA ────────────────────────────────────────────────────────────
// Sub: "Diagnóstico IA" | "Previsão Q2" | "Anomalias & Risco"
function IntelView({ auth, data }) {
  const [sub, setSub] = useState('diagnostico')
  const { data: ml, loading, error, retry } = useMlData(auth?.header)

  if (loading) return (
    <Page>
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--muted)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚙️</div>
        Carregando modelos de inteligência…
      </div>
    </Page>
  )
  if (error) return (
    <Page>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 80 }}>
        <span style={{ color: 'var(--red)', fontSize: '.9rem', textAlign: 'center', maxWidth: 380 }}>{error}</span>
        <button onClick={retry} style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    </Page>
  )

  return (
    <Page>
      {/* Intro banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f1c3c 0%, #1a3a6c 100%)',
        borderRadius: 14,
        padding: '24px 32px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 24,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 6 }}>
            Central de Inteligência Analítica
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-.01em' }}>
            Análise Preditiva & Diagnóstico IA
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {[
            { label: 'Narrativa IA', color: '#10b981' },
            { label: 'Previsão Q2',  color: '#6366f1' },
            { label: 'Anomalias',    color: '#f59e0b' },
            { label: 'Segmentação',  color: '#0ea5e9' },
          ].map(({ label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', borderRadius: 20, padding: '5px 12px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: '.74rem', color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <SubNav
        tabs={[
          { id: 'diagnostico', label: 'Diagnóstico IA' },
          { id: 'previsao',    label: 'Previsão Q2' },
          { id: 'anomalias',   label: 'Anomalias & Risco' },
        ]}
        active={sub}
        onChange={setSub}
      />

      {sub === 'diagnostico' && (
        <>
          <NarrativePanel authHeader={auth?.header} accounts={data.all_contas} onDrillDown={null} />
          <div className="card" style={{ padding: '28px 32px' }}>
            <InsightsGrid data={data} />
          </div>
        </>
      )}

      {sub === 'previsao' && (
        <>
          <ForecastChart series={ml.forecast.series_mensal} />
          <ForecastKpis forecast={ml.forecast} />
          <SectionTitle label="Simulador What-If" sub="Ajuste premissas de receita e despesa para Q2" />
          <WhatIfSimulator forecast={ml.forecast} />
        </>
      )}

      {sub === 'anomalias' && (
        <>
          <AnomaliesTable anomalias={ml.anomalias} />
          <ClustersPanel clusters={ml.clusters} />
          <RiskPanel risco={ml.risco} />
          <div style={{ fontSize: '.72rem', color: 'var(--muted2)', textAlign: 'center', paddingBottom: 4 }}>
            {ml.modelo?.observacao} · Gerado em {new Date(ml.generated_at).toLocaleDateString('pt-BR')}
          </div>
        </>
      )}
    </Page>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { auth, login, logout } = useAuth()
  const { data, loading, error, retry } = useData(auth?.header)
  const [view, setView] = useState('dashboard')
  const [drillSearch, setDrillSearch] = useState('')

  function handleDrillDown(cod) {
    setDrillSearch(String(cod))
    setView('analise')
  }

  function handleViewChange(v) {
    if (v !== 'analise') setDrillSearch('')
    setView(v)
  }

  if (!auth) return <LoginScreen onLogin={login} />

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--muted)', background: 'var(--bg)', fontSize: '.9rem' }}>
      Carregando dados…
    </div>
  )
  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, height: '100vh', background: 'var(--bg)' }}>
      <span style={{ color: 'var(--red)', fontSize: '.9rem', maxWidth: 420, textAlign: 'center' }}>{error}</span>
      <button onClick={retry} style={{ background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: '.82rem', fontWeight: 600, cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header view={view} onView={handleViewChange} empresa={data.empresa} periodo={data.periodo} onLogout={logout} />
      {view === 'dashboard'    && <DashboardView data={data} onAnalise={() => setView('analise')} />}
      {view === 'analise'      && <AnaliseView   data={data} initialSearch={drillSearch} />}
      {view === 'receita'      && <ReceitaView   data={data} />}
      {view === 'dre'          && <DreView       data={data} />}
      {view === 'inteligencia' && <IntelView     auth={auth} data={data} />}
    </div>
  )
}
