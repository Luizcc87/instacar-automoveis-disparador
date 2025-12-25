# Configuração Cloudflare Pages - instacar-campanhas-refactor

## 🎯 Projeto: instacar-campanhas-refactor

**URL de produção:** `https://instacar-campanhas-refactor.pages.dev`

## ⚙️ Configurações do Projeto

### Informações Básicas

- **Project name:** `instacar-campanhas-refactor`
- **Production branch:** `layout-refactor`
- **Framework preset:** `None` ou `Other`

### Build Settings

- **Build command:** 
  ```
  cd interface-web && npm install && npm run inject-env
  ```

- **Build output directory:** 
  ```
  interface-web
  ```

- **Root directory:** 
  ```
  / (raiz do repositório)
  ```

### Variáveis de Ambiente

Configure em **Settings** > **Environment Variables**:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `SUPABASE_URL` | `https://seu-projeto-id.supabase.co` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | `sua-anon-key-aqui` | Chave anônima do Supabase |

**⚠️ IMPORTANTE:**
- Use apenas a **Anon Key**, nunca a Service Role Key
- As variáveis serão injetadas automaticamente durante o build

## 🔗 Repositório

- **Repositório:** `Luizcc87/instacar-automoveis-disparador`
- **Branch:** `layout-refactor`
- **GitHub:** https://github.com/Luizcc87/instacar-automoveis-disparador

## 📊 Estrutura de Versões

```
Produção Atual:
├─ instacar-campanhas.pages.dev (main) ← Versão antiga estável
└─ instacar-campanhas-refactor.pages.dev (layout-refactor) ← Versão refatorada (testes)
```

## ✅ Checklist de Configuração

- [ ] Projeto criado no Cloudflare Pages
- [ ] Repositório conectado
- [ ] Branch `layout-refactor` selecionada
- [ ] Build command configurado
- [ ] Build output directory configurado
- [ ] Variáveis de ambiente adicionadas
- [ ] Primeiro deploy realizado
- [ ] Testes realizados na URL: `https://instacar-campanhas-refactor.pages.dev`

## 🧪 Testes Após Deploy

1. **Verificar carregamento:**
   - Acesse `https://instacar-campanhas-refactor.pages.dev`
   - Verifique se a página carrega corretamente

2. **Testar funcionalidades principais:**
   - [ ] Conexão com Supabase
   - [ ] Listagem de campanhas
   - [ ] Criação/edição de campanhas
   - [ ] Seleção de clientes
   - [ ] Filtro "apenas não enviados"
   - [ ] Contadores informativos
   - [ ] Validação ao salvar seleção

3. **Comparar com versão antiga:**
   - Versão antiga: `https://instacar-campanhas.pages.dev`
   - Versão refatorada: `https://instacar-campanhas-refactor.pages.dev`

## 🔄 Próximos Passos

Após validação completa:

1. **Se tudo estiver OK:**
   - Considerar fazer merge em `main`
   - Ou alterar branch de produção do projeto principal

2. **Se houver problemas:**
   - Versão antiga continua disponível em `instacar-campanhas.pages.dev`
   - Tag `v1-layout-antigo` disponível para rollback

## 📚 Documentação Relacionada

- [Checklist de Deploy](CHECKLIST-DEPLOY-LAYOUT-REFACTOR.md)
- [Guia Completo de Deploy](DEPLOY-BRANCH-LAYOUT-REFACTOR.md)
- [Guia Cloudflare Pages](../deploy/cloudflare-pages.md)

