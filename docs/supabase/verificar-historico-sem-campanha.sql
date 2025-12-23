-- ============================================================================
-- Verificação: Histórico de Envios sem campanha_id
-- Identifica registros que podem estar sem campanha_id quando deveriam ter
-- ============================================================================

-- 1. Total de registros sem campanha_id
SELECT 
  COUNT(*) as total_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'erro') as erros_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'bloqueado') as bloqueados_sem_campanha
FROM instacar_historico_envios
WHERE campanha_id IS NULL;

-- 2. Registros sem campanha_id agrupados por origem (planilha_origem)
SELECT 
  planilha_origem,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE status_envio = 'erro') as erros,
  MIN(timestamp_envio) as primeiro_envio,
  MAX(timestamp_envio) as ultimo_envio
FROM instacar_historico_envios
WHERE campanha_id IS NULL
GROUP BY planilha_origem
ORDER BY total DESC;

-- 3. Registros sem campanha_id que foram enviados recentemente (últimos 30 dias)
-- Estes são os mais críticos, pois podem ser de campanhas ativas
SELECT 
  h.id,
  h.telefone,
  h.status_envio,
  h.planilha_origem,
  h.timestamp_envio,
  c.nome_cliente,
  c.ultima_campanha_id,
  c.ultima_campanha_data
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios c ON h.cliente_id = c.id
WHERE h.campanha_id IS NULL
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
  AND h.status_envio = 'enviado'
ORDER BY h.timestamp_envio DESC
LIMIT 100;

-- 4. Verificar se há registros sem campanha_id mas com execucao_id
-- Se houver execucao_id, podemos inferir o campanha_id da execução
SELECT 
  h.id,
  h.telefone,
  h.execucao_id,
  e.campanha_id as campanha_id_da_execucao,
  h.timestamp_envio
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
WHERE h.campanha_id IS NULL
  AND h.execucao_id IS NOT NULL
ORDER BY h.timestamp_envio DESC;

-- 5. Estatísticas por período (últimos 7, 30, 90 dias)
SELECT 
  'Últimos 7 dias' as periodo,
  COUNT(*) as total_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados
FROM instacar_historico_envios
WHERE campanha_id IS NULL
  AND timestamp_envio >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
  'Últimos 30 dias' as periodo,
  COUNT(*) as total_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados
FROM instacar_historico_envios
WHERE campanha_id IS NULL
  AND timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
UNION ALL
SELECT 
  'Últimos 90 dias' as periodo,
  COUNT(*) as total_sem_campanha,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados
FROM instacar_historico_envios
WHERE campanha_id IS NULL
  AND timestamp_envio >= CURRENT_DATE - INTERVAL '90 days';

-- 6. Comparação: registros com vs sem campanha_id (últimos 30 dias)
SELECT 
  CASE 
    WHEN campanha_id IS NULL THEN 'Sem Campanha'
    ELSE 'Com Campanha'
  END as tipo,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE status_envio = 'erro') as erros,
  ROUND(COUNT(*) FILTER (WHERE status_envio = 'enviado') * 100.0 / COUNT(*), 2) as taxa_sucesso
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tipo;

