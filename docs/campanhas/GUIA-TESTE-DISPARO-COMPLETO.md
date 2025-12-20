# Guia Completo: Teste de Disparo de Campanhas

Este guia fornece um passo a passo completo para testar o disparo de campanhas desde a preparação até a validação dos resultados.

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Preparação de Dados de Teste](#2-preparação-de-dados-de-teste)
3. [Criação de Campanha de Teste](#3-criação-de-campanha-de-teste)
4. [Configuração do Workflow N8N](#4-configuração-do-workflow-n8n)
5. [Execução do Disparo](#5-execução-do-disparo)
6. [Validação de Cada Etapa](#6-validação-de-cada-etapa)
7. [Verificação de Resultados](#7-verificação-de-resultados)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pré-requisitos

### 1.1 Supabase Configurado

- ✅ Tabelas criadas:

  - `instacar_campanhas`
  - `instacar_campanhas_execucoes`
  - `instacar_clientes_envios`
  - `instacar_historico_envios`
  - `instacar_controle_envios`
  - `instacar_whatsapp_apis`

- ✅ Execute os schemas na ordem:
  1. `docs/supabase/schema.sql` (se ainda não executou)
  2. `docs/supabase/schema-campanhas.sql`
  3. `docs/supabase/schema-whatsapp-apis.sql`
  4. `docs/supabase/indexes.sql`

### 1.2 N8N Configurado

- ✅ Workflow importado: `Disparador_Web_Campanhas_Instacar.json`
- ✅ Credenciais configuradas:
  - Supabase API (Service Role Key)
  - OpenAI API Key
- ✅ Variáveis configuradas no nó "Set Variables - CONFIGURAR AQUI":
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `OPENAI_MODEL` (ex: `gpt-4.1`)

### 1.3 Instância WhatsApp Configurada

- ✅ Instância Uazapi cadastrada em `instacar_whatsapp_apis`
- ✅ Instância ativa (`ativo = true`)
- ✅ Token válido

**Como cadastrar via SQL:**

```sql
INSERT INTO instacar_whatsapp_apis (
  nome, tipo_api, base_url, token, ativo, descricao
) VALUES (
  'Uazapi Principal',
  'uazapi',
  'https://fourtakeoff.uazapi.com',
  'seu-token-aqui',
  TRUE,
  'Instância principal para testes'
);
```

---

## 2. Preparação de Dados de Teste

### 2.1 Criar Clientes de Teste

**Opção A: Via Interface Web**

1. Acesse a interface web
2. Faça upload de planilha com 3-5 clientes de teste
3. Use números de teste (não reais para não enviar mensagens reais)

**Opção B: Via SQL (Rápido para Teste)**

```sql
-- Limpar dados de teste anteriores (CUIDADO: apenas em ambiente de teste!)
DELETE FROM instacar_historico_envios WHERE telefone LIKE '551199999%';
DELETE FROM instacar_clientes_envios WHERE telefone LIKE '551199999%';

-- Criar clientes de teste
INSERT INTO instacar_clientes_envios (
  telefone, nome_cliente, status_whatsapp, ativo, veiculos
) VALUES
  ('5511999990001', 'Cliente Teste 1', 'valid', TRUE, '[]'::jsonb),
  ('5511999990002', 'Cliente Teste 2', 'valid', TRUE, '[]'::jsonb),
  ('5511999990003', 'Cliente Teste 3', 'valid', TRUE, '[]'::jsonb),
  ('5511999990004', 'Cliente Teste 4', 'valid', TRUE, '[]'::jsonb),
  ('5511999990005', 'Cliente Teste 5', 'valid', TRUE, '[]'::jsonb);
```

**Importante:**

- Use números de teste (não reais)
- `status_whatsapp` deve ser `'valid'`
- `ativo` deve ser `TRUE`

### 2.2 Verificar Clientes Criados

```sql
SELECT telefone, nome_cliente, status_whatsapp, ativo
FROM instacar_clientes_envios
WHERE telefone LIKE '551199999%'
ORDER BY telefone;
```

---

## 3. Criação de Campanha de Teste

### 3.1 Via Interface Web

1. Acesse a interface web
2. Clique em "Criar Nova Campanha"
3. Preencha os campos:

```
Nome: Teste Disparo Completo
Período do Ano: natal
Data Início: [hoje]
Data Fim: [hoje + 7 dias]
Limite de Envios/Dia: 10  ← Reduzido para teste
Intervalo entre Envios: (deixe vazio para aleatorizado)
Instância WhatsApp: [Selecione sua instância Uazapi]
Agendamento Cron: (deixe vazio - disparo manual)
Prompt para IA:
  "Esta é uma mensagem de teste. Deseje um Feliz Natal de forma calorosa.
   Chame o cliente pelo nome e seja breve (máximo 280 caracteres)."
Tamanho do Lote: 5  ← Pequeno para teste
Horário Início: 09:00
Horário Fim: 18:00
Incluir Informações de Veículos: ❌ (desmarcado)
Incluir Nome do Vendedor: ❌ (desmarcado)
```

4. Clique em "Salvar"

### 3.2 Via SQL (Alternativa)

```sql
-- Obter ID da instância WhatsApp
SELECT id FROM instacar_whatsapp_apis WHERE ativo = TRUE LIMIT 1;
-- Use o ID retornado no INSERT abaixo

INSERT INTO instacar_campanhas (
  nome, periodo_ano, data_inicio, data_fim,
  limite_envios_dia, prompt_ia, tamanho_lote,
  horario_inicio, horario_fim, usar_veiculos, usar_vendedor,
  whatsapp_api_id, status, ativo
) VALUES (
  'Teste Disparo Completo',
  'natal',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  10,  -- Limite reduzido para teste
  'Esta é uma mensagem de teste. Deseje um Feliz Natal de forma calorosa. Chame o cliente pelo nome e seja breve (máximo 280 caracteres).',
  5,   -- Lote pequeno
  '09:00:00',
  '18:00:00',
  FALSE,
  FALSE,
  '[ID_DA_INSTANCIA_AQUI]',  -- Substitua pelo ID real
  'ativa',
  TRUE
);
```

### 3.3 Obter ID da Campanha

```sql
SELECT id, nome FROM instacar_campanhas WHERE nome = 'Teste Disparo Completo';
```

**Anote o ID** - você precisará dele para disparar.

---

## 4. Configuração do Workflow N8N

### 4.1 Verificar Webhook URL

1. No N8N, abra o workflow `Disparador_Web_Campanhas_Instacar`
2. Clique no nó "Webhook Trigger - Campanha"
3. Anote a URL do webhook (ex: `https://seu-n8n.com/webhook/campanha`)

### 4.2 Verificar Variáveis

1. Abra o nó "Set Variables - CONFIGURAR AQUI"
2. Verifique se todas as variáveis estão configuradas:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `OPENAI_MODEL`

### 4.3 Verificar Credenciais

1. Verifique se a credencial Supabase está configurada
2. Verifique se a credencial OpenAI está configurada

### 4.4 Ativar Workflow

1. Clique no toggle **Active** para ativar o workflow
2. O workflow deve estar verde (ativo)

---

## 5. Execução do Disparo

### 5.1 Disparo Manual via Interface Web

1. Na interface web, encontre a campanha "Teste Disparo Completo"
2. Clique em "Disparar"
3. Aguarde confirmação

### 5.2 Disparo Manual via Webhook (curl)

```bash
curl -X POST https://seu-n8n.com/webhook/campanha \
  -H "Content-Type: application/json" \
  -d '{
    "campanha_id": "uuid-da-campanha-aqui",
    "trigger_tipo": "manual"
  }'
```

**Substitua:**

- `https://seu-n8n.com/webhook/campanha` pela URL real do webhook
- `uuid-da-campanha-aqui` pelo ID da campanha obtido no passo 3.3

### 5.3 Disparo Manual via N8N

1. No N8N, abra o workflow
2. Clique no nó "Manual Trigger"
3. No painel direito, adicione JSON:

```json
{
  "campanha_id": "uuid-da-campanha-aqui"
}
```

4. Clique em "Execute Node"

---

## 6. Validação de Cada Etapa

### 6.1 Verificar Execução no N8N

1. No N8N, vá em **Executions**
2. Encontre a execução mais recente
3. Clique para ver detalhes

**Verifique cada nó:**

- ✅ **Validar Payload** - Deve ter `campanha_id`
- ✅ **Obter Campanha** - Deve retornar dados da campanha
- ✅ **Validar Período** - Deve passar (se dentro do período)
- ✅ **Verificar Execução Hoje** - Pode retornar vazio (primeira execução)
- ✅ **Criar Execução** - Deve criar registro em `instacar_campanhas_execucoes`
- ✅ **Buscar Clientes Elegíveis** - Deve retornar seus 5 clientes de teste
- ✅ **Filtrar Clientes Elegíveis** - Deve manter os 5 clientes
- ✅ **Calcular Lote e Verificar Horário** - Deve selecionar lote de 5 clientes
- ✅ **Split in Batches** - Deve processar um por vez
- ✅ **Verificar Duplicata** - Deve retornar vazio (primeira vez)
- ✅ **Preparar Dados IA Campanha** - Deve montar contexto com prompt
- ✅ **Buscar Instância WhatsApp** - Deve retornar instância Uazapi
- ✅ **Combinar Dados Cliente Campanha API** - Deve mesclar dados
- ✅ **AI Agent - Gerar Mensagem** - Deve gerar mensagem personalizada
- ✅ **Processar Mensagem IA** - Deve extrair mensagem
- ✅ **Preparar Envio WhatsApp** - Deve preparar URL/headers/body para Uazapi
- ✅ **Enviar Mensagem WhatsApp** - Deve enviar via Uazapi
- ✅ **Processar Resultado Envio** - Deve detectar sucesso/erro
- ✅ **Registrar Histórico Campanha** - Deve salvar no Supabase
- ✅ **Atualizar Controle Diário** - Deve incrementar contadores
- ✅ **Verificar Limite Diário** - Deve verificar se atingiu limite
- ✅ **Calcular Intervalo** - Deve calcular intervalo (130-150s ou fixo)
- ✅ **Wait - Intervalo** - Deve aguardar antes do próximo cliente

### 6.2 Verificar Logs de Erro

Se algum nó falhar:

1. Clique no nó com erro
2. Veja a mensagem de erro
3. Verifique os dados de entrada
4. Consulte seção [Troubleshooting](#8-troubleshooting)

---

## 7. Verificação de Resultados

### 7.1 Verificar Execução Criada

```sql
SELECT
  id, campanha_id, data_execucao, status_execucao,
  total_enviado, total_erros, horario_inicio, horario_fim
FROM instacar_campanhas_execucoes
WHERE campanha_id = 'uuid-da-campanha-aqui'
ORDER BY created_at DESC
LIMIT 1;
```

**Esperado:**

- `status_execucao` = `'em_andamento'` ou `'concluida'`
- `total_enviado` = número de mensagens enviadas com sucesso

### 7.2 Verificar Histórico de Envios

```sql
SELECT
  telefone, nome_cliente, mensagem_enviada, status_envio,
  timestamp_envio, mensagem_erro
FROM instacar_historico_envios
WHERE campanha_id = 'uuid-da-campanha-aqui'
ORDER BY timestamp_envio DESC;
```

**Esperado:**

- 5 registros (um para cada cliente de teste)
- `status_envio` = `'enviado'` (se sucesso) ou `'erro'` (se falhou)
- `mensagem_enviada` contém a mensagem gerada pela IA
- `timestamp_envio` com data/hora do envio

### 7.3 Verificar Controle Diário

```sql
SELECT
  data, campanha_id, total_enviado, total_erros,
  total_duplicados, total_sem_whatsapp
FROM instacar_controle_envios
WHERE data = CURRENT_DATE
  AND campanha_id = 'uuid-da-campanha-aqui';
```

**Esperado:**

- `total_enviado` = número de mensagens enviadas com sucesso
- `total_erros` = número de erros (se houver)

### 7.4 Verificar Mensagens Enviadas (Uazapi)

Se você tem acesso ao painel Uazapi:

1. Acesse o painel da sua instância
2. Verifique a seção de mensagens enviadas
3. Confirme que as mensagens foram enviadas para os números de teste

**Nota:** Se usou números de teste (não reais), as mensagens podem falhar na validação do WhatsApp, mas o sistema deve registrar o envio.

---

## 8. Troubleshooting

### 8.1 Erro: "Instância WhatsApp não encontrada"

**Causa:** Campo `whatsapp_api_id` não configurado na campanha ou instância inativa.

**Solução:**

```sql
-- Verificar se campanha tem whatsapp_api_id
SELECT id, nome, whatsapp_api_id
FROM instacar_campanhas
WHERE id = 'uuid-da-campanha';

-- Verificar se instância existe e está ativa
SELECT id, nome, tipo_api, ativo
FROM instacar_whatsapp_apis
WHERE id = 'uuid-da-instancia';

-- Atualizar campanha com instância
UPDATE instacar_campanhas
SET whatsapp_api_id = 'uuid-da-instancia-ativa'
WHERE id = 'uuid-da-campanha';
```

### 8.2 Erro: "campanha_id não fornecido"

**Causa:** Payload do webhook não contém `campanha_id`.

**Solução:**

- Verifique o payload enviado
- Certifique-se de incluir `campanha_id` no body do POST

### 8.3 Erro: "Campanha não encontrada ou inativa"

**Causa:** Campanha não existe, está inativa ou status não é 'ativa'.

**Solução:**

```sql
-- Verificar status da campanha
SELECT id, nome, status, ativo
FROM instacar_campanhas
WHERE id = 'uuid-da-campanha';

-- Ativar campanha se necessário
UPDATE instacar_campanhas
SET status = 'ativa', ativo = TRUE
WHERE id = 'uuid-da-campanha';
```

### 8.4 Erro: "Nenhum cliente elegível encontrado"

**Causa:** Clientes não atendem aos filtros (ativo=false, status_whatsapp!='valid').

**Solução:**

```sql
-- Verificar clientes
SELECT telefone, nome_cliente, ativo, status_whatsapp
FROM instacar_clientes_envios
WHERE telefone LIKE '551199999%';

-- Corrigir se necessário
UPDATE instacar_clientes_envios
SET ativo = TRUE, status_whatsapp = 'valid'
WHERE telefone LIKE '551199999%';
```

### 8.5 Erro na Geração de Mensagem (IA)

**Causa:** OpenAI API Key inválida ou modelo não disponível.

**Solução:**

1. Verifique a credencial OpenAI no N8N
2. Verifique se o modelo especificado existe (ex: `gpt-4.1`)
3. Verifique créditos da conta OpenAI

**Fallback:** O sistema deve usar mensagem de fallback se a IA falhar.

### 8.6 Erro no Envio (Uazapi)

**Causa:** Token inválido, instância desconectada ou número inválido.

**Solução:**

1. Verifique o token da instância no Supabase
2. Verifique se a instância está conectada no painel Uazapi
3. Verifique se o número está no formato correto (`55XXXXXXXXXXX`)

**Verificar resposta da API:**

No nó "Processar Resultado Envio", veja o campo `respostaApi` para detalhes do erro.

### 8.7 Workflow Pausa Antes de Processar Todos

**Causa:** Atingiu limite diário ou saiu do horário configurado.

**Solução:**

```sql
-- Verificar limite diário
SELECT
  data, campanha_id, total_enviado
FROM instacar_controle_envios
WHERE data = CURRENT_DATE
  AND campanha_id = 'uuid-da-campanha';

-- Verificar horário configurado
SELECT horario_inicio, horario_fim
FROM instacar_campanhas
WHERE id = 'uuid-da-campanha';
```

**Ajustar para teste:**

- Aumente `limite_envios_dia` temporariamente
- Execute dentro do horário configurado (9h-18h)

### 8.8 Mensagens Não Aparecem no Histórico

**Causa:** Nó "Registrar Histórico Campanha" falhou ou não executou.

**Solução:**

1. Verifique logs do nó no N8N
2. Verifique se `campanha_id` e `execucao_id` estão presentes
3. Verifique permissões do Service Role Key no Supabase

---

## 9. Checklist de Validação Completa

Use este checklist para validar que tudo está funcionando:

- [ ] Clientes de teste criados e ativos
- [ ] Campanha criada com instância WhatsApp configurada
- [ ] Workflow N8N importado e ativo
- [ ] Credenciais configuradas (Supabase, OpenAI)
- [ ] Webhook acessível
- [ ] Disparo executado com sucesso
- [ ] Execução criada no Supabase
- [ ] Mensagens geradas pela IA
- [ ] Mensagens enviadas via Uazapi
- [ ] Histórico registrado no Supabase
- [ ] Controle diário atualizado
- [ ] Limite diário respeitado
- [ ] Intervalo entre envios funcionando
- [ ] Loop processa todos os clientes do lote

---

## 10. Próximos Passos Após Teste Bem-Sucedido

1. **Aumentar Escala:** Teste com mais clientes (10, 20, 50)
2. **Testar Limites:** Verifique comportamento ao atingir limite diário
3. **Testar Pausa/Retomada:** Verifique se execuções pausadas retomam corretamente
4. **Testar Agendamento:** Configure cron e teste execução automática
5. **Monitorar Performance:** Verifique tempo de execução e uso de recursos

---

## 11. Queries Úteis para Monitoramento

### Verificar Status Geral da Campanha

```sql
SELECT
  c.nome,
  c.status,
  c.limite_envios_dia,
  COUNT(DISTINCT e.id) as total_execucoes,
  COUNT(DISTINCT h.id) as total_envios,
  SUM(CASE WHEN h.status_envio = 'enviado' THEN 1 ELSE 0 END) as enviados,
  SUM(CASE WHEN h.status_envio = 'erro' THEN 1 ELSE 0 END) as erros
FROM instacar_campanhas c
LEFT JOIN instacar_campanhas_execucoes e ON e.campanha_id = c.id
LEFT JOIN instacar_historico_envios h ON h.campanha_id = c.id
WHERE c.id = 'uuid-da-campanha'
GROUP BY c.id, c.nome, c.status, c.limite_envios_dia;
```

### Verificar Últimas Execuções

```sql
SELECT
  e.data_execucao,
  e.status_execucao,
  e.total_enviado,
  e.total_erros,
  e.horario_inicio,
  e.horario_fim
FROM instacar_campanhas_execucoes e
WHERE e.campanha_id = 'uuid-da-campanha'
ORDER BY e.created_at DESC
LIMIT 10;
```

### Verificar Taxa de Sucesso

```sql
SELECT
  DATE(timestamp_envio) as data,
  COUNT(*) as total,
  SUM(CASE WHEN status_envio = 'enviado' THEN 1 ELSE 0 END) as sucesso,
  SUM(CASE WHEN status_envio = 'erro' THEN 1 ELSE 0 END) as erros,
  ROUND(
    SUM(CASE WHEN status_envio = 'enviado' THEN 1 ELSE 0 END) * 100.0 / COUNT(*),
    2
  ) as taxa_sucesso_percent
FROM instacar_historico_envios
WHERE campanha_id = 'uuid-da-campanha'
GROUP BY DATE(timestamp_envio)
ORDER BY data DESC;
```

---

**Data:** Janeiro 2025  
**Status:** ✅ Guia completo para testes end-to-end
