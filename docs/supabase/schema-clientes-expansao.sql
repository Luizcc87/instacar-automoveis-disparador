-- ============================================================================
-- Schema Supabase - Expansão da Tabela de Clientes
-- Adiciona campos para observações internas e controle de ativação
-- ============================================================================

-- ============================================================================
-- Adicionar campo ativo (soft delete)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'ativo'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN ativo BOOLEAN DEFAULT TRUE;
    
    -- Comentário na coluna
    COMMENT ON COLUMN instacar_clientes_envios.ativo IS 'Indica se o cliente está ativo (true) ou desativado (false - soft delete)';
    
    -- Criar índice para performance em consultas de clientes ativos
    CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON instacar_clientes_envios(ativo) WHERE ativo = true;
  END IF;
END $$;

-- ============================================================================
-- Adicionar campo observacoes_internas (histórico de observações)
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'observacoes_internas'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN observacoes_internas JSONB DEFAULT '[]'::jsonb;
    
    -- Comentário na coluna
    COMMENT ON COLUMN instacar_clientes_envios.observacoes_internas IS 'Array JSONB com histórico de observações internas sobre o cliente. Estrutura: [{"id": "uuid", "texto": "...", "autor": "...", "timestamp": "..."}]';
  END IF;
END $$;

-- ============================================================================
-- Garantir que todos os registros existentes tenham ativo = true
-- ============================================================================

UPDATE instacar_clientes_envios 
SET ativo = TRUE 
WHERE ativo IS NULL;

-- ============================================================================
-- Garantir que todos os registros existentes tenham observacoes_internas = []
-- ============================================================================

UPDATE instacar_clientes_envios 
SET observacoes_internas = '[]'::jsonb 
WHERE observacoes_internas IS NULL;
