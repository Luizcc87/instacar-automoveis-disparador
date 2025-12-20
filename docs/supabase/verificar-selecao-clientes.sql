-- ============================================================================
-- Script de Verificação: Seleção de Clientes e Bloqueio de Envios
-- Execute este script para verificar se tudo está configurado corretamente
-- ============================================================================

-- 1. Verificar se campo bloqueado_envios existe
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'instacar_clientes_envios'
  AND column_name = 'bloqueado_envios';

-- 2. Verificar se índice de bloqueio existe
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'instacar_clientes_envios'
  AND indexname = 'idx_clientes_bloqueado_envios';

-- 3. Verificar se tabela de relacionamento existe
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'instacar_campanhas_clientes'
ORDER BY ordinal_position;

-- 4. Verificar índices da tabela de relacionamento
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'instacar_campanhas_clientes'
ORDER BY indexname;

-- 5. Contar clientes bloqueados
SELECT 
  COUNT(*) FILTER (WHERE bloqueado_envios = true) as total_bloqueados,
  COUNT(*) FILTER (WHERE bloqueado_envios = false) as total_permitidos,
  COUNT(*) as total_clientes
FROM instacar_clientes_envios
WHERE ativo = true;

-- 6. Verificar campanhas com seleção específica
SELECT 
  c.id,
  c.nome,
  COUNT(cc.id) as total_clientes_selecionados
FROM instacar_campanhas c
LEFT JOIN instacar_campanhas_clientes cc ON cc.campanha_id = c.id
GROUP BY c.id, c.nome
HAVING COUNT(cc.id) > 0
ORDER BY total_clientes_selecionados DESC;

-- 7. Verificar integridade: clientes bloqueados não devem estar selecionados
SELECT 
  cc.campanha_id,
  c.nome as campanha_nome,
  COUNT(*) as clientes_bloqueados_selecionados
FROM instacar_campanhas_clientes cc
INNER JOIN instacar_clientes_envios cli ON cli.id = cc.cliente_id
INNER JOIN instacar_campanhas c ON c.id = cc.campanha_id
WHERE cli.bloqueado_envios = true
GROUP BY cc.campanha_id, c.nome;

-- Se a query acima retornar resultados, significa que há clientes bloqueados
-- selecionados em campanhas (isso não quebra o sistema pois o workflow filtra bloqueado_envios = false)

-- 8. Verificar distribuição de status_whatsapp dos clientes
SELECT 
  status_whatsapp,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE bloqueado_envios = true) as bloqueados,
  COUNT(*) FILTER (WHERE bloqueado_envios = false) as permitidos
FROM instacar_clientes_envios
WHERE ativo = true
GROUP BY status_whatsapp
ORDER BY total DESC;

-- 9. Clientes elegíveis para campanhas (ativo, não bloqueado, WhatsApp válido)
SELECT COUNT(*) as total_elegiveis
FROM instacar_clientes_envios
WHERE ativo = true
  AND bloqueado_envios = false
  AND status_whatsapp = 'valid';

