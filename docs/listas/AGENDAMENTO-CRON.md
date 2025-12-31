# Guia: Agendamento com Expressões Cron

## Sintaxe de Expressões Cron

Formato padrão: `minuto hora dia_mês mês dia_semana`

### Campos

| Campo | Valores Permitidos | Descrição |
|-------|-------------------|-----------|
| minuto | 0-59 ou * | Minuto da hora |
| hora | 0-23 ou * | Hora do dia (24h) |
| dia_mês | 1-31 ou * | Dia do mês |
| mês | 1-12 ou * | Mês do ano |
| dia_semana | 0-6 ou * | Dia da semana (0=domingo, 6=sábado) |

### Caracteres Especiais

- `*` - Qualquer valor
- `-` - Range (ex: `1-5` = de 1 a 5)
- `,` - Lista de valores (ex: `1,3,5` = 1, 3 ou 5)
- `/` - Intervalo (ex: `*/15` = a cada 15)

## Exemplos Práticos

### Horários Comerciais

**9h, dias úteis (segunda a sexta)**
```
0 9 * * 1-5
```

**14:30, todos os dias**
```
30 14 * * *
```

**10h, segunda, quarta e sexta**
```
0 10 * * 1,3,5
```

### Frequências Específicas

**A cada 15 minutos**
```
*/15 * * * *
```

**A cada hora (no início da hora)**
```
0 * * * *
```

**Diariamente às 8h**
```
0 8 * * *
```

**Semanalmente (segunda às 9h)**
```
0 9 * * 1
```

**Mensalmente (dia 1 às 10h)**
```
0 10 1 * *
```

### Horários Específicos

**Manhã (9h-12h, dias úteis)**
```
0 9-12 * * 1-5
```

**Tarde (14h-17h, segunda a sexta)**
```
0 14-17 * * 1-5
```

**Fins de semana (10h, sábado e domingo)**
```
0 10 * * 0,6
```

## Dias da Semana

| Valor | Dia |
|-------|-----|
| 0 | Domingo |
| 1 | Segunda |
| 2 | Terça |
| 3 | Quarta |
| 4 | Quinta |
| 5 | Sexta |
| 6 | Sábado |

**Exemplos:**
- `1-5` = Segunda a sexta (dias úteis)
- `0,6` = Fins de semana
- `1,3,5` = Segunda, quarta e sexta

## Validação e Testes

### Validação em Tempo Real

A interface valida expressões cron em tempo real:
- Formato correto (5 campos)
- Valores dentro dos ranges permitidos
- Sintaxe válida

### Preview de Próximas Execuções

Ao configurar agendamento, o sistema mostra as próximas 5 execuções baseadas na expressão cron.

### Detecção de Conflitos

O sistema detecta automaticamente quando múltiplas listas/lotes estão agendados para o mesmo horário e alerta sobre possíveis conflitos.

## Boas Práticas

### 1. Evitar Conflitos

- Não agende múltiplas listas grandes no mesmo horário
- Distribua execuções ao longo do dia
- Use horários diferentes para listas diferentes

### 2. Horários Comerciais

- Prefira horários entre 9h-18h
- Evite horários de almoço (12h-13h) se possível
- Considere timezone do Brasil (America/Sao_Paulo)

### 3. Frequência Adequada

- Para listas grandes, agende diariamente
- Para listas pequenas, pode agendar múltiplas vezes ao dia
- Evite agendamentos muito frequentes (< 5 minutos)

### 4. Testes

- Sempre teste expressões cron antes de ativar
- Use preview de próximas execuções para validar
- Verifique conflitos antes de salvar

## Troubleshooting

### Agendamento não executa

**Verificações:**
1. Agendamento está ativo? (checkbox marcado)
2. Expressão cron está correta?
3. Lista está ativa?
4. Workflow N8N está rodando?
5. Verifique logs do workflow

### Próximas execuções não aparecem

1. Verifique se expressão cron está válida
2. Verifique se há execuções nos próximos 30 dias
3. Recarregue a página

### Conflitos detectados

1. Revise horários das listas/lotes agendados
2. Considere alterar horário de uma das listas
3. Verifique se total combinado excede limite diário (200)

### Expressão inválida

1. Verifique formato (5 campos separados por espaço)
2. Valide valores (minuto: 0-59, hora: 0-23, etc.)
3. Verifique sintaxe de ranges e listas

## Exemplos de Casos de Uso

### Caso 1: Campanha Diária

**Objetivo**: Enviar para lista de clientes todos os dias às 9h

**Expressão**: `0 9 * * 1-5`

**Resultado**: Executa segunda a sexta às 9h

### Caso 2: Campanha Semanal

**Objetivo**: Enviar para lista VIP toda segunda às 10h

**Expressão**: `0 10 * * 1`

**Resultado**: Executa toda segunda às 10h

### Caso 3: Múltiplas Execuções Diárias

**Objetivo**: Enviar para lista pequena 3x ao dia (9h, 14h, 17h)

**Solução**: Criar 3 lotes, cada um com seu próprio agendamento:
- Lote 1: `0 9 * * 1-5`
- Lote 2: `0 14 * * 1-5`
- Lote 3: `0 17 * * 1-5`

### Caso 4: Campanha Mensal

**Objetivo**: Enviar no dia 1 de cada mês às 8h

**Expressão**: `0 8 1 * *`

**Resultado**: Executa no dia 1 de cada mês às 8h

## Integração com Workflow N8N

O workflow N8N verifica listas agendadas a cada 5 minutos e executa aquelas cujo cron corresponde ao horário atual.

**Processo:**
1. Schedule Trigger executa a cada 5 minutos
2. Busca listas/lotes com `agendamento_ativo = TRUE`
3. Verifica se cron corresponde ao horário atual
4. Executa listas/lotes que devem disparar agora
5. Aplica rate limiting (máximo 5 simultâneos)

## Timezone

Todas as expressões cron são interpretadas no timezone **America/Sao_Paulo** (UTC-3).

**Exemplo:**
- Expressão: `0 9 * * 1-5`
- Executa: 9h horário de Brasília (12h UTC)

