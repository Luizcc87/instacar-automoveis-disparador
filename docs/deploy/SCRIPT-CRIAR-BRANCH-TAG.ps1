# Script PowerShell para criar branch e tag de versionamento
# Preserva versão antiga e cria branch para refatorações

Write-Host "🔖 Criando estrutura de versionamento..." -ForegroundColor Cyan

# Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Há mudanças não commitadas. Deseja continuar mesmo assim?" -ForegroundColor Yellow
    Write-Host "   Opções:" -ForegroundColor Yellow
    Write-Host "   1. Fazer commit das mudanças antes de criar branch/tag" -ForegroundColor Yellow
    Write-Host "   2. Criar branch/tag com mudanças não commitadas (serão incluídas na branch)" -ForegroundColor Yellow
    Write-Host "   3. Cancelar" -ForegroundColor Yellow
    $opcao = Read-Host "Escolha uma opção (1/2/3)"
    
    if ($opcao -eq "1") {
        Write-Host "📝 Fazendo commit das mudanças..." -ForegroundColor Cyan
        git add .
        $mensagem = Read-Host "Digite a mensagem do commit"
        if ([string]::IsNullOrWhiteSpace($mensagem)) {
            $mensagem = "refactor: melhorias de UI/UX e validações de duplicatas"
        }
        git commit -m $mensagem
    } elseif ($opcao -eq "3") {
        Write-Host "❌ Operação cancelada." -ForegroundColor Red
        exit
    }
}

# Obter hash do commit atual (ou último commit se houver mudanças não commitadas)
$commitAtual = git rev-parse HEAD
Write-Host "📍 Commit atual: $commitAtual" -ForegroundColor Gray

# Criar tag da versão antiga (apontando para o commit atual/último estável)
Write-Host "`n🏷️  Criando tag v1-layout-antigo..." -ForegroundColor Cyan
$tagExiste = git tag -l "v1-layout-antigo"
if ($tagExiste) {
    Write-Host "⚠️  Tag v1-layout-antigo já existe. Deseja sobrescrever? (s/N)" -ForegroundColor Yellow
    $sobrescrever = Read-Host
    if ($sobrescrever -eq "s" -or $sobrescrever -eq "S") {
        git tag -d v1-layout-antigo
        git push origin :refs/tags/v1-layout-antigo 2>$null
    } else {
        Write-Host "❌ Operação cancelada. Tag já existe." -ForegroundColor Red
        exit
    }
}

git tag -a v1-layout-antigo -m "Versão estável antes das refatorações de UI/UX - Dezembro 2025"
Write-Host "✅ Tag v1-layout-antigo criada com sucesso!" -ForegroundColor Green

# Criar branch para refatorações
Write-Host "`n🌿 Criando branch layout-refactor..." -ForegroundColor Cyan
$branchExiste = git branch -l "layout-refactor"
if ($branchExiste) {
    Write-Host "⚠️  Branch layout-refactor já existe localmente." -ForegroundColor Yellow
    Write-Host "   Deseja fazer checkout para ela? (s/N)" -ForegroundColor Yellow
    $checkout = Read-Host
    if ($checkout -eq "s" -or $checkout -eq "S") {
        git checkout layout-refactor
        Write-Host "✅ Checkout para branch layout-refactor realizado!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Mantendo branch atual." -ForegroundColor Gray
    }
} else {
    git checkout -b layout-refactor
    Write-Host "✅ Branch layout-refactor criada e checkout realizado!" -ForegroundColor Green
}

# Verificar branch remota
$branchRemota = git branch -r | Select-String "origin/layout-refactor"
if (-not $branchRemota) {
    Write-Host "`n📤 Enviando branch para repositório remoto..." -ForegroundColor Cyan
    git push -u origin layout-refactor
    Write-Host "✅ Branch enviada para origin!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Branch já existe no repositório remoto." -ForegroundColor Gray
}

# Enviar tag para remoto
Write-Host "`n📤 Enviando tag para repositório remoto..." -ForegroundColor Cyan
git push origin v1-layout-antigo
Write-Host "✅ Tag enviada para origin!" -ForegroundColor Green

# Resumo
Write-Host "`n📊 Resumo:" -ForegroundColor Cyan
Write-Host "   Tag criada: v1-layout-antigo → $commitAtual" -ForegroundColor White
Write-Host "   Branch atual: $(git branch --show-current)" -ForegroundColor White
Write-Host "`n✅ Estrutura de versionamento criada com sucesso!" -ForegroundColor Green
Write-Host "`n💡 Próximos passos:" -ForegroundColor Yellow
Write-Host "   - Continuar desenvolvimento na branch layout-refactor" -ForegroundColor White
Write-Host "   - Quando estável, criar tag v2-refatoracao-ui" -ForegroundColor White
Write-Host "   - Fazer merge em main quando aprovado" -ForegroundColor White

