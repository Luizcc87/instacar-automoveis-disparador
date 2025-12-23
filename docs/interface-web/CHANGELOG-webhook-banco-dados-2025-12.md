# Changelog - Webhook N8N no Banco de Dados (Dezembro 2025)

## 📋 Resumo

Implementação de persistência do webhook N8N no banco de dados Supabase, permitindo sincronização entre dispositivos e backup automático das configurações.

---

## ✅ Melhorias Implementadas

### 1. **Persistência no Banco de Dados**

- Webhook N8N agora é salvo na tabela `instacar_configuracoes_sistema`
- Sincronização automática entre diferentes navegadores/dispositivos
- Backup automático das configurações

### 2. **Sistema de Prioridade de Busca**

A interface busca o webhook na seguinte ordem:

1. **Supabase** (banco de dados) - prioridade máxima
2. **localStorage** (navegador) - fallback
3. **window.INSTACAR_CONFIG** (config.js) - fallback final

### 3. **Funções Atualizadas**

#### Nova Função: `obterWebhookN8N()`
- Busca assíncrona do webhook com prioridade Supabase → localStorage → config.js
- Retorna `Promise<string|null>`
- Tratamento de erros com fallback automático

#### `salvarConfiguracoes()` - Atualizada
- Salva no Supabase usando `upsert` na tabela `instacar_configuracoes_sistema`
- Mantém salvamento no localStorage (compatibilidade)
- Tratamento de erros com notificações ao usuário

#### `carregarConfiguracoesDoLocalStorage()` - Atualizada
- Agora é `async` e busca do Supabase primeiro
- Mantém compatibilidade com localStorage e config.js

#### `limparConfiguracoes()` - Atualizada
- Remove do Supabase e do localStorage
- Desativa registro no banco (não deleta, apenas marca como inativo)

#### `importarConfiguracoes()` - Atualizada
- Salva no Supabase ao importar JSON
- Sincroniza configurações importadas

---

## 🔧 Detalhes Técnicos

### Estrutura no Banco de Dados

**Tabela:** `instacar_configuracoes_sistema`

```sql
chave: 'n8n_webhook_url'
valor: 'https://seu-n8n.com/webhook/campanha'
tipo: 'url'
categoria: 'n8n'
sensivel: false
ativo: true
```

### Função SQL Auxiliar

```sql
-- Obter webhook do banco
SELECT obter_configuracao('n8n_webhook_url') AS webhook_url;

-- Verificar se está configurado
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM instacar_configuracoes_sistema
      WHERE chave = 'n8n_webhook_url'
        AND ativo = TRUE
        AND valor IS NOT NULL 
        AND valor != ''
    )
    THEN TRUE 
    ELSE FALSE 
  END AS webhook_configurado;
```

### Código JavaScript

```javascript
// Obter webhook (busca automática com prioridade)
const webhookUrl = await obterWebhookN8N();

// Salvar webhook (salva no Supabase e localStorage)
await salvarConfiguracoes();

// Carregar configurações (busca do Supabase primeiro)
const config = await carregarConfiguracoesDoLocalStorage();
```

---

## 📝 Migração e Compatibilidade

### Compatibilidade Retroativa

- ✅ Funciona mesmo sem Supabase conectado (usa localStorage)
- ✅ Migração automática: ao salvar, sincroniza com banco
- ✅ Não quebra funcionalidades existentes

### Migração Manual (Opcional)

Se você já tinha webhook salvo apenas no localStorage, ele será automaticamente sincronizado com o banco na próxima vez que:

1. Abrir o modal de configurações
2. Salvar uma nova configuração
3. Importar configurações

---

## 🧪 Como Testar

### 1. Salvar Webhook no Banco

1. Abra o modal de configurações
2. Digite a URL do webhook N8N
3. Clique em "Salvar"
4. Verifique no Supabase:
   ```sql
   SELECT * FROM instacar_configuracoes_sistema 
   WHERE chave = 'n8n_webhook_url';
   ```

### 2. Carregar do Banco

1. Limpe o localStorage do navegador
2. Abra o modal de configurações
3. O webhook deve ser carregado automaticamente do Supabase

### 3. Sincronização entre Dispositivos

1. Configure webhook no dispositivo A
2. Abra a interface no dispositivo B
3. O webhook deve aparecer automaticamente

---

## 📚 Arquivos Modificados

- `interface-web/app.js`
  - Nova função: `obterWebhookN8N()`
  - Atualizadas: `salvarConfiguracoes()`, `carregarConfiguracoesDoLocalStorage()`, `limparConfiguracoes()`, `importarConfiguracoes()`
  - Atualizados: todos os lugares que usam webhook para usar a nova função

- `docs/supabase/query-webhook-n8n.sql` (novo)
  - Queries SQL para ler e verificar webhook no banco

---

## 🔗 Referências

- Schema da tabela: `docs/supabase/schema-configuracoes-sistema.sql`
- Queries SQL: `docs/supabase/query-webhook-n8n.sql`
- Arquitetura de webhooks: `docs/campanhas/ARQUITETURA-WEBHOOKS.md`

