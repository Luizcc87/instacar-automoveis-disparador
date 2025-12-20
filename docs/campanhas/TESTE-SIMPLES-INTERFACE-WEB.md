# Teste Simples: Enviar Mensagem pela Interface Web

**Método mais simples para testar!** Use a interface web para enviar uma mensagem individual para seu número.

**Tempo estimado:** 2-3 minutos

> **✅ Status:** O workflow N8N agora suporta envio individual! Você pode usar a interface web para enviar mensagens diretamente.

---

## Passo 1: Adicionar Seu Número como Cliente

### 1.1 Via Interface Web

1. Acesse a interface web
2. Vá em **"👥 Clientes"**
3. Clique em **"➕ Adicionar Cliente"**
4. Preencha:
   - **Nome:** `Teste Próprio`
   - **Telefone:** Seu número no formato `5511999999999` (55 + DDD + número)
   - **Status WhatsApp:** `Válido`
5. Clique em **"Salvar"**

### 1.2 Via SQL (Alternativa)

Se preferir via SQL no Supabase:

```sql
INSERT INTO instacar_clientes_envios (
  telefone,
  nome_cliente,
  status_whatsapp,
  ativo,
  veiculos
) VALUES (
  '5511999999999',  -- ← SUBSTITUIR PELO SEU NÚMERO
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

---

## Passo 2: Enviar Mensagem Individual

> **Alternativa Rápida:** Se o envio individual ainda não estiver funcionando, crie uma campanha de teste simples:
>
> 1. Vá em **"📢 Campanhas"** → **"➕ Nova Campanha"**
> 2. Preencha apenas: Nome, Data Início/Fim (hoje), Instância WhatsApp
> 3. Prompt IA: `"Deseje um Feliz Natal de forma calorosa. Chame o cliente pelo nome."`
> 4. Limite: 10, Tamanho Lote: 1
> 5. Salve e clique em **"▶️ Disparar"**

### 2.1 Via Interface Web (Quando Disponível)

1. Na interface web, vá em **"👥 Clientes"**
2. Encontre seu cliente "Teste Próprio" na lista
3. Clique no botão **"📤 Enviar"** ao lado do cliente
4. No modal que abrir:
   - **Tipo de Envio:** Escolha uma opção:
     - **"Usar Campanha Existente"** - Selecione uma campanha (usa IA da campanha)
     - **"Mensagem Customizada"** - Digite sua mensagem diretamente
5. Clique em **"📤 Enviar Mensagem"**

**Pronto!** A mensagem será enviada via webhook para o N8N.

1. Na interface web, vá em **"👥 Clientes"**
2. Encontre seu cliente "Teste Próprio" na lista
3. Clique no botão **"📤 Enviar"** ao lado do cliente
4. No modal que abrir:
   - **Tipo de Envio:** Escolha uma opção:
     - **"Usar Campanha Existente"** - Selecione uma campanha (usa IA da campanha)
     - **"Mensagem Customizada"** - Digite sua mensagem diretamente
5. Clique em **"📤 Enviar Mensagem"**

**Pronto!** A mensagem será enviada via webhook para o N8N.

---

## Passo 3: Verificar Resultado

### 3.1 No WhatsApp

1. Abra o WhatsApp no seu celular
2. Verifique se recebeu a mensagem

### 3.2 No N8N

1. Acesse: `https://n8n-n8n-start.vioey0.easypanel.host`
2. Vá em **"Executions"**
3. Encontre a execução mais recente
4. Verifique se o envio foi bem-sucedido

### 3.3 No Supabase (Opcional)

```sql
SELECT
  telefone,
  nome_cliente,
  mensagem_enviada,
  status_envio,
  timestamp_envio
FROM instacar_historico_envios
WHERE telefone = '5511999999999'  -- ← SEU NÚMERO
ORDER BY timestamp_envio DESC
LIMIT 1;
```

---

## Troubleshooting

### Mensagem não chegou

1. **Verifique o N8N:**

   - Veja a execução mais recente
   - Verifique se há erros nos nós

2. **Verifique a instância WhatsApp:**

   - A instância precisa estar conectada
   - O token precisa estar válido

3. **Verifique o número:**
   - Deve estar no formato `55XXXXXXXXXXX`
   - Deve estar cadastrado como cliente ativo

### Erro: "Configure o webhook N8N"

1. Vá em **"⚙️ Gerenciar Configurações"** na interface web
2. Configure a **URL do Webhook N8N:**
   ```
   https://n8n-n8n-start.vioey0.easypanel.host/webhook/campanha
   ```
3. Salve as configurações

---

## Vantagens deste Método

✅ **Mais rápido** - Não precisa criar campanha  
✅ **Mais simples** - Apenas adicionar cliente e clicar em "Enviar"  
✅ **Mais direto** - Testa exatamente o fluxo de envio individual  
✅ **Interface visual** - Tudo pela interface web

---

## Próximos Passos

Após validar o envio individual:

1. Teste com uma campanha completa
2. Teste com múltiplos clientes
3. Configure agendamento cron
4. Monitore métricas no Supabase

---

**Dica:** Você pode testar múltiplas vezes usando "Mensagem Customizada" para enviar mensagens diferentes sem precisar criar campanhas.
