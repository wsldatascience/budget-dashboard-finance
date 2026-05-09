import { useState, useMemo } from 'react'
import { fmtShort, fmtPct } from '../utils/fmt'

/**
 * What-if interativo para Q2: sliders ajustam o crescimento de receita e
 * despesas sobre o Q1 realizado. Cálculo client-side — nenhuma chamada ao
 * backend. O "cenário base" vem do forecast do ml_data.json como ponto de
 * comparação (valores que o pipeline projetou automaticamente).
 *
 * Filosofia: com apenas 3 pontos históricos, qualquer projeção automática
 * é indicativa. O valor está em deixar o CFO testar premissas explícitas,
 * não em prever o futuro.
 */
export default function WhatIfSimulator({ forecast }) {
  const recQ1  = forecast.receita.q1_total
  const despQ1 = forecast.despesas.q1_total
  const margemQ1 = recQ1 - despQ1

  // Baseline: o que o pipeline projetou automaticamente (% vs Q1)
  const baseRecPct  = ((forecast.receita.q2_previsto  - recQ1)  / Math.abs(recQ1))  * 100
  const baseDespPct = ((forecast.despesas.q2_previsto - despQ1) / Math.abs(despQ1)) * 100

  const [recPct,  setRecPct]  = useState(Math.round(baseRecPct * 10) / 10)
  const [despPct, setDespPct] = useState(Math.round(baseDespPct * 10) / 10)

  const sim = useMemo(() => {
    const rec2  = recQ1  * (1 + recPct  / 100)
    const desp2 = despQ1 * (1 + despPct / 100)
    const marg2 = rec2 - desp2
    return {
      receita:  rec2,
      despesas: desp2,
      margem:   marg2,
      margemDeltaPct: ((marg2 - margemQ1) / Math.abs(margemQ1)) * 100,
    }
  }, [recPct, despPct, recQ1, despQ1, margemQ1])

  function reset() {
    setRecPct(Math.round(baseRecPct * 10) / 10)
    setDespPct(Math.round(baseDespPct * 10) / 10)
  }

  const margemPos  = sim.margem >= 0
  const margemBetterThanQ1 = sim.margem >= margemQ1

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>What-if Q2 · Simulador interativo</h2>
          <p style={{ color: 'var(--muted)', fontSize: '.76rem', marginTop: 3 }}>
            Ajuste o crescimento vs Q1 e veja o impacto na margem.
            Cálculo instantâneo, sem servidor.
          </p>
        </div>
        <button
          onClick={reset}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 7, padding: '6px 12px',
            fontSize: '.74rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          ↻ voltar ao forecast
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 18 }}>
        <SliderBlock
          label="Receita Q2 vs Q1"
          color="var(--teal)"
          value={recPct}
          onChange={setRecPct}
          min={-30} max={30} step={0.5}
          baseline={baseRecPct}
          absLabel={fmtShort(sim.receita)}
          subtitle={`Q1 realizado: ${fmtShort(recQ1)}`}
        />
        <SliderBlock
          label="Despesas Q2 vs Q1"
          color="var(--red)"
          value={despPct}
          onChange={setDespPct}
          min={-30} max={30} step={0.5}
          baseline={baseDespPct}
          absLabel={fmtShort(sim.despesas)}
          subtitle={`Q1 realizado: ${fmtShort(despQ1)}`}
          invertColor
        />
      </div>

      {/* Margem resultado */}
      <div style={{
        background: margemPos ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
        border: `1px solid ${margemPos ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>
            Margem operacional Q2 (simulada)
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: margemPos ? 'var(--green)' : 'var(--red)', letterSpacing: '-.02em' }}>
              {fmtShort(sim.margem)}
            </span>
            <span style={{ fontSize: '.78rem', color: margemBetterThanQ1 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {margemBetterThanQ1 ? '▲' : '▼'} {fmtPct(sim.margemDeltaPct)} vs Q1
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '.72rem', color: 'var(--muted)' }}>
          <div>Q1 realizado · <strong style={{ color: 'var(--text)' }}>{fmtShort(margemQ1)}</strong></div>
          <div>Forecast base · <strong style={{ color: 'var(--text)' }}>{fmtShort(forecast.margem.q2_prevista)}</strong></div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: '.68rem', color: 'var(--muted2)' }}>
        Sim.: Receita {fmtShort(sim.receita)} · Despesas {fmtShort(sim.despesas)} · {fmtShort(sim.receita - sim.despesas)} margem ·
        {' '}{fmtPct(recPct)} rec / {fmtPct(despPct)} desp vs Q1
      </div>
    </div>
  )
}

function SliderBlock({ label, color, value, onChange, min, max, step, baseline, absLabel, subtitle, invertColor }) {
  // Para despesas, subir = ruim (vermelho); para receita, subir = bom (verde)
  const sign = invertColor ? -Math.sign(value) : Math.sign(value)
  const directionColor = sign > 0 ? 'var(--green)' : sign < 0 ? 'var(--red)' : 'var(--muted)'
  const pctFromBase = value - baseline

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: '.78rem', color: 'var(--text2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '.88rem', fontWeight: 700, color: directionColor, fontVariantNumeric: 'tabular-nums' }}>
          {fmtPct(value)}
        </span>
      </div>

      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
          cursor: 'pointer',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', color: 'var(--muted)', marginTop: 4 }}>
        <span>{min}%</span>
        <span>
          Base <strong style={{ color: 'var(--text2)' }}>{fmtPct(baseline)}</strong>
          {Math.abs(pctFromBase) > 0.1 && (
            <span style={{ marginLeft: 6, color: directionColor, fontWeight: 600 }}>
              ({pctFromBase > 0 ? '+' : ''}{pctFromBase.toFixed(1)}pp)
            </span>
          )}
        </span>
        <span>{max}%</span>
      </div>

      <div style={{ marginTop: 8, fontSize: '.74rem', color: 'var(--muted)' }}>
        {subtitle} → <strong style={{ color: color, fontSize: '.86rem' }}>{absLabel}</strong>
      </div>
    </div>
  )
}
