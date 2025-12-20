-- ============================================================================
-- Schema: Adicionar Campo de Bloqueio de Envios
-- Adiciona campo bloqueado_envios na tabela instacar_clientes_envios
-- ============================================================================

-- Adicionar coluna bloqueado_envios
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'bloqueado_envios'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN bloqueado_envios BOOLEAN DEFAULT FALSE NOT NULL;
    
    -- Comentário na coluna
    COMMENT ON COLUMN instacar_clientes_envios.bloqueado_envios IS 'Indica se o cliente está bloqueado para receber mensagens (opt-out ou decisão da empresa). Clientes bloqueados nunca recebem mensagens, mesmo que estejam selecionados em campanhas.';
  END IF;
END $$;

-- Criar índice para performance (filtros frequentes)
CREATE INDEX IF NOT EXISTS idx_clientes_bloqueado_envios 
  ON instacar_clientes_envios(bloqueado_envios) 
  WHERE bloqueado_envios = false;

-- Comentário explicativo
COMMENT ON INDEX idx_clientes_bloqueado_envios IS 'Índice para otimizar queries que filtram clientes não bloqueados (bloqueado_envios = false)';

