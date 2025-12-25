# Script PowerShell para clonar o repositório instacar-insights completo

$REPO_URL = "https://github.com/Luizcc87/instacar-insights.git"
$OUTPUT_DIR = ".\instacar-insights-reference"

Write-Host "🚀 Clonando repositório instacar-insights..." -ForegroundColor Cyan

if (Test-Path $OUTPUT_DIR) {
    Write-Host "📁 Diretório já existe. Atualizando..." -ForegroundColor Yellow
    Set-Location $OUTPUT_DIR
    git pull
    Set-Location ..
} else {
    Write-Host "📥 Clonando repositório..." -ForegroundColor Yellow
    git clone $REPO_URL $OUTPUT_DIR
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✨ Clone concluído!" -ForegroundColor Green
    Write-Host "📁 Repositório em: $OUTPUT_DIR" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Estrutura de arquivos importantes:" -ForegroundColor Cyan
    
    # Listar arquivos relevantes
    Get-ChildItem -Path "$OUTPUT_DIR\src" -Recurse -Include *.tsx,*.ts,*.css | 
        Select-Object -First 20 | 
        ForEach-Object { Write-Host $_.FullName.Replace((Get-Location).Path + "\", "") }
} else {
    Write-Host "❌ Erro ao clonar repositório" -ForegroundColor Red
    exit 1
}

