# CLAUDE.md

Este arquivo fornece orientações para o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## Visão Geral do Projeto

Este é um sistema automatizado de disparo de mensagens via WhatsApp para a Instacar Automóveis que processa dados de clientes de múltiplas planilhas do Google Sheets, previne duplicatas e envia mensagens personalizadas com geração de conteúdo por IA.

**Stack Tecnológico:**

- **N8N**: Motor de orquestração de workflows
- **Supabase**: Banco de dados PostgreSQL (prevenção de duplicatas, auditoria, métricas diárias)
- **Uazapi**: Integração com API do WhatsApp
- **OpenAI GPT-4**: Geração de mensagens personalizadas
- **Google Sheets**: Fonte de dados dos clientes (9 planilhas)

**Versão Atual:** 2.4 (Dezembro 2025 - sistema de dados dinâmicos para agente IA com configurações globais, sessões de contexto e templates de prompt)

## Arquitetura

### Fluxo Principal do Workflow

**Workflow Principal (Campanhas):** [Disparador_Web_Campanhas_Instacar.json](fluxos-n8n/Disparador_Web_Campanhas_Instacar.json)

Processa campanhas através deste pipeline:

```
Trigger Manual → Buscar Campanha do Supabase
    → Buscar Configurações Empresa (dados dinâmicos)
    → Buscar Sessões Contexto (dados dinâmicos)
    → Verificar/Buscar Template Prompt (dados dinâmicos)
    → Preparar Dados IA Campanha (monta contexto dinâmico)
    → Ler Google Sheets (planilhas da campanha)
    → Normalizar Telefones (55XXXXXXXXXXX)
    → Filtrar Inválidos → Split in Batches (tamanho: 1)
    → Preservar Dados Planilha
    → Consulta Supabase (verificação de duplicata)
    → Combinar Dados (mescla dados Supabase + Planilha)
    → Verificar se já enviou mensagem
    → Uazapi /chat/check (validar WhatsApp)
    → OpenAI GPT-4 (gerar mensagem com contexto dinâmico)
    → Uazapi /send/text (enviar mensagem)
    → Aguardar intervalo configurado
    → Supabase Insert/Update (registrar histórico)
    → Verificar limite diário
    → Retornar ao próximo cliente
```

**Workflow Legado:** [Disparador_Instacar_Escalonado_Supabase.json](fluxos-n8n/Disparador_Instacar_Escalonado_Supabase.json) - Workflow original sem suporte a campanhas e dados dinâmicos.

### Schema do Banco de Dados

**Tabelas principais no Supabase:**

**Tabelas de Clientes e Envios** (schema: [docs/supabase/schema.sql](docs/supabase/schema.sql)):

1. **`instacar_clientes_envios`** - Registros de clientes e controle de envios
   - Restrição única em `telefone` (número de telefone)
   - Rastreia `total_envios` (contagem de mensagens), `status_whatsapp`, `primeiro_envio`, `ultimo_envio`
   - Armazena `veiculos` como array JSONB
   - Campo `ativo` (BOOLEAN) para soft delete - clientes desativados não aparecem nas listagens
   - Campo `observacoes_internas` (JSONB) para histórico de observações internas sobre o cliente

2. **`instacar_historico_envios`** - Trilha de auditoria completa
   - Cada mensagem registrada com contexto completo
   - FK para `instacar_clientes_envios.id`
   - Armazena texto da mensagem, referência do veículo, status, planilha de origem

3. **`instacar_controle_envios`** - Métricas diárias e controle de limite
   - Chave primária: `data` (data)
   - Rastreia totais diários: enviados, erros, duplicados, sem WhatsApp
   - Usado para impor limite de 200/dia

4. **`instacar_erros_criticos`** - Dead Letter Queue (fila de erros)
   - Captura erros críticos para análise
   - Categorização por tipo: 'uazapi', 'openai', 'supabase', 'sheets'
   - Suporta reprocessamento com flag `reprocessado`

**Tabelas de Dados Dinâmicos para Agente IA** (schema: [docs/supabase/schema-dados-dinamicos-ia.sql](docs/supabase/schema-dados-dinamicos-ia.sql)):

5. **`instacar_configuracoes_empresa`** - Configurações globais da empresa
   - Armazena políticas, tom de voz, informações institucionais
   - Organizado por categorias (politicas, tom_voz, contato, sobre_empresa, ofertas, produtos)
   - Suporta variáveis dinâmicas ({{nome_cliente}}, {{data_hoje}}, etc.)
   - Pode ser sobrescrito por campanha via `configuracoes_sobrescritas`

6. **`instacar_sessoes_contexto_ia`** - Sessões de contexto pré-definidas
   - Blocos de contexto reutilizáveis para o agente IA
   - Template de conteúdo com variáveis dinâmicas
   - Pode ser habilitado/desabilitado por campanha
   - Flag `habilitado_por_padrao` para ativação automática

7. **`instacar_templates_prompt`** - Templates completos de prompt
   - Templates prontos para diferentes tipos de campanha (natal, black-friday, relacionamento, etc.)
   - Prompt completo com estrutura otimizada para GPT-4/GPT-5
   - Define quais sessões e configurações são habilitadas por padrão

**Tabelas de Campanhas:**

8. **`instacar_campanhas`** - Configuração de campanhas
   - Vincula com `instacar_templates_prompt` via `template_prompt_id`
   - Array `sessoes_contexto_ids` (JSONB) para sessões habilitadas
   - Objeto `configuracoes_sobrescritas` (JSONB) para sobrescrever configurações globais

**Performance:** 12+ índices estratégicos incluindo índices compostos e parciais para padrões de consulta comuns.

### Estratégia de Limitação de Taxa

**Sistema de três camadas para evitar bloqueios do WhatsApp:**

1. **Período de warm-up (primeiros 7 dias):** máximo de 50 mensagens/dia
2. **Produção:** máximo de 200 mensagens/dia
3. **Intervalo entre mensagens:** 130-150 segundos (aleatorizado: base + random(0, variação))

**Janela de operação:** 9h-18h, apenas dias úteis (configurável no trigger)

### Prevenção de Duplicatas

Proteção em múltiplas camadas:

1. Normalização de telefone para formato `55XXXXXXXXXXX`
2. Restrição única em `instacar_clientes_envios.telefone`
3. Consulta Supabase antes de cada envio verifica se telefone existe
4. Verifica `total_envios > 0` para confirmar se mensagem já foi enviada
5. Se existe mas `total_envios = 0`, envia primeira mensagem

## Configurações Principais

### Variáveis de Ambiente do N8N

**Dois padrões de deployment:**

**Padrão A: N8N Self-Hosted Free (sem Variáveis de Ambiente)**

- Configurar diretamente no nó "Set Variables - CONFIGURAR AQUI"
- Todos os valores fixados no JSON do workflow
- Veja [docs/n8n/configuracao-self-hosted-free.md](docs/n8n/configuracao-self-hosted-free.md)

**Padrão B: N8N Cloud/Pro (com Variáveis de Ambiente)**

- Configurar em N8N Settings > Environment Variables
- Workflow referencia via `{{ $env.VARIABLE_NAME }}`
- Recomendado por segurança

**Variáveis obrigatórias:**

```bash
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]  # NÃO use a anon key!
UAZAPI_BASE_URL=https://[subdomain].uazapi.com
UAZAPI_TOKEN=[token]
SHEET_IDS=["id1","id2",...,"id9"]  # Array JSON com 9 IDs de planilhas
SHEET_PAGE_NAME=Listagem de Clientes por Vended
OPENAI_MODEL=gpt-4
LIMITE_ENVIOS_DIA=200
LIMITE_ENVIOS_WARMUP=50
INTERVALO_BASE=130
INTERVALO_VARIACAO=20
```

## Comandos Comuns

### Configuração do Banco de Dados

Execute na ordem no Editor SQL do Supabase:

```bash
# 1. Execute a verificação pré-execução (se outras tabelas existirem)
docs/supabase/verificacao-pre-execucao.sql

# 2. Crie o schema (escolha um baseado nos resultados da verificação)
docs/supabase/schema.sql              # Versão padrão
# OU
docs/supabase/schema-isolado.sql      # Se update_updated_at_column() já existir

# 3. Crie os índices para performance
docs/supabase/indexes.sql

# 4. Configure o Row Level Security
docs/supabase/policies.sql
```

### Importando o Workflow do N8N

1. Abra N8N > Workflows > Import from File
2. Selecione `fluxos-n8n/Disparador_Instacar_Escalonado_Supabase.json`
3. Configure as credenciais:
   - Google Sheets OAuth2
   - OpenAI API Key
   - Supabase (via Service Role Key nas variáveis)

### Queries de Monitoramento

```sql
-- Verificar métricas de envio de hoje
SELECT data, total_enviado, total_erros, total_duplicados, total_sem_whatsapp
FROM instacar_controle_envios
WHERE data = CURRENT_DATE;

-- Listar clientes que receberam mensagens
SELECT telefone, nome_cliente, total_envios, ultimo_envio
FROM instacar_clientes_envios
WHERE total_envios > 0
ORDER BY ultimo_envio DESC;

-- Verificar erros críticos
SELECT tipo_erro, mensagem_erro, telefone, created_at
FROM instacar_erros_criticos
WHERE status = 'pendente'
ORDER BY created_at DESC;

-- Taxa de sucesso de hoje
SELECT
  COUNT(*) FILTER (WHERE status_envio = 'enviado') * 100.0 / COUNT(*) as taxa_sucesso
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE;
```

### Fases de Teste

**Fase 1: Testes Iniciais (Semana 1)**

- Testar com 5-10 envios manualmente
- Validar que detecção de duplicatas funciona
- Confirmar histórico registrado no Supabase
- Testar tratamento de erros e fallbacks

**Fase 2: Período de Warm-up (Semanas 2-3)**

- Definir `LIMITE_ENVIOS_DIA=50` nos primeiros 7 dias úteis
- Monitorar taxa de bloqueio (deve ser < 5%)
- Ajustar intervalos se necessário

**Fase 3: Produção (Semana 4+)**

- Aumentar para `LIMITE_ENVIOS_DIA=200`
- Monitoramento contínuo via queries Supabase
- Analisar métricas em `instacar_controle_envios`

## Detalhes Críticos de Implementação

### Padrão de Preservação de Dados (CRÍTICO)

**Problema:** N8N pode perder contexto ao encadear nós (especialmente após consultas ao Supabase).

**Solução:** Padrão de preservação com dois nós implementado na versão 2.1:

1. **Nó "Preservar Dados Planilha"** - Armazena dados originais da planilha antes da consulta ao Supabase
2. **Nó "Combinar Dados Supabase Planilha"** - Mescla dados armazenados com resposta do Supabase

Isso garante que informações de veículos e detalhes do cliente da planilha não sejam perdidos durante o processamento.

### Normalização de Números de Telefone

Todos os telefones normalizados para o formato: `55XXXXXXXXXXX` (código do país Brasil + código de área + número)

Exemplos:

- `(11) 99999-9999` → `5511999999999`
- `11999999999` → `5511999999999`
- `5511999999999` → `5511999999999` (já normalizado)

### Lógica de Upsert (CRÍTICO)

**Corrigido na versão 2.1** para prevenir violações de chave duplicada:

- **Nó "IF Cliente Existe"** verifica se `clienteExiste` é verdadeiro
- **Caminho TRUE:** Usa PATCH (atualizar) no registro existente
- **Caminho FALSE:** Usa POST (inserir) novo registro

Nunca misture essas operações - o roteamento condicional previne violações de constraint.

### Clientes Sem WhatsApp

**Tratamento especial na versão 2.1:**

- "Verificação WhatsApp" verifica via Uazapi `/chat/check`
- Se `status != 'valid'`, registra cliente com `status_whatsapp: 'invalid'`
- Pula geração e envio de mensagem, mas ainda registra no banco de dados
- Fluxo continua para o próximo cliente (não interrompe o lote)

### Configuração de Processamento em Lote

**Recomendado:** `batchSize: 1` no nó "Split in Batches"

- Processa um cliente por vez
- Mais confiável que lotes maiores
- Crítico para manter contexto dos dados
- Loop retorna corretamente via nó "Wait - Intervalo Randomizado"

### Fallback de Geração de Mensagem

Se o OpenAI falhar, o workflow usa template fallback:

```
Olá [Nome]! Temos uma ótima oportunidade relacionada ao seu [Veículo].
Entre em contato conosco para mais informações!
```

## Considerações de Segurança

### Gerenciamento de Tokens

**CRÍTICO:** Nunca faça commit destes no git:

- Supabase Service Role Key (acesso total ao banco de dados)
- Uazapi Token
- OpenAI API Key
- Credenciais OAuth do Google Sheets

O `.gitignore` está configurado para prevenir commits acidentais.

### Service Role Key vs Anon Key

**Use Service Role Key para N8N** - ignora o Row Level Security (RLS) para operações de serviço.

**Políticas RLS** em [docs/supabase/policies.sql](docs/supabase/policies.sql):

- Service role: acesso completo (SELECT, INSERT, UPDATE, DELETE)
- Usuários autenticados: acesso somente leitura (para dashboards)
- Anônimos: bloqueados

### Rotação de Tokens

Se tokens forem expostos, siga [docs/seguranca/rotacao-tokens.md](docs/seguranca/rotacao-tokens.md):

1. Rotacione todos os tokens expostos imediatamente
2. Atualize nas variáveis de ambiente do N8N
3. Teste o workflow com as novas credenciais
4. Verifique que os tokens antigos foram revogados

## Referência de Troubleshooting

**Problemas comuns documentados nas correções da versão 2.1:**

1. **"dadosPlanilha não está disponível"** → Corrigido com nós de preservação
2. **"duplicate key value violates unique constraint"** → Corrigido com lógica condicional de upsert
3. **"null value in column telefone"** → Corrigido com mapeamento explícito de campos
4. **"invalid input syntax for type date: undefined"** → Corrigido com nó "Preparar Data Hoje"
5. **"Multiple matches" em consulta Supabase** → Corrigido com configuração `limit: 1`
6. **Split in Batches não processa todos os itens** → Use `batchSize: 1`

Guia completo de troubleshooting: [docs/n8n/troubleshooting.md](docs/n8n/troubleshooting.md)

## Estrutura da Documentação

```
docs/
├── supabase/          # Configuração do banco, schemas, índices, políticas
├── n8n/               # Configuração N8N, troubleshooting, referência de sintaxe
├── uazapi/            # Documentação da API WhatsApp, exemplos de webhooks
└── seguranca/         # Checklist de segurança, procedimentos de rotação de tokens
```

Toda a documentação é de nível de produção com exemplos, casos extremos e correções de bugs recentes documentadas.

## Referência de Sintaxe de Variáveis N8N

Ao trabalhar com JSON de workflow N8N:

- **Variáveis de ambiente:** `{{ $env.VARIABLE_NAME }}`
- **JSON do item atual:** `{{ $json.field_name }}`
- **Dados de nó anterior:** `{{ $node["Node Name"].json.field }}`
- **Acesso a arrays:** `{{ $json.vehicles[0].model }}`
- **Campos JSONB:** `{{ $json.veiculos[0].placa }}`

Veja [docs/n8n/sintaxe-n8n-variaveis.md](docs/n8n/sintaxe-n8n-variaveis.md) para referência completa.

## Restrições Conhecidas

1. **Limite diário de envios:** 200/dia (imposto por consulta ao banco antes de cada envio)
2. **Período de warm-up obrigatório:** Primeiros 7 dias devem usar limite de 50/dia
3. **Horário de operação:** 9h-18h apenas dias úteis (evitar fins de semana para prevenir bloqueios)
4. **Limitação de tamanho de lote:** Apenas `batchSize: 1` testado de forma confiável em produção
5. **Formato de telefone:** Deve ser números brasileiros (55XX...) - sem suporte internacional
6. **Limite de Google Sheets:** Configurado para máximo de 9 planilhas (pode ser estendido no array SHEET_IDS)

## Mudanças Recentes

### Versão 2.4 (Dezembro 2025 - Sistema de Dados Dinâmicos para Agente IA)

Sistema completo para gerenciar dados dinâmicos que são utilizados no prompt do agente de IA:

1. **Configurações Globais da Empresa** (`instacar_configuracoes_empresa`):
   - Armazena políticas, tom de voz, informações institucionais
   - Organizado por categorias (politicas, tom_voz, contato, sobre_empresa, ofertas, produtos)
   - Suporta variáveis dinâmicas ({{nome_cliente}}, {{data_hoje}}, etc.)
   - Pode ser sobrescrito por campanha via `configuracoes_sobrescritas` em `instacar_campanhas`

2. **Sessões de Contexto IA** (`instacar_sessoes_contexto_ia`):
   - Blocos de contexto reutilizáveis para o agente IA
   - Template de conteúdo com variáveis dinâmicas
   - Pode ser habilitado/desabilitado por campanha
   - Flag `habilitado_por_padrao` para ativação automática

3. **Templates de Prompt** (`instacar_templates_prompt`):
   - Templates prontos para diferentes tipos de campanha (natal, black-friday, relacionamento, etc.)
   - Prompt completo com estrutura otimizada para GPT-4/GPT-5
   - Define quais sessões e configurações são habilitadas por padrão

4. **Interface Web Completa**:
   - Seção "Dados Dinâmicos do Agente IA" na interface principal
   - Modais para gerenciar configurações, sessões e templates
   - CRUD completo com validações
   - Integração com formulário de campanhas

5. **Workflow N8N Atualizado**:
   - 5 novos nós para buscar dados dinâmicos do Supabase
   - Montagem automática do contexto do agente IA
   - Suporte a templates, sessões e configurações sobrescritas

📖 **Guia completo**: [docs/campanhas/guia-dados-dinamicos-ia.md](docs/campanhas/guia-dados-dinamicos-ia.md)  
📋 **Exemplos**: [docs/campanhas/exemplos-templates-sessoes.md](docs/campanhas/exemplos-templates-sessoes.md)

### Versão 2.3 (Dezembro 2025 - Gerenciamento de Instâncias WhatsApp)

Melhorias no sistema de gerenciamento de instâncias de APIs WhatsApp:

1. **Prefixo Obrigatório**: Todas as instâncias recebem automaticamente o prefixo `Instacar_codigo_` onde `codigo` é um código único de 6 caracteres alfanuméricos (letras minúsculas + números)
   - Formato: `Instacar_a3k9m2_nome-instancia`
   - Normalização automática: nomes são convertidos para minúsculas, espaços viram underscores, acentos são removidos
   - Hífens e underscores existentes são preservados (ex: "numero-01" mantém hífen, "numero_02" mantém underscore)
   - Proteção: usuário não pode editar o prefixo, apenas o nome após o prefixo
   - Sincronização: nome completo com prefixo é salvo tanto no Supabase quanto na Uazapi

2. **Admin Token e Instance Token**:
   - **Admin Token**: Necessário apenas para criar novas instâncias na Uazapi via API (POST /instance)
   - **Instance Token**: Usado para todas as outras operações (editar, deletar, conectar, enviar mensagens)
   - **Segurança**: Admin Token nunca é salvo no banco de dados, usado apenas temporariamente na memória

3. **Sincronização com Uazapi**:
   - Ao criar instância: cria na Uazapi usando Admin Token e obtém Instance Token automaticamente
   - Ao editar instância: atualiza nome na Uazapi usando Instance Token
   - Ao deletar instância: deleta na Uazapi primeiro usando Instance Token, depois remove do Supabase
   - Código preservado: ao editar, o código do prefixo é mantido (não gera novo)

4. **Interface Melhorada**:
   - Campo Admin Token opcional com explicações claras sobre quando usar
   - Tooltips atualizados explicando diferença entre Admin Token e Instance Token
   - Validações para garantir que apenas o nome (sem prefixo) seja editado
   - Instance Token com validação dinâmica: obrigatório apenas quando necessário
     - Não obrigatório ao criar nova instância Uazapi com Admin Token (será gerado automaticamente)
     - Obrigatório ao editar instâncias existentes ou criar sem Admin Token

### Versão 2.2 (Dezembro 2025 - Melhorias de UI/UX)

Melhorias de interface e experiência do usuário:

1. **Design System shadcn-ui**: Padronização completa de componentes (botões, inputs, cards, badges)
2. **Layout de Lista**: Visualização de campanhas seguindo padrão das instâncias Uazapi
3. **Responsividade**: Otimizações para mobile, tablet e desktop
4. **Correções de Bugs**: Badge de status duplicado, cores de texto nas estimativas, alinhamento em telas grandes
5. **Consistência Visual**: Paleta de cores, espaçamento e transições padronizados

📖 **Changelog completo**: [docs/interface-web/CHANGELOG-UI-UX-2025-12.md](docs/interface-web/CHANGELOG-UI-UX-2025-12.md)

### Versão 2.1 (2025-12-14 - Correções Críticas)

Sete correções importantes aplicadas:

1. Nós de preservação de dados adicionados
2. Lógica condicional de upsert implementada
3. Mapeamento explícito de campos para tabela de histórico
4. Tratamento de data nas verificações de limite diário
5. Tratamento para clientes sem WhatsApp
6. Recomendações de processamento em lote atualizadas
7. Tratamento de múltiplos matches em consultas Supabase

Todas as correções documentadas no [README.md](README.md) na seção "Melhorias e Correções Recentes".
