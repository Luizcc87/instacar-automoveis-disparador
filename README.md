# Instacar Automóveis - Sistema de Disparo Escalonado WhatsApp

Sistema automatizado de disparo de mensagens via WhatsApp (Uazapi) com controle de duplicatas, escalonamento inteligente e geração de mensagens personalizadas com IA.

## 📋 Sobre o Projeto

Este projeto implementa um sistema completo de disparo escalonado de mensagens via WhatsApp para a Instacar Automóveis, processando múltiplas planilhas do Google Sheets, validando duplicatas no Supabase, verificando números WhatsApp e gerando mensagens personalizadas com OpenAI.

### Funcionalidades Principais

- ✅ **Processamento de Múltiplas Planilhas**: Processa 9 planilhas Excel/Google Sheets
- ✅ **Prevenção de Duplicatas**: Verificação inteligente por telefone no Supabase
- ✅ **Validação WhatsApp**: Verifica se número tem WhatsApp antes de enviar
- ✅ **Geração com IA**: Mensagens personalizadas usando OpenAI GPT-4
- ✅ **Escalonamento Inteligente**: 200 envios/dia com intervalos randomizados
- ✅ **Histórico Completo**: Registro de todos os envios no Supabase
- ✅ **Nós Nativos Supabase**: Usa nós nativos do N8N (não HTTP Request)
- ✅ **Tratamento de Erros**: Retry, fallbacks e dead letter queue
- ✅ **Warm-up Period**: 50 envios/dia nos primeiros 7 dias
- ✅ **Preservação de Dados**: Nós intermediários garantem que dados da planilha sejam preservados
- ✅ **Tratamento de Múltiplos Matches**: Detecta e trata casos de múltiplos registros no Supabase
- ✅ **Clientes Sem WhatsApp**: Registra corretamente números sem WhatsApp sem interromper o fluxo
- ✅ **Sistema de Campanhas**: Múltiplas campanhas ao longo do ano com agendamento automático
- ✅ **Interface Web de Gerenciamento**: Modal completo para visualizar, editar e gerenciar clientes

## 🎯 Sistema de Campanhas (NOVO)

O sistema agora suporta **múltiplas campanhas de marketing** ao longo do ano:

- ✅ **Múltiplas campanhas** com configuração independente
- ✅ **Templates por época** (janeiro, fevereiro, black-friday, etc.)
- ✅ **Agendamento automático** via cron expressions
- ✅ **Reenvio controlado** com intervalo mínimo entre campanhas
- ✅ **Interface web** para gerenciar campanhas
- ✅ **Métricas por campanha** para análise de performance
- ✅ **Agente IA com dados opcionais**: Controle quais dados incluir (veículos, vendedor)
- ✅ **Processamento em lotes**: Divide campanhas grandes em lotes menores (padrão: 50 clientes/execução)
- ✅ **Horário configurável**: Define faixa de horário por campanha (padrão: 9h-18h)
- ✅ **Distribuição automática**: Divide automaticamente ao longo de múltiplos dias
- ✅ **Pausa inteligente**: Pausa automaticamente ao sair do horário configurado

📖 **Documentação completa**: [docs/campanhas/README.md](docs/campanhas/README.md)

## 👥 Interface Web de Gerenciamento de Clientes

A interface web (`interface-web/`) oferece um modal completo para gerenciar clientes:

### Funcionalidades do Modal de Clientes

- **📋 Visualização Completa**: Dados do cliente, estatísticas de envios, veículos e histórico
- **✏️ Edição de Dados**: Editar nome, telefone, email e veículos
- **📤 Upload de Planilhas**: Upload de planilhas XLSX/CSV com prévia e confirmação antes do processamento
  - Agrupamento automático de clientes por telefone
  - Merge inteligente de veículos múltiplos
  - Detecção automática de colunas
  - Validação e normalização de dados

📖 **Changelog completo do sistema de upload**: [docs/interface-web/CHANGELOG-upload-planilhas.md](docs/interface-web/CHANGELOG-upload-planilhas.md)

- **📝 Observações Internas**: Adicionar e visualizar histórico de observações com timestamps
- **📨 Histórico de Envios**: Ver todas as mensagens enviadas com filtros por data e status
- **🚫 Soft Delete**: Desativar clientes sem excluir dados (campo `ativo`)
- **🗑️ Exclusão Permanente**: Excluir cliente com confirmações de segurança
- **➕ Criação de Clientes**: Adicionar novos clientes manualmente

### Campos Adicionais na Tabela

A tabela `instacar_clientes_envios` foi expandida com:

- **`ativo`** (BOOLEAN): Soft delete - clientes desativados não aparecem nas listagens
- **`observacoes_internas`** (JSONB): Histórico de observações com estrutura:
  ```json
  [
    {
      "id": "uuid",
      "texto": "Observação...",
      "autor": "Sistema",
      "timestamp": "2025-12-18T10:30:00Z"
    }
  ]
  ```

📖 **Para aplicar as expansões**: Execute `docs/supabase/schema-clientes-expansao.sql` no Supabase

## 🏗️ Arquitetura

```
Google Sheets (9 planilhas)
    ↓
N8N Workflow
    ↓
├─→ Supabase (Validação Duplicatas)
├─→ Uazapi (Verificação WhatsApp)
├─→ OpenAI (Geração Mensagem)
├─→ Uazapi (Envio Mensagem)
└─→ Supabase (Registro Histórico)
```

### Componentes

1. **N8N Workflow**: Orquestração completa do processo
2. **Supabase**: Banco de dados PostgreSQL (clientes, histórico, controle)
3. **Uazapi**: API WhatsApp para verificação e envio
4. **OpenAI**: Geração de mensagens personalizadas
5. **Google Sheets**: Fonte de dados dos clientes

## 🚀 Instalação

### Pré-requisitos

- Conta N8N (self-hosted ou cloud)
- Projeto Supabase criado
- Conta Uazapi com instância configurada
- Conta OpenAI com API key
- Google Sheets com dados dos clientes

### Passo 1: Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os scripts SQL na ordem:
   - `docs/supabase/schema.sql`
   - `docs/supabase/indexes.sql`
   - `docs/supabase/policies.sql`
3. Anote a URL e Service Role Key

📖 **Documentação completa**: [docs/supabase/README.md](docs/supabase/README.md)

### Passo 2: Executar Expansões do Schema (Opcional)

Se você deseja usar a interface web de gerenciamento de clientes:

1. Execute `docs/supabase/schema-clientes-expansao.sql` no Supabase
2. Isso adiciona os campos `ativo` e `observacoes_internas` à tabela de clientes

### Passo 3: Configurar N8N

1. Importe o fluxo: `fluxos-n8n/Disparador_Instacar_Escalonado_Supabase.json`
2. Configure as variáveis:
   - **N8N Cloud/Self-Hosted Pro**: Use Environment Variables (veja `.env.example`)
   - **N8N Self-Hosted Free**: Configure diretamente no nó "Set Variables - CONFIGURAR AQUI"
3. Configure credenciais:
   - Google Sheets OAuth2
   - OpenAI (API Key)

📖 **Guia passo a passo**:

- [Configuração geral](docs/n8n/configuracao.md)
- [N8N Self-Hosted Free (sem Environment Variables)](docs/n8n/configuracao-self-hosted-free.md)

### Passo 4: Configurar Planilhas

1. Certifique-se de que as planilhas têm as colunas:

   - Cliente
   - Celular / Residencial
   - E-mail
   - Dt Venda
   - Veículo
   - Placa
   - Vendedor

2. As colunas `Status Envio` e `Data Envio` serão criadas automaticamente

## ⚙️ Configuração

### Variáveis de Configuração

#### Para N8N Cloud ou Self-Hosted Pro (com Environment Variables)

Configure no N8N Settings > Environment Variables:

```bash
# Supabase
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]

# Uazapi
UAZAPI_BASE_URL=https://[subdomain].uazapi.com
UAZAPI_TOKEN=[token-instancia]

# OpenAI
OPENAI_API_KEY=[api-key]

# Google Sheets (IDs das planilhas)
SHEET_ID_1=[id-planilha-1]
SHEET_ID_2=[id-planilha-2]
# ... até SHEET_ID_9
```

#### Para N8N Self-Hosted Free (sem Environment Variables)

Configure diretamente no nó **"Set Variables - CONFIGURAR AQUI"** do workflow:

- Abra o nó após importar o workflow
- Edite cada variável com seus valores reais
- ⚠️ Substitua todos os placeholders (ex: `SEU-PROJECT-ID`)

📖 **Guia detalhado**: [docs/n8n/configuracao-self-hosted-free.md](docs/n8n/configuracao-self-hosted-free.md)

📋 **Template completo**: [.env.example](.env.example)

### Limites e Parâmetros

- **Limite diário**: 200 envios/dia (após warm-up)
- **Warm-up**: 50 envios/dia (primeiros 7 dias)
- **Intervalo**: 130-150 segundos entre envios (randomizado)
- **Horário**: 9h-18h, apenas dias úteis
- **Batch Size**: Recomendado `1` (processa item por item, mais confiável)

## 📊 Estrutura do Projeto

```
instacar-automoveis-disparador/
├── docs/
│   ├── planilhas-vendas-instacar/    # Planilhas Excel de origem
│   ├── supabase/                     # Scripts SQL e documentação
│   │   ├── schema.sql
│   │   ├── indexes.sql
│   │   ├── policies.sql
│   │   └── README.md
│   ├── uazapi/                       # Documentação API Uazapi
│   ├── n8n/                          # Guias de configuração N8N
│   │   ├── configuracao.md
│   │   └── troubleshooting.md
│   └── seguranca/                    # Documentação de segurança
│       ├── rotacao-tokens.md
│       └── checklist.md
├── fluxos-n8n/
│   └── Disparador_Instacar_Escalonado_Supabase.json
├── .env.example                      # Template de variáveis
├── .gitignore                        # Arquivos ignorados
└── README.md                          # Este arquivo
```

## 🔄 Fluxo de Processamento

1. **Trigger**: Manual ou agendado (dias úteis, 9h-18h)
2. **Leitura**: Processa 9 planilhas sequencialmente
3. **Normalização**: Telefones formatados para `55XXXXXXXXXXX`
4. **Filtro**: Remove itens sem telefone válido
5. **Split in Batches**: Processa em lotes (recomendado: `batchSize: 1`)
6. **Preservar Dados Planilha**: Garante que dados da planilha sejam preservados
7. **Validação Duplicatas**: Consulta Supabase por telefone (limite: 1 registro)
8. **Combinar Dados**: Combina resposta Supabase + dados da planilha
9. **Processar Cliente**: Verifica se cliente existe e prepara dados
10. **Verificação Mensagem**: Verifica se cliente já recebeu mensagem
    - Se já recebeu → Registra sem enviar
    - Se não recebeu → Continua fluxo
11. **Verificação WhatsApp**: API Uazapi `/chat/check`
    - Se tem WhatsApp → Gera mensagem com IA
    - Se não tem → Registra com `status_whatsapp: invalid`
12. **Geração Mensagem**: OpenAI GPT-4 com contexto do cliente
13. **Envio**: Uazapi `/send/text` com intervalo randomizado
14. **Registro**: Histórico no Supabase e atualização do cliente
15. **Controle**: Verifica limite diário (200 envios) e continua loop

## 🔐 Segurança

### ⚠️ IMPORTANTE: Tokens Expostos

Se você encontrou tokens expostos no código:

1. **ROTACIONAR IMEDIATAMENTE** todos os tokens
2. Verificar guia: [docs/seguranca/rotacao-tokens.md](docs/seguranca/rotacao-tokens.md)
3. Usar apenas variáveis de ambiente no N8N

### Checklist de Segurança

- ✅ Variáveis de ambiente configuradas
- ✅ Service Role Key do Supabase protegida
- ✅ Tokens rotacionados
- ✅ RLS (Row Level Security) ativado
- ✅ `.gitignore` configurado

📋 **Checklist completo**: [docs/seguranca/checklist.md](docs/seguranca/checklist.md)

## 📈 Monitoramento

### Métricas no Supabase

Consulte a tabela `instacar_controle_envios` para métricas diárias:

- Total enviado
- Total erros
- Total duplicados
- Total sem WhatsApp

### Histórico Completo

Tabela `instacar_historico_envios` registra:

- Mensagem enviada
- Status do envio
- Veículo de referência
- Planilha de origem
- Timestamp

### Erros Críticos

Tabela `instacar_erros_criticos` (Dead Letter Queue):

- Tipo de erro
- Mensagem de erro
- Contexto completo
- Status de processamento

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro ao conectar Supabase**

   - Verifique URL e Service Key
   - Confirme que RLS está configurado

2. **Mensagens não sendo enviadas**

   - Verifique limite diário (200/dia)
   - Confirme horário comercial (9h-18h)
   - Verifique se é dia útil

3. **Duplicatas sendo enviadas**

   - Verifique se Supabase está sendo consultado
   - Confirme que `total_envios > 0` está sendo verificado

4. **Erro na geração de mensagem IA**

   - Verifique API Key do OpenAI
   - Confirme modelo (gpt-4 ou gpt-3.5-turbo)
   - Sistema usa fallback para template genérico

5. **"dadosPlanilha não está disponível"**

   - ✅ **Resolvido**: Nó "Preservar Dados Planilha" garante preservação dos dados
   - ✅ **Resolvido**: Nó "Combinar Dados Supabase Planilha" combina dados corretamente
   - Se persistir, verifique se o nó "Split in Batches" está processando corretamente

6. **"Split in Batches não processa todos os dados"**

   - ✅ **Resolvido**: Use `batchSize: 1` para máxima confiabilidade
   - Verifique se o loop de retorno está conectado corretamente
   - Confirme que "Wait - Intervalo Randomizado" retorna para "Split in Batches"

7. **"Multiple matches" no Supabase**

   - ✅ **Resolvido**: Nó Supabase configurado com `limit: 1`
   - ✅ **Resolvido**: Código trata múltiplos matches usando o primeiro

8. **"null value in column telefone"**

   - ✅ **Resolvido**: Validação garante que telefone sempre tenha valor
   - ✅ **Resolvido**: Mapeamento explícito de campos no nó Supabase

9. **"invalid input syntax for type date: undefined"**

   - ✅ **Resolvido**: Nó "Preparar Data Hoje" calcula data corretamente
   - ✅ **Resolvido**: Filtro do Supabase usa `$json.dataHoje` em vez de `$now`

10. **"duplicate key value violates unique constraint"**
    - ✅ **Resolvido**: Lógica de upsert usando `clienteExiste` para decidir entre PATCH/POST
    - ✅ **Resolvido**: Nó "IF Cliente Existe" separa caminhos de atualização e inserção

📖 **Guia completo**: [docs/n8n/troubleshooting.md](docs/n8n/troubleshooting.md)

## 📚 Documentação Adicional

### Documentação Base

- [Configuração Supabase](docs/supabase/README.md)
- [Configuração N8N](docs/n8n/configuracao.md)
- [Troubleshooting](docs/n8n/troubleshooting.md)
- [Rotação de Tokens](docs/seguranca/rotacao-tokens.md)
- [Checklist de Segurança](docs/seguranca/checklist.md)
- [Documentação Uazapi](docs/uazapi/)
- [Recursos Úteis do OpenAI Cookbook](docs/openai/openai-cookbook-recursos-uteis.md)

### Sistema de Campanhas (NOVO)

- [README do Sistema de Campanhas](docs/campanhas/README.md)
- [Guia de Criação de Campanhas](docs/campanhas/guia-criacao-campanhas.md)
- [Guia de Agente IA com Dados Opcionais](docs/campanhas/guia-agente-ia-opcoes.md)
- [Guia de Agendamento Cron](docs/campanhas/guia-agendamento-cron.md)
- [Templates por Época](docs/campanhas/templates-epoca.json)

### Deploy

- [Guia de Deploy](docs/deploy/README.md)
- [Deploy no Cloudflare Pages](docs/deploy/cloudflare-pages.md) ⭐ (Gratuito, recomendado)

### Interface Web - Execução Local

Para testar a interface web localmente:

```bash
# Opção 1: Script batch (Windows)
cd interface-web
.\start-dev.bat

# Opção 2: Python
cd interface-web
python -m http.server 8000

# Opção 3: Node.js http-server
cd interface-web
http-server -p 8000
```

Acesse: http://localhost:8000

📖 **Guia completo**: [interface-web/README.md](interface-web/README.md)

## 🧪 Testes

### Fase 1: Testes Iniciais (Semana 1)

- Teste com 5-10 envios
- Validar duplicatas
- Confirmar histórico no Supabase
- Testar tratamento de erros

### Fase 2: Warm-up Period (Semanas 2-3)

- 50 envios/dia por 7 dias úteis
- Monitorar taxa de bloqueio (< 5%)
- Ajustar intervalos se necessário

### Fase 3: Produção (Semana 4+)

- Escalar para 200 envios/dia
- Monitoramento contínuo
- Otimizações baseadas em dados

## 🤝 Contribuindo

Este é um projeto interno da Instacar Automóveis. Para sugestões ou problemas:

1. Documente o problema
2. Inclua logs relevantes
3. Descreva passos para reproduzir

## 📝 Licença

Projeto interno - Instacar Automóveis

## 📞 Suporte

Para dúvidas ou problemas:

- Consulte a documentação em `docs/`
- Verifique logs no Supabase
- Analise erros em `instacar_erros_criticos`

## 🚀 Otimizações Futuras

### Usar `status_whatsapp` como Cache

O campo `status_whatsapp` pode ser utilizado para evitar chamadas desnecessárias à API Uazapi. Números já verificados não precisariam ser verificados novamente, economizando tempo e recursos.

📖 **Documentação completa:** [docs/otimizacao-status-whatsapp-cache.md](docs/otimizacao-status-whatsapp-cache.md)

**Benefícios esperados:**

- Redução de 70%+ nas chamadas à API
- Processamento mais rápido
- Economia de custos

## 🔧 Melhorias e Correções Recentes

### Versão 2.1 (2025-12-14)

#### Correções Aplicadas

1. **Preservação de Dados da Planilha**

   - ✅ Novo nó "Preservar Dados Planilha" garante que dados sejam preservados
   - ✅ Novo nó "Combinar Dados Supabase Planilha" combina dados corretamente
   - ✅ Resolve erro "dadosPlanilha não está disponível"

2. **Upsert de Clientes**

   - ✅ Lógica condicional baseada em `clienteExiste`
   - ✅ Nó "IF Cliente Existe" separa caminhos PATCH (atualizar) e POST (inserir)
   - ✅ Resolve erro "duplicate key value violates unique constraint"

3. **Registro de Histórico**

   - ✅ Mapeamento explícito de campos no nó Supabase
   - ✅ Validação de telefone obrigatório
   - ✅ Resolve erro "null value in column telefone"

4. **Verificação de Limite Diário**

   - ✅ Nó "Preparar Data Hoje" calcula data corretamente
   - ✅ Resolve erro "invalid input syntax for type date: undefined"

5. **Tratamento de Clientes Sem WhatsApp**

   - ✅ Novo nó "Cliente Já Recebeu Mensagem" para clientes que já receberam
   - ✅ Novo nó "Preparar Dados Cliente Sem WhatsApp" para números sem WhatsApp
   - ✅ Fluxo não para mais quando cliente não tem WhatsApp

6. **Split in Batches**

   - ✅ Configuração recomendada: `batchSize: 1` para máxima confiabilidade
   - ✅ Loop de retorno corrigido para processar todos os itens

7. **Tratamento de Múltiplos Matches**
   - ✅ Supabase configurado com `limit: 1`
   - ✅ Código trata casos de múltiplos matches usando o primeiro

#### Nós Adicionados

- **Preservar Dados Planilha**: Preserva dados antes da consulta ao Supabase
- **Combinar Dados Supabase Planilha**: Combina resposta Supabase + dados planilha
- **Cliente Já Recebeu Mensagem**: Trata clientes que já receberam mensagem
- **Preparar Dados Cliente Sem WhatsApp**: Trata números sem WhatsApp
- **Preparar Data Hoje**: Calcula data de hoje para filtros do Supabase
- **IF Cliente Existe**: Decisão condicional para upsert de clientes
- **Supabase - Inserir Cliente Novo**: Insere novos clientes (caminho false do IF)

---

**Última atualização**: 2025-12-14  
**Versão**: 2.1 (Correções e Melhorias)
