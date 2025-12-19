# Lógica do Campo `status_whatsapp`

Este documento explica como o campo `status_whatsapp` é determinado e salvo no banco de dados `instacar_clientes_envios`.

## 📋 Visão Geral

O campo `status_whatsapp` armazena o resultado da validação de WhatsApp para cada número de telefone. Ele é atualizado sempre que um número é verificado através da API Uazapi.

**💡 Otimização Futura:** Este campo pode ser usado como **cache** para evitar chamadas desnecessárias à API Uazapi. Se um número já possui `status_whatsapp` definido como `'valid'` ou `'invalid'` no banco, o sistema pode pular a verificação na API e usar o valor armazenado, economizando tempo e recursos.

## 🗄️ Schema do Banco de Dados

No Supabase, o campo está definido na tabela `instacar_clientes_envios`:

```sql
status_whatsapp TEXT CHECK (status_whatsapp IN ('valid', 'invalid', 'unknown'))
```

**Valores permitidos:**

- `'valid'`: Número possui WhatsApp válido
- `'invalid'`: Número não possui WhatsApp
- `'unknown'`: Status desconhecido (não utilizado atualmente no código)

## 🔄 Fluxo de Determinação do Status

### 1. Verificação na API Uazapi

O status é determinado no nó **"Processar WhatsApp"** após a chamada à API Uazapi `/chat/check`.

**Código do nó "Processar WhatsApp":**

```javascript
// Processar resposta do Uazapi
const resposta = $input.first().json;
const resultado = Array.isArray(resposta) ? resposta[0] : resposta;

let temWhatsApp = false;

if (resultado) {
  // Verifica múltiplos formatos possíveis da resposta da API

  // 1. Campo principal: isInWhatsapp (boolean ou string)
  if (resultado.isInWhatsapp === true || resultado.isInWhatsapp === "true") {
    temWhatsApp = true;
  } else if (
    resultado.isInWhatsapp === false ||
    resultado.isInWhatsapp === "false"
  ) {
    temWhatsApp = false;
  }

  // 2. Campos alternativos
  else if (resultado.exists === true || resultado.exists === "true") {
    temWhatsApp = true;
  } else if (resultado.valid === true || resultado.valid === "true") {
    temWhatsApp = true;
  } else if (resultado.status === "valid" || resultado.status === "connected") {
    temWhatsApp = true;
  }

  // 3. Verificar erros explícitos
  if (
    resultado.error ||
    resultado.message === "not found" ||
    resultado.message === "invalid"
  ) {
    temWhatsApp = false;
  }
}

// Retorna temWhatsApp (boolean) para os próximos nós
return [
  {
    json: {
      ...$("Processar Cliente").item.json,
      temWhatsApp: temWhatsApp,
      respostaUazapi: resultado,
    },
  },
];
```

### 2. Conversão para `status_whatsapp`

O valor booleano `temWhatsApp` é convertido para o formato do banco em dois pontos:

#### A. Nó "Preparar Dados Cliente" (quando tem WhatsApp ou não)

**Código:**

```javascript
const clienteData = {
  // ... outros campos ...
  status_whatsapp: dados.temWhatsApp ? "valid" : "invalid",
};
```

**Lógica:**

- Se `temWhatsApp === true` → `status_whatsapp = 'valid'`
- Se `temWhatsApp === false` → `status_whatsapp = 'invalid'`

#### B. Nó "Preparar Dados Cliente Sem WhatsApp" (caminho alternativo)

**Código:**

```javascript
const clienteData = {
  // ... outros campos ...
  status_whatsapp: "invalid", // Marca explicitamente como inválido
};
```

**Lógica:**

- Quando o número não possui WhatsApp, este nó é executado
- Define explicitamente `status_whatsapp = 'invalid'`
- Também registra no histórico com `status_envio: 'sem_whatsapp'`

## 📊 Tabela de Decisão

| Condição da API Uazapi             | `temWhatsApp` | `status_whatsapp` | Observação                    |
| ---------------------------------- | ------------- | ----------------- | ----------------------------- |
| `isInWhatsapp: true`               | `true`        | `'valid'`         | Número tem WhatsApp           |
| `isInWhatsapp: false`              | `false`       | `'invalid'`       | Número não tem WhatsApp       |
| `exists: true`                     | `true`        | `'valid'`         | Campo alternativo             |
| `valid: true`                      | `true`        | `'valid'`         | Campo alternativo             |
| `status: 'valid'` ou `'connected'` | `true`        | `'valid'`         | Campo alternativo             |
| `error: true`                      | `false`       | `'invalid'`       | Erro na verificação           |
| `message: 'not found'`             | `false`       | `'invalid'`       | Número não encontrado         |
| `message: 'invalid'`               | `false`       | `'invalid'`       | Número inválido               |
| Resposta vazia/null                | `false`       | `'invalid'`       | Padrão quando não há resposta |

## 🔍 Exemplos de Respostas da API Uazapi

### Exemplo 1: Número com WhatsApp

```json
{
  "query": "554399940634",
  "isInWhatsapp": true,
  "jid": "554399940634@s.whatsapp.net",
  "verifiedName": ""
}
```

**Resultado:** `temWhatsApp = true` → `status_whatsapp = 'valid'`

### Exemplo 2: Número sem WhatsApp

```json
{
  "query": "554399940634",
  "isInWhatsapp": false,
  "jid": "",
  "verifiedName": ""
}
```

**Resultado:** `temWhatsApp = false` → `status_whatsapp = 'invalid'`

### Exemplo 3: Erro na verificação

```json
{
  "error": true,
  "message": "not found"
}
```

**Resultado:** `temWhatsApp = false` → `status_whatsapp = 'invalid'`

## 🎯 Quando o Status é Atualizado

O `status_whatsapp` é atualizado/inserido no banco de dados em dois cenários:

### Cenário 1: Cliente Novo (INSERT)

Quando um cliente não existe no banco:

- O status é definido baseado na verificação atual
- Inserido via nó **"Supabase - Inserir Cliente Novo"** (POST)

### Cenário 2: Cliente Existente (UPDATE)

Quando um cliente já existe no banco:

- O status é atualizado com a verificação mais recente
- Atualizado via nó **"Supabase - Upsert Cliente"** (PATCH)

**⚠️ Importante:** O status é sempre atualizado com a verificação mais recente, mesmo que o cliente já tenha um status anterior. Isso permite revalidar números que podem ter mudado de status.

## 🔄 Fluxo Completo no Workflow

```
1. Uazapi - Check WhatsApp
   ↓
2. Processar WhatsApp
   ├─→ Analisa resposta da API
   ├─→ Determina temWhatsApp (boolean)
   └─→ Passa para próximo nó
   ↓
3. IF Tem WhatsApp
   ├─→ TRUE: Continua para gerar mensagem
   └─→ FALSE: Vai para "Preparar Dados Cliente Sem WhatsApp"
   ↓
4a. Preparar Dados Cliente (se tem WhatsApp)
   └─→ status_whatsapp: temWhatsApp ? 'valid' : 'invalid'
   ↓
4b. Preparar Dados Cliente Sem WhatsApp (se não tem)
   └─→ status_whatsapp: 'invalid'
   ↓
5. IF Cliente Existe
   ├─→ TRUE: Supabase - Upsert Cliente (PATCH)
   └─→ FALSE: Supabase - Inserir Cliente Novo (POST)
   ↓
6. Banco de Dados
   └─→ status_whatsapp salvo/atualizado
```

## 📝 Observações Importantes

1. **Revalidação:** O status é atualizado a cada verificação, mesmo que o cliente já tenha um status anterior. Isso permite detectar mudanças (ex: número que ganhou WhatsApp).

2. **Valor 'unknown':** Embora permitido no schema, o valor `'unknown'` não é utilizado atualmente. O código sempre define `'valid'` ou `'invalid'`.

3. **Fallback:** Se a API Uazapi não retornar dados claros, o padrão é `temWhatsApp = false`, resultando em `status_whatsapp = 'invalid'`.

4. **Histórico:** Quando `status_whatsapp = 'invalid'`, também é registrado no histórico (`instacar_historico_envios`) com `status_envio: 'sem_whatsapp'`.

5. **Não bloqueia o fluxo:** Números sem WhatsApp não interrompem o processamento. O sistema registra o status e continua para o próximo número.

6. **⚠️ Uso como Cache (Não Implementado):** Atualmente, o sistema **sempre** chama a API Uazapi para verificar o WhatsApp, mesmo que o número já tenha um `status_whatsapp` salvo no banco. Uma otimização futura seria verificar o `status_whatsapp` do banco antes de chamar a API:

   - Se `status_whatsapp = 'valid'` ou `'invalid'` → Usa o valor do banco (pula a API)
   - Se `status_whatsapp = null` ou `'unknown'` → Chama a API para verificar

   **Benefícios:**

   - Reduz chamadas à API Uazapi
   - Acelera o processamento
   - Economiza recursos/custos
   - Mantém a possibilidade de revalidação quando necessário

## 🔧 Troubleshooting

### Problema: Status sempre 'invalid'

**Possíveis causas:**

- API Uazapi não está retornando dados corretos
- Verificar logs do nó "Processar WhatsApp"
- Confirmar formato da resposta da API

**Solução:**

- Verificar logs: `console.log('Resposta Uazapi:', JSON.stringify(resultado))`
- Confirmar que a API está retornando `isInWhatsapp: true` para números válidos

### Problema: Status não está sendo atualizado

**Possíveis causas:**

- Nó "Preparar Dados Cliente" não está sendo executado
- Dados não estão sendo passados corretamente para o Supabase

**Solução:**

- Verificar conexões do workflow
- Confirmar que `clienteData.status_whatsapp` está sendo incluído no upsert

## 🚀 Otimização Proposta: Usar `status_whatsapp` como Cache

### Problema Atual

O workflow atualmente **sempre** chama a API Uazapi `/chat/check` para verificar se um número possui WhatsApp, mesmo quando o número já foi verificado anteriormente e o resultado está salvo no banco de dados.

### Solução Proposta

Adicionar uma verificação no nó **"Processar Cliente"** para usar o `status_whatsapp` do banco como cache:

**Fluxo Otimizado:**

```
1. Supabase - Verificar Cliente
   ↓ (retorna status_whatsapp se cliente existe)
2. Processar Cliente
   ├─→ Verifica se clienteExistente.status_whatsapp existe
   ├─→ Se status_whatsapp = 'valid' ou 'invalid'
   │   └─→ Usa valor do banco (pula API)
   └─→ Se status_whatsapp = null ou 'unknown'
       └─→ Continua para Uazapi - Check WhatsApp
3. IF Status Já Conhecido
   ├─→ TRUE: Usa status do banco
   └─→ FALSE: Chama API Uazapi
```

### Implementação Sugerida

**Modificar o nó "Processar Cliente":**

```javascript
// ... código existente ...

if (clienteExistente && clienteExistente.id) {
  // Cliente existe - verificar status_whatsapp do banco
  const statusWhatsappBanco = clienteExistente.status_whatsapp;
  const temWhatsAppDoBanco = statusWhatsappBanco === "valid";
  const precisaVerificarAPI =
    !statusWhatsappBanco || statusWhatsappBanco === "unknown";

  // ... resto do código existente ...

  return {
    json: {
      clienteExiste: true,
      clienteId: clienteExistente.id,
      totalEnvios: clienteExistente.total_envios || 0,
      jaRecebeuMensagem: (clienteExistente.total_envios || 0) > 0,
      veiculos: veiculos,
      veiculoAtual: veiculoAtual,
      dadosCliente: clienteExistente,
      dadosPlanilha: dadosPlanilha,
      // NOVOS CAMPOS
      statusWhatsappBanco: statusWhatsappBanco,
      temWhatsApp: temWhatsAppDoBanco, // Usa do banco se disponível
      precisaVerificarAPI: precisaVerificarAPI, // Flag para decidir se chama API
    },
  };
}
```

**Adicionar nó "IF Precisa Verificar WhatsApp":**

- **Condição:** `$json.precisaVerificarAPI === true`
- **TRUE Branch:** Vai para "Uazapi - Check WhatsApp" (chama API)
- **FALSE Branch:** Vai para "Processar WhatsApp" (usa valor do banco)

**Modificar nó "Processar WhatsApp":**

```javascript
// Verificar se já temos status do banco
if (dados.statusWhatsappBanco && dados.statusWhatsappBanco !== "unknown") {
  // Usa status do banco (não chamou API)
  const temWhatsApp = dados.statusWhatsappBanco === "valid";
  return [
    {
      json: {
        ...dados,
        temWhatsApp: temWhatsApp,
        respostaUazapi: null, // Não chamou API
        usadoCache: true, // Flag indicando que usou cache
      },
    },
  ];
}

// Se chegou aqui, chamou a API (código existente)
// ... resto do código ...
```

### Benefícios da Otimização

1. **Redução de Chamadas à API:** Números já verificados não precisam ser verificados novamente
2. **Performance:** Processamento mais rápido (sem esperar resposta da API)
3. **Economia:** Reduz custos se a API Uazapi for paga por chamada
4. **Revalidação Opcional:** Permite revalidar números quando necessário (ex: após X dias)

### Considerações

- **Revalidação:** Pode ser necessário revalidar números periodicamente (ex: a cada 30 dias)
- **Confiança no Cache:** O status do banco é confiável, mas números podem mudar de status
- **Implementação Gradual:** Testar com um subconjunto antes de aplicar em produção

---

**Última atualização:** 2025-12-14  
**Versão do workflow:** 2.1
