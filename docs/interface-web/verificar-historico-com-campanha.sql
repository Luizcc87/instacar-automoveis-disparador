-- ============================================================================
-- Query para verificar registros de histórico com campanha_id
-- Execute no SQL Editor do Supabase para diagnosticar o problema
-- ============================================================================

-- Verificar registros com campanha_id específico
SELECT 
  id,
  cliente_id,
  telefone,
  campanha_id,
  status_envio,
  mensagem_enviada,
  timestamp_envio,
  created_at,
  planilha_origem
FROM instacar_historico_envios
WHERE campanha_id = '5a14447b-3e09-4ab3-96d8-a3035a2fba2c'
ORDER BY timestamp_envio DESC, created_at DESC
LIMIT 10;

-- Verificar registros para o telefone específico (incluindo os com campanha_id)
SELECT 
  id,
  cliente_id,
  telefone,
  campanha_id,
  status_envio,
  mensagem_enviada,
  timestamp_envio,
  created_at,
  planilha_origem
FROM instacar_historico_envios
WHERE telefone = '5555999703107'
ORDER BY timestamp_envio DESC, created_at DESC
LIMIT 10;

-- Verificar registros para o cliente_id específico (incluindo os com campanha_id)
SELECT 
  id,
  cliente_id,
  telefone,
  campanha_id,
  status_envio,
  mensagem_enviada,
  timestamp_envio,
  created_at,
  planilha_origem
FROM instacar_historico_envios
WHERE cliente_id = '11d5ab1b-ae9c-46c4-b8ff-a6214a9eb18f'
ORDER BY timestamp_envio DESC, created_at DESC
LIMIT 10;

-- Contar registros por tipo (com/sem campanha_id)
SELECT 
  CASE 
    WHEN campanha_id IS NULL THEN 'Sem Campanha'
    ELSE 'Com Campanha'
  END as tipo,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados,
  MAX(timestamp_envio) as ultimo_envio
FROM instacar_historico_envios
WHERE telefone = '5555999703107'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY tipo;
