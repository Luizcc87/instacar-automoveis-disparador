# Solução Rápida: Erro CORS e 502

## ⚡ Solução em 3 Passos

### Passo 1: Verificar Status do Supabase

**✅ Suas políticas RLS estão corretas!**

**⚠️ IMPORTANTE:** O Supabase removeu a configuração manual de CORS do dashboard (dezembro 2025). O PostgREST gerencia CORS automaticamente.

O erro 502 Bad Gateway pode indicar:

1. **Supabase temporariamente indisponível**

   - Verifique: https://status.supabase.com
   - Se houver incidentes, aguarde a resolução

2. **Problema com a URL ou credenciais**

   - Verifique se a URL está correta: `https://rirrnhelyutzunwicmkg.supabase.co`
   - Verifique se a anon key está correta

3. **Problema de rede/firewall**
   - Teste de outro navegador
   - Teste de outra rede
   - Verifique se há firewall bloqueando

### Passo 1.1: Teste Direto da API

Execute no console do navegador (F12) para diagnosticar:

```javascript
// Teste 1: Verificar se Supabase responde
fetch("https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/", {
  method: "OPTIONS", // Preflight request
  headers: {
    apikey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnJuaGVseXV0enVud2ljbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTIyMzAsImV4cCI6MjA2ODM2ODIzMH0.L2nJDqybzrl8sC4g5Oo9B92yfx2xfGAoTnZihCPtwg0",
  },
})
  .then((r) => {
    console.log("✅ Status:", r.status);
    console.log(
      "✅ Headers CORS:",
      r.headers.get("Access-Control-Allow-Origin")
    );
    return r;
  })
  .catch((e) => console.error("❌ Erro:", e));
```

**Se retornar 200/204:** CORS está funcionando, o problema pode ser outro
**Se retornar 502:** Problema no servidor Supabase
**Se bloquear CORS:** Problema de configuração (menos provável agora)

### Passo 2: Verificar Políticas RLS (✅ JÁ VERIFICADO)

**✅ Suas políticas RLS estão corretas!** Você já executou a verificação e confirmou que existem 3 políticas:

- Anon users can manage whatsapp_apis
- Authenticated users can manage whatsapp_apis
- Service role full access to whatsapp_apis

**Não é necessário fazer nada aqui.**

### Passo 3: Verificar Status do Supabase

1. Acesse: https://status.supabase.com
2. Verifique se há incidentes reportados
3. Se houver, aguarde a resolução
4. Se não houver, continue para o Passo 4

### Passo 4: Limpar Cache e Testar

1. Pressione `Ctrl + Shift + Delete` (limpar cache)
2. Ou use modo anônimo (`Ctrl + Shift + N`)
3. Recarregue a página (`Ctrl + F5`)
4. Tente abrir "⚙️ Gerenciar Configurações"

---

## Se Ainda Não Funcionar

### Verificar Anon Key

1. Dashboard Supabase → **Settings** → **API**
2. Copie a **"anon public"** key
3. Compare com a chave em `interface-web/index.html` (linha 27)
4. Se diferente, atualize o HTML

### Teste Direto no Console

Abra o console do navegador (F12) e execute:

```javascript
fetch(
  "https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/instacar_whatsapp_apis?select=id&limit=1",
  {
    headers: {
      apikey:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnJuaGVseXV0enVud2ljbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTIyMzAsImV4cCI6MjA2ODM2ODIzMH0.L2nJDqybzrl8sC4g5Oo9B92yfx2xfGAoTnZihCPtwg0",
      Authorization:
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnJuaGVseXV0enVud2ljbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTIyMzAsImV4cCI6MjA2ODM2ODIzMH0.L2nJDqybzrl8sC4g5Oo9B92yfx2xfGAoTnZihCPtwg0",
    },
  }
)
  .then((r) => r.json())
  .then((d) => console.log("✅ Sucesso:", d))
  .catch((e) => console.error("❌ Erro:", e));
```

**Resultados:**

- ✅ **Status 200/204:** CORS está OK, problema pode ser outro (verifique logs)
- ✅ **Status 200 com dados:** Tudo funcionando, problema pode ser na interface web
- ❌ **Status 502:** Problema no servidor Supabase (verifique status.supabase.com)
- ❌ **CORS bloqueado:** Problema incomum (contate suporte Supabase)

**Nota:** O Supabase gerencia CORS automaticamente. Se você vê erro de CORS, geralmente é porque o servidor retornou 502 antes de processar.

---

## Guia Completo

Para mais detalhes, veja: [`TROUBLESHOOTING-CORS-502.md`](TROUBLESHOOTING-CORS-502.md)
