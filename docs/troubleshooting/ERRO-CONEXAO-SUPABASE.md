# 🔧 Troubleshooting: Erro de Conexão com Supabase

## 🚨 Erro: `ERR_NAME_NOT_RESOLVED` ou `ERR_TIMED_OUT`

Este erro indica que o navegador não consegue resolver o domínio do Supabase ou a conexão está falhando.

## 🔍 Diagnóstico

### 1. Verificar Variáveis de Ambiente no Cloudflare Pages

1. Acesse o projeto no Cloudflare Pages: `instacar-campanhas-refactor`
2. Vá em **Settings** > **Environment Variables**
3. Verifique se as seguintes variáveis estão configuradas:
   - `SUPABASE_URL` - Deve ser `https://[seu-projeto-id].supabase.co`
   - `SUPABASE_ANON_KEY` - Deve ser a chave anônima do seu projeto

### 2. Verificar se o Projeto Supabase Existe

O erro `ERR_NAME_NOT_RESOLVED` pode indicar que:

- ❌ O projeto Supabase foi **pausado** (projetos gratuitos são pausados após inatividade)
- ❌ O projeto Supabase foi **deletado**
- ❌ A URL está **incorreta**

**Como verificar:**

1. Acesse https://supabase.com/dashboard
2. Verifique se o projeto `rirrnhelyutzunwicmkg` existe
3. Se não existir ou estiver pausado:
   - **Pausado**: Clique em "Restore" para reativar
   - **Deletado**: Você precisará criar um novo projeto ou restaurar de backup

### 3. Verificar Build Logs no Cloudflare Pages

1. Acesse o projeto no Cloudflare Pages
2. Vá em **Deployments** > Selecione o último deploy
3. Verifique os logs do build:
   - Procure por: `✅ Variáveis de ambiente injetadas no index.html`
   - Procure por: `✅ Supabase configurado via variáveis de ambiente`
   - Se aparecer: `⚠️ SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas` → Variáveis não estão configuradas

### 4. Verificar no Console do Navegador

Abra o console do navegador (F12) e execute:

```javascript
// Verificar se as variáveis foram injetadas
console.log('ENV:', window.ENV);
console.log('SUPABASE_URL:', window.ENV?.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', window.ENV?.SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada');
```

**Resultados esperados:**
- ✅ `SUPABASE_URL` deve mostrar uma URL válida começando com `https://`
- ✅ `SUPABASE_ANON_KEY` deve mostrar "Configurada"
- ❌ Se mostrar `undefined` ou valores vazios → Variáveis não foram injetadas

## 🔧 Soluções

### Solução 1: Configurar Variáveis de Ambiente no Cloudflare Pages

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → Use como `SUPABASE_URL`
   - **anon public** key → Use como `SUPABASE_ANON_KEY`

5. No Cloudflare Pages:
   - Vá em **Settings** > **Environment Variables**
   - Adicione:
     - `SUPABASE_URL` = `https://[seu-projeto-id].supabase.co`
     - `SUPABASE_ANON_KEY` = `[sua-anon-key]`
   - Clique em **Save**

6. Faça um novo deploy:
   - Vá em **Deployments**
   - Clique em **Retry deployment** no último deploy
   - Ou faça um novo commit para trigger automático

### Solução 2: Reativar Projeto Supabase Pausado

Se o projeto foi pausado:

1. Acesse https://supabase.com/dashboard
2. Se você ver uma mensagem sobre projeto pausado:
   - Clique em **Restore project**
   - Aguarde alguns minutos para o projeto ser reativado
3. Após reativação, verifique se a URL ainda é a mesma
4. Se a URL mudou, atualize `SUPABASE_URL` no Cloudflare Pages

### Solução 3: Verificar DNS/Conectividade

Se o projeto existe mas ainda não conecta:

1. **Teste a URL diretamente:**
   ```bash
   curl https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/
   ```
   - Se retornar erro → Projeto pode estar pausado ou URL incorreta
   - Se retornar JSON → Projeto está ativo

2. **Verificar CORS:**
   - No Supabase Dashboard: **Settings** > **API**
   - Verifique se `https://instacar-campanhas-refactor.pages.dev` está na lista de URLs permitidas
   - Adicione se necessário

### Solução 4: Limpar Cache do Navegador

Às vezes o navegador pode estar usando uma versão antiga do HTML:

1. Abra o DevTools (F12)
2. Clique com botão direito no botão de recarregar
3. Selecione **Empty Cache and Hard Reload**
4. Ou use `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

## 📋 Checklist de Verificação

- [ ] Projeto Supabase existe e está ativo
- [ ] Variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` configuradas no Cloudflare Pages
- [ ] Build logs mostram que variáveis foram injetadas
- [ ] Console do navegador mostra `window.ENV` com valores corretos
- [ ] URL do Supabase está correta (teste com curl)
- [ ] CORS configurado no Supabase para permitir o domínio do Cloudflare Pages
- [ ] Cache do navegador limpo

## 🆘 Se Nada Funcionar

1. **Verificar se o projeto Supabase foi deletado:**
   - Se sim, você precisará criar um novo projeto
   - Ou restaurar de backup se disponível

2. **Criar novo projeto Supabase:**
   - Acesse https://supabase.com/dashboard
   - Clique em **New Project**
   - Configure o projeto
   - Copie a nova URL e chave
   - Atualize no Cloudflare Pages

3. **Verificar logs detalhados:**
   - No Cloudflare Pages: **Deployments** > **View build logs**
   - No navegador: Console (F12) > Network tab > Filtrar por "supabase"
   - Verifique se há erros específicos de CORS, autenticação, etc.

## 📚 Documentação Relacionada

- [Guia de Deploy](deploy/DEPLOY-BRANCH-LAYOUT-REFACTOR.md)
- [Configuração Supabase](../supabase/schema.sql)

