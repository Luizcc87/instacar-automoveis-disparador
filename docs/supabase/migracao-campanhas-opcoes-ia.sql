-- ============================================================================
-- Script de Migração: Adicionar valores padrão às campanhas existentes
-- Executar APÓS criar as colunas usar_veiculos e usar_vendedor
-- ============================================================================

-- Atualizar todas as campanhas existentes com defaults
UPDATE instacar_campanhas
SET
  usar_veiculos = COALESCE(usar_veiculos, TRUE),
  usar_vendedor = COALESCE(usar_vendedor, FALSE)
WHERE usar_veiculos IS NULL OR usar_vendedor IS NULL;

-- Verificar resultado
SELECT
  id,
  nome,
  periodo_ano,
  usar_veiculos,
  usar_vendedor,
  created_at
FROM instacar_campanhas
ORDER BY created_at DESC;

-- Contar campanhas atualizadas
SELECT
  COUNT(*) as total_campanhas,
  COUNT(*) FILTER (WHERE usar_veiculos = TRUE) as com_veiculos,
  COUNT(*) FILTER (WHERE usar_vendedor = TRUE) as com_vendedor
FROM instacar_campanhas;

