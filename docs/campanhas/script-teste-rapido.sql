-- ============================================================================
-- Script de Teste Rápido: Enviar Mensagem para Seu Número
-- Execute este script no SQL Editor do Supabase
-- ============================================================================
-- 
-- INSTRUÇÕES:
-- 1. Substitua '5511999999999' pelo seu número (formato: 55XXXXXXXXXXX)
-- 2. Execute a query "OBTER ID DA INSTÂNCIA" primeiro
-- 3. Substitua 'UUID_INSTANCIA_AQUI' pelo ID obtido
-- 4. Execute todo o script
-- 5. Anote o campanha_id retornado
-- 6. Use o webhook para disparar (veja guia TESTE-RAPIDO-NUMERO-PROPRIO.md)
--
-- ============================================================================

-- ============================================================================
-- PASSO 1: CONFIGURAR SEU NÚMERO
-- ============================================================================
-- Substitua TODAS as ocorrências de '5511999999999' pelo seu número
-- Formato: 55XXXXXXXXXXX (código país + DDD + número)
-- Exemplo: (11) 99999-9999 → 5511999999999

-- ============================================================================
-- PASSO 2: OBTER ID DA INSTÂNCIA WHATSAPP
-- Execute esta query PRIMEIRO e anote o ID retornado
-- ============================================================================
SELECT 
  id as instancia_id,
  nome as instancia_nome,
  tipo_api,
  ativo
FROM instacar_whatsapp_apis
WHERE ativo = TRUE
LIMIT 1;

-- ⚠️ IMPORTANTE: Anote o instancia_id acima e substitua 'UUID_INSTANCIA_AQUI' abaixo

-- ============================================================================
-- PASSO 3: CRIAR CLIENTE DE TESTE
-- ============================================================================
-- Substitua '5511999999999' pelo seu número normalizado

INSERT INTO instacar_clientes_envios (
  telefone, 
  nome_cliente, 
  status_whatsapp, 
  ativo,
  veiculos
) VALUES (
  '5511999999999',  -- ← SUBSTITUIR PELO SEU NÚMERO (formato: 55XXXXXXXXXXX)
  'Teste Próprio',
  'valid',
  TRUE,
  '[]'::jsonb
)
ON CONFLICT (telefone) 
DO UPDATE SET
  status_whatsapp = 'valid',
  ativo = TRUE,
  nome_cliente = 'Teste Próprio';

-- ============================================================================
-- PASSO 4: CRIAR CAMPANHA DE TESTE
-- ============================================================================
-- ⚠️ IMPORTANTE: Substitua 'UUID_INSTANCIA_AQUI' pelo instancia_id obtido no PASSO 2

INSERT INTO instacar_campanhas (
  nome,
  periodo_ano,
  data_inicio,
  data_fim,
  limite_envios_dia,
  prompt_ia,
  tamanho_lote,
  horario_inicio,
  horario_fim,
  usar_veiculos,
  usar_vendedor,
  whatsapp_api_id,
  status,
  ativo
) VALUES (
  'Teste Meu Número',
  'natal',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  10,
  'Esta é uma mensagem de teste. Deseje um Feliz Natal de forma calorosa. Chame o cliente pelo nome e seja breve (máximo 280 caracteres).',
  1,
  '09:00:00',
  '18:00:00',
  FALSE,
  FALSE,
  'UUID_INSTANCIA_AQUI',  -- ← SUBSTITUIR PELO ID REAL
  'ativa',
  TRUE
)
RETURNING id as campanha_id, nome;

-- ============================================================================
-- PASSO 5: VERIFICAR DADOS CRIADOS
-- ============================================================================

-- Verificar cliente
SELECT 
  'Cliente criado:' as status,
  telefone,
  nome_cliente,
  status_whatsapp,
  ativo
FROM instacar_clientes_envios
WHERE telefone = '5511999999999';  -- ← SEU NÚMERO

-- Verificar campanha (ANOTE O campanha_id RETORNADO!)
SELECT 
  'Campanha criada:' as status,
  id as campanha_id,  -- ← USE ESTE ID NO WEBHOOK
  nome,
  whatsapp_api_id,
  status,
  ativo
FROM instacar_campanhas
WHERE nome = 'Teste Meu Número';

-- ============================================================================
-- PRÓXIMOS PASSOS:
-- ============================================================================
-- 1. ✅ Anote o campanha_id retornado acima
-- 2. ✅ Dispare via PowerShell (veja comando abaixo)
-- 3. ✅ Verifique seu WhatsApp
-- 4. ✅ Verifique histórico no Supabase (query abaixo)
--
-- COMANDO POWERSHELL PARA DISPARAR:
-- $webhookUrl = "https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha"
-- $campanhaId = "CAMPANHA_ID_AQUI"  # ← Substituir pelo ID obtido acima
-- $body = @{ campanha_id = $campanhaId; trigger_tipo = "manual" } | ConvertTo-Json
-- Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"

-- ============================================================================
-- PASSO 6: VERIFICAR HISTÓRICO APÓS DISPARO
-- ============================================================================
-- Execute esta query após disparar para ver o resultado:

SELECT 
  telefone,
  nome_cliente,
  mensagem_enviada,
  status_envio,
  timestamp_envio,
  mensagem_erro
FROM instacar_historico_envios
WHERE telefone = '5511999999999'  -- ← SEU NÚMERO
ORDER BY timestamp_envio DESC
LIMIT 1;
