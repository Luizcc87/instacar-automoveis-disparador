-- ============================================================================
-- Script: Corrigir Campanhas - Instância WhatsApp
-- 
-- Este script corrige campanhas que estão usando a instância 02 (disconnected)
-- para usar a instância 01 (connected).
--
-- ⚠️ ATENÇÃO: 
--    - Faça backup antes de executar
--    - Verifique os IDs das campanhas antes de executar
--    - Este script atualiza 3 campanhas específicas identificadas
-- ============================================================================

-- IDs das campanhas que precisam ser corrigidas:
-- 1. "Natal e Ano Novo Teste 2" - ID: 24108dbe-fd61-4e86-a5ac-0071e30a7aaf
-- 2. "Teste 1" - ID: 5a14447b-3e09-4ab3-96d8-a3035a2fba2c
-- 3. "Teste Natal 1" - ID: b2d886f3-5a7a-4d74-b363-530bda6b8f19

-- Instâncias:
-- Instância 01 (correta): 5d685525-9b5d-4ae1-b2a7-4ad7baab732a (numero_01, connected)
-- Instância 02 (incorreta): e4140aaa-b8ff-4c09-92d2-a265c7ee5903 (numero_02, disconnected)

-- ============================================================================
-- 1. VERIFICAR ANTES: Listar campanhas que serão corrigidas
-- ============================================================================
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.status AS campanha_status,
  c.ativo AS campanha_ativa,
  c.whatsapp_api_id AS instancia_id_atual,
  w.nome AS instancia_nome_atual,
  w.status_conexao AS status_instancia_atual,
  'Será atualizado para instância 01' AS acao
FROM instacar_campanhas c
INNER JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE c.id IN (
  '24108dbe-fd61-4e86-a5ac-0071e30a7aaf', -- Natal e Ano Novo Teste 2
  '5a14447b-3e09-4ab3-96d8-a3035a2fba2c', -- Teste 1
  'b2d886f3-5a7a-4d74-b363-530bda6b8f19'  -- Teste Natal 1
)
ORDER BY c.nome;

-- ============================================================================
-- 2. CORRIGIR: Atualizar as 3 campanhas para usar instância 01
-- ============================================================================
UPDATE instacar_campanhas
SET 
  whatsapp_api_id = '5d685525-9b5d-4ae1-b2a7-4ad7baab732a', -- Instância 01 (numero_01, connected)
  updated_at = NOW()
WHERE id IN (
  '24108dbe-fd61-4e86-a5ac-0071e30a7aaf', -- Natal e Ano Novo Teste 2
  '5a14447b-3e09-4ab3-96d8-a3035a2fba2c', -- Teste 1
  'b2d886f3-5a7a-4d74-b363-530bda6b8f19'  -- Teste Natal 1
);

-- ============================================================================
-- 3. VERIFICAR DEPOIS: Confirmar que a correção foi aplicada
-- ============================================================================
SELECT 
  c.id AS campanha_id,
  c.nome AS campanha_nome,
  c.status AS campanha_status,
  c.ativo AS campanha_ativa,
  c.whatsapp_api_id AS instancia_id_atual,
  w.nome AS instancia_nome_atual,
  w.status_conexao AS status_instancia_atual,
  CASE 
    WHEN w.status_conexao = 'connected' THEN '✅ Corrigido - Instância 01 (connected)'
    ELSE '⚠️ Verificar - Status: ' || COALESCE(w.status_conexao, 'desconhecido')
  END AS status_validacao
FROM instacar_campanhas c
INNER JOIN instacar_whatsapp_apis w ON c.whatsapp_api_id = w.id
WHERE c.id IN (
  '24108dbe-fd61-4e86-a5ac-0071e30a7aaf', -- Natal e Ano Novo Teste 2
  '5a14447b-3e09-4ab3-96d8-a3035a2fba2c', -- Teste 1
  'b2d886f3-5a7a-4d74-b363-530bda6b8f19'  -- Teste Natal 1
)
ORDER BY c.nome;

-- ============================================================================
-- 4. RESUMO: Contar quantas campanhas foram corrigidas
-- ============================================================================
SELECT 
  COUNT(*) AS total_campanhas_corrigidas,
  'Campanhas atualizadas para instância 01 (connected)' AS resultado
FROM instacar_campanhas
WHERE whatsapp_api_id = '5d685525-9b5d-4ae1-b2a7-4ad7baab732a' -- Instância 01
  AND id IN (
    '24108dbe-fd61-4e86-a5ac-0071e30a7aaf', -- Natal e Ano Novo Teste 2
    '5a14447b-3e09-4ab3-96d8-a3035a2fba2c', -- Teste 1
    'b2d886f3-5a7a-4d74-b363-530bda6b8f19'  -- Teste Natal 1
  );

