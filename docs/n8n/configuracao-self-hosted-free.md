# 📘 Configuração N8N Self-Hosted Free - Instacar Automóveis

Guia específico para configurar o workflow no **N8N self-hosted free** (sem Environment Variables).

## ⚠️ Diferenças do N8N Cloud

No N8N self-hosted free:

- ❌ Não há Environment Variables
- ✅ Configure valores diretamente no nó "Set Variables - CONFIGURAR AQUI"
- ✅ Use credenciais do N8N para tokens sensíveis (quando possível)

## 🚀 Passo 1: Importar Workflow

1. No N8N, vá em **Workflows**
2. Clique em **Import from File**
3. Selecione: `fluxos-n8n/Disparador_Instacar_Escalonado_Supabase.json`
4. Clique em **Import**

## ⚙️ Passo 2: Configurar Variáveis no Nó Set

### 2.1 Abrir Nó de Configuração

1. No workflow importado, encontre o nó **"Set Variables - CONFIGURAR AQUI"**
2. Clique para abrir e editar

### 2.2 Configurar Cada Variável

Edite cada campo abaixo com seus valores reais:

#### SUPABASE_URL

```
Valor: https://[seu-project-id].supabase.co
```

**Exemplo**: `https://abcdefghijklmnop.supabase.co`

**Como encontrar**:

- Dashboard Supabase > Settings > API > Project URL

#### SUPABASE_SERVICE_KEY

```
Valor: [sua-service-role-key]
```

**⚠️ MANTENHA SECRETO** - Esta chave tem acesso total ao banco!

**Como encontrar**:

- Dashboard Supabase > Settings > API > service_role key
- Copie a chave completa (começa com `eyJ...`)

#### SUPABASE_URL

```
Valor: https://[seu-project-id].supabase.co
```

**Exemplo**: `https://abcdefghijklmnop.supabase.co`

**Como encontrar**: 
- Dashboard Supabase > Settings > API > Project URL

#### SUPABASE_SERVICE_KEY

```
Valor: [sua-service-role-key]
```

**⚠️ MANTENHA SECRETO** - Esta chave tem acesso total ao banco!

**Como encontrar**:
- Dashboard Supabase > Settings > API > service_role key
- Copie a chave completa (começa com `eyJ...`)

**Nota**: Necessário para os nós HTTP Request que fazem upsert.

#### UAZAPI_BASE_URL

```
Valor: https://[subdomain].uazapi.com
```

**Exemplo**: `https://fourtakeoff.uazapi.com`

**Como encontrar**:

- Dashboard Uazapi > Sua instância > URL base

#### UAZAPI_TOKEN

```
Valor: [token-da-instancia]
```

**⚠️ MANTENHA SECRETO**

**Como encontrar**:

- Dashboard Uazapi > Instâncias > [Sua Instância] > Token

#### SHEET_IDS

```
Valor: ["id1","id2","id3","id4","id5","id6","id7","id8","id9"]
```

**Formato**: Array JSON com IDs das 9 planilhas

**Exemplo**:

```json
[
  "1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g",
  "abc123def456",
  "xyz789ghi012",
  "...",
  "...",
  "...",
  "...",
  "...",
  "..."
]
```

**Como encontrar IDs**:

- Abra cada planilha no Google Sheets
- Na URL: `https://docs.google.com/spreadsheets/d/[ID_AQUI]/edit`
- Copie o ID (parte entre `/d/` e `/edit`)

**⚠️ IMPORTANTE**:

- Use formato JSON válido (aspas duplas)
- Separe IDs por vírgula
- Não deixe espaços extras

#### SHEET_PAGE_NAME

```
Valor: Sheet1
```

Nome da aba dentro de cada planilha. Geralmente `Sheet1` ou o nome da aba.

#### OPENAI_MODEL

```
Valor: gpt-4
```

Ou `gpt-3.5-turbo` se preferir.

#### LIMITE_ENVIOS_DIA

```
Valor: 200
```

Máximo de envios por dia (após warm-up).

#### LIMITE_ENVIOS_WARMUP

```
Valor: 50
```

Envios durante warm-up period (primeiros 7 dias).

#### INTERVALO_BASE

```
Valor: 130
```

Intervalo base em segundos entre envios.

#### INTERVALO_VARIACAO

```
Valor: 20
```

Variação randomizada em segundos (intervalo final: 130-150s).

### 2.3 Verificar Configuração

Após preencher, verifique:

- ✅ Nenhum placeholder restante (ex: `SEU-PROJECT-ID`)
- ✅ URLs estão corretas (sem espaços)
- ✅ SHEET_IDS está em formato JSON válido
- ✅ Todos os valores estão preenchidos

## 🔐 Passo 3: Configurar Credenciais

### 3.1 Google Sheets

1. Vá em **Credentials** (menu lateral)
2. **Add Credential** > **Google Sheets OAuth2 API**
3. Siga autenticação do Google
4. Nome: "Google Sheets - Instacar"
5. **Configure no nó "Read Google Sheets"**:
   - Abra o nó
   - Selecione a credencial criada

### 3.2 Supabase

1. Vá em **Credentials**
2. **Add Credential** > **Supabase API**
3. Preencha:
   - **Host**: `https://[seu-project-id].supabase.co`
   - **Service Role Secret**: Sua Service Role Key
4. Nome: "Supabase account"
5. **Configure nos 3 nós Supabase nativos**:
   - Supabase - Verificar Cliente
   - Supabase - Registrar Histórico
   - Supabase - Verificar Limite Diário

**Nota**: Os nós "Supabase - Upsert Cliente" e "Supabase - Atualizar Controle" usam HTTP Request (não precisam de credencial, usam variáveis).

📖 **Guias detalhados**: 
- [docs/n8n/configuracao-supabase-nativo.md](configuracao-supabase-nativo.md)
- [docs/n8n/configuracao-supabase-upsert.md](configuracao-supabase-upsert.md)

### 3.3 OpenAI

1. Vá em **Credentials**
2. **Add Credential** > **OpenAI API**
3. Cole sua API Key
4. Nome: "OpenAI - Instacar"
5. **Configure no nó "OpenAI Chat Model"**:
   - Abra o nó
   - Selecione a credencial criada

## 🧪 Passo 4: Testar Configuração

### 4.1 Teste Manual

1. Clique em **Execute Workflow**
2. Observe execução passo a passo
3. Verifique logs de cada nó

### 4.2 Verificar Erros Comuns

**Erro: "Variable not found"**

- Verifique se editou o nó "Set Variables - CONFIGURAR AQUI"
- Confirme que todos os valores estão preenchidos

**Erro: "Invalid JSON" em SHEET_IDS**

- Verifique formato: `["id1","id2",...]`
- Use aspas duplas, não simples
- Separe por vírgula

**Erro: "Cannot connect to Supabase"**

- Verifique credencial Supabase (Host e Service Role Secret)
- Confirme que credencial está configurada em todos os 5 nós Supabase

**Erro: "Authentication failed"**

- Verifique tokens (UAZAPI_TOKEN, Service Key)
- Confirme que estão corretos e ativos

## 🔒 Segurança no Self-Hosted Free

### ⚠️ Limitações

No N8N self-hosted free:

- Tokens ficam visíveis no workflow JSON
- Qualquer pessoa com acesso ao workflow vê os tokens

### ✅ Boas Práticas

1. **Restrinja acesso ao N8N**:

   - Use autenticação forte
   - Limite acesso apenas a pessoas autorizadas

2. **Não compartilhe workflow**:

   - Não exporte/importe workflow com tokens
   - Remova tokens antes de compartilhar

3. **Rotacione tokens regularmente**:

   - Mude tokens a cada 90 dias
   - Se suspeitar de comprometimento, rotacione imediatamente

4. **Use credenciais quando possível**:
   - Google Sheets: Use credencial OAuth2 ✅
   - OpenAI: Use credencial ✅
   - Supabase/Uazapi: Infelizmente precisa no nó Set ⚠️

## 📝 Checklist de Configuração

Antes de executar em produção:

- [ ] Credencial Supabase criada e configurada nos 3 nós nativos
- [ ] SUPABASE_URL configurado (para upserts via HTTP Request)
- [ ] SUPABASE_SERVICE_KEY configurado (para upserts via HTTP Request)
- [ ] UAZAPI_BASE_URL configurado
- [ ] UAZAPI_TOKEN configurado
- [ ] SHEET_IDS configurado (JSON válido com 9 IDs)
- [ ] SHEET_PAGE_NAME configurado
- [ ] Credencial Google Sheets criada e configurada
- [ ] Credencial OpenAI criada e configurada
- [ ] Teste manual executado com sucesso
- [ ] Nenhum erro nos logs

## 🆘 Troubleshooting

### Workflow não executa

1. Verifique se editou o nó "Set Variables - CONFIGURAR AQUI"
2. Confirme que não há placeholders
3. Verifique logs do N8N

### Erro ao ler planilhas (404 Not Found)

**Causa mais comum**: Usando `gid` (ID da aba) em vez do Document ID.

**Solução**:
1. Verifique se está usando **Document ID** (entre `/d/` e `/edit` na URL)
2. **NÃO use** o `gid` da URL
3. Verifique credencial Google Sheets
4. Confirme nome da aba em `SHEET_PAGE_NAME` está correto
5. Verifique permissões da conta Google

📖 **Guia**: [docs/n8n/como-obter-id-google-sheets.md](como-obter-id-google-sheets.md)

### Erro no Supabase

1. Verifique credencial Supabase (Host e Service Role Secret)
2. Confirme que credencial está configurada em todos os 5 nós Supabase
3. Verifique que tabelas foram criadas (execute schema.sql)
4. Confirme políticas RLS (execute policies.sql)

## 📚 Próximos Passos

Após configurar:

1. ✅ Teste com pequeno lote (5-10 envios)
2. ✅ Valide duplicatas
3. ✅ Confirme histórico no Supabase
4. ✅ Inicie warm-up period (50/dia)

---

**Última atualização**: 2025-01-24  
**Versão**: 2.0 (Self-Hosted Free)
