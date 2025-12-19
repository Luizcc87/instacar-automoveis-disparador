-- ============================================================================
-- Script de Correção: Criar tabela instacar_whatsapp_apis
-- Execute este script no Editor SQL do Supabase para corrigir o erro 404
-- 
-- ⚠️ NOTA: Este é um script de correção de emergência.
-- Para instalação normal, use: schema-whatsapp-apis.sql
-- 
-- Use este script APENAS se:
-- 1. Você recebeu erro 404 ao tentar acessar instacar_whatsapp_apis
-- 2. A tabela não foi criada corretamente pelo schema principal
-- 3. Você precisa de uma view de compatibilidade para código legado
-- 
-- Para instalação normal, execute na ordem:
-- 1. schema-whatsapp-apis.sql
-- 2. schema-whatsapp-apis-status.sql
-- ============================================================================

-- ============================================================================
-- 1. Verificar se função update_updated_at_column existe
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Criar tabela instacar_whatsapp_apis
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

-- ============================================================================
-- 3. Criar trigger para updated_at automático
-- ============================================================================

DROP TRIGGER IF EXISTS update_whatsapp_apis_updated_at ON instacar_whatsapp_apis;
CREATE TRIGGER update_whatsapp_apis_updated_at
  BEFORE UPDATE ON instacar_whatsapp_apis
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Criar índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_ativo ON instacar_whatsapp_apis(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_nome ON instacar_whatsapp_apis(nome);
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_tipo ON instacar_whatsapp_apis(tipo_api);
CREATE INDEX IF NOT EXISTS idx_whatsapp_apis_tipo_ativo ON instacar_whatsapp_apis(tipo_api, ativo) WHERE ativo = true;

-- ============================================================================
-- 5. Migração: Verificar se existe tabela antiga instacar_uazapi_instancias
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
    
    RAISE NOTICE 'Dados migrados de instacar_uazapi_instancias para instacar_whatsapp_apis';
  END IF;
END $$;

-- ============================================================================
-- 6. Habilitar RLS e criar políticas
-- ============================================================================

-- Habilitar RLS
ALTER TABLE instacar_whatsapp_apis ENABLE ROW LEVEL SECURITY;

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Service role full access to whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Authenticated users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar instâncias
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Anon users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. Criar view de compatibilidade (opcional - para código legado)
-- ============================================================================

-- Criar view que mapeia instacar_uazapi_instancias para instacar_whatsapp_apis
-- Isso permite que código legado continue funcionando temporariamente
CREATE OR REPLACE VIEW instacar_uazapi_instancias AS
SELECT 
  id,
  nome,
  base_url,
  token,
  ativo,
  descricao,
  created_at,
  updated_at
FROM instacar_whatsapp_apis
WHERE tipo_api = 'uazapi';

-- Comentário na view
COMMENT ON VIEW instacar_uazapi_instancias IS 'View de compatibilidade para código legado. Use instacar_whatsapp_apis diretamente.';

-- ============================================================================
-- Script concluído!
-- ============================================================================
-- 
-- Após executar este script, a tabela instacar_whatsapp_apis estará
-- disponível e a interface web funcionará corretamente.
--
-- NOTA: A view instacar_uazapi_instancias foi criada para compatibilidade
-- com código legado, mas recomenda-se atualizar o código para usar
-- instacar_whatsapp_apis diretamente.
--
-- Para verificar se foi criada corretamente, execute:
-- SELECT * FROM instacar_whatsapp_apis LIMIT 1;
-- ============================================================================
