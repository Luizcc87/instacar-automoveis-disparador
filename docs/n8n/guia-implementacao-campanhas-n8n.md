# Guia: Implementação do Fluxo de Campanhas no N8N

Este guia explica passo a passo como implementar o sistema de campanhas no N8N, incluindo configuração de workflows, webhooks e integração com a interface web.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ N8N instalado e acessível (self-hosted ou cloud)
- ✅ Supabase configurado com schema de campanhas aplicado
- ✅ Credenciais do Supabase (URL e Service Role Key)
- ✅ Credenciais do Uazapi (Base URL e Token)
- ✅ Credenciais do OpenAI (API Key)
- ✅ Interface web configurada (opcional, para disparo manual)

## 🚀 Passo 1: Importar Workflow Principal

### 1.1 Acessar N8N

1. Abra o N8N no navegador
2. Faça login na sua conta
3. Vá em **Workflows** no menu lateral

### 1.2 Importar Workflow

1. Clique em **Import from File** (ou use o botão **+** > **Import from File**)
2. Selecione o arquivo: `fluxos-n8n/Disparador_Campanhas_Instacar.json`
3. Aguarde a importação

### 1.3 Configurar Variáveis de Ambiente

O workflow principal tem um nó **"Set Variables - CONFIGURAR AQUI"** que precisa ser configurado.

#### Opção A: N8N Self-Hosted Free (sem variáveis de ambiente)

1. Abra o workflow importado
2. Localize o nó **"Set Variables - CONFIGURAR AQUI"**
3. Clique no nó para editar
4. Configure os seguintes valores:

```javascript
SUPABASE_URL: https://[seu-project-id].supabase.co
SUPABASE_SERVICE_KEY: [sua-service-role-key]
UAZAPI_BASE_URL: https://[subdomain].uazapi.com
UAZAPI_TOKEN: [seu-token-uazapi]
OPENAI_MODEL: gpt-4.1
SHEET_PAGE_NAME: Listagem de Clientes por Vended
SHEET_IDS: ["id1","id2",...,"id9"]  // Array JSON com IDs das planilhas
```

#### Opção B: N8N Cloud/Pro (com variáveis de ambiente - RECOMENDADO)

1. Vá em **Settings** > **Environment Variables**
2. Adicione as seguintes variáveis:

```bash
SUPABASE_URL=https://[seu-project-id].supabase.co
SUPABASE_SERVICE_KEY=[sua-service-role-key]
UAZAPI_BASE_URL=https://[subdomain].uazapi.com
UAZAPI_TOKEN=[seu-token-uazapi]
OPENAI_MODEL=gpt-4.1
SHEET_PAGE_NAME=Listagem de Clientes por Vended
SHEET_IDS=["id1","id2",...,"id9"]
```

1. No workflow, o nó **"Set Variables"** já está configurado para usar `{{ $env.VARIABLE_NAME }}`

### 1.4 Configurar Credenciais

Configure as credenciais necessárias:

1. **Supabase API:**

   - Vá em **Credentials** > **Add Credential**
   - Selecione **Supabase**
   - Preencha:
     - **Host**: `[seu-project-id].supabase.co`
     - **Service Role Secret**: `[sua-service-role-key]`
   - Salve como "Supabase account"

2. **OpenAI API:**

   - Vá em **Credentials** > **Add Credential**
   - Selecione **OpenAI**
   - Preencha:
     - **API Key**: `[sua-openai-api-key]`
   - Salve

3. **Google Sheets** (se necessário):
   - Vá em **Credentials** > **Add Credential**
   - Selecione **Google Sheets OAuth2**
   - Siga o processo de autenticação OAuth2

## 🔗 Passo 2: Obter URL do Webhook

O workflow principal tem um **Webhook Trigger** que precisa ser ativado para receber chamadas externas.

### 2.1 Ativar o Workflow

1. No workflow importado, clique no botão **Active** (toggle no canto superior direito)
2. O workflow precisa estar **ativo** para o webhook funcionar

### 2.2 Obter URL do Webhook

1. Clique no nó **"Webhook Trigger - Campanha"**
2. Na aba **Parameters**, você verá:

   - **HTTP Method**: POST
   - **Path**: `campanha`
   - **Response Mode**: onReceived

3. A URL do webhook será exibida no nó ou você pode obter de duas formas:

   **Forma 1: Copiar do nó**

   - Clique no nó **Webhook Trigger**
   - A URL completa aparecerá no campo **Webhook URL**
   - Exemplo: `https://seu-n8n.com/webhook/campanha`

   **Forma 2: Construir manualmente**

   ```text
   https://[seu-n8n-url]/webhook/campanha
   ```

   Onde:

   - `[seu-n8n-url]` é a URL base do seu N8N
   - `/webhook/campanha` é o path configurado no trigger

### 2.3 Testar o Webhook

Você pode testar o webhook usando curl ou Postman:

```bash
curl -X POST https://seu-n8n.com/webhook/campanha \
  -H "Content-Type: application/json" \
  -d '{
    "campanha_id": "uuid-da-campanha",
    "trigger_tipo": "manual"
  }'
```

**Nota:** Substitua `uuid-da-campanha` pelo ID real de uma campanha no Supabase.

## ⚙️ Passo 3: Configurar Workflows Auxiliares

O sistema possui dois workflows auxiliares que chamam o workflow principal:

### 3.1 Disparador de Campanhas Agendadas

Este workflow verifica campanhas com agendamento cron e dispara automaticamente.

#### 3.1.1 Importar Workflow

1. Importe o arquivo: `fluxos-n8n/Disparador_Campanhas_Agendadas.json`
2. Abra o workflow importado

#### 3.1.2 Configurar URL do Webhook

1. Localize o nó **"Set Variables"**
2. Edite a variável **WEBHOOK_CAMPANHA_URL**:

```javascript
WEBHOOK_CAMPANHA_URL: https://seu-n8n.com/webhook/campanha
```

**Importante:** Use a mesma URL obtida no Passo 2.2!

#### 3.1.3 Configurar Outras Variáveis

No mesmo nó **"Set Variables"**, configure:

```javascript
//[seu-project-id].supabase.co
SUPABASE_URL: https: SUPABASE_SERVICE_KEY: [sua - service - role - key];
```

#### 3.1.4 Configurar Credenciais

- Configure a credencial **Supabase API** (mesma do Passo 1.4)

#### 3.1.5 Ativar Workflow

1. Clique no toggle **Active** para ativar
2. O workflow executará automaticamente às 8h30 em dias úteis

### 3.2 Continuar Execuções Pendentes

Este workflow continua execuções que foram pausadas (ex: campanhas grandes divididas em múltiplos dias).

#### 3.2.1 Importar Workflow

1. Importe o arquivo: `fluxos-n8n/Continuar_Execucoes_Pendentes.json`
2. Abra o workflow importado

#### 3.2.2 Configurar URL do Webhook

1. Localize o nó **"Set Variables"**
2. Edite a variável **WEBHOOK_CAMPANHA_URL**:

```javascript
WEBHOOK_CAMPANHA_URL: https://seu-n8n.com/webhook/campanha
```

**Importante:** Use a mesma URL obtida no Passo 2.2!

#### 3.2.3 Configurar Outras Variáveis

No mesmo nó **"Set Variables"**, configure:

```javascript
//[seu-project-id].supabase.co
SUPABASE_URL: https: SUPABASE_SERVICE_KEY: [sua - service - role - key];
```

#### 3.2.4 Configurar Credenciais

- Configure a credencial **Supabase API** (mesma do Passo 1.4)

#### 3.2.5 Ativar Workflow

1. Clique no toggle **Active** para ativar
2. O workflow executará automaticamente às 8h30 em dias úteis

## 🌐 Passo 4: Configurar Interface Web

A interface web permite disparar campanhas manualmente. Ela precisa da URL do webhook para funcionar.

### 4.1 Configurar via Interface

1. Abra `interface-web/index.html` no navegador
2. Configure a conexão com Supabase (URL e Anon Key)
3. Vá em **Configurações** (ícone de engrenagem)
4. No campo **"URL do Webhook N8N"**, cole a URL do webhook:

```text
https://seu-n8n.com/webhook/campanha
```

1. Clique em **Salvar**

### 4.2 Configurar via localStorage (Alternativa)

Se preferir configurar diretamente no código:

1. Abra o console do navegador (F12)
2. Execute:

```javascript
localStorage.setItem("n8nWebhookUrl", "https://seu-n8n.com/webhook/campanha");
```

### 4.3 Configurar via Arquivo de Configuração

Se você tem um arquivo `config.js`:

1. Edite `interface-web/config.js` (ou crie baseado em `config.example.js`)
2. Adicione:

```javascript
window.INSTACAR_CONFIG = {
  n8nWebhookUrl: "https://seu-n8n.com/webhook/campanha",
  // ... outras configurações
};
```

## ✅ Passo 5: Testar a Implementação

### 5.1 Teste 1: Disparo Manual via N8N

1. No workflow principal, clique em **Execute Workflow**
2. Selecione o trigger **Manual Trigger**
3. No campo de entrada, adicione:

```json
{
  "campanha_id": "uuid-de-uma-campanha-teste",
  "trigger_tipo": "manual"
}
```

4. Clique em **Execute Node**
5. Verifique se o workflow executa sem erros

### 5.2 Teste 2: Disparo via Webhook (curl)

```bash
curl -X POST https://seu-n8n.com/webhook/campanha \
  -H "Content-Type: application/json" \
  -d '{
    "campanha_id": "uuid-de-uma-campanha-teste",
    "trigger_tipo": "manual"
  }'
```

### 5.3 Teste 3: Disparo via Interface Web

1. Abra a interface web
2. Crie uma campanha de teste (ou use uma existente)
3. Clique em **Disparar** na campanha
4. Verifique se aparece mensagem de sucesso
5. Verifique no N8N se o workflow foi executado

### 5.4 Teste 4: Verificar Execução no Supabase

Execute no Supabase SQL Editor:

Execute no Supabase SQL Editor:

```sql
-- Verificar execução criada
SELECT
  e.*,
  c.nome as campanha_nome
FROM instacar_campanhas_execucoes e
JOIN instacar_campanhas c ON c.id = e.campanha_id
ORDER BY e.horario_inicio DESC
LIMIT 5;
```

## 🔍 Passo 6: Verificar Logs e Monitoramento

### 6.1 Logs do N8N

1. No N8N, vá em **Executions**
2. Verifique execuções recentes do workflow
3. Clique em uma execução para ver detalhes
4. Verifique se há erros nos nós

### 6.2 Logs do Supabase

Execute no Supabase SQL Editor:

```sql
-- Verificar erros críticos
SELECT
  tipo_erro,
  mensagem_erro,
  telefone,
  created_at
FROM instacar_erros_criticos
WHERE status = 'pendente'
ORDER BY created_at DESC
LIMIT 10;
```

### 6.3 Métricas de Execução

```sql
-- Verificar métricas de uma campanha
SELECT
  e.data_execucao,
  e.total_enviado,
  e.total_erros,
  e.total_duplicados,
  e.total_sem_whatsapp,
  e.status_execucao
FROM instacar_campanhas_execucoes e
WHERE e.campanha_id = 'uuid-da-campanha'
ORDER BY e.data_execucao DESC;
```

## 🐛 Troubleshooting

### Problema: Webhook não recebe requisições

**Soluções:**

1. Verifique se o workflow está **ativo**
2. Verifique se a URL do webhook está correta
3. Verifique se o N8N está acessível publicamente (se self-hosted, configure reverse proxy)
4. Verifique logs do N8N para erros

### Problema: Workflow auxiliar não chama o principal

**Soluções:**

1. Verifique se a variável `WEBHOOK_CAMPANHA_URL` está configurada corretamente
2. Verifique se o workflow principal está ativo
3. Teste a URL do webhook manualmente (curl)
4. Verifique logs do workflow auxiliar

### Problema: Interface web não dispara

**Soluções:**

1. Verifique se a URL do webhook está configurada na interface
2. Abra o console do navegador (F12) e verifique erros
3. Verifique se o CORS está configurado no N8N (se necessário)
4. Teste o webhook diretamente (curl)

### Problema: Erro de autenticação Supabase

**Soluções:**

1. Verifique se está usando **Service Role Key** (não Anon Key)
2. Verifique se a URL do Supabase está correta
3. Verifique se as credenciais estão configuradas corretamente no N8N

## 📝 Resumo das URLs a Configurar

| Local                    | Variável/Configuração          | Valor                                  |
| ------------------------ | ------------------------------ | -------------------------------------- |
| **Workflow Principal**   | Webhook URL (automático)       | `https://seu-n8n.com/webhook/campanha` |
| **Disparador Agendadas** | `WEBHOOK_CAMPANHA_URL`         | `https://seu-n8n.com/webhook/campanha` |
| **Continuar Execuções**  | `WEBHOOK_CAMPANHA_URL`         | `https://seu-n8n.com/webhook/campanha` |
| **Interface Web**        | `n8nWebhookUrl` (localStorage) | `https://seu-n8n.com/webhook/campanha` |

**Importante:** Todas as URLs devem apontar para o mesmo webhook do workflow principal!

## 🎯 Próximos Passos

Após configurar tudo:

1. ✅ Criar campanhas de teste no Supabase
2. ✅ Testar disparo manual
3. ✅ Testar disparo via interface web
4. ✅ Verificar execuções no Supabase
5. ✅ Configurar campanhas com agendamento cron
6. ✅ Monitorar execuções automáticas

## 📚 Documentação Relacionada

- [Guia de Criação de Campanhas](../campanhas/guia-criacao-campanhas.md)
- [Guia de Agente IA com Dados Opcionais](../campanhas/guia-agente-ia-opcoes.md)
- [Guia de Agendamento Cron](../campanhas/guia-agendamento-cron.md)
- [Troubleshooting N8N](../n8n/troubleshooting.md)

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Status:** Produção
