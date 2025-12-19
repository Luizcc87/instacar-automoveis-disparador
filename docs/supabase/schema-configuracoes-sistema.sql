-- ============================================================================
-- Schema Supabase - Configurações Globais do Sistema
-- Armazena configurações globais do sistema (webhook N8N, etc.)
-- ============================================================================

-- ============================================================================
-- Tabela: instacar_configuracoes_sistema
-- Armazena configurações globais do sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE, -- Chave única da configuração (ex: 'n8n_webhook_url', 'openai_api_key')
  valor TEXT, -- Valor da configuração (pode ser JSON stringificado para valores complexos)
  tipo TEXT NOT NULL DEFAULT 'text' CHECK (tipo IN ('text', 'url', 'json', 'number', 'boolean', 'secret')), -- Tipo do valor para validação
  descricao TEXT, -- Descrição da configuração
  categoria TEXT DEFAULT 'geral', -- Categoria para agrupar configurações (ex: 'n8n', 'openai', 'geral')
  sensivel BOOLEAN DEFAULT FALSE, -- Se a configuração contém dados sensíveis (tokens, senhas, etc.)
  ativo BOOLEAN DEFAULT TRUE, -- Se a configuração está ativa
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
DROP TRIGGER IF EXISTS update_configuracoes_sistema_updated_at ON instacar_configuracoes_sistema;
CREATE TRIGGER update_configuracoes_sistema_updated_at
  BEFORE UPDATE ON instacar_configuracoes_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_chave ON instacar_configuracoes_sistema(chave);
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_categoria ON instacar_configuracoes_sistema(categoria);
CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_ativo ON instacar_configuracoes_sistema(ativo) WHERE ativo = true;

-- ============================================================================
-- Função auxiliar para obter valor de configuração
-- ============================================================================

CREATE OR REPLACE FUNCTION obter_configuracao(p_chave TEXT)
RETURNS TEXT AS $$
DECLARE
  v_valor TEXT;
BEGIN
  SELECT valor INTO v_valor
  FROM instacar_configuracoes_sistema
  WHERE chave = p_chave
    AND ativo = TRUE;
  
  RETURN v_valor;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION obter_configuracao(TEXT) IS 'Retorna o valor de uma configuração ativa por chave';

-- ============================================================================
-- Função auxiliar para definir valor de configuração
-- ============================================================================

CREATE OR REPLACE FUNCTION definir_configuracao(
  p_chave TEXT,
  p_valor TEXT,
  p_tipo TEXT DEFAULT 'text',
  p_descricao TEXT DEFAULT NULL,
  p_categoria TEXT DEFAULT 'geral',
  p_sensivel BOOLEAN DEFAULT FALSE
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO instacar_configuracoes_sistema (
    chave, valor, tipo, descricao, categoria, sensivel, ativo
  )
  VALUES (
    p_chave, p_valor, p_tipo, p_descricao, p_categoria, p_sensivel, TRUE
  )
  ON CONFLICT (chave) 
  DO UPDATE SET
    valor = EXCLUDED.valor,
    tipo = EXCLUDED.tipo,
    descricao = COALESCE(EXCLUDED.descricao, instacar_configuracoes_sistema.descricao),
    categoria = EXCLUDED.categoria,
    sensivel = EXCLUDED.sensivel,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION definir_configuracao IS 'Define ou atualiza uma configuração do sistema';

-- ============================================================================
-- Inserir configurações padrão (se não existirem)
-- ============================================================================

-- Webhook N8N (exemplo)
INSERT INTO instacar_configuracoes_sistema (chave, valor, tipo, descricao, categoria, sensivel, ativo)
VALUES (
  'n8n_webhook_url',
  NULL,
  'url',
  'URL do webhook do N8N para disparos manuais de campanhas',
  'n8n',
  FALSE,
  TRUE
)
ON CONFLICT (chave) DO NOTHING;

-- ============================================================================
-- Políticas RLS para instacar_configuracoes_sistema
-- ============================================================================

ALTER TABLE instacar_configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to configuracoes_sistema" ON instacar_configuracoes_sistema;
CREATE POLICY "Service role full access to configuracoes_sistema"
  ON instacar_configuracoes_sistema
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar configurações
DROP POLICY IF EXISTS "Anon users can manage configuracoes_sistema" ON instacar_configuracoes_sistema;
CREATE POLICY "Anon users can manage configuracoes_sistema"
  ON instacar_configuracoes_sistema
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Exemplos de uso
-- ============================================================================

-- Obter configuração
-- SELECT obter_configuracao('n8n_webhook_url');

-- Definir configuração
-- SELECT definir_configuracao(
--   'n8n_webhook_url',
--   'https://seu-n8n.com/webhook/campanha',
--   'url',
--   'URL do webhook do N8N',
--   'n8n',
--   FALSE
-- );

-- Listar todas as configurações de uma categoria
-- SELECT chave, valor, tipo, descricao
-- FROM instacar_configuracoes_sistema
-- WHERE categoria = 'n8n' AND ativo = TRUE;
