# 🚀 Resumo: Deploy da Branch layout-refactor

## ✅ Status Atual

- ✅ Tag `v1-layout-antigo` criada e enviada (versão antiga preservada)
- ✅ Branch `layout-refactor` criada e commitada (versão refatorada)
- ✅ Todas as mudanças commitadas e enviadas para GitHub

## 🎯 Opções de Deploy

### ⭐ Opção 1: Deploy Preview (Recomendado)

**Criar projeto separado no Cloudflare Pages para testes**

1. Acesse: `https://dash.cloudflare.com/[SEU-ACCOUNT-ID]/workers-and-pages/create/pages`
2. Configure:
   - **Project name:** `instacar-campanhas-refactor`
   - **Production branch:** `layout-refactor`
   - **Build command:** `cd interface-web && npm install && npm run inject-env`
   - **Build output directory:** `interface-web`
3. Adicione variáveis de ambiente (mesmas do projeto principal)

**Resultado:**
- Versão antiga: `https://instacar-campanhas.pages.dev` (continua funcionando)
- Versão refatorada: `https://instacar-campanhas-refactor.pages.dev` (para testes)

### Opção 2: Alterar Branch de Produção

**Alterar projeto existente para usar layout-refactor**

1. Acesse projeto `instacar-campanhas` no Cloudflare Pages
2. Settings > Builds & deployments
3. Altere **Production branch** para `layout-refactor`
4. Salve (deploy automático será iniciado)

**⚠️ ATENÇÃO:** Isso substitui a versão em produção!

## 📋 Checklist Antes do Deploy

- [x] Tag v1-layout-antigo criada
- [x] Branch layout-refactor criada e commitada
- [x] Todas as mudanças enviadas para GitHub
- [ ] Variáveis de ambiente configuradas no Cloudflare
- [ ] Testes locais realizados
- [ ] Plano de rollback definido

## 🔄 Rollback Rápido

Se precisar voltar à versão antiga:

```powershell
# No Cloudflare Pages, altere Production branch para:
# - Opção 1: Criar branch rollback a partir da tag
git checkout -b rollback-v1 v1-layout-antigo
git push origin rollback-v1
# Use rollback-v1 como Production branch

# Opção 2: Voltar para main (se main ainda tem versão antiga)
# Use main como Production branch
```

## 📚 Documentação Completa

- **Guia detalhado:** `docs/deploy/DEPLOY-BRANCH-LAYOUT-REFACTOR.md`
- **Script automatizado:** `docs/deploy/SCRIPT-DEPLOY-LAYOUT-REFACTOR.ps1`
- **Guia de versionamento:** `docs/deploy/GUIA-VERSIONAMENTO-BRANCHES-TAGS.md`

## 🎯 Recomendação

**Use Opção 1 (Deploy Preview)** para:
- Testar versão refatorada em ambiente isolado
- Comparar com versão antiga
- Validar todas as funcionalidades
- Fazer rollback fácil se necessário

**Depois de validado**, considere Opção 2 para produção.

