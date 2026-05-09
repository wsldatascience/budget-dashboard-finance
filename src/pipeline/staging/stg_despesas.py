"""
Staging layer: Base de Despesa sheet
Grain: one row per despesa record

Sheet structure (0-indexed columns):
  col 1  = Data do Lançamento
  col 3  = Empresa da Despesa
  col 9  = Cod. Conta Classificacao  (join key to DRE)
  col 10 = Conta Classificacao       (descriptive name)
  col 11 = Valor da Classificacao    (monetary value)
"""
import pandas as pd
import logging

from src.config import EMPRESA_FILTER, PERIODO_START, PERIODO_END

logger = logging.getLogger(__name__)


def read(filepath: str, sheet_name: str = "Base de Despesa") -> pd.DataFrame:
    raw = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
    logger.info("Despesas raw shape: %s", raw.shape)

    # Row 0 is the header
    data = raw.iloc[1:].copy().reset_index(drop=True)

    df = pd.DataFrame({
        "empresa":     data.iloc[:, 3].astype(str).str.strip(),
        "cod_conta":   data.iloc[:, 9].astype(str).str.strip(),
        "nome_conta":  data.iloc[:, 10].astype(str).str.strip(),
        "valor":       pd.to_numeric(data.iloc[:, 11], errors="coerce"),
        "data":        pd.to_datetime(data.iloc[:, 1], errors="coerce"),
    })

    df = df.dropna(subset=["valor"])
    logger.info("Despesas valid rows: %d", len(df))

    _apply_period_filter(df)

    empresas = df["empresa"].unique().tolist()
    logger.info("Empresas found: %s", empresas)
    if EMPRESA_FILTER not in empresas:
        logger.warning("'%s' not found. Empresas available: %s", EMPRESA_FILTER, empresas)

    _validate(df)
    return df


def _apply_period_filter(df: pd.DataFrame) -> None:
    """
    Log a WARNING for records outside [PERIODO_START, PERIODO_END] (inclusive).
    Does not mutate the DataFrame — downstream aggregations should filter by
    date when they care, but this makes silent period drift visible.
    """
    start = pd.Timestamp(PERIODO_START)
    end   = pd.Timestamp(PERIODO_END) + pd.Timedelta(days=1)   # end-exclusive
    mask_out = df["data"].notna() & ((df["data"] < start) | (df["data"] >= end))
    if mask_out.any():
        bad = df.loc[mask_out, ["data", "valor"]]
        logger.warning(
            "Despesas com data fora do período [%s, %s]: %d registros "
            "(total R$ %.2f) — min=%s max=%s",
            PERIODO_START, PERIODO_END,
            len(bad), bad["valor"].sum(),
            bad["data"].min(), bad["data"].max(),
        )


def _validate(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Despesas staging returned empty DataFrame")
