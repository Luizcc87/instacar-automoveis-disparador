# 🔧 Troubleshooting - Instacar Automóveis Disparador

Guia de resolução de problemas comuns no sistema de disparo escalonado.

## 🔍 Problemas de Conexão

### Erro: "Cannot connect to Supabase"

**Sintomas:**
- Workflow falha ao consultar Supabase
- Erro 401 (Unauthorized) ou 404 (Not Found)

**Soluções:**
1. Verifique `SUPABASE_URL` nas variáveis de ambiente
   - Formato correto: `https://[project-id].supabase.co`
   - Sem barra no final
2. Verifique `SUPABASE_SERVICE_KEY`
   - Deve ser a **service_role key** (não anon key)
   - Encontre em: Supabase Dashboard > Settings > API
3. Verifique headers no nó HTTP Request:
   ```
   apikey: {{ $env.SUPABASE_SERVICE_KEY }}
   Authorization: Bearer {{ $env.SUPABASE_SERVICE_KEY }}
   ```
4. Teste conexão manual:
   ```bash
   curl -H "apikey: [key]" \
        -H "Authorization: Bearer [key]" \
        https://[project-id].supabase.co/rest/v1/instacar_clientes_envios
   ```

### Erro: "Cannot connect to Uazapi"

**Sintomas:**
- Falha ao verificar WhatsApp ou enviar mensagem
- Erro 401 ou 403

**Soluções:**
1. Verifique `UAZAPI_BASE_URL`
   - Formato: `https://[subdomain].uazapi.com`
2. Verifique `UAZAPI_TOKEN`
   - Token da instância (não admin token)
3. Verifique se instância está conectada:
   - Dashboard Uazapi > Instâncias > Status deve ser "connected"
4. Teste endpoint manualmente:
   ```bash
   curl -H "token: [token]" \
        -X POST https://[subdomain].uazapi.com/chat/check \
        -d '{"numbers":["5511999999999"]}'
   ```

### Erro: "OpenAI API error"

**Sintomas:**
- Falha ao gerar mensagem com IA
- Erro 401 ou rate limit

**Soluções:**
1. Verifique `OPENAI_API_KEY`
   - Formato: `sk-...`
   - Deve estar ativa e com créditos
2. Verifique `OPENAI_MODEL`
   - Deve ser `gpt-4` ou `gpt-3.5-turbo`
3. Verifique rate limits:
   - Dashboard OpenAI > Usage
   - Aguarde se atingiu limite
4. Sistema usa fallback para template genérico se IA falhar

## 📊 Problemas de Dados

### Erro: "Table does not exist"

**Sintomas:**
- Erro ao consultar tabelas do Supabase
- Erro 404 ou "relation does not exist"

**Soluções:**
1. Execute `schema.sql` no Supabase:
   - SQL Editor > Cole conteúdo de `docs/supabase/schema.sql`
   - Execute
2. Verifique nome da tabela:
   - Deve ser `instacar_clientes_envios` (não `clientes_envios`)
3. Verifique se está no schema correto:
   - Use `public.instacar_clientes_envios` se necessário

### Erro: "Permission denied" no Supabase

**Sintomas:**
- Erro 403 ao ler/escrever no Supabase
- "Row Level Security policy violation"

**Soluções:**
1. Verifique se está usando **Service Role Key**:
   - Não use anon key
   - Service key bypassa RLS
2. Execute `policies.sql` no Supabase:
   - SQL Editor > Cole conteúdo de `docs/supabase/policies.sql`
   - Execute
3. Verifique políticas RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename LIKE 'instacar_%';
   ```

### Erro: "Invalid phone number format"

**Sintomas:**
- Telefones não estão sendo normalizados
- Erro ao verificar WhatsApp

**Soluções:**
1. Verifique nó "Code - Normalizar Telefones":
   - Deve remover caracteres especiais
   - Deve adicionar DDI 55
   - Formato final: `55XXXXXXXXXXX`
2. Verifique colunas na planilha:
   - Deve ter "Celular" ou "Residencial"
   - Valores não podem estar vazios
3. Teste normalização manual:
   ```javascript
   const numero = "11999999999";
   const formatado = `55${numero.replace(/\D/g, '')}`;
   // Resultado: 5511999999999
   ```

## 🔄 Problemas de Processamento

### Workflow não processa todas as linhas

**Sintomas:**
- Apenas algumas linhas são processadas
- Workflow para antes do fim

**Soluções:**
1. Verifique limite diário:
   - Tabela `instacar_controle_envios`
   - Se `total_enviado >= 200`, workflow para
2. Verifique horário:
   - Workflow só roda 9h-18h (horário comercial)
   - Verifique se é dia útil
3. Verifique erros:
   - Analise logs do N8N
   - Verifique `instacar_erros_criticos` no Supabase
4. Verifique timeout:
   - Workflows longos podem ter timeout
   - Considere processar em lotes menores

### Duplicatas estão sendo enviadas

**Sintomas:**
- Cliente recebe múltiplas mensagens
- `total_envios` não está sendo verificado

**Soluções:**
1. Verifique consulta no Supabase:
   ```sql
   -- Deve retornar cliente se existe
   SELECT * FROM instacar_clientes_envios 
   WHERE telefone = '55XXXXXXXXXXX';
   ```
2. Verifique lógica no nó "IF - Cliente Já Recebeu?":
   - Deve verificar `total_envios > 0`
   - Se verdadeiro, deve pular envio
3. Verifique se telefone está normalizado:
   - Mesmo formato em todas as consultas
   - `55XXXXXXXXXXX` (sem espaços, caracteres especiais)
4. Teste manual:
   ```sql
   -- Verificar se cliente existe e já recebeu
   SELECT telefone, total_envios 
   FROM instacar_clientes_envios 
   WHERE telefone = '55XXXXXXXXXXX' 
     AND total_envios > 0;
   ```

### Mensagens não estão sendo enviadas

**Sintomas:**
- Workflow executa mas não envia mensagens
- Status fica "pendente"

**Soluções:**
1. Verifique limite diário:
   - Se atingiu 200, workflow para
   - Verifique `instacar_controle_envios`
2. Verifique horário comercial:
   - 9h-18h apenas
   - Dias úteis apenas
3. Verifique validação WhatsApp:
   - Se número não tem WhatsApp, não envia
   - Verifique `status_whatsapp` no Supabase
4. Verifique erros:
   - Analise logs do nó "Envia Mensagem Uazapi"
   - Verifique resposta da API Uazapi
5. Verifique instância Uazapi:
   - Deve estar "connected"
   - Verifique no dashboard Uazapi

## ⏱️ Problemas de Escalonamento

### Intervalos não estão sendo respeitados

**Sintomas:**
- Mensagens enviadas muito rápido
- Bloqueio por spam

**Soluções:**
1. Verifique nó "Wait - Intervalo Entre Envios":
   - Deve aguardar 130-150 segundos
   - Verifique cálculo: `130 + random(0-20)`
2. Verifique se wait está funcionando:
   - Nó deve estar ativo (não desabilitado)
   - Verifique logs de execução
3. Ajuste intervalo se necessário:
   - Aumente `INTERVALO_ENVIO_BASE` se muito rápido
   - Aumente `INTERVALO_ENVIO_VARIACAO` para mais randomização

### Limite diário não está funcionando

**Sintomas:**
- Mais de 200 envios em um dia
- Contador não para o workflow

**Soluções:**
1. Verifique nó "Verificar Limite Diário":
   - Deve consultar `instacar_controle_envios`
   - Deve verificar `total_enviado >= 200`
2. Verifique atualização do contador:
   - Deve incrementar após cada envio
   - Verifique query de UPDATE
3. Verifique data:
   - Deve usar `CURRENT_DATE` (não timestamp)
   - Verifique timezone
4. Teste manual:
   ```sql
   -- Verificar contador do dia
   SELECT total_enviado 
   FROM instacar_controle_envios 
   WHERE data = CURRENT_DATE;
   ```

## 🐛 Erros Específicos

### Erro: "Circuit breaker activated"

**Sintomas:**
- Workflow pausa por 5 minutos
- Taxa de erro > 50%

**Soluções:**
1. Aguarde 5 minutos (circuit breaker)
2. Verifique qual API está falhando:
   - Uazapi, OpenAI, Supabase ou Google Sheets
3. Verifique status dos serviços:
   - Dashboard de cada serviço
   - Status pages
4. Verifique rate limits:
   - Pode ter atingido limite de requisições
5. Após pausa, workflow retoma automaticamente

### Erro: "Dead letter queue"

**Sintomas:**
- Erros críticos sendo registrados
- Tabela `instacar_erros_criticos` com registros

**Soluções:**
1. Consulte erros críticos:
   ```sql
   SELECT * FROM instacar_erros_criticos 
   WHERE status = 'pendente' 
   ORDER BY created_at DESC;
   ```
2. Analise tipo de erro:
   - `uazapi`, `openai`, `supabase`, `sheets`
3. Corrija causa raiz:
   - Tokens inválidos
   - Serviço offline
   - Dados malformados
4. Reprocesse se necessário:
   - Atualize `status = 'processado'`
   - Ou delete registro se ignorado

## 📈 Monitoramento e Diagnóstico

### Queries Úteis para Diagnóstico

```sql
-- Estatísticas do dia
SELECT * FROM instacar_controle_envios 
WHERE data = CURRENT_DATE;

-- Últimos envios
SELECT * FROM instacar_historico_envios 
ORDER BY timestamp_envio DESC 
LIMIT 10;

-- Clientes com mais envios
SELECT telefone, nome_cliente, total_envios 
FROM instacar_clientes_envios 
WHERE total_envios > 0 
ORDER BY total_envios DESC 
LIMIT 10;

-- Erros do dia
SELECT * FROM instacar_erros_criticos 
WHERE created_at >= CURRENT_DATE 
ORDER BY created_at DESC;
```

### Logs do N8N

1. Acesse **Executions** no N8N
2. Filtre por status (Error, Success)
3. Abra execução específica
4. Analise cada nó:
   - Input/Output
   - Erros
   - Tempo de execução

## 🆘 Ainda com Problemas?

1. **Documente o problema:**
   - Screenshot do erro
   - Logs relevantes
   - Passos para reproduzir

2. **Verifique documentação:**
   - [Configuração](configuracao.md)
   - [Supabase README](../supabase/README.md)
   - [Documentação Uazapi](../uazapi/)

3. **Analise logs:**
   - N8N Executions
   - Supabase `instacar_erros_criticos`
   - Logs de cada serviço

4. **Teste isoladamente:**
   - Teste cada integração separadamente
   - Valide credenciais individualmente
   - Verifique dados de entrada

---

**Última atualização**: 2025-01-24  
**Versão**: 2.0

