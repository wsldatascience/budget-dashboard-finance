"""Unit tests for all pipeline layers using synthetic data."""
import pandas as pd
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.pipeline.intermediate.int_despesas_xpto import build as build_despesas_cde
from src.pipeline.intermediate.int_dre_long import aggregate_total
from src.pipeline.intermediate.int_receita import build_by_conta, build_by_convenio, build_by_grupo
from src.pipeline.marts.fct_budget_vs_realizado import build as build_mart
from src.pipeline.marts.fct_receita_vs_orcado import build as build_mart_receita
from src.quality.tests import (
    check_total_reconciliation, check_missing_contas, check_unplanned_spending,
    check_total_reconciliation_receita, check_receita_sem_orcamento,
)


@pytest.fixture
def stg_despesas():
    return pd.DataFrame({
        "empresa":    ["XPTO CAMPINAS", "XPTO CAMPINAS", "Outra Empresa"],
        "cod_conta":  ["320101", "320203", "320101"],
        "nome_conta": ["MEDICAMENTOS", "FERIAS PRODUCAO", "MEDICAMENTOS"],
        "valor":      [1000.0, 2000.0, 500.0],
    })


@pytest.fixture
def stg_dre():
    return pd.DataFrame({
        "cod_conta":    ["320101", "320203", "330101"],
        "nome_conta":   ["Medicamentos", "Ferias Producao", "Servicos TI"],
        "acumulado_q1": [1200.0, 1800.0, 300.0],
    })


def test_intermediate_filters_empresa(stg_despesas):
    result = build_despesas_cde(stg_despesas)
    assert set(result["cod_conta"]) == {"320101", "320203"}


def test_intermediate_aggregates_correctly(stg_despesas):
    result = build_despesas_cde(stg_despesas)
    assert result["valor_realizado"].sum() == 3000.0


def test_mart_variance_calculation(stg_dre, stg_despesas):
    dre_total    = aggregate_total(stg_dre)
    despesas_cde = build_despesas_cde(stg_despesas)
    mart         = build_mart(dre_total, despesas_cde)

    row = mart[mart["cod_conta"] == "320101"].iloc[0]
    assert row["valor_orcado"] == 1200.0
    assert row["valor_realizado"] == 1000.0
    assert row["variacao_rs"] == pytest.approx(-200.0)
    assert row["variacao_pct"] == pytest.approx(-16.67, abs=0.01)


def test_mart_zero_realizado_for_unmapped_conta(stg_dre, stg_despesas):
    dre_total    = aggregate_total(stg_dre)
    despesas_cde = build_despesas_cde(stg_despesas)
    mart         = build_mart(dre_total, despesas_cde)

    row = mart[mart["cod_conta"] == "330101"].iloc[0]
    assert row["valor_realizado"] == 0.0


def test_quality_reconciliation_pass(stg_despesas):
    despesas_cde = build_despesas_cde(stg_despesas)
    dre = pd.DataFrame({
        "cod_conta":    ["320101", "320203"],
        "nome_conta":   ["Medicamentos", "Ferias"],
        "acumulado_q1": [1200.0, 1800.0],
    })
    mart = build_mart(aggregate_total(dre), despesas_cde)
    result = check_total_reconciliation(despesas_cde, mart)
    assert result["status"] == "PASS"


def test_quality_missing_contas_detected():
    despesas = pd.DataFrame({
        "empresa":    ["XPTO CAMPINAS"],
        "cod_conta":  ["999999"],
        "nome_conta": ["CONTA INEXISTENTE"],
        "valor":      [500.0],
    })
    despesas_cde = build_despesas_cde(despesas)
    dre = pd.DataFrame({
        "cod_conta":    ["320101"],
        "nome_conta":   ["Medicamentos"],
        "acumulado_q1": [1000.0],
    })
    mart = build_mart(aggregate_total(dre), despesas_cde)
    result = check_missing_contas(despesas, mart)
    assert result["status"] == "FAIL"
    assert result["missing_count"] == 1


def test_quality_no_missing_contas(stg_dre, stg_despesas):
    dre_total    = aggregate_total(stg_dre)
    despesas_cde = build_despesas_cde(stg_despesas)
    mart         = build_mart(dre_total, despesas_cde)
    result       = check_missing_contas(stg_despesas, mart)
    assert result["status"] == "PASS"


def test_quality_unplanned_spending_detected():
    mart = pd.DataFrame({
        "cod_conta":        ["320101", "320203"],
        "nome_conta":       ["Medicamentos", "Ferias"],
        "valor_orcado":     [0.0, 1800.0],
        "valor_realizado":  [247885.78, 2000.0],
        "variacao_rs":      [247885.78, 200.0],
        "variacao_pct":     [None, 11.11],
    })
    result = check_unplanned_spending(mart)
    assert result["status"] == "WARNING"
    assert result["count"] == 1
    assert result["total_nao_orcado"] == pytest.approx(247885.78)


def test_quality_unplanned_spending_pass():
    mart = pd.DataFrame({
        "cod_conta":        ["320101", "320203"],
        "nome_conta":       ["Medicamentos", "Ferias"],
        "valor_orcado":     [1000.0, 1800.0],
        "valor_realizado":  [900.0, 2000.0],
        "variacao_rs":      [-100.0, 200.0],
        "variacao_pct":     [-10.0, 11.11],
    })
    result = check_unplanned_spending(mart)
    assert result["status"] == "PASS"


# ── Receita tests ──────────────────────────────────────────────────────────────

@pytest.fixture
def stg_receita():
    return pd.DataFrame({
        "empresa":       ["XPTO CAMPINAS", "XPTO CAMPINAS", "XPTO CAMPINAS", "Outra"],
        "convenio":      ["UNIMED", "UNIMED", "GO CARE", "UNIMED"],
        "grupo_produto": ["EXAMES", "EXAMES", "EXAMES", "EXAMES"],
        "sub_grupo":     ["TOMOGRAFIA", "US", "MAMOGRAFIA", "US"],
        "status":        ["F", "E", "F", "F"],
        "data":          pd.to_datetime(["2025-01-15", "2025-02-10", "2025-03-20", "2025-01-05"]),
        "valor":         [1000.0, 2000.0, 1500.0, 999.0],
    })


@pytest.fixture
def stg_dre_receita():
    return pd.DataFrame({
        "cod_conta":    ["310101", "310104", "310201"],
        "nome_conta":   ["Serviços", "(-) Glosas", "(-) ISS"],
        "jan_orcado":   [3000.0, 300.0, 150.0],
        "fev_orcado":   [3000.0, 300.0, 150.0],
        "mar_orcado":   [3000.0, 300.0, 150.0],
        "acumulado_q1": [9000.0, 900.0, 450.0],
    })


def test_receita_filters_empresa(stg_receita):
    result = build_by_conta(stg_receita)
    assert result["valor_realizado"].iloc[0] == 4500.0


def test_receita_monthly_breakdown(stg_receita):
    result = build_by_conta(stg_receita)
    assert result["rea_jan"].iloc[0] == 1000.0
    assert result["rea_fev"].iloc[0] == 2000.0
    assert result["rea_mar"].iloc[0] == 1500.0


def test_receita_by_convenio(stg_receita):
    result = build_by_convenio(stg_receita)
    unimed_total = result[result["convenio"] == "UNIMED"]["valor_realizado"].sum()
    assert unimed_total == pytest.approx(3000.0)


def test_receita_by_grupo(stg_receita):
    result = build_by_grupo(stg_receita)
    assert result["grupo_produto"].iloc[0] == "EXAMES"


def test_receita_mart_join(stg_receita, stg_dre_receita):
    receita_by_conta = build_by_conta(stg_receita)
    mart = build_mart_receita(stg_dre_receita, receita_by_conta)
    row = mart[mart["cod_conta"] == "310101"].iloc[0]
    assert row["valor_realizado"] == 4500.0
    assert row["valor_orcado"] == 9000.0
    assert row["variacao_rs"] == pytest.approx(-4500.0)


def test_receita_mart_deducoes_zero_realizado(stg_receita, stg_dre_receita):
    receita_by_conta = build_by_conta(stg_receita)
    mart = build_mart_receita(stg_dre_receita, receita_by_conta)
    glosas = mart[mart["cod_conta"] == "310104"].iloc[0]
    assert glosas["valor_realizado"] == 0.0


def test_receita_quality_reconciliation_pass(stg_receita, stg_dre_receita):
    receita_by_conta = build_by_conta(stg_receita)
    mart = build_mart_receita(stg_dre_receita, receita_by_conta)
    result = check_total_reconciliation_receita(receita_by_conta, mart)
    assert result["status"] == "PASS"


def test_receita_sem_orcamento_detected(stg_receita, stg_dre_receita):
    receita_by_conta = build_by_conta(stg_receita)
    mart = build_mart_receita(stg_dre_receita, receita_by_conta)
    result = check_receita_sem_orcamento(mart)
    assert result["status"] == "PASS"


def test_cod_conta_is_string_type(stg_dre, stg_despesas):
    dre_total    = aggregate_total(stg_dre)
    despesas_cde = build_despesas_cde(stg_despesas)
    mart         = build_mart(dre_total, despesas_cde)
    assert pd.api.types.is_string_dtype(mart["cod_conta"])
    assert isinstance(mart["cod_conta"].iloc[0], str)


# ── fct_receita_vs_orcado guards ───────────────────────────────────────────────

def test_receita_mart_raises_when_cod_conta_missing():
    """Guard: ValueError if RECEITA_COD_CONTA is absent from DRE 31xx accounts."""
    dre_without_receita = pd.DataFrame({
        "cod_conta":    ["310104"],  # only deduction, no gross revenue line
        "nome_conta":   ["(-) Glosas"],
        "jan_orcado":   [300.0],
        "fev_orcado":   [300.0],
        "mar_orcado":   [300.0],
        "acumulado_q1": [900.0],
    })
    receita = pd.DataFrame([{
        "cod_conta": "310101", "nome_conta": "Serviços",
        "rea_jan": 1000.0, "rea_fev": 2000.0, "rea_mar": 1500.0,
        "valor_realizado": 4500.0,
    }])
    with pytest.raises(ValueError, match="310101"):
        build_mart_receita(dre_without_receita, receita)


def test_receita_mart_raises_when_join_produces_zero():
    """Guard: ValueError if cod_conta types diverge causing silent zero join."""
    import os
    os.environ["RECEITA_COD_CONTA"] = "310101"
    dre = pd.DataFrame({
        "cod_conta":    ["310101"],
        "nome_conta":   ["Serviços"],
        "jan_orcado":   [3000.0],
        "fev_orcado":   [3000.0],
        "mar_orcado":   [3000.0],
        "acumulado_q1": [9000.0],
    })
    # Mismatched cod_conta: DRE has "310101", receita has "310101 " (trailing space)
    receita_mismatched = pd.DataFrame([{
        "cod_conta": "310101 ",  # trailing space causes join miss
        "nome_conta": "Serviços",
        "rea_jan": 1000.0, "rea_fev": 2000.0, "rea_mar": 1500.0,
        "valor_realizado": 4500.0,
    }])
    with pytest.raises(ValueError, match="zero"):
        build_mart_receita(dre, receita_mismatched)


def test_stg_despesas_includes_data_column():
    """stg_despesas staging must include 'data' column for monthly breakdowns."""
    import importlib, sys
    from pathlib import Path
    ROOT = Path(__file__).resolve().parent.parent
    DATA_FILE = ROOT / "data" / "teste_budget.xlsx"
    if not DATA_FILE.exists():
        pytest.skip("teste_budget.xlsx not present")
    from src.pipeline.staging.stg_despesas import read
    df = read(str(DATA_FILE))
    assert "data" in df.columns, "stg_despesas must expose 'data' column"
    assert pd.api.types.is_datetime64_any_dtype(df["data"]), "'data' must be datetime"


# ── Novos testes: cobertura das lacunas do audit ───────────────────────────────

def test_patch_formula_varying_monthly_budget():
    """
    _patch_formula_accounts must NOT patch an account where jan is legitimately
    different from fev (non-fixed monthly budget). Only jan=0, fev==mar triggers patch.
    """
    DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "teste_budget.xlsx"
    if not DATA_FILE.exists():
        pytest.skip("teste_budget.xlsx not present")
    from src.pipeline.staging.stg_dre import _patch_formula_accounts
    df_raw = pd.DataFrame({
        0: [310101.0],
        2: ["Serviços"],
        4: [0.0],    # jan = 0
        6: [500.0],  # fev = 500
        8: [300.0],  # mar = 300  ← differs from fev → must NOT be patched
        10: [800.0],
    })
    result = pd.DataFrame({
        "cod_conta":   ["310101"],
        "nome_conta":  ["Serviços"],
        "jan_orcado":  [0.0],
        "fev_orcado":  [500.0],
        "mar_orcado":  [300.0],
        "acumulado_q1": [800.0],
    })
    patched = _patch_formula_accounts(df_raw, result, str(DATA_FILE), "DRE")
    # jan must remain 0 — fev != mar, so the "fixed monthly" heuristic should not fire
    assert patched.iloc[0]["jan_orcado"] == 0.0, (
        "Patch incorrectly applied to account with varying monthly budget"
    )


def test_check_nulls_detects_null_values():
    """check_nulls must return FAIL when key columns contain NaN."""
    from src.quality.tests import check_nulls
    mart_with_null = pd.DataFrame({
        "cod_conta":        ["320101"],
        "nome_conta":       ["Medicamentos"],
        "valor_orcado":     [1000.0],
        "valor_realizado":  [float("nan")],   # ← NaN in key column
        "variacao_rs":      [float("nan")],
        "variacao_pct":     [None],
    })
    result = check_nulls(mart_with_null)
    assert result["status"] == "FAIL"


def test_duplicate_cod_conta_in_dre_triggers_warning(caplog):
    """stg_dre._validate() must emit a warning when cod_conta is duplicated."""
    import logging
    from src.pipeline.staging.stg_dre import _validate
    dre_with_dupe = pd.DataFrame({
        "cod_conta":    ["320101", "320101"],
        "nome_conta":   ["Medicamentos", "Medicamentos (dup)"],
        "acumulado_q1": [1000.0, 500.0],
    })
    with caplog.at_level(logging.WARNING, logger="src.pipeline.staging.stg_dre"):
        _validate(dre_with_dupe)
    assert any("Duplicate" in r.message or "duplicate" in r.message.lower()
               for r in caplog.records)


def test_compute_variance_pct_central_function():
    """compute_variance_pct must be the single implementation for variance %."""
    from src.utils import compute_variance_pct
    assert compute_variance_pct(900.0, 1000.0) == pytest.approx(-10.0)
    assert compute_variance_pct(1100.0, 1000.0) == pytest.approx(10.0)
    assert compute_variance_pct(0.0, 0.0) is None
    assert compute_variance_pct(500.0, 0.0) is None


def test_build_dashboard_data_returns_valid_json():
    """build() must return a dict that serialises to valid JSON (no NaN/Inf)."""
    import json
    from pathlib import Path
    ROOT = Path(__file__).resolve().parent.parent
    if not (ROOT / "data" / "teste_budget.xlsx").exists():
        pytest.skip("teste_budget.xlsx not present")
    from src.generate_dashboard_data import build
    data = build()
    serialised = json.dumps(data)          # raises if NaN/Inf present
    parsed = json.loads(serialised)
    assert parsed["empresa"] == "XPTO CAMPINAS"


def test_build_clusters_with_empty_base():
    """build_clusters must return [] gracefully when no account has orc_q1 > 0."""
    from src.generate_ml_data import build_clusters
    data = {
        "all_contas": [
            {"cod_conta": "320101", "nome_conta": "Medicamentos",
             "orc_q1": 0.0, "rea_q1": 500.0, "var_pct": None},
        ]
    }
    result = build_clusters(data)
    assert result == []


# ── IsolationForest — tratamento de orc=0 ─────────────────────────────────────

def test_build_anomalias_orc_zero_sempre_detectada():
    """
    Contas com orc=0 e rea>0 devem entrar nas anomalias como 'Sem Orçamento',
    nunca mascaradas pelo fill-zero do var_pct.
    """
    from src.generate_ml_data import build_anomalias
    contas = [
        {"cod_conta": "320101", "nome_conta": "Medicamentos", "grupo": "Insumos",
         "orc_q1": 0.0, "rea_q1": 247885.78, "var_rs": 247885.78, "var_pct": None},
    ]
    # 10 contas normais para que o IF tenha amostra suficiente
    for i in range(10):
        contas.append({
            "cod_conta": f"33010{i}", "nome_conta": f"Conta {i}", "grupo": "Ops",
            "orc_q1": 1000.0 + i*100, "rea_q1": 1000.0 + i*100,
            "var_rs": 0.0, "var_pct": 0.0,
        })
    result = build_anomalias({"all_contas": contas})
    sem_orc = [a for a in result if a["tipo"] == "Sem Orçamento"]
    assert len(sem_orc) == 1
    assert sem_orc[0]["cod_conta"] == "320101"
    assert sem_orc[0]["motivo"].startswith("orc=0")


def test_build_anomalias_no_colinearity_regression():
    """Features ortogonais: log_rea, exec_ratio, abs_var_pct — var_rs não entra."""
    import inspect
    from src.generate_ml_data import build_anomalias
    src = inspect.getsource(build_anomalias)
    assert "log_rea" in src
    assert "exec_ratio" in src
    assert "abs_var_pct" in src


# ── validation_gate — parser de condições ─────────────────────────────────────

def test_validation_gate_parses_3_term_orphan_rule():
    """
    _eval_condition deve aceitar: count(A.col NOT IN B.col
        AND NOT A.col STARTS_WITH prefixes AND NOT A.col IN accounts) == 0
    """
    from src.quality.validation_gate import _eval_condition
    inputs = {
        "expense_base": pd.DataFrame({
            "conta": ["320101", "120604", "307006", "999999"],
            "nome":  ["Med", "Maq", "Man", "Fant"],
            "realizado": [100.0, 200.0, 300.0, 400.0],
        }),
        "dre_table": pd.DataFrame({
            "conta": ["320101"],
            "nome":  ["Med"],
            "realizado": [100.0],
        }),
    }
    rule_cfg = {
        "out_of_scope_prefixes": {"12": "CapEx"},
        "known_unbudgeted_accounts": {"307006": "Manutenção"},
    }
    condition = (
        "count(expense_base.conta NOT IN dre_table.conta\n"
        "      AND NOT expense_base.conta STARTS_WITH out_of_scope_prefixes\n"
        "      AND NOT expense_base.conta IN known_unbudgeted_accounts) == 0"
    )
    passed, detail = _eval_condition(condition, inputs, 10.0, rule_cfg)
    # 999999 é a única órfã verdadeira (120604 out-of-scope, 307006 known)
    assert passed is False
    assert detail["orphan_count"] == 1
    assert detail["orphans"][0]["conta"] == "999999"
    assert detail["out_of_scope_count"] == 1
    assert detail["known_unbudgeted_count"] == 1


def test_validation_gate_unplanned_spending_count_pattern():
    """count(dre_table.orcado == 0 AND dre_table.realizado > 0) == 0"""
    from src.quality.validation_gate import _eval_condition
    inputs = {
        "dre_table": pd.DataFrame({
            "conta":     ["320101", "330101"],
            "orcado":    [0.0, 1000.0],
            "realizado": [500.0, 900.0],
        }),
    }
    cond = "count(dre_table.orcado == 0 AND dre_table.realizado > 0) == 0"
    passed, detail = _eval_condition(cond, inputs, 10.0)
    assert passed is False
    assert detail["count"] == 1


def test_validation_gate_quality_score_reuses_canonical():
    """_quality_score deve reusar o score do quality_report, não recalcular."""
    from src.quality.validation_gate import _quality_score
    quality = {"_quality_score": {"status": "PASS", "score": 9.7}}
    assert _quality_score(quality) == 9.7


def test_build_clusters_deterministic_no_kmeans():
    """
    Após §2.3, build_clusters deve classificar por faixa de var_pct
    (sem KMeans). Cada conta cai na faixa exata, sem variabilidade de seed.
    """
    from src.generate_ml_data import build_clusters
    contas = [
        # var_pct = (rea-orc)/|orc|*100
        {"cod_conta": "A", "nome_conta": "a", "grupo": "g",
         "orc_q1": 1000.0, "rea_q1": 800.0,  "var_pct": -20.0},   # economia_alta
        {"cod_conta": "B", "nome_conta": "b", "grupo": "g",
         "orc_q1": 1000.0, "rea_q1": 950.0,  "var_pct":  -5.0},   # dentro_orcado
        {"cod_conta": "C", "nome_conta": "c", "grupo": "g",
         "orc_q1": 1000.0, "rea_q1": 1050.0, "var_pct":   5.0},   # leve_estouro
        {"cod_conta": "D", "nome_conta": "d", "grupo": "g",
         "orc_q1": 1000.0, "rea_q1": 1300.0, "var_pct":  30.0},   # estouro_alto
    ]
    result = build_clusters({"all_contas": contas})
    labels = {c["label"]: c["count"] for c in result}
    assert labels == {
        "Economia Expressiva": 1,
        "Dentro do Orçado":    1,
        "Leve Estouro":        1,
        "Estouro Relevante":   1,
    }
    # Faixa legível sempre presente
    assert all("faixa" in c for c in result)


def test_build_clusters_no_kmeans_import_used():
    """Garante que o módulo não importa mais KMeans (ficou decorativo)."""
    import src.generate_ml_data as m
    assert not hasattr(m, "KMeans"), "KMeans não deveria estar importado"


def test_stg_despesas_period_filter_warns_out_of_range(caplog):
    """stg_despesas deve emitir WARNING para registros fora do PERIODO_START/END."""
    import logging
    from src.pipeline.staging.stg_despesas import _apply_period_filter
    df = pd.DataFrame({
        "data":  pd.to_datetime(["2025-01-15", "2025-04-10", "2024-12-20"]),
        "valor": [100.0, 200.0, 300.0],
    })
    with caplog.at_level(logging.WARNING, logger="src.pipeline.staging.stg_despesas"):
        _apply_period_filter(df)
    assert any("fora do período" in r.message for r in caplog.records)
