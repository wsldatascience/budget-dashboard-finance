# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Tests
python -m pytest tests/ -v
python -m pytest tests/test_pipeline.py::TestClassName::test_method -v   # single test

# Pipeline (individual steps)
python -m src.main                          # staging → intermediate → mart → quality → CSV
python src/generate_dashboard_data.py       # builds dashboard/public/dashboard_data.json
python src/generate_ml_data.py              # builds dashboard/public/ml_data.json
python src/generate_narrative.py            # requires OPENAI_API_KEY in .env
python src/quality/validation_gate.py       # runs gate against output/quality_report.json

# Pipeline (full)
scripts\run_pipeline.bat                    # Windows — all 6 steps + dashboard build
./scripts/run_pipeline.sh                   # Linux/macOS

# Dashboard
cd dashboard && npm run dev                 # dev server at http://localhost:5173
cd dashboard && npm run build               # production build → dashboard/dist/

# Production server (requires DASH_PASSWORD env var)
set DASH_PASSWORD=xxx && python scripts/server.py

# File watcher (auto-reruns pipeline on Excel save)
python scripts/watch_pipeline.py
```

## Architecture

### Data pipeline

Four-layer architecture modelled after dbt:

```
data/teste_budget.xlsx
  └── [STAGING]       src/pipeline/staging/       — rename cols, cast types, drop invalids
        └── [INTERMEDIATE]  src/pipeline/intermediate/  — filter XPTO CAMPINAS, aggregate Q1
              └── [MARTS]   src/pipeline/marts/          — JOIN DRE ↔ realizado, calc variances
                    └── [QUALITY]  src/quality/tests.py  — 6 checks → quality_report.json
```

`src/main.py` orchestrates all four layers. `src/generate_dashboard_data.py` runs them again independently to build the JSON consumed by React (it does not read from the CSV outputs).

### Key config

`src/config.py` is the single source of truth for:
- `EMPRESA_FILTER` — company name used to filter despesas and receita sheets
- `PERIODO_LABEL` — period string written to outputs
- `GROUP_PREFIXES` + `derive_group()` — maps `cod_conta` prefixes to cost center group labels
- `KNOWN_UNBUDGETED_ACCOUNTS` — accounts with `orc=0` that are explicitly expected

**Changing company or period: start in `src/config.py`.**

### Column naming conventions

| Pattern | Meaning |
|---------|---------|
| `orc_q1`, `rea_q1` | Q1 totals (orçado / realizado) |
| `orc_jan/fev/mar`, `rea_jan/fev/mar` | Monthly breakdowns |
| `var_rs`, `var_pct` | Absolute and percentage variance |

`compute_variance_pct()` in `src/utils.py` handles zero-denominator cases — always use it instead of inline division.

### Dashboard JSON (`dashboard_data.json`)

The React app reads **only** from `dashboard/public/*.json` — there is no runtime API. The shape of this JSON is the contract between Python and React. Key top-level keys:

- `summary` — total despesas KPIs
- `monthly` — `[{mes, orcado, realizado, variacao_rs, variacao_pct}]` (fields are `orcado`/`realizado`, not `total_orcado`)
- `all_contas` — full account list with `orc_jan/fev/mar`, `rea_jan/fev/mar`, `orc_q1`, `rea_q1`, `var_rs`, `var_pct`
- `by_group` — aggregated by `grupo` with `orcado`/`realizado` (not `orc_q1`/`rea_q1`)
- `receita` — `{summary, by_convenio, by_grupo, dre_accounts, concentracao}`
- `margens` — DRE margin structure: `receita_bruta`, `receita_liquida`, `lucro_bruto`, `ebitda`, `lucro_operacional` + `margem_*_pct` keys; also `ebitda_proforma: { ebitda_proforma, ajuste_total_rs, margem_ebitda_proforma_pct, margem_ebitda_realizado_pct, ajustes[] }`
- `dre` — full DRE hierarchy as row list with `row_type` (`account` | `section` | `indicator`)

### Quality gate

`validation_gate.yml` declares rules with `blocker: true/false`. The gate reads `output/quality_report.json` (produced by `src/main.py`) and exits with code 1 on any BLOCKER failure. Pipeline CI should check the exit code.

### React dashboard

Five views wired in `App.jsx`: `dashboard`, `analise`, `receita`, `dre`, `inteligencia`. Data loading via `useData()` / `useMlData()` hooks (fetches JSON, handles auth header). Formatting helpers live in `dashboard/src/utils/fmt.js`; KPI derivations in `kpis.js`.

Each view has sub-navigation (via `SubNav` component):
- `dashboard`: "Resultado Q1" | "Margens & Concentração"
- `analise`: "Visão Geral" | "Contas & Desvios"
- `receita`: "Visão Geral" | "Convênios & Contas DRE"
- `inteligencia`: "Diagnóstico IA" | "Previsão Q2" | "Anomalias & Risco"

`KpiCards.jsx` exists in components but is not imported anywhere — dead code.

In development the app reads JSON files directly from `dashboard/public/`. The production `scripts/server.py` (FastAPI) adds HTTP Basic Auth and security headers over the built `dashboard/dist/`.

### Atomic writes

The pipeline never writes directly to output paths — it writes to a `.tmp` sibling then calls `os.replace()`. Do not change this pattern; it prevents partial/corrupt JSON from reaching the dashboard.
