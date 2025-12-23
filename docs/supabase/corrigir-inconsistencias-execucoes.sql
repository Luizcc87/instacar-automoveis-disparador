-- ============================================================================
-- Correção: Sincronizar Contadores de Execuções com Histórico
-- ATENÇÃO: Execute apenas após análise cuidadosa dos resultados de verificar-inconsistencias-execucoes.sql
-- ============================================================================

-- IMPORTANTE: Este script deve ser executado com cuidado!
-- 1. Primeiro execute verificar-inconsistencias-execucoes.sql para entender o escopo
-- 2. Revise os resultados antes de executar as correções
-- 3. Faça backup antes de executar UPDATEs

-- ============================================================================
-- Correção 1: Atualizar contadores de execuções baseado no histórico real
-- ============================================================================

-- Primeiro, verificar quantas execuções seriam afetadas
SELECT 
  COUNT(*) as execucoes_que_seriam_atualizadas
FROM instacar_campanhas_execucoes e
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
  AND (
    e.total_enviado != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
    ), 0)
    OR e.total_erros != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'erro'
    ), 0)
  );

-- Se o número acima for razoável, execute o UPDATE:
-- UPDATE instacar_campanhas_execucoes e
-- SET 
--   total_enviado = COALESCE((
--     SELECT COUNT(*) 
--     FROM instacar_historico_envios h 
--     WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
--   ), 0),
--   total_erros = COALESCE((
--     SELECT COUNT(*) 
--     FROM instacar_historico_envios h 
--     WHERE h.execucao_id = e.id AND h.status_envio = 'erro'
--   ), 0),
--   updated_at = NOW()
-- WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
--   AND (
--     e.total_enviado != COALESCE((
--       SELECT COUNT(*) 
--       FROM instacar_historico_envios h 
--       WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
--     ), 0)
--     OR e.total_erros != COALESCE((
--       SELECT COUNT(*) 
--       FROM instacar_historico_envios h 
--       WHERE h.execucao_id = e.id AND h.status_envio = 'erro'
--     ), 0)
--   );

-- ============================================================================
-- Correção 2: Atualizar contadores por tipo de envio (teste, debug, normal)
-- ============================================================================

-- Verificar quantas execuções têm contadores de tipo desatualizados
SELECT 
  COUNT(*) as execucoes_com_tipos_desatualizados
FROM instacar_campanhas_execucoes e
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
  AND (
    e.total_enviado_teste != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'teste'
    ), 0)
    OR e.total_enviado_debug != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'debug'
    ), 0)
    OR e.total_enviado_normal != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND COALESCE(h.tipo_envio, 'normal') = 'normal'
    ), 0)
  );

-- Se necessário, execute o UPDATE para tipos:
-- UPDATE instacar_campanhas_execucoes e
-- SET 
--   total_enviado_teste = COALESCE((
--     SELECT COUNT(*) 
--     FROM instacar_historico_envios h 
--     WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'teste'
--   ), 0),
--   total_enviado_debug = COALESCE((
--     SELECT COUNT(*) 
--     FROM instacar_historico_envios h 
--     WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'debug'
--   ), 0),
--   total_enviado_normal = COALESCE((
--     SELECT COUNT(*) 
--     FROM instacar_historico_envios h 
--     WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND COALESCE(h.tipo_envio, 'normal') = 'normal'
--   ), 0),
--   updated_at = NOW()
-- WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
--   AND (
--     e.total_enviado_teste != COALESCE((
--       SELECT COUNT(*) 
--       FROM instacar_historico_envios h 
--       WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'teste'
--     ), 0)
--     OR e.total_enviado_debug != COALESCE((
--       SELECT COUNT(*) 
--       FROM instacar_historico_envios h 
--       WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND h.tipo_envio = 'debug'
--     ), 0)
--     OR e.total_enviado_normal != COALESCE((
--       SELECT COUNT(*) 
--       FROM instacar_historico_envios h 
--       WHERE h.execucao_id = e.id AND h.status_envio = 'enviado' AND COALESCE(h.tipo_envio, 'normal') = 'normal'
--     ), 0)
--   );

-- ============================================================================
-- Correção 3: Vincular histórico sem execucao_id à execução correta
-- ============================================================================

-- Verificar quantos registros de histórico sem execucao_id podem ser vinculados
-- Baseado em campanha_id e data de execução
SELECT 
  COUNT(*) as registros_que_podem_ser_vinculados
FROM instacar_historico_envios h
INNER JOIN instacar_campanhas_execucoes e ON 
  h.campanha_id = e.campanha_id
  AND DATE(h.timestamp_envio) = e.data_execucao
WHERE h.execucao_id IS NULL
  AND h.campanha_id IS NOT NULL
  AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days';

-- Se o número acima for razoável, execute o UPDATE:
-- UPDATE instacar_historico_envios h
-- SET execucao_id = e.id
-- FROM instacar_campanhas_execucoes e
-- WHERE h.campanha_id = e.campanha_id
--   AND DATE(h.timestamp_envio) = e.data_execucao
--   AND h.execucao_id IS NULL
--   AND h.campanha_id IS NOT NULL
--   AND h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================================================
-- Verificação pós-correção
-- ============================================================================

-- Verificar quantas execuções ainda têm inconsistências
SELECT 
  COUNT(*) as execucoes_com_inconsistencia
FROM instacar_campanhas_execucoes e
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '90 days'
  AND (
    e.total_enviado != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'enviado'
    ), 0)
    OR e.total_erros != COALESCE((
      SELECT COUNT(*) 
      FROM instacar_historico_envios h 
      WHERE h.execucao_id = e.id AND h.status_envio = 'erro'
    ), 0)
  );

-- Resumo de execuções corrigidas
SELECT 
  c.nome as nome_campanha,
  e.data_execucao,
  e.total_enviado as total_enviado_execucao,
  COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') as total_enviados_historico,
  CASE 
    WHEN e.total_enviado = COUNT(h.id) FILTER (WHERE h.status_envio = 'enviado') 
      THEN '✅ Sincronizado'
    ELSE '❌ Desincronizado'
  END as status
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.execucao_id = e.id
WHERE e.data_execucao >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.nome, e.data_execucao, e.total_enviado, e.id
ORDER BY e.data_execucao DESC;

