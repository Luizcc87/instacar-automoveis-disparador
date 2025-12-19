-- ============================================================================
-- Script de Verificação Pré-Execução
-- Execute ANTES de rodar schema.sql, indexes.sql e policies.sql
-- ============================================================================

-- 1. Verificar se função update_updated_at_column já existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ FUNÇÃO JÁ EXISTE - Verificar compatibilidade'
        ELSE '✅ Função não existe - Pode criar normalmente'
    END as status_funcao,
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_updated_at_column'
GROUP BY proname, oid;

-- 2. Verificar se alguma tabela instacar_* já existe
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ ALGUMAS TABELAS JÁ EXISTEM'
        ELSE '✅ Nenhuma tabela instacar_* existe'
    END as status_tabelas,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'instacar_%'
GROUP BY table_name;

-- 3. Verificar conflitos de nomes de índices (improvável, mas verificar)
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '⚠️ ÍNDICES COM NOMES SIMILARES EXISTEM'
        ELSE '✅ Nenhum índice conflitante'
    END as status_indices,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND (
    indexname LIKE '%clientes%' OR
    indexname LIKE '%historico%' OR
    indexname LIKE '%controle%' OR
    indexname LIKE '%erros%'
  )
GROUP BY indexname;

-- 4. Listar todas as funções relacionadas a updated_at (para referência)
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%updated_at%'
ORDER BY proname;
