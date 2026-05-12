# FP&A Analytics — Pipeline de Automação Financeira

> Pipeline de dados financeiros que consolida receita e despesas realizadas da **XPTO CAMPINAS**, compara com o orçamento da DRE e expõe os resultados em um **dashboard interativo** com análise preditiva via Machine Learning.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat&logo=fastapi&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?style=flat&logo=scikit-learn&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)

---

## Screenshots

| Resumo Executivo | Margens & EBITDA Pro-forma |
|:---:|:---:|
| ![Resumo](docs/screenshots/dashboard-resumo.png) | ![Margens](docs/screenshots/dashboard-margens.png) |

| Concentração de Clientes |
|:---:|
| ![Concentração](docs/screenshots/dashboard-concentracao.png) |

---

## Sobre o projeto

Este projeto foi desenvolvido como resposta a um desafio técnico de **FP&A (Financial Planning & Analysis)**, que exigia:

- Leitura e tratamento de dados financeiros brutos de uma planilha Excel
- Cruzamento de despesas e receitas realizadas com o orçamento da DRE
- Entrega de um relatório gerencial consolidado com indicadores de variação

A solução foi além dos requisitos mínimos: em vez de um script único, foi construído um **pipeline de dados em camadas** (inspirado na arquitetura dbt), um **servidor de produção autenticado** e um **dashboard React completo com 4 telas e modelos de Machine Learning**.

---

## Funcionalidades

| Módulo | O que entrega |
|--------|---------------|
| **Pipeline multi-camadas** | Staging → Intermediate → Mart em módulos independentes e testáveis |
| **Quality Gate** | 6 verificações automáticas (reconciliação, nulos, gastos não orçados) com score 0–10 |
| **Dashboard interativo** | 4 telas — Resumo, Despesas, Receita e ML Insights — com Recharts |
| **Machine Learning** | Previsão Q2, detecção de anomalias (IsolationForest), segmentação e matriz de risco |
| **Simulador What-if** | Sliders para testar premissas de receita/despesa Q2 em tempo real |
| **Narrativa automática** | Geração de insights textuais via OpenAI GPT-4o |
| **Servidor de produção** | FastAPI com HTTP Basic Auth e headers de segurança (CSP, HSTS, etc.) |
| **File Watcher** | Reprocessa o pipeline automaticamente ao salvar o Excel |

---

## Stack

**Backend (Python)**
- `pandas` + `openpyxl` — ingestão e transformação de dados
- `scikit-learn` — IsolationForest, regressão linear, classificação por variação
- `FastAPI` + `uvicorn` — servidor de produção com autenticação
- `watchdog` — monitoramento de arquivo para reprocessamento automático
- `pytest` — suíte de testes unitários e smoke tests

**Frontend (Node)**
- `React 18` + `Vite` — SPA de alta performance
- `Recharts` — gráficos de barras, linhas e compostos
- `Tailwind CSS` — estilização utilitária

---

## Arquitetura do pipeline

```
Excel (raw)
    │
    ▼
[STAGING]          stg_dre · stg_despesas · stg_receita
  Renomeia colunas, casteia tipos, descarta registros inválidos
  Patch para fórmulas SUM não avaliadas pelo openpyxl
    │
    ▼
[INTERMEDIATE]     int_despesas_xpto · int_dre_long · int_receita
  Filtra XPTO CAMPINAS, agrega por cod_conta, totaliza Q1
  Receita em 3 grãos: by_conta, by_convenio, by_grupo
    │
    ▼
[MARTS]            fct_budget_vs_realizado · fct_receita_vs_orcado
  Join DRE ↔ Realizado, calcula variação R$ e %
    │
    ▼
[QUALITY]          tests.py · validation_gate.py
  6 checks: reconciliação total, contas sem mapeamento, gastos não orçados,
            nulos, reconciliação receita, receita sem orçamento
  Validation gate: BLOCKER retorna exit code 1 — WARNING registra aviso
    │
    ▼
[SERIALIZAÇÃO]     generate_dashboard_data.py · generate_ml_data.py · generate_narrative.py
  dashboard_data.json · ml_data.json · narrative.json
    │
    ▼
[DASHBOARD]        React + Vite
  Resumo · Despesas · Receita · ML Insights
```

---

## Estrutura do projeto

```
financial_analysis/
├── data/
│   └── teste_budget.xlsx               # Fonte de dados (DRE · Despesas · Receita)
├── docs/
│   └── ux-validation-report.html       # Relatório de validação UX
├── notebooks/
│   └── eda_analysis.ipynb              # EDA auditável: outliers, Pareto, HHI, estabilidade mensal
├── scripts/
│   ├── run_pipeline.bat                # Orquestrador completo (Windows)
│   ├── run_pipeline.sh                 # Orquestrador completo (Linux/macOS)
│   ├── start_server.bat                # Inicia servidor de produção (Windows)
│   ├── server.py                       # Servidor FastAPI com autenticação HTTP Basic
│   └── watch_pipeline.py               # Watcher — reprocessa ao salvar o Excel
├── src/
│   ├── pipeline/
│   │   ├── staging/
│   │   │   ├── stg_dre.py              # Normaliza aba DRE (patch de fórmulas Excel)
│   │   │   ├── stg_despesas.py         # Normaliza Base de Despesa
│   │   │   └── stg_receita.py          # Normaliza Base da Receita
│   │   ├── intermediate/
│   │   │   ├── int_despesas_xpto.py    # Filtra XPTO CAMPINAS, agrega por conta
│   │   │   ├── int_dre_long.py         # Agrega DRE acumulado Q1
│   │   │   └── int_receita.py          # Agrega receita por conta, convênio e grupo
│   │   └── marts/
│   │       ├── fct_budget_vs_realizado.py   # Despesas: DRE ↔ realizado + variações
│   │       └── fct_receita_vs_orcado.py     # Receita: DRE 31xx ↔ realizado + variações
│   ├── quality/
│   │   ├── tests.py                    # 6 quality checks
│   │   └── validation_gate.py          # Gate com regras BLOCKER / WARNING
│   ├── generate_dashboard_data.py      # Serializa dados para dashboard_data.json
│   ├── generate_ml_data.py             # Modelos ML → ml_data.json
│   ├── generate_narrative.py           # Narrativa via OpenAI GPT-4o → narrative.json
│   └── main.py                         # Orquestrador do pipeline
├── dashboard/                          # React + Vite
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── hooks/
│       └── utils/
├── tests/
│   ├── test_pipeline.py                # Testes unitários do pipeline
│   └── test_smoke.py                   # Smoke tests
├── output/                             # Artefatos gerados (ignorado no git)
├── validation_gate.yml                 # Regras do gate de qualidade
└── requirements.txt
```

---

## Início rápido

### Pré-requisitos

- Python 3.10+
- Node.js 18+

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/wsldatascience/budget-dashboard-finance.git
cd budget-dashboard-finance

# 2. Crie e ative o ambiente virtual
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Instale as dependências Python
pip install -r requirements.txt

# 4. Instale as dependências do dashboard
cd dashboard && npm install && cd ..
```

### Execução

```bash
# Windows — pipeline completo (dados + ML + build do dashboard)
scripts\run_pipeline.bat

# Linux / macOS
./scripts/run_pipeline.sh
```

O script executa em sequência:
1. Pipeline de dados (staging → mart → quality)
2. Serialização para o dashboard (`dashboard_data.json`, `ml_data.json`)
3. Narrativa automática via OpenAI (requer `OPENAI_API_KEY`)
4. Validation gate
5. Build do dashboard (`dashboard/dist/`)

### Dashboard em modo de desenvolvimento

```bash
cd dashboard && npm run dev
# Acesse http://localhost:5173
```

---

## Configuração

### Variáveis de ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto:

```dotenv
# Narrativa automática (opcional)
OPENAI_API_KEY=sk-proj-...

# Servidor de produção
DASH_USER=admin
DASH_PASSWORD=sua_senha_segura
DASH_PORT=8000
```

### Servidor de produção

```bash
# Windows
set DASH_PASSWORD=sua_senha
python scripts/server.py

# Linux/macOS
export DASH_PASSWORD=sua_senha
python scripts/server.py

# Acesse http://localhost:8000
```

O servidor FastAPI serve o build estático do React com autenticação HTTP Basic e headers de segurança (Content-Security-Policy, X-Frame-Options, etc.).

### File watcher (reprocessamento automático)

```bash
python scripts/watch_pipeline.py
```

Monitora `data/teste_budget.xlsx` e dispara o pipeline automaticamente com debounce de 8 segundos após salvar o arquivo.

---

## Testes

```bash
python -m pytest tests/ -v
```

A suíte cobre:

- Filtro e agregação de despesas e receita por empresa
- Cálculo de variações absolutas e percentuais no mart
- Quality checks (reconciliação, contas sem mapeamento, gastos não orçados)
- Integridade de tipos (`cod_conta` como string, ausência de nulos)
- Smoke tests do pipeline completo

---

## Machine Learning

Todos os modelos estão em `src/generate_ml_data.py`.

### Previsão Q2 — Média Ponderada Exponencial + Cenários

Com apenas 3 pontos mensais, regressão linear gera R² frágil. A solução usa média ponderada exponencial do Q1 (Jan=20%, Fev=35%, Mar=45%) somada à tendência linear (slope Jan→Mar) para projetar Abr/Mai/Jun.

| Cenário | Receita | Despesas |
|---------|--------:|---------:|
| Pessimista | −8% | +8% |
| Base | — | — |
| Otimista | +8% | −8% |

### Detecção de Anomalias — IsolationForest + regra determinística

Contas com `orc=0` e `realizado>0` são sinalizadas diretamente como "Sem Orçamento". As demais passam pelo IsolationForest com features ortogonais (`log1p(realizado)`, `exec_ratio`, `|var_pct|`), `contamination=0.12`, `n_estimators=200`.

### Segmentação — Classificação por faixa de variação

Classificação determinística por faixas de `var_pct`, substituindo KMeans decorativo por bandas com semântica direta:

| Faixa | Segmento |
|-------|----------|
| var < −10% | Economia Expressiva |
| −10% ≤ var < 0% | Dentro do Orçado |
| 0% ≤ var < 15% | Leve Estouro |
| var ≥ 15% | Estouro Relevante |

### Simulador What-if

Sliders no dashboard ajustam o crescimento de receita e despesas Q2 vs Q1. Cálculo client-side — o forecast automático serve como ponto de partida para o CFO testar premissas próprias.

---

## Dashboard

React 18 + Vite + Recharts em 4 telas:

| Tela | Conteúdo |
|------|----------|
| **Resumo** | Hero de margem operacional, gráfico mensal comparativo, insights automáticos |
| **Despesas** | KPIs detalhados, centros de custo, top variações, tabela conta a conta |
| **Receita** | KPIs de receita, breakdown por convênio e grupo, contas DRE |
| **ML Insights** | Previsão Q2 com cenários, gráfico de forecast, anomalias, segmentação, matriz de risco |

---

## Quality checks

| Check | Descrição |
|-------|-----------|
| `total_reconciliation` | Total do mart = total da base XPTO |
| `missing_contas` | Contas realizadas sem correspondência na DRE |
| `unplanned_spending` | Contas com orçado=0 e realizado>0 |
| `null_check` | Ausência de nulos nas colunas-chave |
| `total_reconciliation_receita` | Total receita mart = total base receita |
| `receita_sem_orcamento` | Contas de receita sem orçamento na DRE |

O gate de qualidade lê as regras de `validation_gate.yml` e retorna exit code `1` em caso de BLOCKER, permitindo integração com pipelines CI/CD.

---

## Análise Exploratória (Notebook)

O notebook `notebooks/eda_analysis.ipynb` oferece uma camada de auditoria independente sobre os dados gerados pelo pipeline:

- Auditoria de qualidade (nulos, contas zeradas, gastos sem orçamento)
- Estatísticas descritivas por grupo (média, mediana, desvio, IQR, CV, skewness)
- Detecção de outliers: IQR Tukey + Z-Score global
- Concentração de despesas: curva de Pareto + índice HHI
- Variação Orçado vs Realizado por grupo
- Estabilidade mensal (Coeficiente de Variação Jan–Mar)
- Top 10 estouros e Top 10 economias vs orçado

```bash
# Instale dependências exclusivas do notebook (uma vez)
venv\Scripts\pip install matplotlib seaborn scipy

# Abra o notebook
venv\Scripts\jupyter notebook notebooks\eda_analysis.ipynb
```

---

## Dependências principais

| Pacote | Versão mínima | Uso |
|--------|:-------------:|-----|
| pandas | 2.0 | Pipeline de dados |
| openpyxl | 3.1 | Leitura do Excel |
| scikit-learn | 1.0 | ML (IsolationForest, regressão) |
| numpy | 1.24 | Operações numéricas |
| fastapi | 0.110 | Servidor de produção |
| uvicorn | 0.29 | ASGI server |
| watchdog | 4.0 | File watcher |
| anthropic | 0.25 | Narrativa automática (opcional) |
| pytest | 8.0 | Testes |
