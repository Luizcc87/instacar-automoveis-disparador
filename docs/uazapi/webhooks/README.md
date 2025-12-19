# Uazapi - Exemplos de Webhooks

Esta pasta contém exemplos práticos de payloads de webhook da Uazapi para diferentes tipos de mensagens recebidas no WhatsApp.

## 📁 Arquivos

### Exemplos JSON

- **`exemplo-webhook-mensagem-texto.json`**: Exemplo teórico de webhook para mensagem de texto simples
- **`exemplo-webhook-mensagem-texto-real.json`**: ⭐ **Exemplo REAL** de webhook recebido da Uazapi (produção)
- **`exemplo-webhook-mensagem-imagem.json`**: Exemplo de webhook para mensagem com imagem

### Notas Importantes

- **`notas-importantes-chatid-phone.md`**: ⚠️ **LEIA ANTES** - Problema com `chatid` e `phone` ao enviar mensagens de resposta

### Documentação Completa

Consulte o arquivo principal de documentação:
- **`../exemplo-webhook-mensagem-recebida.md`**: Documentação completa com todos os exemplos e explicações

## 🚀 Uso Rápido

### Estrutura Geral

Todos os webhooks da Uazapi seguem esta estrutura:

```json
{
  "event": "message",
  "instance": "ID_DA_INSTANCIA",
  "data": {
    // Dados da mensagem (objeto Message)
  }
}
```

### Campos Principais

- **`event`**: Tipo do evento (`message`, `connection`, `presence`, etc.)
- **`instance`**: ID da instância que gerou o evento
- **`data`**: Objeto `Message` com os dados da mensagem

### Campos Importantes da Mensagem

- **`id`**: ID único interno da mensagem
- **`messageid`**: ID original no WhatsApp
- **`sender`**: JID do remetente (ex: `5511999999999@s.whatsapp.net`)
- **`senderName`**: Nome do remetente
- **`text`**: Texto da mensagem
- **`messageType`**: Tipo (`conversation`, `image`, `audio`, `video`, etc.)
- **`fromMe`**: `false` = recebida, `true` = enviada por você
- **`isGroup`**: `false` = individual, `true` = grupo
- **`wasSentByApi`**: `false` = recebida do WhatsApp, `true` = enviada via API

## ⚙️ Configuração do Webhook

### Exemplo de Configuração

```json
{
  "url": "https://meusite.com/webhook",
  "events": ["messages"],
  "excludeMessages": ["wasSentByApi"]
}
```

### Endpoint

```
POST https://{subdomain}.uazapi.com/webhook
```

### Headers

```
token: SEU_TOKEN_DA_INSTANCIA
Content-Type: application/json
```

## ⚠️ Importante

1. **Sempre use `excludeMessages: ["wasSentByApi"]`** para evitar loops infinitos
2. **Webhooks devem ser HTTPS** - HTTP não é aceito
3. **Arquivos de mídia expiram em 30 dias** após o recebimento
4. **⚠️ PROBLEMA COM chatid/phone**: O campo `chatid` vem com sufixo `@s.whatsapp.net` que não pode ser usado diretamente para enviar mensagens. **SEMPRE extraia apenas o número**: `chatid.split('@')[0]`. Veja `notas-importantes-chatid-phone.md` para detalhes.

## 📚 Referências

- Documentação completa: `../exemplo-webhook-mensagem-recebida.md`
- Especificação OpenAPI: `../uazapi-openapi-spec.yaml`
- Documentação oficial: https://docs.uazapi.com/

