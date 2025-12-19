-- ============================================================================
-- Script de Correção: Criar tabela instacar_uploads_planilhas
-- Execute este script no Editor SQL do Supabase para corrigir o erro 404
-- ============================================================================

-- ============================================================================
-- 1. Criar tabela instacar_uploads_planilhas
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_uploads_planilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('xls', 'xlsx', 'csv', 'txt', 'google_sheets')),
  total_linhas INTEGER DEFAULT 0 CHECK (total_linhas >= 0),
  linhas_processadas INTEGER DEFAULT 0 CHECK (linhas_processadas >= 0),
  linhas_com_erro INTEGER DEFAULT 0 CHECK (linhas_com_erro >= 0),
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro', 'cancelado')),
  erros JSONB DEFAULT '[]'::jsonb, -- Array de erros por linha
  url_google_sheets TEXT, -- URL do Google Sheets (se aplicável)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE instacar_uploads_planilhas IS 'Rastreia uploads de planilhas realizados no sistema';
COMMENT ON COLUMN instacar_uploads_planilhas.nome_arquivo IS 'Nome do arquivo enviado';
COMMENT ON COLUMN instacar_uploads_planilhas.tipo IS 'Tipo do arquivo: xls, xlsx, csv, txt, google_sheets';
COMMENT ON COLUMN instacar_uploads_planilhas.total_linhas IS 'Total de linhas na planilha';
COMMENT ON COLUMN instacar_uploads_planilhas.linhas_processadas IS 'Total de linhas processadas com sucesso';
COMMENT ON COLUMN instacar_uploads_planilhas.linhas_com_erro IS 'Total de linhas com erro';
COMMENT ON COLUMN instacar_uploads_planilhas.status IS 'Status do processamento: processando, concluido, erro, cancelado';
COMMENT ON COLUMN instacar_uploads_planilhas.erros IS 'Array JSONB com detalhes dos erros por linha';
COMMENT ON COLUMN instacar_uploads_planilhas.url_google_sheets IS 'URL do Google Sheets (se aplicável)';

-- ============================================================================
-- 2. Verificar se função update_updated_at_column existe
-- ============================================================================

-- Se a função não existir, criar
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. Criar trigger para updated_at automático
-- ============================================================================

DROP TRIGGER IF EXISTS update_uploads_planilhas_updated_at ON instacar_uploads_planilhas;
CREATE TRIGGER update_uploads_planilhas_updated_at
  BEFORE UPDATE ON instacar_uploads_planilhas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. Criar índices para performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_status ON instacar_uploads_planilhas(status);
CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_created_at ON instacar_uploads_planilhas(created_at DESC);

-- ============================================================================
-- 5. Habilitar RLS e criar políticas
-- ============================================================================

-- Habilitar RLS
ALTER TABLE instacar_uploads_planilhas ENABLE ROW LEVEL SECURITY;

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to uploads_planilhas" ON instacar_uploads_planilhas;
CREATE POLICY "Service role full access to uploads_planilhas"
  ON instacar_uploads_planilhas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage uploads_planilhas" ON instacar_uploads_planilhas;
CREATE POLICY "Authenticated users can manage uploads_planilhas"
  ON instacar_uploads_planilhas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar uploads
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage uploads_planilhas" ON instacar_uploads_planilhas;
CREATE POLICY "Anon users can manage uploads_planilhas"
  ON instacar_uploads_planilhas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. Verificar se campos adicionais em instacar_clientes_envios existem
-- ============================================================================

-- Adicionar campo ultima_atualizacao_planilha se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'ultima_atualizacao_planilha'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN ultima_atualizacao_planilha TIMESTAMP;
    COMMENT ON COLUMN instacar_clientes_envios.ultima_atualizacao_planilha IS 'Data da última atualização via upload de planilha';
  END IF;
END $$;

-- Adicionar campo fonte_dados se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'fonte_dados'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN fonte_dados TEXT;
    COMMENT ON COLUMN instacar_clientes_envios.fonte_dados IS 'Fonte dos dados: upload_manual, google_sheets, api, etc.';
  END IF;
END $$;

-- ============================================================================
-- Script concluído!
-- ============================================================================
-- 
-- Após executar este script, a tabela instacar_uploads_planilhas estará
-- disponível e o upload de planilhas XLSX funcionará corretamente.
--
-- Para verificar se foi criada corretamente, execute:
-- SELECT * FROM instacar_uploads_planilhas LIMIT 1;
-- ============================================================================
