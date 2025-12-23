-- ============================================================================
-- Schema Supabase - Sistema de Campanhas WhatsApp
-- Extensão do schema base para suportar múltiplas campanhas ao longo do ano
-- ============================================================================

-- ============================================================================
-- Função auxiliar para atualizar updated_at automaticamente
-- (Criada aqui para garantir que existe, mesmo se schema.sql não foi executado)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Tabela: instacar_campanhas
-- Armazena configuração de campanhas de marketing
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  periodo_ano TEXT NOT NULL, -- 'janeiro', 'fevereiro', 'black-friday', 'dia-maes', etc.
  template_mensagem TEXT, -- Template base (opcional, pode ser usado como fallback)
  prompt_ia TEXT NOT NULL, -- Prompt personalizado para a IA gerar mensagens
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'concluida', 'cancelada')),
  limite_envios_dia INTEGER DEFAULT 200 CHECK (limite_envios_dia > 0),
  agendamento_cron TEXT, -- Expressão cron para execução automática (ex: "0 9 * * 1-5")
  intervalo_minimo_dias INTEGER DEFAULT 30, -- Intervalo mínimo entre envios para o mesmo cliente
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  usar_veiculos BOOLEAN DEFAULT TRUE,
  usar_vendedor BOOLEAN DEFAULT FALSE
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_campanhas IS 'Armazena configuração de campanhas de marketing via WhatsApp';
COMMENT ON COLUMN instacar_campanhas.periodo_ano IS 'Período do ano: janeiro, fevereiro, black-friday, dia-maes, dia-pais, natal, ano-novo, etc.';
COMMENT ON COLUMN instacar_campanhas.prompt_ia IS 'Prompt personalizado para a IA gerar mensagens específicas desta campanha';
COMMENT ON COLUMN instacar_campanhas.agendamento_cron IS 'Expressão cron para execução automática (ex: "0 9 * * 1-5" = 9h, dias úteis)';
COMMENT ON COLUMN instacar_campanhas.intervalo_minimo_dias IS 'Intervalo mínimo em dias entre envios para o mesmo cliente (evita spam)';
COMMENT ON COLUMN instacar_campanhas.usar_veiculos IS 'Se TRUE, inclui dados de veículos no contexto da IA. Se FALSE, não menciona veículos (útil para campanhas genéricas como Natal/Ano Novo)';
COMMENT ON COLUMN instacar_campanhas.usar_vendedor IS 'Se TRUE, inclui nome do vendedor do veículo mais recente no contexto da IA. Se FALSE, não menciona vendedor';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_campanhas_updated_at ON instacar_campanhas;
CREATE TRIGGER update_campanhas_updated_at
  BEFORE UPDATE ON instacar_campanhas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Adicionar colunas novas em instacar_campanhas (se tabela já existe)
-- ============================================================================

-- Adicionar coluna intervalo_envios_segundos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'intervalo_envios_segundos'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN intervalo_envios_segundos INTEGER;
    
    -- Adicionar constraint CHECK
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT check_intervalo_envios_segundos 
      CHECK (intervalo_envios_segundos IS NULL OR (intervalo_envios_segundos >= 1 AND intervalo_envios_segundos <= 300));
  END IF;
END $$;

-- Adicionar coluna prioridade
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'prioridade'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN prioridade INTEGER DEFAULT 5;
    
    -- Adicionar constraint CHECK
    ALTER TABLE instacar_campanhas
      ADD CONSTRAINT check_prioridade 
      CHECK (prioridade >= 1 AND prioridade <= 10);
  END IF;
END $$;

-- Adicionar colunas usar_veiculos e usar_vendedor
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'usar_veiculos'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN usar_veiculos BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'usar_vendedor'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN usar_vendedor BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Comentários para colunas adicionadas (após criação)
DO $$
BEGIN
  -- Comentar coluna intervalo_envios_segundos se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'intervalo_envios_segundos'
  ) THEN
    COMMENT ON COLUMN instacar_campanhas.intervalo_envios_segundos IS 'Intervalo fixo entre envios em segundos (opcional). Se NULL, usa padrão aleatorizado 130-150s. Mínimo: 60s, Máximo: 300s';
  END IF;
  
  -- Comentar coluna prioridade se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'prioridade'
  ) THEN
    COMMENT ON COLUMN instacar_campanhas.prioridade IS 'Prioridade 1-10. Quando cliente elegível para múltiplas campanhas, maior prioridade é processada primeiro';
  END IF;
  
  -- Comentar coluna usar_veiculos se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'usar_veiculos'
  ) THEN
    COMMENT ON COLUMN instacar_campanhas.usar_veiculos IS 'Se TRUE, inclui dados de veículos no contexto da IA. Se FALSE, não menciona veículos (útil para campanhas genéricas como Natal/Ano Novo)';
  END IF;
  
  -- Comentar coluna usar_vendedor se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'usar_vendedor'
  ) THEN
    COMMENT ON COLUMN instacar_campanhas.usar_vendedor IS 'Se TRUE, inclui nome do vendedor do veículo mais recente no contexto da IA. Se FALSE, não menciona vendedor';
  END IF;
END $$;

-- ============================================================================
-- Tabela: instacar_campanhas_execucoes
-- Registra cada execução de uma campanha (quando foi rodada)
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_campanhas_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES instacar_campanhas(id) ON DELETE CASCADE,
  data_execucao DATE NOT NULL,
  total_enviado INTEGER DEFAULT 0 CHECK (total_enviado >= 0),
  total_erros INTEGER DEFAULT 0 CHECK (total_erros >= 0),
  total_duplicados INTEGER DEFAULT 0 CHECK (total_duplicados >= 0),
  total_sem_whatsapp INTEGER DEFAULT 0 CHECK (total_sem_whatsapp >= 0),
  status_execucao TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status_execucao IN ('em_andamento', 'concluida', 'pausada', 'erro')),
  trigger_tipo TEXT NOT NULL CHECK (trigger_tipo IN ('manual', 'cron', 'webhook')),
  horario_inicio TIMESTAMP DEFAULT NOW(),
  horario_fim TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campanha_id, data_execucao) -- Uma campanha só pode ser executada uma vez por dia
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_campanhas_execucoes IS 'Registra cada execução de uma campanha (quando foi rodada)';
COMMENT ON COLUMN instacar_campanhas_execucoes.data_execucao IS 'Data da execução (chave única combinada com campanha_id)';
COMMENT ON COLUMN instacar_campanhas_execucoes.trigger_tipo IS 'Tipo de trigger que iniciou a execução: manual, cron ou webhook';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_execucoes_updated_at ON instacar_campanhas_execucoes;
CREATE TRIGGER update_execucoes_updated_at
  BEFORE UPDATE ON instacar_campanhas_execucoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Adicionar colunas novas em instacar_campanhas_execucoes (se tabela já existe)
-- ============================================================================

-- Adicionar coluna total_contatos_elegiveis
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'total_contatos_elegiveis'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN total_contatos_elegiveis INTEGER DEFAULT 0;
    
    ALTER TABLE instacar_campanhas_execucoes
      ADD CONSTRAINT check_total_contatos_elegiveis 
      CHECK (total_contatos_elegiveis >= 0);
  END IF;
END $$;

-- Adicionar coluna contatos_processados
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'contatos_processados'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN contatos_processados INTEGER DEFAULT 0;
    
    ALTER TABLE instacar_campanhas_execucoes
      ADD CONSTRAINT check_contatos_processados 
      CHECK (contatos_processados >= 0);
  END IF;
END $$;

-- Adicionar coluna contatos_pendentes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'contatos_pendentes'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN contatos_pendentes INTEGER DEFAULT 0;
    
    ALTER TABLE instacar_campanhas_execucoes
      ADD CONSTRAINT check_contatos_pendentes 
      CHECK (contatos_pendentes >= 0);
  END IF;
END $$;

-- Adicionar coluna dias_processamento
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'dias_processamento'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN dias_processamento INTEGER DEFAULT 1;
    
    ALTER TABLE instacar_campanhas_execucoes
      ADD CONSTRAINT check_dias_processamento 
      CHECK (dias_processamento >= 1);
  END IF;
END $$;

-- Adicionar coluna data_inicio_processamento
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'data_inicio_processamento'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN data_inicio_processamento DATE;
  END IF;
END $$;

-- Adicionar coluna data_fim_estimada
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas_execucoes' 
    AND column_name = 'data_fim_estimada'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes 
      ADD COLUMN data_fim_estimada DATE;
  END IF;
END $$;

-- Comentários para colunas adicionadas (após criação)
DO $$
BEGIN
  -- Comentar colunas se existirem
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'total_contatos_elegiveis') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.total_contatos_elegiveis IS 'Total de contatos elegíveis para receber a campanha';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'contatos_processados') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.contatos_processados IS 'Total de contatos já processados nesta execução';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'contatos_pendentes') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.contatos_pendentes IS 'Total de contatos ainda pendentes de processamento';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'dias_processamento') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.dias_processamento IS 'Número de dias úteis necessários para processar todos os contatos';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'data_inicio_processamento') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.data_inicio_processamento IS 'Data de início do processamento (primeiro dia)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'data_fim_estimada') THEN
    COMMENT ON COLUMN instacar_campanhas_execucoes.data_fim_estimada IS 'Data estimada de conclusão do processamento';
  END IF;
END $$;

-- ============================================================================
-- Modificações nas tabelas existentes
-- ============================================================================

-- Adicionar campos de campanha em instacar_historico_envios
ALTER TABLE instacar_historico_envios
  ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execucao_id UUID REFERENCES instacar_campanhas_execucoes(id) ON DELETE SET NULL;

-- Comentários
COMMENT ON COLUMN instacar_historico_envios.campanha_id IS 'Referência à campanha que gerou este envio';
COMMENT ON COLUMN instacar_historico_envios.execucao_id IS 'Referência à execução específica da campanha';

-- Adicionar campo de campanha em instacar_controle_envios
ALTER TABLE instacar_controle_envios
  ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL;

-- Comentário
COMMENT ON COLUMN instacar_controle_envios.campanha_id IS 'Referência à campanha (NULL = controle geral do sistema)';

-- Adicionar campo de última campanha em instacar_clientes_envios
ALTER TABLE instacar_clientes_envios
  ADD COLUMN IF NOT EXISTS ultima_campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ultima_campanha_data TIMESTAMP;

-- Comentários
COMMENT ON COLUMN instacar_clientes_envios.ultima_campanha_id IS 'ID da última campanha enviada para este cliente';
COMMENT ON COLUMN instacar_clientes_envios.ultima_campanha_data IS 'Data/hora do último envio de campanha para este cliente';

-- ============================================================================
-- Funções auxiliares úteis
-- ============================================================================

-- Função para verificar se cliente já recebeu uma campanha específica
CREATE OR REPLACE FUNCTION cliente_recebeu_campanha(
  p_telefone VARCHAR(15),
  p_campanha_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM instacar_historico_envios 
    WHERE telefone = p_telefone 
      AND campanha_id = p_campanha_id
      AND status_envio = 'enviado'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para obter última campanha enviada para um cliente
CREATE OR REPLACE FUNCTION obter_ultima_campanha_cliente(
  p_telefone VARCHAR(15)
)
RETURNS TABLE (
  campanha_id UUID,
  campanha_nome TEXT,
  data_envio TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.campanha_id,
    c.nome,
    h.timestamp_envio
  FROM instacar_historico_envios h
  LEFT JOIN instacar_campanhas c ON c.id = h.campanha_id
  WHERE h.telefone = p_telefone
    AND h.status_envio = 'enviado'
    AND h.campanha_id IS NOT NULL
  ORDER BY h.timestamp_envio DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para verificar se pode enviar campanha (respeita intervalo mínimo)
CREATE OR REPLACE FUNCTION pode_enviar_campanha(
  p_telefone VARCHAR(15),
  p_campanha_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_ultima_data TIMESTAMP;
  v_intervalo_minimo INTEGER;
BEGIN
  -- Verifica se já recebeu esta campanha específica
  IF cliente_recebeu_campanha(p_telefone, p_campanha_id) THEN
    RETURN FALSE;
  END IF;

  -- Obtém intervalo mínimo da campanha
  SELECT intervalo_minimo_dias INTO v_intervalo_minimo
  FROM instacar_campanhas
  WHERE id = p_campanha_id;

  -- Obtém data da última campanha enviada
  SELECT ultima_campanha_data INTO v_ultima_data
  FROM instacar_clientes_envios
  WHERE telefone = p_telefone;

  -- Se nunca recebeu campanha, pode enviar
  IF v_ultima_data IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Verifica se passou o intervalo mínimo
  RETURN (NOW() - v_ultima_data) >= (v_intervalo_minimo || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
