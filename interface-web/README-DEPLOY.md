# Deploy no Cloudflare Pages - Guia Rápido

## 🚀 Passos para Deploy

### 1. Preparar Arquivos

Certifique-se de que:

- ✅ `config.example.js` existe (versionado)
- ✅ `config.js` está no `.gitignore` (não versionado)
- ✅ Todos os arquivos estão commitados

### 2. Criar Projeto no Cloudflare Pages

**⚠️ ATENÇÃO: Cloudflare unificou Workers e Pages na mesma interface!**

**Opção A: Link Direto (Recomendado)**

1. Acesse diretamente: `https://dash.cloudflare.com/[SEU-ACCOUNT-ID]/workers-and-pages/create/pages`
   - Substitua `[SEU-ACCOUNT-ID]` pelo seu Account ID (encontrado em Account Details)
   - Exemplo: `https://dash.cloudflare.com/2827ca852700d85f4b457965785cab46/workers-and-pages/create/pages`

**Opção B: Pelo Dashboard**

1. Acesse: https://dash.cloudflare.com
2. No menu lateral, procure por **"Workers e Pages"** ou **"Pages"**
3. Clique em **"Criar aplicativo"** ou **"Create a project"**
4. **Se aparecer página de criação de Workers:**

   - Procure na parte inferior da página pelo link específico de **Pages**
   - O link será: `https://dash.cloudflare.com/[account-id]/workers-and-pages/create/pages`
   - Clique nesse link

5. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)
6. Configure:
   - **Project name**: `instacar-campanhas`
   - **Production branch**: `main`
   - **Framework preset**: `None` (ou `Other`)
   - **Build command**: `cd interface-web && npm install && npm run inject-env`
   - **Build output directory**: `interface-web`
   - **Root directory**: `/` (raiz do repositório)

**✅ URL correta após deploy:** `https://instacar-campanhas.pages.dev`  
**❌ URL incorreta:** `https://seu-projeto.workers.dev` (isso é Workers, não Pages!)

### 3. Configurar Variáveis de Ambiente

**⚠️ OBRIGATÓRIO:** Configure as variáveis de ambiente do Supabase:

1. Vá em **Settings** > **Environment Variables**
2. Adicione:
   - `SUPABASE_URL` = `https://seu-projeto-id.supabase.co`
   - `SUPABASE_ANON_KEY` = `sua-anon-key-aqui`

**⚠️ IMPORTANTE:**

- Use apenas a **Anon Key**, nunca a Service Role Key
- As variáveis serão injetadas automaticamente durante o build via `inject-env.js`
- Configure o **Build Command**: `cd interface-web && npm install && npm run inject-env`

### 4. Deploy Automático

Após conectar o repositório, o Cloudflare Pages fará deploy automático.

## 📝 Arquivos Importantes

- `interface-web/index.html` - Interface principal
- `interface-web/app.js` - Lógica JavaScript
- `interface-web/config.js` - Configuração (não versionado)
- `interface-web/config.example.js` - Exemplo (versionado)
- `interface-web/_headers` - Headers de segurança
- `interface-web/_redirects` - Redirecionamentos

## 🔐 Segurança

- ✅ Use apenas **Anon Key** no frontend
- ✅ **NUNCA** use Service Role Key no frontend
- ✅ RLS (Row Level Security) protege os dados
- ✅ `config.js` está no `.gitignore`

## 🌐 Domínio

Após deploy, você terá uma URL como:
`https://instacar-campanhas.pages.dev`

Você pode configurar um domínio personalizado depois.

## 📚 Documentação Completa

Veja: [docs/deploy/cloudflare-pages.md](../deploy/cloudflare-pages.md)
