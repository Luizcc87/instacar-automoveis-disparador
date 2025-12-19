-- ============================================================================
-- Fix RLS Policy para instacar_clientes_envios
-- Permite que usuários anônimos (anon) leiam e modifiquem clientes
-- Necessário para a interface web funcionar
-- ============================================================================

-- Adicionar política para anon users lerem e modificarem clientes
DROP POLICY IF EXISTS "Anon users can manage clientes_envios" ON instacar_clientes_envios;
CREATE POLICY "Anon users can manage clientes_envios"
  ON instacar_clientes_envios
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Verificar se a política foi criada
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'instacar_clientes_envios'
ORDER BY policyname;
