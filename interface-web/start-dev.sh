#!/bin/bash

echo "========================================"
echo "Iniciando servidor de desenvolvimento"
echo "========================================"
echo ""
echo "Servidor iniciado em: http://localhost:8000"
echo ""
echo "Pressione Ctrl+C para parar o servidor"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
