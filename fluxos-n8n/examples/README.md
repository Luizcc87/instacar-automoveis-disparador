# Workflows N8N - Arquivos de Exemplo

Este diretório contém versões sanitizadas dos workflows de produção, sem credenciais ou informações sensíveis, criadas para serem commitadas no GitHub como referência.

## Arquivos Disponíveis

- **`Disparador_Web_Campanhas_Instacar.example.json`** - Workflow principal de campanhas (versão sanitizada)

## ⚠️ Importante

**Este arquivo NÃO contém credenciais reais.** Antes de usar em produção, você precisa configurar todas as credenciais e variáveis de ambiente.

## Como Usar Este Arquivo

### 1. Importar no N8N

1. Abra o N8N
2. Vá em **Workflows** > **Import from File**
3. Selecione o arquivo `fluxos-n8n/examples/Disparador_Web_Campanhas_Instacar.example.json`
4. O workflow será importado, mas **não funcionará** até configurar as credenciais

### 2. Configurar Credenciais

#### 2.1. Variáveis de Ambiente (Recomendado - N8N Cloud/Pro)

Configure as seguintes variáveis de ambiente no N8N:

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_KEY
UAZAPI_BASE_URL=https://YOUR_SUBDOMAIN.uazapi.com
UAZAPI_TOKEN=YOUR_UAZAPI_TOKEN
OPENAI_MODEL=gpt-4.1
SHEET_PAGE_NAME=Listagem de Clientes por Vended
SHEET_IDS=["YOUR_GOOGLE_SHEET_ID_1","YOUR_GOOGLE_SHEET_ID_2",...]
```

**Onde configurar:**
- N8N Cloud: Settings > Environment Variables
- N8N Self-Hosted: Arquivo `.env` ou variáveis de ambiente do sistema

#### 2.2. Configuração Manual (N8N Self-Hosted Free)

Se você não tem acesso a variáveis de ambiente, edite o nó **"Set Variables - CONFIGURAR AQUI"** e substitua os placeholders:

- `YOUR_PROJECT_ID.supabase.co` → Seu projeto Supabase
- `YOUR_SUPABASE_SERVICE_KEY` → Sua Service Role Key do Supabase
- `YOUR_SUBDOMAIN.uazapi.com` → Seu subdomínio Uazapi
- `YOUR_UAZAPI_TOKEN` → Seu token Uazapi
- `YOUR_GOOGLE_SHEET_ID_1`, etc. → IDs das suas planilhas Google Sheets

### 3. Configurar Credenciais do N8N

Você precisa criar e configurar as seguintes credenciais no N8N:

#### 3.1. Supabase

1. Vá em **Credentials** > **Add Credential**
2. Selecione **Supabase**
3. Configure:
   - **Host**: `https://YOUR_PROJECT_ID.supabase.co`
   - **Service Role Secret**: Sua Service Role Key do Supabase

#### 3.2. OpenAI

1. Vá em **Credentials** > **Add Credential**
2. Selecione **OpenAI**
3. Configure:
   - **API Key**: Sua chave da OpenAI

#### 3.3. Google Sheets

1. Vá em **Credentials** > **Add Credential**
2. Selecione **Google Sheets OAuth2**
3. Siga o processo de autenticação OAuth2 do Google

### 4. Atualizar Referências de Credenciais

Após criar as credenciais, você precisa atualizar os nós que as referenciam:

1. Abra cada nó que usa credenciais (Supabase, OpenAI, Google Sheets)
2. Selecione a credencial criada no campo **Credential to connect with**
3. Salve o workflow

### 5. Verificar Configurações

Antes de executar, verifique:

- ✅ Todas as variáveis de ambiente configuradas OU nó "Set Variables" atualizado
- ✅ Credenciais do Supabase criadas e vinculadas aos nós
- ✅ Credenciais do OpenAI criadas e vinculadas aos nós
- ✅ Credenciais do Google Sheets criadas e vinculadas aos nós
- ✅ IDs das planilhas Google Sheets corretos
- ✅ Banco de dados Supabase configurado (execute os scripts SQL em `docs/supabase/`)

## Estrutura do Workflow

Este workflow implementa o sistema de disparo de mensagens via WhatsApp para campanhas, com:

- **Triggers**: Webhook, Manual, Schedule (Cron)
- **Processamento**: Leitura de planilhas, normalização de telefones, prevenção de duplicatas
- **IA**: Geração de mensagens personalizadas com GPT-4
- **Envio**: Integração com Uazapi/Zapi/Evolution API
- **Auditoria**: Registro completo no Supabase

## Documentação Completa

Para mais detalhes sobre:
- Configuração do banco de dados: `docs/supabase/`
- Configuração do N8N: `docs/n8n/`
- Guia de campanhas: `docs/campanhas/`
- Troubleshooting: `docs/n8n/troubleshooting.md`

## Segurança

**NUNCA faça commit do arquivo original com credenciais!**

- ✅ Os arquivos originais em `fluxos-n8n/*.json` estão no `.gitignore` e **não serão versionados**
- ✅ Apenas os arquivos sanitizados em `fluxos-n8n/examples/` são versionados
- ✅ Mantenha os arquivos originais com credenciais apenas localmente
- ✅ Use variáveis de ambiente sempre que possível
- ✅ O diretório `examples/` está configurado no `.gitignore` para ser versionado (exceção)

## Placeholders no Arquivo

Os seguintes placeholders foram substituídos no arquivo de exemplo:

- `YOUR_PROJECT_ID` → ID do seu projeto Supabase
- `YOUR_SUPABASE_SERVICE_KEY` → Service Role Key do Supabase
- `YOUR_SUBDOMAIN` → Subdomínio da sua instância Uazapi
- `YOUR_UAZAPI_TOKEN` → Token de autenticação Uazapi
- `YOUR_GOOGLE_SHEET_ID_1` até `_9` → IDs das planilhas Google Sheets
- `YOUR_CREDENTIAL_ID` → IDs das credenciais do N8N (serão gerados automaticamente)
- `YOUR_INSTANCE_ID` → ID da instância do N8N (será gerado automaticamente)

## Suporte

Para dúvidas ou problemas, consulte a documentação completa em `docs/` ou abra uma issue no repositório.

