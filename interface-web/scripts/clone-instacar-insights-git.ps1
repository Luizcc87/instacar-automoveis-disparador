# Script PowerShell para clonar repositório instacar-insights usando Git
# Funciona mesmo se o repositório for privado (requer autenticação Git configurada)

$REPO_URL = "https://github.com/Luizcc87/instacar-insights.git"
$OUTPUT_DIR = ".\instacar-insights-reference"

Write-Host "🚀 Clonando repositório instacar-insights..." -ForegroundColor Cyan
Write-Host ""

# Verificar se git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não está instalado. Por favor, instale o Git primeiro." -ForegroundColor Red
    Write-Host "   Download: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Verificar se o diretório já existe
if (Test-Path $OUTPUT_DIR) {
    Write-Host "📁 Diretório já existe: $OUTPUT_DIR" -ForegroundColor Yellow
    $response = Read-Host "Deseja atualizar (u) ou remover e clonar novamente (r)? [u/r]"
    
    if ($response -eq "r") {
        Write-Host "🗑️  Removendo diretório existente..." -ForegroundColor Yellow
        Remove-Item -Path $OUTPUT_DIR -Recurse -Force
    } else {
        Write-Host "🔄 Atualizando repositório existente..." -ForegroundColor Yellow
        Set-Location $OUTPUT_DIR
        git pull
        Set-Location ..
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✨ Atualização concluída!" -ForegroundColor Green
            Write-Host "📁 Repositório em: $OUTPUT_DIR" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Erro ao atualizar. Tente remover o diretório e clonar novamente." -ForegroundColor Red
        }
        exit 0
    }
}

# Clonar repositório
Write-Host "📥 Clonando repositório..." -ForegroundColor Yellow
Write-Host "   URL: $REPO_URL" -ForegroundColor Gray
Write-Host "   Destino: $OUTPUT_DIR" -ForegroundColor Gray
Write-Host ""

git clone $REPO_URL $OUTPUT_DIR

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✨ Clone concluído com sucesso!" -ForegroundColor Green
    Write-Host "📁 Repositório em: $OUTPUT_DIR" -ForegroundColor Cyan
    Write-Host ""
    
    # Listar arquivos importantes
    Write-Host "📋 Arquivos importantes encontrados:" -ForegroundColor Cyan
    Write-Host ""
    
    $importantFiles = @(
        "src\components\dashboard\*.tsx",
        "src\components\ui\*.tsx",
        "src\components\layout\*.tsx",
        "src\pages\*.tsx",
        "src\index.css",
        "tailwind.config.ts",
        "components.json"
    )
    
    foreach ($pattern in $importantFiles) {
        $files = Get-ChildItem -Path $OUTPUT_DIR -Recurse -Include $pattern.Split('\')[-1] -ErrorAction SilentlyContinue
        if ($files) {
            Write-Host "  📄 $($pattern.Split('\')[-1]):" -ForegroundColor Yellow
            $files | ForEach-Object {
                $relativePath = $_.FullName.Replace((Resolve-Path $OUTPUT_DIR).Path + "\", "")
                Write-Host "     $relativePath" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "💡 Dica: Analise os arquivos em $OUTPUT_DIR para replicar o design" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao clonar repositório" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  1. Repositório privado - Configure autenticação Git:" -ForegroundColor White
    Write-Host "     git config --global credential.helper wincred" -ForegroundColor Gray
    Write-Host "  2. Repositório não existe ou foi renomeado" -ForegroundColor White
    Write-Host "  3. Sem permissão de acesso" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternativa: Execute manualmente:" -ForegroundColor Yellow
    Write-Host "  git clone https://github.com/Luizcc87/instacar-insights.git instacar-insights-reference" -ForegroundColor Gray
    exit 1
}

