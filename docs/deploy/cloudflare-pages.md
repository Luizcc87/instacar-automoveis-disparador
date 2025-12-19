# Deploy no Cloudflare Pages

Guia completo para fazer deploy da interface web no Cloudflare Pages (plano gratuito).

## 📋 Pré-requisitos

1. Conta no Cloudflare (gratuita)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. Projeto configurado localmente

## 🚀 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que:
- ✅ Arquivo `.gitignore` está configurado
- ✅ Arquivo `config.example.js` está versionado
- ✅ Arquivo `config.js` está no `.gitignore` (não versionado)

### 2. Criar Arquivo de Configuração

Na pasta `interface-web/`, crie o arquivo `config.js` baseado em `config.example.js`:

```javascript
window.INSTACAR_CONFIG = {
  supabase: {
    url: 'https://seu-projeto-id.supabase.co',
    anonKey: 'sua-anon-key-aqui'
  },
  n8nWebhookUrl: 'https://seu-n8n.com/webhook/campanha' // opcional
};
```

**⚠️ IMPORTANTE:** Este arquivo NÃO será versionado (está no .gitignore).

### 3. Fazer Commit e Push

```bash
git add .
git commit -m "Preparar para deploy Cloudflare Pages"
git push origin main
```

### 4. Conectar no Cloudflare Pages

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá em **Pages** > **Create a project**
3. Conecte seu repositório Git
4. Configure:
   - **Project name**: `instacar-campanhas` (ou o nome que preferir)
   - **Production branch**: `main` (ou `master`)
   - **Build command**: (deixe vazio - não precisa build)
   - **Build output directory**: `interface-web`

### 5. Configurar Variáveis de Ambiente (Opcional)

Se quiser usar variáveis de ambiente do Cloudflare:

1. Vá em **Settings** > **Environment Variables**
2. Adicione variáveis (elas estarão disponíveis apenas em build time)
3. **Nota**: Para frontend estático, use o arquivo `config.js` em vez de variáveis de ambiente

### 6. Deploy

O Cloudflare Pages fará o deploy automaticamente após o push.

## 🔧 Configuração da Interface

### Opção 1: Arquivo config.js (Recomendado)

1. Crie `interface-web/config.js` localmente
2. Preencha com suas credenciais
3. Faça commit e push
4. **⚠️ ATENÇÃO**: Se você commitar `config.js` com credenciais, elas ficarão públicas!

**Melhor prática**: Use o arquivo `config.js` apenas localmente e configure manualmente no Cloudflare.

### Opção 2: Configuração Manual na Interface

1. Acesse a interface após o deploy
2. Preencha URL e Anon Key do Supabase
3. Clique em "Conectar"
4. As credenciais serão salvas no localStorage do navegador

## 📁 Estrutura de Arquivos

```
interface-web/
├── index.html          # Interface principal
├── app.js              # Lógica JavaScript
├── config.example.js   # Exemplo de configuração (versionado)
├── config.js           # Configuração real (NÃO versionado)
└── README.md           # Documentação
```

## 🔐 Segurança

### ⚠️ IMPORTANTE - Credenciais

1. **NUNCA** commite o arquivo `config.js` com credenciais reais
2. Use apenas a **Anon Key** do Supabase no frontend (nunca a Service Role Key)
3. As políticas RLS (Row Level Security) do Supabase protegem os dados
4. Se acidentalmente commitar credenciais:
   - Rotacione as chaves imediatamente
   - Remova do histórico do Git (se necessário)

### Configuração Segura

**Recomendado para produção:**
- Deixe `config.js` vazio ou com valores placeholder
- Configure manualmente na interface após o deploy
- Ou use variáveis de ambiente do Cloudflare (se disponível)

## 🌐 Domínio Personalizado (Opcional)

1. Vá em **Custom domains** no projeto
2. Adicione seu domínio
3. Configure DNS conforme instruções do Cloudflare

## 🔄 Atualizações

Após fazer alterações:

```bash
git add .
git commit -m "Atualização da interface"
git push origin main
```

O Cloudflare Pages fará deploy automático em alguns segundos.

## 📊 Monitoramento

- **Deploy logs**: Veja em **Deployments** no dashboard
- **Analytics**: Disponível no plano gratuito
- **Performance**: Cloudflare otimiza automaticamente

## 🐛 Troubleshooting

### Erro 404 ao acessar

- Verifique se o **Build output directory** está correto: `interface-web`
- Verifique se `index.html` está na pasta `interface-web/`

### Erro de CORS do Supabase

1. Vá no Supabase Dashboard
2. Settings > API
3. Adicione o domínio do Cloudflare Pages nas URLs permitidas

### Configuração não funciona

- Verifique se `config.js` existe e está correto
- Verifique console do navegador para erros
- Use a configuração manual na interface como alternativa

## 📝 Checklist de Deploy

- [ ] Repositório Git configurado
- [ ] `.gitignore` configurado corretamente
- [ ] `config.example.js` criado e versionado
- [ ] Projeto conectado no Cloudflare Pages
- [ ] Build output directory: `interface-web`
- [ ] Primeiro deploy realizado
- [ ] Interface acessível
- [ ] Configuração do Supabase testada
- [ ] CORS configurado no Supabase (se necessário)

## 🎯 Próximos Passos

Após o deploy:

1. Acesse a URL fornecida pelo Cloudflare Pages
2. Configure conexão com Supabase
3. Teste criação de campanha
4. Configure domínio personalizado (opcional)
5. Configure webhook do N8N (se usar disparo manual)

---

**URL de exemplo**: `https://instacar-campanhas.pages.dev`
