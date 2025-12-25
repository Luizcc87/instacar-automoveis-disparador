# Deploy da Branch layout-refactor

Guia para fazer deploy da versão refatorada (`layout-refactor`) mantendo a versão antiga (`v1-layout-antigo`) preservada.

## 🎯 Objetivo

Fazer deploy da branch `layout-refactor` (versão com refatorações) enquanto mantém a versão antiga (`v1-layout-antigo`) disponível e preservada.

## 📋 Estrutura de Branches

```
main (versão estável antiga - produção atual)
  │
  ├─ v1-layout-antigo (tag) ← Versão preservada
  │
  └─ layout-refactor (branch) ← Versão refatorada (deploy desta)
```

## 🚀 Opções de Deploy

### Opção 1: Deploy Preview (Recomendado para Testes)

Criar um projeto separado no Cloudflare Pages para a branch `layout-refactor`:

1. **Acesse Cloudflare Dashboard**
   - Vá para: `https://dash.cloudflare.com/[SEU-ACCOUNT-ID]/workers-and-pages/create/pages`

2. **Criar Novo Projeto**
   - **Project name:** `instacar-campanhas-refactor` (ou `instacar-campanhas-staging`)
   - **Production branch:** `layout-refactor`
   - **Framework preset:** `None` (ou `Other`)
   - **Build command:** `cd interface-web && npm install && npm run inject-env`
   - **Build output directory:** `interface-web`
   - **Root directory:** `/` (raiz do repositório)

3. **Configurar Variáveis de Ambiente**
   - Vá em **Settings** > **Environment Variables**
   - Adicione as mesmas variáveis do projeto principal:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`

4. **URL de Deploy**
   - URL será: `https://instacar-campanhas-refactor.pages.dev`
   - Versão antiga continua em: `https://instacar-campanhas.pages.dev`

**Vantagens:**
- ✅ Versão antiga continua em produção
- ✅ Versão refatorada disponível para testes
- ✅ Fácil comparação lado a lado
- ✅ Pode fazer rollback instantâneo se necessário

### Opção 2: Alterar Branch de Produção

Alterar o projeto existente para usar `layout-refactor`:

1. **Acesse o Projeto no Cloudflare Pages**
   - Vá para o projeto `instacar-campanhas`

2. **Alterar Branch de Produção**
   - Vá em **Settings** > **Builds & deployments**
   - Altere **Production branch** de `main` para `layout-refactor`
   - Salve as alterações

3. **Deploy Automático**
   - Cloudflare fará deploy automático da branch `layout-refactor`
   - Versão antiga continua disponível via tag `v1-layout-antigo`

**⚠️ ATENÇÃO:**
- Isso substitui a versão em produção
- Versão antiga só estará disponível via checkout da tag
- Recomendado apenas após testes completos

### Opção 3: Deploy Manual via Wrangler (Avançado)

Se você usa Wrangler CLI:

```powershell
# Instalar Wrangler (se ainda não tiver)
npm install -g wrangler

# Fazer login
wrangler login

# Fazer checkout da branch
git checkout layout-refactor

# Fazer deploy
cd interface-web
npm install
npm run inject-env
wrangler pages deploy . --project-name=instacar-campanhas-refactor
```

## 🔄 Fluxo Recomendado

### Fase 1: Testes (Opção 1 - Deploy Preview)

1. Criar projeto separado para `layout-refactor`
2. Testar em ambiente isolado
3. Validar todas as funcionalidades
4. Comparar com versão antiga

### Fase 2: Produção (Opção 2 - Alterar Branch)

1. Após validação completa, alterar branch de produção
2. Monitorar logs e erros
3. Manter tag `v1-layout-antigo` para rollback rápido

### Fase 3: Rollback (Se Necessário)

```powershell
# Voltar para versão antiga
git checkout v1-layout-antigo

# Criar branch temporária
git checkout -b rollback-v1 v1-layout-antigo

# Alterar branch de produção no Cloudflare para rollback-v1
# Ou fazer merge em main e alterar para main
```

## 📊 Comparação de Versões

### Versão Antiga (v1-layout-antigo)
- ✅ Estável e testada em produção
- ✅ Sem refatorações de UI/UX
- ✅ Sem validações preventivas de duplicatas
- ✅ Sem contadores informativos

### Versão Refatorada (layout-refactor)
- ✅ Melhorias de UI/UX
- ✅ Validações preventivas ao salvar
- ✅ Contadores informativos dinâmicos
- ✅ Melhor feedback visual
- ⚠️ Em testes (não em produção ainda)

## 🔐 Segurança

Ambas as versões devem usar:
- ✅ Apenas **Anon Key** do Supabase
- ✅ Mesmas variáveis de ambiente
- ✅ Mesmas políticas RLS
- ✅ Mesmas configurações de CORS

## 📝 Checklist de Deploy

Antes de fazer deploy da branch refatorada:

- [ ] Testes locais completos realizados
- [ ] Todas as funcionalidades validadas
- [ ] Variáveis de ambiente configuradas
- [ ] Documentação atualizada
- [ ] Tag `v1-layout-antigo` criada e enviada
- [ ] Branch `layout-refactor` commitada e enviada
- [ ] Plano de rollback definido
- [ ] Equipe notificada sobre mudanças

## 🚨 Rollback Rápido

Se precisar voltar à versão antiga rapidamente:

```powershell
# Opção 1: Checkout da tag
git checkout v1-layout-antigo
# Alterar branch de produção no Cloudflare para v1-layout-antigo

# Opção 2: Criar branch de rollback
git checkout -b rollback-v1 v1-layout-antigo
git push origin rollback-v1
# Alterar branch de produção no Cloudflare para rollback-v1
```

## 📚 Documentação Relacionada

- [Guia de Versionamento](../deploy/GUIA-VERSIONAMENTO-BRANCHES-TAGS.md)
- [Deploy Cloudflare Pages](../deploy/cloudflare-pages.md)
- [Cloudflare Access](../deploy/cloudflare-access.md)

