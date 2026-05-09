"""
Intermediate layer: DRE helpers
"""
import pandas as pd


def aggregate_total(stg_dre: pd.DataFrame) -> pd.DataFrame:
    """Return total Q1 orçado per conta using the pre-summed acumulado column."""
    return stg_dre[["cod_conta", "nome_conta", "acumulado_q1"]].rename(
        columns={"acumulado_q1": "valor_orcado"}
    )
