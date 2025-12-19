# Deploy no Cloudflare Pages

Guia para fazer deploy da interface web no Cloudflare Pages (plano gratuito).

## 🚀 Configuração Rápida

### 1. Conectar Repositório

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá em **Pages** > **Create a project**
3. Conecte seu repositório GitHub
4. Configure:
   - **Project name:** `instacar-campanhas`
   - **Production branch:** `main`
   - **Build command:** `cd interface-web && npm install && npm run inject-env`
   - **Build output directory:** `interface-web`

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

1. **NUNCA** commite o arquivo `config.js` com credenciais reais
2. Use apenas a **Anon Key** do Supabase no frontend
3. As políticas RLS (Row Level Security) do Supabase protegem os dados
4. Se acidentalmente commitar credenciais, rotacione as chaves imediatamente

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
