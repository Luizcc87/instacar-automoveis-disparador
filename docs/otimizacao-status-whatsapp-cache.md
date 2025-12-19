# Otimização: Usar `status_whatsapp` como Cache

## 📋 Objetivo

Evitar chamadas desnecessárias à API Uazapi `/chat/check` utilizando o campo `status_whatsapp` já salvo no banco de dados como cache.

## 🎯 Benefícios

- ✅ **Redução de chamadas à API:** Números já verificados não precisam ser verificados novamente
- ✅ **Performance:** Processamento mais rápido (sem esperar resposta da API)
- ✅ **Economia:** Reduz custos se a API Uazapi for paga por chamada
- ✅ **Escalabilidade:** Permite processar mais números no mesmo período

## 🔄 Fluxo Atual vs. Otimizado

### Fluxo Atual

```
Supabase - Verificar Cliente
  ↓ (retorna dados do cliente, mas não usa status_whatsapp)
Processar Cliente
  ↓
IF Já Recebeu Mensagem
  ↓ (FALSE branch)
Uazapi - Check WhatsApp ← SEMPRE CHAMA A API
  ↓
Processar WhatsApp
```

**Problema:** Mesmo que o número já tenha sido verificado e o `status_whatsapp` esteja salvo no banco, o sistema sempre chama a API.

### Fluxo Otimizado

```
Supabase - Verificar Cliente
  ↓ (retorna status_whatsapp se cliente existe)
Processar Cliente
  ├─→ Verifica status_whatsapp do banco
  ├─→ Define precisaVerificarAPI = false se status existe
  └─→ Define precisaVerificarAPI = true se status é null/unknown
  ↓
IF Precisa Verificar WhatsApp (NOVO NÓ)
  ├─→ FALSE: Usa status do banco (PULA API)
  └─→ TRUE: Chama Uazapi - Check WhatsApp
  ↓
Processar WhatsApp
  ├─→ Se usou cache: Converte status_whatsapp para temWhatsApp
  └─→ Se chamou API: Processa resposta normalmente
```

## 🛠️ Implementação

### Passo 1: Modificar Nó "Processar Cliente"

**Localização:** Após o nó "Combinar Dados Supabase Planilha"

**Código a adicionar:**

```javascript
// Após verificar clienteExistente
if (clienteExistente && clienteExistente.id) {
  // ... código existente para veículos ...

  // NOVO: Verificar status_whatsapp do banco
  const statusWhatsappBanco = clienteExistente.status_whatsapp;
  const temWhatsAppDoBanco = statusWhatsappBanco === "valid";
  const precisaVerificarAPI =
    !statusWhatsappBanco || statusWhatsappBanco === "unknown";

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
      temWhatsApp: temWhatsAppDoBanco, // null se não tem status
      precisaVerificarAPI: precisaVerificarAPI,
    },
  };
} else {
  // Cliente não existe - precisa verificar
  return {
    json: {
      clienteExiste: false,
      // ... código existente ...
      // NOVOS CAMPOS
      statusWhatsappBanco: null,
      temWhatsApp: null,
      precisaVerificarAPI: true, // Sempre verifica se cliente não existe
    },
  };
}
```

### Passo 2: Adicionar Nó "IF Precisa Verificar WhatsApp"

**Tipo:** IF Node

**Posição:** Entre "IF Já Recebeu Mensagem" (FALSE branch) e "Uazapi - Check WhatsApp"

**Configuração:**

- **Condição:** `$json.precisaVerificarAPI === true`
- **TRUE Branch:** Conecta para "Uazapi - Check WhatsApp" (chama API)
- **FALSE Branch:** Conecta para "Processar WhatsApp" (usa cache)

### Passo 3: Modificar Nó "Processar WhatsApp"

**Código a modificar:**

```javascript
// Processar resposta do Uazapi OU usar cache do banco
const item = $input.first();
const dados = item.json;

// NOVO: Verificar se usou cache (não chamou API)
if (
  dados.statusWhatsappBanco &&
  dados.statusWhatsappBanco !== "unknown" &&
  !dados.respostaUazapi
) {
  // Usa status do banco (não chamou API)
  const temWhatsApp = dados.statusWhatsappBanco === "valid";

  console.log(
    "Usando status_whatsapp do banco (cache):",
    dados.statusWhatsappBanco
  );

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
const resposta = dados.respostaUazapi || item.json;
const resultado = Array.isArray(resposta) ? resposta[0] : resposta;

let temWhatsApp = false;

if (resultado) {
  // ... código existente de verificação ...
}

console.log("Verificação via API Uazapi. Resultado:", temWhatsApp);

return [
  {
    json: {
      ...dados,
      temWhatsApp: temWhatsApp,
      respostaUazapi: resultado,
      usadoCache: false, // Flag indicando que chamou API
    },
  },
];
```

### Passo 4: Atualizar Conexões do Workflow

**Conexões a modificar:**

1. **"IF Já Recebeu Mensagem" (FALSE branch)**

   - Antes: Conectava direto para "Uazapi - Check WhatsApp"
   - Depois: Conecta para "IF Precisa Verificar WhatsApp"

2. **"IF Precisa Verificar WhatsApp"**

   - TRUE branch: Conecta para "Uazapi - Check WhatsApp"
   - FALSE branch: Conecta para "Processar WhatsApp"

3. **"Uazapi - Check WhatsApp"**
   - Continua conectado para "Processar WhatsApp" (sem mudanças)

## 📊 Exemplos de Fluxo

### Exemplo 1: Cliente Novo (Sem Cache)

```
1. Supabase - Verificar Cliente → Cliente não existe
2. Processar Cliente → precisaVerificarAPI = true
3. IF Precisa Verificar WhatsApp → TRUE
4. Uazapi - Check WhatsApp → Chama API
5. Processar WhatsApp → Processa resposta da API
```

### Exemplo 2: Cliente Existente com `status_whatsapp = 'valid'`

```
1. Supabase - Verificar Cliente → Cliente existe, status_whatsapp = 'valid'
2. Processar Cliente → precisaVerificarAPI = false, temWhatsApp = true
3. IF Precisa Verificar WhatsApp → FALSE
4. Processar WhatsApp → Usa cache (temWhatsApp = true)
5. Continua fluxo normalmente
```

### Exemplo 3: Cliente Existente com `status_whatsapp = 'invalid'`

```
1. Supabase - Verificar Cliente → Cliente existe, status_whatsapp = 'invalid'
2. Processar Cliente → precisaVerificarAPI = false, temWhatsApp = false
3. IF Precisa Verificar WhatsApp → FALSE
4. Processar WhatsApp → Usa cache (temWhatsApp = false)
5. Vai para "Preparar Dados Cliente Sem WhatsApp"
```

### Exemplo 4: Cliente Existente com `status_whatsapp = null`

```
1. Supabase - Verificar Cliente → Cliente existe, status_whatsapp = null
2. Processar Cliente → precisaVerificarAPI = true
3. IF Precisa Verificar WhatsApp → TRUE
4. Uazapi - Check WhatsApp → Chama API
5. Processar WhatsApp → Processa resposta da API
```

## 🔍 Validação e Testes

### Testes Necessários

1. **Teste 1: Cliente novo**

   - Verificar que chama API normalmente
   - Confirmar que `status_whatsapp` é salvo após verificação

2. **Teste 2: Cliente com `status_whatsapp = 'valid'`**

   - Verificar que **NÃO** chama API
   - Confirmar que `temWhatsApp = true` é definido corretamente
   - Verificar que fluxo continua normalmente

3. **Teste 3: Cliente com `status_whatsapp = 'invalid'`**

   - Verificar que **NÃO** chama API
   - Confirmar que `temWhatsApp = false` é definido corretamente
   - Verificar que vai para "Preparar Dados Cliente Sem WhatsApp"

4. **Teste 4: Cliente com `status_whatsapp = null`**

   - Verificar que chama API normalmente
   - Confirmar que `status_whatsapp` é salvo após verificação

5. **Teste 5: Múltiplos números**
   - Processar lote com números novos e existentes
   - Verificar que apenas números novos/sem status chamam API
   - Confirmar economia de chamadas

### Métricas para Monitorar

- **Redução de chamadas à API:** Comparar antes/depois
- **Tempo de processamento:** Deve reduzir significativamente
- **Taxa de cache hit:** % de números que usaram cache
- **Erros:** Verificar se não introduziu novos erros

## ⚠️ Considerações Importantes

### Revalidação Periódica

Números podem mudar de status ao longo do tempo. Considere:

1. **Revalidar após X dias:** Adicionar campo `status_whatsapp_updated_at` e revalidar após 30 dias
2. **Revalidar em caso de erro:** Se envio falhar, revalidar o número
3. **Flag de revalidação forçada:** Permitir forçar revalidação quando necessário

### Confiabilidade do Cache

- O cache é confiável para números já verificados
- Números podem ganhar/perder WhatsApp ao longo do tempo
- Balancear economia vs. precisão

### Rollback

Se houver problemas, é fácil reverter:

- Remover nó "IF Precisa Verificar WhatsApp"
- Reconectar "IF Já Recebeu Mensagem" diretamente para "Uazapi - Check WhatsApp"
- Remover código de cache do nó "Processar Cliente"

## 📈 Estimativa de Impacto

### Cenário: 1000 números processados

**Antes:**

- 1000 chamadas à API Uazapi
- ~1000 segundos de espera (assumindo 1s por chamada)

**Depois (assumindo 70% já verificados):**

- 300 chamadas à API Uazapi (apenas novos)
- ~300 segundos de espera
- **Economia: 70% de chamadas e tempo**

## 🚀 Próximos Passos

1. ✅ Documentar proposta (este documento)
2. ⏳ Implementar modificações no workflow
3. ⏳ Testar em ambiente de desenvolvimento
4. ⏳ Validar com dados reais (pequeno lote)
5. ⏳ Monitorar métricas
6. ⏳ Aplicar em produção gradualmente

---

**Criado em:** 2025-12-14  
**Status:** Proposta  
**Versão do workflow:** 2.1 → 2.2 (após implementação)
