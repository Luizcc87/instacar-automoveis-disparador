# Conexão de Instâncias WhatsApp via QR Code

## 📋 Visão Geral

O sistema agora suporta conexão de instâncias WhatsApp (Uazapi) diretamente pelo painel de configurações, utilizando QR code para autenticação. O número de WhatsApp conectado é exibido automaticamente na lista de instâncias.

## 🚀 Funcionalidades

### ✅ O que está disponível:

1. **Conexão via QR Code**

   - Botão "Conectar" na lista de instâncias Uazapi
   - Geração automática de QR code
   - Modal com QR code para escanear

2. **Exibição do Número WhatsApp**

   - Número conectado exibido na lista de instâncias
   - Nome do perfil (quando disponível)
   - Status visual da conexão (🟢 Conectado, 🟡 Conectando, 🔴 Desconectado)

3. **Verificação Automática de Status**

   - **Ao carregar lista**: Verifica status de todas as instâncias Uazapi automaticamente
   - **Verificação periódica**: Verifica status a cada 30 segundos para instâncias conectadas ou conectando (quando modal de configurações está aberto)
   - **Durante conexão**: Verificação a cada 3 segundos durante o processo de conexão
   - Atualização automática do status no banco de dados
   - Notificação quando conexão é estabelecida

4. **Sincronização de Status**

   - Botão "🔄 Sincronizar" para verificar status real na API Uazapi
   - Corrige dessincronias entre banco de dados e API
   - Atualiza número de WhatsApp e nome do perfil automaticamente
   - Útil quando instância está conectada na Uazapi mas aparece desconectada no sistema

5. **Desconexão e Reconexão**
   - Botão "🔌 Desconectar" para desconectar instância conectada
   - Botão "🔄 Reconectar" para desconectar e conectar novamente com novo QR code
   - Confirmação antes de desconectar
   - Atualização automática de status após desconexão

## 📝 Como Usar

### Passo 1: Executar Migração do Banco de Dados

**Ordem de execução dos scripts SQL no Editor SQL do Supabase:**

1. **Primeiro**: Execute `docs/supabase/schema-whatsapp-apis.sql`

   - Cria a tabela `instacar_whatsapp_apis` (se ainda não existir)
   - Configura índices e políticas RLS

2. **Segundo**: Execute `docs/supabase/schema-whatsapp-apis-status.sql`
   - Adiciona campos de status e número WhatsApp
   - Cria função auxiliar para atualizar status

**Nota**: Se você já executou `schema-whatsapp-apis.sql` anteriormente, execute apenas `schema-whatsapp-apis-status.sql`.

**Campos adicionados por `schema-whatsapp-apis-status.sql`:**

- `status_conexao` - Status atual (disconnected, connecting, connected)
- `numero_whatsapp` - Número de WhatsApp conectado
- `profile_name` - Nome do perfil WhatsApp
- `ultima_atualizacao_status` - Timestamp da última verificação

### Passo 2: Conectar uma Instância

1. Acesse **⚙️ Gerenciar Configurações** na interface web
2. Na seção **"APIs WhatsApp - Instâncias"**, localize a instância Uazapi desejada
3. Clique no botão **"🔗 Conectar"** (ou **"🔄 Reconectar"** se já estiver conectada)
4. Um modal será aberto com o QR code
5. Abra o WhatsApp no seu celular:
   - **Android**: Menu (3 pontos) > Dispositivos conectados > Conectar um dispositivo
   - **iPhone**: Configurações > Dispositivos conectados > Conectar um dispositivo
6. Escaneie o QR code exibido no modal
7. Aguarde a confirmação de conexão (verificação automática a cada 3 segundos)

### Passo 3: Verificar Status

O status da conexão é atualizado automaticamente:

- **🟢 Conectado**: Instância conectada e pronta para uso
- **🟡 Conectando...**: Aguardando escaneamento do QR code
- **🔴 Desconectado**: Instância não conectada

O número de WhatsApp conectado aparece abaixo do nome da instância:

```
📱 WhatsApp: 5511999999999 (Nome do Perfil)
```

### Passo 4: Verificação Automática de Status

O sistema verifica o status das instâncias automaticamente:

**Ao abrir o modal de configurações:**

- Verifica status de todas as instâncias Uazapi ativas
- Inicia verificação periódica a cada 30 segundos (apenas para instâncias conectadas ou conectando)
- Para automaticamente ao fechar o modal

**Durante o processo de conexão:**

- Verifica status a cada 3 segundos
- Para automaticamente quando conecta ou após 2 minutos

**Nota**: A verificação automática é silenciosa e não mostra alertas. Use o botão "🔄 Sincronizar" se precisar verificar manualmente.

### Passo 5: Sincronizar Status da Instância

Se você notar que a instância está conectada no painel da Uazapi mas aparece como "Desconectado" no sistema:

1. Na lista de instâncias, localize a instância
2. Clique no botão **"🔄 Sincronizar"**
3. O sistema buscará o status real da API Uazapi
4. O status será atualizado automaticamente no banco de dados
5. O número de WhatsApp será atualizado se estiver conectado

**Quando usar:**

- Instância conectada na Uazapi mas aparece desconectada no sistema
- Após conectar manualmente pela plataforma Uazapi
- Para verificar status atualizado sem precisar reconectar

### Passo 6: Desconectar uma Instância

1. Na lista de instâncias, localize a instância conectada (status 🟢 Conectado)
2. Clique no botão **"🔌 Desconectar"**
3. Confirme a desconexão no diálogo
4. A instância será desconectada e o status mudará para 🔴 Desconectado
5. O número de WhatsApp será removido da exibição

**Nota**: Após desconectar, será necessário escanear um novo QR code para reconectar.

### Passo 7: Reconectar uma Instância

**Opção 1: Reconectar diretamente**

1. Clique no botão **"🔄 Reconectar"** na instância conectada
2. O sistema desconectará automaticamente e gerará um novo QR code
3. Escaneie o novo QR code com o WhatsApp

**Opção 2: Desconectar e depois conectar**

1. Clique em **"🔌 Desconectar"** primeiro
2. Depois clique em **"🔗 Conectar"** para gerar novo QR code
3. Escaneie o QR code com o WhatsApp

## 🔧 Detalhes Técnicos

### API Uazapi Utilizada

O sistema utiliza os seguintes endpoints da API Uazapi:

1. **POST `/instance/connect`**

   - Inicia processo de conexão
   - Gera QR code (quando `phone` não é informado)
   - Retorna QR code em base64

2. **GET `/instance/status`**

   - Verifica status atual da instância
   - Retorna informações completas incluindo:
     - Status da conexão
     - Número de WhatsApp (no campo `status.jid` como string no formato `"555591112668:21@s.whatsapp.net"`)
     - Nome do perfil (`instance.profileName`)
     - QR code atualizado (se ainda conectando)

   **Nota importante sobre o formato do JID:**

   - A API Uazapi retorna o JID como **string**, não como objeto
   - Formato: `"555591112668:21@s.whatsapp.net"`
   - O número de WhatsApp é extraído usando regex: `/^(\d+):/` (número antes dos dois pontos)
   - Fallback: Se JID não estiver disponível, usa `instance.owner` que contém o número diretamente

3. **POST `/instance/disconnect`**
   - Desconecta a instância do WhatsApp
   - Encerra a sessão atual
   - Requer novo QR code para reconectar
   - Limpa dados de conexão no banco de dados

### Fluxo de Conexão

```
1. Usuário clica em "Conectar"
   ↓
2. Sistema atualiza status para "connecting" no banco
   ↓
3. Chama POST /instance/connect (sem phone)
   ↓
4. Recebe QR code em base64
   ↓
5. Exibe modal com QR code
   ↓
6. Inicia verificação periódica (a cada 3s)
   ↓
7. GET /instance/status repetidamente
   ↓
8. Quando status = "connected":
   - Extrai número do WhatsApp do JID (string: "555591112668:21@s.whatsapp.net")
   - Extrai nome do perfil (instance.profileName)
   - Atualiza banco de dados
   - Fecha modal
   - Exibe notificação de sucesso
```

### Fluxo de Desconexão

```
1. Usuário clica em "🔌 Desconectar"
   ↓
2. Sistema pede confirmação (mostra número conectado)
   ↓
3. Se confirmado, chama POST /instance/disconnect
   ↓
4. Atualiza banco de dados:
   - status_conexao = "disconnected"
   - numero_whatsapp = null
   - profile_name = null
   ↓
5. Atualiza interface (remove número, muda status)
   ↓
6. Fecha modal de QR code se estiver aberto
   ↓
7. Exibe notificação de sucesso
```

### Fluxo de Reconexão

```
1. Usuário clica em "🔄 Reconectar"
   ↓
2. Sistema pede confirmação (mostra número atual)
   ↓
3. Se confirmado, chama desconectar (sem confirmação adicional)
   ↓
4. Aguarda 1 segundo
   ↓
5. Inicia fluxo de conexão (gera novo QR code)
```

### Armazenamento no Banco de Dados

Os dados são armazenados na tabela `instacar_whatsapp_apis`:

```sql
-- Exemplo de registro atualizado após conexão
{
  "id": "uuid-da-instancia",
  "status_conexao": "connected",
  "numero_whatsapp": "5511999999999",
  "profile_name": "Meu WhatsApp",
  "ultima_atualizacao_status": "2025-01-15T10:30:00Z"
}
```

## ⚠️ Limitações e Considerações

### Tempo de Expiração do QR Code

- **QR Code**: Expira em **2 minutos**
- **Código de Pareamento**: Expira em **5 minutos** (quando `phone` é informado)

Se o QR code expirar:

1. Clique em **"🔄 Atualizar QR Code"** no modal
2. Um novo QR code será gerado

### Verificação Automática de Status

O sistema possui três tipos de verificação automática:

1. **Ao carregar lista de instâncias**

   - Verifica status de todas as instâncias Uazapi ativas
   - Executa em paralelo (máximo 3 por vez)
   - Atualiza banco de dados silenciosamente

2. **Verificação periódica (30 segundos)**

   - Ativa quando o modal de configurações está aberto
   - Verifica apenas instâncias com status "connected" ou "connecting"
   - Para automaticamente ao fechar o modal (economiza recursos)
   - Atualiza interface automaticamente

3. **Durante processo de conexão**
   - Verificação a cada **3 segundos** durante o processo de conexão
   - Máximo de **40 tentativas** (2 minutos)
   - Após timeout, o sistema para a verificação automática

### Apenas Uazapi

- Conexão via QR code está disponível **apenas para instâncias Uazapi**
- Outras APIs (Z-API, Evolution, etc.) precisam de configuração manual

## 🐛 Troubleshooting

### QR Code não aparece

**Problema**: Modal abre mas QR code não é exibido

**Soluções**:

1. Verifique se o token da instância está correto
2. Verifique se a URL base está correta
3. Verifique logs do console do navegador (F12)
4. Tente clicar em "Atualizar QR Code"

### Conexão não completa após escanear

**Problema**: Escaneou QR code mas status não muda para "connected"

**Soluções**:

1. Clique em **"✅ Verificar Conexão"** no modal
2. Verifique se o WhatsApp está conectado à internet
3. Verifique se a instância não foi bloqueada pelo WhatsApp
4. Tente desconectar e reconectar

### Número de WhatsApp não aparece

**Problema**: Status mostra "connected" mas número não aparece

**Soluções**:

1. Clique em **"🔄 Sincronizar"** para forçar atualização do status
2. O sistema extrai o número do campo `status.jid` (string) ou `instance.owner` (fallback)
3. Verifique logs do console (F12) para ver a resposta completa da API
4. Se o número ainda não aparecer, verifique se a instância realmente está conectada na plataforma Uazapi

### Erro 401 (Token inválido)

**Problema**: Erro ao tentar conectar ou desconectar

**Soluções**:

1. Verifique se o token está correto no cadastro da instância
2. Verifique se o token não expirou
3. Gere um novo token na plataforma Uazapi se necessário

### Erro ao desconectar

**Problema**: Não consegue desconectar a instância

**Soluções**:

1. Verifique se a instância realmente está conectada (status 🟢 Conectado)
2. Verifique se o token da instância está correto
3. Tente verificar o status primeiro com "⏳ Verificar"
4. Se persistir, verifique logs do console (F12) para erros da API
5. Como último recurso, pode desconectar diretamente pela plataforma Uazapi

### Status dessincronizado (conectado na Uazapi mas aparece desconectado)

**Problema**: Instância está conectada no painel da Uazapi mas aparece como "Desconectado" no sistema

**Soluções**:

1. Clique no botão **"🔄 Sincronizar"** na instância
2. O sistema buscará o status real da API e atualizará o banco de dados
3. O número de WhatsApp será atualizado automaticamente
4. Se ainda não funcionar, verifique se o token está correto
5. Verifique logs do console (F12) para erros na chamada da API

**Causas comuns:**

- Instância foi conectada manualmente pela plataforma Uazapi
- Status no banco não foi atualizado após conexão
- Erro anterior na atualização do status

## 📊 Monitoramento

### Verificar Status no Banco de Dados

```sql
-- Ver todas as instâncias e seus status
SELECT
  nome,
  tipo_api,
  status_conexao,
  numero_whatsapp,
  profile_name,
  ultima_atualizacao_status
FROM instacar_whatsapp_apis
ORDER BY ultima_atualizacao_status DESC;
```

### Instâncias Conectadas

```sql
-- Listar apenas instâncias conectadas
SELECT
  nome,
  numero_whatsapp,
  profile_name,
  ultima_atualizacao_status
FROM instacar_whatsapp_apis
WHERE status_conexao = 'connected'
  AND ativo = true;
```

## ✅ Testes Realizados

### Teste de Desconexão e Reconexão (Dezembro 2025)

**Cenário testado:**

1. Instância conectada com sucesso
2. Desconexão via botão "🔌 Desconectar"
3. Reconexão via botão "🔄 Reconectar"
4. Geração de novo QR code
5. Escaneamento e conexão bem-sucedida

**Resultado:** ✅ **Funcionando perfeitamente**

- Desconexão remove número de WhatsApp corretamente
- Reconexão gera novo QR code sem problemas
- Conexão estabelecida normalmente após escanear QR code
- Status atualizado automaticamente no banco de dados
- Número de WhatsApp exibido corretamente após conexão

### Teste de Extração de Número WhatsApp (Dezembro 2025)

**Descoberta importante:**

A API Uazapi retorna o JID como **string** no formato `"555591112668:21@s.whatsapp.net"`, não como objeto com propriedades.

**Implementação corrigida:**

- Extração do número usando regex: `/^(\d+):/` para capturar o número antes dos dois pontos
- Fallback para `instance.owner` quando JID não está disponível
- Múltiplas tentativas de extração em diferentes formatos da resposta
- Logs de debug reduzidos para evitar poluição no console

**Resultado:** ✅ **Número extraído e exibido corretamente na interface**

## 🔄 Próximos Passos

Funcionalidades planejadas para futuras versões:

- [ ] Suporte para código de pareamento (quando `phone` é informado)
- [ ] Notificações push quando conexão é estabelecida
- [ ] Histórico de conexões/desconexões
- [ ] Suporte para outras APIs (Z-API, Evolution) com seus próprios métodos de conexão
- [ ] Reconexão automática quando instância desconecta

---

**Versão**: 1.2  
**Data**: Dezembro 2025  
**Status**: Produção ✅ Testado e Funcionando

**Última atualização:**

- Correção na extração do número de WhatsApp do JID (formato string)
- Redução de logs de debug no console
- Melhorias na exibição do número e nome do perfil na interface
