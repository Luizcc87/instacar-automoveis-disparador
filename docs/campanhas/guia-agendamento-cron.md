# Guia: Agendamento Automático de Campanhas (Cron)

Este guia explica como configurar o agendamento automático de campanhas usando Schedule Triggers no N8N.

## Opções de Agendamento

### Opção 1: Workflow por Campanha (Recomendado)

Cada campanha tem seu próprio workflow com Schedule Trigger configurado.

**Vantagens:**

- Controle individual por campanha
- Fácil ativar/desativar campanha específica
- Agendamentos diferentes por campanha

**Como configurar:**

1. No N8N, crie um novo workflow para cada campanha
2. Configure o Schedule Trigger:

   - **Trigger Interval**: Cron Expression
   - **Cron Expression**: Use o valor de `agendamento_cron` da campanha
   - **Timezone**: America/Sao_Paulo (ou seu timezone)

3. Adicione um nó "Set Variables" logo após o trigger:

   ```javascript
   {
     "CAMPANHA_ID": "uuid-da-campanha-aqui"
   }
   ```

4. Conecte ao workflow principal de campanhas (ou duplique o workflow)

### Opção 2: Workflow Centralizado

Um único workflow verifica campanhas ativas e as executa automaticamente.

**Vantagens:**

- Um único workflow para gerenciar
- Fácil adicionar novas campanhas sem criar workflows

**Como configurar:**

1. Crie um workflow com Schedule Trigger diário (ex: toda segunda-feira às 9h)
2. Adicione nó "Supabase - Get All" para buscar campanhas ativas:

   - **Tabela**: `instacar_campanhas`
   - **Filtro**: `status = 'ativa' AND ativo = true AND agendamento_cron IS NOT NULL`
   - **Filtro adicional**: Verificar se hoje está dentro do período (data_inicio <= hoje <= data_fim)

3. Para cada campanha encontrada:
   - Verificar se já foi executada hoje
   - Se não, executar workflow de campanha

## Expressões Cron Comuns

### Formato Cron

```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── dia do mês (1 - 31)
│ │ │ ┌───────────── mês (1 - 12)
│ │ │ │ ┌───────────── dia da semana (0 - 6) (0 = domingo)
│ │ │ │ │
* * * * *
```

### Exemplos

**Toda segunda-feira às 9h:**

```
0 9 * * 1
```

**Toda segunda a sexta às 9h:**

```
0 9 * * 1-5
```

**Todo dia às 9h:**

```
0 9 * * *
```

**Toda segunda-feira às 9h e 14h:**

```
0 9,14 * * 1
```

**Primeiro dia de cada mês às 9h:**

```
0 9 1 * *
```

**Black Friday (última sexta de novembro - aproximado):**

```
0 9 25-30 11 5
```

**Dia das Mães (segundo domingo de maio - aproximado):**

```
0 9 8-14 5 0
```

**Dia dos Pais (segundo domingo de agosto - aproximado):**

```
0 9 8-14 8 0
```

## Configuração no N8N

### Passo 1: Criar Schedule Trigger

1. No N8N, adicione um nó "Schedule Trigger"
2. Configure:
   - **Trigger Times**: Cron Expression
   - **Cron Expression**: Cole a expressão cron
   - **Timezone**: Selecione seu timezone

### Passo 2: Conectar ao Workflow de Campanha

Após o Schedule Trigger, adicione:

1. **Set Variables** com `CAMPANHA_ID` fixo (para Opção 1)
   OU
2. **Supabase - Get All** para buscar campanhas (para Opção 2)

### Passo 3: Validar Execução

Adicione validação para evitar execuções duplicadas:

```javascript
// Verificar se campanha já foi executada hoje
const hoje = new Date().toISOString().split("T")[0];
const { data } = await supabase
  .from("instacar_campanhas_execucoes")
  .select("id")
  .eq("campanha_id", campanhaId)
  .eq("data_execucao", hoje)
  .single();

if (data) {
  // Já executou hoje, pular
  return [];
}
```

## Exemplos Práticos

### Campanha Mensal (Todo dia 1º às 9h)

**Cron:** `0 9 1 * *`

**Configuração:**

- Workflow: "Campanha Mensal - Janeiro"
- Schedule Trigger: `0 9 1 * *`
- Variável: `CAMPANHA_ID = uuid-janeiro`

### Campanha Semanal (Toda segunda às 9h)

**Cron:** `0 9 * * 1`

**Configuração:**

- Workflow: "Campanha Semanal"
- Schedule Trigger: `0 9 * * 1`
- Variável: `CAMPANHA_ID = uuid-semanal`

### Black Friday (Última sexta de novembro)

**Cron:** `0 9 25-30 11 5`

**Configuração:**

- Workflow: "Black Friday 2025"
- Schedule Trigger: `0 9 25-30 11 5`
- Variável: `CAMPANHA_ID = uuid-black-friday`
- **Nota**: Pode executar múltiplas vezes. Adicione validação de data específica.

### Campanha com Período Específico

Para campanhas que só devem executar em um período específico:

```javascript
// No início do workflow, após obter campanha
const hoje = new Date();
const dataInicio = new Date(campanha.data_inicio);
const dataFim = new Date(campanha.data_fim);

if (hoje < dataInicio || hoje > dataFim) {
  // Fora do período, não executar
  return [];
}
```

## Monitoramento

### Verificar Execuções Agendadas

```sql
-- Ver execuções de hoje
SELECT
  c.nome,
  e.data_execucao,
  e.status_execucao,
  e.total_enviado,
  e.trigger_tipo
FROM instacar_campanhas_execucoes e
JOIN instacar_campanhas c ON c.id = e.campanha_id
WHERE e.data_execucao = CURRENT_DATE
ORDER BY e.horario_inicio DESC;
```

### Verificar Próximas Execuções

No N8N, vá em **Executions** e filtre por workflows agendados para ver quando serão executados.

## Troubleshooting

### Campanha não está executando

1. Verifique se `agendamento_cron` está preenchido na campanha
2. Verifique se campanha está `ativa` e `ativo = true`
3. Verifique se está dentro do período (data_inicio/data_fim)
4. Verifique logs do N8N para erros

### Execução duplicada

1. Verifique se validação de execução hoje está funcionando
2. Verifique constraint UNIQUE em `instacar_campanhas_execucoes`

### Horário incorreto

1. Verifique timezone do Schedule Trigger
2. Verifique timezone do servidor N8N
3. Use timezone explícito: `America/Sao_Paulo`

## Boas Práticas

1. **Teste primeiro**: Configure cron para executar em poucos minutos para testar
2. **Valide período**: Sempre verifique se está dentro do período da campanha
3. **Evite sobreposição**: Use intervalos mínimos entre campanhas
4. **Monitore execuções**: Configure alertas para falhas
5. **Documente agendamentos**: Mantenha registro de quando cada campanha executa

## Exemplo Completo: Workflow com Schedule Trigger

```
Schedule Trigger (0 9 * * 1-5)
    ↓
Set Variables (CAMPANHA_ID = uuid-fixa)
    ↓
Obter Campanha Ativa
    ↓
Verificar Execução Hoje
    ↓ (se não executou)
Criar Execução
    ↓
[Resto do workflow de campanha]
```
