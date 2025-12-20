# Troubleshooting: Erro CORS e 502 Bad Gateway

## Problema

Ao acessar a interface web, você recebe erros:

```
Access to fetch at 'https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/...'
from origin 'https://instacar-automoveis-disparador.pages.dev'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

E também:

```
GET https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/... net::ERR_FAILED 502 (Bad Gateway)
```

## Causas Possíveis

1. **Supabase temporariamente indisponível** - Erro 502 indica problema no servidor (MAIS PROVÁVEL)
2. **Anon Key incorreta ou expirada** - A chave anon pode estar errada
3. **Problema de rede/firewall** - Firewall ou proxy bloqueando requisições
4. **RLS bloqueando requisições** - ❌ **DESCARTADO:** Suas políticas estão corretas!

**⚠️ NOTA IMPORTANTE:** O Supabase removeu a configuração manual de CORS (dezembro 2025). O PostgREST gerencia CORS automaticamente. Se você está vendo erro de CORS, geralmente é porque o servidor está retornando 502 antes de processar a requisição.

## Soluções

### Solução 1: Verificar Status e Diagnóstico (PRIMEIRO PASSO)

**✅ IMPORTANTE:** Suas políticas RLS estão corretas!

**⚠️ ATUALIZAÇÃO (Dezembro 2025):** O Supabase removeu a configuração manual de CORS do dashboard. O PostgREST agora gerencia CORS automaticamente através de headers padrão.

O erro 502 Bad Gateway geralmente indica:

1. **Supabase temporariamente indisponível** (mais provável)
2. **Problema de rede/firewall**
3. **URL ou credenciais incorretas**

#### Diagnóstico Rápido

**1. Verificar Status do Supabase:**

- Acesse: https://status.supabase.com
- Verifique se há incidentes reportados
- Se houver, aguarde a resolução

**2. Teste Direto da API (Console do Navegador):**

```javascript
// Teste de conectividade básica
fetch("https://rirrnhelyutzunwicmkg.supabase.co/rest/v1/", {
  method: "OPTIONS",
  headers: {
    apikey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpcnJuaGVseXV0enVud2ljbWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3OTIyMzAsImV4cCI6MjA2ODM2ODIzMH0.L2nJDqybzrl8sC4g5Oo9B92yfx2xfGAoTnZihCPtwg0",
  },
})
  .then((r) => {
    console.log("Status:", r.status);
    console.log("CORS Header:", r.headers.get("Access-Control-Allow-Origin"));
  })
  .catch((e) => console.error("Erro:", e));
```

**3. Teste de Requisição Real:**

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

**Interpretação dos Resultados:**

- ✅ **200/204 no OPTIONS:** CORS está funcionando
- ✅ **200 no GET com dados:** Tudo funcionando, problema pode ser na interface web
- ❌ **502 Bad Gateway:** Problema no servidor Supabase (verifique status)
- ❌ **CORS bloqueado:** Problema incomum (contate suporte Supabase)

### Solução 2: Verificar Status do Supabase (PRIORIDADE)

1. Acesse: https://status.supabase.com
2. Verifique se há incidentes reportados
3. Se houver, aguarde a resolução
4. O erro 502 geralmente indica problema temporário no servidor

### Solução 3: Verificar Anon Key

1. No Dashboard do Supabase, vá em **Settings** → **API**
2. Copie a **"anon public"** key
3. Verifique se está igual à chave no arquivo `interface-web/index.html` (linha 27)
4. Se estiver diferente, atualize no HTML ou reexecute o `inject-env.js`

### Solução 4: Verificar Políticas RLS

**⚠️ IMPORTANTE:** Para que a interface web possa ler o histórico de envios, é necessário ter uma política RLS para usuários `anon` na tabela `instacar_historico_envios`.

**Verificar políticas:**

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'instacar_historico_envios';
```

**Se não houver política para `anon`, execute:**

- Script: `docs/interface-web/fix-rls-historico.sql`
- Documentação completa: `docs/interface-web/HISTORICO-ENVIOS-INDIVIDUAIS.md`

**Não é necessário fazer nada aqui.**

### Solução 5: Testar Conexão Direta (JÁ INCLUÍDO NO PASSO 1)

Veja o **Passo 1.1** acima para testes detalhados de diagnóstico.

## ⚠️ IMPORTANTE: CORS no Supabase (Atualizado Dezembro 2025)

**O Supabase removeu a configuração manual de CORS do dashboard.** O PostgREST agora gerencia CORS automaticamente através de headers padrão.

**Isso significa:**

- ✅ CORS deve funcionar automaticamente para requisições padrão
- ❌ Se você vê erro de CORS, geralmente é porque o servidor retornou 502 antes de processar
- 🔍 O erro 502 Bad Gateway é o problema real que precisa ser resolvido

**Se o erro 502 persistir:**

1. Verifique status: https://status.supabase.com
2. Aguarde alguns minutos (pode ser problema temporário)
3. Tente novamente
4. Se persistir por mais de 30 minutos, contate o suporte do Supabase

5. **Verifique a Anon Key:**
   - Na mesma página, copie a **"anon public"** key
   - Compare com a chave no `interface-web/index.html`

## Solução Alternativa: Usar Proxy (Apenas se 502 Persistir)

**⚠️ Só use se o erro 502 persistir por mais de 1 hora e o status do Supabase estiver OK.**

Se o Supabase estiver realmente indisponível, você pode usar um proxy temporário:

1. Configure um proxy no Cloudflare Pages (via Workers)
2. Ou use um serviço como CORS-anywhere (apenas para desenvolvimento)

**⚠️ Não recomendado para produção!** Prefira aguardar a resolução do problema no Supabase.

## Verificação Final

Após aplicar as soluções, verifique:

1. **Limpe o cache do navegador:**

   - Pressione `Ctrl + Shift + Delete`
   - Limpe cache e cookies
   - Ou use modo anônimo

2. **Recarregue a página:**

   - Pressione `Ctrl + F5` (hard refresh)

3. **Verifique o console:**

   - Pressione `F12`
   - Vá em **Console**
   - Não deve haver mais erros de CORS

4. **Teste a funcionalidade:**
   - Tente abrir "⚙️ Gerenciar Configurações"
   - Deve carregar as instâncias WhatsApp

## Se Nada Funcionar

1. **Verifique se o Supabase está ativo:**

   ```sql
   -- Execute no SQL Editor
   SELECT NOW() as servidor_ativo;
   ```

2. **Verifique logs do Supabase:**

   - Dashboard → **Logs** → **API Logs**
   - Veja se há erros nas requisições

3. **Contate o suporte do Supabase:**
   - Se o erro 502 persistir, pode ser problema no servidor
   - Abra um ticket no suporte do Supabase

## Script SQL de Verificação

Execute este script no SQL Editor do Supabase para verificar e corrigir políticas RLS:

```sql
-- Ver arquivo: docs/supabase/fix-cors-whatsapp-apis.sql
```

Ou execute diretamente:

```sql
-- Garantir RLS habilitado
ALTER TABLE instacar_whatsapp_apis ENABLE ROW LEVEL SECURITY;

-- Recriar política para anon users
DROP POLICY IF EXISTS "Anon users can manage whatsapp_apis" ON instacar_whatsapp_apis;
CREATE POLICY "Anon users can manage whatsapp_apis"
  ON instacar_whatsapp_apis
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
```

## Resumo Executivo

**✅ Políticas RLS:** Corretas (já verificado)
**❌ CORS Manual:** Não existe mais no Supabase (removido em dez/2025)
**🔍 Problema Real:** Erro 502 Bad Gateway (servidor Supabase)

**Ações Recomendadas:**

1. Verificar status: https://status.supabase.com
2. Aguardar alguns minutos (pode ser temporário)
3. Testar novamente
4. Se persistir, contatar suporte Supabase

## Referências

- [Status do Supabase](https://status.supabase.com)
- [Troubleshooting Supabase](https://supabase.com/docs/guides/platform/troubleshooting)
- Script SQL: `docs/supabase/fix-cors-whatsapp-apis.sql`
