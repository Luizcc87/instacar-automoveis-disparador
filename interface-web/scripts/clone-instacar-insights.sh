#!/bin/bash
# Script para clonar o repositório instacar-insights completo

REPO_URL="https://github.com/Luizcc87/instacar-insights.git"
OUTPUT_DIR="./instacar-insights-reference"

echo "🚀 Clonando repositório instacar-insights..."

if [ -d "$OUTPUT_DIR" ]; then
    echo "📁 Diretório já existe. Atualizando..."
    cd "$OUTPUT_DIR"
    git pull
    cd ..
else
    echo "📥 Clonando repositório..."
    git clone "$REPO_URL" "$OUTPUT_DIR"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✨ Clone concluído!"
    echo "📁 Repositório em: $OUTPUT_DIR"
    echo ""
    echo "📋 Estrutura de arquivos importantes:"
    find "$OUTPUT_DIR/src" -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.css" \) | head -20
else
    echo "❌ Erro ao clonar repositório"
    exit 1
fi

