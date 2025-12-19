@echo off
echo ========================================
echo Iniciando servidor de desenvolvimento
echo ========================================
echo.

cd /d %~dp0

REM Verificar se Node.js está instalado
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado. Instale Node.js para continuar.
    echo.
    pause
    exit /b 1
)

REM Verificar se npm está instalado
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] npm nao encontrado. Instale Node.js para continuar.
    echo.
    pause
    exit /b 1
)

echo [1/2] Injetando variaveis de ambiente no HTML...
echo.

REM Executar script de injeção de variáveis de ambiente
call npm run inject-env
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Falha ao injetar variaveis de ambiente.
    echo Verifique se o arquivo .env existe na raiz do projeto.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/2] Iniciando servidor HTTP...
echo.
echo Servidor iniciado em: http://localhost:8000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

REM Iniciar servidor HTTP usando http-server (via npm)
call npx http-server . -p 8000
