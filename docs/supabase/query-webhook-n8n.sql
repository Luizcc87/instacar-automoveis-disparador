-- ============================================================================
-- Query: Ler Webhook N8N do Banco de Dados
-- ============================================================================
-- Este script contém queries para ler a URL do webhook N8N salva na tabela
-- instacar_configuracoes_sistema
-- ============================================================================

-- ============================================================================
-- Opção 1: Usando a função auxiliar obter_configuracao() (RECOMENDADO)
-- ============================================================================
-- Retorna apenas o valor (TEXT) da configuração
-- Retorna NULL se não existir ou estiver inativa

SELECT obter_configuracao('n8n_webhook_url') AS webhook_url;

-- ============================================================================
-- Opção 2: Query direta na tabela (mais detalhes)
-- ============================================================================
-- Retorna todos os campos da configuração (útil para debug)

SELECT 
  id,
  chave,
  valor AS webhook_url,
  tipo,
  descricao,
  categoria,
  sensivel,
  ativo,
  created_at,
  updated_at
FROM instacar_configuracoes_sistema
WHERE chave = 'n8n_webhook_url'
  AND ativo = TRUE;

-- ============================================================================
-- Opção 3: Verificar se o webhook está configurado
-- ============================================================================
-- Retorna TRUE se existe e está ativo, FALSE caso contrário

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM instacar_configuracoes_sistema
      WHERE chave = 'n8n_webhook_url'
        AND ativo = TRUE
        AND valor IS NOT NULL 
        AND valor != ''
    )
    THEN TRUE 
    ELSE FALSE 
  END AS webhook_configurado;

-- ============================================================================
-- Opção 4: Listar todas as configurações da categoria 'n8n'
-- ============================================================================
-- Útil para ver todas as configurações relacionadas ao N8N

SELECT 
  chave,
  valor,
  tipo,
  descricao,
  ativo,
  updated_at
FROM instacar_configuracoes_sistema
WHERE categoria = 'n8n'
  AND ativo = TRUE
ORDER BY chave;

-- ============================================================================
-- Exemplo de uso em código (JavaScript/TypeScript)
-- ============================================================================
-- 
-- // Usando Supabase Client
-- const { data, error } = await supabase
--   .from('instacar_configuracoes_sistema')
--   .select('valor')
--   .eq('chave', 'n8n_webhook_url')
--   .eq('ativo', true)
--   .single();
-- 
-- const webhookUrl = data?.valor || null;
-- 
-- // Ou usando a função SQL
-- const { data, error } = await supabase.rpc('obter_configuracao', {
--   p_chave: 'n8n_webhook_url'
-- });
-- 
-- const webhookUrl = data || null;
-- ============================================================================

