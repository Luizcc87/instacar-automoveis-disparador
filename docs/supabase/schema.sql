-- ============================================================================
-- Schema Supabase - Instacar Automóveis Disparador
-- Sistema de controle de envios escalonados via WhatsApp
-- ============================================================================

-- Função auxiliar para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Tabela: instacar_clientes_envios
-- Armazena informações dos clientes e controle de envios
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_clientes_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR(15) NOT NULL UNIQUE, -- Normalizado (55XXXXXXXXXXX)
  nome_cliente TEXT,
  email TEXT,
  veiculos JSONB DEFAULT '[]'::jsonb, -- Array de veículos comprados
  primeiro_envio TIMESTAMP,
  ultimo_envio TIMESTAMP,
  total_envios INTEGER DEFAULT 0 CHECK (total_envios >= 0),
  status_whatsapp TEXT CHECK (status_whatsapp IN ('valid', 'invalid', 'unknown')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_clientes_envios IS 'Armazena informações dos clientes e controle de envios de mensagens';
COMMENT ON COLUMN instacar_clientes_envios.telefone IS 'Telefone normalizado no formato 55XXXXXXXXXXX (DDI + DDD + número)';
COMMENT ON COLUMN instacar_clientes_envios.veiculos IS 'Array JSONB com todos os veículos comprados pelo cliente';
COMMENT ON COLUMN instacar_clientes_envios.total_envios IS 'Contador de quantas mensagens foram enviadas para este cliente';
COMMENT ON COLUMN instacar_clientes_envios.status_whatsapp IS 'Status da validação WhatsApp: valid, invalid ou unknown';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_clientes_updated_at ON instacar_clientes_envios;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON instacar_clientes_envios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Tabela: instacar_historico_envios
-- Registra histórico completo de todos os envios realizados
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_historico_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  telefone VARCHAR(15) NOT NULL, -- Redundante mas útil para queries diretas
  mensagem_enviada TEXT,
  veiculo_referencia JSONB, -- Dados do veículo da linha atual
  status_envio TEXT NOT NULL CHECK (status_envio IN ('enviado', 'erro', 'bloqueado')),
  mensagem_erro TEXT,
  planilha_origem TEXT,
  linha_planilha INTEGER,
  timestamp_envio TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_historico_envios IS 'Registra histórico completo de todos os envios de mensagens';
COMMENT ON COLUMN instacar_historico_envios.cliente_id IS 'Referência ao cliente na tabela instacar_clientes_envios';
COMMENT ON COLUMN instacar_historico_envios.telefone IS 'Telefone (redundante para queries diretas sem JOIN)';
COMMENT ON COLUMN instacar_historico_envios.veiculo_referencia IS 'Dados do veículo da linha da planilha que gerou este envio';
COMMENT ON COLUMN instacar_historico_envios.status_envio IS 'Status do envio: enviado, erro ou bloqueado';
COMMENT ON COLUMN instacar_historico_envios.planilha_origem IS 'Identificador da planilha Google Sheets de origem';

-- ============================================================================
-- Tabela: instacar_controle_envios
-- Controla envios diários e métricas
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_controle_envios (
  data DATE PRIMARY KEY,
  total_enviado INTEGER DEFAULT 0 CHECK (total_enviado >= 0),
  total_erros INTEGER DEFAULT 0 CHECK (total_erros >= 0),
  total_duplicados INTEGER DEFAULT 0 CHECK (total_duplicados >= 0),
  total_sem_whatsapp INTEGER DEFAULT 0 CHECK (total_sem_whatsapp >= 0),
  horario_inicio TIMESTAMP,
  horario_fim TIMESTAMP,
  status_processamento TEXT CHECK (status_processamento IN ('em_andamento', 'concluido', 'pausado', 'erro')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_controle_envios IS 'Controla envios diários, limites e métricas de processamento';
COMMENT ON COLUMN instacar_controle_envios.data IS 'Data do controle (chave primária)';
COMMENT ON COLUMN instacar_controle_envios.total_enviado IS 'Total de mensagens enviadas com sucesso no dia';
COMMENT ON COLUMN instacar_controle_envios.total_erros IS 'Total de erros ocorridos no dia';
COMMENT ON COLUMN instacar_controle_envios.total_duplicados IS 'Total de clientes duplicados (já receberam mensagem)';
COMMENT ON COLUMN instacar_controle_envios.total_sem_whatsapp IS 'Total de números sem WhatsApp válido';
COMMENT ON COLUMN instacar_controle_envios.status_processamento IS 'Status do processamento do dia: em_andamento, concluido, pausado ou erro';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_controle_updated_at ON instacar_controle_envios;
CREATE TRIGGER update_controle_updated_at
  BEFORE UPDATE ON instacar_controle_envios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Tabela: instacar_erros_criticos (Dead Letter Queue)
-- Armazena erros críticos para análise e replay
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_erros_criticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES instacar_clientes_envios(id) ON DELETE SET NULL,
  telefone VARCHAR(15),
  tipo_erro TEXT NOT NULL, -- 'uazapi', 'openai', 'supabase', 'sheets', 'outro'
  mensagem_erro TEXT NOT NULL,
  contexto_erro JSONB, -- Dados do contexto quando ocorreu o erro
  stack_trace TEXT,
  tentativas INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'ignorado')),
  reprocessado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE instacar_erros_criticos IS 'Dead Letter Queue - Armazena erros críticos para análise e possível replay';
COMMENT ON COLUMN instacar_erros_criticos.tipo_erro IS 'Tipo do erro: uazapi, openai, supabase, sheets ou outro';
COMMENT ON COLUMN instacar_erros_criticos.contexto_erro IS 'Dados do contexto quando ocorreu o erro (JSONB)';
COMMENT ON COLUMN instacar_erros_criticos.status IS 'Status do erro: pendente, processado ou ignorado';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_erros_updated_at ON instacar_erros_criticos;
CREATE TRIGGER update_erros_updated_at
  BEFORE UPDATE ON instacar_erros_criticos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

