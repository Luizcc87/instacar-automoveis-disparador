#!/bin/bash

echo "========================================"
echo "Iniciando servidor de desenvolvimento"
echo "========================================"
echo ""

cd "$(dirname "$0")"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERRO] Node.js não encontrado. Instale Node.js para continuar."
    echo ""
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "[ERRO] npm não encontrado. Instale Node.js para continuar."
    echo ""
    exit 1
fi

echo "[1/2] Injetando variáveis de ambiente no HTML..."
echo ""

# Executar script de injeção de variáveis de ambiente
npm run inject-env
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERRO] Falha ao injetar variáveis de ambiente."
    echo "Verifique se o arquivo .env existe na raiz do projeto."
    echo ""
    exit 1
fi

echo ""
echo "[2/2] Iniciando servidor HTTP..."
echo ""
echo "Servidor iniciado em: http://localhost:8000"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

# Iniciar servidor HTTP usando http-server (via npm)
npx http-server . -p 8000
