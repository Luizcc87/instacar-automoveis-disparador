-- ============================================================================
-- Limpeza de Dados de Teste - Preparação para Produção
-- ATENÇÃO: Execute com cuidado! Este script remove dados de teste.
-- ============================================================================
--
-- IMPORTANTE: 
-- 1. FAÇA BACKUP antes de executar DELETEs
-- 2. Execute primeiro as queries de VERIFICAÇÃO para ver o que será removido
-- 3. Revise os resultados antes de executar os DELETEs
-- 4. Execute em ambiente de teste primeiro se possível
--
-- ============================================================================
-- FASE 1: VERIFICAÇÃO - Ver o que será removido
-- ============================================================================

-- 1.1. Verificar histórico de envios de teste/debug
SELECT 
  'Histórico de Teste/Debug' as tipo,
  COUNT(*) as total_registros,
  COUNT(DISTINCT telefone) as telefones_unicos,
  COUNT(DISTINCT campanha_id) as campanhas_afetadas,
  MIN(timestamp_envio) as primeiro_envio,
  MAX(timestamp_envio) as ultimo_envio
FROM instacar_historico_envios
WHERE tipo_envio IN ('teste', 'debug')
  OR planilha_origem ILIKE '%teste%'
  OR planilha_origem ILIKE '%debug%';

-- 1.2. Verificar execuções de campanhas de teste
SELECT 
  'Execuções de Teste' as tipo,
  COUNT(*) as total_execucoes,
  COUNT(DISTINCT campanha_id) as campanhas_afetadas,
  SUM(total_enviado) as total_enviado,
  MIN(data_execucao) as primeira_execucao,
  MAX(data_execucao) as ultima_execucao
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
WHERE c.modo_teste = TRUE
   OR c.nome ILIKE '%teste%'
   OR c.nome ILIKE '%debug%';

-- 1.3. Verificar campanhas marcadas como teste
SELECT 
  id,
  nome,
  modo_teste,
  modo_debug,
  status,
  created_at
FROM instacar_campanhas
WHERE modo_teste = TRUE
   OR modo_debug = TRUE
   OR nome ILIKE '%teste%'
   OR nome ILIKE '%debug%'
ORDER BY created_at DESC;

-- 1.4. Verificar controle de envios de campanhas de teste
SELECT 
  'Controle de Envios (Teste)' as tipo,
  COUNT(*) as total_registros,
  SUM(total_enviado) as total_enviado,
  SUM(total_erros) as total_erros
FROM instacar_controle_envios c
INNER JOIN instacar_campanhas camp ON c.campanha_id = camp.id
WHERE camp.modo_teste = TRUE
   OR camp.modo_debug = TRUE
   OR camp.nome ILIKE '%teste%'
   OR camp.nome ILIKE '%debug%';

-- 1.5. Verificar clientes que só receberam envios de teste
-- (Clientes que só têm histórico de teste/debug)
SELECT 
  'Clientes Apenas Teste' as tipo,
  COUNT(DISTINCT c.id) as total_clientes
FROM instacar_clientes_envios c
WHERE NOT EXISTS (
  SELECT 1 
  FROM instacar_historico_envios h
  WHERE h.cliente_id = c.id 
    AND (h.tipo_envio IS NULL OR h.tipo_envio = 'normal')
)
AND EXISTS (
  SELECT 1 
  FROM instacar_historico_envios h
  WHERE h.cliente_id = c.id 
    AND h.tipo_envio IN ('teste', 'debug')
);

-- 1.6. Resumo geral de dados de teste
SELECT 
  'RESUMO GERAL' as categoria,
  (SELECT COUNT(*) FROM instacar_historico_envios WHERE tipo_envio IN ('teste', 'debug')) as historico_teste,
  (SELECT COUNT(*) FROM instacar_campanhas_execucoes e INNER JOIN instacar_campanhas c ON e.campanha_id = c.id WHERE c.modo_teste = TRUE OR c.modo_debug = TRUE) as execucoes_teste,
  (SELECT COUNT(*) FROM instacar_campanhas WHERE modo_teste = TRUE OR modo_debug = TRUE) as campanhas_teste,
  (SELECT COUNT(*) FROM instacar_controle_envios c INNER JOIN instacar_campanhas camp ON c.campanha_id = camp.id WHERE camp.modo_teste = TRUE OR camp.modo_debug = TRUE) as controle_teste;

-- ============================================================================
-- FASE 2: LIMPEZA SELETIVA (Execute apenas após revisar FASE 1)
-- ============================================================================

-- IMPORTANTE: Descomente apenas as seções que você quer executar
-- Recomendação: Execute uma seção por vez e verifique os resultados

-- ============================================================================
-- 2.1. Limpar histórico de envios de teste/debug
-- ============================================================================

-- Verificar antes de deletar
SELECT 
  id,
  telefone,
  tipo_envio,
  status_envio,
  campanha_id,
  timestamp_envio
FROM instacar_historico_envios
WHERE tipo_envio IN ('teste', 'debug')
ORDER BY timestamp_envio DESC
LIMIT 50;

-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_historico_envios
-- WHERE tipo_envio IN ('teste', 'debug');

-- ============================================================================
-- 2.2. Limpar histórico com planilha_origem de teste
-- ============================================================================

-- Verificar antes de deletar
SELECT 
  id,
  telefone,
  planilha_origem,
  tipo_envio,
  timestamp_envio
FROM instacar_historico_envios
WHERE planilha_origem ILIKE '%teste%'
   OR planilha_origem ILIKE '%debug%'
ORDER BY timestamp_envio DESC
LIMIT 50;

-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_historico_envios
-- WHERE planilha_origem ILIKE '%teste%'
--    OR planilha_origem ILIKE '%debug%';

-- ============================================================================
-- 2.3. Limpar execuções de campanhas de teste
-- ============================================================================

-- Verificar antes de deletar
SELECT 
  e.id,
  e.campanha_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.total_enviado,
  e.status_execucao
FROM instacar_campanhas_execucoes e
INNER JOIN instacar_campanhas c ON e.campanha_id = c.id
WHERE c.modo_teste = TRUE
   OR c.modo_debug = TRUE
   OR c.nome ILIKE '%teste%'
   OR c.nome ILIKE '%debug%'
ORDER BY e.data_execucao DESC;

-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_campanhas_execucoes e
-- USING instacar_campanhas c
-- WHERE e.campanha_id = c.id
--   AND (c.modo_teste = TRUE
--    OR c.modo_debug = TRUE
--    OR c.nome ILIKE '%teste%'
--    OR c.nome ILIKE '%debug%');

-- ============================================================================
-- 2.4. Limpar controle de envios de campanhas de teste
-- ============================================================================

-- Verificar antes de deletar
SELECT 
  c.data,
  c.campanha_id,
  camp.nome as nome_campanha,
  c.total_enviado,
  c.total_erros
FROM instacar_controle_envios c
INNER JOIN instacar_campanhas camp ON c.campanha_id = camp.id
WHERE camp.modo_teste = TRUE
   OR camp.modo_debug = TRUE
   OR camp.nome ILIKE '%teste%'
   OR camp.nome ILIKE '%debug%'
ORDER BY c.data DESC;

-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_controle_envios c
-- USING instacar_campanhas camp
-- WHERE c.campanha_id = camp.id
--   AND (camp.modo_teste = TRUE
--    OR camp.modo_debug = TRUE
--    OR camp.nome ILIKE '%teste%'
--    OR camp.nome ILIKE '%debug%');

-- ============================================================================
-- 2.5. Desativar ou deletar campanhas de teste
-- ============================================================================

-- Opção A: Desativar campanhas de teste (RECOMENDADO - mantém histórico)
UPDATE instacar_campanhas
SET 
  ativo = FALSE,
  status = 'cancelada',
  updated_at = NOW()
WHERE modo_teste = TRUE
   OR modo_debug = TRUE
   OR nome ILIKE '%teste%'
   OR nome ILIKE '%debug%';

-- Opção B: Deletar campanhas de teste (CUIDADO: deleta também execuções e histórico vinculado)
-- ATENÇÃO: Isso vai deletar em cascata:
-- - instacar_campanhas_execucoes (ON DELETE CASCADE)
-- - instacar_campanhas_clientes (ON DELETE CASCADE)
-- - Histórico com campanha_id (ON DELETE SET NULL)
--
-- Verificar antes:
-- SELECT id, nome, modo_teste, modo_debug, created_at
-- FROM instacar_campanhas
-- WHERE modo_teste = TRUE
--    OR modo_debug = TRUE
--    OR nome ILIKE '%teste%'
--    OR nome ILIKE '%debug%';
--
-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_campanhas
-- WHERE modo_teste = TRUE
--    OR modo_debug = TRUE
--    OR nome ILIKE '%teste%'
--    OR nome ILIKE '%debug%';

-- ============================================================================
-- 2.6. Limpar clientes que só receberam envios de teste
-- ============================================================================

-- Verificar antes de deletar
SELECT 
  c.id,
  c.telefone,
  c.nome_cliente,
  c.total_envios,
  COUNT(h.id) FILTER (WHERE h.tipo_envio IN ('teste', 'debug')) as envios_teste,
  COUNT(h.id) FILTER (WHERE h.tipo_envio = 'normal' OR h.tipo_envio IS NULL) as envios_normal
FROM instacar_clientes_envios c
LEFT JOIN instacar_historico_envios h ON h.cliente_id = c.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM instacar_historico_envios h2
  WHERE h2.cliente_id = c.id 
    AND (h2.tipo_envio IS NULL OR h2.tipo_envio = 'normal')
)
AND EXISTS (
  SELECT 1 
  FROM instacar_historico_envios h3
  WHERE h3.cliente_id = c.id 
    AND h3.tipo_envio IN ('teste', 'debug')
)
GROUP BY c.id, c.telefone, c.nome_cliente, c.total_envios;

-- Se estiver OK, descomente para deletar:
-- DELETE FROM instacar_clientes_envios
-- WHERE id IN (
--   SELECT c.id
--   FROM instacar_clientes_envios c
--   WHERE NOT EXISTS (
--     SELECT 1 
--     FROM instacar_historico_envios h
--     WHERE h.cliente_id = c.id 
--       AND (h.tipo_envio IS NULL OR h.tipo_envio = 'normal')
--   )
--   AND EXISTS (
--     SELECT 1 
--     FROM instacar_historico_envios h
--     WHERE h.cliente_id = c.id 
--       AND h.tipo_envio IN ('teste', 'debug')
--   )
-- );

-- ============================================================================
-- FASE 3: VERIFICAÇÃO PÓS-LIMPEZA
-- ============================================================================

-- Verificar se ainda há dados de teste
SELECT 
  'Verificação Pós-Limpeza' as categoria,
  (SELECT COUNT(*) FROM instacar_historico_envios WHERE tipo_envio IN ('teste', 'debug')) as historico_teste_restante,
  (SELECT COUNT(*) FROM instacar_campanhas WHERE modo_teste = TRUE OR modo_debug = TRUE) as campanhas_teste_restantes,
  (SELECT COUNT(*) FROM instacar_campanhas_execucoes e INNER JOIN instacar_campanhas c ON e.campanha_id = c.id WHERE c.modo_teste = TRUE OR c.modo_debug = TRUE) as execucoes_teste_restantes;

-- Verificar dados de produção (devem estar intactos)
SELECT 
  'Dados de Produção' as categoria,
  (SELECT COUNT(*) FROM instacar_historico_envios WHERE tipo_envio = 'normal' OR tipo_envio IS NULL) as historico_producao,
  (SELECT COUNT(*) FROM instacar_campanhas WHERE modo_teste = FALSE AND modo_debug = FALSE AND ativo = TRUE) as campanhas_producao,
  (SELECT COUNT(*) FROM instacar_clientes_envios WHERE ativo = TRUE) as clientes_ativos;

-- ============================================================================
-- FASE 4: PREPARAÇÃO PARA PRODUÇÃO
-- ============================================================================

-- 4.1. Garantir que modo_teste está desativado em todas as campanhas ativas
UPDATE instacar_campanhas
SET 
  modo_teste = FALSE,
  modo_debug = FALSE,
  updated_at = NOW()
WHERE ativo = TRUE
  AND (modo_teste = TRUE OR modo_debug = TRUE);

-- 4.2. Limpar telefones_teste de campanhas de produção
UPDATE instacar_campanhas
SET 
  telefones_teste = '[]'::jsonb,
  telefones_admin = '[]'::jsonb,
  updated_at = NOW()
WHERE ativo = TRUE
  AND modo_teste = FALSE
  AND modo_debug = FALSE;

-- 4.3. Verificar que não há campanhas ativas em modo teste
SELECT 
  id,
  nome,
  modo_teste,
  modo_debug,
  ativo,
  status
FROM instacar_campanhas
WHERE ativo = TRUE
  AND (modo_teste = TRUE OR modo_debug = TRUE);

-- Se a query acima retornar resultados, há campanhas ativas em modo teste!
-- Desative ou corrija antes de iniciar produção.

-- ============================================================================
-- RESUMO FINAL
-- ============================================================================

-- Execute esta query para ver o estado final do sistema
SELECT 
  'Estado Final do Sistema' as categoria,
  (SELECT COUNT(*) FROM instacar_historico_envios WHERE tipo_envio = 'normal' OR tipo_envio IS NULL) as historico_producao,
  (SELECT COUNT(*) FROM instacar_historico_envios WHERE tipo_envio IN ('teste', 'debug')) as historico_teste,
  (SELECT COUNT(*) FROM instacar_campanhas WHERE ativo = TRUE AND modo_teste = FALSE AND modo_debug = FALSE) as campanhas_producao,
  (SELECT COUNT(*) FROM instacar_campanhas WHERE modo_teste = TRUE OR modo_debug = TRUE) as campanhas_teste,
  (SELECT COUNT(*) FROM instacar_clientes_envios WHERE ativo = TRUE) as clientes_ativos;

