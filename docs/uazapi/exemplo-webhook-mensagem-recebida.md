# Uazapi - Exemplos de Webhook de Mensagens Recebidas

**Data de Criação:** 2025-01-24  
**Fonte:** Especificação OpenAPI da Uazapi (uazapi-openapi-spec.yaml)

---

## 📋 Índice

1. [Estrutura Geral do Webhook](#estrutura-geral-do-webhook)
2. [Exemplo de Mensagem de Texto](#exemplo-de-mensagem-de-texto)
3. [Exemplo de Mensagem de Imagem](#exemplo-de-mensagem-de-imagem)
4. [Exemplo de Mensagem de Áudio](#exemplo-de-mensagem-de-áudio)
5. [Exemplo de Mensagem de Vídeo](#exemplo-de-mensagem-de-vídeo)
6. [Exemplo de Mensagem de Documento](#exemplo-de-mensagem-de-documento)
7. [Exemplo de Mensagem de Grupo](#exemplo-de-mensagem-de-grupo)
8. [Exemplo de Mensagem com Resposta (Quoted)](#exemplo-de-mensagem-com-resposta-quoted)
9. [Campos Disponíveis no Schema Message](#campos-disponíveis-no-schema-message)
10. [Configuração do Webhook](#configuração-do-webhook)

---

## 🎯 Estrutura Geral do Webhook

Todos os webhooks da Uazapi seguem a estrutura `WebhookEvent`:

```json
{
  "event": "message",
  "instance": "ID_DA_INSTANCIA",
  "data": {
    // Payload específico do evento (Message, Connection, etc.)
  }
}
```

### Campos do WebhookEvent

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `event` | string | Tipo do evento (`message`, `status`, `presence`, `group`, `connection`) |
| `instance` | string | ID da instância que gerou o evento |
| `data` | object | Payload do evento (formato varia conforme o tipo) |

---

## 💬 Exemplo de Mensagem de Texto

### Webhook Completo

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "conversation",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "Olá, gostaria de informações sobre seus produtos",
    "quoted": "",
    "edited": "",
    "reaction": "",
    "vote": "",
    "convertOptions": "",
    "buttonOrListid": "",
    "owner": "user@example.com",
    "error": "",
    "content": {
      "type": "conversation",
      "body": "Olá, gostaria de informações sobre seus produtos"
    },
    "wasSentByApi": false,
    "sendFunction": "",
    "sendPayload": null,
    "fileURL": "",
    "send_folder_id": "",
    "track_source": "",
    "track_id": "",
    "ai_metadata": null,
    "sender_pn": "5511999999999",
    "sender_lid": "81896604192873@lid"
  }
}
```

### Campos Principais

- **`id`**: ID único interno da mensagem (formato `r` + 7 caracteres hex)
- **`messageid`**: ID original da mensagem no WhatsApp
- **`chatid`**: ID da conversa relacionada
- **`sender`**: ID do remetente (JID completo)
- **`senderName`**: Nome exibido do remetente
- **`text`**: Texto da mensagem
- **`messageType`**: Tipo de mensagem (`conversation`, `image`, `audio`, `video`, etc.)
- **`fromMe`**: `false` = recebida, `true` = enviada por você
- **`isGroup`**: `false` = conversa individual, `true` = grupo

---

## 🖼️ Exemplo de Mensagem de Imagem

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "image",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "Legenda da imagem (se houver)",
    "fileURL": "https://uazapi.com/files/image_123.jpg",
    "content": {
      "type": "image",
      "mimetype": "image/jpeg",
      "caption": "Legenda da imagem",
      "url": "https://uazapi.com/files/image_123.jpg"
    },
    "wasSentByApi": false
  }
}
```

---

## 🎵 Exemplo de Mensagem de Áudio

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "audio",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "",
    "fileURL": "https://uazapi.com/files/audio_123.ogg",
    "content": {
      "type": "audio",
      "mimetype": "audio/ogg; codecs=opus",
      "seconds": 45,
      "ptt": true,
      "url": "https://uazapi.com/files/audio_123.ogg"
    },
    "wasSentByApi": false
  }
}
```

---

## 🎥 Exemplo de Mensagem de Vídeo

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "video",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "Legenda do vídeo",
    "fileURL": "https://uazapi.com/files/video_123.mp4",
    "content": {
      "type": "video",
      "mimetype": "video/mp4",
      "caption": "Legenda do vídeo",
      "seconds": 30,
      "url": "https://uazapi.com/files/video_123.mp4"
    },
    "wasSentByApi": false
  }
}
```

---

## 📄 Exemplo de Mensagem de Documento

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "document",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "",
    "fileURL": "https://uazapi.com/files/document_123.pdf",
    "content": {
      "type": "document",
      "mimetype": "application/pdf",
      "filename": "documento.pdf",
      "caption": "Descrição do documento",
      "url": "https://uazapi.com/files/document_123.pdf"
    },
    "wasSentByApi": false
  }
}
```

---

## 👥 Exemplo de Mensagem de Grupo

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "120363123456789012@g.us",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": true,
    "fromMe": false,
    "messageType": "conversation",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "Mensagem no grupo",
    "content": {
      "type": "conversation",
      "body": "Mensagem no grupo"
    },
    "wasSentByApi": false,
    "sender_pn": "5511999999999",
    "sender_lid": "81896604192873@lid"
  }
}
```

---

## 💬 Exemplo de Mensagem com Resposta (Quoted)

```json
{
  "event": "message",
  "instance": "i91011ijkl",
  "data": {
    "id": "r1a2b3c4",
    "messageid": "3EB0123456789ABCDEF",
    "chatid": "r5f6g7h8",
    "sender": "5511999999999@s.whatsapp.net",
    "senderName": "João Silva",
    "isGroup": false,
    "fromMe": false,
    "messageType": "conversation",
    "source": "whatsapp",
    "messageTimestamp": 1706112000000,
    "status": "RECEIVED",
    "text": "Essa é a resposta",
    "quoted": "r9x8y7z6",
    "content": {
      "type": "conversation",
      "body": "Essa é a resposta",
      "contextInfo": {
        "quotedMessage": {
          "id": "r9x8y7z6",
          "messageId": "3EB0987654321FEDCBA",
          "text": "Mensagem original que foi respondida"
        }
      }
    },
    "wasSentByApi": false
  }
}
```

---

## 📊 Campos Disponíveis no Schema Message

### Campos Principais

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | string | ID único interno (r + 7 hex) | `"r1a2b3c4"` |
| `messageid` | string | ID original no WhatsApp | `"3EB0123456789ABCDEF"` |
| `chatid` | string | ID da conversa | `"r5f6g7h8"` |
| `sender` | string | JID do remetente | `"5511999999999@s.whatsapp.net"` |
| `senderName` | string | Nome do remetente | `"João Silva"` |
| `isGroup` | boolean | É grupo? | `false` |
| `fromMe` | boolean | Enviada por você? | `false` |
| `messageType` | string | Tipo de mensagem | `"conversation"`, `"image"`, `"audio"` |
| `source` | string | Plataforma de origem | `"whatsapp"` |
| `messageTimestamp` | integer | Timestamp em milissegundos | `1706112000000` |
| `status` | string | Status da mensagem | `"RECEIVED"`, `"SENT"`, `"READ"` |
| `text` | string | Texto da mensagem | `"Olá!"` |

### Campos de Conteúdo

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `content` | object/string | Conteúdo bruto (JSON ou texto) |
| `fileURL` | string | URL do arquivo (mídia) |
| `quoted` | string | ID da mensagem respondida |
| `edited` | string | Histórico de edições |
| `reaction` | string | ID da mensagem reagida |
| `vote` | string | Dados de votação/enquete |
| `buttonOrListid` | string | ID do botão/lista selecionado |

### Campos de Metadados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `owner` | string | Dono da mensagem |
| `error` | string | Mensagem de erro (se houver) |
| `wasSentByApi` | boolean | Enviada via API? |
| `sendFunction` | string | Função usada para enviar |
| `sendPayload` | object/string | Payload de envio |
| `send_folder_id` | string | Pasta de envio |
| `track_source` | string | Origem de rastreamento |
| `track_id` | string | ID de rastreamento |
| `ai_metadata` | object | Metadados de IA |
| `sender_pn` | string | JID PN resolvido |
| `sender_lid` | string | LID original do remetente |

---

## ⚙️ Configuração do Webhook

### Exemplo de Configuração (Modo Simples - Recomendado)

```json
{
  "url": "https://meusite.com/webhook",
  "events": ["messages"],
  "excludeMessages": ["wasSentByApi"]
}
```

### Endpoint de Configuração

```
POST https://{subdomain}.uazapi.com/webhook
```

### Headers

```
token: SEU_TOKEN_DA_INSTANCIA
Content-Type: application/json
```

### Eventos Disponíveis

- `connection`: Alterações no estado da conexão
- `history`: Recebimento de histórico de mensagens
- `messages`: Novas mensagens recebidas ⭐
- `messages_update`: Atualizações em mensagens existentes
- `call`: Eventos de chamadas VoIP
- `contacts`: Atualizações na agenda de contatos
- `presence`: Alterações no status de presença
- `groups`: Modificações em grupos
- `labels`: Gerenciamento de etiquetas
- `chats`: Eventos de conversas
- `chat_labels`: Alterações em etiquetas de conversas
- `blocks`: Bloqueios/desbloqueios
- `leads`: Atualizações de leads
- `sender`: Atualizações de campanhas

### Filtros de Mensagens (excludeMessages)

- `wasSentByApi`: Mensagens enviadas pela API ⚠️ **IMPORTANTE: Use sempre para evitar loops**
- `wasNotSentByApi`: Mensagens não enviadas pela API
- `fromMeYes`: Mensagens enviadas por você
- `fromMeNo`: Mensagens recebidas de terceiros
- `isGroupYes`: Mensagens em grupos
- `isGroupNo`: Mensagens em conversas individuais

---

## 🔍 Tipos de Mensagem (messageType)

Os tipos mais comuns de mensagem:

- `conversation`: Mensagem de texto simples
- `image`: Imagem
- `audio`: Áudio (incluindo notas de voz)
- `video`: Vídeo
- `document`: Documento/arquivo
- `sticker`: Figurinha
- `location`: Localização
- `contact`: Contato
- `vcard`: Cartão de visita
- `ptt`: Nota de voz (Push-to-Talk)
- `ptv`: Vídeo de nota de voz
- `interactive`: Mensagem interativa (botões, listas)
- `template`: Template de mensagem
- `order`: Pedido
- `product`: Produto
- `poll`: Enquete
- `poll_update`: Atualização de enquete

---

## ⚠️ Observações Importantes

### 1. Prevenção de Loops

**SEMPRE** inclua `"excludeMessages": ["wasSentByApi"]` na configuração do webhook para evitar loops infinitos quando sua automação envia mensagens via API.

### 2. Validade de Arquivos

Segundo a documentação da Uazapi, todos os arquivos de mídia recebidos através do webhook têm prazo de expiração de **30 dias**. Após esse período, os arquivos são excluídos do storage.

### 3. HTTPS Obrigatório

A Uazapi **não aceita webhooks que não sejam HTTPS**. Certifique-se de que sua URL de webhook use HTTPS válido.

### 4. Estrutura do `data`

O campo `data` no `WebhookEvent` contém um objeto `Message` completo quando o evento é `message`. A estrutura pode variar conforme o tipo de mensagem (texto, imagem, áudio, etc.).

---

## 📝 Notas de Implementação

### Processamento no N8N

Ao receber um webhook da Uazapi no N8N:

1. **Extrair o evento**: Verificar `event` para confirmar que é `"message"`
2. **Extrair dados**: Acessar `data` para obter os dados da mensagem
3. **Verificar filtros**: Checar `wasSentByApi` para evitar processar mensagens enviadas pela própria API
4. **Identificar tipo**: Usar `messageType` para processar diferentes tipos de mensagem
5. **Extrair texto**: Usar `text` para mensagens de texto ou `content.body` quando disponível
6. **Identificar remetente**: Usar `sender` ou `sender_pn` para identificar o contato

### Exemplo de Expressão N8N

```javascript
// Verificar se é mensagem recebida (não enviada por API)
{{ $json.body.data.fromMe === false && $json.body.data.wasSentByApi === false }}

// Extrair texto da mensagem
{{ $json.body.data.text }}

// Extrair número do remetente (sem @s.whatsapp.net)
{{ $json.body.data.sender.split('@')[0] }}

// Verificar se é grupo
{{ $json.body.data.isGroup === true }}
```

---

## 🔗 Referências

- **Documentação Oficial**: https://docs.uazapi.com/
- **Especificação OpenAPI**: `docs/uazapi/uazapi-openapi-spec.yaml`
- **Schema WebhookEvent**: Linha 1386 da especificação
- **Schema Message**: Linha 488 da especificação

---

**Última atualização:** 2025-01-24  
**Baseado em:** uazapi-openapi-spec.yaml v1.0.0

