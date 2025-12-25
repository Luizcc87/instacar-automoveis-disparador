# ✅ Checklist de Deploy - Branch layout-refactor

## Status Atual

- ✅ Branch atual: `layout-refactor`
- ✅ Tag `v1-layout-antigo` criada e enviada
- ✅ Todos os commits enviados para GitHub
- ✅ Documentação de deploy criada

## 📋 Próximos Passos no Cloudflare Pages

### ⭐ Opção Recomendada: Deploy Preview

**Criar projeto separado para testes da versão refatorada**

1. **Acesse Cloudflare Dashboard:**
   ```
   https://dash.cloudflare.com/[SEU-ACCOUNT-ID]/workers-and-pages/create/pages
   ```
   *(Substitua [SEU-ACCOUNT-ID] pelo seu Account ID)*

2. **Configurações do Projeto:**
   - **Project name:** `instacar-campanhas-refactor`
   - **Production branch:** `layout-refactor`
   - **Framework preset:** `None` ou `Other`
   - **Build command:** `cd interface-web && npm install && npm run inject-env`
   - **Build output directory:** `interface-web`
   - **Root directory:** `/` (raiz do repositório)

3. **Variáveis de Ambiente:**
   - Vá em **Settings** > **Environment Variables**
   - Adicione:
     - `SUPABASE_URL` = `https://seu-projeto-id.supabase.co`
     - `SUPABASE_ANON_KEY` = `sua-anon-key-aqui`

4. **Resultado:**
   - Versão antiga: `https://instacar-campanhas.pages.dev` (continua funcionando)
   - Versão refatorada: `https://instacar-campanhas-refactor.pages.dev` (nova)

### Opção Alternativa: Alterar Branch de Produção

**⚠️ ATENÇÃO: Isso substitui a versão em produção!**

1. Acesse projeto `instacar-campanhas` no Cloudflare Pages
2. Vá em **Settings** > **Builds and deployments**
3. Altere **Production branch** para `layout-refactor`
4. Salve (deploy automático será iniciado)

## 🔄 Rollback (Se Necessário)

Se precisar voltar à versão antiga:

```powershell
# Criar branch de rollback
git checkout -b rollback-v1 v1-layout-antigo
git push origin rollback-v1

# No Cloudflare Pages, altere Production branch para: rollback-v1
```

## 📊 Informações do Repositório

- **Branch de deploy:** `layout-refactor`
- **Tag da versão antiga:** `v1-layout-antigo`
- **Último commit:** `efcdcde` - docs: adicionar resumo de deploy layout-refactor
- **Repositório:** https://github.com/Luizcc87/instacar-automoveis-disparador

## ✅ Checklist Final

- [x] Tag v1-layout-antigo criada
- [x] Branch layout-refactor criada e commitada
- [x] Todos os commits enviados para GitHub
- [ ] Projeto criado no Cloudflare Pages
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Testes realizados na versão refatorada
- [ ] Plano de rollback definido

## 📚 Documentação

- **Guia completo:** `docs/deploy/DEPLOY-BRANCH-LAYOUT-REFACTOR.md`
- **Resumo:** `docs/deploy/RESUMO-DEPLOY-LAYOUT-REFACTOR.md`
- **Versionamento:** `docs/deploy/GUIA-VERSIONAMENTO-BRANCHES-TAGS.md`

