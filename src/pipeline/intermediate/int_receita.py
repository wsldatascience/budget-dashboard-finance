"""
Intermediate layer: XPTO CAMPINAS revenue aggregations
Three grains:
  build_by_conta    — Q1 total mapped to RECEITA_COD_CONTA from config (mart input)
  build_by_convenio — monthly totals by convênio (dashboard)
  build_by_grupo    — monthly totals by grupo_produto (dashboard)
"""
import pandas as pd
import logging

from src.config import EMPRESA_FILTER, RECEITA_COD_CONTA, RECEITA_NOME_CONTA

logger = logging.getLogger(__name__)


def _filter_xpto(stg_receita: pd.DataFrame) -> pd.DataFrame:
    xpto = stg_receita[stg_receita["empresa"] == EMPRESA_FILTER].copy()
    logger.info("XPTO CAMPINAS receita: %d records (of %d total)", len(xpto), len(stg_receita))
    if xpto.empty:
        raise ValueError(f"No records found for '{EMPRESA_FILTER}' in receita")
    xpto["mes"] = xpto["data"].dt.month
    return xpto


def build_by_conta(stg_receita: pd.DataFrame) -> pd.DataFrame:
    """Aggregate Q1 realized revenue mapped to RECEITA_COD_CONTA (config). Used by mart."""
    xpto = _filter_xpto(stg_receita)

    monthly = (
        xpto.groupby("mes")["valor"]
        .sum()
        .reindex([1, 2, 3], fill_value=0.0)
    )

    result = pd.DataFrame([{
        "cod_conta":       RECEITA_COD_CONTA,
        "nome_conta":      RECEITA_NOME_CONTA,
        "rea_jan":         round(float(monthly[1]), 2),
        "rea_fev":         round(float(monthly[2]), 2),
        "rea_mar":         round(float(monthly[3]), 2),
        "valor_realizado": round(float(monthly.sum()), 2),
    }])

    logger.info(
        "Receita Bruta — Jan: R$ %.2f | Fev: R$ %.2f | Mar: R$ %.2f | Q1: R$ %.2f",
        result["rea_jan"].iloc[0], result["rea_fev"].iloc[0],
        result["rea_mar"].iloc[0], result["valor_realizado"].iloc[0],
    )
    return result


def build_by_convenio(stg_receita: pd.DataFrame) -> pd.DataFrame:
    """Aggregate realized revenue by convênio and month. Used by dashboard."""
    xpto = _filter_xpto(stg_receita)
    agg = (
        xpto.groupby(["convenio", "mes"])["valor"]
        .sum()
        .reset_index()
        .rename(columns={"valor": "valor_realizado"})
    )
    agg["valor_realizado"] = agg["valor_realizado"].round(2)

    convenio_total = agg.groupby("convenio")["valor_realizado"].sum().sort_values(ascending=False)
    logger.info("Top convênios: %s", convenio_total.head(3).to_dict())
    return agg


def build_by_grupo(stg_receita: pd.DataFrame) -> pd.DataFrame:
    """Aggregate realized revenue by grupo_produto and month. Used by dashboard."""
    xpto = _filter_xpto(stg_receita)
    agg = (
        xpto.groupby(["grupo_produto", "mes"])["valor"]
        .sum()
        .reset_index()
        .rename(columns={"valor": "valor_realizado"})
    )
    agg["valor_realizado"] = agg["valor_realizado"].round(2)
    return agg
