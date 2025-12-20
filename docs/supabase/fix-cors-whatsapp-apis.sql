-- ============================================================================
-- Script de Verificação e Correção: Políticas RLS para instacar_whatsapp_apis
-- Use este script se estiver tendo problemas de CORS ou acesso negado
-- ============================================================================

-- ============================================================================
-- 1. Verificar se a tabela existe
-- ============================================================================

SELECT 
  'Tabela existe:' as status,
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅' ELSE '❌' END as resultado
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'instacar_whatsapp_apis';

-- ============================================================================
-- 2. Verificar se RLS está habilitado
-- ============================================================================

SELECT 
  'RLS habilitado:' as status,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅' ELSE '❌' END as resultado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'instacar_whatsapp_apis';

-- ============================================================================
-- 3. Verificar políticas existentes
-- ============================================================================

SELECT 
  'Políticas existentes:' as status,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'instacar_whatsapp_apis'
ORDER BY policyname;

-- ============================================================================
-- 4. Garantir que RLS está habilitado
-- ============================================================================

ALTER TABLE instacar_whatsapp_apis ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Recriar política para anon users (garantir acesso)
-- ============================================================================

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Anon users can manage whatsapp_apis" ON instacar_whatsapp_apis;

-- Criar política para anon users (interface web)
CREATE POLICY "Anon users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. Garantir política para service role (N8N)
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Service role full access to whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. Verificar resultado final
-- ============================================================================

SELECT 
  'Verificação final:' as status,
  COUNT(*) as total_politicas,
  STRING_AGG(policyname, ', ') as politicas_ativas
FROM pg_policies
WHERE tablename = 'instacar_whatsapp_apis';

-- ============================================================================
-- 8. Teste de acesso (deve retornar dados se houver instâncias)
-- ============================================================================

-- Este SELECT deve funcionar mesmo sem autenticação (anon role)
SELECT 
  'Teste de acesso:' as status,
  COUNT(*) as total_instancias,
  COUNT(*) FILTER (WHERE ativo = true) as instancias_ativas
FROM instacar_whatsapp_apis;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 
-- 1. CORS é configurado no Dashboard do Supabase, não via SQL
-- 2. Vá em Settings → API → CORS e adicione seu domínio
-- 3. Domínio atual: https://instacar-automoveis-disparador.pages.dev
-- 4. Se o erro 502 persistir, pode ser problema temporário do Supabase
-- 5. Verifique status em: https://status.supabase.com
--
-- ============================================================================
