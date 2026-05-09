/**
 * KPI calculation functions for the FP&A dashboard.
 * All functions accept the full dashboard_data.json object.
 */

/** Core KPIs: Receita, Despesa, Margem */
export function getKPIs(data) {
  const rec  = data.receita.summary
  const desp = data.summary

  const receitaOrcada    = rec.receita_bruta_orcada
  const receitaRealizada = rec.receita_bruta_realizada
  const despesaOrcada    = desp.total_orcado
  const despesaRealizada = desp.total_realizado
  const margemOrcada     = receitaOrcada - despesaOrcada
  const margemRealizada  = receitaRealizada - despesaRealizada
  const variacaoMargem   = margemRealizada - margemOrcada
  const variacaoMargemPct = margemOrcada !== 0
    ? (variacaoMargem / Math.abs(margemOrcada)) * 100
    : 0

  return {
    receitaOrcada,
    receitaRealizada,
    receitaVar:    rec.variacao_rs,
    receitaVarPct: rec.variacao_pct,
    despesaOrcada,
    despesaRealizada,
    despesaVar:    desp.variacao_rs,
    despesaVarPct: desp.variacao_pct,
    margemOrcada,
    margemRealizada,
    variacaoMargem,
    variacaoMargemPct,
  }
}

/** Monthly expense evolution — orcado, realizado, variação % */
export function getMonthly(data) {
  return data.monthly.map(m => ({
    mes:          m.mes,
    orcado:       m.orcado,
    realizado:    m.realizado,
    variacao_rs:  m.variacao_rs,
    variacao_pct: m.variacao_pct,
  }))
}

// Level 2 grupo → Level 1 parent
const GROUP_LEVEL1 = {
  'Honorários Médicos':      'Custo dos Serviços (CSP)',
  'Pessoal de Produção':     'Custo dos Serviços (CSP)',
  'Insumos Assistenciais':   'Custo dos Serviços (CSP)',
  'Pessoal Administrativo':  'Despesas Operacionais',
  'Serviços de Terceiros':   'Despesas Operacionais',
  'Infraestrutura':          'Despesas Operacionais',
  'Materiais de Consumo':    'Despesas Operacionais',
  'Utilidades e Serviços':   'Despesas Operacionais',
  'Manutenção e Reparos':    'Despesas Operacionais',
  'Manutenção de Veículos':  'Despesas Operacionais',
  'Despesas Diversas':       'Despesas Operacionais',
  'Depreciação e Amortização': 'Depreciação e Amortização',
}

const LEVEL1_ORDER = ['Custo dos Serviços (CSP)', 'Despesas Operacionais', 'Depreciação e Amortização']

/** Two-level cost structure: Level 1 (CSP / Desp. Op. / D&A) → Level 2 (DRE sub-sections) → accounts */
export function getCostCenters(data) {
  const allContas = data.all_contas || []
  const l1Map = {}

  for (const g of data.by_group) {
    const parent = GROUP_LEVEL1[g.grupo]
    if (!parent) continue
    if (!l1Map[parent]) l1Map[parent] = { macroCentro: parent, orcado: 0, realizado: 0, subGrupos: [] }
    const l1 = l1Map[parent]
    l1.orcado    += g.orcado
    l1.realizado += g.realizado
    l1.subGrupos.push({
      nome:         g.grupo,
      orcado:       g.orcado,
      realizado:    g.realizado,
      variacao_rs:  g.variacao_rs,
      variacao_pct: g.variacao_pct,
      contas: allContas
        .filter(c => c.grupo === g.grupo && (c.orc_q1 !== 0 || c.rea_q1 !== 0))
        .map(c => ({
          nome: c.nome_conta, cod: c.cod_conta,
          orcado: c.orc_q1, realizado: c.rea_q1,
          variacao_rs: c.var_rs, variacao_pct: c.var_pct,
        }))
        .sort((a, b) => Math.abs(b.variacao_rs) - Math.abs(a.variacao_rs)),
    })
  }

  return LEVEL1_ORDER
    .filter(name => l1Map[name])
    .map(name => {
      const l1 = l1Map[name]
      const varRs  = l1.realizado - l1.orcado
      const varPct = l1.orcado !== 0 ? (varRs / Math.abs(l1.orcado)) * 100 : 0
      l1.subGrupos.sort((a, b) => b.variacao_rs - a.variacao_rs)
      return { ...l1, variacao_rs: Math.round(varRs * 100) / 100, variacao_pct: Math.round(varPct * 100) / 100 }
    })
}

/** Top N accounts by absolute variance (default 5) */
export function getTopVariances(data, n = 5) {
  return [...data.all_contas]
    .filter(c => c.orc_q1 !== 0)
    .map(c => ({
      categoria:    c.nome_conta,
      cod_conta:    c.cod_conta,
      macroCentro:  c.grupo,
      orcado:       c.orc_q1,
      realizado:    c.rea_q1,
      variacao_rs:  c.var_rs,
      variacao_pct: c.var_pct,
      tipo:         c.var_rs < 0 ? 'Economia' : 'Estouro',
    }))
    .sort((a, b) => Math.abs(b.variacao_rs) - Math.abs(a.variacao_rs))
    .slice(0, n)
}

/**
 * Threshold único: "abatimentos não foram lançados" se o realizado é < 10%
 * do orçado. Usado em múltiplos lugares (DreTable caveats, DreKpiStrip card).
 * Concentrar a regra evita divergência entre componentes.
 */
export function abatimentosSubProvisionados(margens) {
  const a = margens?.abatimentos
  if (!a || !(a.orcado > 0)) return null
  if (a.realizado >= a.orcado * 0.1) return null
  const gap = a.orcado - a.realizado
  return { gap, orcado: a.orcado, realizado: a.realizado }
}

/** Margens & EBITDA — orçado vs realizado e variação em p.p. */
export function getMargens(data) {
  const m = data.margens
  if (!m) return null

  const deltaPP = (a, b) => (a == null || b == null) ? null : +(a - b).toFixed(2)

  return {
    receitaLiquida: m.receita_liquida,
    custoServicos:  m.custo_servicos,
    lucroBruto:     m.lucro_bruto,
    despesasOperacionais: m.despesas_operacionais,
    ebitda:         m.ebitda,
    margemBruta:    m.margem_bruta_pct,
    margemOperacional: m.margem_operacional_pct,
    margemEbitda:   m.margem_ebitda_pct,
    deltas: {
      margemBruta:       deltaPP(m.margem_bruta_pct.realizado,       m.margem_bruta_pct.orcado),
      margemOperacional: deltaPP(m.margem_operacional_pct.realizado, m.margem_operacional_pct.orcado),
      margemEbitda:      deltaPP(m.margem_ebitda_pct.realizado,      m.margem_ebitda_pct.orcado),
    },
  }
}

/** Executive insights: best/worst center, trend, total savings, recommendation */
export function getInsights(data) {
  const centers = getCostCenters(data)
  const monthly = getMonthly(data)

  const withPct    = centers.filter(c => c.orcado > 0)
  const melhorCentro = withPct.length
    ? withPct.reduce((a, b) => a.variacao_pct < b.variacao_pct ? a : b)
    : null
  const piorCentro = withPct.length
    ? withPct.reduce((a, b) => a.variacao_pct > b.variacao_pct ? a : b)
    : null

  // Trend: compare Jan vs Mar variance (< 0.5pp difference = stable)
  const janVar = monthly[0]?.variacao_pct ?? 0
  const marVar = monthly[monthly.length - 1]?.variacao_pct ?? 0
  const diff = marVar - janVar
  const tendencia = Math.abs(diff) < 0.5 ? 'Estável'
    : diff > 0 ? 'Deteriorando' : 'Melhorando'

  const economiaTotal = centers.reduce(
    (sum, c) => c.variacao_rs < 0 ? sum + c.variacao_rs : sum, 0
  )

  let recomendacao
  if (piorCentro && piorCentro.variacao_pct > 5) {
    recomendacao = `Atenção: ${piorCentro.macroCentro} está ${piorCentro.variacao_pct.toFixed(1)}% acima do orçado. Revisar causas e projeção para Q2.`
  } else if (melhorCentro && melhorCentro.variacao_pct < -10) {
    recomendacao = `Oportunidade: ${melhorCentro.macroCentro} com economia de ${Math.abs(melhorCentro.variacao_pct).toFixed(1)}%. Verificar se é postergação ou ganho real.`
  } else {
    recomendacao = 'Execução orçamentária dentro dos limites esperados para o período.'
  }

  return { melhorCentro, piorCentro, tendencia, economiaTotal, recomendacao }
}
