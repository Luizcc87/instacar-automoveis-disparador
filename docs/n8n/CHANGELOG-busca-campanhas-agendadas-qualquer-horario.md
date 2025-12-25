# Changelog: Busca de Campanhas Agendadas em Qualquer Horário

**Data:** 2025-12-22  
**Versão:** 2.7  
**Workflow:** `Disparador_Web_Campanhas_Instacar.json`

## Resumo

Modificação do workflow para buscar e executar campanhas agendadas em **qualquer horário**, respeitando apenas o `agendamento_cron` configurado na interface web. O horário comercial fixo (9h-18h) não bloqueia mais campanhas agendadas.

## Problema Anterior

1. O Schedule Trigger executava a cada 30 minutos
2. Quando executava, verificava se estava dentro do horário comercial (9h-18h)
3. Se estivesse fora do horário, **pulava a execução** mesmo que houvesse campanhas agendadas
4. O workflow **nunca buscava** campanhas com `agendamento_cron` configurado

## Solução Implementada

### Novos Nós Adicionados

1. **"Buscar Campanhas Agendadas"** (Supabase - GetAll)
   - Busca campanhas com `status = 'ativa'`, `ativo = true` e `agendamento_cron IS NOT NULL`
   - Executa quando `buscarCampanhasAgendadas = true` (Schedule Trigger)

2. **"Filtrar Campanhas para Executar"** (Code - JavaScript)
   - Verifica se o `agendamento_cron` corresponde ao horário atual
   - Valida período da campanha (data_inicio/data_fim)
   - Retorna campanhas que devem executar agora

3. **"IF Tem Campanha Agendada"** (IF)
   - Verifica se encontrou campanhas agendadas
   - Se TRUE: vai direto para "Obter Campanha" (pula verificação de horário comercial)
   - Se FALSE: vai para "Verificar Horário e Dia Útil" (fluxo normal)

4. **"Verificar Campanha Já Existe"** (Code - JavaScript)
   - Verifica se a campanha já está no payload (vindo de campanha agendada)
   - Se sim, retorna direto sem buscar no Supabase novamente

### Nós Modificados

1. **"Verificar Horário e Dia Útil"** (Code - JavaScript)
   - **ANTES:** Bloqueava execução se estivesse fora do horário comercial (9h-18h)
   - **DEPOIS:** Permite execução se for campanha agendada (`campanhaAgendada = true`)
   - Mantém verificação de horário comercial apenas para campanhas sem cron

### Fluxo Atualizado

**Fluxo Anterior (INCORRETO):**
```
Schedule Trigger (30min)
    ↓
Validar Payload → buscarCampanhasAgendadas: true
    ↓
IF Buscar Campanhas Agendadas (TRUE)
    ↓
Verificar Horário e Dia Útil
    ↓
[Se fora 9h-18h] → pularExecucao: true → NÃO FAZ NADA
```

**Fluxo Novo (CORRETO):**
```
Schedule Trigger (30min)
    ↓
Validar Payload → buscarCampanhasAgendadas: true
    ↓
IF Buscar Campanhas Agendadas (TRUE)
    ↓
Buscar Campanhas Agendadas (Supabase)
    ↓
Filtrar Campanhas para Executar (verifica cron)
    ↓
IF Tem Campanha Agendada
    ├─ TRUE → Obter Campanha → [Executa campanha]
    └─ FALSE → Verificar Horário e Dia Útil → [Fluxo normal]
```

## Comportamento

### Campanhas com `agendamento_cron` configurado

- ✅ Executam em **qualquer horário** se o cron corresponder
- ✅ Não são bloqueadas pelo horário comercial (9h-18h)
- ✅ Respeitam apenas o `agendamento_cron` e período (data_inicio/data_fim)

### Campanhas sem `agendamento_cron` (null)

- ✅ Continuam respeitando horário comercial (9h-18h)
- ✅ Executam apenas em dias úteis (segunda a sexta)
- ✅ Comportamento mantido igual ao anterior

## Exemplos de Uso

### Exemplo 1: Campanha às 4:00 da manhã

**Configuração na Interface Web:**
- `agendamento_cron`: `0 4 * * *` (todos os dias às 4:00)
- `data_inicio`: `2025-12-22`
- `data_fim`: `2025-12-22`

**Resultado:**
- ✅ Executa às 4:00 mesmo fora do horário comercial
- ✅ Não é bloqueada pela verificação de horário

### Exemplo 2: Campanha apenas dias úteis às 6:00

**Configuração na Interface Web:**
- `agendamento_cron`: `0 6 * * 1-5` (segunda a sexta às 6:00)
- `data_inicio`: `2025-12-21`
- `data_fim`: `2025-12-25`

**Resultado:**
- ✅ Executa às 6:00 apenas em dias úteis
- ✅ Não executa no fim de semana (definido no cron)

### Exemplo 3: Campanha sem cron (comportamento antigo)

**Configuração na Interface Web:**
- `agendamento_cron`: `null`
- Execução manual ou via webhook

**Resultado:**
- ✅ Respeita horário comercial (9h-18h)
- ✅ Executa apenas em dias úteis
- ✅ Comportamento mantido igual ao anterior

## Verificação

Para verificar se uma campanha tem cron configurado:

```sql
SELECT 
  id,
  nome,
  agendamento_cron,
  status,
  ativo,
  data_inicio,
  data_fim
FROM instacar_campanhas
WHERE status = 'ativa' 
  AND ativo = TRUE
  AND agendamento_cron IS NOT NULL;
```

## Notas Importantes

1. **Schedule Trigger:** O workflow principal tem um Schedule Trigger configurado para executar a cada 30 minutos. Isso permite verificar campanhas agendadas frequentemente.

2. **Múltiplas Campanhas:** Se houver múltiplas campanhas agendadas para o mesmo horário, todas serão executadas (uma por vez).

3. **Validação de Período:** Campanhas agendadas ainda respeitam `data_inicio` e `data_fim`. Se estiver fora do período, não executam.

4. **Compatibilidade:** Campanhas sem `agendamento_cron` continuam funcionando normalmente, respeitando horário comercial.

## Troubleshooting

### Campanha não executa no horário agendado

1. Verifique se `agendamento_cron` está configurado:
   ```sql
   SELECT agendamento_cron FROM instacar_campanhas WHERE id = 'uuid-da-campanha';
   ```

2. Verifique se o cron está correto:
   - Formato: `minuto hora dia-mes mês dia-semana`
   - Exemplo: `0 4 * * *` = todos os dias às 4:00

3. Verifique se está dentro do período:
   ```sql
   SELECT data_inicio, data_fim FROM instacar_campanhas WHERE id = 'uuid-da-campanha';
   ```

4. Verifique logs do N8N na execução do Schedule Trigger

### Campanha executa fora do horário esperado

1. Verifique o timezone do servidor N8N
2. Verifique se o cron está usando o horário correto
3. Verifique se há múltiplas campanhas com cron similar

## Arquivos Modificados

- `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`

## Migração

Nenhuma migração de banco de dados necessária. Apenas atualize o workflow no N8N importando o novo JSON.

