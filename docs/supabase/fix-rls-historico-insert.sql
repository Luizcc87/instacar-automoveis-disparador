-- ============================================================================
-- Fix RLS: Permitir INSERT de histórico de envios para usuários anônimos
-- ============================================================================
-- Este script adiciona uma política RLS que permite que usuários anônimos
-- (interface web) insiram registros na tabela instacar_historico_envios.
-- 
-- Necessário para: Registro automático de envios individuais com campanha
-- Versão: 2.7.2 (Dezembro 2025)
-- ============================================================================

-- Adicionar política para permitir INSERT de histórico de envios para anon users
DROP POLICY IF EXISTS "Anon users can insert historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can insert historico_envios"
  ON instacar_historico_envios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Adicionar política para permitir UPDATE de histórico de envios para anon users
-- (caso seja necessário atualizar status de envio posteriormente)
DROP POLICY IF EXISTS "Anon users can update historico_envios" ON instacar_historico_envios;
CREATE POLICY "Anon users can update historico_envios"
  ON instacar_historico_envios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Verificação
-- ============================================================================
-- Execute a query abaixo para verificar se as políticas foram criadas:
--
-- SELECT policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'instacar_historico_envios'
-- ORDER BY policyname;
--
-- Deve retornar pelo menos:
-- - Service role full access to historico_envios (service_role) - ALL
-- - Authenticated users can read historico_envios (authenticated) - SELECT
-- - Anon users can read historico_envios (anon) - SELECT
-- - Anon users can insert historico_envios (anon) - INSERT ← NOVO
-- - Anon users can update historico_envios (anon) - UPDATE ← NOVO
-- ============================================================================

