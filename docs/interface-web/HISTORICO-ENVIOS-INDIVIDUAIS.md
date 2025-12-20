# Histórico de Envios Individuais - Documentação

## Visão Geral

Este documento descreve como o sistema registra e exibe o histórico de envios individuais de mensagens WhatsApp através da interface web.

## Fluxo Completo

### 1. Envio Individual via Interface Web

Quando um usuário envia uma mensagem individual através da interface web:

1. **Frontend** → Envia requisição para webhook do N8N com:
   - `trigger_tipo: 'manual_individual'`
   - `telefone`: Número do cliente
   - `mensagem_customizada`: Mensagem personalizada (opcional)
   - `campanha_id`: ID da campanha (opcional)

2. **N8N Workflow** (`Disparador_Web_Campanhas_Instacar.json`):
   - Valida payload
   - Busca cliente no Supabase
   - Busca API WhatsApp ativa
   - Envia mensagem via API (Uazapi/Z-API/Evolution)
   - **Registra no histórico** via nó "Registrar Histórico Individual"

3. **Supabase** → Insere registro em `instacar_historico_envios` com:
   - `cliente_id`: ID do cliente (se existir)
   - `telefone`: Número normalizado (55XXXXXXXXXXX)
   - `mensagem_enviada`: Texto da mensagem
   - `status_envio`: 'enviado', 'erro' ou 'bloqueado'
   - `campanha_id`: ID da campanha (se houver)
   - `planilha_origem`: 'Envio Individual Manual'
   - `timestamp_envio`: Data/hora do envio

### 2. Exibição do Histórico na Interface Web

Quando o usuário visualiza os detalhes do cliente:

1. **Frontend** (`interface-web/app.js`):
   - Busca histórico por `cliente_id` E por `telefone`
   - Normaliza telefone para formato `55XXXXXXXXXXX`
   - Combina resultados e remove duplicatas
   - Ordena por `timestamp_envio` (mais recente primeiro)
   - Limita a 50 registros

2. **Supabase RLS**:
   - Política `Anon users can read historico_envios` permite leitura
   - Usuários anônimos podem visualizar histórico

## Configuração Necessária

### Políticas RLS

A tabela `instacar_historico_envios` deve ter a seguinte política RLS:

```sql
-- Anon users (interface web) podem ler histórico de envios
CREATE POLICY "Anon users can read historico_envios"
  ON instacar_historico_envios
  FOR SELECT
  TO anon
  USING (true);
```

**Script completo:** `docs/interface-web/fix-rls-historico.sql`

### Verificação

Para verificar se a política está configurada:

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'instacar_historico_envios';
```

Deve retornar 3 políticas:
- `Service role full access to historico_envios` (service_role)
- `Authenticated users can read historico_envios` (authenticated)
- `Anon users can read historico_envios` (anon) ← **Essencial para interface web**

## Troubleshooting

### Problema: Histórico não aparece na interface web

**Sintomas:**
- Interface mostra "Nenhum histórico de envio encontrado"
- Console do navegador mostra `count: 0` nas queries

**Diagnóstico:**

1. **Verificar se registros existem no banco:**
   ```sql
   SELECT id, cliente_id, telefone, status_envio, timestamp_envio
   FROM instacar_historico_envios
   WHERE telefone = '5555999703107'  -- Substitua pelo telefone do cliente
   ORDER BY timestamp_envio DESC;
   ```

2. **Verificar políticas RLS:**
   ```sql
   SELECT policyname, roles, cmd
   FROM pg_policies
   WHERE tablename = 'instacar_historico_envios';
   ```
   
   Se não houver política para `anon`, execute `docs/interface-web/fix-rls-historico.sql`

3. **Verificar logs do navegador:**
   - Abra console (F12)
   - Procure por `=== DEBUG: Busca de Histórico ===`
   - Verifique se `error` é `null` e `count` é maior que 0

**Solução:**
- Execute o script `docs/interface-web/fix-rls-historico.sql` no Supabase
- Recarregue a página da interface web

### Problema: Histórico aparece, mas sem cliente_id

**Causa:** O N8N não conseguiu obter o `cliente_id` do cliente.

**Solução:** Verifique o nó "Preparar Histórico Individual" no workflow N8N. Ele tenta buscar o `cliente_id` de múltiplas fontes:
- `dados.id` ou `dados.cliente_id`
- Nó "Preparar Cliente Individual"
- Nó "Buscar Cliente Individual"

## Logs de Debug

Para habilitar logs detalhados no navegador:

```javascript
// No console do navegador (F12)
window.DEBUG = true;              // Logs gerais
window.DEBUG_HISTORICO = true;    // Logs específicos de histórico
```

Os logs mostrarão:
- Telefone original e normalizado
- Resultados das queries (por cliente_id e por telefone)
- Histórico combinado e renderizado

## Arquivos Relacionados

- **Workflow N8N:** `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`
- **Frontend:** `interface-web/app.js` (função `carregarDadosClienteCompleto`)
- **Schema Supabase:** `docs/supabase/schema.sql`
- **Políticas RLS:** `docs/supabase/policies.sql`
- **Fix RLS:** `docs/interface-web/fix-rls-historico.sql`
- **Queries de Diagnóstico:** `docs/interface-web/verificar-historico-individual.sql`
