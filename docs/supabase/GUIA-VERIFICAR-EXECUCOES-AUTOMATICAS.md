# Guia: Verificar Execuções Automáticas de Campanhas

## Possíveis Causas de Execuções Automáticas

### 1. Workflow de Agendamento (Cron) Ativo

Existe um workflow `Disparador_Campanhas_Agendadas.json` que pode estar executando campanhas automaticamente.

**Como funciona:**
- O workflow tem um **Schedule Trigger** configurado para executar **todos os dias úteis às 8h30** (`0 30 8 * * 1-5`)
- Ele busca campanhas com `agendamento_cron` configurado
- Se encontrar campanhas cujo cron corresponde ao momento atual, dispara automaticamente

**Como verificar:**

1. **No N8N:**
   - Verifique se o workflow "Disparador Campanhas Agendadas" está **ativo**
   - Verifique as execuções recentes deste workflow
   - Se estiver ativo, ele pode estar disparando campanhas automaticamente

2. **No Supabase:**
   - Execute a query em `docs/supabase/verificar-campanhas-agendadas.sql`
   - Verifique se há campanhas com `agendamento_cron` configurado
   - Verifique execuções recentes com `trigger_tipo = 'cron'`

### 2. Campanhas com Agendamento Cron Configurado

Campanhas com o campo `agendamento_cron` preenchido podem ser executadas automaticamente.

**Como verificar:**

```sql
-- Verificar campanhas com agendamento cron
SELECT 
  id,
  nome,
  agendamento_cron,
  status,
  ativo
FROM instacar_campanhas
WHERE agendamento_cron IS NOT NULL
  AND agendamento_cron != ''
  AND status = 'ativa'
  AND ativo = true;
```

**Como desabilitar:**
- Remova o `agendamento_cron` da campanha:
  ```sql
  UPDATE instacar_campanhas
  SET agendamento_cron = NULL
  WHERE id = 'uuid-da-campanha';
  ```
- Ou desative a campanha:
  ```sql
  UPDATE instacar_campanhas
  SET ativo = false
  WHERE id = 'uuid-da-campanha';
  ```

### 3. Verificar Execuções Recentes

Para identificar execuções automáticas:

```sql
-- Execuções das últimas 24 horas com trigger tipo
SELECT 
  e.id,
  e.campanha_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.horario_inicio,
  e.trigger_tipo,  -- 'cron' = automático, 'manual' = manual
  e.status_execucao,
  e.total_enviado
FROM instacar_campanhas_execucoes e
LEFT JOIN instacar_campanhas c ON e.campanha_id = c.id
WHERE e.horario_inicio >= NOW() - INTERVAL '24 hours'
ORDER BY e.horario_inicio DESC;
```

**Identificação:**
- `trigger_tipo = 'cron'` → Execução automática (agendamento)
- `trigger_tipo = 'manual'` → Execução manual (você disparou)

## Soluções

### Desabilitar Execuções Automáticas

**Opção 1: Desativar o Workflow de Agendamento**
- No N8N, desative o workflow "Disparador Campanhas Agendadas"
- Isso impedirá todas as execuções automáticas

**Opção 2: Remover Agendamento das Campanhas**
- Execute a query para remover `agendamento_cron` de todas as campanhas:
  ```sql
  UPDATE instacar_campanhas
  SET agendamento_cron = NULL
  WHERE agendamento_cron IS NOT NULL;
  ```

**Opção 3: Desativar Campanhas Específicas**
- Desative apenas as campanhas que estão executando automaticamente:
  ```sql
  UPDATE instacar_campanhas
  SET ativo = false
  WHERE id IN ('uuid-1', 'uuid-2', ...);
  ```

## Prevenção

Para evitar execuções automáticas não desejadas:

1. **Sempre verifique** se campanhas têm `agendamento_cron` antes de ativá-las
2. **Desative o workflow** "Disparador Campanhas Agendadas" se não usar agendamento
3. **Monitore execuções** regularmente para identificar padrões

