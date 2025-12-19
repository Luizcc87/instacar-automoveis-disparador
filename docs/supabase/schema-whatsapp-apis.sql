-- ============================================================================
-- Schema Supabase - Instâncias de APIs WhatsApp
-- Suporta múltiplas APIs de WhatsApp: Uazapi, Z-API, Evolution, API Oficial, etc.
-- ============================================================================

-- ============================================================================
-- Tabela: instacar_whatsapp_apis
-- Armazena configurações de múltiplas instâncias de APIs WhatsApp
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_whatsapp_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL, -- Nome identificador da instância (ex: "Uazapi Principal", "Z-API Backup", "Evolution Teste")
  tipo_api TEXT NOT NULL CHECK (tipo_api IN ('uazapi', 'zapi', 'evolution', 'whatsapp_oficial', 'outro')), -- Tipo da API
  base_url TEXT NOT NULL, -- URL base da instância (ex: https://fourtakeoff.uazapi.com)
  token TEXT NOT NULL, -- Token/API Key da instância
  ativo BOOLEAN DEFAULT TRUE, -- Se a instância está ativa e disponível
  descricao TEXT, -- Descrição opcional
  configuracao_extra JSONB DEFAULT '{}'::jsonb, -- Configurações específicas da API (ex: instance_id para Evolution, phone_id para API oficial)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(nome) -- Nome deve ser único
);

-- Comentários
COMMENT ON TABLE instacar_whatsapp_apis IS 'Armazena configurações de múltiplas instâncias de APIs WhatsApp (Uazapi, Z-API, Evolution, API Oficial, etc.)';
COMMENT ON COLUMN instacar_whatsapp_apis.nome IS 'Nome identificador único da instância (ex: "Uazapi Principal", "Z-API Backup")';
COMMENT ON COLUMN instacar_whatsapp_apis.tipo_api IS 'Tipo da API: uazapi, zapi, evolution, whatsapp_oficial, outro';
COMMENT ON COLUMN instacar_whatsapp_apis.base_url IS 'URL base da instância (ex: https://fourtakeoff.uazapi.com, https://api.z-api.io)';
COMMENT ON COLUMN instacar_whatsapp_apis.token IS 'Token/API Key da instância (Instance Token para Uazapi, API Key para outras)';
COMMENT ON COLUMN instacar_whatsapp_apis.configuracao_extra IS 'Configurações específicas da API em formato JSON (ex: {"instance_id": "xxx"} para Evolution, {"phone_id": "xxx"} para API oficial)';
COMMENT ON COLUMN instacar_whatsapp_apis.ativo IS 'Se a instância está ativa e disponível para uso';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_whatsapp_apis_updated_at ON instacar_whatsapp_apis;
CREATE TRIGGER update_whatsapp_apis_updated_at
  BEFORE UPDATE ON instacar_whatsapp_apis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_ativo ON instacar_whatsapp_apis(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_nome ON instacar_whatsapp_apis(nome);
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_tipo ON instacar_whatsapp_apis(tipo_api);
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_tipo_ativo ON instacar_whatsapp_apis(tipo_api, ativo) WHERE ativo = true;

-- ============================================================================
-- Migração: Renomear instacar_uazapi_instancias para instacar_whatsapp_apis
-- ============================================================================

-- Se a tabela antiga existir, migrar dados
DO $$
BEGIN
  -- Verificar se tabela antiga existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'instacar_uazapi_instancias'
  ) THEN
    -- Migrar dados da tabela antiga
    INSERT INTO instacar_whatsapp_apis (
      id, nome, tipo_api, base_url, token, ativo, descricao, created_at, updated_at
    )
    SELECT 
      id, 
      nome, 
      'uazapi' as tipo_api, -- Todas as instâncias antigas são Uazapi
      base_url, 
      token, 
      ativo, 
      descricao, 
      created_at, 
      updated_at
    FROM instacar_uazapi_instancias
    ON CONFLICT (nome) DO NOTHING; -- Evitar duplicatas
    
    -- Dropar tabela antiga (comentar se quiser manter por segurança)
    -- DROP TABLE IF EXISTS instacar_uazapi_instancias CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Atualizar campo em instacar_campanhas
-- ============================================================================

-- Renomear coluna se existir com nome antigo
DO $$ 
BEGIN
  -- Se existe uazapi_instancia_id, renomear para whatsapp_api_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'uazapi_instancia_id'
  ) THEN
    ALTER TABLE instacar_campanhas 
      RENAME COLUMN uazapi_instancia_id TO whatsapp_api_id;
    
    -- Atualizar constraint de foreign key
    ALTER TABLE instacar_campanhas
      DROP CONSTRAINT IF EXISTS instacar_campanhas_uazapi_instancia_id_fkey;
    
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT instacar_campanhas_whatsapp_api_id_fkey
      FOREIGN KEY (whatsapp_api_id) 
      REFERENCES instacar_whatsapp_apis(id) 
      ON DELETE SET NULL;
  END IF;
  
  -- Se não existe nenhuma das duas, criar whatsapp_api_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name IN ('uazapi_instancia_id', 'whatsapp_api_id')
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN whatsapp_api_id UUID REFERENCES instacar_whatsapp_apis(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN instacar_campanhas.whatsapp_api_id IS 'ID da instância de API WhatsApp a ser usada para esta campanha. Se NULL, usa a instância padrão configurada.';
  END IF;
END $$;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_campanhas_whatsapp_api ON instacar_campanhas(whatsapp_api_id);

-- ============================================================================
-- Políticas RLS para instacar_whatsapp_apis
-- ============================================================================

ALTER TABLE instacar_whatsapp_apis ENABLE ROW LEVEL SECURITY;

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Service role full access to whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar instâncias
DROP POLICY IF EXISTS "Anon users can manage whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Anon users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Funções auxiliares
-- ============================================================================

-- Obter instâncias ativas por tipo de API
CREATE OR REPLACE FUNCTION obter_instancias_whatsapp_por_tipo(p_tipo_api TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  tipo_api TEXT,
  base_url TEXT,
  token TEXT,
  configuracao_extra JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.nome,
    w.tipo_api,
    w.base_url,
    w.token,
    w.configuracao_extra
  FROM instacar_whatsapp_apis w
  WHERE w.tipo_api = p_tipo_api
    AND w.ativo = TRUE
  ORDER BY w.nome;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obter_instancias_whatsapp_por_tipo(TEXT) IS 'Retorna todas as instâncias ativas de um tipo específico de API WhatsApp';

-- ============================================================================
-- Exemplos de configuração_extra por tipo de API
-- ============================================================================

-- Uazapi: geralmente não precisa de configuracao_extra
-- Exemplo: {}

-- Z-API: pode precisar de instance_id
-- Exemplo: {"instance_id": "instance_123"}

-- Evolution: precisa de instance_id
-- Exemplo: {"instance_id": "evolution_instance_123", "api_key": "optional"}

-- WhatsApp Oficial (Meta): precisa de phone_id, business_account_id
-- Exemplo: {"phone_id": "123456789", "business_account_id": "987654321", "app_id": "xxx", "app_secret": "yyy"}

-- Outro: configuração livre
-- Exemplo: {"custom_field": "value"}
