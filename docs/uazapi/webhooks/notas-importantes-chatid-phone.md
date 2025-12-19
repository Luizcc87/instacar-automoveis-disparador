# Notas Importantes - chatid e phone no Webhook Uazapi

## ⚠️ Problema Identificado

Ao processar webhooks da Uazapi, foi identificado um problema relacionado ao uso do campo `chatid` para enviar mensagens de resposta.

### Situação

No webhook recebido, o campo `chatid` vem no formato:
```json
"chatid": "554399806366@s.whatsapp.net"
```

### Problema

Quando tentamos usar esse `chatid` diretamente para enviar uma mensagem de resposta, pode ocorrer erro porque:

1. **Formato do chatid**: O `chatid` pode vir com o sufixo `@s.whatsapp.net` que pode não ser aceito diretamente pela API de envio
2. **Campo phone**: A API de envio pode esperar apenas o número sem o sufixo
3. **Normalização necessária**: Pode ser necessário extrair apenas o número antes do `@`

### Solução Recomendada

#### Para N8N - Extrair número do chatid

```javascript
// Extrair apenas o número do chatid (remover @s.whatsapp.net)
{{ $json.body.data.chatid.split('@')[0] }}

// Ou usar sender_pn e extrair o número
{{ $json.body.data.sender_pn.split('@')[0] }}
```

#### Exemplo de Expressão N8N

```javascript
// Número do remetente para enviar resposta
{{ 
  $json.body.data.chatid 
    ? $json.body.data.chatid.split('@')[0] 
    : $json.body.data.sender_pn.split('@')[0] 
}}
```

### Campos Disponíveis no Webhook

| Campo | Valor no Exemplo | Uso Recomendado |
|-------|------------------|-----------------|
| `chatid` | `"554399806366@s.whatsapp.net"` | Extrair número: `split('@')[0]` |
| `sender_pn` | `"554399806366@s.whatsapp.net"` | Extrair número: `split('@')[0]` |
| `sender` | `"180182702931994@lid"` | ID LID do remetente |
| `sender_lid` | `"180182702931994@lid"` | ID LID do remetente |
| `senderName` | `"Eliane"` | Nome do remetente |

### Formato Correto para Envio

Para enviar mensagem de resposta, use apenas o número:

```json
{
  "number": "554399806366",
  "text": "Olá! Como posso ajudar?"
}
```

**NÃO use:**
```json
{
  "number": "554399806366@s.whatsapp.net",  // ❌ Erro
  "text": "Olá! Como posso ajudar?"
}
```

### Validação no N8N

Adicione uma validação antes de enviar:

```javascript
// Validar e normalizar número
{{
  (() => {
    const chatid = $json.body.data.chatid || $json.body.data.sender_pn || '';
    const number = chatid.split('@')[0];
    
    // Validar se é um número válido (apenas dígitos)
    if (!/^\d+$/.test(number)) {
      throw new Error('Número inválido: ' + chatid);
    }
    
    return number;
  })()
}}
```

### Exemplo Completo de Processamento

```javascript
// 1. Extrair dados do webhook
const webhookData = $json.body.data;
const chatid = webhookData.chatid || webhookData.sender_pn || '';
const phoneNumber = chatid.split('@')[0];
const messageText = webhookData.text || '';
const senderName = webhookData.senderName || 'Desconhecido';

// 2. Validar número
if (!phoneNumber || !/^\d+$/.test(phoneNumber)) {
  throw new Error(`Número inválido extraído de: ${chatid}`);
}

// 3. Retornar dados normalizados
return {
  phone: phoneNumber,
  originalChatid: chatid,
  message: messageText,
  sender: senderName,
  isGroup: webhookData.isGroup || false,
  fromMe: webhookData.fromMe || false
};
```

---

## 📝 Observações Adicionais

### Diferenças entre Campos

- **`chatid`**: ID da conversa (pode ser número ou grupo)
- **`sender_pn`**: Número do remetente com sufixo WhatsApp
- **`sender`**: ID LID do remetente (formato `@lid`)
- **`sender_lid`**: Mesmo que `sender` (ID LID)

### Para Grupos

Se `isGroup: true`, o `chatid` será do formato:
```json
"chatid": "120363123456789012@g.us"
```

Nesse caso, use o `chatid` completo para responder no grupo.

### Para Conversas Individuais

Se `isGroup: false`, sempre extraia o número do `chatid` ou `sender_pn`:
```javascript
{{ $json.body.data.chatid.split('@')[0] }}
```

---

**Última atualização:** 2025-01-24  
**Baseado em:** Webhook real recebido da Uazapi

