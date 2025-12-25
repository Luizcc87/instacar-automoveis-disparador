# Script PowerShell para configurar deploy da branch layout-refactor
# Mantém versão antiga preservada via tag v1-layout-antigo

Write-Host "🚀 Configurando Deploy da Branch layout-refactor" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos na branch correta
$branchAtual = git branch --show-current
if ($branchAtual -ne "layout-refactor") {
    Write-Host "⚠️  Você não está na branch layout-refactor." -ForegroundColor Yellow
    Write-Host "   Branch atual: $branchAtual" -ForegroundColor Yellow
    Write-Host "   Deseja fazer checkout para layout-refactor? (s/N)" -ForegroundColor Yellow
    $checkout = Read-Host
    if ($checkout -eq "s" -or $checkout -eq "S") {
        git checkout layout-refactor
        Write-Host "✅ Checkout para layout-refactor realizado!" -ForegroundColor Green
    } else {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

# Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Há mudanças não commitadas." -ForegroundColor Yellow
    Write-Host "   Deseja fazer commit antes de continuar? (s/N)" -ForegroundColor Yellow
    $commit = Read-Host
    if ($commit -eq "s" -or $commit -eq "S") {
        git add .
        $mensagem = Read-Host "Digite a mensagem do commit"
        if ([string]::IsNullOrWhiteSpace($mensagem)) {
            $mensagem = "chore: atualizações antes do deploy"
        }
        git commit -m $mensagem
        git push origin layout-refactor
    }
}

# Verificar se branch está atualizada no remoto
Write-Host "`n📤 Verificando sincronização com remoto..." -ForegroundColor Cyan
$statusRemoto = git status -sb
if ($statusRemoto -match "ahead") {
    Write-Host "⚠️  Há commits locais não enviados." -ForegroundColor Yellow
    Write-Host "   Deseja enviar para o remoto? (s/N)" -ForegroundColor Yellow
    $push = Read-Host
    if ($push -eq "s" -or $push -eq "S") {
        git push origin layout-refactor
        Write-Host "✅ Commits enviados!" -ForegroundColor Green
    }
}

# Verificar tag v1-layout-antigo
$tagExiste = git tag -l "v1-layout-antigo"
if (-not $tagExiste) {
    Write-Host "`n⚠️  Tag v1-layout-antigo não encontrada." -ForegroundColor Yellow
    Write-Host "   Deseja criar a tag agora? (s/N)" -ForegroundColor Yellow
    $criarTag = Read-Host
    if ($criarTag -eq "s" -or $criarTag -eq "S") {
        $commitTag = Read-Host "Digite o hash do commit da versão antiga (ou Enter para usar último commit de main)"
        if ([string]::IsNullOrWhiteSpace($commitTag)) {
            git checkout main
            $commitTag = git rev-parse HEAD
            git checkout layout-refactor
        }
        git tag -a v1-layout-antigo $commitTag -m "Versão estável antes das refatorações - Dezembro 2025"
        git push origin v1-layout-antigo
        Write-Host "✅ Tag criada e enviada!" -ForegroundColor Green
    }
}

# Resumo e instruções
Write-Host "`n📊 Resumo:" -ForegroundColor Cyan
Write-Host "   Branch atual: $(git branch --show-current)" -ForegroundColor White
Write-Host "   Último commit: $(git log -1 --oneline)" -ForegroundColor White
Write-Host "   Tag v1-layout-antigo: $(git tag -l v1-layout-antigo)" -ForegroundColor White

Write-Host "`n📋 Próximos Passos no Cloudflare Pages:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPÇÃO 1 - Deploy Preview (Recomendado):" -ForegroundColor Cyan
Write-Host "   1. Acesse: https://dash.cloudflare.com/[ACCOUNT-ID]/workers-and-pages/create/pages" -ForegroundColor White
Write-Host "   2. Crie novo projeto: instacar-campanhas-refactor" -ForegroundColor White
Write-Host "   3. Configure Production branch: layout-refactor" -ForegroundColor White
Write-Host "   4. Build command: cd interface-web; npm install; npm run inject-env" -ForegroundColor White
Write-Host "   5. Build output: interface-web" -ForegroundColor White
Write-Host ""
Write-Host "OPÇÃO 2 - Alterar Branch de Produção:" -ForegroundColor Cyan
Write-Host "   1. Acesse projeto existente no Cloudflare Pages" -ForegroundColor White
Write-Host "   2. Settings > Builds and deployments" -ForegroundColor White
Write-Host "   3. Altere Production branch para: layout-refactor" -ForegroundColor White
Write-Host "   4. Salve e aguarde deploy automático" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentação completa: docs/deploy/DEPLOY-BRANCH-LAYOUT-REFACTOR.md" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Preparação concluída!" -ForegroundColor Green

