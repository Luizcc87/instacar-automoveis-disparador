# Migração: Tabela Genérica para APIs WhatsApp

## 📋 Resumo

A tabela `instacar_uazapi_instancias` foi refatorada para `instacar_whatsapp_apis`, tornando-se **genérica** para suportar múltiplas APIs de WhatsApp:

- ✅ **Uazapi** (atual)
- ✅ **Z-API**
- ✅ **Evolution API**
- ✅ **WhatsApp Oficial (Meta)**
- ✅ **Outras APIs** (extensível)

## 🔄 Mudanças

### 1. Nova Tabela: `instacar_whatsapp_apis`

**Campos principais:**

- `tipo_api`: Identifica qual API (uazapi, zapi, evolution, whatsapp_oficial, outro)
- `base_url`: URL base da API
- `token`: Token/API Key
- `configuracao_extra` (JSONB): Configurações específicas de cada API

### 2. Campo em Campanhas

- **Antigo**: `uazapi_instancia_id`
- **Novo**: `whatsapp_api_id`

### 3. Migração Automática

O schema SQL migra automaticamente:

- Dados de `instacar_uazapi_instancias` → `instacar_whatsapp_apis`
- Todas as instâncias antigas recebem `tipo_api = 'uazapi'`
- Renomeia coluna em `instacar_campanhas`

## 📝 Estrutura da Nova Tabela

```sql
instacar_whatsapp_apis
├── id (UUID)
├── nome (TEXT, UNIQUE)
├── tipo_api (ENUM: uazapi, zapi, evolution, whatsapp_oficial, outro)
├── base_url (TEXT)
├── token (TEXT)
├── ativo (BOOLEAN)
├── descricao (TEXT)
├── configuracao_extra (JSONB) -- Configurações específicas
└── created_at, updated_at
```

## 🔧 Configurações por Tipo de API

### Uazapi

```json
{
  "configuracao_extra": {}
}
```

- Usa apenas `base_url` e `token`
- Não precisa de configurações extras

### Z-API

```json
{
  "configuracao_extra": {
    "instance_id": "instance_123"
  }
}
```

- Pode precisar de `instance_id` dependendo do endpoint

### Evolution API

```json
{
  "configuracao_extra": {
    "instance_id": "evolution_instance_123",
    "api_key": "optional_key"
  }
}
```

- Sempre precisa de `instance_id`
- `api_key` opcional dependendo da configuração

### WhatsApp Oficial (Meta)

```json
{
  "configuracao_extra": {
    "phone_id": "123456789",
    "business_account_id": "987654321",
    "app_id": "xxx",
    "app_secret": "yyy"
  }
}
```

- Requer múltiplos IDs e credenciais
- Usa Graph API do Meta

### Outro

```json
{
  "configuracao_extra": {
    "custom_field": "value",
    "outro_campo": 123
  }
}
```

- Configuração livre para APIs customizadas

## 🚀 Como Usar

### 1. Executar Schema

```sql
-- Execute no Supabase SQL Editor
-- Arquivo: docs/supabase/schema-whatsapp-apis.sql
```

### 2. Adicionar Nova Instância

**Via Interface:**

1. Acesse "⚙️ Gerenciar Configurações"
2. Seção "APIs WhatsApp - Instâncias"
3. Clique em "➕ Adicionar Instância"
4. Selecione o tipo de API
5. Preencha campos obrigatórios
6. Adicione configurações extras se necessário

**Via SQL:**

```sql
INSERT INTO instacar_whatsapp_apis (
  nome, tipo_api, base_url, token, ativo, descricao, configuracao_extra
) VALUES (
  'Z-API Principal',
  'zapi',
  'https://api.z-api.io',
  'seu_token_aqui',
  TRUE,
  'Instância principal Z-API',
  '{"instance_id": "instance_123"}'::jsonb
);
```

### 3. Usar em Campanhas

Ao criar/editar campanha:

- Selecione a instância de API WhatsApp desejada
- O sistema usará a API correta baseado no `tipo_api`

## 🔄 Compatibilidade

### Migração Automática

O schema SQL:

1. ✅ Detecta se `instacar_uazapi_instancias` existe
2. ✅ Migra todos os dados para `instacar_whatsapp_apis`
3. ✅ Define `tipo_api = 'uazapi'` para todas
4. ✅ Renomeia `uazapi_instancia_id` → `whatsapp_api_id`
5. ✅ Mantém integridade referencial

### Código Frontend

O código JavaScript precisa ser atualizado para:

- Usar `instacar_whatsapp_apis` ao invés de `instacar_uazapi_instancias`
- Suportar campo `tipo_api` na interface
- Mostrar configurações extras quando necessário
- Adaptar chamadas de API baseado no `tipo_api`

## 📊 Vantagens da Abordagem Genérica

1. **Extensibilidade**

   - Fácil adicionar novos tipos de API
   - Sem alterar schema principal

2. **Flexibilidade**

   - `configuracao_extra` (JSONB) permite campos específicos
   - Cada API pode ter suas próprias configurações

3. **Manutenibilidade**

   - Uma única tabela para todas as APIs
   - Código mais limpo e organizado

4. **Escalabilidade**
   - Suporta múltiplas instâncias de cada tipo
   - Permite migração gradual entre APIs

## ⚠️ Notas Importantes

1. **Tabela Antiga**: Por padrão, a tabela antiga `instacar_uazapi_instancias` **NÃO é removida** automaticamente. Você pode removê-la manualmente após confirmar a migração.

2. **Código Frontend**: O código JavaScript precisa ser atualizado para usar a nova tabela e suportar múltiplos tipos de API.

3. **N8N Workflows**: Os workflows do N8N podem precisar de ajustes para suportar diferentes tipos de API.

4. **Validação**: Cada tipo de API pode ter validações específicas (implementar no frontend/backend).

## 🔍 Queries Úteis

```sql
-- Listar todas as instâncias ativas por tipo
SELECT tipo_api, COUNT(*) as total
FROM instacar_whatsapp_apis
WHERE ativo = TRUE
GROUP BY tipo_api;

-- Obter instâncias de um tipo específico
SELECT * FROM obter_instancias_whatsapp_por_tipo('uazapi');

-- Ver configurações extras de uma instância
SELECT nome, tipo_api, configuracao_extra
FROM instacar_whatsapp_apis
WHERE id = 'uuid-aqui';
```
