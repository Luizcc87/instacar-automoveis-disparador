@echo off
echo ========================================
echo Iniciando servidor de desenvolvimento
echo ========================================
echo.
echo Servidor iniciado em: http://localhost:8000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

cd /d %~dp0
python -m http.server 8000
