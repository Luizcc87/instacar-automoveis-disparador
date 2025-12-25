# Guia de Testes: Continuação de Lotes via Webhook

## Objetivo

Validar que o sistema de continuação de lotes via webhook funciona corretamente, garantindo que:
- Cada lote é processado em uma execução separada
- O `lote_atual` é incrementado corretamente
- A tabela de execuções é atualizada adequadamente
- A dashboard reflete o progresso corretamente

## Pré-requisitos

1. N8N configurado e rodando
2. Supabase configurado com tabelas criadas
3. Webhook `/campanha` configurado e acessível
4. `n8n_webhook_url` configurado em `instacar_configuracoes_sistema`
5. Campanha de teste criada com pelo menos 150 clientes elegíveis (para testar múltiplos lotes)

## Cenários de Teste

### Teste 1: Processamento de Múltiplos Lotes

**Objetivo:** Validar que uma campanha com múltiplos lotes processa cada lote em execução separada.

**Passos:**
1. Criar campanha de teste com:
   - `tamanho_lote = 50`
   - Pelo menos 150 clientes elegíveis
   - `limite_envios_dia = 200`
2. Disparar campanha manualmente via interface web
3. Monitorar execuções no N8N
4. Verificar no Supabase que `lote_atual` está sendo incrementado

**Resultado Esperado:**
- ✅ Pelo menos 3 execuções são criadas (uma por lote)
- ✅ Cada execução processa aproximadamente 50 clientes
- ✅ `lote_atual` incrementa: 1 → 2 → 3
- ✅ `contatos_processados` aumenta progressivamente
- ✅ `contatos_pendentes` diminui progressivamente

**Query de Verificação:**
```sql
SELECT 
  id,
  lote_atual,
  contatos_processados,
  contatos_pendentes,
  total_contatos_elegiveis,
  status_execucao,
  horario_inicio,
  horario_fim
FROM instacar_campanhas_execucoes
WHERE campanha_id = 'uuid-da-campanha-teste'
  AND data_execucao = CURRENT_DATE
ORDER BY created_at DESC;
```

### Teste 2: Continuação via Webhook

**Objetivo:** Validar que o webhook é chamado corretamente para continuar o próximo lote.

**Passos:**
1. Executar Teste 1
2. Verificar logs do N8N para chamadas ao webhook
3. Verificar que cada chamada contém:
   - `execucao_id` válido
   - `continuar: true`
   - `trigger_tipo: "cron"`

**Resultado Esperado:**
- ✅ Logs mostram chamadas HTTP POST para o webhook
- ✅ Payload contém `continuar: true`
- ✅ Cada chamada gera nova execução no N8N
- ✅ Não há erros de conexão ou timeout

**Verificação nos Logs:**
```
[INFO] Preparar Chamada Próximo Lote - Execução: uuid-123, Webhook: https://...
[INFO] Chamar Próximo Lote (Webhook) - Status: 200
```

### Teste 3: Atualização de Lote Atual

**Objetivo:** Validar que `lote_atual` é incrementado antes de chamar o próximo lote.

**Passos:**
1. Executar Teste 1
2. Verificar no Supabase o histórico de atualizações de `lote_atual`
3. Comparar timestamps de atualização com chamadas ao webhook

**Resultado Esperado:**
- ✅ `lote_atual` é incrementado ANTES da chamada ao webhook
- ✅ Cada incremento corresponde a um novo lote
- ✅ Não há saltos ou duplicações no `lote_atual`

**Query de Verificação:**
```sql
-- Verificar histórico de atualizações (se tiver trigger de auditoria)
SELECT 
  lote_atual,
  updated_at,
  contatos_processados
FROM instacar_campanhas_execucoes
WHERE campanha_id = 'uuid-da-campanha-teste'
  AND data_execucao = CURRENT_DATE
ORDER BY updated_at ASC;
```

### Teste 4: Finalização de Campanha

**Objetivo:** Validar que quando todos os lotes são processados, a execução é marcada como concluída.

**Passos:**
1. Criar campanha de teste com exatamente 50 clientes elegíveis (1 lote)
2. Disparar campanha
3. Aguardar processamento completo
4. Verificar status no Supabase

**Resultado Esperado:**
- ✅ `status_execucao = 'concluida'`
- ✅ `contatos_pendentes = 0`
- ✅ `contatos_processados = total_contatos_elegiveis`
- ✅ `horario_fim` está preenchido
- ✅ Webhook **NÃO** é chamado (não há mais pendentes)

**Query de Verificação:**
```sql
SELECT 
  status_execucao,
  contatos_processados,
  contatos_pendentes,
  total_contatos_elegiveis,
  horario_fim
FROM instacar_campanhas_execucoes
WHERE campanha_id = 'uuid-da-campanha-teste'
  AND data_execucao = CURRENT_DATE;
```

### Teste 5: Pausa e Retomada

**Objetivo:** Validar que execuções pausadas podem ser retomadas corretamente.

**Passos:**
1. Criar campanha com múltiplos lotes
2. Disparar campanha
3. Pausar execução manualmente via dashboard (ou aguardar pausa automática por limite)
4. Verificar que `status_execucao = 'pausada'`
5. Retomar execução via dashboard
6. Verificar que o próximo lote é processado

**Resultado Esperado:**
- ✅ Execução é pausada corretamente
- ✅ `status_execucao = 'pausada'`
- ✅ Ao retomar, próximo lote é processado
- ✅ `lote_atual` continua de onde parou (não reinicia)

### Teste 6: Dashboard de Progresso

**Objetivo:** Validar que a dashboard exibe corretamente o progresso de lotes.

**Passos:**
1. Executar campanha com múltiplos lotes
2. Abrir dashboard da campanha
3. Verificar exibição de:
   - Lote atual
   - Progresso (percentual)
   - Contatos processados/pendentes
   - Status da execução

**Resultado Esperado:**
- ✅ Dashboard mostra `lote_atual` correto
- ✅ Progresso é calculado corretamente
- ✅ Métricas são atualizadas em tempo real (polling)
- ✅ Status reflete o estado atual da execução

## Checklist de Validação

### Workflow N8N
- [ ] Nó "Atualizar Lote Atual" incrementa `lote_atual` corretamente
- [ ] Nó "HTTP Atualizar Lote Atual" atualiza o Supabase sem erros
- [ ] Nó "Preparar Chamada Próximo Lote" gera payload correto
- [ ] Nó "Chamar Próximo Lote (Webhook)" chama o webhook sem erros
- [ ] Fluxo não entra em loop infinito
- [ ] Cada lote é processado em execução separada

### Banco de Dados
- [ ] `lote_atual` é incrementado corretamente
- [ ] `contatos_processados` aumenta progressivamente
- [ ] `contatos_pendentes` diminui progressivamente
- [ ] `status_execucao` muda para `concluida` quando apropriado
- [ ] `horario_fim` é preenchido quando campanha conclui

### Dashboard
- [ ] Exibe `lote_atual` corretamente
- [ ] Calcula progresso corretamente
- [ ] Atualiza métricas em tempo real
- [ ] Status reflete estado atual

## Problemas Conhecidos e Soluções

### Problema: Lote não incrementa

**Causa Possível:** Nó "Atualizar Lote Atual" não está sendo executado

**Solução:**
1. Verificar se "IF Tem Pendentes" está retornando `true`
2. Verificar logs do N8N para erros
3. Verificar se `execucao_id` está presente nos dados

### Problema: Webhook não é chamado

**Causa Possível:** `n8n_webhook_url` não está configurado

**Solução:**
1. Verificar configuração em `instacar_configuracoes_sistema`
2. Verificar se URL está acessível
3. Verificar logs do N8N para erros de conexão

### Problema: Múltiplas execuções simultâneas causam conflito

**Causa Possível:** Race condition ao atualizar `lote_atual`

**Solução:**
1. Verificar se atualização é atômica (PATCH com `id=eq.`)
2. Considerar usar transação ou lock se necessário
3. Verificar se há constraint de unicidade violada

## Métricas de Sucesso

- ✅ Taxa de sucesso de continuação de lotes: > 95%
- ✅ Tempo médio entre lotes: < 5 segundos
- ✅ Precisão de `lote_atual`: 100%
- ✅ Precisão de `contatos_pendentes`: 100%

## Próximos Passos Após Testes

1. Documentar problemas encontrados
2. Implementar correções necessárias
3. Re-executar testes
4. Deploy em produção
5. Monitorar execuções reais

