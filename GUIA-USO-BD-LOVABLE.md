# Guia de Uso do Banco de Dados no Lovable

Este guia explica como usar a estrutura do banco de dados e dados mockados no Lovable.

## 📋 Arquivos Disponíveis

1. **`ESTRUTURA-BD-LOVABLE.md`** - Documentação completa da estrutura do banco
2. **`dados-mockados-lovable.json`** - Dados mockados para desenvolvimento
3. **`GUIA-USO-BD-LOVABLE.md`** - Este arquivo (instruções de uso)

## 🚀 Configuração Inicial no Lovable

### Opção 1: Usar Dados Mockados (Desenvolvimento)

Para desenvolvimento inicial, você pode usar os dados mockados do arquivo JSON:

1. **Importar dados mockados:**
   - No Lovable, vá em "Database" ou "Data"
   - Importe o arquivo `dados-mockados-lovable.json`
   - O Lovable criará as tabelas automaticamente baseado na estrutura JSON

2. **Estrutura de dados:**
   - Cada chave do JSON representa uma tabela
   - Os arrays contêm os registros mockados
   - Relacionamentos são mantidos via IDs (UUIDs)

### Opção 2: Conectar ao Supabase (Produção)

Para conectar ao Supabase real em produção:

1. **Configurar variáveis de ambiente:**
   ```bash
   SUPABASE_URL=https://[project-id].supabase.co
   SUPABASE_ANON_KEY=[anon-key]
   ```

2. **Instalar cliente Supabase:**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Criar cliente:**
   ```javascript
   import { createClient } from '@supabase/supabase-js'
   
   const supabaseUrl = process.env.SUPABASE_URL
   const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

## 📊 Estrutura das Tabelas

### Tabelas Principais

#### 1. instacar_clientes_envios
Armazena informações dos clientes.

**Campos importantes:**
- `telefone` (VARCHAR, UNIQUE) - Formato: 55XXXXXXXXXXX
- `veiculos` (JSONB) - Array de veículos do cliente
- `status_whatsapp` - 'valid', 'invalid', 'unknown'
- `bloqueado_envios` (BOOLEAN) - Opt-out do cliente
- `ativo` (BOOLEAN) - Soft delete

**Exemplo de query:**
```javascript
// Buscar clientes ativos
const { data, error } = await supabase
  .from('instacar_clientes_envios')
  .select('*')
  .eq('ativo', true)
  .eq('bloqueado_envios', false)
```

#### 2. instacar_campanhas
Configuração de campanhas de marketing.

**Campos importantes:**
- `status` - 'ativa', 'pausada', 'concluida', 'cancelada'
- `agendamento_cron` - Expressão cron para execução automática
- `configuracao_dias_semana` (JSONB) - Configuração granular por dia

**Exemplo de query:**
```javascript
// Buscar campanhas ativas
const { data, error } = await supabase
  .from('instacar_campanhas')
  .select('*')
  .eq('ativo', true)
  .eq('status', 'ativa')
```

#### 3. instacar_historico_envios
Histórico completo de envios.

**Campos importantes:**
- `status_envio` - 'enviado', 'erro', 'bloqueado'
- `campanha_id` - Referência à campanha
- `tipo_envio` - 'normal', 'teste', 'debug'

**Exemplo de query:**
```javascript
// Buscar histórico de um cliente
const { data, error } = await supabase
  .from('instacar_historico_envios')
  .select('*')
  .eq('cliente_id', clienteId)
  .order('timestamp_envio', { ascending: false })
```

## 🔗 Relacionamentos

### Relacionamentos Principais

1. **instacar_historico_envios** → **instacar_clientes_envios**
   - `cliente_id` (FK)
   - ON DELETE CASCADE

2. **instacar_historico_envios** → **instacar_campanhas**
   - `campanha_id` (FK)
   - ON DELETE SET NULL

3. **instacar_campanhas_clientes** (N:N)
   - `campanha_id` → `instacar_campanhas`
   - `cliente_id` → `instacar_clientes_envios`
   - UNIQUE(campanha_id, cliente_id)

4. **instacar_campanhas_execucoes** → **instacar_campanhas**
   - `campanha_id` (FK)
   - ON DELETE CASCADE

### Exemplos de Queries com JOINs

```javascript
// Buscar campanha com clientes selecionados
const { data, error } = await supabase
  .from('instacar_campanhas')
  .select(`
    *,
    instacar_campanhas_clientes (
      cliente_id,
      instacar_clientes_envios (
        nome_cliente,
        telefone
      )
    )
  `)
  .eq('id', campanhaId)
```

```javascript
// Buscar histórico com dados da campanha
const { data, error } = await supabase
  .from('instacar_historico_envios')
  .select(`
    *,
    instacar_campanhas (
      nome,
      periodo_ano
    ),
    instacar_clientes_envios (
      nome_cliente,
      telefone
    )
  `)
  .order('timestamp_envio', { ascending: false })
  .limit(50)
```

## 📝 Campos JSONB

Várias tabelas usam campos JSONB para flexibilidade:

### instacar_clientes_envios.veiculos
```json
[
  {
    "modelo": "Honda Civic",
    "ano": "2020",
    "placa": "ABC1234",
    "cor": "Branco",
    "vendedor": "Maria Santos",
    "data_venda": "2020-03-15"
  }
]
```

### instacar_campanhas.configuracao_dias_semana
```json
{
  "segunda": {
    "habilitado": true,
    "horario_inicio": "09:00",
    "horario_fim": "18:00"
  },
  "terca": {
    "habilitado": true,
    "horario_inicio": "09:00",
    "horario_fim": "18:00"
  }
}
```

### instacar_clientes_envios.observacoes_internas
```json
[
  {
    "id": "obs-001",
    "texto": "Cliente interessado em trocar veículo",
    "autor": "Sistema",
    "timestamp": "2024-12-10T14:20:00Z"
  }
]
```

## 🔍 Queries Úteis

### Buscar clientes elegíveis para campanha
```javascript
// Clientes ativos, não bloqueados, com WhatsApp válido
const { data, error } = await supabase
  .from('instacar_clientes_envios')
  .select('*')
  .eq('ativo', true)
  .eq('bloqueado_envios', false)
  .eq('status_whatsapp', 'valid')
```

### Verificar se cliente já recebeu campanha
```javascript
const { data, error } = await supabase
  .from('instacar_historico_envios')
  .select('id')
  .eq('cliente_id', clienteId)
  .eq('campanha_id', campanhaId)
  .eq('status_envio', 'enviado')
  .limit(1)
```

### Buscar métricas de execução
```javascript
const { data, error } = await supabase
  .from('instacar_campanhas_execucoes')
  .select('*')
  .eq('campanha_id', campanhaId)
  .order('data_execucao', { ascending: false })
  .limit(10)
```

## ⚠️ Validações Importantes

### Telefone
- Formato: `55XXXXXXXXXXX` (DDI + DDD + número)
- Exemplo: `5511999999999`
- UNIQUE constraint

### Status WhatsApp
- Valores permitidos: `'valid'`, `'invalid'`, `'unknown'`
- CHECK constraint

### Status Campanha
- Valores permitidos: `'ativa'`, `'pausada'`, `'concluida'`, `'cancelada'`
- CHECK constraint

### Status Envio
- Valores permitidos: `'enviado'`, `'erro'`, `'bloqueado'`
- CHECK constraint

## 🔐 Segurança (RLS)

O Supabase usa Row Level Security (RLS). Em produção:

- **Anon Key**: Acesso limitado pelas políticas RLS
- **Service Role Key**: Acesso total (usar apenas no backend/N8N)

**NUNCA** exponha a Service Role Key no frontend!

## 📚 Referências

- **Documentação Supabase**: https://supabase.com/docs
- **Schemas SQL**: `docs/supabase/`
- **Políticas RLS**: `docs/supabase/policies.sql`
- **Índices**: `docs/supabase/indexes.sql`

## 🎯 Próximos Passos

1. Importar dados mockados no Lovable
2. Testar queries básicas
3. Implementar interface de gerenciamento
4. Conectar ao Supabase real quando estiver pronto para produção

