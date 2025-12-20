# Cloudflare Access - Proteção por Lista de Emails

Guia para proteger a interface web com autenticação por lista de emails permitidos usando Cloudflare Access (Zero Trust).

## 🎯 O que é Cloudflare Access?

Cloudflare Access (agora parte do Zero Trust) permite proteger aplicações web com autenticação baseada em email, permitindo apenas usuários com emails específicos acessarem a aplicação.

**Benefícios:**

- ✅ Proteção sem necessidade de código adicional
- ✅ Login via Google, Microsoft, GitHub, etc.
- ✅ Lista de emails permitidos
- ✅ Gratuito para até 50 usuários
- ✅ Logs de acesso e auditoria

## 🚀 Configuração Passo a Passo

### Pré-requisitos

1. Conta Cloudflare (gratuita)
2. Projeto Cloudflare Pages já deployado
3. Acesso ao Zero Trust (disponível no plano gratuito)

### Passo 1: Ativar Zero Trust

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. No menu lateral, procure por **"Zero Trust"** ou **"Access"**
3. Se não tiver Zero Trust ativado:
   - Clique em **"Get started"** ou **"Ativar Zero Trust"**
   - Siga o processo de ativação (gratuito)

### Passo 2: Configurar Identity Provider (Provedor de Identidade)

1. No Zero Trust Dashboard, vá em **Settings** > **Authentication**
2. Escolha um provedor de identidade:

   **Opção A: Google (Recomendado - Mais Fácil)**

   - Clique em **"Add new"** > **"Google"**
   - Siga as instruções para conectar com Google OAuth
   - Configure o Client ID e Client Secret do Google

   **Opção B: Microsoft (Azure AD)**

   - Clique em **"Add new"** > **"Microsoft"**
   - Configure com Azure AD

   **Opção C: GitHub**

   - Clique em **"Add new"** > **"GitHub"**
   - Configure OAuth App do GitHub

   **Opção D: Email One-Time PIN (OTP)**

   - Não requer configuração externa
   - Envia código por email para login
   - Mais simples, mas menos seguro

### Passo 3: Criar Política de Acesso

1. No Zero Trust Dashboard, vá em **Access** > **Applications**
2. Clique em **"Add an application"**
3. Configure:

   **Application Type:**

   - Selecione **"Self-hosted"**

   **Application Name:**

   - Nome: `Instacar Campanhas Interface`
   - Session Duration: `24 hours` (ou conforme necessário)

   **Application Domain:**

   - Subdomain: Selecione o domínio do seu Cloudflare Pages
   - Exemplo: `ab27c7da.instacar-automoveis-disparador.pages.dev`
   - Ou use domínio personalizado se configurado

   **Identity Providers:**

   - Selecione o provedor configurado no Passo 2 (Google, Microsoft, etc.)

### Passo 4: Configurar Regra de Acesso (Lista de Emails)

1. Na seção **"Policy"**, clique em **"Add a policy"**
2. Configure a regra:

   **Policy Name:**

   - Nome: `Acesso Permitido - Lista de Emails`

   **Action:**

   - Selecione **"Allow"**

   **Include:**

   - Clique em **"Add a rule"**
   - Selecione **"Emails"**
   - Adicione os emails permitidos (um por linha):
     ```
     usuario1@instacar.com.br
     usuario2@instacar.com.br
     admin@instacar.com.br
     ```
   - Ou use domínio completo:
     - Selecione **"Email domain"**
     - Digite: `@instacar.com.br` (permite todos do domínio)

   **Exclude (Opcional):**

   - Se necessário, exclua emails específicos

3. Clique em **"Save policy"**

### Passo 5: Salvar e Testar

1. Clique em **"Save application"**
2. Aguarde alguns minutos para propagação
3. Acesse a URL do seu Cloudflare Pages
4. Você deve ser redirecionado para login
5. Faça login com um email da lista permitida
6. Após login, você terá acesso à aplicação

## 📋 Exemplos de Configuração

### Exemplo 1: Lista Específica de Emails

```
Policy: Acesso Permitido
Include:
  - Email: renan@instacar.com.br
  - Email: admin@instacar.com.br
  - Email: suporte@instacar.com.br
```

**Resultado:** Apenas esses 3 emails podem acessar.

### Exemplo 2: Domínio Completo

```
Policy: Acesso Permitido
Include:
  - Email domain: @instacar.com.br
```

**Resultado:** Todos os emails do domínio `@instacar.com.br` podem acessar.

### Exemplo 3: Múltiplos Domínios

```
Policy: Acesso Permitido
Include:
  - Email domain: @instacar.com.br
  - Email domain: @instacar.com
```

**Resultado:** Emails de ambos os domínios podem acessar.

### Exemplo 4: Lista + Exceção

```
Policy: Acesso Permitido
Include:
  - Email domain: @instacar.com.br
Exclude:
  - Email: estagiario@instacar.com.br
```

**Resultado:** Todos do domínio podem acessar, exceto `estagiario@instacar.com.br`.

## 🔐 Segurança Adicional

### Configurar Session Duration

- **Recomendado:** 8-24 horas
- **Alto:** 1-4 horas (mais seguro, mas requer login frequente)
- **Baixo:** 7 dias (menos seguro, mas mais conveniente)

### Habilitar MFA (Multi-Factor Authentication)

1. No Zero Trust Dashboard, vá em **Settings** > **Authentication**
2. Configure MFA para o provedor de identidade
3. Isso adiciona uma camada extra de segurança

### Logs e Auditoria

1. No Zero Trust Dashboard, vá em **Logs** > **Access**
2. Veja todos os acessos, tentativas de login e bloqueios
3. Útil para monitoramento e segurança

## 🐛 Troubleshooting

### Erro: "Access denied" mesmo com email correto

**Solução:**

1. Verifique se o email está exatamente como na lista (case-sensitive)
2. Verifique se a política está ativa (não em draft)
3. Aguarde alguns minutos para propagação
4. Limpe cookies do navegador e tente novamente

### Erro: "Identity provider not configured"

**Solução:**

1. Configure um provedor de identidade primeiro (Passo 2)
2. Certifique-se de que o provedor está ativo
3. Verifique se está selecionado na aplicação

### Não aparece tela de login

**Solução:**

1. Verifique se a aplicação está ativa (não em draft)
2. Verifique se o domínio está correto
3. Aguarde alguns minutos para propagação
4. Tente em modo anônimo/privado do navegador

### Erro de CORS após login

**Solução:**

1. O Cloudflare Access não interfere com CORS do Supabase
2. Se houver erro de CORS, configure no Supabase:
   - Settings > API > Allowed URLs
   - Adicione a URL do Cloudflare Pages

## 💰 Custos

**Plano Gratuito:**

- ✅ Até 50 usuários
- ✅ Acesso ilimitado
- ✅ Logs básicos
- ✅ Suporte a múltiplos provedores

**Planos Pagos:**

- Mais de 50 usuários
- Recursos avançados (SSO, MFA avançado, etc.)

## 📚 Referências

- [Documentação Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [Zero Trust Dashboard](https://one.dash.cloudflare.com/)
- [Guia de Configuração Google OAuth](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/google/)

---

**Última atualização:** Dezembro 2025
