-- ============================================================================
-- Schema Supabase - Expansão: Sistema de Lotes e Horários para Campanhas
-- Adiciona controle de processamento em lotes menores e horário configurável
-- ============================================================================

-- Adicionar colunas para controle de lotes e horário em instacar_campanhas
ALTER TABLE instacar_campanhas
  ADD COLUMN IF NOT EXISTS tamanho_lote INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS horario_inicio TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS horario_fim TIME DEFAULT '18:00:00',
  ADD COLUMN IF NOT EXISTS processar_finais_semana BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN instacar_campanhas.tamanho_lote IS
  'Número máximo de clientes a processar por execução. Evita execuções muito longas. Padrão: 50. Mínimo: 10, Máximo: 500';

COMMENT ON COLUMN instacar_campanhas.horario_inicio IS
  'Horário de início para processamento (formato TIME). Padrão: 09:00:00';

COMMENT ON COLUMN instacar_campanhas.horario_fim IS
  'Horário de fim para processamento (formato TIME). Padrão: 18:00:00';

COMMENT ON COLUMN instacar_campanhas.processar_finais_semana IS
  'Se TRUE, processa também sábados e domingos. Se FALSE, apenas dias úteis. Padrão: FALSE';

-- Adicionar constraints (com verificação de existência)
DO $$ 
BEGIN
  -- Constraint tamanho_lote
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_tamanho_lote' 
    AND conrelid = 'instacar_campanhas'::regclass
  ) THEN
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT check_tamanho_lote 
      CHECK (tamanho_lote >= 10 AND tamanho_lote <= 500);
  END IF;

  -- Constraint horario_inicio_fim
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_horario_inicio_fim' 
    AND conrelid = 'instacar_campanhas'::regclass
  ) THEN
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT check_horario_inicio_fim 
      CHECK (horario_inicio < horario_fim);
  END IF;
END $$;

-- Adicionar colunas em instacar_campanhas_execucoes para rastrear lote atual
ALTER TABLE instacar_campanhas_execucoes
  ADD COLUMN IF NOT EXISTS lote_atual INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS clientes_no_lote_atual INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proxima_execucao_em TIMESTAMP;

COMMENT ON COLUMN instacar_campanhas_execucoes.lote_atual IS
  'Número do lote atual sendo processado (incrementa a cada execução)';

COMMENT ON COLUMN instacar_campanhas_execucoes.clientes_no_lote_atual IS
  'Quantidade de clientes processados no lote atual';

COMMENT ON COLUMN instacar_campanhas_execucoes.proxima_execucao_em IS
  'Timestamp estimado para próxima execução (quando continuar processamento)';

