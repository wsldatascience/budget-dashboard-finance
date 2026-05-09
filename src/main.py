"""
Pipeline orchestrator:
  staging -> intermediate -> mart -> quality -> output
"""
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

import pandas as pd

from src.config import PERIODO_LABEL, derive_group
from src.utils import file_sha256

# Ensure UTF-8 output on all platforms without wrapping stdout
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT             = Path(__file__).resolve().parent.parent
DATA_FILE        = ROOT / "data" / "teste_budget.xlsx"
OUTPUT_DIR       = ROOT / "output"
OUTPUT_CSV       = OUTPUT_DIR / "output_consolidado.csv"
OUTPUT_RECEITA   = OUTPUT_DIR / "output_receita.csv"
QUALITY_RPT      = OUTPUT_DIR / "quality_report.json"
LOG_FILE         = OUTPUT_DIR / "pipeline.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
logger = logging.getLogger("main")


def run() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("=== PIPELINE START | source: %s ===", DATA_FILE)

    # ── Staging ───────────────────────────────────────────────────────────────
    from src.pipeline.staging import stg_dre, stg_despesas, stg_receita

    logger.info("[STAGING] DRE...")
    dre_raw = stg_dre.read(str(DATA_FILE))

    logger.info("[STAGING] Base de Despesa...")
    despesas_raw = stg_despesas.read(str(DATA_FILE))

    logger.info("[STAGING] Base de Receita...")
    receita_raw = stg_receita.read(str(DATA_FILE))

    # ── Intermediate ─────────────────────────────────────────────────────────
    from src.pipeline.intermediate import int_despesas_xpto, int_dre_long, int_receita

    logger.info("[INTERMEDIATE] Aggregating XPTO CAMPINAS expenses...")
    despesas_xpto = int_despesas_xpto.build(despesas_raw)

    logger.info("[INTERMEDIATE] Aggregating DRE Q1 totals...")
    dre_total = int_dre_long.aggregate_total(dre_raw)

    logger.info("[INTERMEDIATE] Aggregating XPTO CAMPINAS revenue...")
    receita_by_conta    = int_receita.build_by_conta(receita_raw)
    receita_by_convenio = int_receita.build_by_convenio(receita_raw)
    receita_by_grupo    = int_receita.build_by_grupo(receita_raw)

    # ── Mart ─────────────────────────────────────────────────────────────────
    from src.pipeline.marts import fct_budget_vs_realizado, fct_receita_vs_orcado

    logger.info("[MART] Building budget vs realizado...")
    mart = fct_budget_vs_realizado.build(dre_total, despesas_xpto)

    logger.info("[MART] Building receita vs orcado...")
    mart_receita = fct_receita_vs_orcado.build(dre_raw, receita_by_conta)

    # ── Quality ───────────────────────────────────────────────────────────────
    from src.quality import tests

    logger.info("[QUALITY] Running checks...")
    report = tests.run_all(
        despesas_raw, despesas_xpto, mart,
        receita_raw, receita_by_conta, mart_receita,
    )

    _print_quality_report(report)
    _save_quality_report(report)

    # ── Output ────────────────────────────────────────────────────────────────
    _atomic_csv(_prepare_output_csv(mart), OUTPUT_CSV, index=False, sep=";", decimal=",", encoding="utf-8-sig")
    logger.info("[OUTPUT] Saved: %s", OUTPUT_CSV)

    _atomic_csv(mart_receita, OUTPUT_RECEITA, index=False, sep=";", decimal=",", encoding="utf-8-sig")
    logger.info("[OUTPUT] Saved: %s", OUTPUT_RECEITA)
    logger.info("=== PIPELINE COMPLETE ===")

    _print_summary(mart)

    critical = [
        k for k, v in report.items()
        if v.get("status") == "FAIL" and not k.startswith("_")
    ]
    if critical:
        logger.error("CRITICAL quality failure(s): %s — review quality_report.json", critical)
        sys.exit(1)


def _prepare_output_csv(mart: pd.DataFrame) -> pd.DataFrame:
    """Return mart with column names and extra fields matching validation_gate.yml spec."""
    out = mart.copy()
    out["mes_ano"]      = PERIODO_LABEL
    out["centro_custo"] = out["cod_conta"].apply(derive_group)
    return out.rename(columns={
        "nome_conta":      "categoria",
        "valor_orcado":    "orcado",
        "valor_realizado": "realizado",
    })[["mes_ano", "centro_custo", "categoria", "orcado", "realizado", "variacao_rs", "variacao_pct"]]


def _print_summary(mart: pd.DataFrame) -> None:
    sep = "=" * 85
    _safe_print("\n" + sep)
    _safe_print(f"{'COD':>10}  {'CONTA':<40}  {'ORCADO':>14}  {'REALIZADO':>14}")
    _safe_print("-" * 85)
    for _, row in mart.iterrows():
        nome = str(row["nome_conta"])[:40]
        _safe_print(
            f"{row['cod_conta']:>10}  {nome:<40}  "
            f"{row['valor_orcado']:>14,.2f}  {row['valor_realizado']:>14,.2f}"
        )
    _safe_print("-" * 85)
    _safe_print(
        f"{'TOTAL':>53}  {mart['valor_orcado'].sum():>14,.2f}  "
        f"{mart['valor_realizado'].sum():>14,.2f}"
    )
    _safe_print(sep)


def _print_quality_report(report: dict) -> None:
    _safe_print("\n-- QUALITY REPORT " + "-" * 55)
    for check, result in report.items():
        status = result.get("status", "")
        if status == "PASS":
            icon = "OK  "
        elif status == "WARNING":
            icon = "WARN"
        else:
            icon = "FAIL"

        if check == "_quality_score":
            _safe_print(f"  [{icon}] {check}: {result.get('score', 0):.1f}/10")
            continue

        msg = result.get("message", status)
        _safe_print(f"  [{icon}] {check}: {msg}")

        if status == "FAIL" and "missing_contas" in result:
            df = pd.DataFrame(result["missing_contas"])
            _safe_print("\n  Contas com realizado SEM mapeamento na DRE:")
            _safe_print(df.to_string(index=False))

        if status in ("FAIL", "WARNING") and "contas" in result:
            df = pd.DataFrame(result["contas"])
            _safe_print("\n  Contas com gasto NAO orcado (orcado=0 mas realizado>0):")
            _safe_print(df.to_string(index=False))
    _safe_print("")


def _safe_print(text: str) -> None:
    """Print with fallback for terminals that can't render UTF-8."""
    try:
        print(text)
    except UnicodeEncodeError:
        print(text.encode("ascii", errors="replace").decode("ascii"))


def _atomic_json(path: Path, data: Any) -> None:
    """Write JSON to a .tmp file then atomically replace the target."""
    tmp = path.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        os.replace(tmp, path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def _atomic_csv(df: pd.DataFrame, path: Path, **kwargs) -> None:
    """Write DataFrame CSV to a .tmp file then atomically replace the target."""
    tmp = path.with_suffix(".tmp")
    try:
        df.to_csv(tmp, **kwargs)
        os.replace(tmp, path)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise


def _save_quality_report(report: dict) -> None:
    report_with_meta = {
        "generated_at": __import__("datetime").datetime.now().isoformat(),
        "input_hash":   file_sha256(DATA_FILE),
        **report,
    }
    _atomic_json(QUALITY_RPT, report_with_meta)
    logger.info("[QUALITY] Report saved: %s", QUALITY_RPT)


if __name__ == "__main__":
    run()
