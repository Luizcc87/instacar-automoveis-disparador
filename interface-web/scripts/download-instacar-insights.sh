#!/bin/bash
# Script alternativo usando curl para baixar arquivos do instacar-insights

REPO_OWNER="Luizcc87"
REPO_NAME="instacar-insights"
BRANCH="main"
BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}"
OUTPUT_DIR="./instacar-insights-reference"

# Criar diretório de saída
mkdir -p "$OUTPUT_DIR"

echo "🚀 Baixando arquivos do instacar-insights..."

# Função para baixar arquivo
download_file() {
    local file_path=$1
    local output_path="${OUTPUT_DIR}/${file_path}"
    local output_dir=$(dirname "$output_path")
    
    mkdir -p "$output_dir"
    
    echo "📥 Baixando: $file_path"
    
    if curl -s -f -o "$output_path" "${BASE_URL}/${file_path}"; then
        echo "✅ Salvo: $file_path"
        return 0
    else
        echo "⚠️  Não encontrado: $file_path"
        return 1
    fi
}

# Baixar arquivos
download_file "src/components/dashboard/StatsCard.tsx"
download_file "src/components/dashboard/RecentActivity.tsx"
download_file "src/components/dashboard/CampaignProgress.tsx"
download_file "src/components/ui/button.tsx"
download_file "src/components/ui/badge.tsx"
download_file "src/components/ui/progress.tsx"
download_file "src/components/ui/skeleton.tsx"
download_file "src/components/ui/input.tsx"
download_file "src/components/ui/dropdown-menu.tsx"
download_file "src/components/layout/Header.tsx"
download_file "src/components/layout/Sidebar.tsx"
download_file "src/components/layout/AppLayout.tsx"
download_file "src/pages/Dashboard.tsx"
download_file "src/pages/Campanhas.tsx"
download_file "src/pages/Clientes.tsx"
download_file "src/pages/Templates.tsx"
download_file "src/index.css"
download_file "tailwind.config.ts"
download_file "components.json"
download_file "src/lib/utils.ts"

echo ""
echo "✨ Download concluído!"
echo "📁 Arquivos salvos em: $OUTPUT_DIR"

