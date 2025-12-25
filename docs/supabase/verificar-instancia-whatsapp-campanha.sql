-- ============================================================================
-- Script: Verificar Instância WhatsApp de Campanha
-- 
-- Este script ajuda a identificar qual instância WhatsApp está configurada
-- em uma campanha e lista todas as instâncias disponíveis para comparação.
--
-- 📋 COMO USAR:
-- 1. Execute as queries na ordem (1, 2, 3, 4, 5, 5.1) - elas funcionam diretamente
-- 2. Query 6: Identifica campanhas usando instância 02 (que deveria ser 01)
-- 3. Query 7: Identifica campanhas usando instâncias desconectadas
-- 4. Query 8: Comando para corrigir UMA campanha específica (descomente e substitua o ID)
-- 5. Query 9: Comando para corrigir TODAS as campanhas usando instância 02 (use com cuidado!)
--
-- ⚠️ ATENÇÃO: 
--    - Queries 8 e 9 estão comentadas para evitar execução acidental
--    - Descomente apenas após verificar qual campanha precisa ser corrigida (use query 6)
--    - Sempre faça backup antes de executar UPDATEs
--
-- 📊 INSTÂNCIAS IDENTIFICADAS:
--    - Instância 01: 5d685525-9b5d-4ae1-b2a7-4ad7baab732a (numero_01, connected)
--    - Instância 02: e4140aaa-b8ff-4c09-92d2-a265c7ee5903 (numero_02, disconnected)
-- ============================================================================

-- 1. Listar todas as instâncias WhatsApp cadastradas
SELECT 
  id,
  nome,
  tipo_api,
  ativo,
  status_conexao,
  numero_whatsapp,
  profile_name,
  created_at,
  updated_at
FROM instacar_whatsapp_apis
ORDER BY nome;

-- 2. Listar todas as campanhas (use esta query primeiro para encontrar o ID da campanha)
SELECT 
  id AS campanha_id,
  nome AS campanha_nome,
  status,
  ativo,
  whatsapp_api_id,
  created_at
FROM instacar_campanhas
ORDER BY nome;

-- 2.1. Verificar qual instância está configurada em uma campanha específica
-- ⚠️ IMPORTANTE: Execute a query 2 primeiro para obter o ID da campanha
-- Depois, descomente e substitua 'SEU_CAMPANHA_ID_AQUI' pelo UUID real da campanha
/*
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.whatsapp_api_id,
  w.nome AS instancia_nome,
  w.tipo_api,
  w.ativo AS instancia_ativa,
  w.status_conexao,
  w.numero_whatsapp,
  w.profile_name,
  w.token -- ⚠️ ATENÇÃO: Token visível apenas para debug
FROM instacar_campanhas c
LEFT JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE c.id = 'SEU_CAMPANHA_ID_AQUI' -- ⚠️ SUBSTITUA PELO UUID DA CAMPANHA (ex: '5d685525-9b5d-4ae1-b2a7-4ad7baab732a')
ORDER BY c.nome;
*/

-- 3. Listar todas as campanhas e suas instâncias configuradas
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.status AS campanha_status,
  c.ativo AS campanha_ativa,
  c.whatsapp_api_id,
  w.nome AS instancia_nome,
  w.tipo_api,
  w.ativo AS instancia_ativa,
  w.status_conexao,
  CASE 
    WHEN c.whatsapp_api_id IS NULL THEN '❌ Nenhuma instância configurada'
    WHEN w.id IS NULL THEN '❌ Instância não encontrada (ID inválido)'
    WHEN w.ativo = false THEN '⚠️ Instância inativa'
    WHEN w.status_conexao != 'connected' THEN '⚠️ Instância desconectada'
    ELSE '✅ Instância OK'
  END AS status_validacao
FROM instacar_campanhas c
LEFT JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
ORDER BY c.nome;

-- 4. Verificar se há campanhas com instâncias incorretas ou inativas
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.whatsapp_api_id AS instancia_id_campanha,
  w.id AS instancia_id_encontrada,
  w.nome AS instancia_nome,
  w.ativo AS instancia_ativa,
  CASE 
    WHEN c.whatsapp_api_id IS NULL THEN 'Campanha sem instância configurada'
    WHEN w.id IS NULL THEN 'Instância não encontrada no banco'
    WHEN w.ativo = false THEN 'Instância inativa'
    WHEN w.status_conexao != 'connected' THEN 'Instância desconectada'
    ELSE 'OK'
  END AS problema
FROM instacar_campanhas c
LEFT JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE 
  c.ativo = true 
  AND c.status = 'ativa'
  AND (
    c.whatsapp_api_id IS NULL
    OR w.id IS NULL
    OR w.ativo = false
    OR w.status_conexao != 'connected'
  )
ORDER BY c.nome;

-- 5. Comparar IDs das instâncias (útil para identificar qual é qual)
-- Esta query lista TODAS as instâncias para você identificar qual é qual
SELECT 
  id,
  nome,
  tipo_api,
  ativo,
  status_conexao,
  numero_whatsapp,
  LEFT(token, 20) || '...' AS token_preview, -- Mostra apenas início do token por segurança
  created_at
FROM instacar_whatsapp_apis
ORDER BY nome;

-- 5.1. Comparar instâncias específicas (com IDs reais das suas instâncias)
SELECT 
  id,
  nome,
  tipo_api,
  ativo,
  status_conexao,
  numero_whatsapp,
  LEFT(token, 20) || '...' AS token_preview,
  created_at
FROM instacar_whatsapp_apis
WHERE id IN (
  '5d685525-9b5d-4ae1-b2a7-4ad7baab732a', -- Instância 01 (numero_01)
  'e4140aaa-b8ff-4c09-92d2-a265c7ee5903'  -- Instância 02 (numero_02)
)
ORDER BY nome;

-- 6. Verificar campanhas usando a instância 02 (que deveria ser 01)
-- Esta query identifica campanhas que estão usando a instância 02 (disconnected)
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.status AS campanha_status,
  c.ativo AS campanha_ativa,
  c.whatsapp_api_id AS instancia_id_atual,
  w.nome AS instancia_nome_atual,
  w.status_conexao AS status_instancia_atual,
  '⚠️ Usando instância 02 (disconnected) - deveria usar instância 01' AS problema
FROM instacar_campanhas c
INNER JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE c.whatsapp_api_id = 'e4140aaa-b8ff-4c09-92d2-a265c7ee5903' -- Instância 02
  AND c.ativo = true
ORDER BY c.nome;

-- 7. Verificar campanhas usando instância desconectada
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.status AS campanha_status,
  c.ativo AS campanha_ativa,
  c.whatsapp_api_id,
  w.nome AS instancia_nome,
  w.status_conexao,
  CASE 
    WHEN w.status_conexao = 'disconnected' THEN '⚠️ Instância desconectada'
    WHEN w.status_conexao IS NULL THEN '❌ Status desconhecido'
    ELSE '✅ Conectada'
  END AS status_validacao
FROM instacar_campanhas c
INNER JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE w.status_conexao != 'connected'
  AND c.ativo = true
ORDER BY c.nome;

-- 8. COMANDO PARA CORRIGIR: Atualizar campanha para usar instância 01
-- ⚠️ ATENÇÃO: Descomente e substitua 'CAMPANHA_ID_AQUI' pelo ID da campanha que precisa ser corrigida
-- Execute apenas após verificar qual campanha precisa ser corrigida (use a query 6)
/*
UPDATE instacar_campanhas
SET 
  whatsapp_api_id = '5d685525-9b5d-4ae1-b2a7-4ad7baab732a', -- Instância 01 (numero_01)
  updated_at = NOW()
WHERE id = 'CAMPANHA_ID_AQUI'; -- ⚠️ SUBSTITUA PELO UUID DA CAMPANHA

-- Verificar se a correção foi aplicada
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.whatsapp_api_id,
  w.nome AS instancia_nome,
  w.status_conexao,
  '✅ Corrigido para instância 01' AS status
FROM instacar_campanhas c
INNER JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE c.id = 'CAMPANHA_ID_AQUI'; -- ⚠️ SUBSTITUA PELO UUID DA CAMPANHA
*/

-- 9. CORREÇÃO EM MASSA: Atualizar todas as campanhas ativas usando instância 02 para usar instância 01
-- ⚠️ ATENÇÃO: Use com cuidado! Isso atualizará TODAS as campanhas ativas que estão usando a instância 02
-- Descomente apenas se tiver certeza de que TODAS devem usar a instância 01
/*
UPDATE instacar_campanhas
SET 
  whatsapp_api_id = '5d685525-9b5d-4ae1-b2a7-4ad7baab732a', -- Instância 01 (numero_01)
  updated_at = NOW()
WHERE whatsapp_api_id = 'e4140aaa-b8ff-4c09-92d2-a265c7ee5903' -- Instância 02
  AND ativo = true;

-- Verificar quantas campanhas foram corrigidas
SELECT 
  COUNT(*) AS campanhas_corrigidas,
  'Campanhas atualizadas para instância 01' AS resultado
FROM instacar_campanhas
WHERE whatsapp_api_id = '5d685525-9b5d-4ae1-b2a7-4ad7baab732a'
  AND ativo = true;
*/

