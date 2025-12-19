# 📖 Sintaxe N8N - Acessando Variáveis e Dados

Guia de referência rápida sobre como acessar dados de nós anteriores no N8N.

## 🔑 Diferença entre `.item` e `.first()`

### `.first()` - Recomendado para Variáveis Globais

**Use quando:**
- Acessar variáveis definidas uma vez no início (nó Set Variables)
- Você sabe que há apenas 1 item no nó
- Você quer sempre o primeiro item, independente do contexto

**Sintaxe:**
```javascript
$('Nome do Nó').first().json.campo
```

**Exemplo:**
```javascript
// Acessar variável do nó Set Variables
$('Set Variables - CONFIGURAR AQUI').first().json.SUPABASE_URL
```

**Por que usar `.first()`?**
- ✅ Funciona dentro de loops
- ✅ Funciona em qualquer contexto
- ✅ Mais explícito e seguro
- ✅ Sempre retorna o primeiro item

### `.item` - Use Dentro de Loops

**Use quando:**
- Você está dentro de um loop (Split in Batches, Loop Over Items)
- Você quer o item atual do loop
- O nó anterior tem múltiplos itens e você quer processar cada um

**Sintaxe:**
```javascript
$('Nome do Nó').item.json.campo
```

**Exemplo:**
```javascript
// Dentro de um loop, acessar dados do item atual
$('Loop Over Items').item.json.Cliente
```

**Quando usar `.item`?**
- ✅ Dentro de loops para processar cada item
- ✅ Quando você quer o item atual do contexto
- ⚠️ Pode não funcionar fora de loops

## 📋 Exemplos Práticos no Workflow

### 1. Acessar Variáveis Globais (Set Variables)

```javascript
// ✅ CORRETO - Use .first()
$('Set Variables - CONFIGURAR AQUI').first().json.SUPABASE_URL
$('Set Variables - CONFIGURAR AQUI').first().json.UAZAPI_TOKEN

// ❌ ERRADO - .item pode não funcionar em loops
$('Set Variables - CONFIGURAR AQUI').item.json.SUPABASE_URL
```

### 2. Acessar Dados do Item Atual

```javascript
// ✅ CORRETO - Dentro de loop, use .item
$('Normalizar Telefones').item.json.numeroFormatado
$('Processar Cliente').item.json.dadosPlanilha.Cliente

// ✅ TAMBÉM CORRETO - Use $json (mais simples)
$json.numeroFormatado
$json.Cliente
```

### 3. Acessar Dados de Nó Anterior Específico

```javascript
// ✅ CORRETO - Use .first() para garantir
$('Supabase - Verificar Cliente').first().json[0]

// ✅ CORRETO - Dentro de loop, pode usar .item
$('Supabase - Verificar Cliente').item.json[0]
```

### 4. Em Expressões N8N (não JavaScript)

```javascript
// ✅ CORRETO - Use .first() para variáveis globais
={{ $('Set Variables - CONFIGURAR AQUI').first().json.SUPABASE_URL }}

// ✅ CORRETO - Use $json para dados do item atual
={{ $json.numeroFormatado }}

// ✅ CORRETO - Use .item dentro de loops
={{ $('Processar Cliente').item.json.dadosPlanilha.Cliente }}
```

## 🎯 Regra de Ouro

### Para Variáveis de Configuração (Set Variables)
**SEMPRE use `.first()`**

```javascript
// ✅ SEMPRE assim:
$('Set Variables - CONFIGURAR AQUI').first().json.VARIAVEL
```

### Para Dados de Processamento (dentro de loops)
**Use `.item` ou `$json`**

```javascript
// ✅ Dentro de loop:
$json.campo
// ou
$('Nó Anterior').item.json.campo
```

## 🔍 Outras Sintaxes Úteis

### `.all()` - Todos os Itens

```javascript
// Retorna array com todos os itens
$('Nome do Nó').all()
```

**Exemplo:**
```javascript
// Processar todos os itens
for (const item of $('Read Google Sheets').all()) {
  console.log(item.json.Cliente);
}
```

### `$input` - Dados de Entrada do Nó Atual

```javascript
// Primeiro item de entrada
$input.first().json.campo

// Todos os itens de entrada
$input.all()
```

### `$json` - Dados do Item Atual (Atalho)

```javascript
// Equivale a $input.first().json
$json.campo
```

## ⚠️ Erros Comuns

### Erro: "Cannot read property 'json' of undefined"

**Causa**: Tentando acessar `.item` quando não há item no contexto atual.

**Solução**: Use `.first()` para variáveis globais.

```javascript
// ❌ ERRADO
$('Set Variables').item.json.SUPABASE_URL

// ✅ CORRETO
$('Set Variables').first().json.SUPABASE_URL
```

### Erro: "Variable not found"

**Causa**: Nome do nó está incorreto ou nó não existe.

**Solução**: Verifique o nome exato do nó (case-sensitive).

```javascript
// ❌ ERRADO - Nome diferente
$('Set Variables').first().json.SUPABASE_URL

// ✅ CORRETO - Nome exato
$('Set Variables - CONFIGURAR AQUI').first().json.SUPABASE_URL
```

## 📚 Referência Rápida

| Situação | Sintaxe | Exemplo |
|----------|---------|---------|
| Variável global | `.first()` | `$('Set Variables').first().json.VAR` |
| Item atual (loop) | `.item` ou `$json` | `$json.campo` |
| Todos os itens | `.all()` | `$('Nó').all()` |
| Entrada atual | `$input.first()` | `$input.first().json.campo` |

## ✅ Checklist

Ao acessar dados no N8N:

- [ ] Variáveis globais usam `.first()`
- [ ] Dados do item atual usam `$json` ou `.item`
- [ ] Nome do nó está correto (case-sensitive)
- [ ] Testei a expressão antes de usar

---

**Última atualização**: 2025-01-24  
**Versão**: 2.0

