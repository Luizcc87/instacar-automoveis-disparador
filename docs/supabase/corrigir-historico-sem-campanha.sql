-- ============================================================================
-- Correção: Atualizar registros de histórico sem campanha_id
-- ATENÇÃO: Execute apenas após análise cuidadosa dos resultados de verificar-historico-sem-campanha.sql
-- ============================================================================

-- IMPORTANTE: Este script deve ser executado com cuidado!
-- 1. Primeiro execute verificar-historico-sem-campanha.sql para entender o escopo
-- 2. Revise os resultados antes de executar as correções
-- 3. Faça backup antes de executar UPDATEs

-- ============================================================================
-- Correção 1: Atualizar campanha_id a partir de execucao_id
-- Se o registro tem execucao_id mas não tem campanha_id, podemos inferir da execução
-- ============================================================================

UPDATE instacar_historico_envios h
SET campanha_id = e.campanha_id
FROM instacar_campanhas_execucoes e
WHERE h.execucao_id = e.id
  AND h.campanha_id IS NULL
  AND h.execucao_id IS NOT NULL;

-- Verificar quantos registros foram atualizados (hoje)
-- Nota: A tabela instacar_historico_envios não tem updated_at, então usamos timestamp_envio
SELECT 
  COUNT(*) as registros_atualizados
FROM instacar_historico_envios
WHERE campanha_id IS NOT NULL
  AND execucao_id IS NOT NULL
  AND timestamp_envio >= CURRENT_DATE;

-- ============================================================================
-- Correção 2: Atualizar campanha_id a partir de ultima_campanha_id do cliente
-- ATENÇÃO: Use apenas se tiver certeza de que o histórico corresponde à última campanha
-- Esta correção é mais arriscada, pois assume que o histórico recente é da última campanha
-- ============================================================================

-- Primeiro, verificar quantos registros seriam afetados
SELECT 
  COUNT(*) as registros_que_seriam_atualizados
FROM instacar_historico_envios h
INNER JOIN instacar_clientes_envios c ON h.cliente_id = c.id
WHERE h.campanha_id IS NULL
  AND c.ultima_campanha_id IS NOT NULL
  AND h.timestamp_envio >= c.ultima_campanha_data - INTERVAL '1 day'
  AND h.timestamp_envio <= c.ultima_campanha_data + INTERVAL '1 day';

-- Se o número acima for razoável e você tiver certeza, execute:
-- UPDATE instacar_historico_envios h
-- SET campanha_id = c.ultima_campanha_id
-- FROM instacar_clientes_envios c
-- WHERE h.cliente_id = c.id
--   AND h.campanha_id IS NULL
--   AND c.ultima_campanha_id IS NOT NULL
--   AND h.timestamp_envio >= c.ultima_campanha_data - INTERVAL '1 day'
--   AND h.timestamp_envio <= c.ultima_campanha_data + INTERVAL '1 day';

-- ============================================================================
-- Correção 3: Marcar registros antigos sem campanha_id como "legado"
-- Para registros muito antigos (antes da implementação de campanhas), 
-- podemos adicionar uma observação ou deixar como está
-- ============================================================================

-- Verificar registros antigos (mais de 90 dias) sem campanha_id
SELECT 
  COUNT(*) as registros_antigos_sem_campanha,
  MIN(timestamp_envio) as primeiro_registro,
  MAX(timestamp_envio) as ultimo_registro
FROM instacar_historico_envios
WHERE campanha_id IS NULL
  AND timestamp_envio < CURRENT_DATE - INTERVAL '90 days';

-- Estes registros provavelmente são legados e podem ser deixados como estão
-- ou você pode criar uma "campanha legado" para agrupá-los

-- ============================================================================
-- Verificação pós-correção
-- ============================================================================

-- Verificar quantos registros ainda estão sem campanha_id
SELECT 
  COUNT(*) as total_sem_campanha,
  COUNT(*) FILTER (WHERE timestamp_envio >= CURRENT_DATE - INTERVAL '30 days') as recentes_sem_campanha
FROM instacar_historico_envios
WHERE campanha_id IS NULL;

-- Verificar distribuição de campanha_id após correção
SELECT 
  c.nome as nome_campanha,
  COUNT(*) as total_envios,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE h.status_envio = 'erro') as erros
FROM instacar_historico_envios h
LEFT JOIN instacar_campanhas c ON h.campanha_id = c.id
WHERE h.timestamp_envio >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.nome, h.campanha_id
ORDER BY total_envios DESC;

