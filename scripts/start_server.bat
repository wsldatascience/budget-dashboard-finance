@echo off
cd /d "%~dp0.."

REM Carrega variáveis do .env (ignora linhas vazias e comentários)
for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%B"=="" set "%%A=%%B"
)

REM Usa Python do venv local
set PYTHON=%~dp0..\venv\Scripts\python.exe

REM Inicia o servidor em janela minimizada
start /min "FPnA Dashboard" "%PYTHON%" "%~dp0server.py"
