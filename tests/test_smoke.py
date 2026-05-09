"""
End-to-end smoke test: runs the full pipeline against the real Excel file
and asserts that key totals match the last known-good values.

Skipped automatically when teste_budget.xlsx is absent (CI without data file).
Expected totals were captured on 2026-04-24 after score-fix cycle (9.7/10).
"""
import pytest
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

DATA_FILE = ROOT / "data" / "teste_budget.xlsx"

pytestmark = pytest.mark.skipif(
    not DATA_FILE.exists(),
    reason="teste_budget.xlsx not present — skipping smoke test",
)

EXPECTED = {
    "despesa_orcada":    7_062_942.42,
    "despesa_realizada": 6_856_878.04,
    "receita_orcada":    9_438_856.25,
    "receita_realizada": 8_768_645.75,
}
TOLERANCE = 1.0   # R$ 1,00 — tighter than unit tests, looser than float equality


@pytest.fixture(scope="module")
def pipeline_output():
    """Run the full pipeline once per test module and return mart + quality report."""
    from src.pipeline.staging import stg_dre, stg_despesas, stg_receita
    from src.pipeline.intermediate import int_despesas_xpto, int_dre_long, int_receita
    from src.pipeline.marts import fct_budget_vs_realizado, fct_receita_vs_orcado
    from src.quality import tests as quality

    fp = str(DATA_FILE)
    dre_raw      = stg_dre.read(fp)
    despesas_raw = stg_despesas.read(fp)
    receita_raw  = stg_receita.read(fp)

    despesas_xpto     = int_despesas_xpto.build(despesas_raw)
    dre_total         = int_dre_long.aggregate_total(dre_raw)
    receita_by_conta  = int_receita.build_by_conta(receita_raw)

    mart         = fct_budget_vs_realizado.build(dre_total, despesas_xpto)
    mart_receita = fct_receita_vs_orcado.build(dre_raw, receita_by_conta)

    report = quality.run_all(
        despesas_raw, despesas_xpto, mart,
        receita_raw, receita_by_conta, mart_receita,
    )

    return {
        "mart":         mart,
        "mart_receita": mart_receita,
        "report":       report,
    }


def test_no_quality_failures(pipeline_output):
    """No check should return FAIL status — WARNINGs are acceptable."""
    report = pipeline_output["report"]
    failures = {k: v for k, v in report.items() if v.get("status") == "FAIL"}
    assert failures == {}, f"Quality FAILs detected: {failures}"


def test_quality_score_above_9(pipeline_output):
    score = pipeline_output["report"]["_quality_score"]["score"]
    assert score >= 9.0, f"Quality score {score} is below 9.0"


def test_despesa_orcada_total(pipeline_output):
    total = pipeline_output["mart"]["valor_orcado"].sum()
    assert abs(total - EXPECTED["despesa_orcada"]) <= TOLERANCE, (
        f"Despesa orçada: expected R$ {EXPECTED['despesa_orcada']:,.2f}, got R$ {total:,.2f}"
    )


def test_despesa_realizada_total(pipeline_output):
    total = pipeline_output["mart"]["valor_realizado"].sum()
    assert abs(total - EXPECTED["despesa_realizada"]) <= TOLERANCE, (
        f"Despesa realizada: expected R$ {EXPECTED['despesa_realizada']:,.2f}, got R$ {total:,.2f}"
    )


def test_receita_orcada_total(pipeline_output):
    total = pipeline_output["mart_receita"]["valor_orcado"].sum()
    assert abs(total - EXPECTED["receita_orcada"]) <= TOLERANCE, (
        f"Receita orçada: expected R$ {EXPECTED['receita_orcada']:,.2f}, got R$ {total:,.2f}"
    )


def test_receita_realizada_total(pipeline_output):
    total = pipeline_output["mart_receita"]["valor_realizado"].sum()
    assert abs(total - EXPECTED["receita_realizada"]) <= TOLERANCE, (
        f"Receita realizada: expected R$ {EXPECTED['receita_realizada']:,.2f}, got R$ {total:,.2f}"
    )


def test_no_missing_contas(pipeline_output):
    result = pipeline_output["report"]["missing_contas"]
    assert result["status"] == "PASS", (
        f"Orphan accounts detected: {result.get('missing_contas')}"
    )


def test_mart_has_expected_row_count(pipeline_output):
    """Guard against silent row-count regressions (e.g., duplicate keys in DRE)."""
    n = len(pipeline_output["mart"])
    assert n == 115, f"Mart row count changed: expected 115, got {n}"
