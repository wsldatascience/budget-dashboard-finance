"""
Mart layer: budget vs actual comparison
Grain: one row per cod_conta

Join key: cod_conta (string)
Left  = DRE (all budgeted accounts)
Right = XPTO CAMPINAS realized expenses
"""
import pandas as pd
import logging

from src.utils import compute_variance_pct

logger = logging.getLogger(__name__)


DESPESAS_PREFIX = "3"   # 32xx-39xx only; 31xx handled by fct_receita_vs_orcado


def build(int_dre: pd.DataFrame, int_despesas: pd.DataFrame) -> pd.DataFrame:
    """Left join DRE expense accounts (32xx+) to XPTO realized expenses."""
    # Exclude revenue/abatimento accounts (31xx) — they belong to receita mart
    int_dre = int_dre[~int_dre["cod_conta"].str.startswith("31")].copy()

    mart = int_dre.merge(
        int_despesas[["cod_conta", "valor_realizado"]],
        on="cod_conta",
        how="left",
    )
    mart["valor_realizado"] = mart["valor_realizado"].fillna(0)

    # Ensure cod_conta stays as string after merge
    mart["cod_conta"] = mart["cod_conta"].astype(str)

    mart["variacao_rs"]  = mart["valor_realizado"] - mart["valor_orcado"]
    mart["variacao_pct"] = mart.apply(_variacao_pct, axis=1)

    mart = mart[[
        "cod_conta",
        "nome_conta",
        "valor_orcado",
        "valor_realizado",
        "variacao_rs",
        "variacao_pct",
    ]]

    logger.info(
        "Mart rows: %d  |  Orcado: R$ %.2f  |  Realizado: R$ %.2f",
        len(mart), mart["valor_orcado"].sum(), mart["valor_realizado"].sum(),
    )
    return mart


def _variacao_pct(row: pd.Series):
    return compute_variance_pct(row["valor_realizado"], row["valor_orcado"])
