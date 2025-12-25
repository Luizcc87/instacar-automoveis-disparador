# Versionamento - Branches e Tags

## 🎯 Estratégia Implementada

Preservação da versão estável anterior usando tags e desenvolvimento de melhorias em branch separada.

## 📋 Estrutura

```
main (versão estável)
  │
  ├─ v1-layout-antigo (tag) ← Versão antes das refatorações
  │
  └─ layout-refactor (branch) ← Desenvolvimento de refatorações
```

## 🚀 Como Usar

### Opção 1: Script Automatizado (Recomendado)

Execute o script PowerShell:

```powershell
.\docs\deploy\SCRIPT-CRIAR-BRANCH-TAG.ps1
```

O script irá:
1. Verificar mudanças não commitadas
2. Criar tag `v1-layout-antigo` apontando para commit atual
3. Criar branch `layout-refactor` para refatorações
4. Enviar tudo para o repositório remoto

### Opção 2: Comandos Manuais

```powershell
# 1. Criar tag da versão antiga
git tag -a v1-layout-antigo -m "Versão estável antes das refatorações de UI/UX - Dezembro 2025"
git push origin v1-layout-antigo

# 2. Criar branch para refatorações
git checkout -b layout-refactor
git push -u origin layout-refactor
```

## 🔄 Retornar à Versão Antiga

```powershell
# Checkout da tag
git checkout v1-layout-antigo

# Ou criar branch a partir da tag
git checkout -b volta-layout-antigo v1-layout-antigo
```

## 📚 Documentação Completa

- **Guia detalhado**: `docs/deploy/GUIA-VERSIONAMENTO-BRANCHES-TAGS.md`
- **Script automatizado**: `docs/deploy/SCRIPT-CRIAR-BRANCH-TAG.ps1`

