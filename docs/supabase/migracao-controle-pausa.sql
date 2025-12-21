-- ============================================================================
-- Migração: Adicionar Campos de Controle de Pausa
-- Adiciona campos para diferenciar pausa manual de automática e detectar execuções travadas
-- ============================================================================

-- Adicionar coluna pausa_manual
ALTER TABLE instacar_campanhas_execucoes
  ADD COLUMN IF NOT EXISTS pausa_manual BOOLEAN DEFAULT FALSE;

-- Adicionar coluna ultima_atualizacao_processamento
ALTER TABLE instacar_campanhas_execucoes
  ADD COLUMN IF NOT EXISTS ultima_atualizacao_processamento TIMESTAMP;

-- Comentários nas colunas
COMMENT ON COLUMN instacar_campanhas_execucoes.pausa_manual IS 
  'TRUE se foi pausada manualmente pelo usuário, FALSE se foi pausada automaticamente (fora do horário). Execuções com pausa_manual=TRUE não são continuadas automaticamente pelo Schedule Trigger.';

COMMENT ON COLUMN instacar_campanhas_execucoes.ultima_atualizacao_processamento IS 
  'Timestamp da última atualização durante processamento. Usado para detectar execuções travadas. Se status=em_andamento e ultima_atualizacao_processamento > 30min, pode estar travada.';

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_execucoes_pausa_manual 
  ON instacar_campanhas_execucoes(pausa_manual) 
  WHERE status_execucao IN ('pausada', 'em_andamento');

CREATE INDEX IF NOT EXISTS idx_execucoes_ultima_atualizacao 
  ON instacar_campanhas_execucoes(ultima_atualizacao_processamento) 
  WHERE status_execucao = 'em_andamento';

-- Atualizar execuções existentes: se status='pausada' e não tem motivo_pausa específico, 
-- assumir que foi pausada automaticamente (pausa_manual=false)
UPDATE instacar_campanhas_execucoes
SET pausa_manual = FALSE
WHERE status_execucao = 'pausada' 
  AND pausa_manual IS NULL;

-- Atualizar execuções em_andamento: definir ultima_atualizacao_processamento como updated_at
UPDATE instacar_campanhas_execucoes
SET ultima_atualizacao_processamento = updated_at
WHERE status_execucao = 'em_andamento' 
  AND ultima_atualizacao_processamento IS NULL;

