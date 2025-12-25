-- ============================================================================
-- Verificar clientes selecionados para uma campanha e seus envios
-- ============================================================================

-- Substitua 'uuid-da-campanha' pelo ID da campanha real
-- Exemplo: '8c0e433a-4899-4f9f-8e68-2cb4a86279cf'

-- 1. Verificar clientes selecionados na campanha
SELECT 
  cc.id,
  cc.campanha_id,
  cc.cliente_id,
  c.nome_cliente,
  c.telefone,
  c.status_whatsapp,
  c.bloqueado_envios,
  c.ativo,
  c.ultimo_envio
FROM instacar_campanhas_clientes cc
LEFT JOIN instacar_clientes_envios c ON cc.cliente_id = c.id
WHERE cc.campanha_id = '8c0e433a-4899-4f9f-8e68-2cb4a86279cf' -- Substitua pelo ID da campanha
ORDER BY c.nome_cliente;

-- 2. Verificar envios registrados para esta campanha
SELECT 
  h.id,
  h.cliente_id,
  h.telefone,
  c.nome_cliente,
  h.status_envio,
  h.mensagem_erro,
  h.timestamp_envio,
  h.execucao_id,
  h.campanha_id
FROM instacar_historico_envios h
LEFT JOIN instacar_clientes_envios c ON h.cliente_id = c.id
WHERE h.campanha_id = '8c0e433a-4899-4f9f-8e68-2cb4a86279cf' -- Substitua pelo ID da campanha
ORDER BY h.timestamp_envio DESC;

-- 3. Comparar: clientes selecionados vs clientes que receberam envios
SELECT 
  cc.cliente_id,
  c.nome_cliente,
  c.telefone,
  CASE 
    WHEN h.id IS NOT NULL THEN '✅ Enviado'
    ELSE '❌ Não enviado'
  END as status_envio,
  h.timestamp_envio,
  h.status_envio as status_detalhado,
  h.mensagem_erro
FROM instacar_campanhas_clientes cc
LEFT JOIN instacar_clientes_envios c ON cc.cliente_id = c.id
LEFT JOIN instacar_historico_envios h 
  ON h.campanha_id = cc.campanha_id 
  AND (h.cliente_id = cc.cliente_id OR h.telefone = c.telefone)
  AND h.status_envio = 'enviado'
WHERE cc.campanha_id = '8c0e433a-4899-4f9f-8e68-2cb4a86279cf' -- Substitua pelo ID da campanha
ORDER BY 
  CASE WHEN h.id IS NOT NULL THEN 0 ELSE 1 END,
  c.nome_cliente;

-- 4. Verificar se há clientes selecionados que não passaram nas validações
-- (status_whatsapp != 'valid', bloqueado_envios = true, ou inativo = false)
SELECT 
  cc.cliente_id,
  c.nome_cliente,
  c.telefone,
  c.status_whatsapp,
  c.bloqueado_envios,
  c.ativo,
  CASE 
    WHEN c.status_whatsapp != 'valid' THEN '❌ WhatsApp inválido'
    WHEN c.bloqueado_envios = true THEN '❌ Bloqueado para envios'
    WHEN c.ativo = false THEN '❌ Cliente inativo'
    WHEN c.ultimo_envio IS NOT NULL THEN 
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - c.ultimo_envio)) / 86400 < 2 THEN '⚠️ Intervalo mínimo não respeitado'
        ELSE '✅ Válido'
      END
    ELSE '✅ Válido'
  END as motivo_rejeicao
FROM instacar_campanhas_clientes cc
LEFT JOIN instacar_clientes_envios c ON cc.cliente_id = c.id
WHERE cc.campanha_id = '8c0e433a-4899-4f9f-8e68-2cb4a86279cf' -- Substitua pelo ID da campanha
  AND (
    c.status_whatsapp != 'valid' 
    OR c.bloqueado_envios = true 
    OR c.ativo = false
    OR (c.ultimo_envio IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - c.ultimo_envio)) / 86400 < 2)
  )
ORDER BY c.nome_cliente;

