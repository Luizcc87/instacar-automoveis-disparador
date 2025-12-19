# Configuração de Variáveis de Ambiente

## Supabase (Obrigatório)

As credenciais do Supabase devem ser configuradas via **variáveis de ambiente**, não através da interface web.

### Desenvolvimento Local

1. Crie um arquivo `.env` na **raiz do projeto** (não na pasta interface-web):

```bash
# Na raiz do projeto: instacar-automoveis-disparador/.env
SUPABASE_URL=https://seu-projeto-id.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
```

2. Instale as dependências (se ainda não instalou):

```bash
cd interface-web
npm install
```

3. Execute o script de injeção antes de servir os arquivos:

```bash
npm run inject-env
```

Ou use o script diretamente:

```bash
node inject-env.js
```

4. Depois, sirva os arquivos:

```bash
npx http-server . -p 8080
```

Ou use o comando completo:

```bash
npm run dev
```

### Cloudflare Pages (Produção)

1. Acesse seu projeto no Cloudflare Pages
2. Vá em **Settings** > **Environment Variables**
3. Adicione as seguintes variáveis:

```
SUPABASE_URL = https://seu-projeto-id.supabase.co
SUPABASE_ANON_KEY = sua-anon-key-aqui
```

4. Configure o **Build Command**:

```bash
cd interface-web && npm install && npm run inject-env
```

**OU** (se já tiver node_modules):

```bash
cd interface-web && node inject-env.js
```

5. Configure o **Build Output Directory**:

```
interface-web
```

**Nota:** O script `inject-env.js` será executado durante o build e injetará as variáveis no HTML. As variáveis de ambiente do Cloudflare Pages estarão disponíveis como `process.env.SUPABASE_URL` e `process.env.SUPABASE_ANON_KEY`.

## Uazapi (Configuração Manual)

As configurações da Uazapi (URL e Token) devem ser feitas através da interface web:

1. Clique em **⚙️ Gerenciar Configurações**
2. Preencha:
   - **URL Base da Instância Uazapi**
   - **Instance Token (Uazapi)**
3. Clique em **💾 Salvar Configurações**

Essas configurações são salvas no `localStorage` do navegador e persistem entre sessões.

## Verificação de Status

O sistema mostra o status de ambas as conexões na seção **📊 Status do Sistema**:

- **Supabase**: Verifica se as variáveis de ambiente estão configuradas e testa a conexão
- **Uazapi**: Verifica se as credenciais estão configuradas no localStorage

## Troubleshooting

### Supabase não conecta

1. Verifique se as variáveis de ambiente estão configuradas:

   - Dev: Verifique o arquivo `.env`
   - Produção: Verifique no Cloudflare Pages > Settings > Environment Variables

2. Verifique se o script `inject-env.js` foi executado:

   - O HTML deve conter `<script id="env-config">` com as variáveis

3. Verifique o console do navegador para erros

### Uazapi não aparece como configurado

1. Verifique se você salvou as configurações através da interface
2. Verifique o `localStorage` do navegador:
   ```javascript
   localStorage.getItem("uazapiBaseUrl");
   localStorage.getItem("uazapiToken");
   ```
