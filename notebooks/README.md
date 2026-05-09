# Análise Exploratória de Dados (EDA)

Notebook Jupyter para análise exploratória e auditável dos dados
financeiros gerados pelo pipeline FP&A.

## Pré-requisitos

O pipeline principal precisa ter sido executado antes de abrir o notebook:

```bat
scripts\run_pipeline.bat
```

Isso garante que `dashboard/public/dashboard_data.json` existe e está atualizado.

## Como abrir

```bat
venv\Scripts\jupyter notebook notebooks\eda_analysis.ipynb
```

O browser abrirá automaticamente. Para rodar todas as células em sequência,
use o menu: **Kernel → Restart & Run All**

## Dependências Python

`numpy` e `pandas` já estão no `requirements.txt`. As bibliotecas abaixo
são exclusivas do notebook e precisam ser instaladas uma vez:

```bat
venv\Scripts\pip install matplotlib seaborn scipy
```

| Pacote | Uso |
| --- | --- |
| `matplotlib` | Geração de todos os gráficos |
| `seaborn` | Estilo e paletas de cor |
| `scipy` | Cálculo de skewness e testes estatísticos |
| `numpy` | Operações vetoriais (já instalado) |
| `pandas` | Manipulação dos dados (já instalado) |

## Seções

### 1. Auditoria de Qualidade dos Dados

Verifica integridade antes de qualquer análise:

- Campos nulos por coluna
- Contas com realizado ou orçado zerado
- Gastos sem orçamento cadastrado
- Contas sem mapeamento na DRE
- Score de qualidade 0–10

### 2. Estatísticas Descritivas por Grupo

Para cada grupo de custo calcula: média, mediana, desvio padrão, Q1, Q3,
IQR, coeficiente de variação e skewness. Visualizado como boxplot com
outliers destacados.

### 3. Detecção de Outliers

Dois métodos independentes aplicados simultaneamente:

| Método | Critério | Parâmetro |
| --- | --- | --- |
| IQR Tukey | `valor > Q3 + 1.5×IQR` ou `valor < Q1 − 1.5×IQR` | Fator 1.5 |
| Z-Score global | `abs(z) > 2.0` | Limite ±2σ |

Contas flagradas por ambos os métodos são classificadas como severidade **ALTO**.

### 4. Concentração de Despesas (Pareto + HHI)

- Curva de Pareto: quantos grupos representam 80% das despesas
- Índice HHI (Herfindahl-Hirschman) sobre grupos de custo (escala 0–1):
  - HHI > 0.25 → Alta concentração
  - HHI 0.15–0.25 → Moderada
  - HHI < 0.15 → Baixa

### 5. Variação Orçado vs Realizado

Comparativo visual por grupo com barras lado a lado e ranking de variação
percentual.

### 6. Estabilidade Mensal

Coeficiente de Variação (CV = desvio / média) calculado sobre os 3 meses
do trimestre:

| CV | Classificação |
| --- | --- |
| ≤ 30% | Estável |
| 30–60% | Instável |
| > 60% | Volátil |

### 7. Top Desvios

Ranking das 10 contas com maior estouro e das 10 com maior economia vs
orçado.

### 8. Sumário Executivo

Consolidado de todos os indicadores em um único bloco de texto auditável.

### 9. Análise de Receita

- KPIs de receita bruta realizada vs orçada e receita líquida estimada
- Top 10 convênios por receita (com % do total)
- Breakdown por grupo de produto
- Concentração de clientes: HHI (escala 0–10.000), Top 1/3/5 convênios

### 10. Margens e EBITDA

- DRE resumida: Receita Bruta → Abatimentos → Receita Líquida → Custo dos
  Serviços → Lucro Bruto → Despesas Operacionais → EBITDA → D&A → Lucro
  Operacional — orçado vs realizado
- Margens % (Bruta, EBITDA, Operacional) com variação em p.p. vs orçado

## Localização dos arquivos

```text
financial_analysis/
├── notebooks/
│   └── eda_analysis.ipynb        ← este notebook
├── dashboard/public/
│   └── dashboard_data.json       ← fonte de dados (gerada pelo pipeline)
└── scripts/run_pipeline.bat      ← executa o pipeline antes do notebook
```
