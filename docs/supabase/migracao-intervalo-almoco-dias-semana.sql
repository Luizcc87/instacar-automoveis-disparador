-- ============================================================================
-- Migração: Adicionar Campos de Intervalo de Almoço e Configuração por Dia da Semana
-- Adiciona campos para pausar durante almoço e configurar horários por dia da semana
-- ============================================================================

-- Adicionar colunas de intervalo de almoço
ALTER TABLE instacar_campanhas
  ADD COLUMN IF NOT EXISTS pausar_almoco BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS horario_almoco_inicio TIME DEFAULT '12:00:00',
  ADD COLUMN IF NOT EXISTS horario_almoco_fim TIME DEFAULT '13:00:00';

-- Adicionar coluna de configuração granular por dia da semana
ALTER TABLE instacar_campanhas
  ADD COLUMN IF NOT EXISTS configuracao_dias_semana JSONB;

-- Comentários nas colunas
COMMENT ON COLUMN instacar_campanhas.pausar_almoco IS 
  'Se TRUE, pausa automaticamente durante o intervalo de almoço configurado. Separa lotes antes e depois do almoço.';

COMMENT ON COLUMN instacar_campanhas.horario_almoco_inicio IS 
  'Horário de início do intervalo de almoço (formato TIME). Usado apenas se pausar_almoco = TRUE. Padrão: 12:00:00.';

COMMENT ON COLUMN instacar_campanhas.horario_almoco_fim IS 
  'Horário de fim do intervalo de almoço (formato TIME). Usado apenas se pausar_almoco = TRUE. Padrão: 13:00:00.';

COMMENT ON COLUMN instacar_campanhas.configuracao_dias_semana IS 
  'Configuração granular por dia da semana (JSONB). Se NULL, usa horario_inicio, horario_fim e processar_finais_semana (compatibilidade retroativa). 
   Formato: {"segunda": {"habilitado": true, "horario_inicio": "09:00", "horario_fim": "18:00"}, ...}';

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_campanhas_pausar_almoco 
  ON instacar_campanhas(pausar_almoco) 
  WHERE pausar_almoco = TRUE;

CREATE INDEX IF NOT EXISTS idx_campanhas_configuracao_dias_semana 
  ON instacar_campanhas USING GIN (configuracao_dias_semana)
  WHERE configuracao_dias_semana IS NOT NULL;

-- Atualizar campanhas existentes: definir valores padrão
UPDATE instacar_campanhas
SET pausar_almoco = FALSE,
    horario_almoco_inicio = '12:00:00',
    horario_almoco_fim = '13:00:00'
WHERE pausar_almoco IS NULL;

