# 🔧 Configuração Upsert Supabase - N8N

Como o nó Supabase nativo do N8N **não suporta operação "upsert"**, usamos **HTTP Request** para fazer upserts.

## 📋 Nós que Usam Upsert

1. **Supabase - Upsert Cliente** (HTTP Request)
2. **Supabase - Atualizar Controle** (HTTP Request)

## ⚙️ Configuração

### Passo 1: Adicionar Variáveis no Set Variables

No nó **"Set Variables - CONFIGURAR AQUI"**, adicione:

#### SUPABASE_URL
```
Valor: https://[seu-project-id].supabase.co
```
**Exemplo**: `https://abcdefghijklmnop.supabase.co`

#### SUPABASE_SERVICE_KEY
```
Valor: [sua-service-role-key]
```
**⚠️ MANTENHA SECRETO** - Esta chave tem acesso total ao banco!

**Como encontrar**:
- Dashboard Supabase > Settings > API > service_role key
- Copie a chave completa (começa com `eyJ...`)

### Passo 2: Como Funciona o Upsert

Os nós HTTP Request fazem POST com:

- **URL**: `{SUPABASE_URL}/rest/v1/{tabela}?{campo_unico}=eq.{valor}`
- **Header**: `Prefer: return=representation,resolution=merge-duplicates`
- **Body**: JSON com os dados

O Supabase automaticamente:
- **Insere** se o registro não existe (baseado no campo único na query string)
- **Atualiza** se o registro já existe

### Passo 3: Estrutura dos Nós

#### Supabase - Upsert Cliente

1. **Nó anterior**: "Preparar URL Supabase" (prepara URL e chave)
2. **Nó HTTP Request**:
   - Method: POST
   - URL: `{{ $json.upsertUrl }}`
   - Headers:
     - `apikey`: `{{ $json.supabaseKey }}`
     - `Authorization`: `Bearer {{ $json.supabaseKey }}`
     - `Content-Type`: `application/json`
     - `Prefer`: `return=representation,resolution=merge-duplicates`
   - Body: JSON com `clienteData`

#### Supabase - Atualizar Controle

1. **Nó anterior**: "Preparar URL Controle" (prepara URL e chave)
2. **Nó HTTP Request**:
   - Method: POST
   - URL: `{{ $json.upsertUrl }}`
   - Headers: (mesmos do Upsert Cliente)
   - Body: JSON com `controleDiario`

## 🔍 Diferença dos Nós Nativos

| Operação | Tipo de Nó | Motivo |
|----------|------------|--------|
| getAll | Supabase nativo | ✅ Suportado |
| insert | Supabase nativo | ✅ Suportado |
| upsert | HTTP Request | ❌ Não suportado nativamente |

## ⚠️ Importante

- **Configure SUPABASE_URL e SUPABASE_SERVICE_KEY** no nó Set Variables
- Os nós HTTP Request **não usam credenciais do Supabase** diretamente
- As credenciais vêm das variáveis do nó Set Variables
- Mantenha a Service Role Key **secreta** e não versionada

## 🧪 Testar

Após configurar:

1. Execute o workflow
2. Verifique se os upserts funcionam:
   - Primeira execução: deve **inserir** novo registro
   - Segunda execução: deve **atualizar** registro existente

### Verificar no Supabase

```sql
-- Verificar cliente
SELECT * FROM instacar_clientes_envios 
WHERE telefone = '5511999999999';

-- Verificar controle
SELECT * FROM instacar_controle_envios 
WHERE data = CURRENT_DATE;
```

---

**Última atualização**: 2025-01-24  
**Versão**: 2.1 (HTTP Request para Upsert)

