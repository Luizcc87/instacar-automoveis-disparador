# Deploy no Cloudflare Pages

Guia para fazer deploy da interface web no Cloudflare Pages (plano gratuito).

## 🚀 Configuração Rápida

### ⚠️ IMPORTANTE: Workers vs Pages

**Cloudflare unificou Workers e Pages na mesma interface**, mas são produtos diferentes:

- **Workers**: Para código serverless (JavaScript/TypeScript) - ❌ NÃO é isso que você precisa
- **Pages**: Para sites estáticos (HTML/CSS/JS) - ✅ É isso que você precisa

**Como identificar:**

- ✅ URL correta: `https://seu-projeto.pages.dev`
- ❌ URL incorreta: `https://seu-projeto.workers.dev`

### 1. Conectar Repositório

**Opção A: Link Direto (Recomendado)**

1. Acesse diretamente: `https://dash.cloudflare.com/[SEU-ACCOUNT-ID]/workers-and-pages/create/pages`
   - Substitua `[SEU-ACCOUNT-ID]` pelo seu Account ID (encontrado em Account Details no dashboard)
   - Exemplo: `https://dash.cloudflare.com/2827ca852700d85f4b457965785cab46/workers-and-pages/create/pages`

**Opção B: Pelo Dashboard**

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. No menu lateral, procure por **"Workers e Pages"** ou **"Pages"**
3. Clique em **"Criar aplicativo"** ou **"Create a project"**
4. **IMPORTANTE**: Se aparecer um modal "Ship something new" com opções de Workers:

   - Procure na parte inferior da página pelo link específico de **Pages**
   - O link será algo como: `https://dash.cloudflare.com/[account-id]/workers-and-pages/create/pages`
   - Clique nesse link para ir direto para a criação de Pages

5. Conecte seu repositório GitHub/GitLab/Bitbucket
6. Configure:
   - **Project name:** `instacar-campanhas`
   - **Production branch:** `main`
   - **Framework preset:** `None` (ou `Other`)
   - **Build command:** `cd interface-web && npm install && npm run inject-env`
   - **Build output directory:** `interface-web`
   - **Root directory:** `/` (raiz do repositório)

### 2. Variáveis de Ambiente

1. Vá em **Settings** > **Environment Variables**
2. Adicione:
   - `SUPABASE_URL` = `https://seu-projeto-id.supabase.co`
   - `SUPABASE_ANON_KEY` = `sua-anon-key-aqui`

**⚠️ IMPORTANTE:** Use apenas a **Anon Key**, nunca a Service Role Key!

### 3. Deploy Automático

O Cloudflare Pages fará deploy automaticamente após cada push na branch `main`.

## 📁 Arquivos Necessários

O Cloudflare Pages precisa apenas dos arquivos estáticos da pasta `interface-web/`:

- ✅ `index.html` - Interface principal
- ✅ `app.js` - Lógica JavaScript
- ✅ `_headers` - Headers de segurança
- ✅ `_redirects` - Redirecionamentos SPA
- ✅ `inject-env.js` - Script de injeção de variáveis
- ✅ `package.json` - Dependências

## 🔐 Segurança

### Proteção Básica

1. **NUNCA** commite o arquivo `config.js` com credenciais reais
2. **CRÍTICO**: **NUNCA** commite `index.html` após executar `inject-env.js` localmente - sempre mantenha valores vazios no script `env-config` antes de commitar
3. Use apenas a **Anon Key** do Supabase no frontend
4. As políticas RLS (Row Level Security) do Supabase protegem os dados
5. Se acidentalmente commitar credenciais, rotacione as chaves imediatamente
6. O script `inject-env.js` injeta credenciais no HTML - isso é seguro apenas durante o build no Cloudflare Pages

### Proteção por Lista de Emails (Recomendado)

Para proteger a interface web com autenticação por lista de emails permitidos, use **Cloudflare Access (Zero Trust)**:

📖 **Guia completo**: [cloudflare-access.md](cloudflare-access.md)

**Benefícios:**

- ✅ Login via Google, Microsoft, GitHub, etc.
- ✅ Lista de emails permitidos
- ✅ Gratuito para até 50 usuários
- ✅ Logs de acesso e auditoria
- ✅ Sem necessidade de código adicional

**Configuração rápida:**

1. Ative Zero Trust no Cloudflare Dashboard
2. Configure um provedor de identidade (Google recomendado)
3. Crie uma aplicação protegida apontando para seu Cloudflare Pages
4. Configure política de acesso com lista de emails permitidos

## 🐛 Troubleshooting

### Erro 404 ao acessar

- Verifique se o **Build output directory** está correto: `interface-web`
- Verifique se `index.html` está na pasta `interface-web/`

### Erro de CORS do Supabase

1. Vá no Supabase Dashboard
2. Settings > API
3. Adicione o domínio do Cloudflare Pages nas URLs permitidas

### Configuração não funciona

- Verifique console do navegador para erros
- Use a configuração manual na interface como alternativa

## 🌐 Domínio Personalizado (Opcional)

1. Vá em **Custom domains** no projeto
2. Adicione seu domínio
3. Configure DNS conforme instruções do Cloudflare

## 📊 Monitoramento

- **Deploy logs**: Veja em **Deployments** no dashboard
- **Analytics**: Disponível no plano gratuito
- **Performance**: Cloudflare otimiza automaticamente

---

**URL de exemplo**: `https://instacar-campanhas.pages.dev`
