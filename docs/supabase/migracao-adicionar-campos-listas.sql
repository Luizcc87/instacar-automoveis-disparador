-- ============================================================================
-- Migração: Adicionar Campos de Listas nas Tabelas Existentes
-- Adiciona campos lista_id, lote_id, execucao_lista_id nas tabelas existentes
-- ============================================================================

-- ============================================================================
-- Adicionar campo lista_id em instacar_campanhas
-- ============================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'lista_id'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN lista_id UUID REFERENCES instacar_listas(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN instacar_campanhas.lista_id IS 'Referência à lista de clientes vinculada a esta campanha (opcional)';
  END IF;
END $$;

-- ============================================================================
-- Adicionar campos de lista em instacar_historico_envios
-- ============================================================================

DO $$ 
BEGIN
  -- Adicionar lista_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_historico_envios' 
    AND column_name = 'lista_id'
  ) THEN
    ALTER TABLE instacar_historico_envios 
      ADD COLUMN lista_id UUID REFERENCES instacar_listas(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN instacar_historico_envios.lista_id IS 'Referência à lista que gerou este envio';
  END IF;
  
  -- Adicionar lote_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_historico_envios' 
    AND column_name = 'lote_id'
  ) THEN
    ALTER TABLE instacar_historico_envios 
      ADD COLUMN lote_id UUID REFERENCES instacar_listas_lotes(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN instacar_historico_envios.lote_id IS 'Referência ao lote que gerou este envio (se aplicável)';
  END IF;
  
  -- Adicionar execucao_lista_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_historico_envios' 
    AND column_name = 'execucao_lista_id'
  ) THEN
    ALTER TABLE instacar_historico_envios 
      ADD COLUMN execucao_lista_id UUID REFERENCES instacar_listas_execucoes(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN instacar_historico_envios.execucao_lista_id IS 'Referência à execução da lista que gerou este envio';
  END IF;
END $$;

-- ============================================================================
-- Criar índices para os novos campos (performance)
-- ============================================================================

-- Índice para buscar envios por lista
CREATE INDEX IF NOT EXISTS idx_historico_lista_id 
  ON instacar_historico_envios(lista_id) 
  WHERE lista_id IS NOT NULL;

-- Índice para buscar envios por lote
CREATE INDEX IF NOT EXISTS idx_historico_lote_id 
  ON instacar_historico_envios(lote_id) 
  WHERE lote_id IS NOT NULL;

-- Índice para buscar envios por execução de lista
CREATE INDEX IF NOT EXISTS idx_historico_execucao_lista_id 
  ON instacar_historico_envios(execucao_lista_id) 
  WHERE execucao_lista_id IS NOT NULL;

-- Índice para buscar campanhas por lista
CREATE INDEX IF NOT EXISTS idx_campanhas_lista_id 
  ON instacar_campanhas(lista_id) 
  WHERE lista_id IS NOT NULL;

