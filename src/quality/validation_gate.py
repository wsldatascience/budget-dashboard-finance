"""
FP&A Validation Gate Runner
Loads validation_gate.yml and evaluates each rule against pipeline outputs.

Inputs loaded:
  dre_table          — dashboard_data.json → dre field
  expense_base       — dashboard_data.json → all_contas field
  consolidated_output — output/output_consolidado.csv

Output: output/validation_gate_result.json
Exit codes: 0 = PASS (blockers ok), 1 = FAIL (blocker failed)

Usage:
  python src/quality/validation_gate.py
"""
import json
import logging
import re
import sys
from pathlib import Path

import pandas as pd
import yaml

ROOT         = Path(__file__).resolve().parent.parent.parent
GATE_FILE    = ROOT / "validation_gate.yml"
DASH_FILE    = ROOT / "dashboard" / "public" / "dashboard_data.json"
QUALITY_FILE = ROOT / "output" / "quality_report.json"
CSV_FILE     = ROOT / "output" / "output_consolidado.csv"
OUT_FILE     = ROOT / "output" / "validation_gate_result.json"

TOLERANCE    = 0.02   # 2 % relative tolerance for group comparisons

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


# ── Data loaders ──────────────────────────────────────────────────────────────

def _load_inputs(dash: dict) -> dict[str, pd.DataFrame]:
    expense_base = pd.DataFrame(dash["all_contas"]).rename(columns={
        "cod_conta":  "conta",
        "nome_conta": "nome",
        "orc_q1":     "orcado",
        "rea_q1":     "realizado",
        "grupo":      "grupo",
    })

    dre_rows = dash.get("dre", [])
    # Keep only leaf expense accounts (exclude revenue rows and section headers)
    expense_rows = [
        r for r in dre_rows
        if r.get("row_type") == "account" and r.get("is_receita") is False
    ]
    dre_table = pd.DataFrame(expense_rows).rename(columns={
        "cod_conta": "conta",
        "nome":      "nome",
        "orc_q1":    "orcado",
        "rea_q1":    "realizado",
    }) if expense_rows else pd.DataFrame(columns=["conta", "nome", "orcado", "realizado"])
    # Enrich dre_table with grupo by joining against expense_base
    if not dre_table.empty and not expense_base.empty and "grupo" in expense_base.columns:
        dre_table = dre_table.merge(
            expense_base[["conta", "grupo"]], on="conta", how="left"
        )
        dre_table["grupo"] = dre_table["grupo"].fillna("Outros")

    consolidated = pd.read_csv(
        CSV_FILE, sep=";", decimal=",", encoding="utf-8-sig"
    ) if CSV_FILE.exists() else pd.DataFrame()

    return {
        "expense_base":       expense_base,
        "dre_table":          dre_table,
        "consolidated_output": consolidated,
    }


def _quality_score(quality: dict) -> float:
    """
    Reuse the canonical score produced by src.quality.tests (PASS=1.0,
    WARNING=0.8, FAIL=0.0). Recomputing here would diverge from the
    user-facing quality_report.json.
    """
    score = quality.get("_quality_score", {}).get("score")
    if score is not None:
        return float(score)
    # Fallback for older reports without _quality_score
    statuses = [v.get("status") for k, v in quality.items() if not k.startswith("_") and isinstance(v, dict)]
    weights  = {"PASS": 1.0, "WARNING": 0.8, "FAIL": 0.0}
    if not statuses:
        return 0.0
    return round(sum(weights.get(s, 0.0) for s in statuses) / len(statuses) * 10, 1)


# ── Condition evaluator ───────────────────────────────────────────────────────
# Parses the mini-DSL expressions in the YAML without using eval().

def _resolve_sum(token: str, inputs: dict[str, pd.DataFrame]) -> float:
    """sum(table.column)"""
    m = re.match(r"sum\((\w+)\.(\w+)\)", token.strip())
    if not m:
        raise ValueError(f"Cannot parse sum expression: {token!r}")
    df  = inputs[m.group(1)]
    col = m.group(2)
    return float(df[col].fillna(0).astype(float).sum()) if col in df.columns else 0.0


def _eval_condition(condition: str, inputs: dict[str, pd.DataFrame],
                    quality_score: float, rule_cfg: dict | None = None) -> tuple[bool, dict]:
    cond = " ".join(condition.strip().split())  # collapse newlines/whitespace
    rule_cfg = rule_cfg or {}

    # ── abs(sum(A.col) - sum(B.col)) <= threshold ─────────────────────────────
    m = re.match(
        r"abs\(sum\((\w+)\.(\w+)\)\s*-\s*sum\((\w+)\.(\w+)\)\)\s*<=\s*([\d.]+)",
        cond,
    )
    if m:
        a_sum = float(inputs[m.group(1)][m.group(2)].fillna(0).astype(float).sum())
        b_sum = float(inputs[m.group(3)][m.group(4)].fillna(0).astype(float).sum())
        limit = float(m.group(5))
        diff  = abs(a_sum - b_sum)
        return diff <= limit, {
            "expense_base_sum": round(a_sum, 2),
            "dre_table_sum":    round(b_sum, 2),
            "diff":             round(diff, 2),
            "limit":            limit,
        }

    # ── count(A.col NOT IN B.col [AND NOT A.col STARTS_WITH prefixes]
    #                             [AND NOT A.col IN known_accounts]) == 0 ─────
    m = re.match(
        r"count\(\s*(\w+)\.(\w+)\s+NOT\s+IN\s+(\w+)\.(\w+)"
        r"(?:\s+AND\s+NOT\s+\w+\.\w+\s+STARTS_WITH\s+(\w+))?"
        r"(?:\s+AND\s+NOT\s+\w+\.\w+\s+IN\s+(\w+))?"
        r"\s*\)\s*==\s*0",
        cond, re.IGNORECASE,
    )
    if m:
        a_df, a_col = inputs[m.group(1)], m.group(2)
        b_df, b_col = inputs[m.group(3)], m.group(4)
        prefixes_key = m.group(5)
        accounts_key = m.group(6)

        if a_col not in a_df.columns or b_col not in b_df.columns:
            return False, {"error": f"Column {a_col!r} or {b_col!r} not found"}

        a_vals = a_df[a_col].astype(str)
        b_vals = b_df[b_col].astype(str)
        missing_mask = ~a_vals.isin(b_vals)

        out_of_scope_prefixes = tuple(rule_cfg.get(prefixes_key, {}).keys()) if prefixes_key else ()
        known_accounts        = set((rule_cfg.get(accounts_key) or {}).keys()) if accounts_key else set()

        if out_of_scope_prefixes:
            missing_mask &= ~a_vals.str.startswith(out_of_scope_prefixes)
        if known_accounts:
            missing_mask &= ~a_vals.isin(known_accounts)

        orphans = a_df[missing_mask]
        rows = orphans[[a_col, "nome", "realizado"]].rename(
            columns={a_col: "conta", "realizado": "valor"}
        ).to_dict("records") if "nome" in orphans.columns else []
        return len(orphans) == 0, {
            "orphan_count":        len(orphans),
            "orphans":             rows,
            "out_of_scope_count":  int((~a_vals.isin(b_vals) & a_vals.str.startswith(out_of_scope_prefixes)).sum()) if out_of_scope_prefixes else 0,
            "known_unbudgeted_count": int((~a_vals.isin(b_vals) & a_vals.isin(known_accounts)).sum()) if known_accounts else 0,
        }

    # ── count(A.col1 == N AND A.col2 > N) == 0 ───────────────────────────────
    m = re.match(
        r"count\(\s*(\w+)\.(\w+)\s*==\s*([\d.]+)\s+AND\s+\w+\.(\w+)\s*>\s*([\d.]+)\s*\)\s*==\s*0",
        cond, re.IGNORECASE,
    )
    if m:
        df = inputs[m.group(1)]
        col_a, val_a = m.group(2), float(m.group(3))
        col_b, val_b = m.group(4), float(m.group(5))
        if col_a not in df.columns or col_b not in df.columns:
            return False, {"error": f"Column {col_a!r} or {col_b!r} not found"}
        offenders = df[(df[col_a] == val_a) & (df[col_b] > val_b)]
        rows = []
        if "conta" in offenders.columns:
            rows = offenders[["conta", col_b]].rename(columns={col_b: "valor"}).to_dict("records")
        return len(offenders) == 0, {"count": len(offenders), "offenders": rows}

    # ── sum_by_group(A) == sum_by_group(B) ───────────────────────────────────
    m = re.match(r"sum_by_group\((\w+)\)\s*==\s*sum_by_group\((\w+)\)", cond)
    if m:
        a_df = inputs[m.group(1)]
        b_df = inputs[m.group(2)]
        if "grupo" not in a_df.columns or "grupo" not in b_df.columns:
            return False, {"error": "Column 'grupo' not found in one of the tables"}
        a_grp = a_df.groupby("grupo")["realizado"].sum().fillna(0)
        b_grp = b_df.groupby("grupo")["realizado"].sum().fillna(0) if "realizado" in b_df.columns else pd.Series(dtype=float)
        diffs = []
        for grupo in a_grp.index:
            a_val = float(a_grp.get(grupo, 0))
            b_val = float(b_grp.get(grupo, 0))
            rel   = abs(a_val - b_val) / max(abs(a_val), 1)
            if rel > TOLERANCE:
                diffs.append({
                    "grupo":          grupo,
                    "expense_base":   round(a_val, 2),
                    "dre_table":      round(b_val, 2),
                    "diff":           round(a_val - b_val, 2),
                    "diff_pct":       round(rel * 100, 2),
                })
        return len(diffs) == 0, {"inconsistent_groups": diffs, "groups_checked": len(a_grp)}

    # ── quality_score >= threshold ────────────────────────────────────────────
    m = re.match(r"quality_score\s*>=\s*([\d.]+)", cond)
    if m:
        threshold = float(m.group(1))
        return quality_score >= threshold, {
            "quality_score": quality_score,
            "threshold":     threshold,
        }

    raise ValueError(f"Unrecognized condition pattern: {cond!r}")


# ── Rule runners ──────────────────────────────────────────────────────────────

def _run_rule(rule_id: str, rule_cfg: dict, inputs: dict,
              quality_score: float) -> dict:
    severity = rule_cfg.get("severity", "WARNING")
    desc     = rule_cfg.get("description", rule_id)

    try:
        if rule_id == "output_schema_check":
            required = set(rule_cfg.get("required_columns", []))
            df       = inputs.get("consolidated_output", pd.DataFrame())
            actual   = {c.strip().lower() for c in df.columns}
            missing  = sorted(required - actual)
            passed   = len(missing) == 0
            detail   = {"required": sorted(required), "missing": missing, "present": sorted(actual)}
        else:
            condition = rule_cfg.get("condition", "")
            passed, detail = _eval_condition(condition, inputs, quality_score, rule_cfg)
    except Exception as exc:
        passed = False
        detail = {"error": str(exc)}

    return {
        "rule_id":   rule_id,
        "severity":  severity,
        "description": desc,
        "passed":    passed,
        "detail":    detail,
    }


# ── Report builder ────────────────────────────────────────────────────────────

def _build_output(gate_cfg: dict, results: list[dict],
                  quality_score: float) -> dict:
    blockers = [r for r in results if not r["passed"] and r["severity"] == "BLOCKER"]
    warnings = [r for r in results if not r["passed"] and r["severity"] == "WARNING"]
    passed   = [r for r in results if r["passed"]]

    status   = "FAIL" if blockers else "PASS"
    score    = round(len(passed) / len(results) * 10, 1) if results else 0.0

    orphan_r = next((r for r in results if r["rule_id"] == "orphan_accounts"), None)
    rec_r    = next((r for r in results if r["rule_id"] == "reconciliation_check"), None)

    return {
        "gate":          gate_cfg.get("name"),
        "version":       gate_cfg.get("version"),
        "status":        status,
        "score":         score,
        "quality_score": quality_score,
        "issues":        [
            {"rule": r["rule_id"], "severity": r["severity"],
             "description": r["description"], "detail": r["detail"]}
            for r in blockers + warnings
        ],
        "reconciliation_diff_table": rec_r["detail"] if rec_r else {},
        "orphan_accounts_table":     (orphan_r["detail"].get("orphans", [])
                                      if orphan_r else []),
        "results":       results,
    }


# ── Printer ───────────────────────────────────────────────────────────────────

def _print_report(output: dict) -> None:
    import sys
    enc = sys.stdout.encoding or "ascii"
    def _p(text: str) -> None:
        print(text.encode(enc, errors="replace").decode(enc))

    sep          = "-" * 62
    icon_ok      = "[OK]" if enc.lower().replace("-", "") in ("ascii", "cp1252", "latin1") else "✓"
    icon_fail    = "[X]"  if enc.lower().replace("-", "") in ("ascii", "cp1252", "latin1") else "✗"
    icon_warn    = "[!]"  if enc.lower().replace("-", "") in ("ascii", "cp1252", "latin1") else "⚠"
    arrow        = "->"

    _p(f"\n{sep}")
    _p(f"  {output['gate']}  v{output['version']}")
    _p(sep)

    for r in output["results"]:
        icon  = icon_ok if r["passed"] else (icon_fail if r["severity"] == "BLOCKER" else icon_warn)
        label = "PASS   " if r["passed"] else r["severity"].ljust(7)
        _p(f"  {icon}  {label}  {r['description']}")
        if not r["passed"]:
            detail = r["detail"]
            if "error" in detail:
                _p(f"           {arrow} Erro: {detail['error']}")
            elif "diff" in detail:
                _p(f"           {arrow} Diferenca: R$ {detail['diff']:,.2f}  (limite R$ {detail['limit']:.2f})")
            elif "orphan_count" in detail:
                _p(f"           {arrow} {detail['orphan_count']} conta(s) orfa(s)")
                for o in detail.get("orphans", [])[:3]:
                    _p(f"              {o['conta']}  R$ {o.get('valor', 0):,.2f}")
            elif "inconsistent_groups" in detail:
                _p(f"           {arrow} {len(detail['inconsistent_groups'])} grupo(s) divergente(s)")
                for g in detail["inconsistent_groups"][:3]:
                    _p(f"              {g['grupo']}: diff R$ {g['diff']:,.2f} ({g['diff_pct']:.1f}%)")
            elif "missing" in detail:
                _p(f"           {arrow} Colunas ausentes: {detail['missing']}")
            elif "quality_score" in detail:
                _p(f"           {arrow} Score {detail['quality_score']}/10  (minimo {detail['threshold']:.0f})")

    _p(sep)
    status_icon = icon_ok if output["status"] == "PASS" else icon_fail
    issues_n    = len(output["issues"])
    _p(f"  {status_icon}  {output['status']}  --  gate score {output['score']}/10  "
       f"({issues_n} issue(s))")
    _p(sep)


# ── Entry point ───────────────────────────────────────────────────────────────

def run() -> int:
    for path, label in [(GATE_FILE, "validation_gate.yml"),
                        (DASH_FILE, "dashboard_data.json"),
                        (QUALITY_FILE, "quality_report.json")]:
        if not path.exists():
            logger.error("%s não encontrado — execute o pipeline primeiro", label)
            return 1

    with open(GATE_FILE,    encoding="utf-8") as f:
        gate_cfg = yaml.safe_load(f)
    with open(DASH_FILE,    encoding="utf-8") as f:
        dash = json.load(f)
    with open(QUALITY_FILE, encoding="utf-8") as f:
        quality = json.load(f)

    inputs        = _load_inputs(dash)
    quality_score = _quality_score(quality)
    results       = [
        _run_rule(rule_id, rule_cfg, inputs, quality_score)
        for rule_id, rule_cfg in gate_cfg["rules"].items()
    ]

    output = _build_output(gate_cfg, results, quality_score)
    _print_report(output)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    logger.info("Resultado salvo → %s", OUT_FILE)

    return 0 if output["status"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(run())
