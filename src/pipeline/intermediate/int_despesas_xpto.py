"""
Intermediate layer: filter XPTO CAMPINAS and aggregate by cod_conta
Grain: one row per cod_conta (realizado)
"""
import pandas as pd
import logging

from src.config import EMPRESA_FILTER

logger = logging.getLogger(__name__)


def build(stg_despesas: pd.DataFrame) -> pd.DataFrame:
    """Filter XPTO CAMPINAS and aggregate realized values by account code."""
    xpto = stg_despesas[stg_despesas["empresa"] == EMPRESA_FILTER].copy()
    logger.info("XPTO CAMPINAS records: %d (of %d total)", len(xpto), len(stg_despesas))

    if xpto.empty:
        raise ValueError(f"No records found for '{EMPRESA_FILTER}' after filtering")

    agg = (
        xpto.groupby(["cod_conta", "nome_conta"], as_index=False)["valor"]
        .sum()
        .rename(columns={"valor": "valor_realizado"})
    )
    logger.info("Distinct contas realizadas: %d  |  Total: R$ %.2f",
                len(agg), agg["valor_realizado"].sum())
    return agg
