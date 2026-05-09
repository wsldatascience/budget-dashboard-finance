const BRL  = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const NUM  = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const NUM1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const INT  = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

// Tipografia financeira: usar U+2212 (sinal de menos) em vez de U+002D (hífen-menos).
const MINUS = '−'

export const fmtBRL = v => BRL.format(v ?? 0)
export const fmtNum = v => NUM.format(v ?? 0)

/** Variação percentual com sinal, 2 casas (norma contábil): +13,60% / −2,92% */
export const fmtPct = v => {
  if (v == null) return '—'
  if (v > 0) return `+${NUM.format(v)}%`
  if (v < 0) return `${MINUS}${NUM.format(Math.abs(v))}%`
  return `${NUM.format(0)}%`
}

/** Percentual absoluto (sem sinal), 2 casas — para frases descritivas */
export const fmtPctAbs = v => v == null ? '—' : `${NUM.format(Math.abs(v))}%`

/** Percentual sem sinal, 1 casa, vírgula pt-BR: 22,8% (margens) */
export const fmtPct1 = v => v == null ? '—' : `${NUM1.format(v)}%`

/** Variação em pontos percentuais: +10,80 p.p. / −2,50 p.p. */
export const fmtPP = v => {
  if (v == null) return '—'
  if (v > 0) return `+${NUM.format(v)} p.p.`
  if (v < 0) return `${MINUS}${NUM.format(Math.abs(v))} p.p.`
  return `${NUM.format(0)} p.p.`
}

/** Inteiro pt-BR (HHI, contagens): 4.153 */
export const fmtInt = v => v == null ? '—' : INT.format(v)

/** Valor monetário completo: R$ 2.534.892,43  /  −R$ 167.378,06 */
export function fmtShort(v) {
  if (v == null) return '—'
  if (v < 0) return `${MINUS}${BRL.format(Math.abs(v))}`
  return BRL.format(v)
}

/** Valor monetário com sinal explícito: +R$ 2.534.892,43  /  −R$ 167.378,06 */
export function fmtShortSigned(v) {
  if (v == null) return '—'
  if (v > 0) return `+${BRL.format(v)}`
  if (v < 0) return `${MINUS}${BRL.format(Math.abs(v))}`
  return BRL.format(0)
}

/** Alias — antes era variante com ponto decimal para KPI cards; agora idêntico a fmtShort */
export const fmtShortDot = fmtShort

/**
 * Convenção contábil brasileira: negativos em parênteses, sem sinal de menos.
 *   1.998.066,27  → "R$ 1.998.066,27"
 *  -167.378,06    → "(R$ 167.378,06)"
 *   null          → "—"
 */
export function fmtBRLAcct(v) {
  if (v == null) return '—'
  if (v < 0) return `(${BRL.format(Math.abs(v))})`
  return BRL.format(v)
}

/** Valor completo com convenção contábil (negativos em parênteses) */
export function fmtShortAcct(v) {
  if (v == null) return '—'
  if (v < 0) return `(${BRL.format(Math.abs(v))})`
  return BRL.format(v)
}

/** Receita: positive variance = green (beat budget) */
export function varClass(v) {
  if (v == null) return 'text-muted'
  return v >= 0 ? 'text-green' : 'text-red'
}

/** Despesas: negative variance = green (economia), positive = red (estouro) */
export function varClassDesp(v) {
  if (v == null) return 'text-muted'
  return v <= 0 ? 'text-green' : 'text-red'
}

export function pillClass(v) {
  if (v == null || (v === 0)) return 'pill pill-blue'
  return v > 0 ? 'pill pill-green' : 'pill pill-red'
}
