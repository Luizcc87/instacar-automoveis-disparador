-- ============================================================================
-- Verificar campanhas com agendamento cron configurado
-- ============================================================================

-- Listar todas as campanhas com agendamento cron
SELECT 
  id,
  nome,
  agendamento_cron,
  status,
  ativo,
  data_inicio,
  data_fim,
  created_at,
  updated_at
FROM instacar_campanhas
WHERE agendamento_cron IS NOT NULL
  AND agendamento_cron != ''
ORDER BY created_at DESC;

-- Verificar execuções recentes (últimas 24 horas) para identificar execuções automáticas
SELECT 
  e.id,
  e.campanha_id,
  c.nome as nome_campanha,
  e.data_execucao,
  e.horario_inicio,
  e.trigger_tipo,
  e.status_execucao,
  e.total_enviado,
  e.total_erros
FROM instacar_campanhas_execucoes e
LEFT JOIN instacar_campanhas c ON e.campanha_id = c.id
WHERE e.horario_inicio >= NOW() - INTERVAL '24 hours'
ORDER BY e.horario_inicio DESC;

-- Verificar se há campanhas com agendamento que podem estar executando automaticamente
SELECT 
  c.id,
  c.nome,
  c.agendamento_cron,
  c.status,
  c.ativo,
  COUNT(e.id) as total_execucoes_hoje
FROM instacar_campanhas c
LEFT JOIN instacar_campanhas_execucoes e 
  ON e.campanha_id = c.id 
  AND e.data_execucao = CURRENT_DATE
WHERE c.agendamento_cron IS NOT NULL
  AND c.agendamento_cron != ''
  AND c.status = 'ativa'
  AND c.ativo = true
GROUP BY c.id, c.nome, c.agendamento_cron, c.status, c.ativo
ORDER BY total_execucoes_hoje DESC;

