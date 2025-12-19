-- ============================================================================
-- Schema Supabase - Sistema de Upload de Planilhas
-- Extensão do schema base para suportar upload e gerenciamento de planilhas
-- ============================================================================

-- ============================================================================
-- Modificações em instacar_clientes_envios
-- ============================================================================

-- Adicionar campo ultima_atualizacao_planilha
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'ultima_atualizacao_planilha'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN ultima_atualizacao_planilha TIMESTAMP;
  END IF;
END $$;

-- Adicionar campo fonte_dados
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_clientes_envios' 
    AND column_name = 'fonte_dados'
  ) THEN
    ALTER TABLE instacar_clientes_envios 
      ADD COLUMN fonte_dados TEXT;
  END IF;
END $$;

-- Nota: Os campos ultima_campanha_id e ultima_campanha_data já são criados
-- no schema-campanhas.sql, então não precisamos criá-los aqui novamente

-- Comentários para colunas adicionadas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_clientes_envios' AND column_name = 'ultima_atualizacao_planilha') THEN
    COMMENT ON COLUMN instacar_clientes_envios.ultima_atualizacao_planilha IS 'Data da última atualização via upload de planilha';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_clientes_envios' AND column_name = 'fonte_dados') THEN
    COMMENT ON COLUMN instacar_clientes_envios.fonte_dados IS 'Fonte dos dados: upload_manual, google_sheets, api, etc.';
  END IF;
  
  -- Comentários para ultima_campanha_id e ultima_campanha_data já existem em schema-campanhas.sql
END $$;

-- ============================================================================
-- Tabela: instacar_uploads_planilhas
-- Rastreia uploads de planilhas realizados
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

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_uploads_planilhas_updated_at ON instacar_uploads_planilhas;
CREATE TRIGGER update_uploads_planilhas_updated_at
  BEFORE UPDATE ON instacar_uploads_planilhas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_status ON instacar_uploads_planilhas(status);
CREATE INDEX IF NOT EXISTS idx_uploads_planilhas_created_at ON instacar_uploads_planilhas(created_at DESC);

-- ============================================================================
-- Função: merge_veiculos_cliente
-- Faz merge de veículos para um cliente, evitando duplicatas
-- ============================================================================

CREATE OR REPLACE FUNCTION merge_veiculos_cliente(
  cliente_telefone VARCHAR(15),
  novos_veiculos JSONB
)
RETURNS JSONB AS $$
DECLARE
  veiculos_existentes JSONB;
  veiculos_combinados JSONB;
  veiculo_novo JSONB;
  veiculo_existente JSONB;
  ja_existe BOOLEAN;
BEGIN
  -- Buscar veículos existentes do cliente
  SELECT veiculos INTO veiculos_existentes
  FROM instacar_clientes_envios
  WHERE telefone = cliente_telefone;
  
  -- Se cliente não existe, retornar apenas os novos veículos
  IF veiculos_existentes IS NULL THEN
    RETURN novos_veiculos;
  END IF;
  
  -- Inicializar com veículos existentes
  veiculos_combinados := veiculos_existentes;
  
  -- Para cada novo veículo, verificar se já existe
  FOR veiculo_novo IN SELECT * FROM jsonb_array_elements(novos_veiculos)
  LOOP
    ja_existe := FALSE;
    
    -- Verificar se já existe por placa ou modelo+ano
    FOR veiculo_existente IN SELECT * FROM jsonb_array_elements(veiculos_existentes)
    LOOP
      -- Comparar por placa (se ambos tiverem)
      IF (veiculo_novo->>'placa' IS NOT NULL AND veiculo_existente->>'placa' IS NOT NULL) THEN
        IF veiculo_novo->>'placa' = veiculo_existente->>'placa' THEN
          ja_existe := TRUE;
          EXIT;
        END IF;
      END IF;
      
      -- Comparar por modelo + ano (se ambos tiverem)
      IF (veiculo_novo->>'modelo' IS NOT NULL AND veiculo_existente->>'modelo' IS NOT NULL) THEN
        IF veiculo_novo->>'modelo' = veiculo_existente->>'modelo' 
           AND veiculo_novo->>'ano' = veiculo_existente->>'ano' THEN
          ja_existe := TRUE;
          EXIT;
        END IF;
      END IF;
    END LOOP;
    
    -- Se não existe, adicionar
    IF NOT ja_existe THEN
      veiculos_combinados := veiculos_combinados || jsonb_build_array(
        veiculo_novo || jsonb_build_object('data_aquisicao', NOW()::TEXT)
      );
    END IF;
  END LOOP;
  
  RETURN veiculos_combinados;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION merge_veiculos_cliente IS 'Faz merge de veículos para um cliente, evitando duplicatas por placa ou modelo+ano';
