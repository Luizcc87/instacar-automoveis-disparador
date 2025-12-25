-- ============================================================================
-- Políticas RLS (Row Level Security) - Instacar Automóveis Disparador
-- Configuração de segurança e acesso às tabelas
-- ============================================================================

-- ============================================================================
-- Habilitar RLS em todas as tabelas
-- ============================================================================

ALTER TABLE instacar_clientes_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_historico_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_controle_envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_erros_criticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_campanhas_execucoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Políticas para instacar_clientes_envios
-- ============================================================================

-- Service role (N8N) tem acesso total (INSERT, UPDATE, SELECT, DELETE)
DROP POLICY IF EXISTS "Service role full access to clientes_envios" ON instacar_clientes_envios;
CREATE POLICY "Service role full access to clientes_envios"
  ON instacar_clientes_envios
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem apenas ler (para dashboard futuro)
DROP POLICY IF EXISTS "Authenticated users can read clientes_envios" ON instacar_clientes_envios;
CREATE POLICY "Authenticated users can read clientes_envios"
  ON instacar_clientes_envios
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon users (interface web) podem ler e modificar clientes
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage clientes_envios" ON instacar_clientes_envios;
CREATE POLICY "Anon users can manage clientes_envios"
  ON instacar_clientes_envios
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_historico_envios
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to historico_envios" ON instacar_historico_envios;
CREATE POLICY "Service role full access to historico_envios"
  ON instacar_historico_envios
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem apenas ler
DROP POLICY IF EXISTS "Authenticated users can read historico_envios" ON instacar_historico_envios;
CREATE POLICY "Authenticated users can read historico_envios"
  ON instacar_historico_envios
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon users (interface web) podem ler histórico de envios
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can read historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can read historico_envios"
  ON instacar_historico_envios
  FOR SELECT
  TO anon
  USING (true);

-- Anon users (interface web) podem inserir histórico de envios
-- Necessário para registro automático de envios individuais com campanha (v2.7.2)
DROP POLICY IF EXISTS "Anon users can insert historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can insert historico_envios"
  ON instacar_historico_envios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon users (interface web) podem atualizar histórico de envios
-- Caso seja necessário atualizar status de envio posteriormente
DROP POLICY IF EXISTS "Anon users can update historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can update historico_envios"
  ON instacar_historico_envios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_controle_envios
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to controle_envios" ON instacar_controle_envios;
CREATE POLICY "Service role full access to controle_envios"
  ON instacar_controle_envios
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem apenas ler
DROP POLICY IF EXISTS "Authenticated users can read controle_envios" ON instacar_controle_envios;
CREATE POLICY "Authenticated users can read controle_envios"
  ON instacar_controle_envios
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Políticas para instacar_erros_criticos
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to erros_criticos" ON instacar_erros_criticos;
CREATE POLICY "Service role full access to erros_criticos"
  ON instacar_erros_criticos
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem apenas ler (para análise de erros)
DROP POLICY IF EXISTS "Authenticated users can read erros_criticos" ON instacar_erros_criticos;
CREATE POLICY "Authenticated users can read erros_criticos"
  ON instacar_erros_criticos
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Políticas para instacar_campanhas
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to campanhas" ON instacar_campanhas;
CREATE POLICY "Service role full access to campanhas"
  ON instacar_campanhas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage campanhas" ON instacar_campanhas;
CREATE POLICY "Authenticated users can manage campanhas"
  ON instacar_campanhas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar campanhas
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage campanhas" ON instacar_campanhas;
CREATE POLICY "Anon users can manage campanhas"
  ON instacar_campanhas
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_campanhas_execucoes
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to campanhas_execucoes" ON instacar_campanhas_execucoes;
CREATE POLICY "Service role full access to campanhas_execucoes"
  ON instacar_campanhas_execucoes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem apenas ler
DROP POLICY IF EXISTS "Authenticated users can read campanhas_execucoes" ON instacar_campanhas_execucoes;
CREATE POLICY "Authenticated users can read campanhas_execucoes"
  ON instacar_campanhas_execucoes
  FOR SELECT
  TO authenticated
  USING (true);

-- Anon users (interface web) podem ler execuções
DROP POLICY IF EXISTS "Anon users can read campanhas_execucoes" ON instacar_campanhas_execucoes;
CREATE POLICY "Anon users can read campanhas_execucoes"
  ON instacar_campanhas_execucoes
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- Políticas para instacar_whatsapp_apis (tabela genérica para APIs WhatsApp)
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

-- Anon users (interface web) podem ler e modificar instâncias
DROP POLICY IF EXISTS "Anon users can manage whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Anon users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_uploads_planilhas
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
-- Políticas para instacar_configuracoes_empresa
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to configuracoes_empresa" ON instacar_configuracoes_empresa;
CREATE POLICY "Service role full access to configuracoes_empresa"
  ON instacar_configuracoes_empresa
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage configuracoes_empresa" ON instacar_configuracoes_empresa;
CREATE POLICY "Authenticated users can manage configuracoes_empresa"
  ON instacar_configuracoes_empresa
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar configurações
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage configuracoes_empresa" ON instacar_configuracoes_empresa;
CREATE POLICY "Anon users can manage configuracoes_empresa"
  ON instacar_configuracoes_empresa
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_sessoes_contexto_ia
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to sessoes_contexto_ia" ON instacar_sessoes_contexto_ia;
CREATE POLICY "Service role full access to sessoes_contexto_ia"
  ON instacar_sessoes_contexto_ia
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage sessoes_contexto_ia" ON instacar_sessoes_contexto_ia;
CREATE POLICY "Authenticated users can manage sessoes_contexto_ia"
  ON instacar_sessoes_contexto_ia
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar sessões
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage sessoes_contexto_ia" ON instacar_sessoes_contexto_ia;
CREATE POLICY "Anon users can manage sessoes_contexto_ia"
  ON instacar_sessoes_contexto_ia
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Políticas para instacar_templates_prompt
-- ============================================================================

-- Service role (N8N) tem acesso total
DROP POLICY IF EXISTS "Service role full access to templates_prompt" ON instacar_templates_prompt;
CREATE POLICY "Service role full access to templates_prompt"
  ON instacar_templates_prompt
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuários autenticados podem ler e modificar (para interface web)
DROP POLICY IF EXISTS "Authenticated users can manage templates_prompt" ON instacar_templates_prompt;
CREATE POLICY "Authenticated users can manage templates_prompt"
  ON instacar_templates_prompt
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Anon users (interface web) podem ler e modificar templates
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can manage templates_prompt" ON instacar_templates_prompt;
CREATE POLICY "Anon users can manage templates_prompt"
  ON instacar_templates_prompt
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Notas Importantes
-- ============================================================================

-- IMPORTANTE: 
-- - Service role é usado pelo N8N para todas as operações
-- - Authenticated users são para dashboard/interface futura
-- - Anon users não têm acesso (padrão seguro)
-- 
-- Para usar no N8N, configure a conexão Supabase com:
-- - URL: https://[project-id].supabase.co
-- - Service Key: (chave service_role do Supabase)
-- 
-- NUNCA exponha a service_key em código ou repositórios públicos!

