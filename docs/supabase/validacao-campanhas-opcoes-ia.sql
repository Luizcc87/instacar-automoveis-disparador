-- ============================================================================
-- Script de Validação: Verificar colunas usar_veiculos e usar_vendedor
-- Execute este script após aplicar schema-campanhas.sql
-- Nota: As colunas já estão integradas no schema principal (não precisa de arquivo de expansão separado)
-- ============================================================================

-- 1. Verificar se as colunas existem na tabela
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'instacar_campanhas'
  AND column_name IN ('usar_veiculos', 'usar_vendedor')
ORDER BY column_name;

-- 2. Verificar valores padrão das colunas
SELECT 
  COUNT(*) as total_campanhas,
  COUNT(*) FILTER (WHERE usar_veiculos = TRUE) as usar_veiculos_true,
  COUNT(*) FILTER (WHERE usar_veiculos = FALSE) as usar_veiculos_false,
  COUNT(*) FILTER (WHERE usar_veiculos IS NULL) as usar_veiculos_null,
  COUNT(*) FILTER (WHERE usar_vendedor = TRUE) as usar_vendedor_true,
  COUNT(*) FILTER (WHERE usar_vendedor = FALSE) as usar_vendedor_false,
  COUNT(*) FILTER (WHERE usar_vendedor IS NULL) as usar_vendedor_null
FROM instacar_campanhas;

-- 3. Verificar campanhas com valores padrão corretos
SELECT 
  id,
  nome,
  periodo_ano,
  usar_veiculos,
  usar_vendedor,
  CASE 
    WHEN usar_veiculos IS NULL THEN 'ERRO: usar_veiculos é NULL'
    WHEN usar_vendedor IS NULL THEN 'ERRO: usar_vendedor é NULL'
    ELSE 'OK'
  END as status_validacao
FROM instacar_campanhas
ORDER BY created_at DESC;

-- 4. Verificar comentários das colunas
SELECT 
  c.column_name,
  pgd.description as comentario
FROM pg_catalog.pg_statio_all_tables as st
  INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
  RIGHT JOIN information_schema.columns c ON (
    pgd.objsubid = c.ordinal_position AND
    c.table_schema = st.schemaname AND
    c.table_name = st.relname
  )
WHERE st.relname = 'instacar_campanhas'
  AND c.column_name IN ('usar_veiculos', 'usar_vendedor')
ORDER BY c.column_name;

-- 5. Resumo de validação
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'instacar_campanhas' 
      AND column_name = 'usar_veiculos'
    ) THEN '✓ Coluna usar_veiculos existe'
    ELSE '✗ Coluna usar_veiculos NÃO existe'
  END as validacao_usar_veiculos,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'instacar_campanhas' 
      AND column_name = 'usar_vendedor'
    ) THEN '✓ Coluna usar_vendedor existe'
    ELSE '✗ Coluna usar_vendedor NÃO existe'
  END as validacao_usar_vendedor,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM instacar_campanhas 
      WHERE usar_veiculos IS NULL OR usar_vendedor IS NULL
    ) THEN '✓ Todas as campanhas têm valores definidos'
    ELSE '✗ Algumas campanhas têm valores NULL'
  END as validacao_valores;
