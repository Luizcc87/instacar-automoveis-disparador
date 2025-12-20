-- ============================================================================
-- FIX: Adicionar política RLS para usuários anônimos na tabela instacar_historico_envios
-- Execute no SQL Editor do Supabase para permitir que a interface web leia o histórico
-- ============================================================================

-- Anon users (interface web) podem ler histórico de envios
-- NOTA: Em produção, considere adicionar autenticação para maior segurança
DROP POLICY IF EXISTS "Anon users can read historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can read historico_envios"
  ON instacar_historico_envios
  FOR SELECT
  TO anon
  USING (true);

-- Verificar se a política foi criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'instacar_historico_envios'
ORDER BY policyname;
