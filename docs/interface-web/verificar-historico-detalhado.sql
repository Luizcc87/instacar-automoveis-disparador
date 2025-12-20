-- ============================================================================
-- Query DETALHADA para verificar registros de histórico
-- Execute no SQL Editor do Supabase para ver TODOS os campos
-- ============================================================================

-- Verificar registros para o telefone específico com TODOS os campos
SELECT 
  id,
  cliente_id,
  telefone,
  campanha_id,
  status_envio,
  mensagem_enviada,
  timestamp_envio,
  created_at,
  planilha_origem,
  veiculo_referencia,
  mensagem_erro
FROM instacar_historico_envios
WHERE telefone = '5555999703107'
ORDER BY timestamp_envio DESC, created_at DESC
LIMIT 10;

-- Verificar se os registros têm cliente_id preenchido
SELECT 
  COUNT(*) as total_registros,
  COUNT(cliente_id) as com_cliente_id,
  COUNT(*) FILTER (WHERE cliente_id IS NULL) as sem_cliente_id,
  COUNT(*) FILTER (WHERE cliente_id = '11d5ab1b-ae9c-46c4-b8ff-a6214a9eb18f') as com_cliente_id_correto
FROM instacar_historico_envios
WHERE telefone = '5555999703107';
