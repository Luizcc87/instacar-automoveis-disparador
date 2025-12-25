# Histórico de Envios Individuais - Documentação

**Versão:** 2.7.2 (Dezembro 2025 - Registro automático de envios com campanha e verificação de duplicatas)

## Visão Geral

Este documento descreve como o sistema registra e exibe o histórico de envios individuais de mensagens WhatsApp através da interface web.

## Fluxo Completo

### 1. Envio Individual via Interface Web

Quando um usuário envia uma mensagem individual através da interface web:

1. **Frontend** → Envia requisição para webhook do N8N com:

   - `trigger_tipo: 'manual_individual'`
   - `telefone`: Número do cliente
   - `instance_id`: ID da instância WhatsApp selecionada (obrigatório)
   - `mensagem_customizada`: Mensagem personalizada (opcional - tipo "customizada")
   - `campanha_id`: ID da campanha (opcional - tipo "campanha")

2. **Verificação de Envios Anteriores** (apenas para tipo "campanha"):

   - Antes de enviar, verifica se já existe histórico de envios para aquele cliente + campanha
   - Se encontrar envio anterior, exibe confirmação com:
     - Nome da campanha
     - Data/hora do último envio
     - Status do último envio (enviado com sucesso, com erro, bloqueado)
   - Usuário pode confirmar ou cancelar o envio
   - **Mensagens customizadas** não são verificadas (são consideradas fora das campanhas)

3. **N8N Workflow** (`Disparador_Web_Campanhas_Instacar.json`):

   - Valida payload
   - Busca cliente no Supabase
   - Busca instância WhatsApp específica por `instance_id` (ou primeira ativa se não fornecido)
   - Valida se a instância foi encontrada e está ativa
   - Envia mensagem via API (Uazapi/Z-API/Evolution)
   - **Registra no histórico** via nó "Registrar Histórico Individual"

4. **Registro Automático no Histórico** (apenas para tipo "campanha"):

   - Após envio bem-sucedido via webhook N8N, o frontend registra automaticamente no Supabase
   - **Supabase** → Insere registro em `instacar_historico_envios` com:
     - `cliente_id`: ID do cliente (se existir)
     - `telefone`: Número normalizado (55XXXXXXXXXXX)
     - `campanha_id`: ID da campanha selecionada
     - `status_envio`: 'enviado' (assumindo sucesso, já que o N8N processou)
     - `mensagem_enviada`: `null` (mensagem é gerada pela IA no N8N)
     - `tipo_envio`: 'normal'
     - `planilha_origem`: 'envio_manual_individual'
     - `timestamp_envio`: Data/hora atual
   - **Atualiza contadores do cliente:**
     - `total_envios`: Incrementa em 1
     - `ultimo_envio`: Atualiza para data/hora atual
     - `primeiro_envio`: Mantém valor existente (não sobrescreve)
   - **Mensagens customizadas** não são registradas no histórico (são consideradas fora das campanhas)

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

A tabela `instacar_historico_envios` deve ter as seguintes políticas RLS:

```sql
-- Anon users (interface web) podem ler histórico de envios
CREATE POLICY "Anon users can read historico_envios"
  ON instacar_historico_envios
  FOR SELECT
  TO anon
  USING (true);

-- Anon users (interface web) podem inserir histórico de envios
-- Necessário para registro automático de envios individuais com campanha (v2.7.2)
CREATE POLICY "Anon users can insert historico_envios"
  ON instacar_historico_envios
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon users (interface web) podem atualizar histórico de envios
CREATE POLICY "Anon users can update historico_envios"
  ON instacar_historico_envios
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
```

**Scripts completos:**
- `docs/interface-web/fix-rls-historico.sql` (leitura)
- `docs/supabase/fix-rls-historico-insert.sql` (inserção e atualização - v2.7.2)
- `docs/supabase/policies.sql` (todas as políticas - inclui INSERT/UPDATE a partir de v2.7.2)

### Verificação

Para verificar se a política está configurada:

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'instacar_historico_envios';
```

Deve retornar pelo menos 5 políticas:

- `Service role full access to historico_envios` (service_role) - ALL
- `Authenticated users can read historico_envios` (authenticated) - SELECT
- `Anon users can read historico_envios` (anon) - SELECT ← **Essencial para visualização**
- `Anon users can insert historico_envios` (anon) - INSERT ← **Essencial para registro automático (v2.7.2)**
- `Anon users can update historico_envios` (anon) - UPDATE ← **Opcional, para atualizações futuras**

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

   Se não houver políticas para `anon`, execute:
   - `docs/interface-web/fix-rls-historico.sql` (para leitura)
   - `docs/supabase/fix-rls-historico-insert.sql` (para inserção e atualização - v2.7.2)

3. **Verificar logs do navegador:**
   - Abra console (F12)
   - Procure por `=== DEBUG: Busca de Histórico ===`
   - Verifique se `error` é `null` e `count` é maior que 0

**Solução:**

- Execute os scripts no Supabase:
  - `docs/interface-web/fix-rls-historico.sql` (para leitura)
  - `docs/supabase/fix-rls-historico-insert.sql` (para inserção e atualização - v2.7.2)
- Ou execute `docs/supabase/policies.sql` completo (inclui todas as políticas atualizadas)
- Recarregue a página da interface web

### Problema: Histórico aparece, mas sem cliente_id

**Causa:** O N8N não conseguiu obter o `cliente_id` do cliente.

**Solução:** Verifique o nó "Preparar Histórico Individual" no workflow N8N. Ele tenta buscar o `cliente_id` de múltiplas fontes:

- `dados.id` ou `dados.cliente_id`
- Nó "Preparar Cliente Individual"
- Nó "Buscar Cliente Individual"

### Problema: Histórico de envio com campanha não aparece

**Sintomas:**
- Envio individual usando "Usar Campanha Existente" foi executado com sucesso
- Registro foi criado no banco com `campanha_id` (confirmado via SQL)
- Histórico não aparece na interface web

**Causa:** O nó "Preparar Histórico Individual" pode não estar capturando o `campanha_id` corretamente quando vem diretamente do payload (não do objeto `campanha`).

**Solução:** O nó "Preparar Histórico Individual" verifica `campanha_id` de duas fontes:
1. `dados.campanha.id` (objeto campanha)
2. `dados.campanha_id` (campo direto do payload)

**Nota:** A partir da versão 2.7.2, envios individuais do tipo "campanha" são registrados automaticamente pelo frontend após envio bem-sucedido, garantindo que o histórico seja sempre atualizado mesmo se o N8N não registrar. O sistema também verifica se já existe envio anterior para aquele cliente + campanha e solicita confirmação antes de continuar.

**Verificação:**
Execute a query em `docs/interface-web/verificar-historico-com-campanha.sql` para confirmar que o registro foi criado com `campanha_id` no banco.

## Logs de Debug

Para habilitar logs detalhados no navegador:

```javascript
// No console do navegador (F12)
window.DEBUG = true; // Logs gerais
window.DEBUG_HISTORICO = true; // Logs específicos de histórico
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
- **Queries de Diagnóstico:** 
  - `docs/interface-web/verificar-historico-individual.sql` (geral)
  - `docs/interface-web/verificar-historico-com-campanha.sql` (com campanha_id)
