# Guia: Como Criar e Gerenciar Campanhas

Este guia explica como criar, configurar e gerenciar campanhas de marketing via WhatsApp no sistema Instacar Automóveis.

## Visão Geral

O sistema de campanhas permite:

- Criar múltiplas campanhas ao longo do ano
- Agendar execuções automáticas
- Personalizar mensagens por época
- Controlar frequência de envios
- Rastrear performance por campanha

## Criando uma Nova Campanha

### Via Interface Web

1. Acesse a interface web (`interface-web/index.html`)
2. Configure conexão com Supabase (URL e Anon Key)
3. Clique em "Criar Nova Campanha"
4. Preencha os campos:

   - **Nome**: Nome descritivo (ex: "Black Friday 2025")
   - **Descrição**: Descrição da campanha
   - **Período do Ano**: Selecione o período (janeiro, black-friday, etc.)
   - **Status**: Ativa, Pausada, Concluída ou Cancelada
   - **Data Início/Fim**: Período de validade (opcional)
   - **Limite de Envios/Dia**: Máximo de mensagens por dia (padrão: 200)
   - **Intervalo Mínimo**: Dias entre envios para o mesmo cliente (padrão: 30)
   - **Agendamento Cron**: Expressão cron para execução automática (opcional)
   - **Prompt Personalizado**: Instruções específicas para a IA
   - **Template de Mensagem**: Template base (opcional)
   - **Incluir Informações de Veículos**: Checkbox para incluir dados de veículos no contexto da IA (padrão: marcado)
   - **Incluir Nome do Vendedor**: Checkbox para incluir nome do vendedor no contexto da IA (padrão: desmarcado)
   - **Tamanho do Lote**: Número de clientes a processar por execução (padrão: 50, mínimo: 10, máximo: 500)
   - **Horário Início**: Horário de início para processamento (padrão: 09:00)
   - **Horário Fim**: Horário de fim para processamento (padrão: 18:00)
   - **Processar Finais de Semana**: Checkbox para processar também sábados e domingos (padrão: desmarcado)

5. Clique em "Salvar"

### Via Supabase (SQL)

```sql
INSERT INTO instacar_campanhas (
  nome,
  descricao,
  periodo_ano,
  status,
  limite_envios_dia,
  intervalo_minimo_dias,
  agendamento_cron,
  prompt_ia,
  usar_veiculos,
  usar_vendedor,
  tamanho_lote,
  horario_inicio,
  horario_fim,
  processar_finais_semana,
  ativo
) VALUES (
  'Black Friday 2025',
  'Campanha especial de Black Friday com descontos exclusivos',
  'black-friday',
  'ativa',
  200,
  30,
  '0 9 25-30 11 5',  -- Última sexta de novembro às 9h
  'Enfatize descontos exclusivos e urgência. Mencione que é uma oportunidade única.',
  true,   -- Incluir veículos
  false,  -- Não incluir vendedor
  50,     -- Lote de 50 clientes
  '09:00:00',  -- Início 9h
  '18:00:00',  -- Fim 18h
  false,  -- Apenas dias úteis
  true
);
```

## Configurando Dados Opcionais para IA

### Flags de Contexto

O sistema permite controlar quais dados do cliente são incluídos no contexto da IA:

- **Incluir Informações de Veículos** (`usar_veiculos`): Se marcado, inclui dados de veículos adquiridos. Útil para campanhas promocionais. Para campanhas genéricas (Natal, Ano Novo), desmarque.
- **Incluir Nome do Vendedor** (`usar_vendedor`): Se marcado, inclui o nome do vendedor do veículo mais recente. Útil para campanhas de relacionamento.

**Exemplos:**
- **Natal/Ano Novo**: Desmarque ambos (mensagem genérica)
- **Black Friday**: Marque apenas "Incluir Informações de Veículos"
- **Relacionamento**: Marque ambos

Veja [guia-agente-ia-opcoes.md](guia-agente-ia-opcoes.md) para detalhes completos.

## Configurando Processamento em Lotes

### Tamanho do Lote

O sistema processa campanhas em lotes menores para evitar execuções muito longas:

- **Tamanho do Lote** (`tamanho_lote`): Número de clientes processados por execução
- **Padrão**: 50 clientes
- **Mínimo**: 10 clientes
- **Máximo**: 500 clientes

**Recomendações:**
- **Campanhas pequenas (< 200 clientes)**: Use 50-100
- **Campanhas médias (200-1000)**: Use 50
- **Campanhas grandes (> 1000)**: Use 50-100 (divide automaticamente em múltiplos dias)

### Horário de Processamento

Configure a faixa de horário para processamento:

- **Horário Início** (`horario_inicio`): Horário de início (formato HH:MM, padrão: 09:00)
- **Horário Fim** (`horario_fim`): Horário de fim (formato HH:MM, padrão: 18:00)
- **Processar Finais de Semana** (`processar_finais_semana`): Se marcado, processa também sábados e domingos

**Comportamento:**
- O sistema pausa automaticamente ao sair do horário configurado
- Retoma no próximo dia útil (ou no próximo dia se finais de semana permitidos)
- Divide automaticamente campanhas grandes ao longo de múltiplos dias

**Exemplo de Cálculo:**
- 2000 clientes elegíveis
- Tamanho lote: 50
- Limite diário: 200
- **Total de lotes**: 40 (2000 / 50)
- **Lotes por dia**: 4 (200 / 50)
- **Dias necessários**: 10 dias úteis (40 / 4)

## Configurando o Prompt da IA

O prompt personalizado é combinado com o template da época para gerar mensagens únicas.

### Exemplo de Prompt Efetivo

```
Você é um especialista em marketing automotivo. Crie uma mensagem personalizada para WhatsApp que:
- Mencione o período especial (Black Friday)
- Enfatize descontos e oportunidades
- Seja calorosa mas profissional
- Use o nome do cliente e informações do veículo
- Crie senso de urgência sem ser agressivo
- Mantenha máximo de 280 caracteres
```

### Boas Práticas

1. **Seja específico**: Defina o tom e objetivo da campanha
2. **Mencione contexto**: Inclua informações sobre o período/evento
3. **Defina limites**: Especifique tamanho máximo da mensagem
4. **Personalização**: Instrua a usar dados do cliente (nome, veículo)

## Períodos Disponíveis

### Mensais

- `janeiro` - Ano Novo, Carro Novo
- `fevereiro` - Carnaval com Segurança
- `marco` - Renovação de Frota
- `abril` - Páscoa Especial
- `maio` - Dia das Mães
- `junho` - Meio do Ano, Meio Desconto
- `julho` - Férias em Família
- `agosto` - Dia dos Pais
- `setembro` - Primavera Automotiva
- `outubro` - Outubro Rosa + Preparação Fim de Ano
- `novembro` - Black Friday Automotiva
- `dezembro` - Natal e Ano Novo

### Especiais

- `black-friday` - Black Friday
- `dia-maes` - Dia das Mães
- `dia-pais` - Dia dos Pais
- `natal` - Natal
- `ano-novo` - Ano Novo

## Agendamento Automático

### Configurar Cron Expression

Use expressões cron para agendar execuções automáticas:

**Formato:** `minuto hora dia mês dia-semana`

**Exemplos:**

- `0 9 * * 1-5` - Toda segunda a sexta às 9h
- `0 9 1 * *` - Todo dia 1º de cada mês às 9h
- `0 9 25-30 11 5` - Última sexta de novembro às 9h

Veja [guia-agendamento-cron.md](guia-agendamento-cron.md) para mais detalhes.

## Gerenciando Campanhas

### Ativar/Desativar

- **Ativo**: Campanha pode ser executada
- **Inativo**: Campanha não será executada (mesmo que status seja "ativa")

### Status

- **Ativa**: Campanha está em execução
- **Pausada**: Temporariamente pausada
- **Concluída**: Campanha finalizada
- **Cancelada**: Campanha cancelada

### Editar Campanha

1. Na interface web, clique em "Editar" na campanha
2. Modifique os campos desejados
3. Clique em "Salvar"

**Nota**: Alterações em campanhas em execução podem afetar envios futuros.

## Disparo Manual

### Via Interface Web

1. Na lista de campanhas, clique em "Disparar"
2. Confirme o disparo
3. O sistema chamará o webhook do N8N

**Pré-requisito**: Configure o webhook do N8N na função `dispararCampanha()` em `app.js`

### Via N8N

1. Abra o workflow de campanhas
2. Use Manual Trigger ou Webhook Trigger
3. Passe `campanha_id` como parâmetro

## Monitoramento

### Ver Execuções

Na interface web, clique em "Histórico" para ver:

- Data de execução
- Total enviado
- Total erros
- Status da execução
- Tipo de trigger (manual/cron/webhook)

### Queries Úteis

```sql
-- Ver performance de uma campanha
SELECT
  e.data_execucao,
  e.total_enviado,
  e.total_erros,
  e.status_execucao
FROM instacar_campanhas_execucoes e
WHERE e.campanha_id = 'uuid-da-campanha'
ORDER BY e.data_execucao DESC;

-- Ver mensagens enviadas por campanha
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE status_envio = 'erro') as erros
FROM instacar_historico_envios
WHERE campanha_id = 'uuid-da-campanha';
```

## Exemplos de Campanhas

### Campanha Mensal - Janeiro

```json
{
  "nome": "Ano Novo, Carro Novo - Janeiro 2025",
  "periodo_ano": "janeiro",
  "status": "ativa",
  "limite_envios_dia": 200,
  "intervalo_minimo_dias": 30,
  "agendamento_cron": "0 9 1 1 *",
  "prompt_ia": "Parabenize pelo Ano Novo. Enfatize que é um ótimo momento para renovar o veículo. Seja calorosa e inspiradora.",
  "usar_veiculos": true,
  "usar_vendedor": false,
  "tamanho_lote": 50,
  "horario_inicio": "09:00:00",
  "horario_fim": "18:00:00",
  "processar_finais_semana": false
}
```

### Campanha Black Friday

```json
{
  "nome": "Black Friday 2025",
  "periodo_ano": "black-friday",
  "status": "ativa",
  "data_inicio": "2025-11-25",
  "data_fim": "2025-11-30",
  "limite_envios_dia": 300,
  "intervalo_minimo_dias": 0,
  "agendamento_cron": "0 9 25-30 11 5",
  "prompt_ia": "Enfatize descontos exclusivos e urgência. Crie senso de escassez. Mencione que é oportunidade única do ano.",
  "usar_veiculos": true,
  "usar_vendedor": false,
  "tamanho_lote": 50,
  "horario_inicio": "08:00:00",
  "horario_fim": "20:00:00",
  "processar_finais_semana": true
}
```

### Campanha Dia das Mães

```json
{
  "nome": "Dia das Mães 2025",
  "periodo_ano": "dia-maes",
  "status": "ativa",
  "data_inicio": "2025-05-01",
  "data_fim": "2025-05-10",
  "limite_envios_dia": 200,
  "intervalo_minimo_dias": 30,
  "agendamento_cron": "0 9 8-14 5 0",
  "prompt_ia": "Parabenize pelo Dia das Mães. Enfatize veículos seguros e confortáveis para família. Seja emocional mas respeitosa.",
  "usar_veiculos": true,
  "usar_vendedor": false,
  "tamanho_lote": 50,
  "horario_inicio": "09:00:00",
  "horario_fim": "18:00:00",
  "processar_finais_semana": false
}
```

### Campanha Natal (Genérica)

```json
{
  "nome": "Natal 2025",
  "periodo_ano": "natal",
  "status": "ativa",
  "data_inicio": "2025-12-01",
  "data_fim": "2025-12-23",
  "limite_envios_dia": 200,
  "intervalo_minimo_dias": 30,
  "prompt_ia": "Deseje um Feliz Natal de forma calorosa. Mencione oportunidades de fim de ano sem mencionar veículos específicos.",
  "usar_veiculos": false,
  "usar_vendedor": false,
  "tamanho_lote": 50,
  "horario_inicio": "09:00:00",
  "horario_fim": "18:00:00",
  "processar_finais_semana": false
}
```

## Troubleshooting

### Campanha não executa

1. Verifique se está `ativa` e `ativo = true`
2. Verifique se está dentro do período (data_inicio/data_fim)
3. Verifique se `agendamento_cron` está correto
4. Verifique logs do N8N

### Mensagens não estão sendo enviadas

1. Verifique limite diário da campanha
2. Verifique intervalo mínimo entre envios
3. Verifique se cliente já recebeu esta campanha
4. Verifique logs de erro no Supabase

### Performance baixa

1. Ajuste `limite_envios_dia` se necessário
2. Verifique intervalo entre mensagens
3. Analise taxa de erro nas execuções
4. Considere segmentação de clientes

## Próximos Passos

Após criar campanhas:

1. Configure agendamento automático (se necessário)
2. Teste com disparo manual
3. Monitore primeiras execuções
4. Ajuste prompts baseado em resultados
5. Configure alertas para falhas
