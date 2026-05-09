"""
Central configuration — reads from environment variables with safe defaults.
Override any value by setting the corresponding env var before running.

  EMPRESA_FILTER=XPTO CAMPINAS python src/main.py
"""
import os

# ── Company / period ──────────────────────────────────────────────────────────
EMPRESA_FILTER = os.getenv("EMPRESA_FILTER", "XPTO CAMPINAS")
PERIODO_LABEL  = os.getenv("PERIODO_LABEL",  "Q1 2025 (Janeiro–Março)")

# ── Account group mapping (by 4-digit prefix) ────────────────────────────────
GROUP_PREFIXES: dict[str, str] = {
    "3101": "Receita / Abatimentos",
    "3102": "Receita / Abatimentos",
    # ── Custo dos Serviços Prestados (CSP) ────────────────────────────────────
    "3201": "Insumos Assistenciais",         # materiais diretos de exame/cuidado
    "3202": "Pessoal de Produção",           # 320219 override → Honorários Médicos
    "3203": "Pessoal de Produção",
    "3204": "Pessoal de Produção",
    "3205": "Pessoal de Produção",
    "3206": "Pessoal de Produção",
    "3207": "Pessoal de Produção",
    "3208": "Pessoal de Produção",
    "3209": "Pessoal de Produção",
    "3210": "Pessoal de Produção",
    "3211": "Pessoal de Produção",
    "3212": "Pessoal de Produção",
    # ── Despesas Operacionais (SG&A) — sub-seções do DRE ─────────────────────
    "3301": "Pessoal Administrativo",        # 330161 override → Pessoal de Produção
    "3302": "Serviços de Terceiros",         # 320273 override → Serviços de Terceiros
    "3303": "Infraestrutura",               # aluguel, leasing, seguros
    "3304": "Infraestrutura",               # 3304xx D&A → override p/ Depreciação
    "3305": "Materiais de Consumo",
    "3306": "Utilidades e Serviços",        # luz, água, gás, telefone
    "3307": "Manutenção e Reparos",
    "3308": "Manutenção de Veículos",
    "3309": "Despesas Diversas",            # IPTU, jurídico, trabalhistas
    "3070": "Manutenção e Reparos",         # 307006 Manutenção Edifícios (sem orc.)
    # ── Abaixo do resultado operacional ──────────────────────────────────────
    "3360": "Depreciação e Amortização",
    "3601": "Resultado Financeiro",
    "3602": "Resultado Financeiro",
    "3901": "IR / CSLL",
    "3902": "Participação nos Resultados",
}


# ── Per-account overrides (exact-code, takes precedence over prefix) ─────────
# Some accounts share a 4-digit prefix with an unrelated group in the chart.
# Example: prefix 3902 is mostly "Participação nos Resultados" (390201
# Participação do Administrador), but 390204 is "Aluguel de Bens Imóveis
# (Produção)" — a CSP item, not a profit-sharing item. The Excel DRE places
# it under Custo dos Serviços Prestados.
CONTA_OVERRIDES: dict[str, str] = {
    # ── CSP overrides ─────────────────────────────────────────────────────────
    "320219": "Honorários Médicos",          # maior item do CSP — destaque próprio
    "320273": "Serviços de Terceiros",       # imposto retido s/ serviços prestados
    "330161": "Pessoal de Produção",         # IR sobre salário produção (cod. 330161)
    "390204": "Pessoal de Produção",         # aluguel imóvel produção — custo direto
    # ── D&A overrides (saem da Infraestrutura e vão para linha abaixo EBITDA) ─
    "330401": "Depreciação e Amortização",
    "330402": "Depreciação e Amortização",
    "330498": "Depreciação e Amortização",
    "330499": "Depreciação e Amortização",
}


def derive_group(cod: str) -> str:
    cod_str = str(cod)
    if cod_str in CONTA_OVERRIDES:
        return CONTA_OVERRIDES[cod_str]
    return GROUP_PREFIXES.get(cod_str[:4], "Outros")


# ── Revenue account mapping ───────────────────────────────────────────────────
# The receita base (stg_receita) holds individual transaction records with no
# account code — gross revenue is aggregated and assigned to RECEITA_COD_CONTA
# by convention, then joined to the DRE's 31xx row with the same code.
# This works because the DRE has a single gross-revenue line (310101 "Serviços");
# if the DRE is restructured with multiple revenue lines, update this var and
# split int_receita.build_by_conta() accordingly.
# fct_receita_vs_orcado.build() raises ValueError if this code is missing from DRE.
RECEITA_COD_CONTA  = os.getenv("RECEITA_COD_CONTA",  "310101")
RECEITA_NOME_CONTA = os.getenv("RECEITA_NOME_CONTA", "Serviços")

# ── Out-of-scope account prefixes ─────────────────────────────────────────────
# These account codes appear in the expense base but are NOT P&L items.
# They are excluded from the reconciliation gap check with documented reason.
OUT_OF_SCOPE_PREFIXES: dict[str, str] = {
    "12":     "Ativo Imobilizado — CapEx, não despesa P&L",
    "23":     "Distribuição de Lucros — resultado abaixo da linha",
    "390203": "Financiamento para Aquisição de Bens — passivo financeiro (não DRE operacional)",
    "31":     "Receita e Deduções — tratado pelo mart fct_receita_vs_orcado",
}

# ── Known P&L accounts absent from the DRE budget ────────────────────────────
# Accounts that carry realized expenses but have no budget line in the DRE.
# Injected into staging with orcado=0 so they appear in the mart and are
# tracked as unplanned spending (WARNING) rather than orphan accounts (FAIL).
KNOWN_UNBUDGETED_ACCOUNTS: dict[str, str] = {
    "307006": "MANUTENÇÃO EDIFÍCIOS",
}

# ── Roll-up accounts (leaf = preceding section subtotal) ─────────────────────
# Some leaf accounts in the DRE (e.g. 310101 "Serviços") have their cell
# containing a SUM formula over decorative breakdown rows above them in the
# same Excel section. When openpyxl reads with data_only=True the formula
# evaluates to 0 if the cache is missing, so the leaf appears empty.
#
# For these accounts the correct patched value is the section subtotal
# (which the Excel preserves), NOT the sum of preceding rows — summing
# would double-count subtotals that are themselves descendants.
ROLLUP_ACCOUNTS: set[str] = {
    "310101",  # Serviços = roll-up of modality breakdown (RM, Tomo, US, ...)
}

# ── Period boundaries (used by stg_despesas to flag out-of-period records) ───
# ISO format YYYY-MM-DD. Defaults to Q1 2025 matching PERIODO_LABEL.
PERIODO_START = os.getenv("PERIODO_START", "2025-01-01")
PERIODO_END   = os.getenv("PERIODO_END",   "2025-03-31")

# ── ML thresholds (all overridable via env for per-client tuning) ────────────
# Forecast scenarios applied to the base Q2 projection.
ML_SCENARIOS: dict[str, dict[str, float]] = {
    "receita":  {"pessimista": -0.08, "base": 0.0, "otimista": +0.08},
    "despesas": {"pessimista": +0.08, "base": 0.0, "otimista": -0.08},
}
ML_FORECAST_WEIGHTS = (0.20, 0.35, 0.45)   # Jan / Fev / Mar — recent weighs more
ML_ANOMALY_CONTAMINATION = float(os.getenv("ML_ANOMALY_CONTAMINATION", "0.12"))

# Cluster label thresholds (on cluster-average variation %)
ML_CLUSTER_THRESHOLDS = {
    "economia_alta":  -10.0,   # var_pct < -10%
    "dentro_orcado":    0.0,   # -10% <= var_pct < 0%
    "leve_estouro":    15.0,   # 0% <= var_pct < 15%
    # > 15% → estouro_alto
}

# Risk classifier thresholds on per-account variation %
ML_RISK_THRESHOLDS = {
    "alto":  10.0,   # var_pct > 10%
    "medio":  0.0,   # 0% < var_pct <= 10%
    # <= 0% → baixo; orcado==0 → Sem Orçamento
}
