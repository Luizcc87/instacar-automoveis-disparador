# 🧪 Guia Completo: Teste de Disparo de Campanha

Este guia fornece um **fluxo passo a passo** para testar um disparo completo de campanha, desde a preparação até a verificação dos resultados.

## 📋 Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Preparação do Ambiente](#2-preparação-do-ambiente)
3. [Criar Campanha de Teste](#3-criar-campanha-de-teste)
4. [Preparar Clientes de Teste](#4-preparar-clientes-de-teste)
5. [Configurar N8N](#5-configurar-n8n)
6. [Executar Disparo](#6-executar-disparo)
7. [Verificar Resultados](#7-verificar-resultados)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Pré-requisitos

Antes de começar, certifique-se de que:

- ✅ **Supabase** configurado e tabelas criadas
- ✅ **N8N** instalado e acessível
- ✅ **Workflow** `Disparador_Web_Campanhas_Instacar.json` importado e ativo
- ✅ **Instância WhatsApp** (Uazapi/Z-API/Evolution) configurada e ativa
- ✅ **OpenAI API Key** configurada no N8N (se usar IA)
- ✅ **Interface Web** acessível (opcional, para disparo manual)

---

## 2. Preparação do Ambiente

### 2.1 Verificar Conexão com Supabase

Execute no **Supabase SQL Editor**:

```sql
-- Verificar se as tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'instacar%'
ORDER BY table_name;

-- Resultado esperado:
-- instacar_campanhas
-- instacar_campanhas_execucoes
-- instacar_clientes_envios
-- instacar_historico_envios
```

### 2.2 Verificar Configuração do N8N

1. Acesse o N8N
2. Abra o workflow `Disparador_Web_Campanhas_Instacar`
3. Verifique se o workflow está **ativo** (toggle no canto superior direito)
4. Verifique o nó **"Set Variables - CONFIGURAR AQUI"**:
   - `SUPABASE_URL` configurado
   - `SUPABASE_SERVICE_KEY` configurado
   - `UAZAPI_BASE_URL` configurado
   - `UAZAPI_TOKEN` configurado
   - `OPENAI_API_KEY` configurado (se usar IA)

### 2.3 Obter URL do Webhook

1. No workflow `Disparador_Web_Campanhas_Instacar`, localize o nó **"Webhook"**
2. Copie a URL do webhook (ex: `https://seu-n8n.com/webhook/campanha`)
3. Anote esta URL para usar na interface web

---

## 3. Criar Campanha de Teste

### 3.1 Via Interface Web (Recomendado)

1. Acesse a interface web: `https://instacar-automoveis-disparador.pages.dev/`
2. Clique em **"Criar Nova Campanha"**
3. Preencha o formulário:

   ```
   Nome da Campanha: Teste Disparo - [Data Atual]
   Descrição: Campanha de teste para validar fluxo completo
   Período do Ano: Dezembro
   Status: Ativa
   Data Início: [Data de hoje]
   Data Fim: [Data de hoje + 7 dias]
   Limite de Envios/Dia: 5
   Intervalo Mínimo (dias): 0
   Intervalo Entre Envios: (deixe vazio para padrão)
   Prioridade: 5
   Instância API WhatsApp: [Selecione sua instância]
   Agendamento Cron: (deixe vazio - disparo manual)
   Prompt Personalizado para IA: 
     "Envie uma mensagem de teste amigável e breve (máximo 100 caracteres).
      Mencione que é um teste do sistema.
      Chame o cliente pelo nome."
   Template de Mensagem: (deixe vazio)
   Tamanho do Lote: 5
   Horário Início: 09:00
   Horário Fim: 18:00
   Incluir Informações de Veículos: ✅ (marcado)
   Incluir Nome do Vendedor: ✅ (marcado)
   Processar Finais de Semana: ❌ (desmarcado)
   ```

4. Clique em **"Salvar"**
5. **Anote o ID da campanha** (aparece na URL ou no console do navegador)

### 3.2 Via Supabase (Alternativo)

Se preferir criar diretamente no banco:

```sql
INSERT INTO instacar_campanhas (
  nome,
  descricao,
  periodo_ano,
  status,
  data_inicio,
  data_fim,
  limite_envios_dia,
  intervalo_minimo_dias,
  prioridade,
  whatsapp_api_id,
  prompt_ia,
  tamanho_lote,
  horario_inicio,
  horario_fim,
  usar_veiculos,
  usar_vendedor,
  processar_finais_semana,
  ativo
) VALUES (
  'Teste Disparo - ' || CURRENT_DATE,
  'Campanha de teste para validar fluxo completo',
  'dezembro',
  'ativa',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '7 days',
  5,
  0,
  5,
  '[UUID-DA-INSTANCIA-WHATSAPP]', -- Substitua pelo UUID real
  'Envie uma mensagem de teste amigável e breve (máximo 100 caracteres). Mencione que é um teste do sistema. Chame o cliente pelo nome.',
  5,
  '09:00:00',
  '18:00:00',
  true,
  true,
  false,
  true
) RETURNING id;
```

**Anote o ID retornado!**

---

## 4. Preparar Clientes de Teste

### 4.1 Verificar Clientes Existentes

Execute no **Supabase SQL Editor**:

```sql
-- Verificar clientes disponíveis
SELECT 
  id,
  telefone,
  nome_cliente,
  status_whatsapp,
  total_envios,
  ativo
FROM instacar_clientes_envios
WHERE ativo = true
  AND status_whatsapp = 'valid'
ORDER BY created_at DESC
LIMIT 10;
```

### 4.2 Criar Clientes de Teste (Se Necessário)

Se não houver clientes suficientes, crie alguns de teste:

```sql
-- Criar cliente de teste 1
INSERT INTO instacar_clientes_envios (
  telefone,
  nome_cliente,
  status_whatsapp,
  veiculos,
  ativo
) VALUES (
  '5511999999999', -- ⚠️ Use um número de teste real (seu próprio WhatsApp)
  'Cliente Teste 1',
  'valid',
  '[{"modelo": "Honda Civic", "placa": "ABC1234", "vendedor": "João Silva"}]'::jsonb,
  true
) ON CONFLICT (telefone) DO UPDATE SET
  nome_cliente = EXCLUDED.nome_cliente,
  status_whatsapp = 'valid',
  ativo = true
RETURNING id, telefone;

-- Criar cliente de teste 2
INSERT INTO instacar_clientes_envios (
  telefone,
  nome_cliente,
  status_whatsapp,
  veiculos,
  ativo
) VALUES (
  '5511888888888', -- ⚠️ Use outro número de teste
  'Cliente Teste 2',
  'valid',
  '[{"modelo": "Toyota Corolla", "placa": "XYZ5678", "vendedor": "Maria Santos"}]'::jsonb,
  true
) ON CONFLICT (telefone) DO UPDATE SET
  nome_cliente = EXCLUDED.nome_cliente,
  status_whatsapp = 'valid',
  ativo = true
RETURNING id, telefone;
```

**⚠️ IMPORTANTE:** Use números de WhatsApp reais (preferencialmente seus próprios números) para receber as mensagens de teste.

### 4.3 Limpar Histórico de Teste (Opcional)

Se quiser limpar envios anteriores de teste:

```sql
-- ⚠️ CUIDADO: Isso apaga histórico de envios!
-- Execute apenas em ambiente de teste

-- Limpar histórico de envios de teste
DELETE FROM instacar_historico_envios
WHERE campanha_id IN (
  SELECT id FROM instacar_campanhas WHERE nome LIKE 'Teste%'
);

-- Resetar contadores de clientes de teste
UPDATE instacar_clientes_envios
SET total_envios = 0
WHERE telefone IN ('5511999999999', '5511888888888');
```

---

## 5. Configurar N8N

### 5.1 Verificar Workflow Principal

1. No N8N, abra o workflow `Disparador_Web_Campanhas_Instacar`
2. Verifique se está **ativo**
3. Verifique o nó **"Webhook"**:
   - Path: `/campanha` (ou o path configurado)
   - Método: `POST`
   - Status: ✅ Ativo

### 5.2 Configurar URL do Webhook na Interface Web

1. Na interface web, vá em **"⚙️ Gerenciar Configurações"**
2. No campo **"URL do Webhook N8N"**, cole a URL do webhook:
   ```
   https://seu-n8n.com/webhook/campanha
   ```
3. Clique em **"💾 Salvar Configurações"**

### 5.3 Testar Conexão do Webhook

Execute no terminal (ou Postman):

```bash
curl -X POST https://seu-n8n.com/webhook/campanha \
  -H "Content-Type: application/json" \
  -d '{
    "campanha_id": "[UUID-DA-CAMPANHA]",
    "trigger_tipo": "manual"
  }'
```

**Substitua `[UUID-DA-CAMPANHA]` pelo ID real da campanha criada.**

**Resultado esperado:**
- Status `200 OK` ou `201 Created`
- Resposta do N8N confirmando recebimento

---

## 6. Executar Disparo

### 6.1 Via Interface Web (Recomendado)

1. Na interface web, localize a campanha de teste criada
2. Clique no botão **"🚀 Disparar"** (ou **"Disparar"**)
3. Confirme o disparo quando solicitado
4. Aguarde a mensagem de confirmação:
   ```
   ✅ Campanha disparada com sucesso!
   ```

### 6.2 Via N8N (Manual)

1. No N8N, abra o workflow `Disparador_Web_Campanhas_Instacar`
2. Clique em **"Execute Workflow"**
3. No modal, configure:
   ```json
   {
     "campanha_id": "[UUID-DA-CAMPANHA]",
     "trigger_tipo": "manual"
   }
   ```
4. Clique em **"Execute"**

### 6.3 Via cURL (Alternativo)

```bash
curl -X POST https://seu-n8n.com/webhook/campanha \
  -H "Content-Type: application/json" \
  -d '{
    "campanha_id": "[UUID-DA-CAMPANHA]",
    "trigger_tipo": "manual"
  }'
```

---

## 7. Verificar Resultados

### 7.1 Verificar Execução no N8N

1. No N8N, vá em **"Executions"** (menu lateral)
2. Localize a execução mais recente do workflow
3. Clique na execução para ver detalhes
4. Verifique cada nó:
   - ✅ **"Validar Payload"** - Deve passar
   - ✅ **"Obter Campanha"** - Deve retornar dados da campanha
   - ✅ **"Validar Período"** - Deve passar
   - ✅ **"Buscar Clientes Elegíveis"** - Deve retornar clientes
   - ✅ **"Filtrar Clientes Elegíveis"** - Deve filtrar corretamente
   - ✅ **"Calcular Lote"** - Deve calcular lote atual
   - ✅ **"Preparar Dados IA Campanha"** - Deve montar contexto
   - ✅ **"AI Agent - Gerar Mensagem"** - Deve gerar mensagem (se implementado)
   - ✅ **"Uazapi - Enviar Mensagem"** - Deve enviar (se implementado)
   - ✅ **"Registrar Histórico"** - Deve registrar (se implementado)

### 7.2 Verificar Execução no Supabase

Execute no **Supabase SQL Editor**:

```sql
-- Verificar execução criada
SELECT 
  e.*,
  c.nome as campanha_nome
FROM instacar_campanhas_execucoes e
JOIN instacar_campanhas c ON c.id = e.campanha_id
WHERE c.nome LIKE 'Teste%'
ORDER BY e.horario_inicio DESC
LIMIT 5;
```

**Resultado esperado:**
- Uma execução registrada
- `status_execucao`: `em_andamento` ou `concluida`
- `total_enviado`: Número de mensagens enviadas

### 7.3 Verificar Histórico de Envios

```sql
-- Verificar mensagens enviadas
SELECT 
  h.*,
  c.nome as campanha_nome,
  cl.nome_cliente,
  cl.telefone
FROM instacar_historico_envios h
JOIN instacar_campanhas c ON c.id = h.campanha_id
JOIN instacar_clientes_envios cl ON cl.id = h.cliente_id
WHERE c.nome LIKE 'Teste%'
ORDER BY h.timestamp_envio DESC
LIMIT 10;
```

**Resultado esperado:**
- Registros de envio para cada cliente
- `status_envio`: `enviado` ou `erro`
- `texto_mensagem`: Mensagem gerada pela IA

### 7.4 Verificar Mensagens Recebidas

1. Abra o WhatsApp nos números de teste configurados
2. Verifique se as mensagens foram recebidas
3. Confirme que:
   - ✅ Mensagem contém o nome do cliente
   - ✅ Mensagem segue o prompt configurado
   - ✅ Mensagem é breve e amigável

### 7.5 Verificar Atualização de Clientes

```sql
-- Verificar contadores atualizados
SELECT 
  telefone,
  nome_cliente,
  total_envios,
  ultimo_envio,
  status_whatsapp
FROM instacar_clientes_envios
WHERE telefone IN ('5511999999999', '5511888888888')
ORDER BY ultimo_envio DESC;
```

**Resultado esperado:**
- `total_envios` incrementado
- `ultimo_envio` atualizado com data/hora atual

---

## 8. Troubleshooting

### 8.1 Webhook Não Recebe Requisições

**Sintomas:**
- Nenhuma execução aparece no N8N
- Erro 404 ou 500 ao chamar webhook

**Soluções:**
1. Verifique se o workflow está **ativo**
2. Verifique se a URL do webhook está correta
3. Verifique logs do N8N para erros
4. Teste o webhook diretamente via cURL/Postman

### 8.2 Campanha Não Encontrada

**Sintomas:**
- Erro no nó "Obter Campanha"
- Mensagem: "Campanha não encontrada"

**Soluções:**
1. Verifique se o `campanha_id` está correto
2. Verifique se a campanha existe no Supabase:
   ```sql
   SELECT * FROM instacar_campanhas WHERE id = '[UUID]';
   ```
3. Verifique se `status = 'ativa'` e `ativo = true`

### 8.3 Nenhum Cliente Elegível

**Sintomas:**
- Workflow executa mas não envia mensagens
- Mensagem: "Nenhum cliente elegível"

**Soluções:**
1. Verifique se há clientes no Supabase:
   ```sql
   SELECT COUNT(*) FROM instacar_clientes_envios 
   WHERE ativo = true AND status_whatsapp = 'valid';
   ```
2. Verifique se os clientes estão dentro do período da campanha
3. Verifique se o intervalo mínimo não está bloqueando envios

### 8.4 Erro ao Enviar Mensagem

**Sintomas:**
- Erro no nó "Uazapi - Enviar Mensagem"
- Status: `erro` no histórico

**Soluções:**
1. Verifique se a instância WhatsApp está ativa
2. Verifique se o token está correto
3. Verifique logs do Uazapi para detalhes do erro
4. Verifique se o número de telefone está no formato correto (`55XXXXXXXXXXX`)

### 8.5 Mensagem Não Recebida

**Sintomas:**
- Workflow executa com sucesso
- Histórico mostra `enviado`
- Mas mensagem não chega no WhatsApp

**Soluções:**
1. Verifique se o número está correto
2. Verifique se o WhatsApp do número está conectado
3. Verifique logs do Uazapi para status de entrega
4. Aguarde alguns minutos (pode haver delay)

---

## 9. Checklist de Validação

Use este checklist para garantir que tudo está funcionando:

- [ ] Supabase conectado e tabelas criadas
- [ ] N8N configurado e workflow ativo
- [ ] Instância WhatsApp configurada e ativa
- [ ] Campanha criada com dados válidos
- [ ] Clientes de teste criados e ativos
- [ ] Webhook configurado e testado
- [ ] Disparo executado com sucesso
- [ ] Execução registrada no Supabase
- [ ] Histórico de envios criado
- [ ] Mensagens recebidas no WhatsApp
- [ ] Contadores de clientes atualizados

---

## 10. Próximos Passos

Após validar o teste básico:

1. **Teste com mais clientes** (10-20)
2. **Teste com diferentes configurações** (com/sem veículos, diferentes prompts)
3. **Teste agendamento cron** (se configurado)
4. **Teste limites e intervalos** (limite diário, intervalo mínimo)
5. **Monitore métricas** (taxa de sucesso, tempo de processamento)

---

## 📚 Referências

- [Guia Completo de Campanhas](GUIA-COMPLETO-CAMPANHAS.md)
- [Guia de Implementação N8N](../n8n/guia-implementacao-campanhas-n8n.md)
- [Arquitetura de Webhooks](ARQUITETURA-WEBHOOKS.md)
- [Troubleshooting](../n8n/troubleshooting.md)

---

**Última atualização:** Dezembro 2025  
**Status:** ✅ Guia completo e testado
