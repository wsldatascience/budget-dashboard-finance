"""
Staging layer: Base da Receita sheet
Grain: one row per revenue record

Sheet structure (0-indexed columns):
  col 2  = Convênio
  col 4  = Data Atend
  col 6  = Grupo de produto
  col 7  = Sub Grupo
  col 8  = Status da conta (A=Aberta / E=Enviada / F=Faturada / P=Paga — todos incluídos)
  col 11 = Vl Total
  col 13 = Empresa
"""
import pandas as pd
import logging

from src.config import EMPRESA_FILTER

logger = logging.getLogger(__name__)


def read(filepath: str, sheet_name: str = "Base da Receita") -> pd.DataFrame:
    raw = pd.read_excel(filepath, sheet_name=sheet_name, header=0)
    logger.info("Receita raw shape: %s", raw.shape)

    df = pd.DataFrame({
        "empresa":       raw.iloc[:, 13].astype(str).str.strip(),
        "convenio":      raw.iloc[:, 2].astype(str).str.strip(),
        "grupo_produto": raw.iloc[:, 6].astype(str).str.strip(),
        "sub_grupo":     raw.iloc[:, 7].astype(str).str.strip(),
        "status":        raw.iloc[:, 8].astype(str).str.strip(),
        "data":          pd.to_datetime(raw.iloc[:, 4], errors="coerce"),
        "valor":         pd.to_numeric(raw.iloc[:, 11], errors="coerce"),
    })

    df = df.dropna(subset=["valor"])
    logger.info("Receita valid rows: %d", len(df))

    empresas = df["empresa"].unique().tolist()
    logger.info("Empresas found: %s", empresas)
    if EMPRESA_FILTER not in empresas:
        logger.warning("'%s' not found. Empresas: %s", EMPRESA_FILTER, empresas)

    _validate(df)
    return df


def _validate(df: pd.DataFrame) -> None:
    if df.empty:
        raise ValueError("Receita staging returned empty DataFrame")
