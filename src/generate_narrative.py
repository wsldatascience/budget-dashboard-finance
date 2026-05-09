"""
AI Narrative Generator — FP&A Executive Summary
Reads dashboard_data.json + ml_data.json and calls OpenAI API to produce
a CFO-ready narrative with diagnosis, risk flags, and recommended actions.

Requires:
  pip install openai
  OPENAI_API_KEY=<sua-chave> python src/generate_narrative.py
"""
import json
import logging
import os
from pathlib import Path

ROOT         = Path(__file__).resolve().parent.parent
DASH_FILE    = ROOT / "dashboard" / "public" / "dashboard_data.json"
ML_FILE      = ROOT / "dashboard" / "public" / "ml_data.json"
OUT_FILE     = ROOT / "dashboard" / "public" / "narrative.json"

# Load .env if present (mirrors the pattern used in scripts/server.py)
_env_file = ROOT / ".env"
if _env_file.exists():
    for _line in _env_file.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip())

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _sanitize_field(value: str, max_len: int = 120) -> str:
    """
    Strip prompt injection patterns from Excel-sourced text fields.
    Removes instruction-like phrases and limits length.
    """
    import re
    value = str(value).strip()
    # Remove common injection openers in PT/EN
    value = re.sub(
        r'(?i)(ignore|esqueça|desconsidere|forget|disregard|override|system:|<\|).{0,80}',
        '[CAMPO INVÁLIDO]',
        value,
    )
    # Strip markdown/code block attempts
    value = re.sub(r'```.*?```', '', value, flags=re.DOTALL)
    value = re.sub(r'[#*`<>]', '', value)
    return value[:max_len]


def _build_prompt(dash: dict, ml: dict) -> str:
    s      = dash["summary"]
    rec    = dash["receita"]["summary"]
    groups = dash["by_group"]
    alerts = dash["quality"]
    fc     = ml.get("forecast", {})
    risks  = ml.get("risco", {}).get("distribuicao", [])

    top_groups = sorted(groups, key=lambda g: g.get("variacao_rs", 0), reverse=True)[:3]
    group_lines = "\n".join(
        f"  - {_sanitize_field(g['grupo'])}: orçado R$ {g['orcado']:,.0f} / realizado R$ {g['realizado']:,.0f} "
        f"/ variação R$ {g['variacao_rs']:+,.0f} ({g.get('variacao_pct') or 0:+.1f}%)"
        for g in top_groups
    )

    unplanned = alerts.get("unplanned_spending", [])
    unplanned_lines = "\n".join(
        f"  - {_sanitize_field(u['nome_conta'])} (cod {_sanitize_field(u['cod_conta'], 10)}): "
        f"R$ {u['valor_realizado']:,.0f} sem orçamento"
        for u in unplanned[:5]
    ) or "  Nenhum"

    risk_lines = "\n".join(
        f"  - Risco {r['nivel']}: {r['count']} conta(s), R$ {r['valor_em_risco']:,.0f} em risco"
        for r in risks if r["nivel"] in ("Alto", "Médio")
    ) or "  Nenhum risco acima do limiar"

    fc_rec  = fc.get("receita", {})
    fc_desp = fc.get("despesas", {})

    return f"""Você é o CFO de XPTO Campinas. Com base nos dados de Q1 2025 abaixo, escreva um relatório executivo em português brasileiro.

## DADOS DE DESEMPENHO Q1 2025

**Despesas**
- Orçado Q1: R$ {s['total_orcado']:,.0f}
- Realizado Q1: R$ {s['total_realizado']:,.0f}
- Variação: R$ {s['variacao_rs']:+,.0f} ({s['variacao_pct']:+.1f}%)

**Receita**
- Receita bruta orçada: R$ {rec['receita_bruta_orcada']:,.0f}
- Receita bruta realizada: R$ {rec['receita_bruta_realizada']:,.0f}
- Variação receita: R$ {rec['variacao_rs']:+,.0f} ({(rec.get('variacao_pct') or 0):+.1f}%)

**Grupos de custo com maiores variações:**
{group_lines}

**Gastos não orçados detectados:**
{unplanned_lines}

**Perfil de risco das contas:**
{risk_lines}

**Projeção Q2 (cenário base):**
- Receita Q2 prevista: R$ {fc_rec.get('q2_previsto', 0):,.0f} (otimista R$ {fc_rec.get('q2_otimista', 0):,.0f} / pessimista R$ {fc_rec.get('q2_pessimista', 0):,.0f})
- Despesas Q2 previstas: R$ {fc_desp.get('q2_previsto', 0):,.0f} (otimista R$ {fc_desp.get('q2_otimista', 0):,.0f} / pessimista R$ {fc_desp.get('q2_pessimista', 0):,.0f})

## INSTRUÇÃO

Escreva um relatório executivo com exatamente as seguintes seções:

**1. Resultado do Trimestre** (2-3 frases)
Síntese objetiva do desempenho geral. Compare receita e despesas contra orçado. Mencione se o resultado foi positivo ou negativo e por quanto.

**2. Diagnóstico das Principais Variações** (3-4 frases)
Identifique os grupos de custo com maior desvio. Explique o padrão observado. Destaque qualquer gasto não orçado relevante como risco imediato.

**3. Alerta de Risco** (2-3 frases)
Liste os riscos operacionais e financeiros mais críticos identificados neste trimestre. Seja direto sobre o que pode impactar Q2.

**4. Recomendação para Q2** (2-3 frases)
Indique ações concretas com base nos dados. Use números específicos da projeção Q2. Oriente o gestor sobre o que monitorar prioritariamente.

**Regras de estilo:**
- Linguagem executiva, direta, sem jargão técnico de TI
- Sempre use valores em reais com formatação brasileira (R$ 1.234.567)
- Não mencione nomes de ferramentas ou modelos de ML
- Tom: profissional e assertivo, como um CFO experiente que já viu este cenário antes
"""


def generate(dash: dict, ml: dict) -> dict:
    from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "OPENAI_API_KEY não definida. "
            "Defina a variável de ambiente antes de executar."
        )

    client = OpenAI(api_key=api_key)
    prompt = _build_prompt(dash, ml)

    logger.info("Calling OpenAI API for narrative generation...")
    last_exc = None
    for attempt in range(1, 4):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                max_tokens=1024,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Você é um CFO sênior especializado em análise financeira de empresas de saúde no Brasil. "
                            "Seus relatórios são concisos, baseados em dados e orientados a decisão."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            break
        except Exception as exc:
            last_exc = exc
            wait = 2 ** attempt
            safe_msg = str(exc).replace(api_key, "***") if api_key else str(exc)
            logger.warning("OpenAI attempt %d failed: %s — retrying in %ds", attempt, safe_msg, wait)
            __import__("time").sleep(wait)
    else:
        raise RuntimeError(f"OpenAI API failed after 3 attempts: {last_exc}") from last_exc

    text = response.choices[0].message.content
    logger.info("Narrative generated (%d chars)", len(text))

    sections = _parse_sections(text)

    return {
        "generated_at": __import__("pandas").Timestamp.now().isoformat(),
        "empresa":      dash.get("empresa", ""),
        "periodo":      dash.get("periodo", ""),
        "full_text":    text,
        "sections":     sections,
        # model and token metadata intentionally omitted from public output
    }


def _parse_sections(text: str) -> dict:
    """Extract named sections from the narrative text."""
    import re
    sections: dict[str, str] = {}
    pattern = re.compile(
        r"\*\*(\d+\.\s+[^\*]+)\*\*\s*(.*?)(?=\*\*\d+\.|\Z)",
        re.DOTALL,
    )
    for m in pattern.finditer(text):
        key   = m.group(1).strip()
        value = m.group(2).strip()
        sections[key] = value
    return sections


def main() -> None:
    if not DASH_FILE.exists():
        raise FileNotFoundError(f"dashboard_data.json not found: {DASH_FILE}")
    if not ML_FILE.exists():
        raise FileNotFoundError(f"ml_data.json not found: {ML_FILE}")

    with open(DASH_FILE, encoding="utf-8") as f:
        dash = json.load(f)
    with open(ML_FILE, encoding="utf-8") as f:
        ml = json.load(f)

    result = generate(dash, ml)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    logger.info("Saved → %s", OUT_FILE)
    logger.info("Preview:\n%s", result["full_text"][:400])


if __name__ == "__main__":
    main()
