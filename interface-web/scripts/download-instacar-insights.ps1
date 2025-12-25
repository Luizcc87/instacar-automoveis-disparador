# Script PowerShell para baixar arquivos do instacar-insights

$REPO_OWNER = "Luizcc87"
$REPO_NAME = "instacar-insights"
$BRANCH = "main"
$BASE_URL = "https://raw.githubusercontent.com/$REPO_OWNER/$REPO_NAME/$BRANCH"
$OUTPUT_DIR = ".\instacar-insights-reference"

# Criar diretório de saída
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

Write-Host "🚀 Baixando arquivos do instacar-insights..." -ForegroundColor Cyan

# Lista de arquivos para baixar
$files = @(
    "src/components/dashboard/StatsCard.tsx",
    "src/components/dashboard/RecentActivity.tsx",
    "src/components/dashboard/CampaignProgress.tsx",
    "src/components/ui/button.tsx",
    "src/components/ui/badge.tsx",
    "src/components/ui/progress.tsx",
    "src/components/ui/skeleton.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/dropdown-menu.tsx",
    "src/components/layout/Header.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/layout/AppLayout.tsx",
    "src/pages/Dashboard.tsx",
    "src/pages/Campanhas.tsx",
    "src/pages/Clientes.tsx",
    "src/pages/Templates.tsx",
    "src/index.css",
    "tailwind.config.ts",
    "components.json",
    "src/lib/utils.ts"
)

$success = 0
$failed = 0

foreach ($file in $files) {
    $outputPath = Join-Path $OUTPUT_DIR $file
    $outputDir = Split-Path $outputPath -Parent
    
    # Criar diretório se não existir
    if (-not (Test-Path $outputDir)) {
        New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    }
    
    $url = "$BASE_URL/$file"
    
    Write-Host "📥 Baixando: $file" -ForegroundColor Yellow
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath -ErrorAction Stop
        Write-Host "✅ Salvo: $file" -ForegroundColor Green
        $success++
        Start-Sleep -Milliseconds 200  # Delay para evitar rate limiting
    }
    catch {
        Write-Host "⚠️  Erro ao baixar $file : $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "📊 Resumo:" -ForegroundColor Cyan
Write-Host "✅ Sucesso: $success" -ForegroundColor Green
Write-Host "❌ Erros: $failed" -ForegroundColor Red
Write-Host ""
Write-Host "✨ Download concluído!" -ForegroundColor Green
Write-Host "📁 Arquivos salvos em: $OUTPUT_DIR" -ForegroundColor Cyan

