# 🚀 Guia para Primeiro Commit no GitHub

Este guia te ajudará a preparar o projeto para o primeiro commit e deploy no Cloudflare Pages.

## ⚠️ PROBLEMA CRÍTICO ENCONTRADO

**Credenciais hardcoded no `interface-web/index.html`** (linhas 25-27):

- URL do Supabase
- Anon Key do Supabase

**AÇÃO NECESSÁRIA:** Remover essas credenciais antes do commit!

## 📋 Checklist Pré-Commit

### ✅ 1. Verificar Arquivos Sensíveis

Execute estes comandos para verificar se há credenciais expostas:

```powershell
# Verificar se há tokens/chaves em arquivos
Select-String -Path "interface-web\index.html" -Pattern "supabase\.co|eyJ[A-Za-z0-9_-]+" -CaseSensitive:$false

# Verificar se .env está ignorado
git check-ignore .env

# Verificar se config.js está ignorado
git check-ignore interface-web\config.js

# Verificar se fluxos N8N estão ignorados
git check-ignore fluxos-n8n\*.json
```

### ✅ 2. Remover Credenciais do index.html

O arquivo `interface-web/index.html` contém credenciais hardcoded. Elas devem ser removidas e substituídas por variáveis de ambiente.

**Ação:** O script `inject-env.js` já está configurado para injetar essas variáveis em build time.

### ✅ 3. Verificar .gitignore

O arquivo `.gitignore` já está configurado corretamente para ignorar:

- ✅ `.env` e variantes
- ✅ `interface-web/config.js`
- ✅ `node_modules/`
- ✅ Arquivos de credenciais

### ✅ 4. Verificar Arquivos Necessários para Cloudflare Pages

Arquivos essenciais para deploy no Cloudflare Pages:

**Obrigatórios:**

- ✅ `interface-web/index.html` - Interface principal
- ✅ `interface-web/app.js` - Lógica JavaScript
- ✅ `interface-web/_headers` - Headers de segurança
- ✅ `interface-web/_redirects` - Redirecionamentos SPA
- ✅ `interface-web/inject-env.js` - Script de injeção de variáveis
- ✅ `interface-web/package.json` - Dependências (opcional, mas recomendado)
- ✅ `interface-web/config.example.js` - Template de configuração

**Opcionais (mas recomendados):**

- ✅ `interface-web/README.md` - Documentação
- ✅ `docs/deploy/cloudflare-pages.md` - Guia de deploy

**NÃO devem ser commitados:**

- ❌ `interface-web/config.js` - Configuração real (já no .gitignore)
- ❌ `interface-web/node_modules/` - Dependências (já no .gitignore)
- ❌ `.env` - Variáveis de ambiente (já no .gitignore)
- ❌ `fluxos-n8n/*.json` - Fluxos N8N com credenciais (já no .gitignore)

## 🔧 Correções Necessárias ANTES do Commit

### 1. Limpar Credenciais do index.html

O arquivo `index.html` tem credenciais hardcoded. Elas devem ser removidas e substituídas por placeholders ou variáveis de ambiente.

**Solução:** O script `inject-env.js` já está configurado. Basta garantir que as credenciais não estejam hardcoded no HTML.

### 2. Verificar se config.js está no .gitignore

```powershell
# Verificar
git check-ignore interface-web\config.js
git check-ignore fluxos-n8n\*.json
```

Se não retornar nada, adicione ao .gitignore.

## 📝 Sugestão de Nome do Repositório

Baseado na estrutura do projeto, sugiro:

**Opção 1 (Recomendada):**

```
instacar-automoveis-disparador
```

- ✅ Descritivo
- ✅ Identifica o cliente (Instacar)
- ✅ Identifica a funcionalidade (disparador)
- ✅ Já é o nome da pasta atual

**Opção 2:**

```
instacar-whatsapp-campanhas
```

- ✅ Mais focado em campanhas
- ✅ Menos técnico

**Opção 3:**

```
instacar-marketing-automation
```

- ✅ Mais genérico
- ✅ Pode incluir outras funcionalidades futuras

## 🚀 Passo a Passo para Criar Repositório e Primeiro Commit

### Passo 1: Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com)
2. Clique em **"New repository"** (ou vá em **"+"** > **"New repository"**)
3. Preencha:
   - **Repository name:** `instacar-automoveis-disparador` (ou sua escolha)
   - **Description:** `Sistema automatizado de disparo de mensagens WhatsApp com N8N, Supabase e IA para Instacar Automóveis`
   - **Visibility:** Private (recomendado) ou Public
   - **NÃO marque:** "Add a README file" (já temos)
   - **NÃO marque:** "Add .gitignore" (já temos)
   - **NÃO marque:** "Choose a license" (projeto interno)
4. Clique em **"Create repository"**

### Passo 2: Inicializar Git Localmente (se ainda não foi feito)

```powershell
# Verificar se já é um repositório Git
git status

# Se não for, inicializar
git init

# Configurar usuário (se ainda não configurado)
git config user.name "Seu Nome"
git config user.email "seu.email@exemplo.com"
```

### Passo 3: Adicionar Remote do GitHub

```powershell
# Adicionar remote (substitua USERNAME pelo seu usuário GitHub)
git remote add origin https://github.com/USERNAME/instacar-automoveis-disparador.git

# Verificar
git remote -v
```

### Passo 4: Preparar Arquivos para Commit

```powershell
# Verificar status
git status

# Adicionar todos os arquivos (exceto os ignorados pelo .gitignore)
git add .

# Verificar o que será commitado
git status
```

**⚠️ IMPORTANTE:** Verifique se `config.js`, `.env` e `fluxos-n8n/*.json` NÃO aparecem na lista de arquivos adicionados!

### Passo 5: Fazer o Primeiro Commit

```powershell
git commit -m "feat: primeiro commit - sistema de disparo WhatsApp Instacar

- Sistema completo de disparo escalonado via WhatsApp
- Integração com N8N, Supabase, Uazapi e OpenAI
- Interface web para gerenciamento de campanhas
- Sistema de prevenção de duplicatas
- Upload de planilhas XLSX/CSV
- Documentação completa
- Pronto para deploy no Cloudflare Pages"
```

### Passo 6: Fazer Push para GitHub

```powershell
# Primeiro push (definir upstream)
git push -u origin main

# Se sua branch for 'master' em vez de 'main':
git branch -M main  # Renomear para main
git push -u origin main
```

## 🌐 Configurar Deploy no Cloudflare Pages

### Passo 1: Conectar Repositório

1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá em **Pages** > **Create a project**
3. Conecte seu repositório GitHub
4. Autorize o Cloudflare a acessar seu repositório

### Passo 2: Configurar Build

Configure o projeto:

- **Project name:** `instacar-campanhas` (ou sua escolha)
- **Production branch:** `main`
- **Build command:** `cd interface-web && node inject-env.js`
- **Build output directory:** `interface-web`

### Passo 3: Configurar Variáveis de Ambiente

1. Vá em **Settings** > **Environment Variables**
2. Adicione:
   - `SUPABASE_URL` = `https://seu-projeto-id.supabase.co`
   - `SUPABASE_ANON_KEY` = `sua-anon-key-aqui`

**⚠️ IMPORTANTE:** Use apenas a **Anon Key**, nunca a Service Role Key!

### Passo 4: Fazer Deploy

O Cloudflare Pages fará deploy automaticamente após o push.

## 📁 Estrutura de Arquivos para Cloudflare Pages

O Cloudflare Pages precisa apenas dos arquivos estáticos da pasta `interface-web/`:

```
interface-web/
├── index.html          ✅ Obrigatório
├── app.js              ✅ Obrigatório
├── _headers            ✅ Recomendado (segurança)
├── _redirects          ✅ Recomendado (SPA routing)
├── inject-env.js       ✅ Obrigatório (para variáveis de ambiente)
├── package.json        ⚠️ Opcional (mas recomendado)
├── config.example.js   ✅ Recomendado (template)
└── README.md           ⚠️ Opcional (documentação)
```

**NÃO são necessários:**

- ❌ `config.js` - Será criado via variáveis de ambiente
- ❌ `node_modules/` - Não é necessário para deploy estático
- ❌ Scripts de desenvolvimento (`start-dev.bat`, `start-dev.sh`)

## 🔐 Segurança - Checklist Final

Antes de fazer push, verifique:

- [ ] ✅ Nenhuma credencial hardcoded no código
- [ ] ✅ `.env` está no `.gitignore` e não será commitado
- [ ] ✅ `interface-web/config.js` está no `.gitignore`
- [ ] ✅ `fluxos-n8n/*.json` está no `.gitignore` (não será commitado)
- [ ] ✅ `node_modules/` está no `.gitignore`
- [ ] ✅ Apenas Anon Key será usada no frontend (nunca Service Role Key)
- [ ] ✅ Repositório privado (se contiver informações sensíveis)

## 📊 Comandos Úteis

### Verificar o que será commitado

```powershell
git status
git diff --cached  # Ver mudanças staged
```

### Verificar se arquivos sensíveis estão ignorados

```powershell
git check-ignore .env
git check-ignore interface-web\config.js
git check-ignore interface-web\node_modules
git check-ignore fluxos-n8n\*.json
```

### Ver histórico de commits

```powershell
git log --oneline
```

### Verificar diferenças antes de commit

```powershell
git diff
```

## 🎯 Próximos Passos Após o Commit

1. ✅ Fazer push para GitHub
2. ✅ Conectar no Cloudflare Pages
3. ✅ Configurar variáveis de ambiente
4. ✅ Testar deploy
5. ✅ Configurar domínio personalizado (opcional)
6. ✅ Testar interface web
7. ✅ Configurar CORS no Supabase (se necessário)

## 📚 Documentação Relacionada

- [Guia de Deploy Cloudflare Pages](docs/deploy/cloudflare-pages.md)
- [README Principal](README.md)
- [Documentação da Interface Web](interface-web/README.md)

---

**Última atualização:** 2025-12-18
