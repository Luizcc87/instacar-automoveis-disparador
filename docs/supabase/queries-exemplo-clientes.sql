-- ============================================================================
-- Queries SQL de Exemplo - Consulta de Clientes
-- Tabela: instacar_clientes_envios
-- ============================================================================

-- ============================================================================
-- 1. LISTAR TODOS OS CLIENTES (BÁSICO)
-- ============================================================================
SELECT 
  id,
  nome_cliente,
  telefone,
  email,
  status_whatsapp,
  total_envios,
  ultimo_envio,
  created_at,
  updated_at
FROM instacar_clientes_envios
ORDER BY created_at DESC;

-- ============================================================================
-- 2. LISTAR CLIENTES COM VEÍCULOS (DETALHADO)
-- ============================================================================
SELECT 
  id,
  nome_cliente,
  telefone,
  email,
  veiculos, -- Array JSONB com todos os veículos
  status_whatsapp,
  total_envios,
  ultimo_envio,
  ultima_campanha_id,
  ultima_campanha_data,
  ultima_atualizacao_planilha,
  fonte_dados,
  created_at
FROM instacar_clientes_envios
ORDER BY nome_cliente;

-- ============================================================================
-- 3. CONTAR TOTAL DE CLIENTES
-- ============================================================================
SELECT COUNT(*) as total_clientes
FROM instacar_clientes_envios;

-- ============================================================================
-- 4. CLIENTES COM WHATSAPP VÁLIDO
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  status_whatsapp,
  total_envios
FROM instacar_clientes_envios
WHERE status_whatsapp = 'valid'
ORDER BY nome_cliente;

-- ============================================================================
-- 5. CLIENTES COM WHATSAPP INVÁLIDO OU NÃO VERIFICADO
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  status_whatsapp
FROM instacar_clientes_envios
WHERE status_whatsapp IN ('invalid', 'unknown')
ORDER BY nome_cliente;

-- ============================================================================
-- 6. CLIENTES QUE NUNCA RECEBERAM MENSAGENS
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  status_whatsapp,
  total_envios
FROM instacar_clientes_envios
WHERE total_envios = 0 OR total_envios IS NULL
ORDER BY nome_cliente;

-- ============================================================================
-- 7. CLIENTES COM MAIS ENVIOS
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  total_envios,
  ultimo_envio
FROM instacar_clientes_envios
WHERE total_envios > 0
ORDER BY total_envios DESC
LIMIT 20;

-- ============================================================================
-- 8. BUSCAR CLIENTE POR TELEFONE
-- ============================================================================
SELECT 
  id,
  nome_cliente,
  telefone,
  email,
  veiculos,
  status_whatsapp,
  total_envios,
  ultimo_envio
FROM instacar_clientes_envios
WHERE telefone = '5511999999999'; -- Substitua pelo telefone desejado

-- ============================================================================
-- 9. BUSCAR CLIENTE POR NOME (PARCIAL)
-- ============================================================================
SELECT 
  id,
  nome_cliente,
  telefone,
  email,
  status_whatsapp
FROM instacar_clientes_envios
WHERE nome_cliente ILIKE '%João%' -- Substitua pelo nome desejado
ORDER BY nome_cliente;

-- ============================================================================
-- 10. CLIENTES COM VEÍCULOS (EXPANDIR ARRAY JSONB)
-- ============================================================================
SELECT 
  c.id,
  c.nome_cliente,
  c.telefone,
  c.email,
  jsonb_array_elements(c.veiculos) as veiculo
FROM instacar_clientes_envios c
WHERE c.veiculos IS NOT NULL 
  AND jsonb_array_length(c.veiculos) > 0
ORDER BY c.nome_cliente;

-- ============================================================================
-- 11. CLIENTES POR FONTE DE DADOS
-- ============================================================================
SELECT 
  fonte_dados,
  COUNT(*) as total_clientes
FROM instacar_clientes_envios
WHERE fonte_dados IS NOT NULL
GROUP BY fonte_dados
ORDER BY total_clientes DESC;

-- ============================================================================
-- 12. CLIENTES ATUALIZADOS RECENTEMENTE
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  ultima_atualizacao_planilha,
  fonte_dados
FROM instacar_clientes_envios
WHERE ultima_atualizacao_planilha IS NOT NULL
ORDER BY ultima_atualizacao_planilha DESC
LIMIT 50;

-- ============================================================================
-- 13. CLIENTES COM ÚLTIMA CAMPANHA
-- ============================================================================
SELECT 
  c.nome_cliente,
  c.telefone,
  c.email,
  c.ultima_campanha_id,
  c.ultima_campanha_data,
  camp.nome as nome_campanha
FROM instacar_clientes_envios c
LEFT JOIN instacar_campanhas camp ON c.ultima_campanha_id = camp.id
WHERE c.ultima_campanha_id IS NOT NULL
ORDER BY c.ultima_campanha_data DESC;

-- ============================================================================
-- 14. ESTATÍSTICAS GERAIS
-- ============================================================================
SELECT 
  COUNT(*) as total_clientes,
  COUNT(*) FILTER (WHERE status_whatsapp = 'valid') as whatsapp_validos,
  COUNT(*) FILTER (WHERE status_whatsapp = 'invalid') as whatsapp_invalidos,
  COUNT(*) FILTER (WHERE status_whatsapp = 'unknown') as whatsapp_nao_verificados,
  COUNT(*) FILTER (WHERE total_envios > 0) as clientes_com_envios,
  AVG(total_envios) FILTER (WHERE total_envios > 0) as media_envios_por_cliente,
  MAX(ultimo_envio) as ultimo_envio_geral
FROM instacar_clientes_envios;

-- ============================================================================
-- 15. CLIENTES SEM EMAIL
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  status_whatsapp
FROM instacar_clientes_envios
WHERE email IS NULL OR email = ''
ORDER BY nome_cliente;

-- ============================================================================
-- 16. CLIENTES COM MÚLTIPLOS VEÍCULOS
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  jsonb_array_length(veiculos) as quantidade_veiculos,
  veiculos
FROM instacar_clientes_envios
WHERE veiculos IS NOT NULL 
  AND jsonb_array_length(veiculos) > 1
ORDER BY jsonb_array_length(veiculos) DESC;

-- ============================================================================
-- 17. CLIENTES CRIADOS EM UM PERÍODO ESPECÍFICO
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  created_at
FROM instacar_clientes_envios
WHERE created_at >= '2025-01-01' -- Data inicial
  AND created_at < '2025-02-01'   -- Data final
ORDER BY created_at DESC;

-- ============================================================================
-- 18. EXPORTAR CLIENTES PARA CSV (ESTRUTURA)
-- ============================================================================
SELECT 
  nome_cliente as "Nome",
  telefone as "Telefone",
  email as "Email",
  status_whatsapp as "Status WhatsApp",
  total_envios as "Total Envios",
  ultimo_envio as "Último Envio",
  created_at as "Data Cadastro"
FROM instacar_clientes_envios
ORDER BY nome_cliente;

-- ============================================================================
-- 19. CLIENTES ATIVOS (com campo ativo)
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  status_whatsapp,
  total_envios,
  ativo
FROM instacar_clientes_envios
WHERE ativo = TRUE
ORDER BY nome_cliente;

-- ============================================================================
-- 20. CLIENTES DESATIVADOS (soft delete)
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  email,
  status_whatsapp,
  total_envios,
  updated_at as data_desativacao
FROM instacar_clientes_envios
WHERE ativo = FALSE
ORDER BY updated_at DESC;

-- ============================================================================
-- 21. CLIENTES COM OBSERVAÇÕES INTERNAS
-- ============================================================================
SELECT 
  nome_cliente,
  telefone,
  jsonb_array_length(observacoes_internas) as total_observacoes,
  observacoes_internas
FROM instacar_clientes_envios
WHERE observacoes_internas IS NOT NULL 
  AND jsonb_array_length(observacoes_internas) > 0
ORDER BY jsonb_array_length(observacoes_internas) DESC;
