# Teste Rápido: Enviar Mensagem para Seu Número

Guia rápido para testar o disparo enviando uma mensagem para seu próprio número de WhatsApp.

**Webhook configurado:** `https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha`

**Tempo estimado:** 5-10 minutos

## 🚀 Resumo Executivo (3 Passos)

1. **Criar cliente e campanha:** Execute o script SQL em `docs/campanhas/script-teste-rapido.sql` (ajuste seu número e ID da instância)
2. **Disparar:** Use o PowerShell abaixo (substitua `CAMPANHA_ID`)
3. **Verificar:** Veja seu WhatsApp e o histórico no Supabase

**Comando PowerShell para disparar:**

```powershell
$webhookUrl = "https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha"
$campanhaId = "SUBSTITUIR_PELO_ID_DA_CAMPANHA"

$body = @{ campanha_id = $campanhaId; trigger_tipo = "manual" } | ConvertTo-Json
Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"
```

---

## Passo 1: Preparar Seu Número

### 1.1 Normalizar Seu Número

Seu número deve estar no formato: `55XXXXXXXXXXX` (código do país + DDD + número)

**Exemplos:**

- `(11) 99999-9999` → `5511999999999`
- `11999999999` → `5511999999999`
- `5511999999999` → `5511999999999` (já está correto)

### 1.2 Criar Cliente de Teste no Supabase

Execute no SQL Editor do Supabase:

```sql
-- Substitua '5511999999999' pelo seu número normalizado
INSERT INTO instacar_clientes_envios (
  telefone,
  nome_cliente,
  status_whatsapp,
  ativo,
  veiculos
) VALUES (
  '5511999999999',  -- ← SEU NÚMERO AQUI
  'Teste Próprio',
  'valid',
  TRUE,
  '[]'::jsonb
)
ON CONFLICT (telefone)
DO UPDATE SET
  status_whatsapp = 'valid',
  ativo = TRUE;
```

**Importante:**

- Use seu número real (o sistema vai enviar de verdade!)
- Certifique-se de que o número está no formato `55XXXXXXXXXXX`

### 1.3 Verificar Cliente Criado

```sql
SELECT telefone, nome_cliente, status_whatsapp, ativo
FROM instacar_clientes_envios
WHERE telefone = '5511999999999';  -- ← SEU NÚMERO
```

---

## Passo 2: Criar Campanha de Teste

### 2.1 Obter ID da Instância WhatsApp

```sql
SELECT id, nome, tipo_api, ativo
FROM instacar_whatsapp_apis
WHERE ativo = TRUE
LIMIT 1;
```

**Anote o `id`** - você precisará dele.

### 2.2 Criar Campanha de Teste

```sql
-- Substitua '[ID_INSTANCIA]' pelo ID obtido acima
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
  10,  -- Limite baixo para teste
  'Esta é uma mensagem de teste. Deseje um Feliz Natal de forma calorosa. Chame o cliente pelo nome e seja breve (máximo 280 caracteres).',
  1,   -- Lote de 1 (só você)
  '09:00:00',
  '18:00:00',
  FALSE,  -- Não mencionar veículos
  FALSE,  -- Não mencionar vendedor
  '[ID_INSTANCIA]',  -- ← ID da instância WhatsApp
  'ativa',
  TRUE
)
RETURNING id, nome;
```

**Anote o `id` da campanha** retornado.

---

## Passo 3: Disparar a Campanha

### 3.1 Via Interface Web

1. Acesse a interface web
2. Encontre a campanha "Teste Meu Número"
3. Clique em "Disparar"
4. Aguarde confirmação

### 3.2 Via Webhook (PowerShell)

No PowerShell:

```powershell
# Substitua [CAMPANHA_ID] pelo ID da campanha obtido no passo 2.2
$webhookUrl = "https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha"
$campanhaId = "uuid-da-campanha-aqui"  # ← SUBSTITUIR

$body = @{
    campanha_id = $campanhaId
    trigger_tipo = "manual"
} | ConvertTo-Json

Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"
```

**Ou use o script SQL completo:** Veja `docs/campanhas/script-teste-rapido.sql` para um script que cria tudo de uma vez.

### 3.3 Via Postman ou Insomnia

**URL:** `https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha`

**Method:** `POST`

**Headers:**

```
Content-Type: application/json
```

**Body (JSON):**

```json
{
  "campanha_id": "uuid-da-campanha-aqui",
  "trigger_tipo": "manual"
}
```

---

## Passo 4: Verificar Execução

### 4.1 No N8N

1. Acesse o N8N: `https://n8n-n8n-start.vioey0.easypanel.host`
2. Vá em **Executions**
3. Encontre a execução mais recente
4. Clique para ver detalhes

**Verifique:**

- ✅ Nó "Buscar Clientes Elegíveis" encontrou seu número
- ✅ Nó "Preparar Dados IA Campanha" montou o contexto
- ✅ Nó "AI Agent - Gerar Mensagem" gerou a mensagem
- ✅ Nó "Enviar Mensagem WhatsApp" enviou com sucesso
- ✅ Nó "Processar Resultado Envio" detectou sucesso

### 4.2 No Supabase

```sql
-- Verificar histórico de envio
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
```

**Esperado:**

- `status_envio` = `'enviado'`
- `mensagem_enviada` contém a mensagem gerada pela IA
- `timestamp_envio` com data/hora recente

### 4.3 No WhatsApp

1. Abra o WhatsApp no seu celular
2. Verifique se recebeu a mensagem
3. A mensagem deve estar personalizada com seu nome

---

## Passo 5: Troubleshooting

### 5.1 Mensagem Não Chegou

**Verificar no N8N:**

1. Veja o nó "Enviar Mensagem WhatsApp"
2. Verifique a resposta da API Uazapi
3. Veja se há erro na resposta

**Verificar no Supabase:**

```sql
SELECT
  status_envio,
  mensagem_erro,
  respostaApi
FROM instacar_historico_envios
WHERE telefone = '5511999999999'
ORDER BY timestamp_envio DESC
LIMIT 1;
```

**Possíveis causas:**

- Instância Uazapi desconectada
- Token inválido
- Número não está no formato correto
- Instância bloqueada pelo WhatsApp

### 5.2 Erro: "Instância WhatsApp não encontrada"

```sql
-- Verificar se campanha tem instância configurada
SELECT id, nome, whatsapp_api_id
FROM instacar_campanhas
WHERE nome = 'Teste Meu Número';

-- Se whatsapp_api_id for NULL, atualizar:
UPDATE instacar_campanhas
SET whatsapp_api_id = 'uuid-da-instancia'
WHERE nome = 'Teste Meu Número';
```

### 5.3 Erro: "Cliente não encontrado"

```sql
-- Verificar se seu número está na base
SELECT telefone, nome_cliente, ativo, status_whatsapp
FROM instacar_clientes_envios
WHERE telefone = '5511999999999';

-- Se não estiver, criar novamente (veja Passo 1.2)
```

### 5.4 Workflow Pausa Antes de Enviar

**Causa:** Fora do horário configurado (9h-18h) ou atingiu limite.

**Solução:**

- Execute dentro do horário 9h-18h
- Ou ajuste temporariamente o horário da campanha:

```sql
UPDATE instacar_campanhas
SET
  horario_inicio = '00:00:00',
  horario_fim = '23:59:59'
WHERE nome = 'Teste Meu Número';
```

---

## Passo 6: Limpar Dados de Teste (Opcional)

Após testar, você pode limpar:

```sql
-- CUIDADO: Isso apaga os dados de teste!

-- Apagar histórico de teste
DELETE FROM instacar_historico_envios
WHERE telefone = '5511999999999'
  AND campanha_id IN (
    SELECT id FROM instacar_campanhas WHERE nome = 'Teste Meu Número'
  );

-- Apagar execução de teste
DELETE FROM instacar_campanhas_execucoes
WHERE campanha_id IN (
  SELECT id FROM instacar_campanhas WHERE nome = 'Teste Meu Número'
);

-- Apagar campanha de teste
DELETE FROM instacar_campanhas
WHERE nome = 'Teste Meu Número';

-- (Opcional) Apagar cliente de teste
-- DELETE FROM instacar_clientes_envios WHERE telefone = '5511999999999';
```

---

## Resumo Rápido

1. **Normalize seu número:** `5511999999999`
2. **Crie cliente:** SQL no Passo 1.2
3. **Crie campanha:** SQL no Passo 2.2
4. **Dispare:** Via interface web ou webhook
5. **Verifique:** N8N + Supabase + WhatsApp

**Tempo estimado:** 5-10 minutos

---

**Dica:** Se quiser testar múltiplas vezes, você pode criar a campanha uma vez e disparar várias vezes. O sistema vai detectar que você já recebeu a campanha e pular (a menos que você limpe o histórico).
