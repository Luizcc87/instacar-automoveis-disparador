-- ============================================================================
-- Query para verificar registros de histórico de envios individuais
-- Execute no SQL Editor do Supabase para diagnosticar o problema
-- ============================================================================

-- 1. Verificar TODOS os registros de histórico recentes (últimas 24h)
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
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Verificar registros para o telefone específico do teste
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

-- 3. Verificar registros para o cliente_id específico
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

-- 4. Verificar se o cliente existe na tabela de clientes
SELECT 
  id,
  telefone,
  nome_cliente,
  total_envios,
  ultimo_envio
FROM instacar_clientes_envios
WHERE id = '11d5ab1b-ae9c-46c4-b8ff-a6214a9eb18f'
   OR telefone = '5555999703107';

-- 5. Contar registros de histórico por telefone (últimos 7 dias)
SELECT 
  telefone,
  COUNT(*) as total_registros,
  COUNT(*) FILTER (WHERE status_envio = 'enviado') as enviados,
  COUNT(*) FILTER (WHERE status_envio = 'erro') as erros,
  MAX(timestamp_envio) as ultimo_envio
FROM instacar_historico_envios
WHERE telefone = '5555999703107'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY telefone;
