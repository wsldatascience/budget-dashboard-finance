"""
Data quality layer: reconciliation and contract checks.

Despesas checks:
  1. total_reconciliation          — mart realizado must match XPTO base total
  2. missing_contas                — contas in XPTO base not mapped in DRE
  3. unplanned_spending            — contas with orcado=0 but realizado>0
  4. null_check                    — no nulls in key mart columns

Receita checks:
  5. total_reconciliation_receita  — mart RECEITA_COD_CONTA must match int_receita total
  6. receita_sem_orcamento         — realized revenue with orcado=0
"""
import pandas as pd
import logging
from enum import StrEnum

from src.config import EMPRESA_FILTER, OUT_OF_SCOPE_PREFIXES, RECEITA_COD_CONTA

logger = logging.getLogger(__name__)

TOLERANCE = 0.01


class QS(StrEnum):
    """Quality check status values. StrEnum ensures QS.PASS == "PASS" (backward compatible)."""
    PASS    = "PASS"
    FAIL    = "FAIL"
    WARNING = "WARNING"


def run_all(
    stg_despesas: pd.DataFrame,
    int_despesas_xpto: pd.DataFrame,
    mart: pd.DataFrame,
    stg_receita: pd.DataFrame = None,
    int_receita_by_conta: pd.DataFrame = None,
    mart_receita: pd.DataFrame = None,
) -> dict:
    report = {}
    report["total_reconciliation"] = check_total_reconciliation(int_despesas_xpto, mart)
    report["missing_contas"]       = check_missing_contas(stg_despesas, mart)
    report["unplanned_spending"]   = check_unplanned_spending(mart)
    report["null_check"]           = check_nulls(mart)

    if int_receita_by_conta is not None and mart_receita is not None:
        report["total_reconciliation_receita"] = check_total_reconciliation_receita(
            int_receita_by_conta, mart_receita
        )
        report["receita_sem_orcamento"] = check_receita_sem_orcamento(mart_receita)

    passed   = sum(1 for v in report.values() if v.get("status") == "PASS")
    warnings = sum(1 for v in report.values() if v.get("status") == "WARNING")
    failed   = sum(1 for v in report.values() if v.get("status") == "FAIL")
    total    = len(report)
    score    = round((passed * 1.0 + warnings * 0.8) / total * 10, 1) if total else 0.0
    logger.info(
        "Quality — PASS: %d | WARN: %d | FAIL: %d | Score: %.1f/10",
        passed, warnings, failed, score,
    )
    report["_quality_score"] = {"status": QS.PASS if score >= 8.0 else QS.FAIL, "score": score}
    return report


def check_total_reconciliation(
    int_despesas_xpto: pd.DataFrame,
    mart: pd.DataFrame,
) -> dict:
    """
    For every account present in the DRE mart, the realized total must match
    the aggregated expense base — i.e., the join math is correct.

    Accounts absent from the mart (unmapped or out-of-scope) are NOT included
    here; they are reported separately by check_missing_contas.
    """
    contas_no_mart = set(mart["cod_conta"].astype(str))
    matched = int_despesas_xpto[
        int_despesas_xpto["cod_conta"].isin(contas_no_mart)
    ]
    total_base = matched["valor_realizado"].sum()
    total_mart = mart["valor_realizado"].sum()
    diff = abs(total_base - total_mart)

    if diff > TOLERANCE:
        logger.error(
            "TOTAL MISMATCH — base: R$ %.2f  mart: R$ %.2f  diff: R$ %.2f",
            total_base, total_mart, diff,
        )
        return {
            "status": QS.FAIL,
            "total_base": round(total_base, 2),
            "total_mart": round(total_mart, 2),
            "diff": round(diff, 2),
            "message": (
                f"Total diverge: base=R$ {total_base:,.2f}  "
                f"mart=R$ {total_mart:,.2f}  diff=R$ {diff:,.2f}"
            ),
        }

    logger.info("Total reconciliation OK: R$ %.2f", total_mart)
    return {"status": QS.PASS, "total": round(total_mart, 2)}


def check_missing_contas(
    stg_despesas: pd.DataFrame,
    mart: pd.DataFrame,
) -> dict:
    """
    Detect contas present in XPTO CAMPINAS expenses but absent from the DRE.
    Out-of-scope prefixes (CapEx, equity distributions, financing) are
    documented separately and do NOT count as reconciliation failures.
    """
    cde = stg_despesas[stg_despesas["empresa"] == EMPRESA_FILTER]
    contas_base = set(cde["cod_conta"].unique())
    contas_dre  = set(mart["cod_conta"].astype(str).unique())
    all_missing = contas_base - contas_dre

    def _is_out_of_scope(cod: str) -> str | None:
        for prefix, reason in OUT_OF_SCOPE_PREFIXES.items():
            if cod.startswith(prefix):
                return reason
        return None

    out_of_scope = {c: _is_out_of_scope(c) for c in all_missing if _is_out_of_scope(c)}
    truly_missing = all_missing - set(out_of_scope.keys())

    # Log out-of-scope accounts informatively (not as failure)
    if out_of_scope:
        oos_df = (
            cde[cde["cod_conta"].isin(out_of_scope)]
            .groupby(["cod_conta", "nome_conta"])["valor"]
            .sum()
            .reset_index()
            .rename(columns={"valor": "valor"})
        )
        oos_df["motivo_exclusao"] = oos_df["cod_conta"].map(out_of_scope)
        logger.info(
            "Contas fora do escopo DRE (%d) — excluídas da reconciliação:\n%s",
            len(out_of_scope), oos_df.to_string(index=False),
        )

    if truly_missing:
        missing_df = (
            cde[cde["cod_conta"].isin(truly_missing)]
            .groupby(["cod_conta", "nome_conta"])["valor"]
            .sum()
            .reset_index()
            .rename(columns={"valor": "valor_nao_alocado"})
            .sort_values("valor_nao_alocado", ascending=False)
        )
        missing_df["valor_nao_alocado"] = missing_df["valor_nao_alocado"].round(2)
        logger.warning(
            "Contas sem mapeamento na DRE (%d):\n%s",
            len(truly_missing), missing_df.to_string(index=False),
        )
        return {
            "status": QS.FAIL,
            "missing_count": len(truly_missing),
            "missing_contas": missing_df.to_dict(orient="records"),
            "out_of_scope_count": len(out_of_scope),
            "message": f"{len(truly_missing)} conta(s) realizadas sem correspondência na DRE",
        }

    return {
        "status": QS.PASS,
        "missing_count": 0,
        "out_of_scope_count": len(out_of_scope),
        "message": f"Sem contas faltando. {len(out_of_scope)} conta(s) fora do escopo documentadas.",
    }


def check_unplanned_spending(mart: pd.DataFrame) -> dict:
    """
    Detect contas with orcado=0 but realizado>0 (unplanned spending).
    These appear in the DRE with zero budget but received actual expenses.
    They inflate the realized total without a budgetary counterpart.
    """
    unplanned = mart[
        (mart["valor_orcado"] == 0) & (mart["valor_realizado"] > 0)
    ][["cod_conta", "nome_conta", "valor_realizado"]].copy()

    if not unplanned.empty:
        total = unplanned["valor_realizado"].sum()
        logger.warning(
            "Gasto nao orcado (%d conta(s), R$ %.2f):\n%s",
            len(unplanned), total, unplanned.to_string(index=False),
        )
        return {
            "status": QS.WARNING,
            "count": len(unplanned),
            "total_nao_orcado": round(total, 2),
            "contas": unplanned.to_dict(orient="records"),
            "message": (
                f"{len(unplanned)} conta(s) com gasto nao orcado — "
                f"total R$ {total:,.2f}"
            ),
        }

    return {"status": QS.PASS}


def check_total_reconciliation_receita(
    int_receita_by_conta: pd.DataFrame,
    mart_receita: pd.DataFrame,
) -> dict:
    """Realized revenue in mart must equal total in int_receita (account from config)."""
    total_base = int_receita_by_conta["valor_realizado"].sum()
    total_mart = mart_receita.loc[
        mart_receita["cod_conta"] == RECEITA_COD_CONTA, "valor_realizado"
    ].sum()
    diff = abs(total_base - total_mart)

    if diff > TOLERANCE:
        logger.error(
            "RECEITA MISMATCH — base: R$ %.2f  mart: R$ %.2f  diff: R$ %.2f",
            total_base, total_mart, diff,
        )
        return {
            "status": QS.FAIL,
            "total_base": round(total_base, 2),
            "total_mart": round(total_mart, 2),
            "diff": round(diff, 2),
            "message": (
                f"Receita diverge: base=R$ {total_base:,.2f}  "
                f"mart=R$ {total_mart:,.2f}  diff=R$ {diff:,.2f}"
            ),
        }

    logger.info("Receita total reconciliation OK: R$ %.2f", total_mart)
    return {"status": QS.PASS, "total": round(total_mart, 2)}


def check_receita_sem_orcamento(mart_receita: pd.DataFrame) -> dict:
    """Detect realized revenue accounts with orcado=0 (no budget set)."""
    sem_orc = mart_receita[
        (mart_receita["valor_orcado"] == 0) & (mart_receita["valor_realizado"] > 0)
    ][["cod_conta", "nome_conta", "valor_realizado"]].copy()

    if not sem_orc.empty:
        total = sem_orc["valor_realizado"].sum()
        logger.warning(
            "Receita sem orçamento (%d conta(s), R$ %.2f):\n%s",
            len(sem_orc), total, sem_orc.to_string(index=False),
        )
        return {
            "status": QS.WARNING,
            "count": len(sem_orc),
            "total_sem_orcamento": round(total, 2),
            "contas": sem_orc.to_dict(orient="records"),
            "message": (
                f"{len(sem_orc)} conta(s) com receita sem orçamento — "
                f"total R$ {total:,.2f}"
            ),
        }

    return {"status": QS.PASS}


def check_nulls(mart: pd.DataFrame) -> dict:
    """Ensure no nulls in key mart columns (variacao_pct is allowed to be null)."""
    key_cols = ["cod_conta", "nome_conta", "valor_orcado", "valor_realizado", "variacao_rs"]
    null_counts = mart[key_cols].isnull().sum()
    has_nulls = (null_counts > 0).any()

    if has_nulls:
        logger.warning("Null values: %s", null_counts[null_counts > 0].to_dict())
        return {"status": QS.FAIL, "nulls": null_counts.to_dict()}

    return {"status": QS.PASS}
