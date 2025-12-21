-- ============================================================================
-- MIGRATION: Modo Teste, Debug e Notificações Admin
-- Data: 2025-12-20
-- Descrição: Adiciona suporte para modo teste, debug e notificações admin
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Adicionar colunas em instacar_campanhas
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  -- Modo Teste
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'modo_teste'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN modo_teste BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'telefones_teste'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN telefones_teste JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Modo Debug
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'modo_debug'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN modo_debug BOOLEAN DEFAULT FALSE;
  END IF;

  -- Notificações
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'telefones_admin'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN telefones_admin JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'notificar_inicio'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN notificar_inicio BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'notificar_erros'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN notificar_erros BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'notificar_conclusao'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN notificar_conclusao BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'notificar_limite'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN notificar_limite BOOLEAN DEFAULT FALSE;
  END IF;

  -- Instância WhatsApp para notificações admin (separada da instância de envio da campanha)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas' AND column_name = 'whatsapp_api_id_admin'
  ) THEN
    ALTER TABLE instacar_campanhas ADD COLUMN whatsapp_api_id_admin UUID REFERENCES instacar_whatsapp_apis(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Comentários
COMMENT ON COLUMN instacar_campanhas.modo_teste IS 'Se TRUE, substitui telefones dos clientes por telefones de teste';
COMMENT ON COLUMN instacar_campanhas.telefones_teste IS 'Array JSON de telefones para modo teste (override de config global)';
COMMENT ON COLUMN instacar_campanhas.modo_debug IS 'Se TRUE, ativa logs detalhados durante execução';
COMMENT ON COLUMN instacar_campanhas.telefones_admin IS 'Array JSON de telefones para notificações admin (override de config global)';
COMMENT ON COLUMN instacar_campanhas.notificar_inicio IS 'Enviar notificação ao iniciar campanha';
COMMENT ON COLUMN instacar_campanhas.notificar_erros IS 'Enviar notificação quando ocorrerem erros críticos';
COMMENT ON COLUMN instacar_campanhas.notificar_conclusao IS 'Enviar notificação ao concluir campanha';
COMMENT ON COLUMN instacar_campanhas.notificar_limite IS 'Enviar notificação ao atingir limite diário';
COMMENT ON COLUMN instacar_campanhas.whatsapp_api_id_admin IS 'Instância WhatsApp específica para enviar notificações admin (separada da instância da campanha para evitar sobrecarga)';

-- ----------------------------------------------------------------------------
-- 2. Adicionar contadores em instacar_campanhas_execucoes
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'total_enviado_teste'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes ADD COLUMN total_enviado_teste INTEGER DEFAULT 0 CHECK (total_enviado_teste >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'total_enviado_debug'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes ADD COLUMN total_enviado_debug INTEGER DEFAULT 0 CHECK (total_enviado_debug >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_campanhas_execucoes' AND column_name = 'total_enviado_normal'
  ) THEN
    ALTER TABLE instacar_campanhas_execucoes ADD COLUMN total_enviado_normal INTEGER DEFAULT 0 CHECK (total_enviado_normal >= 0);
  END IF;
END $$;

COMMENT ON COLUMN instacar_campanhas_execucoes.total_enviado_teste IS 'Total de mensagens enviadas em modo teste';
COMMENT ON COLUMN instacar_campanhas_execucoes.total_enviado_debug IS 'Total de mensagens enviadas em modo debug';
COMMENT ON COLUMN instacar_campanhas_execucoes.total_enviado_normal IS 'Total de mensagens enviadas normalmente (produção)';

-- ----------------------------------------------------------------------------
-- 3. Trigger para sincronizar total_enviado (soma automática)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_total_enviado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_enviado := COALESCE(NEW.total_enviado_teste, 0) +
                       COALESCE(NEW.total_enviado_debug, 0) +
                       COALESCE(NEW.total_enviado_normal, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_total_enviado ON instacar_campanhas_execucoes;
CREATE TRIGGER trigger_sync_total_enviado
  BEFORE INSERT OR UPDATE OF total_enviado_teste, total_enviado_debug, total_enviado_normal
  ON instacar_campanhas_execucoes
  FOR EACH ROW
  EXECUTE FUNCTION sync_total_enviado();

-- ----------------------------------------------------------------------------
-- 4. Adicionar tipo_envio em instacar_historico_envios
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'instacar_historico_envios' AND column_name = 'tipo_envio'
  ) THEN
    ALTER TABLE instacar_historico_envios ADD COLUMN tipo_envio TEXT DEFAULT 'normal' CHECK (tipo_envio IN ('normal', 'teste', 'debug'));
  END IF;
END $$;

COMMENT ON COLUMN instacar_historico_envios.tipo_envio IS 'Tipo de envio: normal (produção), teste (modo teste), debug (modo debug)';

-- ----------------------------------------------------------------------------
-- 5. Índices para performance
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_campanhas_modo_teste ON instacar_campanhas(modo_teste) WHERE modo_teste = TRUE;
CREATE INDEX IF NOT EXISTS idx_campanhas_modo_debug ON instacar_campanhas(modo_debug) WHERE modo_debug = TRUE;
CREATE INDEX IF NOT EXISTS idx_historico_tipo_envio ON instacar_historico_envios(tipo_envio);
CREATE INDEX IF NOT EXISTS idx_execucoes_contadores ON instacar_campanhas_execucoes(total_enviado_teste, total_enviado_debug, total_enviado_normal);

-- ----------------------------------------------------------------------------
-- 6. Criar tabela instacar_configuracoes_sistema se não existir
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS instacar_configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT,
  tipo TEXT NOT NULL DEFAULT 'text' CHECK (tipo IN ('text', 'url', 'json', 'number', 'boolean', 'secret')),
  descricao TEXT,
  categoria TEXT DEFAULT 'geral',
  sensivel BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários
COMMENT ON TABLE instacar_configuracoes_sistema IS 'Armazena configurações globais do sistema (webhooks, API keys, etc.)';
COMMENT ON COLUMN instacar_configuracoes_sistema.chave IS 'Chave única da configuração (ex: n8n_webhook_url, openai_api_key)';
COMMENT ON COLUMN instacar_configuracoes_sistema.valor IS 'Valor da configuração. Para valores complexos, usar JSON stringificado.';
COMMENT ON COLUMN instacar_configuracoes_sistema.tipo IS 'Tipo do valor para validação e formatação (text, url, json, number, boolean, secret)';
COMMENT ON COLUMN instacar_configuracoes_sistema.categoria IS 'Categoria para agrupar configurações relacionadas (ex: n8n, openai, geral)';
COMMENT ON COLUMN instacar_configuracoes_sistema.sensivel IS 'Se a configuração contém dados sensíveis (não exibir em logs, mascarar na UI)';

-- Trigger para updated_at automático
-- Criar função se não existir (CREATE OR REPLACE é idempotente)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_configuracoes_sistema_updated_at ON instacar_configuracoes_sistema;
CREATE TRIGGER update_configuracoes_sistema_updated_at
  BEFORE UPDATE ON instacar_configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave ON instacar_configuracoes_sistema(chave);
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_categoria ON instacar_configuracoes_sistema(categoria);
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_ativo ON instacar_configuracoes_sistema(ativo) WHERE ativo = true;

-- Habilitar RLS se ainda não estiver habilitado
ALTER TABLE instacar_configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Service role full access to configuracoes_sistema" ON instacar_configuracoes_sistema;
CREATE POLICY "Service role full access to configuracoes_sistema"
  ON instacar_configuracoes_sistema
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon users can manage configuracoes_sistema" ON instacar_configuracoes_sistema;
CREATE POLICY "Anon users can manage configuracoes_sistema"
  ON instacar_configuracoes_sistema
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 7. Configurações globais em instacar_configuracoes_sistema
-- ----------------------------------------------------------------------------

-- Inserir configurações apenas se não existirem
INSERT INTO instacar_configuracoes_sistema (chave, valor, tipo, categoria, descricao, sensivel)
VALUES
  ('telefones_teste_global', '[]', 'json', 'teste', 'Telefones para modo teste (array JSON: ["5511999999999"])', false),
  ('telefones_admin_global', '[]', 'json', 'notificacoes', 'Telefones para notificações admin (array JSON)', false),
  ('modo_teste_ativo_global', 'false', 'boolean', 'teste', 'Ativar modo teste globalmente para todas as campanhas', false),
  ('modo_debug_ativo_global', 'false', 'boolean', 'teste', 'Ativar modo debug globalmente para todas as campanhas', false)
ON CONFLICT (chave) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Funções helper para obter configurações com fallback
-- ----------------------------------------------------------------------------

-- Obter telefones de teste (campanha > global)
CREATE OR REPLACE FUNCTION obter_telefones_teste(p_campanha_id UUID)
RETURNS JSONB AS $$
DECLARE
  telefones_campanha JSONB;
  telefones_global JSONB;
BEGIN
  -- Buscar telefones da campanha
  SELECT telefones_teste INTO telefones_campanha
  FROM instacar_campanhas
  WHERE id = p_campanha_id;

  -- Se campanha tem telefones, usar eles
  IF telefones_campanha IS NOT NULL AND jsonb_array_length(telefones_campanha) > 0 THEN
    RETURN telefones_campanha;
  END IF;

  -- Caso contrário, usar global
  SELECT valor::jsonb INTO telefones_global
  FROM instacar_configuracoes_sistema
  WHERE chave = 'telefones_teste_global' AND ativo = TRUE;

  RETURN COALESCE(telefones_global, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Obter telefones admin (campanha > global)
CREATE OR REPLACE FUNCTION obter_telefones_admin(p_campanha_id UUID)
RETURNS JSONB AS $$
DECLARE
  telefones_campanha JSONB;
  telefones_global JSONB;
BEGIN
  -- Buscar telefones da campanha
  SELECT telefones_admin INTO telefones_campanha
  FROM instacar_campanhas
  WHERE id = p_campanha_id;

  -- Se campanha tem telefones, usar eles
  IF telefones_campanha IS NOT NULL AND jsonb_array_length(telefones_campanha) > 0 THEN
    RETURN telefones_campanha;
  END IF;

  -- Caso contrário, usar global
  SELECT valor::jsonb INTO telefones_global
  FROM instacar_configuracoes_sistema
  WHERE chave = 'telefones_admin_global' AND ativo = TRUE;

  RETURN COALESCE(telefones_global, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Verificar se modo teste está ativo (campanha OU global)
CREATE OR REPLACE FUNCTION modo_teste_ativo(p_campanha_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  modo_campanha BOOLEAN;
  modo_global TEXT;
BEGIN
  -- Verificar modo teste da campanha
  SELECT modo_teste INTO modo_campanha
  FROM instacar_campanhas
  WHERE id = p_campanha_id;

  IF modo_campanha = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Verificar modo teste global
  SELECT valor INTO modo_global
  FROM instacar_configuracoes_sistema
  WHERE chave = 'modo_teste_ativo_global' AND ativo = TRUE;

  RETURN COALESCE(modo_global::boolean, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIM DA MIGRATION
-- ============================================================================

