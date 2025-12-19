# Deploy no Cloudflare Pages - Guia Rápido

## 🚀 Passos para Deploy

### 1. Preparar Arquivos

Certifique-se de que:

- ✅ `config.example.js` existe (versionado)
- ✅ `config.js` está no `.gitignore` (não versionado)
- ✅ Todos os arquivos estão commitados

### 2. Criar Projeto no Cloudflare Pages

1. Acesse: https://dash.cloudflare.com
2. Vá em **Pages** > **Create a project**
3. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)
4. Configure:
   - **Project name**: `instacar-campanhas`
   - **Production branch**: `main`
   - **Build command**: `cd interface-web && npm install && npm run inject-env`
   - **Build output directory**: `interface-web`

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
