# 🔧 Configuração Nós Supabase Nativos - N8N

Guia para configurar os nós nativos do Supabase no workflow.

## 📋 Nós Supabase no Workflow

O workflow usa **3 nós nativos do Supabase** e **2 HTTP Request para upserts**:

**Nós Nativos:**
1. **Supabase - Verificar Cliente** (getAll)
2. **Supabase - Registrar Histórico** (insert)
3. **Supabase - Verificar Limite Diário** (getAll)

**HTTP Request (para upserts):**
4. **Supabase - Upsert Cliente** (HTTP Request)
5. **Supabase - Atualizar Controle** (HTTP Request)

> **Nota**: O nó Supabase nativo não suporta operação "upsert", então usamos HTTP Request para essas operações.

## 🔐 Passo 1: Criar Credencial Supabase

1. No N8N, vá em **Credentials** (menu lateral)
2. Clique em **Add Credential**
3. Selecione **Supabase API**
4. Preencha:
   - **Host**: `https://[seu-project-id].supabase.co`
   - **Service Role Secret**: Sua Service Role Key
5. Dê um nome: "Supabase account"
6. Clique em **Save**

## ⚙️ Passo 2: Configurar Cada Nó Supabase

### 2.1 Supabase - Verificar Cliente

1. Abra o nó **Supabase - Verificar Cliente**
2. Selecione a credencial criada
3. Verifique configuração:
   - **Operation**: `getAll`
   - **Table**: `instacar_clientes_envios`
   - **Filter**: `telefone = {{ $json.numeroFormatado }}`
   - **Limit**: `1`

### 2.2 Supabase - Upsert Cliente (HTTP Request)

⚠️ **Este nó usa HTTP Request** porque o Supabase nativo não suporta upsert.

1. Configure **SUPABASE_URL** e **SUPABASE_SERVICE_KEY** no nó "Set Variables - CONFIGURAR AQUI"
2. O nó "Preparar URL Supabase" prepara a URL e chave automaticamente
3. O nó HTTP Request faz POST com header `Prefer: resolution=merge-duplicates`

📖 **Guia detalhado**: [docs/n8n/configuracao-supabase-upsert.md](configuracao-supabase-upsert.md)

### 2.3 Supabase - Registrar Histórico

1. Abra o nó **Supabase - Registrar Histórico**
2. Selecione a credencial criada
3. Verifique configuração:
   - **Operation**: `insert`
   - **Table**: `instacar_historico_envios`
   - **Columns**: Mapeamento automático do nó "Preparar Dados Histórico"

### 2.4 Supabase - Verificar Limite Diário

1. Abra o nó **Supabase - Verificar Limite Diário**
2. Selecione a credencial criada
3. Verifique configuração:
   - **Operation**: `getAll`
   - **Table**: `instacar_controle_envios`
   - **Filter**: `data = {{ $now.toISOString().split('T')[0] }}`
   - **Limit**: `1`

### 2.5 Supabase - Atualizar Controle (HTTP Request)

⚠️ **Este nó usa HTTP Request** porque o Supabase nativo não suporta upsert.

1. Configure **SUPABASE_URL** e **SUPABASE_SERVICE_KEY** no nó "Set Variables - CONFIGURAR AQUI"
2. O nó "Preparar URL Controle" prepara a URL e chave automaticamente
3. O nó HTTP Request faz POST com header `Prefer: resolution=merge-duplicates`

📖 **Guia detalhado**: [docs/n8n/configuracao-supabase-upsert.md](configuracao-supabase-upsert.md)

## 🔍 Diferenças dos Nós HTTP Request

### Vantagens dos Nós Nativos

- ✅ **Mais simples**: Não precisa configurar headers manualmente
- ✅ **Mais seguro**: Credenciais gerenciadas pelo N8N
- ✅ **Validação**: N8N valida operações automaticamente
- ✅ **Interface visual**: Mais fácil de configurar filtros

### Mudanças no Código

Os nós nativos retornam dados em formato ligeiramente diferente:

```javascript
// HTTP Request retornava:
item.json[0]  // Array com primeiro item

// Nó Supabase nativo retorna:
item.json     // Array direto ou objeto
// Precisa tratar ambos os casos:
const resultado = Array.isArray(item.json) ? item.json[0] : item.json;
```

## 🧪 Testar Configuração

### Teste Manual

1. Execute o workflow manualmente
2. Verifique cada nó Supabase:
   - ✅ Credencial está selecionada
   - ✅ Operação está correta
   - ✅ Tabela está correta
   - ✅ Filtros estão corretos

### Verificar no Supabase

Após execução, verifique no Supabase:

```sql
-- Verificar cliente criado
SELECT * FROM instacar_clientes_envios LIMIT 1;

-- Verificar histórico
SELECT * FROM instacar_historico_envios LIMIT 1;

-- Verificar controle
SELECT * FROM instacar_controle_envios WHERE data = CURRENT_DATE;
```

## ⚠️ Problemas Comuns

### Erro: "Credential not found"

**Solução**: 
1. Crie a credencial Supabase
2. Configure em todos os 5 nós Supabase

### Erro: "Table does not exist"

**Solução**: 
1. Execute `schema.sql` no Supabase
2. Verifique nome da tabela (case-sensitive)

### Erro: "Permission denied"

**Solução**: 
1. Use Service Role Key (não anon key)
2. Verifique políticas RLS em `policies.sql`

### Dados não aparecem

**Solução**: 
1. Verifique filtros nos nós getAll
2. Confirme que dados estão sendo passados corretamente
3. Verifique logs do N8N

## 📝 Notas Importantes

- **Service Role Key**: Use sempre a Service Role Key (não anon key)
- **Credencial única**: Use a mesma credencial em todos os 5 nós
- **Filtros**: Nós getAll usam filtros para buscar registros específicos
- **Upsert**: Usamos HTTP Request com header `Prefer: resolution=merge-duplicates` (não suportado nativamente)

---

**Última atualização**: 2025-01-24  
**Versão**: 2.0 (Nós Nativos)

