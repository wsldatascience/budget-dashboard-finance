"""
ML Pipeline — FP&A XPTO CAMPINAS
Gera dashboard/public/ml_data.json com:
  - Projeção Q2 2025 (receita + despesas) via Média Ponderada Exponencial
  - Detecção de anomalias via Isolation Forest
  - Segmentação de contas via K-Means (k=4)
  - Classificação de risco por threshold

Entrada: dashboard/public/dashboard_data.json
Saída:   dashboard/public/ml_data.json
"""
import json
import logging
import math
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from src.config import (
    ML_SCENARIOS, ML_FORECAST_WEIGHTS, 
    ML_ANOMALY_CONTAMINATION,
    ML_CLUSTER_THRESHOLDS, 
    ML_RISK_THRESHOLDS,
)

ROOT     = _ROOT
IN_FILE  = ROOT / "dashboard" / "public" / "dashboard_data.json"
OUT_FILE = ROOT / "dashboard" / "public" / "ml_data.json"

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MONTHS_Q1 = [1, 2, 3]


# ── Previsão Q2 (Média Ponderada + Cenários) ─────────────────────────────────
#
# Com apenas 3 pontos mensais, regressão linear produz R² não confiável.
# Usamos média ponderada exponencial (peso maior para o mês mais recente)
# e cenários explícitos em vez de intervalos derivados do modelo.
#
# Cenários (aplicados ao valor base projetado):
#   Pessimista: -8%  receita / +8%  despesas
#   Base:         0%  receita /  0%  despesas
#   Otimista:   +8%  receita / -8%  despesas

def _weighted_forecast(y_values: list[float]) -> dict:
    """
    Projeta os próximos 3 meses como a média ponderada do Q1,
    mantendo a tendência observada entre os meses.
    """
    y = np.array(y_values, dtype=float)
    weights = np.array(ML_FORECAST_WEIGHTS)
    base_month = float(np.dot(weights, y))   # valor mensal base projetado

    # Tendência: inclinação entre o primeiro e o último mês
    slope = float((y[-1] - y[0]) / max(len(y) - 1, 1))

    # Q2 = base + tendência acumulada mês a mês
    forecast = [round(base_month + slope * (i + 1), 2) for i in range(3)]

    pct_change = round((y[-1] - y[0]) / abs(y[0]) * 100, 2) if y[0] != 0 else 0.0

    pesos_pct = "/".join(f"{int(w*100)}%" for w in ML_FORECAST_WEIGHTS)
    return {
        "values":     forecast,
        "base_month": round(base_month, 2),
        "slope":      round(slope, 2),
        "pct_change_q1": pct_change,
        "metodo":     f"Média ponderada Q1 (pesos: {pesos_pct}) + tendência linear",
        "aviso":      "Previsão indicativa baseada em 3 meses. Validade: 30 dias.",
    }


def build_forecast(data: dict) -> dict:
    rec     = data["receita"]["summary"]
    monthly = data["monthly"]

    rec_q1  = [rec["rea_jan"], rec["rea_fev"], rec["rea_mar"]]
    desp_q1 = [m["realizado"] for m in monthly]

    rec_fc  = _weighted_forecast(rec_q1)
    desp_fc = _weighted_forecast(desp_q1)

    rec_q2  = sum(rec_fc["values"])
    desp_q2 = sum(desp_fc["values"])

    # Cenários explícitos
    def _apply_scenario(base_q2: float, tipo: str) -> dict:
        cfg = ML_SCENARIOS[tipo]
        return {
            "pessimista": round(base_q2 * (1 + cfg["pessimista"]), 2),
            "base":       round(base_q2, 2),
            "otimista":   round(base_q2 * (1 + cfg["otimista"]),   2),
        }

    rec_cen  = _apply_scenario(rec_q2,  "receita")
    desp_cen = _apply_scenario(desp_q2, "despesas")

    logger.info("Forecast receita Q2 (base): R$ %.0f  tendência Q1: %.1f%%",
                rec_q2, rec_fc["pct_change_q1"])
    logger.info("Forecast despesas Q2 (base): R$ %.0f  tendência Q1: %.1f%%",
                desp_q2, desp_fc["pct_change_q1"])

    # Série visual Q1 (real) + Q2 (previsto) — Março aparece nos dois segmentos
    series = []
    for i, mes in enumerate(["Jan", "Fev", "Mar"]):
        series.append({
            "mes":          mes,
            "trimestre":    "Q1",
            "receita_real": round(rec_q1[i], 2),
            "despesa_real": round(desp_q1[i], 2),
            "receita_prev": round(rec_q1[i], 2) if i == 2 else None,
            "despesa_prev": round(desp_q1[i], 2) if i == 2 else None,
        })
    for i, mes in enumerate(["Abr", "Mai", "Jun"]):
        series.append({
            "mes":          mes,
            "trimestre":    "Q2",
            "receita_real": None,
            "despesa_real": None,
            "receita_prev": rec_fc["values"][i],
            "despesa_prev": desp_fc["values"][i],
        })

    return {
        "series_mensal": series,
        "receita": {
            "q1_total":       round(sum(rec_q1), 2),
            "q2_previsto":    rec_cen["base"],
            "q2_otimista":    rec_cen["otimista"],
            "q2_pessimista":  rec_cen["pessimista"],
            "pct_change_q1":  rec_fc["pct_change_q1"],
            "tendencia":      "crescente" if rec_fc["slope"] > 0 else "decrescente",
            "metodo":         rec_fc["metodo"],
            "aviso":          rec_fc["aviso"],
        },
        "despesas": {
            "q1_total":       round(sum(desp_q1), 2),
            "q2_previsto":    desp_cen["base"],
            "q2_otimista":    desp_cen["otimista"],
            "q2_pessimista":  desp_cen["pessimista"],
            "pct_change_q1":  desp_fc["pct_change_q1"],
            "tendencia":      "crescente" if desp_fc["slope"] > 0 else "decrescente",
            "metodo":         desp_fc["metodo"],
            "aviso":          desp_fc["aviso"],
        },
        "margem": {
            "q2_prevista":   round(rec_cen["base"]       - desp_cen["base"],       2),
            "q2_otimista":   round(rec_cen["otimista"]   - desp_cen["otimista"],   2),
            "q2_pessimista": round(rec_cen["pessimista"] - desp_cen["pessimista"], 2),
        },
    }


# ── Detecção de Anomalias (Isolation Forest) ─────────────────────────────────
#
# Design notes:
# 1. Contas com orc_q1 == 0 são anomalias *por definição* (gasto não-orçado)
#    e não devem entrar no IF — a feature `var_pct` é indefinida nelas.
#    Elas são retornadas diretamente como "Sem Orçamento".
# 2. Features ortogonais (evitando colinearidade de var_rs = rea - orc):
#      - log1p(rea_q1)      → magnitude, com escala comprimida
#      - exec_ratio (cap)   → desvio relativo de execução (1.0 = perfeito)
#      - |var_pct|          → intensidade da variação (sinal irrelevante p/ IF)
# 3. contamination é hiperparâmetro declarado (config), não "quota mágica".

def build_anomalias(data: dict) -> list[dict]:
    df = pd.DataFrame(data["all_contas"])
    df["var_pct_num"] = pd.to_numeric(df["var_pct"], errors="coerce")

    # ── Caso 1: orc=0 e rea>0 → anomalia por definição ───────────────────────
    sem_orc = df[(df["orc_q1"] == 0) & (df["rea_q1"] > 0)].copy()
    sem_orc_out = [{
        "cod_conta":     str(r["cod_conta"]),
        "nome_conta":    str(r["nome_conta"]),
        "grupo":         str(r["grupo"]),
        "orc_q1":        round(float(r["orc_q1"]), 2),
        "rea_q1":        round(float(r["rea_q1"]), 2),
        "var_rs":        round(float(r["var_rs"]), 2),
        "var_pct":       None,
        "anomaly_score": None,
        "tipo":          "Sem Orçamento",
        "motivo":        "orc=0 e realizado>0 (gasto não planejado)",
    } for _, r in sem_orc.iterrows()]

    # ── Caso 2: IF em contas com orçamento e realizado ───────────────────────
    base = df[(df["orc_q1"] > 0)].copy()
    if base.empty:
        logger.info("Anomalias detectadas: %d (todas 'Sem Orçamento')", len(sem_orc_out))
        return sem_orc_out

    base["log_rea"]     = np.log1p(base["rea_q1"].clip(lower=0))
    base["exec_ratio"]  = (base["rea_q1"] / base["orc_q1"]).clip(0, 5)
    base["abs_var_pct"] = base["var_pct_num"].abs().fillna(0)

    X = base[["log_rea", "exec_ratio", "abs_var_pct"]].values
    X_scaled = StandardScaler().fit_transform(X)

    iso    = IsolationForest(
        contamination=ML_ANOMALY_CONTAMINATION,
        random_state=42, n_estimators=200,
    )
    base["is_anomaly"]    = iso.fit_predict(X_scaled) == -1
    base["anomaly_score"] = iso.score_samples(X_scaled)

    anomalias = base[base["is_anomaly"]].sort_values("anomaly_score").head(15)

    if_out = [{
        "cod_conta":     str(r["cod_conta"]),
        "nome_conta":    str(r["nome_conta"]),
        "grupo":         str(r["grupo"]),
        "orc_q1":        round(float(r["orc_q1"]), 2),
        "rea_q1":        round(float(r["rea_q1"]), 2),
        "var_rs":        round(float(r["var_rs"]), 2),
        "var_pct":       round(float(r["var_pct_num"]), 2) if pd.notna(r["var_pct_num"]) else None,
        "anomaly_score": round(float(r["anomaly_score"]), 4),
        "tipo":          "Estouro" if float(r["var_rs"]) > 0 else "Economia",
        "motivo":        "comportamento atípico (IsolationForest)",
    } for _, r in anomalias.iterrows()]

    result = sem_orc_out + if_out
    logger.info(
        "Anomalias: %d (%d sem orçamento + %d IsolationForest)",
        len(result), len(sem_orc_out), len(if_out),
    )
    return result


# ── Segmentação por faixa de variação orçamentária ───────────────────────────
#
# Design note: a versão anterior usava KMeans(k=4), mas o rótulo final era
# determinado por threshold sobre var_pct (não pelos centroides). O clustering
# era decorativo — o resultado dependia só dos thresholds. Removemos o KMeans
# e classificamos diretamente por faixa, o que é honesto sobre a lógica e
# produz a mesma segmentação sem a variabilidade do StandardScaler + random_state.

_CLUSTER_BANDS = [
    {
        "tag": "economia_alta", "label": "Economia Expressiva",
        "color": "#10b981", "icon": "↘",
        "faixa_label": "var < -10%",
    },
    {
        "tag": "dentro_orcado", "label": "Dentro do Orçado",
        "color": "#14b8a6", "icon": "→",
        "faixa_label": "-10% ≤ var < 0%",
    },
    {
        "tag": "leve_estouro", "label": "Leve Estouro",
        "color": "#f59e0b", "icon": "↗",
        "faixa_label": "0% ≤ var < 15%",
    },
    {
        "tag": "estouro_alto", "label": "Estouro Relevante",
        "color": "#ef4444", "icon": "↑",
        "faixa_label": "var ≥ 15%",
    },
]


def _band_index(var_pct: float) -> int:
    t = ML_CLUSTER_THRESHOLDS
    if var_pct < t["economia_alta"]:
        return 0
    if var_pct < t["dentro_orcado"]:
        return 1
    if var_pct < t["leve_estouro"]:
        return 2
    return 3


def build_clusters(data: dict) -> list[dict]:
    """
    Classifica contas com orçamento em 4 faixas determinísticas de var_pct.
    Contas com orc=0 não entram (var_pct indefinida — ver build_anomalias).
    """
    df = pd.DataFrame(data["all_contas"])
    df["var_pct_num"] = pd.to_numeric(df["var_pct"], errors="coerce")

    base = df[df["orc_q1"] > 0].copy()
    if base.empty:
        logger.warning("build_clusters: no accounts with orc_q1 > 0 — skipping")
        return []

    base["band"] = base["var_pct_num"].fillna(0).apply(_band_index)

    result = []
    for band_idx, info in enumerate(_CLUSTER_BANDS):
        subset = base[base["band"] == band_idx]
        if subset.empty:
            continue
        var_med = float(subset["var_pct_num"].mean())
        exemplos = (
            subset.nlargest(3, "rea_q1")[["cod_conta", "nome_conta"]]
            .assign(cod_conta=lambda d: d["cod_conta"].astype(str))
            .to_dict(orient="records")
        )
        result.append({
            "cluster_id":    band_idx,
            "rank":          band_idx,
            "label":         info["label"],
            "color":         info["color"],
            "icon":          info["icon"],
            "faixa":         info["faixa_label"],
            "count":         int(len(subset)),
            "valor_total":   round(float(subset["rea_q1"].sum()), 2),
            "var_pct_media": round(var_med, 2),
            "exemplos":      exemplos,
        })

    logger.info("Clusters: %s", [(c["label"], c["count"]) for c in result])
    return result


# ── Classificação de Risco ────────────────────────────────────────────────────

_RISK_CONFIG = {
    "Alto":           {"color": "#ef4444", "threshold": "> 10%"},
    "Médio":          {"color": "#f59e0b", "threshold": "0% a 10%"},
    "Baixo":          {"color": "#10b981", "threshold": "< 0%"},
    "Sem Orçamento":  {"color": "#64748b", "threshold": "orc = 0"},
}


def _classify_risk(row) -> str:
    if row["orc_q1"] == 0:
        return "Sem Orçamento" if row["rea_q1"] > 0 else "Neutro"
    vp = float(row["var_pct"]) if row["var_pct"] is not None else 0
    if vp > ML_RISK_THRESHOLDS["alto"]:
        return "Alto"
    elif vp > ML_RISK_THRESHOLDS["medio"]:
        return "Médio"
    return "Baixo"


def build_risco(data: dict) -> dict:
    df = pd.DataFrame(data["all_contas"])
    df["var_pct"] = pd.to_numeric(df["var_pct"], errors="coerce")
    df["risco"]   = df.apply(_classify_risk, axis=1)

    distribuicao = []
    for nivel, cfg in _RISK_CONFIG.items():
        subset = df[df["risco"] == nivel]
        if len(subset) == 0:
            continue
        distribuicao.append({
            "nivel":         nivel,
            "count":         int(len(subset)),
            "valor_em_risco": round(float(subset["var_rs"].clip(lower=0).sum()), 2),
            "color":         cfg["color"],
            "threshold":     cfg["threshold"],
        })

    alto = df[df["risco"] == "Alto"].nlargest(10, "var_rs")
    alto_list = []
    for _, row in alto.iterrows():
        alto_list.append({
            "cod_conta":  str(row["cod_conta"]),
            "nome_conta": str(row["nome_conta"]),
            "grupo":      str(row["grupo"]),
            "orc_q1":     round(float(row["orc_q1"]), 2),
            "rea_q1":     round(float(row["rea_q1"]), 2),
            "var_rs":     round(float(row["var_rs"]), 2),
            "var_pct":    round(float(row["var_pct"]), 2) if row["var_pct"] == row["var_pct"] else None,
        })

    logger.info("Risco: %s", {d["nivel"]: d["count"] for d in distribuicao})
    return {"distribuicao": distribuicao, "alto_risco": alto_list}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(v) for v in obj]
    return obj


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(IN_FILE, encoding="utf-8") as f:
        data = json.load(f)

    logger.info("Running ML pipeline...")

    ml_data = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "modelo": {
            "versao": "1.0.0",
            "algoritmos": {
                "forecast":  "Média ponderada exponencial Q1 + cenários (pessimista/base/otimista ±8%)",
                "anomalias": "IsolationForest (sklearn, contamination=0.12) + regra determinística para orc=0",
                "clusters":  "Classificação por faixa de var_pct (determinística, 4 bandas)",
                "risco":     "Threshold classifier",
            },
            "observacao": (
                "Forecast baseado em média ponderada de 3 meses (pesos: 20/35/45%). "
                "Previsões Q2 são indicativas — validade 30 dias."
            ),
        },
        "forecast":  build_forecast(data),
        "anomalias": build_anomalias(data),
        "clusters":  build_clusters(data),
        "risco":     build_risco(data),
    }

    ml_data = _clean(ml_data)

    tmp = OUT_FILE.with_suffix(".tmp")
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(ml_data, f, ensure_ascii=False, indent=2)
        os.replace(tmp, OUT_FILE)
    except Exception:
        tmp.unlink(missing_ok=True)
        raise

    logger.info("Saved → %s", OUT_FILE)


if __name__ == "__main__":
    main()
