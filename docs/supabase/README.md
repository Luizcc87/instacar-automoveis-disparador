# Documentação Supabase - Instacar Automóveis Disparador

Este diretório contém todos os scripts SQL necessários para configurar o banco de dados Supabase do sistema de disparo escalonado.

## 📋 Arquivos

### 1. `schema.sql`

Script principal que cria todas as tabelas e funções necessárias:

- `instacar_clientes_envios` - Armazena clientes e controle de envios
- `instacar_historico_envios` - Histórico completo de envios
- `instacar_controle_envios` - Controle diário e métricas
- `instacar_erros_criticos` - Dead Letter Queue para erros
- Função `update_updated_at_column()` - Trigger automático

**⚠️ ATENÇÃO:** Se você já tem tabelas no mesmo projeto Supabase (ex: `brindesbr_*`), verifique se a função `update_updated_at_column()` já existe antes de executar. Veja `analise-impacto-tabelas-existentes.md` para mais detalhes.

### 1.1. `schema-isolado.sql` (Alternativa)

Versão alternativa do `schema.sql` que usa função isolada `instacar_update_updated_at_column()` para evitar conflitos com funções existentes. **Use esta versão se a função `update_updated_at_column()` já existir no seu projeto.**

### 2. `indexes.sql`

Cria todos os índices para otimizar performance:

- Índices únicos e compostos
- Índices parciais (WHERE clauses)
- Índices para queries frequentes

### 3. `policies.sql`

Configura Row Level Security (RLS):

- Políticas para service_role (N8N)
- Políticas para usuários autenticados (dashboard)
- Bloqueio de acesso anônimo

### 4. `schema-campanhas.sql`

Schema para sistema de campanhas de marketing:

- `instacar_campanhas` - Configuração de campanhas
- `instacar_campanhas_execucoes` - Histórico de execuções
- Campos de agendamento, limites, prioridades

### 5. `schema-whatsapp-apis.sql`

Schema genérico para múltiplas APIs WhatsApp:

- `instacar_whatsapp_apis` - Instâncias de APIs (Uazapi, Z-API, Evolution, WhatsApp Oficial, etc.)
- Suporta múltiplas instâncias por tipo de API
- Campo `configuracao_extra` (JSONB) para configurações específicas
- Migração automática de `instacar_uazapi_instancias` (se existir)

**Após executar `schema-whatsapp-apis.sql`, execute também:**

### 5.1. `schema-whatsapp-apis-status.sql`

Expansão para suportar conexão via QR code e rastreamento de status:

- Campos: `status_conexao`, `numero_whatsapp`, `profile_name`, `ultima_atualizacao_status`
- Função auxiliar: `atualizar_status_instancia_whatsapp()`
- Índices para performance

**Nota**: `fix-whatsapp-apis.sql` é um script de correção de emergência. Use apenas se houver erro 404 ou problemas na criação da tabela.

### 5.1. `schema-clientes-expansao.sql`

Expansão da tabela de clientes com funcionalidades adicionais:

- Campo `ativo` (BOOLEAN) - Soft delete, permite desativar clientes sem excluir dados
- Campo `observacoes_internas` (JSONB) - Histórico de observações internas com timestamps e autor
- Índice para otimizar consultas de clientes ativos
- Atualiza registros existentes para garantir valores padrão

### 6. `schema-configuracoes-sistema.sql`

Schema para configurações globais do sistema:

- `instacar_configuracoes_sistema` - Configurações chave-valor estruturadas
- Webhook N8N, API keys globais, etc.
- Funções auxiliares: `obter_configuracao()`, `definir_configuracao()`

### 7. `schema-upload-planilhas.sql`

Schema para controle de uploads de planilhas:

- `instacar_uploads_planilhas` - Registro de uploads
- Rastreamento de origem dos dados

### 8. `verificacao-pre-execucao.sql`

Script de verificação que deve ser executado **ANTES** de rodar os scripts de criação. Verifica:

- Se a função `update_updated_at_column()` já existe
- Se alguma tabela `instacar_*` já foi criada
- Possíveis conflitos de índices

### 9. `analise-impacto-tabelas-existentes.md`

Análise completa de impacto e possíveis conflitos ao criar as tabelas da Instacar em um projeto Supabase que já possui outras tabelas (ex: `brindesbr_*`).

### 10. Documentação de Migração

- `MIGRACAO-WHATSAPP-APIS-GENERICO.md` - Guia de migração para tabela genérica de APIs WhatsApp

## 🚀 Instalação

### Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Anote a URL do projeto: `https://[project-id].supabase.co`
4. Vá em Settings > API e copie a **Service Role Key** (não a anon key!)

### Passo 2: Verificação Pré-Execução (IMPORTANTE)

**Se você já tem outras tabelas no mesmo projeto Supabase**, execute primeiro o script de verificação:

1. Acesse o SQL Editor no Supabase Dashboard
2. Execute `verificacao-pre-execucao.sql` para verificar possíveis conflitos
3. Consulte `analise-impacto-tabelas-existentes.md` para entender os resultados

### Passo 3: Executar Scripts SQL

1. Acesse o SQL Editor no Supabase Dashboard
2. Execute os scripts na seguinte ordem:

```sql
-- 1. Primeiro: schema.sql OU schema-isolado.sql
-- - Use schema.sql se a função update_updated_at_column() NÃO existir
-- - Use schema-isolado.sql se a função JÁ existir (recomendado para evitar conflitos)
-- Copie e cole o conteúdo e execute

-- 2. Segundo: schema-campanhas.sql (sistema de campanhas)
-- Copie e cole o conteúdo de schema-campanhas.sql e execute

-- 3. Terceiro: schema-whatsapp-apis.sql (APIs WhatsApp genéricas)
-- Copie e cole o conteúdo de schema-whatsapp-apis.sql e execute
-- NOTA: Este schema migra automaticamente dados de instacar_uazapi_instancias se existir

-- 4. Quarto: schema-configuracoes-sistema.sql (configurações globais)
-- Copie e cole o conteúdo de schema-configuracoes-sistema.sql e execute

-- 5. Quinto: schema-upload-planilhas.sql (controle de uploads)
-- Copie e cole o conteúdo de schema-upload-planilhas.sql e execute

-- 5.1. Quinto.1: schema-clientes-expansao.sql (expansão da tabela de clientes)
-- Copie e cole o conteúdo de schema-clientes-expansao.sql e execute
-- Adiciona campos: ativo (soft delete) e observacoes_internas (histórico)

-- 6. Sexto: indexes.sql (cria índices)
-- Copie e cole o conteúdo de indexes.sql e execute

-- 7. Sétimo: policies.sql (configura RLS)
-- Copie e cole o conteúdo de policies.sql e execute
```

### Passo 4: Verificar Instalação

Execute esta query para verificar se tudo foi criado corretamente:

```sql
-- Verificar tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'instacar_%'
ORDER BY table_name;

-- Verificar índices
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'instacar_%'
ORDER BY tablename, indexname;

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename LIKE 'instacar_%'
ORDER BY tablename, policyname;
```

## 📊 Estrutura das Tabelas

### instacar_clientes_envios

Armazena informações dos clientes e controle de envios.

**Campos principais:**

- `telefone` (VARCHAR(15), UNIQUE) - Telefone normalizado (55XXXXXXXXXXX)
- `nome_cliente` (TEXT) - Nome do cliente
- `email` (TEXT) - Email do cliente
- `veiculos` (JSONB) - Array de veículos comprados
- `total_envios` (INTEGER) - Contador de mensagens enviadas
- `status_whatsapp` (TEXT) - Status: 'valid', 'invalid' ou 'unknown'
- `ativo` (BOOLEAN) - Soft delete, clientes desativados não aparecem nas listagens (adicionado via `schema-clientes-expansao.sql`)
- `observacoes_internas` (JSONB) - Histórico de observações internas com timestamps (adicionado via `schema-clientes-expansao.sql`)

**Uso:** Verificação de duplicatas e controle de envios por cliente. Interface web permite gerenciamento completo (edição, observações, histórico).

### instacar_historico_envios

Registra histórico completo de todos os envios.

**Campos principais:**

- `cliente_id` (UUID, FK) - Referência ao cliente
- `telefone` (VARCHAR(15)) - Telefone (redundante para queries)
- `mensagem_enviada` (TEXT) - Texto da mensagem enviada
- `veiculo_referencia` (JSONB) - Dados do veículo da linha
- `status_envio` (TEXT) - Status: 'enviado', 'erro' ou 'bloqueado'
- `planilha_origem` (TEXT) - Identificador da planilha

**Uso:** Auditoria, relatórios e análise de envios.

### instacar_controle_envios

Controla envios diários e métricas.

**Campos principais:**

- `data` (DATE, PK) - Data do controle
- `total_enviado` (INTEGER) - Total de envios com sucesso
- `total_erros` (INTEGER) - Total de erros
- `total_duplicados` (INTEGER) - Total de duplicados
- `total_sem_whatsapp` (INTEGER) - Total sem WhatsApp
- `status_processamento` (TEXT) - Status do dia

**Uso:** Controle de limite diário (200 envios) e métricas.

### instacar_erros_criticos

Dead Letter Queue para erros críticos.

**Campos principais:**

- `tipo_erro` (TEXT) - Tipo: 'uazapi', 'openai', 'supabase', 'sheets'
- `mensagem_erro` (TEXT) - Mensagem de erro
- `contexto_erro` (JSONB) - Contexto quando ocorreu
- `status` (TEXT) - Status: 'pendente', 'processado' ou 'ignorado'
- `reprocessado` (BOOLEAN) - Se foi reprocessado

**Uso:** Análise de erros e possível replay.

## 🔐 Segurança

### Service Role Key

A **Service Role Key** tem acesso total ao banco (bypassa RLS). Use apenas no N8N e **NUNCA** exponha em:

- Código versionado
- Repositórios públicos
- Logs ou mensagens de erro
- Screenshots ou documentação pública

### Variáveis de Ambiente

Configure no N8N:

- `SUPABASE_URL` = `https://[project-id].supabase.co`
- `SUPABASE_SERVICE_KEY` = (Service Role Key)

## 📈 Queries Úteis

### Verificar envios do dia atual

```sql
SELECT
  data,
  total_enviado,
  total_erros,
  total_duplicados,
  total_sem_whatsapp,
  status_processamento
FROM instacar_controle_envios
WHERE data = CURRENT_DATE;
```

### Listar clientes que já receberam mensagem

```sql
SELECT
  telefone,
  nome_cliente,
  total_envios,
  ultimo_envio,
  jsonb_array_length(veiculos) as total_veiculos
FROM instacar_clientes_envios
WHERE total_envios > 0
ORDER BY ultimo_envio DESC;
```

### Estatísticas de envios por status

```sql
SELECT
  status_envio,
  COUNT(*) as total,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentual
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE
GROUP BY status_envio;
```

### Erros críticos pendentes

```sql
SELECT
  tipo_erro,
  mensagem_erro,
  telefone,
  created_at
FROM instacar_erros_criticos
WHERE status = 'pendente'
ORDER BY created_at DESC;
```

## 🔄 Manutenção

### Limpar histórico antigo (opcional)

```sql
-- Deletar histórico com mais de 1 ano
DELETE FROM instacar_historico_envios
WHERE timestamp_envio < NOW() - INTERVAL '1 year';
```

### Resetar contador diário (se necessário)

```sql
-- Resetar controle do dia atual
UPDATE instacar_controle_envios
SET
  total_enviado = 0,
  total_erros = 0,
  total_duplicados = 0,
  total_sem_whatsapp = 0,
  status_processamento = 'em_andamento'
WHERE data = CURRENT_DATE;
```

## 📝 Notas

- Todas as tabelas têm `created_at` e `updated_at` automáticos
- Triggers atualizam `updated_at` automaticamente
- Constraints CHECK garantem integridade dos dados
- Índices otimizam queries frequentes
- RLS protege dados sensíveis

## 🆘 Troubleshooting

### Erro: "relation already exists"

- Tabela já foi criada. Use `DROP TABLE` se necessário recriar.

### Erro: "permission denied"

- Verifique se está usando Service Role Key no N8N
- Verifique políticas RLS em `policies.sql`

### Performance lenta

- Verifique se os índices foram criados: `indexes.sql`
- Execute `ANALYZE` nas tabelas se necessário

### Dúvidas?

Consulte a documentação oficial do Supabase: [https://supabase.com/docs](https://supabase.com/docs)
