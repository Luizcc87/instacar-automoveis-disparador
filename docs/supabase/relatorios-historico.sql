-- ============================================================================
-- Relatórios: Histórico de Mensagens por Contato e Campanha
-- Coleção de queries úteis para análise de histórico de envios
-- ============================================================================
--
-- IMPORTANTE: Algumas queries têm placeholders que precisam ser substituídos
-- antes de executar. Procure por comentários "IMPORTANTE:" e "LIMIT 0" nas
-- queries. Para executar essas queries:
-- 1. Remova o "LIMIT 0" no final
-- 2. Descomente a linha WHERE que contém o placeholder
-- 3. Substitua o placeholder (telefone, UUID) pelo valor real
-- 4. Execute a query
--
-- Exemplo:
--   De: -- WHERE h.telefone = '5511999999999' ... LIMIT 0;
--   Para: WHERE h.telefone = '55119987654321' ... (sem LIMIT 0)
--
-- ============================================================================

-- ============================================================================
-- 1. HISTÓRICO COMPLETO POR CONTATO
-- ============================================================================

-- Histórico completo de um contato específico (por telefone)
-- IMPORTANTE: Descomente e substitua '5511999999999' pelo telefone desejado antes de executar
SELECT 
  h.id,
  h.timestamp_envio,
  h.status_envio,
  h.tipo_envio,
  h.mensagem_enviada,
  h.mensagem_erro,
  c.nome as nome_campanha,
  c.periodo_ano,
  h.planilha_origem,
  h.execucao_id
FROM instacar_historico_envios h
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
-- WHERE h.telefone = '5511999999999'  -- Descomente e substitua pelo telefone desejado
ORDER BY h.timestamp_envio DESC
LIMIT 0;  -- Remove LIMIT 0 e descomente WHERE acima para executar

-- Histórico completo de um contato específico (por cliente_id)
-- IMPORTANTE: Descomente e substitua '00000000-0000-0000-0000-000000000000' pelo UUID do cliente antes de executar
SELECT 
  h.id,
  h.timestamp_envio,
  h.status_envio,
  h.tipo_envio,
  h.mensagem_enviada,
  h.mensagem_erro,
  c.nome as nome_campanha,
  c.periodo_ano,
  h.planilha_origem,
  h.execucao_id,
  cl.nome_cliente,
  cl.telefone
FROM instacar_historico_envios h
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
-- WHERE h.cliente_id = '00000000-0000-0000-0000-000000000000'  -- Descomente e substitua pelo UUID do cliente
ORDER BY h.timestamp_envio DESC
LIMIT 0;  -- Remove LIMIT 0 e descomente WHERE acima para executar

-- ============================================================================
-- 2. HISTÓRICO POR CAMPANHA
-- ============================================================================

-- Todos os envios de uma campanha específica
-- IMPORTANTE: Descomente e substitua '00000000-0000-0000-0000-000000000000' pelo UUID da campanha antes de executar
SELECT 
  h.id,
  h.timestamp_envio,
  h.status_envio,
  h.tipo_envio,
  cl.nome_cliente,
  cl.telefone,
  h.mensagem_enviada,
  h.mensagem_erro,
  h.planilha_origem
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
-- WHERE h.campanha_id = '00000000-0000-0000-0000-000000000000'  -- Descomente e substitua pelo UUID da campanha
ORDER BY h.timestamp_envio DESC
LIMIT 0;  -- Remove LIMIT 0 e descomente WHERE acima para executar

-- Resumo de envios por campanha (últimos 30 dias)
SELECT 
  c.id,
  c.nome as nome_campanha,
  c.periodo_ano,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  COUNT(*) FILTER (WHERE h.status_envio = 'bloqueado') as bloqueados,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / COUNT(*), 2) as taxa_sucesso
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.nome, c.periodo_ano
ORDER BY total_envios DESC;

-- ============================================================================
-- 3. ESTATÍSTICAS RESUMIDAS POR CAMPANHA
-- ============================================================================

-- Estatísticas detalhadas por campanha (período configurável)
SELECT 
  c.id,
  c.nome as nome_campanha,
  c.periodo_ano,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  COUNT(*) FILTER (WHERE h.status_envio = 'bloqueado') as bloqueados,
  COUNT(*) FILTER (WHERE h.tipo_envio = 'teste') as envios_teste,
  COUNT(*) FILTER (WHERE h.tipo_envio = 'debug') as envios_debug,
  COUNT(*) FILTER (WHERE h.tipo_envio = 'normal') as envios_normal,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  COUNT(DISTINCT DATE(h.timestamp_envio)) as dias_atividade,
  MIN(h.timestamp_envio) as primeiro_envio,
  MAX(h.timestamp_envio) as ultimo_envio,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_sucesso
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days'  -- Ajuste o período conforme necessário
GROUP BY c.id, c.nome, c.periodo_ano
ORDER BY total_envios DESC;

-- ============================================================================
-- 4. CONTATOS QUE RECEBERAM MÚLTIPLAS CAMPANHAS
-- ============================================================================

-- Contatos que receberam mensagens de múltiplas campanhas diferentes
SELECT 
  h.telefone,
  cl.nome_cliente,
  COUNT(DISTINCT h.campanha_id) as total_campanhas,
  STRING_AGG(DISTINCT c.nome, ', ' ORDER BY c.nome) as campanhas,
  COUNT(*) as total_envios,
  MIN(h.timestamp_envio) as primeiro_envio,
  MAX(h.timestamp_envio) as ultimo_envio
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.campanha_id IS NOT NULL
GROUP BY h.telefone, cl.nome_cliente
HAVING COUNT(DISTINCT h.campanha_id) > 1
ORDER BY total_campanhas DESC, total_envios DESC;

-- Contatos que receberam a mesma campanha múltiplas vezes
SELECT 
  h.telefone,
  cl.nome_cliente,
  c.nome as nome_campanha,
  COUNT(*) as total_envios_campanha,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  MIN(h.timestamp_envio) as primeiro_envio,
  MAX(h.timestamp_envio) as ultimo_envio,
  EXTRACT(EPOCH FROM (MAX(h.timestamp_envio) - MIN(h.timestamp_envio))) / 86400 as dias_entre_primeiro_ultimo
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.campanha_id IS NOT NULL
GROUP BY h.telefone, cl.nome_cliente, c.nome, h.campanha_id
HAVING COUNT(*) > 1
ORDER BY total_envios_campanha DESC;

-- ============================================================================
-- 5. TIMELINE DE ENVIOS POR CONTATO
-- ============================================================================

-- Timeline completa de envios de um contato (últimos 90 dias)
-- IMPORTANTE: Descomente e substitua '5511999999999' pelo telefone desejado antes de executar
SELECT 
  h.timestamp_envio,
  h.status_envio,
  h.tipo_envio,
  c.nome as nome_campanha,
  c.periodo_ano,
  LEFT(h.mensagem_enviada, 100) as mensagem_preview,
  h.planilha_origem,
  LAG(h.timestamp_envio) OVER (ORDER BY h.timestamp_envio) as envio_anterior,
  EXTRACT(EPOCH FROM (h.timestamp_envio - LAG(h.timestamp_envio) OVER (ORDER BY h.timestamp_envio))) / 86400 as dias_apos_anterior
FROM instacar_historico_envios h
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days'
  -- AND h.telefone = '5511999999999'  -- Descomente e substitua pelo telefone desejado
ORDER BY h.timestamp_envio DESC
LIMIT 0;  -- Remove LIMIT 0 e descomente a linha WHERE acima para executar

-- Intervalo médio entre envios por contato
-- Usa CTE para calcular intervalos primeiro, depois agrega
WITH intervalos_calculados AS (
  SELECT 
    h.telefone,
    h.cliente_id,
    h.timestamp_envio,
    EXTRACT(EPOCH FROM (h.timestamp_envio - LAG(h.timestamp_envio) OVER (PARTITION BY h.telefone ORDER BY h.timestamp_envio))) / 86400 as intervalo_dias
  FROM instacar_historico_envios h
  WHERE h.status_envio = 'enviado'
    AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days'
)
SELECT 
  ic.telefone,
  cl.nome_cliente,
  COUNT(*) as total_envios,
  ROUND(AVG(ic.intervalo_dias), 2) as intervalo_medio_dias,
  ROUND(MIN(ic.intervalo_dias), 2) as intervalo_minimo_dias,
  ROUND(MAX(ic.intervalo_dias), 2) as intervalo_maximo_dias
FROM intervalos_calculados ic
LEFT JOIN instacar_clientes_envios cl ON ic.cliente_id = cl.id
WHERE ic.intervalo_dias IS NOT NULL  -- Ignora o primeiro envio de cada contato (sem intervalo anterior)
GROUP BY ic.telefone, cl.nome_cliente
HAVING COUNT(*) > 1
ORDER BY total_envios DESC;

-- ============================================================================
-- 6. ANÁLISE DE PERFORMANCE DE CAMPANHAS
-- ============================================================================

-- Campanhas mais eficazes (maior taxa de sucesso)
SELECT 
  c.id,
  c.nome as nome_campanha,
  c.periodo_ano,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_sucesso,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT h.telefone), 0), 2) as envios_por_contato
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.nome, c.periodo_ano
HAVING COUNT(*) >= 10  -- Apenas campanhas com pelo menos 10 envios
ORDER BY taxa_sucesso DESC, total_envios DESC;

-- Campanhas com mais erros (necessitam atenção)
SELECT 
  c.id,
  c.nome as nome_campanha,
  c.periodo_ano,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'erro') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_erro,
  STRING_AGG(DISTINCT LEFT(h.mensagem_erro, 100), ' | ' ORDER BY LEFT(h.mensagem_erro, 100)) as tipos_erro
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
  AND h.status_envio = 'erro'
GROUP BY c.id, c.nome, c.periodo_ano
HAVING COUNT(*) FILTER (WHERE h.status_envio = 'erro') >= 5
ORDER BY taxa_erro DESC, erros DESC;

-- ============================================================================
-- 7. ANÁLISE TEMPORAL
-- ============================================================================

-- Envios por dia (últimos 30 dias)
SELECT 
  DATE(h.timestamp_envio) as data,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  COUNT(DISTINCT h.campanha_id) as campanhas_ativas
FROM instacar_historico_envios h
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(h.timestamp_envio)
ORDER BY data DESC;

-- Envios por semana (últimas 12 semanas)
SELECT 
  DATE_TRUNC('week', h.timestamp_envio) as semana,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  COUNT(DISTINCT h.campanha_id) as campanhas_ativas
FROM instacar_historico_envios h
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '84 days'
GROUP BY DATE_TRUNC('week', h.timestamp_envio)
ORDER BY semana DESC;

-- Envios por mês (últimos 12 meses)
SELECT 
  DATE_TRUNC('month', h.timestamp_envio) as mes,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  COUNT(DISTINCT h.telefone) as contatos_unicos,
  COUNT(DISTINCT h.campanha_id) as campanhas_ativas,
  ROUND(COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / NULLIF(COUNT(*), 0), 2) as taxa_sucesso
FROM instacar_historico_envios h
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY DATE_TRUNC('month', h.timestamp_envio)
ORDER BY mes DESC;

-- ============================================================================
-- 8. ANÁLISE POR TIPO DE ENVIO
-- ============================================================================

-- Distribuição por tipo de envio (normal, teste, debug)
SELECT 
  COALESCE(h.tipo_envio, 'normal') as tipo_envio,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM instacar_historico_envios WHERE timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'), 2) as percentual_total
FROM instacar_historico_envios h
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY h.tipo_envio
ORDER BY total DESC;

-- ============================================================================
-- 9. CONTATOS MAIS ATIVOS
-- ============================================================================

-- Top 20 contatos que receberam mais mensagens
SELECT 
  h.telefone,
  cl.nome_cliente,
  COUNT(*) as total_envios,
  COUNT(DISTINCT h.campanha_id) as campanhas_diferentes,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  MIN(h.timestamp_envio) as primeiro_envio,
  MAX(h.timestamp_envio) as ultimo_envio
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY h.telefone, cl.nome_cliente
ORDER BY total_envios DESC
LIMIT 20;

-- ============================================================================
-- 10. ANÁLISE DE EXECUÇÕES DE CAMPANHAS
-- ============================================================================

-- Histórico vinculado a execuções específicas
SELECT 
  e.id as execucao_id,
  c.nome as nome_campanha,
  e.data_execucao,
  COUNT(h.id) as total_envios_historico,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros,
  e.total_enviado as total_enviado_execucao,
  e.total_erros as total_erros_execucao
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.execucao_id = e.id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY e.id, c.nome, e.data_execucao, e.total_enviado, e.total_erros
ORDER BY e.data_execucao DESC;

