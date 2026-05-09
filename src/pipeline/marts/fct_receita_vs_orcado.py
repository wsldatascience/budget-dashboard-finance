"""
Mart layer: receita vs orçado comparison
Grain: one row per cod_conta (DRE accounts 31xx)

Left  = DRE receita/abatimentos accounts (31xx)
Right = XPTO CAMPINAS realized gross revenue (RECEITA_COD_CONTA from config)

Note: acumulado_q1 in the DRE sheet uses Excel formulas not evaluated at
      read time. valor_orcado is derived from jan + fev + mar columns.
"""
import pandas as pd
import logging

from src.config import RECEITA_COD_CONTA
from src.utils import compute_variance_pct

logger = logging.getLogger(__name__)

RECEITA_PREFIX = "31"


def build(stg_dre: pd.DataFrame, int_receita_by_conta: pd.DataFrame) -> pd.DataFrame:
    """Left join DRE 31xx accounts to realized revenue and compute variances."""
    receita_dre = stg_dre[stg_dre["cod_conta"].str.startswith(RECEITA_PREFIX)].copy()

    # Guard: the realized revenue row must exist in the DRE for reconciliation to work.
    # If RECEITA_COD_CONTA is absent, the join produces zero realized on the gross revenue
    # line — a silent reconciliation failure with no exception raised.
    if RECEITA_COD_CONTA not in receita_dre["cod_conta"].values:
        raise ValueError(
            f"RECEITA_COD_CONTA '{RECEITA_COD_CONTA}' not found in DRE 31xx accounts. "
            f"Check config.py or the DRE sheet. Available: {receita_dre['cod_conta'].tolist()}"
        )
    receita_dre["valor_orcado"] = (
        receita_dre["jan_orcado"] + receita_dre["fev_orcado"] + receita_dre["mar_orcado"]
    ).round(2)

    mart = receita_dre[["cod_conta", "nome_conta", "valor_orcado"]].merge(
        int_receita_by_conta[["cod_conta", "valor_realizado"]],
        on="cod_conta",
        how="left",
    )
    mart["valor_realizado"] = mart["valor_realizado"].fillna(0.0)

    # Post-merge guard: if input revenue is non-zero, the joined row must be too.
    # A zero here means the cod_conta types didn't match (e.g. "310101" vs 310101.0).
    expected = int_receita_by_conta["valor_realizado"].sum()
    joined   = mart.loc[mart["cod_conta"] == RECEITA_COD_CONTA, "valor_realizado"].sum()
    if expected > 0 and joined == 0:
        raise ValueError(
            f"Revenue join produced zero for '{RECEITA_COD_CONTA}' after merge — "
            f"possible cod_conta type mismatch. Input total: R$ {expected:,.2f}"
        )
    mart["variacao_rs"]  = (mart["valor_realizado"] - mart["valor_orcado"]).round(2)
    mart["variacao_pct"] = mart.apply(_variacao_pct, axis=1)

    mart = mart[[
        "cod_conta", "nome_conta", "valor_orcado",
        "valor_realizado", "variacao_rs", "variacao_pct",
    ]]

    logger.info(
        "Mart receita rows: %d | Orçado: R$ %.2f | Realizado: R$ %.2f",
        len(mart), mart["valor_orcado"].sum(), mart["valor_realizado"].sum(),
    )
    return mart


def _variacao_pct(row: pd.Series):
    return compute_variance_pct(row["valor_realizado"], row["valor_orcado"])
