# Correção: Busca de Campanhas Agendadas no Workflow Principal

## Problema Identificado

O workflow `Disparador_Web_Campanhas_Instacar.json` tem um Schedule Trigger que executa a cada 30 minutos, mas **não busca campanhas agendadas** quando o trigger executa.

### Fluxo Atual (INCORRETO):

```
Schedule Trigger (30min)
    ↓
Validar Payload → buscarCampanhasAgendadas: true
    ↓
Preparar Data para Cron
    ↓
IF Buscar Campanhas Agendadas (TRUE)
    ↓
Verificar Horário e Dia Útil
    ↓
[Se fora do horário comercial 9h-18h]
    ↓
pularExecucao: true
    ↓
IF Pular Execução (TRUE)
    ↓
[NÃO FAZ NADA - execução é pulada]
```

**Problema:** O workflow nunca busca campanhas com `agendamento_cron` configurado!

## Solução

Adicionar um nó que busque campanhas agendadas quando `buscarCampanhasAgendadas` é `true`, **ANTES** de verificar o horário comercial.

### Fluxo Corrigido:

```
Schedule Trigger (30min)
    ↓
Validar Payload → buscarCampanhasAgendadas: true
    ↓
Preparar Data para Cron
    ↓
IF Buscar Campanhas Agendadas (TRUE)
    ↓
[ADICIONAR AQUI] Buscar Campanhas Agendadas do Supabase
    ↓
[ADICIONAR AQUI] Filtrar Campanhas para Executar (verificar cron)
    ↓
[Se encontrou campanhas] → Continuar execução (ignorar horário comercial)
    ↓
[Se não encontrou] → Verificar Horário e Dia Útil (fluxo normal)
```

## Implementação

### Passo 1: Adicionar Nó "Buscar Campanhas Agendadas"

**Posição:** Entre "IF Buscar Campanhas Agendadas" (TRUE) e "Verificar Horário e Dia Útil"

**Tipo:** Supabase - GetAll

**Configuração:**

```json
{
  "operation": "getAll",
  "tableId": "instacar_campanhas",
  "filters": {
    "conditions": [
      {
        "keyName": "status",
        "condition": "eq",
        "keyValue": "ativa"
      },
      {
        "keyName": "ativo",
        "condition": "eq",
        "keyValue": true
      },
      {
        "keyName": "agendamento_cron",
        "condition": "not.isNull",
        "keyValue": ""
      }
    ]
  }
}
```

### Passo 2: Adicionar Nó "Filtrar Campanhas para Executar"

**Posição:** Após "Buscar Campanhas Agendadas"

**Tipo:** Code (JavaScript)

**Código:**

```javascript
// Filtrar campanhas que devem executar agora
const campanhas = $input.all();
const dadosCron = $('Preparar Data para Cron').first().json;
const hoje = dadosCron.hoje;
const hora = dadosCron.hora;
const minuto = dadosCron.minuto;
const diaSemana = dadosCron.diaSemana;

// Função para verificar se cron corresponde
function verificarCron(cronExpr, horaAtual, minutoAtual, diaSemanaAtual) {
  const partes = cronExpr.split(' ');
  if (partes.length !== 5) return false;
  
  const [min, hr, diaMes, mes, diaSem] = partes;
  
  // Verificar minuto
  if (min !== '*' && parseInt(min) !== minutoAtual) return false;
  
  // Verificar hora
  if (hr !== '*' && parseInt(hr) !== horaAtual) return false;
  
  // Verificar dia da semana (0 = domingo, 6 = sábado)
  if (diaSem.includes('-')) {
    const [inicio, fim] = diaSem.split('-').map(Number);
    if (diaSemanaAtual < inicio || diaSemanaAtual > fim) return false;
  } else if (diaSem !== '*') {
    const dias = diaSem.split(',').map(Number);
    if (!dias.includes(diaSemanaAtual)) return false;
  }
  
  return true;
}

const campanhasParaExecutar = [];

for (const campanha of campanhas) {
  const cron = campanha.json.agendamento_cron;
  if (!cron) continue;
  
  // Verificar se está no período
  const hojeDate = new Date(hoje);
  if (campanha.json.data_inicio && new Date(campanha.json.data_inicio) > hojeDate) continue;
  if (campanha.json.data_fim && new Date(campanha.json.data_fim) < hojeDate) continue;
  
  // Verificar se cron corresponde
  if (verificarCron(cron, hora, minuto, diaSemana)) {
    campanhasParaExecutar.push({
      json: {
        ...campanha.json,
        campanha_id: campanha.json.id,
        trigger_tipo: 'cron',
        buscarCampanhasAgendadas: false, // Resetar flag
        dentroHorarioComercial: true, // Permitir execução mesmo fora do horário comercial
        ehDiaUtil: true
      }
    });
  }
}

// Se encontrou campanhas, retornar para execução
if (campanhasParaExecutar.length > 0) {
  return campanhasParaExecutar;
}

// Se não encontrou, passar adiante para verificar horário comercial (fluxo normal)
return [{
  json: {
    ...dadosCron,
    buscarCampanhasAgendadas: false,
    nenhumaCampanhaAgendada: true
  }
}];
```

### Passo 3: Modificar Conexões

**Antes:**
- `IF Buscar Campanhas Agendadas` (TRUE) → `Verificar Horário e Dia Útil`

**Depois:**
- `IF Buscar Campanhas Agendadas` (TRUE) → `Buscar Campanhas Agendadas`
- `Buscar Campanhas Agendadas` → `Filtrar Campanhas para Executar`
- `Filtrar Campanhas para Executar` → `IF Tem Campanha Agendada` (novo nó IF)
- `IF Tem Campanha Agendada` (TRUE) → `Obter Campanha` (pular verificação de horário)
- `IF Tem Campanha Agendada` (FALSE) → `Verificar Horário e Dia Útil` (fluxo normal)

### Passo 4: Adicionar Nó IF "Tem Campanha Agendada"

**Tipo:** IF

**Condição:**
- `{{ $json.campanha_id }}` existe (não é null/undefined)

## Alternativa Rápida (Sem Modificar Workflow)

Se você não quiser modificar o workflow agora, pode usar o workflow separado `Disparador_Campanhas_Agendadas.json` que já tem essa funcionalidade implementada.

**Passos:**

1. Importe o workflow `Disparador_Campanhas_Agendadas.json`
2. Configure o Schedule Trigger para executar a cada 30 minutos (ou no horário desejado)
3. Configure a variável `WEBHOOK_CAMPANHA_URL` com a URL do webhook do workflow principal
4. O workflow buscará campanhas agendadas e chamará o webhook do workflow principal

## Verificação

Após implementar, verifique:

1. **Campanhas têm `agendamento_cron` configurado:**
   ```sql
   SELECT id, nome, agendamento_cron, status, ativo
   FROM instacar_campanhas
   WHERE status = 'ativa' AND ativo = TRUE;
   ```

2. **Schedule Trigger está executando:**
   - Verifique em Executions do N8N
   - Deve executar a cada 30 minutos

3. **Campanhas são encontradas:**
   - Verifique logs do nó "Filtrar Campanhas para Executar"
   - Deve retornar campanhas quando o cron corresponder

## Exemplo de Cron para 4:00

Para executar **todos os dias às 4:00:**
```
0 4 * * *
```

Para executar **apenas dias úteis às 4:00:**
```
0 4 * * 1-5
```

## Atualizar Campanha no Banco

```sql
UPDATE instacar_campanhas
SET agendamento_cron = '0 4 * * *'
WHERE id = 'b2d886f3-5a7a-4d74-b363-530bda6b8f19'
  AND status = 'ativa'
  AND ativo = TRUE;
```

