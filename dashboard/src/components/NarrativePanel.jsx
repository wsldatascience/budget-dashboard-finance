import { useMemo } from 'react'
import { useNarrative } from '../hooks/useNarrative'

const SECTION_ICONS = {
  'Resultado do Trimestre': '📊',
  'Diagnóstico das Principais Variações': '🔍',
  'Alerta de Risco': '⚠️',
  'Recomendação para Q2': '🎯',
}

function getSectionIcon(key) {
  for (const [label, icon] of Object.entries(SECTION_ICONS)) {
    if (key.includes(label)) return icon
  }
  return '•'
}

function getSectionAccent(key) {
  if (key.includes('Risco'))          return { border: '#ef4444', bg: 'rgba(239,68,68,.06)' }
  if (key.includes('Recomendação'))   return { border: '#10b981', bg: 'rgba(16,185,129,.06)' }
  if (key.includes('Diagnóstico'))    return { border: '#f59e0b', bg: 'rgba(245,158,11,.06)' }
  return { border: 'var(--navy)',     bg: 'rgba(15,23,42,.04)' }
}

function extractAccountChips(text, accountsByCode) {
  if (!text || !accountsByCode) return []
  const seen = new Set()
  const chips = []
  const matches = text.match(/\b\d{6}\b/g) ?? []
  for (const code of matches) {
    if (seen.has(code)) continue
    const acc = accountsByCode.get(code)
    if (!acc) continue
    seen.add(code)
    chips.push(acc)
  }
  return chips
}

function DrillChip({ acc, onClick }) {
  const negative = (acc.var_rs ?? 0) > 0
  return (
    <button
      onClick={() => onClick(acc.cod_conta)}
      title={`Abrir análise · ${acc.nome_conta}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: '.74rem',
        fontWeight: 500,
        color: 'var(--text)',
        cursor: 'pointer',
        maxWidth: 280,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: 'var(--muted)', fontFamily: 'monospace', fontSize: '.7rem' }}>{acc.cod_conta}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.nome_conta}</span>
      <span style={{ color: negative ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>↗</span>
    </button>
  )
}

function NarrativeSection({ sectionKey, text, accountsByCode, onDrillDown }) {
  const icon   = getSectionIcon(sectionKey)
  const accent = getSectionAccent(sectionKey)
  const title  = sectionKey.replace(/^\d+\.\s+/, '')
  const chips  = onDrillDown ? extractAccountChips(text, accountsByCode) : []

  return (
    <div style={{
      borderLeft: `3px solid ${accent.border}`,
      background: accent.bg,
      borderRadius: '0 8px 8px 0',
      padding: '14px 18px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
      }}>
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{
          fontSize: '.72rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: 'var(--muted2)',
        }}>
          {title}
        </span>
      </div>
      <p style={{
        margin: 0,
        fontSize: '.88rem',
        lineHeight: 1.65,
        color: 'var(--text)',
        whiteSpace: 'pre-line',
      }}>
        {text}
      </p>

      {chips.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px dashed ${accent.border}33`,
        }}>
          <span style={{ fontSize: '.66rem', color: 'var(--muted2)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', alignSelf: 'center', marginRight: 4 }}>
            Drill-down:
          </span>
          {chips.map(acc => (
            <DrillChip key={acc.cod_conta} acc={acc} onClick={onDrillDown} />
          ))}
        </div>
      )}
    </div>
  )
}

function NarrativeSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[120, 90, 80, 100].map((h, i) => (
        <div key={i} style={{
          height: h,
          borderRadius: 8,
          background: 'linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.4s infinite',
        }} />
      ))}
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
    </div>
  )
}

export default function NarrativePanel({ authHeader, accounts, onDrillDown }) {
  const { data, loading, error } = useNarrative(authHeader)

  const accountsByCode = useMemo(() => {
    if (!accounts) return null
    const m = new Map()
    for (const a of accounts) m.set(String(a.cod_conta), a)
    return m
  }, [accounts])

  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{
            fontSize: '.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: 'var(--muted2)',
            marginBottom: 2,
          }}>
            Análise Executiva · IA
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
            Diagnóstico Q1 2025
          </div>
        </div>

        {data && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16,185,129,.1)',
            border: '1px solid rgba(16,185,129,.25)',
            borderRadius: 20,
            padding: '4px 10px',
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: '.72rem', fontWeight: 600, color: '#10b981' }}>
              AI · {new Date(data.generated_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      {loading && <NarrativeSkeleton />}

      {error && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--muted)',
          fontSize: '.84rem',
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🤖</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
            Narrativa IA indisponível
          </div>
          <div>Execute <code style={{ fontSize: '.78rem', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4 }}>python src/generate_narrative.py</code></div>
          <div style={{ marginTop: 4, fontSize: '.76rem' }}>Requer <code>OPENAI_API_KEY</code></div>
        </div>
      )}

      {data && !loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Object.keys(data.sections).length > 0
            ? Object.entries(data.sections).map(([key, text]) => (
                <NarrativeSection
                  key={key}
                  sectionKey={key}
                  text={text}
                  accountsByCode={accountsByCode}
                  onDrillDown={onDrillDown}
                />
              ))
            : (
              <p style={{
                fontSize: '.88rem',
                lineHeight: 1.7,
                color: 'var(--text)',
                whiteSpace: 'pre-line',
                margin: 0,
              }}>
                {data.full_text}
              </p>
            )
          }
        </div>
      )}
    </div>
  )
}
