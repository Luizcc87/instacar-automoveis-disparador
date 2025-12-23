-- ============================================================================
-- Verificação: Inconsistências entre Histórico e Execuções de Campanhas
-- Identifica discrepâncias entre contadores do histórico e da execução
-- ============================================================================

-- ============================================================================
-- 1. Execuções com discrepância entre histórico e contadores
-- ============================================================================

-- Compara total_enviado da execução com contagem real no histórico
SELECT 
  e.id as execucao_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.total_enviado as total_enviado_execucao,
  e.total_erros as total_erros_execucao,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') as total_enviados_historico,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'erro') as total_erros_historico,
  COUNT(h.id) as total_registros_historico,
  -- Calcular diferenças
  COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') - COALESCE(e.total_enviado, 0) as diferenca_enviados,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'erro') - COALESCE(e.total_erros, 0) as diferenca_erros
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.execucao_id = e.id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY e.id, c.nome, e.data_execucao, e.total_enviado, e.total_erros
HAVING 
  -- Encontrar apenas execuções com discrepâncias
  COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') != COALESCE(e.total_enviado, 0)
  OR COUNT(h.id) FILTER (WHERE h.status_envio = 'erro') != COALESCE(e.total_erros, 0)
ORDER BY 
  ABS(COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') - COALESCE(e.total_enviado, 0)) DESC,
  e.data_execucao DESC;

-- ============================================================================
-- 2. Execuções com histórico mas sem contadores atualizados
-- ============================================================================

-- Execuções que têm registros no histórico mas contadores zerados ou desatualizados
SELECT 
  e.id as execucao_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.status_execucao,
  e.total_enviado as total_enviado_execucao,
  e.total_erros as total_erros_execucao,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') as total_enviados_historico,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'erro') as total_erros_historico,
  COUNT(h.id) as total_registros_historico,
  CASE 
    WHEN e.total_enviado = 0 AND COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') > 0 
      THEN 'Contadores zerados mas há histórico'
    WHEN e.total_enviado < COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado')
      THEN 'Contadores desatualizados (menor que histórico)'
    WHEN e.total_enviado > COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado')
      THEN 'Contadores maiores que histórico (possível duplicação)'
    ELSE 'OK'
  END as tipo_inconsistencia
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.execucao_id = e.id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY e.id, c.nome, e.data_execucao, e.status_execucao, e.total_enviado, e.total_erros
HAVING 
  e.total_enviado != COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado')
  OR e.total_erros != COUNT(h.id) FILTER (WHERE h.status_envio = 'erro')
ORDER BY e.data_execucao DESC;

-- ============================================================================
-- 3. Execuções sem histórico vinculado
-- ============================================================================

-- Execuções que têm contadores mas não têm registros no histórico vinculados
SELECT 
  e.id as execucao_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.status_execucao,
  e.total_enviado,
  e.total_erros,
  COUNT(h.id) as total_registros_historico
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.execucao_id = e.id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
  AND (e.total_enviado > 0 OR e.total_erros > 0)
GROUP BY e.id, c.nome, e.data_execucao, e.status_execucao, e.total_enviado, e.total_erros
HAVING COUNT(h.id) = 0
ORDER BY e.data_execucao DESC;

-- ============================================================================
-- 4. Histórico sem execução vinculada
-- ============================================================================

-- Registros de histórico que têm campanha_id mas não têm execucao_id
SELECT 
  COUNT(*) as total_registros_sem_execucao,
  COUNT(DISTINCT h.campanha_id) as campanhas_afetadas,
  COUNT(DISTINCT h.telefone) as contatos_afetados
FROM instacar_historico_envios h
WHERE h.campanha_id IS NOT NULL
  AND h.execucao_id IS NULL
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '90 days';

-- Detalhes dos registros sem execução
SELECT 
  h.id,
  h.timestamp_envio,
  h.status_envio,
  c.nome as nome_campanha,
  h.telefone,
  cl.nome_cliente
FROM instacar_historico_envios h
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
LEFT JOIN instacar_clientes_envios cl ON h.cliente_id = cl.id
WHERE h.campanha_id IS NOT NULL
  AND h.execucao_id IS NULL
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY h.timestamp_envio DESC
LIMIT 100;

-- ============================================================================
-- 5. Resumo de inconsistências por campanha
-- ============================================================================

SELECT 
  c.id as campanha_id,
  c.nome as nome_campanha,
  COUNT(DISTINCT e.id) as total_execucoes,
  COUNT(DISTINCT e.id) FILTER (WHERE 
    e.total_enviado != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
    ), 0)
  ) as execucoes_com_discrepancia,
  SUM(e.total_enviado) as total_enviado_execucoes,
  SUM((
    SELECT COUNT(*) 
    FROM instacar_historico_envios h 
    WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
  )) as total_enviado_historico,
  SUM(e.total_enviado) - SUM((
    SELECT COUNT(*) 
    FROM instacar_historico_envios h 
    WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
  )) as diferenca_total
FROM instacar_campanhas c
INNER JOIN instacar_campanhas_execucoes e ON c.id = e.campanha_id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.nome
HAVING 
  SUM(e.total_enviado) != SUM((
    SELECT COUNT(*) 
    FROM instacar_historico_envios h 
    WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
  ))
ORDER BY ABS(diferenca_total) DESC;

