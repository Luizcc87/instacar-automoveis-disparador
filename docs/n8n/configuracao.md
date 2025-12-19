# 📘 Guia de Configuração N8N - Instacar Automóveis Disparador

Guia passo a passo para configurar o workflow de disparo escalonado no N8N.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Conta N8N (self-hosted ou cloud)
- ✅ Projeto Supabase criado e configurado
- ✅ Conta Uazapi com instância WhatsApp ativa
- ✅ Conta OpenAI com API key
- ✅ Google Sheets com dados dos clientes
- ✅ Acesso às planilhas do Google Sheets

## 🚀 Passo 1: Configurar Variáveis no Workflow

> **⚠️ IMPORTANTE**: Se você usa N8N self-hosted free (sem Environment Variables), configure diretamente no nó "Set Variables - CONFIGURAR AQUI" do workflow.

### 1.1 Para N8N Self-Hosted Free (Sem Environment Variables)

1. **Importe o workflow** no N8N
2. **Abra o nó "Set Variables - CONFIGURAR AQUI"** (primeiro nó após o trigger)
3. **Edite cada variável** com seus valores reais:

#### Configurações Obrigatórias

**SUPABASE_URL**

- Valor: `https://[seu-project-id].supabase.co`
- Exemplo: `https://abcdefghijklmnop.supabase.co`

**SUPABASE_SERVICE_KEY**

- Valor: Sua Service Role Key do Supabase
- ⚠️ **MANTENHA SECRETO** - Esta chave tem acesso total ao banco!

**UAZAPI_BASE_URL**

- Valor: `https://[subdomain].uazapi.com`
- Exemplo: `https://fourtakeoff.uazapi.com`

**UAZAPI_TOKEN**

- Valor: Token da sua instância Uazapi
- ⚠️ **MANTENHA SECRETO**

**SHEET_IDS**

- Valor: Array JSON com IDs das 9 planilhas
- Formato: `["id1","id2","id3","id4","id5","id6","id7","id8","id9"]`
- Exemplo: `["1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g","outro-id","..."]`

**SHEET_PAGE_NAME**

- Valor: Nome da aba/planilha (geralmente `Sheet1`)

#### Configurações Opcionais (com valores padrão)

**OPENAI_MODEL**

- Valor: `gpt-4` ou `gpt-3.5-turbo`
- Padrão: `gpt-4`

**LIMITE_ENVIOS_DIA**

- Valor: `200` (máximo de envios por dia)
- Padrão: `200`

**LIMITE_ENVIOS_WARMUP**

- Valor: `50` (envios durante warm-up period)
- Padrão: `50`

**INTERVALO_BASE**

- Valor: `130` (segundos base entre envios)
- Padrão: `130`

**INTERVALO_VARIACAO**

- Valor: `20` (variação randomizada em segundos)
- Padrão: `20`

### 1.2 Para N8N Cloud ou Self-Hosted com Environment Variables

Se você tem acesso a Environment Variables:

1. No N8N, vá em **Settings** (⚙️)
2. Clique em **Environment Variables**
3. Adicione as variáveis conforme seção acima
4. O workflow usará automaticamente `{{ $env.VARIAVEL }}`

### 1.3 Verificar Configuração

Após configurar, verifique:

- ✅ Todos os valores estão preenchidos (não deixe placeholders)
- ✅ URLs estão corretas (sem espaços extras)
- ✅ SHEET_IDS está em formato JSON válido
- ✅ Tokens/Keys estão corretos

## 🔐 Passo 2: Configurar Credenciais

### 2.1 Google Sheets OAuth2

1. Vá em **Credentials** (no menu lateral do N8N)
2. Clique em **Add Credential**
3. Selecione **Google Sheets OAuth2 API**
4. Siga o fluxo de autenticação do Google
5. Dê um nome: "Google Sheets - Instacar"
6. Salve

**Importante**: Após criar a credencial, configure no nó "Read Google Sheets" do workflow.

### 2.2 Supabase (HTTP Request)

O Supabase será acessado via HTTP Request usando a Service Key configurada no nó "Set Variables - CONFIGURAR AQUI". Não precisa de credencial separada.

### 2.3 OpenAI

1. Vá em **Credentials**
2. Clique em **Add Credential**
3. Selecione **OpenAI API**
4. Cole sua API Key
5. Dê um nome: "OpenAI - Instacar"
6. Salve

**Importante**: Após criar a credencial, configure no nó "OpenAI Chat Model" do workflow.

## 📥 Passo 3: Importar Workflow

### 3.1 Importar Arquivo

1. Vá em **Workflows**
2. Clique em **Import from File**
3. Selecione: `fluxos-n8n/Disparador_Instacar_Escalonado_Supabase.json`
4. Clique em **Import**

### 3.2 Verificar Importação

Após importar, verifique:

- ✅ Todos os nós estão presentes
- ✅ Conexões entre nós estão corretas
- ✅ Nenhum erro de configuração

## ⚙️ Passo 4: Configurar Nós do Workflow

### 4.1 Nó: Set Variables - CONFIGURAR AQUI

1. Abra o nó **Set Variables - CONFIGURAR AQUI**
2. **Edite cada variável** com seus valores reais:
   - Substitua `SEU-PROJECT-ID` pela URL real do Supabase
   - Substitua `SUA-SERVICE-ROLE-KEY-AQUI` pela Service Key real
   - Substitua `SEU-SUBDOMAIN` pela URL real da Uazapi
   - Substitua `SEU-TOKEN-UAZAPI-AQUI` pelo token real
   - Substitua os IDs das planilhas no array `SHEET_IDS`
3. **⚠️ IMPORTANTE**:
   - Não deixe valores placeholder (ex: `SEU-PROJECT-ID`)
   - Use valores reais e válidos
   - Mantenha formato JSON válido para `SHEET_IDS`

### 4.2 Nó: Google Sheets - Read Rows

1. Abra o nó **Get row(s) in sheet**
2. Selecione a credencial do Google Sheets
3. Configure:
   - **Document ID**: Use variável `{{ $env.SHEET_ID_X }}`
   - **Sheet Name**: Use variável `{{ $env.SHEET_PAGE_NAME }}`
4. Teste a conexão

### 4.3 Nós: Supabase (Nativos)

O workflow usa **nós nativos do Supabase** (não HTTP Request):

1. **Crie credencial Supabase** (veja Passo 2.2)
2. **Configure cada nó Supabase**:
   - Abra o nó (ex: "Supabase - Verificar Cliente")
   - Selecione a credencial criada
   - Verifique operação e tabela estão corretas
   - Filtros são configurados automaticamente

**Nós Supabase no workflow:**
- Supabase - Verificar Cliente (getAll)
- Supabase - Upsert Cliente (upsert)
- Supabase - Registrar Histórico (insert)
- Supabase - Verificar Limite Diário (getAll)
- Supabase - Atualizar Controle (upsert)

### 4.4 Nó: HTTP Request - Uazapi Check WhatsApp

1. Abra o nó **HTTP Request - Check WhatsApp**
2. Configure:
   - **Method**: POST
   - **URL**: `{{ $env.UAZAPI_BASE_URL }}/chat/check`
   - **Headers**:
     ```
     token: {{ $env.UAZAPI_TOKEN }}
     Accept: application/json
     ```
   - **Body** (JSON):
     ```json
     {
       "numbers": ["{{ $json.numeroFormatado }}"]
     }
     ```

### 4.5 Nó: AI Agent (OpenAI)

1. Abra o nó **AI Agent**
2. Configure:
   - **Model**: Selecione a credencial OpenAI ou use `{{ $env.OPENAI_MODEL }}`
   - **System Message**: (já configurado no workflow)
   - **Prompt**: (já configurado)
3. Conecte ao nó **OpenAI Chat Model**

### 4.6 Nó: HTTP Request - Enviar Mensagem Uazapi

1. Abra o nó **Envia Mensagem Uazapi**
2. Configure:
   - **Method**: POST
   - **URL**: `{{ $env.UAZAPI_BASE_URL }}/send/text`
   - **Headers**:
     ```
     token: {{ $env.UAZAPI_TOKEN }}
     Accept: application/json
     ```
   - **Body** (form-data ou JSON):
     ```
     number: {{ $json.numeroFormatado }}
     text: {{ $json.mensagem_gerada }}
     delay: 1000
     ```

## 🧪 Passo 5: Testar Workflow

### 5.1 Teste Manual

1. Clique em **Execute Workflow** (botão play)
2. Observe a execução passo a passo
3. Verifique logs de cada nó
4. Confirme que dados estão fluindo corretamente

### 5.2 Teste com Dados Reais (Pequeno Lote)

1. Limite o processamento para 1-2 linhas
2. Execute o workflow
3. Verifique:
   - ✅ Duplicatas estão sendo detectadas
   - ✅ WhatsApp está sendo verificado
   - ✅ Mensagem está sendo gerada
   - ✅ Envio está funcionando
   - ✅ Histórico está sendo salvo

### 5.3 Verificar Supabase

Execute queries no Supabase para confirmar:

```sql
-- Verificar clientes criados
SELECT * FROM instacar_clientes_envios LIMIT 5;

-- Verificar histórico
SELECT * FROM instacar_historico_envios LIMIT 5;

-- Verificar controle diário
SELECT * FROM instacar_controle_envios WHERE data = CURRENT_DATE;
```

## ⏰ Passo 6: Configurar Agendamento (Opcional)

### 6.1 Schedule Trigger

1. Abra o nó **Schedule Trigger**
2. Configure:
   - **Trigger Times**: `0 9 * * 1-5` (9h, dias úteis)
   - **Timezone**: `America/Sao_Paulo`
3. Ative o workflow

### 6.2 Verificar Agendamento

- Workflow deve executar automaticamente
- Verifique logs após primeira execução agendada

## 🔍 Passo 7: Monitoramento

### 7.1 Logs do N8N

- Acesse **Executions** para ver histórico
- Filtre por status (Success, Error, Waiting)
- Analise erros se houver

### 7.2 Métricas no Supabase

Execute queries para monitorar:

```sql
-- Estatísticas do dia
SELECT
  total_enviado,
  total_erros,
  total_duplicados,
  total_sem_whatsapp
FROM instacar_controle_envios
WHERE data = CURRENT_DATE;

-- Taxa de sucesso
SELECT
  COUNT(*) FILTER (WHERE status_envio = 'enviado') * 100.0 / COUNT(*) as taxa_sucesso
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE;
```

## ⚠️ Problemas Comuns

### Erro: "Variable not found"

**Solução**: Verifique se variável está configurada em Environment Variables e use `{{ $env.VARIAVEL }}`

### Erro: "Authentication failed"

**Solução**: Verifique tokens/credenciais e se estão corretos

### Erro: "Table does not exist"

**Solução**: Execute `schema.sql` no Supabase

### Erro: "Permission denied"

**Solução**: Verifique RLS policies e se está usando Service Role Key

## 📚 Próximos Passos

Após configuração:

1. ✅ Testar com pequeno lote (5-10 envios)
2. ✅ Monitorar primeiras execuções
3. ✅ Validar duplicatas
4. ✅ Confirmar histórico
5. ✅ Ajustar intervalos se necessário

## 🆘 Suporte

Se encontrar problemas:

1. Consulte [Troubleshooting](troubleshooting.md)
2. Verifique logs no N8N
3. Analise erros no Supabase (`instacar_erros_criticos`)
4. Revise documentação de cada serviço

---

**Última atualização**: 2025-01-24  
**Versão do Workflow**: 2.0
