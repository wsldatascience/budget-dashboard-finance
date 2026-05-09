@echo off
REM Full pipeline runner for Windows
REM Usage: scripts\run_pipeline.bat
REM        set EMPRESA_FILTER=OUTRA EMPRESA && scripts\run_pipeline.bat

cd /d "%~dp0.."

echo === [1/6] Running main pipeline ===
python -m src.main
if %ERRORLEVEL% neq 0 ( echo ERRO no pipeline principal & exit /b 1 )

echo.
echo === [2/6] Generating dashboard JSON ===
python src/generate_dashboard_data.py
if %ERRORLEVEL% neq 0 ( echo ERRO ao gerar dashboard_data.json & exit /b 1 )

echo.
echo === [3/6] Generating ML data ===
python src/generate_ml_data.py
if %ERRORLEVEL% neq 0 ( echo ERRO ao gerar ml_data.json & exit /b 1 )

echo.
echo === [4/6] Generating AI narrative ===
python src/generate_narrative.py
if %ERRORLEVEL% neq 0 ( echo [SKIP] narrative generation falhou - verifique ANTHROPIC_API_KEY )

echo.
echo === [5/6] Running validation gate ===
python src/quality/validation_gate.py
if %ERRORLEVEL% neq 0 ( echo AVISO: validation gate reportou falhas - veja output/validation_gate_result.json )

echo.
echo === [6/6] Building dashboard (sincronizando dist/) ===
cd dashboard && npm run build
if %ERRORLEVEL% neq 0 ( echo ERRO no build do dashboard & exit /b 1 )
cd ..

echo.
echo === Pipeline completo. Inicie o dashboard com: python scripts/server.py ===
