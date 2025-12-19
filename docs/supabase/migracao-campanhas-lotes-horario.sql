-- ============================================================================
-- Script de Migração: Adicionar valores padrão de lotes e horários
-- Executar APÓS criar as colunas tamanho_lote, horario_inicio, horario_fim, processar_finais_semana
-- ============================================================================

-- Atualizar todas as campanhas existentes com defaults
UPDATE instacar_campanhas
SET
  tamanho_lote = COALESCE(tamanho_lote, 50),
  horario_inicio = COALESCE(horario_inicio, '09:00:00'::TIME),
  horario_fim = COALESCE(horario_fim, '18:00:00'::TIME),
  processar_finais_semana = COALESCE(processar_finais_semana, FALSE)
WHERE tamanho_lote IS NULL 
   OR horario_inicio IS NULL 
   OR horario_fim IS NULL 
   OR processar_finais_semana IS NULL;

-- Verificar resultado
SELECT
  id,
  nome,
  periodo_ano,
  tamanho_lote,
  horario_inicio,
  horario_fim,
  processar_finais_semana,
  created_at
FROM instacar_campanhas
ORDER BY created_at DESC;

-- Contar campanhas atualizadas
SELECT
  COUNT(*) as total_campanhas,
  AVG(tamanho_lote) as tamanho_lote_medio,
  COUNT(*) FILTER (WHERE processar_finais_semana = TRUE) as com_finais_semana
FROM instacar_campanhas;

