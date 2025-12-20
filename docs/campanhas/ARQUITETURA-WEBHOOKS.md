# Arquitetura de Webhooks - Sistema de Campanhas

## ✅ Resposta: Sim, apenas um webhook é chamado

A interface web e os workflows auxiliares chamam **apenas um webhook**: o do workflow principal `Disparador_Web_Campanhas_Instacar.json`.

## 🏗️ Arquitetura de Disparo

### Fluxo Único Centralizado

```
┌─────────────────────────────────────────────────────────────┐
│                    FONTES DE DISPARO                         │
│                                                             │
│  1. Interface Web (Manual)                                  │
│  2. Disparador_Campanhas_Agendadas (Automático)            │
│  3. Continuar_Execucoes_Pendentes (Automático)             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Todos chamam o mesmo webhook
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              WEBHOOK ÚNICO                                   │
│                                                             │
│  URL: https://seu-n8n.com/webhook/campanha                  │
│  Path: /campanha                                            │
│  Método: POST                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│     WORKFLOW PRINCIPAL                                       │
│     Disparador_Web_Campanhas_Instacar.json                  │
│                                                             │
│  - Recebe: { campanha_id, trigger_tipo, ... }              │
│  - Processa toda a campanha                                  │
│  - Gerencia execuções                                       │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Detalhamento das Fontes

### 1. Interface Web (Disparo Manual)

**Função:** `dispararCampanha(id)` em `interface-web/app.js`

**Chamada:**

```javascript
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    campanha_id: id,
    trigger_tipo: "manual",
  }),
});
```

**Webhook chamado:**

- URL: Configurada em `localStorage.getItem("n8nWebhookUrl")` ou `window.INSTACAR_CONFIG.n8nWebhookUrl`
- Path: `/campanha` (completo: `https://seu-n8n.com/webhook/campanha`)

### 2. Disparador de Campanhas Agendadas

**Workflow:** `Disparador_Campanhas_Agendadas.json`

**Chamada:**

```javascript
// Nó: "Chamar Webhook Campanha"
{
  "method": "POST",
  "url": "={{ $('Set Variables').first().json.WEBHOOK_CAMPANHA_URL }}",
  "jsonBody": {
    "campanha_id": "{{ $('Filtrar Campanhas para Executar').item.json.id }}",
    "trigger_tipo": "cron"
  }
}
```

**Webhook chamado:**

- URL: Variável `WEBHOOK_CAMPANHA_URL` configurada no workflow
- Deve apontar para: `https://seu-n8n.com/webhook/campanha`

### 3. Continuar Execuções Pendentes

**Workflow:** `Continuar_Execucoes_Pendentes.json`

**Chamada:**

```javascript
// Nó: "Chamar Webhook Continuar"
{
  "method": "POST",
  "url": "={{ $('Set Variables').first().json.WEBHOOK_CAMPANHA_URL }}",
  "jsonBody": {
    "execucao_id": "{{ $json.id }}",
    "trigger_tipo": "cron",
    "continuar": true
  }
}
```

**Webhook chamado:**

- URL: Variável `WEBHOOK_CAMPANHA_URL` configurada no workflow
- Deve apontar para: `https://seu-n8n.com/webhook/campanha`

## 🎯 Webhook Único

### Configuração do Webhook

**Workflow:** `Disparador_Web_Campanhas_Instacar.json`

**Nó:** "Webhook Trigger - Campanha"

**Configuração:**

```json
{
  "httpMethod": "POST",
  "path": "campanha",
  "responseMode": "onReceived"
}
```

**URL Completa:**

```
https://[seu-n8n-url]/webhook/campanha
```

### Payload Recebido

O webhook aceita diferentes formatos de payload:

**Formato 1: Disparo Manual (Interface Web)**

```json
{
  "campanha_id": "uuid-da-campanha",
  "trigger_tipo": "manual"
}
```

**Formato 2: Campanha Agendada**

```json
{
  "campanha_id": "uuid-da-campanha",
  "trigger_tipo": "cron"
}
```

**Formato 3: Continuar Execução**

```json
{
  "execucao_id": "uuid-da-execucao",
  "trigger_tipo": "cron",
  "continuar": true
}
```

### Validação no Workflow

O nó "Validar Payload" processa todos os formatos:

```javascript
const webhookData = $input.first()?.json?.body || $input.first()?.json || {};
const campanhaId = webhookData.campanha_id || $json.campanha_id || null;
const triggerTipo = webhookData.trigger_tipo || "manual";
const execucaoId = webhookData.execucao_id || null;
const continuar = webhookData.continuar || false;

if (!campanhaId && !execucaoId) {
  throw new Error("campanha_id ou execucao_id não fornecido");
}
```

## ✅ Vantagens da Arquitetura Única

### 1. Centralização

- **Um único ponto de entrada**: Todas as chamadas passam pelo mesmo webhook
- **Lógica unificada**: Validação e processamento em um só lugar
- **Manutenção simplificada**: Mudanças aplicadas a todas as fontes

### 2. Escalabilidade

- **Sem limite de campanhas**: Não precisa criar webhook por campanha
- **Processamento distribuído**: Múltiplas campanhas podem ser processadas
- **Gerenciamento centralizado**: Um único workflow gerencia tudo

### 3. Flexibilidade

- **Múltiplas fontes**: Interface web, agendamento, continuação
- **Parâmetros dinâmicos**: Cada fonte pode passar parâmetros específicos
- **Contexto preservado**: `trigger_tipo` identifica a origem

### 4. Rastreabilidade

- **Auditoria completa**: Cada chamada tem `trigger_tipo` identificado
- **Logs centralizados**: Todas as execuções em um workflow
- **Debug facilitado**: Um único ponto para investigar problemas

## 🔧 Configuração Necessária

### Interface Web

**Local:** Configurações > "URL do Webhook N8N"

**Valor:** `https://seu-n8n.com/webhook/campanha`

**Armazenamento:**

- `localStorage.getItem("n8nWebhookUrl")`
- Ou `window.INSTACAR_CONFIG.n8nWebhookUrl`

### Workflow: Disparador Agendadas

**Nó:** "Set Variables"

**Variável:** `WEBHOOK_CAMPANHA_URL`

**Valor:** `https://seu-n8n.com/webhook/campanha`

### Workflow: Continuar Execuções

**Nó:** "Set Variables"

**Variável:** `WEBHOOK_CAMPANHA_URL`

**Valor:** `https://seu-n8n.com/webhook/campanha`

## 📝 Resumo

| Fonte de Disparo         | Webhook Chamado     | Payload                                                  |
| ------------------------ | ------------------- | -------------------------------------------------------- |
| **Interface Web**        | `/webhook/campanha` | `{ campanha_id, trigger_tipo: "manual" }`                |
| **Disparador Agendadas** | `/webhook/campanha` | `{ campanha_id, trigger_tipo: "cron" }`                  |
| **Continuar Execuções**  | `/webhook/campanha` | `{ execucao_id, trigger_tipo: "cron", continuar: true }` |

**Conclusão:** Todas as fontes chamam o **mesmo webhook** (`/webhook/campanha`) do workflow `Disparador_Web_Campanhas_Instacar.json`.

## 🎯 Benefícios

1. ✅ **Simplicidade**: Um único webhook para configurar
2. ✅ **Manutenção**: Mudanças em um só lugar
3. ✅ **Escalabilidade**: Suporta qualquer número de campanhas
4. ✅ **Rastreabilidade**: `trigger_tipo` identifica origem
5. ✅ **Flexibilidade**: Aceita diferentes formatos de payload

---

**Data:** Janeiro 2025  
**Status:** ✅ Arquitetura Validada
