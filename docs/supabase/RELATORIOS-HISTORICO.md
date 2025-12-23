# Documentação: Relatórios SQL de Histórico

## Visão Geral

Este documento descreve as queries SQL disponíveis para análise de histórico de mensagens enviadas para contatos, vinculadas às campanhas. Todas as queries estão no arquivo `docs/supabase/relatorios-historico.sql`.

## Como Usar

1. **Acesse o Editor SQL do Supabase:**
   - Faça login no Supabase
   - Vá para "SQL Editor"
   - Clique em "New query"

2. **Copie e cole a query desejada:**
   - Abra o arquivo `docs/supabase/relatorios-historico.sql`
   - Copie a query que você precisa
   - Cole no Editor SQL do Supabase

3. **Ajuste os parâmetros:**
   - Substitua valores como telefones, UUIDs, períodos conforme necessário
   - Veja os comentários em cada query para entender os parâmetros

4. **Execute a query:**
   - Clique em "Run" ou pressione Ctrl+Enter
   - Analise os resultados

## Relatórios Disponíveis

### 1. Histórico Completo por Contato

**Query 1.1: Por Telefone**
- **Uso**: Ver todo o histórico de um contato específico usando o telefone
- **Parâmetros**: Substitua `'5511999999999'` pelo telefone desejado
- **Retorna**: Lista completa de envios ordenados por data (mais recente primeiro)

**Query 1.2: Por Cliente ID**
- **Uso**: Ver todo o histórico de um contato usando o ID do cliente
- **Parâmetros**: Substitua `'uuid-do-cliente'` pelo UUID do cliente
- **Retorna**: Lista completa com informações do cliente incluídas

### 2. Histórico por Campanha

**Query 2.1: Todos os Envios de uma Campanha**
- **Uso**: Ver todos os envios realizados em uma campanha específica
- **Parâmetros**: Substitua `'uuid-da-campanha'` pelo UUID da campanha
- **Retorna**: Lista de todos os contatos que receberam mensagens desta campanha

**Query 2.2: Resumo de Envios por Campanha (30 dias)**
- **Uso**: Comparar performance de diferentes campanhas
- **Parâmetros**: Ajuste o período no `INTERVAL '30 days'` se necessário
- **Retorna**: Estatísticas resumidas por campanha (total, enviados, erros, taxa de sucesso)

### 3. Estatísticas Resumidas por Campanha

**Query 3.1: Estatísticas Detalhadas**
- **Uso**: Análise completa de performance de campanhas
- **Parâmetros**: Ajuste o período no `INTERVAL '90 days'` conforme necessário
- **Retorna**: 
  - Total de envios por tipo (normal, teste, debug)
  - Contatos únicos
  - Dias de atividade
  - Taxa de sucesso
  - Primeiro e último envio

### 4. Contatos que Receberam Múltiplas Campanhas

**Query 4.1: Contatos com Múltiplas Campanhas**
- **Uso**: Identificar contatos que receberam mensagens de várias campanhas
- **Retorna**: Lista de contatos com número de campanhas diferentes e nomes das campanhas

**Query 4.2: Contatos com Mesma Campanha Múltiplas Vezes**
- **Uso**: Identificar contatos que receberam a mesma campanha mais de uma vez
- **Retorna**: Contatos, campanha, total de envios e intervalo entre primeiro e último envio

### 5. Timeline de Envios por Contato

**Query 5.1: Timeline Completa**
- **Uso**: Ver sequência temporal de envios para um contato
- **Parâmetros**: Substitua `'5511999999999'` pelo telefone desejado
- **Retorna**: Timeline com intervalo entre envios consecutivos

**Query 5.2: Intervalo Médio entre Envios**
- **Uso**: Calcular frequência média de envios por contato
- **Retorna**: Intervalo médio, mínimo e máximo entre envios

### 6. Análise de Performance de Campanhas

**Query 6.1: Campanhas Mais Eficazes**
- **Uso**: Identificar campanhas com melhor taxa de sucesso
- **Parâmetros**: Ajuste o período e o mínimo de envios (`HAVING COUNT(*) >= 10`)
- **Retorna**: Campanhas ordenadas por taxa de sucesso

**Query 6.2: Campanhas com Mais Erros**
- **Uso**: Identificar campanhas que precisam de atenção
- **Retorna**: Campanhas com maior taxa de erro e tipos de erro encontrados

### 7. Análise Temporal

**Query 7.1: Envios por Dia**
- **Uso**: Ver distribuição diária de envios
- **Parâmetros**: Ajuste o período no `INTERVAL '30 days'`
- **Retorna**: Total de envios, enviados, erros e contatos únicos por dia

**Query 7.2: Envios por Semana**
- **Uso**: Ver tendências semanais
- **Parâmetros**: Ajuste o período no `INTERVAL '84 days'` (12 semanas)
- **Retorna**: Estatísticas agregadas por semana

**Query 7.3: Envios por Mês**
- **Uso**: Ver tendências mensais
- **Parâmetros**: Ajuste o período no `INTERVAL '365 days'` (12 meses)
- **Retorna**: Estatísticas agregadas por mês com taxa de sucesso

### 8. Análise por Tipo de Envio

**Query 8.1: Distribuição por Tipo**
- **Uso**: Ver quantos envios são normais, de teste ou debug
- **Retorna**: Contagem e percentual de cada tipo de envio

### 9. Contatos Mais Ativos

**Query 9.1: Top 20 Contatos**
- **Uso**: Identificar contatos que receberam mais mensagens
- **Parâmetros**: Ajuste o período e o limite (`LIMIT 20`)
- **Retorna**: Contatos ordenados por total de envios

### 10. Análise de Execuções de Campanhas

**Query 10.1: Histórico por Execução**
- **Uso**: Comparar dados do histórico com dados da execução
- **Retorna**: Comparação entre histórico registrado e métricas da execução

## Exemplos de Uso

### Exemplo 1: Verificar Performance de uma Campanha Específica

```sql
-- Substitua 'uuid-da-campanha' pelo UUID real
SELECT 
  c.nome as nome_campanha,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / COUNT(*), 2) as taxa_sucesso
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.campanha_id = 'uuid-da-campanha'
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.nome;
```

### Exemplo 2: Encontrar Contatos com Muitos Erros

```sql
SELECT 
  h.telefone,
  cl.nome_cliente,
  COUNT(*) as total_erros,
  STRING_AGG(DISTINCT LEFT(h.mensagem_erro, 50), ' | ') as tipos_erro
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
WHERE h.status_envio = 'erro'
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY h.telefone, cl.nome_cliente
HAVING COUNT(*) >= 3
ORDER BY total_erros DESC;
```

### Exemplo 3: Análise de Tendência Semanal

```sql
SELECT 
  DATE_TRUNC('week', h.timestamp_envio) as semana,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / COUNT(*), 2) as taxa_sucesso
FROM instacar_historico_envios h
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '84 days'
GROUP BY DATE_TRUNC('week', h.timestamp_envio)
ORDER BY semana DESC;
```

## Dicas de Performance

1. **Use índices**: As queries já estão otimizadas para usar os índices existentes
2. **Limite períodos**: Sempre use filtros de data para melhor performance
3. **Use LIMIT**: Para queries exploratórias, adicione `LIMIT 100` para resultados mais rápidos
4. **Agregações**: Queries com `GROUP BY` podem ser mais lentas com muitos dados

## Troubleshooting

### Query muito lenta

**Soluções:**
- Adicione filtros de data mais restritivos
- Use `LIMIT` para reduzir resultados
- Verifique se os índices estão criados (ver `docs/supabase/indexes.sql`)

### Resultados vazios

**Verificações:**
- Confirme que os UUIDs/telefones estão corretos
- Verifique se há dados no período especificado
- Confirme que os filtros não estão muito restritivos

### Erros de sintaxe

**Soluções:**
- Verifique aspas simples vs duplas
- Confirme que todos os campos existem na tabela
- Verifique se as foreign keys estão corretas

## Relacionamento com Outras Tabelas

O histórico está relacionado com:

- **instacar_clientes_envios**: Via `cliente_id` e `telefone`
- **instacar_campanhas**: Via `campanha_id`
- **instacar_campanhas_execucoes**: Via `execucao_id`

Use JOINs para incluir informações adicionais nas queries.

## Próximos Passos

Para análises mais avançadas:
1. Crie views materializadas para queries frequentes
2. Configure relatórios agendados
3. Integre com ferramentas de BI (Power BI, Tableau, etc.)
4. Crie dashboards personalizados

## Referências

- Schema completo: `docs/supabase/schema.sql`
- Schema de campanhas: `docs/supabase/schema-campanhas.sql`
- Índices: `docs/supabase/indexes.sql`
- Verificação de dados: `docs/supabase/verificar-historico-sem-campanha.sql`

