-- ============================================================================
-- Atualizar campanha para executar às 4:00 (todos os dias)
-- ============================================================================

-- Para executar TODOS OS DIAS às 4:00:
UPDATE instacar_campanhas
SET agendamento_cron = '0 4 * * *'
WHERE id = 'b2d886f3-5a7a-4d74-b363-530bda6b8f19' -- Teste Natal 1
  AND status = 'ativa'
  AND ativo = TRUE;

-- Para executar apenas DIAS ÚTEIS (segunda a sexta) às 4:00:
-- UPDATE instacar_campanhas
-- SET agendamento_cron = '0 4 * * 1-5'
-- WHERE id = 'b2d886f3-5a7a-4d74-b363-530bda6b8f19'
--   AND status = 'ativa'
--   AND ativo = TRUE;

-- Verificar se foi atualizado:
SELECT 
  id,
  nome,
  agendamento_cron,
  status,
  ativo,
  data_inicio,
  data_fim
FROM instacar_campanhas
WHERE id = 'b2d886f3-5a7a-4d74-b363-530bda6b8f19';

