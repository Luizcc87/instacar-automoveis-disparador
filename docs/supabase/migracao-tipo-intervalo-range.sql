-- ============================================================================
-- Migração: Adicionar suporte a ranges de intervalo para opções pré-definidas
-- ============================================================================
-- Data: Dezembro 2025
-- Descrição: Adiciona campo tipo_intervalo para identificar opções pré-definidas
--            e permite usar ranges completos (ex: 50-120s) ao invés de valores fixos
-- ============================================================================

-- Adicionar coluna tipo_intervalo
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'tipo_intervalo'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN tipo_intervalo TEXT;
    
    -- Adicionar constraint CHECK
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT check_tipo_intervalo 
      CHECK (
        tipo_intervalo IS NULL 
        OR tipo_intervalo IN ('muito_curto', 'curto', 'medio', 'longo', 'muito_longo', 'padrao', 'personalizado')
      );
    
    -- Comentário
    COMMENT ON COLUMN instacar_campanhas.tipo_intervalo IS 
      'Tipo de intervalo pré-definido. NULL = usa intervalo_envios_segundos como valor fixo. Valores: muito_curto (1-5s), curto (5-20s), medio (20-50s), longo (50-120s), muito_longo (120-300s), padrao (130-150s), personalizado (usa intervalo_envios_segundos)';
  END IF;
END $$;

