-- ============================================================================
-- Expansão: Adicionar campos de status e número WhatsApp conectado
-- Adiciona suporte para rastrear status de conexão e número WhatsApp
-- ============================================================================

-- ============================================================================
-- Adicionar campos de status e conexão
-- ============================================================================

-- Status da conexão
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_whatsapp_apis' 
    AND column_name = 'status_conexao'
  ) THEN
    ALTER TABLE instacar_whatsapp_apis 
      ADD COLUMN status_conexao TEXT DEFAULT 'disconnected' 
      CHECK (status_conexao IN ('disconnected', 'connecting', 'connected'));
    
    COMMENT ON COLUMN instacar_whatsapp_apis.status_conexao IS 'Status atual da conexão: disconnected, connecting, connected';
  END IF;
END $$;

-- Número de WhatsApp conectado
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_whatsapp_apis' 
    AND column_name = 'numero_whatsapp'
  ) THEN
    ALTER TABLE instacar_whatsapp_apis 
      ADD COLUMN numero_whatsapp TEXT;
    
    COMMENT ON COLUMN instacar_whatsapp_apis.numero_whatsapp IS 'Número de WhatsApp conectado na instância (formato: 5511999999999)';
  END IF;
END $$;

-- Nome do perfil WhatsApp
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_whatsapp_apis' 
    AND column_name = 'profile_name'
  ) THEN
    ALTER TABLE instacar_whatsapp_apis 
      ADD COLUMN profile_name TEXT;
    
    COMMENT ON COLUMN instacar_whatsapp_apis.profile_name IS 'Nome do perfil WhatsApp conectado';
  END IF;
END $$;

-- Última atualização do status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_whatsapp_apis' 
    AND column_name = 'ultima_atualizacao_status'
  ) THEN
    ALTER TABLE instacar_whatsapp_apis 
      ADD COLUMN ultima_atualizacao_status TIMESTAMP;
    
    COMMENT ON COLUMN instacar_whatsapp_apis.ultima_atualizacao_status IS 'Data/hora da última verificação de status da conexão';
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_status_conexao 
  ON instacar_whatsapp_apis(status_conexao) 
  WHERE status_conexao IN ('connected', 'connecting');

CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_numero_whatsapp 
  ON instacar_whatsapp_apis(numero_whatsapp) 
  WHERE numero_whatsapp IS NOT NULL;

-- ============================================================================
-- Função auxiliar: Atualizar status da instância
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_status_instancia_whatsapp(
  p_instancia_id UUID,
  p_status_conexao TEXT,
  p_numero_whatsapp TEXT DEFAULT NULL,
  p_profile_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE instacar_whatsapp_apis
  SET 
    status_conexao = p_status_conexao,
    numero_whatsapp = COALESCE(p_numero_whatsapp, numero_whatsapp),
    profile_name = COALESCE(p_profile_name, profile_name),
    ultima_atualizacao_status = NOW(),
    updated_at = NOW()
  WHERE id = p_instancia_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION atualizar_status_instancia_whatsapp(UUID, TEXT, TEXT, TEXT) IS 'Atualiza o status de conexão e informações da instância WhatsApp';
