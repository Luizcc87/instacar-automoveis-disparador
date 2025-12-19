# ✅ Checklist Pré-Commit - Instacar Automóveis Disparador

Use este checklist antes de fazer o primeiro commit no GitHub.

## 🔐 Segurança - CRÍTICO

- [ ] ✅ **Credenciais removidas do `index.html`** - Já corrigido automaticamente
- [ ] ✅ **`.env` está no `.gitignore`** - Verificar com: `git check-ignore .env`
- [ ] ✅ **`interface-web/config.js` está no `.gitignore`** - Verificar com: `git check-ignore interface-web\config.js`
- [ ] ✅ **`fluxos-n8n/*.json` está no `.gitignore`** - Verificar com: `git check-ignore fluxos-n8n\*.json`
- [ ] ✅ **`node_modules/` está no `.gitignore`** - Verificar com: `git check-ignore interface-web\node_modules`
- [ ] ✅ **Nenhuma Service Role Key no código** - Apenas Anon Key deve ser usada no frontend
- [ ] ✅ **Nenhum token Uazapi hardcoded** - Verificar arquivos JavaScript
- [ ] ✅ **Nenhuma API Key do OpenAI no código** - Deve estar apenas em variáveis de ambiente
- [ ] ✅ **Fluxos N8N não serão commitados** - Verificar com `git check-ignore fluxos-n8n\*.json`

## 📁 Arquivos Necessários para Cloudflare Pages

### Obrigatórios ✅

- [ ] ✅ `interface-web/index.html` - Interface principal
- [ ] ✅ `interface-web/app.js` - Lógica JavaScript
- [ ] ✅ `interface-web/_headers` - Headers de segurança
- [ ] ✅ `interface-web/_redirects` - Redirecionamentos SPA
- [ ] ✅ `interface-web/inject-env.js` - Script de injeção de variáveis
- [ ] ✅ `interface-web/package.json` - Dependências (opcional, mas recomendado)
- [ ] ✅ `interface-web/config.example.js` - Template de configuração

### Não devem ser commitados ❌

- [ ] ❌ `interface-web/config.js` - Configuração real (deve estar no .gitignore)
- [ ] ❌ `interface-web/node_modules/` - Dependências (deve estar no .gitignore)
- [ ] ❌ `.env` - Variáveis de ambiente (deve estar no .gitignore)
- [ ] ❌ `fluxos-n8n/*.json` - Fluxos N8N com credenciais (deve estar no .gitignore)

## 📝 Documentação

- [ ] ✅ `README.md` - Documentação principal
- [ ] ✅ `GUIA-PRIMEIRO-COMMIT.md` - Este guia
- [ ] ✅ `docs/deploy/cloudflare-pages.md` - Guia de deploy
- [ ] ✅ `interface-web/README.md` - Documentação da interface

## 🔍 Verificações Finais

Execute estes comandos antes do commit:

```powershell
# 1. Verificar status do Git
git status

# 2. Verificar se arquivos sensíveis estão ignorados
git check-ignore .env
git check-ignore interface-web\config.js
git check-ignore interface-web\node_modules
git check-ignore fluxos-n8n\*.json

# 3. Verificar se há credenciais no código (deve retornar vazio)
Select-String -Path "interface-web\index.html" -Pattern "supabase\.co|eyJ[A-Za-z0-9_-]+" -CaseSensitive:$false

# 4. Ver o que será commitado
git diff --cached --name-only
```

## ✅ Pronto para Commit?

Se todos os itens acima estão marcados, você está pronto para:

1. Fazer commit: `git commit -m "feat: primeiro commit - sistema de disparo WhatsApp Instacar"`
2. Fazer push: `git push -u origin main`
3. Configurar deploy no Cloudflare Pages

---

**Última atualização:** 2025-12-18
