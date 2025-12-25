# Estrutura do Banco de Dados para Lovable

Este documento contém a estrutura completa do banco de dados Supabase e dados mockados para desenvolvimento inicial no Lovable.

## 📋 Visão Geral

O banco de dados utiliza **PostgreSQL** no Supabase e contém as seguintes tabelas principais:

1. **instacar_clientes_envios** - Clientes e controle de envios
2. **instacar_historico_envios** - Histórico completo de envios
3. **instacar_controle_envios** - Métricas diárias
4. **instacar_erros_criticos** - Dead Letter Queue
5. **instacar_campanhas** - Configuração de campanhas
6. **instacar_campanhas_execucoes** - Execuções de campanhas
7. **instacar_campanhas_clientes** - Relacionamento campanha-cliente
8. **instacar_whatsapp_apis** - Instâncias de APIs WhatsApp
9. **instacar_configuracoes_empresa** - Configurações globais da empresa
10. **instacar_sessoes_contexto_ia** - Sessões de contexto para IA
11. **instacar_templates_prompt** - Templates de prompt
12. **instacar_uploads_planilhas** - Rastreamento de uploads

## 🗄️ Estrutura Completa das Tabelas

### 1. instacar_clientes_envios

Armazena informações dos clientes e controle de envios.

```sql
CREATE TABLE instacar_clientes_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone VARCHAR(15) NOT NULL UNIQUE, -- Normalizado (55XXXXXXXXXXX)
  nome_cliente TEXT,
  email TEXT,
  veiculos JSONB DEFAULT '[]'::jsonb, -- Array de veículos comprados
  primeiro_envio TIMESTAMP,
  ultimo_envio TIMESTAMP,
  total_envios INTEGER DEFAULT 0 CHECK (total_envios >= 0),
  status_whatsapp TEXT CHECK (status_whatsapp IN ('valid', 'invalid', 'unknown')),
  ativo BOOLEAN DEFAULT TRUE, -- Soft delete
  bloqueado_envios BOOLEAN DEFAULT FALSE, -- Opt-out
  observacoes_internas JSONB DEFAULT '[]'::jsonb, -- Histórico de observações
  ultima_campanha_id UUID REFERENCES instacar_campanhas(id),
  ultima_campanha_data TIMESTAMP,
  ultima_atualizacao_planilha TIMESTAMP,
  fonte_dados TEXT, -- 'upload_manual', 'google_sheets', 'api', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Índices:**
- `idx_clientes_ativo` ON (ativo) WHERE ativo = true
- `idx_clientes_bloqueado_envios` ON (bloqueado_envios) WHERE bloqueado_envios = false
- `idx_clientes_telefone` ON (telefone)

### 2. instacar_historico_envios

Registra histórico completo de todos os envios realizados.

```sql
CREATE TABLE instacar_historico_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  telefone VARCHAR(15) NOT NULL,
  mensagem_enviada TEXT,
  veiculo_referencia JSONB,
  status_envio TEXT NOT NULL CHECK (status_envio IN ('enviado', 'erro', 'bloqueado')),
  mensagem_erro TEXT,
  planilha_origem TEXT,
  linha_planilha INTEGER,
  campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  execucao_id UUID REFERENCES instacar_campanhas_execucoes(id) ON DELETE SET NULL,
  tipo_envio TEXT DEFAULT 'normal' CHECK (tipo_envio IN ('normal', 'teste', 'debug')),
  timestamp_envio TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Índices:**
- `idx_historico_cliente_id` ON (cliente_id)
- `idx_historico_telefone` ON (telefone)
- `idx_historico_campanha_id` ON (campanha_id)
- `idx_historico_timestamp` ON (timestamp_envio DESC)

### 3. instacar_controle_envios

Controla envios diários e métricas.

```sql
CREATE TABLE instacar_controle_envios (
  data DATE PRIMARY KEY,
  total_enviado INTEGER DEFAULT 0 CHECK (total_enviado >= 0),
  total_erros INTEGER DEFAULT 0 CHECK (total_erros >= 0),
  total_duplicados INTEGER DEFAULT 0 CHECK (total_duplicados >= 0),
  total_sem_whatsapp INTEGER DEFAULT 0 CHECK (total_sem_whatsapp >= 0),
  campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  horario_inicio TIMESTAMP,
  horario_fim TIMESTAMP,
  status_processamento TEXT CHECK (status_processamento IN ('em_andamento', 'concluido', 'pausado', 'erro')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. instacar_erros_criticos

Dead Letter Queue - armazena erros críticos para análise.

```sql
CREATE TABLE instacar_erros_criticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES instacar_clientes_envios(id) ON DELETE SET NULL,
  telefone VARCHAR(15),
  tipo_erro TEXT NOT NULL, -- 'uazapi', 'openai', 'supabase', 'sheets', 'outro'
  mensagem_erro TEXT NOT NULL,
  contexto_erro JSONB,
  stack_trace TEXT,
  tentativas INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'ignorado')),
  reprocessado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 5. instacar_campanhas

Configuração de campanhas de marketing.

```sql
CREATE TABLE instacar_campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  periodo_ano TEXT NOT NULL, -- 'janeiro', 'fevereiro', 'black-friday', etc.
  template_mensagem TEXT,
  prompt_ia TEXT NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'pausada', 'concluida', 'cancelada')),
  limite_envios_dia INTEGER DEFAULT 200 CHECK (limite_envios_dia > 0),
  agendamento_cron TEXT, -- Expressão cron (ex: "0 9 * * 1-5")
  intervalo_minimo_dias INTEGER DEFAULT 30,
  intervalo_envios_segundos INTEGER CHECK (intervalo_envios_segundos >= 60 AND intervalo_envios_segundos <= 300),
  prioridade INTEGER DEFAULT 5 CHECK (prioridade >= 1 AND prioridade <= 10),
  ativo BOOLEAN DEFAULT TRUE,
  usar_veiculos BOOLEAN DEFAULT TRUE,
  usar_vendedor BOOLEAN DEFAULT FALSE,
  tamanho_lote INTEGER DEFAULT 50 CHECK (tamanho_lote >= 10 AND tamanho_lote <= 500),
  horario_inicio TIME DEFAULT '09:00:00',
  horario_fim TIME DEFAULT '18:00:00',
  processar_finais_semana BOOLEAN DEFAULT FALSE,
  pausar_almoco BOOLEAN DEFAULT FALSE,
  horario_almoco_inicio TIME DEFAULT '12:00:00',
  horario_almoco_fim TIME DEFAULT '13:00:00',
  configuracao_dias_semana JSONB, -- Configuração granular por dia
  whatsapp_api_id UUID REFERENCES instacar_whatsapp_apis(id) ON DELETE SET NULL,
  template_prompt_id UUID REFERENCES instacar_templates_prompt(id) ON DELETE SET NULL,
  sessoes_contexto_habilitadas JSONB DEFAULT '[]'::jsonb,
  configuracoes_empresa_sobrescritas JSONB DEFAULT '{}'::jsonb,
  usar_configuracoes_globais BOOLEAN DEFAULT TRUE,
  modo_teste BOOLEAN DEFAULT FALSE,
  telefones_teste JSONB DEFAULT '[]'::jsonb,
  modo_debug BOOLEAN DEFAULT FALSE,
  telefones_admin JSONB DEFAULT '[]'::jsonb,
  notificar_inicio BOOLEAN DEFAULT FALSE,
  notificar_erros BOOLEAN DEFAULT TRUE,
  notificar_conclusao BOOLEAN DEFAULT TRUE,
  notificar_limite BOOLEAN DEFAULT FALSE,
  whatsapp_api_id_admin UUID REFERENCES instacar_whatsapp_apis(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. instacar_campanhas_execucoes

Registra cada execução de uma campanha.

```sql
CREATE TABLE instacar_campanhas_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES instacar_campanhas(id) ON DELETE CASCADE,
  data_execucao DATE NOT NULL,
  total_enviado INTEGER DEFAULT 0 CHECK (total_enviado >= 0),
  total_erros INTEGER DEFAULT 0 CHECK (total_erros >= 0),
  total_duplicados INTEGER DEFAULT 0 CHECK (total_duplicados >= 0),
  total_sem_whatsapp INTEGER DEFAULT 0 CHECK (total_sem_whatsapp >= 0),
  total_contatos_elegiveis INTEGER DEFAULT 0 CHECK (total_contatos_elegiveis >= 0),
  contatos_processados INTEGER DEFAULT 0 CHECK (contatos_processados >= 0),
  contatos_pendentes INTEGER DEFAULT 0 CHECK (contatos_pendentes >= 0),
  dias_processamento INTEGER DEFAULT 1 CHECK (dias_processamento >= 1),
  data_inicio_processamento DATE,
  data_fim_estimada DATE,
  lote_atual INTEGER DEFAULT 1,
  clientes_no_lote_atual INTEGER DEFAULT 0,
  proxima_execucao_em TIMESTAMP,
  total_enviado_teste INTEGER DEFAULT 0 CHECK (total_enviado_teste >= 0),
  total_enviado_debug INTEGER DEFAULT 0 CHECK (total_enviado_debug >= 0),
  total_enviado_normal INTEGER DEFAULT 0 CHECK (total_enviado_normal >= 0),
  status_execucao TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status_execucao IN ('em_andamento', 'concluida', 'pausada', 'erro')),
  trigger_tipo TEXT NOT NULL CHECK (trigger_tipo IN ('manual', 'cron', 'webhook')),
  horario_inicio TIMESTAMP DEFAULT NOW(),
  horario_fim TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campanha_id, data_execucao)
);
```

### 7. instacar_campanhas_clientes

Relacionamento N:N entre campanhas e clientes.

```sql
CREATE TABLE instacar_campanhas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES instacar_campanhas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campanha_id, cliente_id)
);
```

### 8. instacar_whatsapp_apis

Configurações de múltiplas instâncias de APIs WhatsApp.

```sql
CREATE TABLE instacar_whatsapp_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  tipo_api TEXT NOT NULL CHECK (tipo_api IN ('uazapi', 'zapi', 'evolution', 'whatsapp_oficial', 'outro')),
  base_url TEXT NOT NULL,
  token TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  descricao TEXT,
  configuracao_extra JSONB DEFAULT '{}'::jsonb,
  status_conexao TEXT CHECK (status_conexao IN ('conectado', 'desconectado', 'erro', 'desconhecido')),
  ultima_verificacao TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 9. instacar_configuracoes_empresa

Configurações globais da empresa para o agente IA.

```sql
CREATE TABLE instacar_configuracoes_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL CHECK (categoria IN ('politicas', 'tom_voz', 'contato', 'sobre_empresa', 'ofertas', 'produtos')),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 10. instacar_sessoes_contexto_ia

Sessões/blocos de contexto pré-definidos para o agente IA.

```sql
CREATE TABLE instacar_sessoes_contexto_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  conteudo_template TEXT NOT NULL,
  exemplo_preenchido TEXT,
  descricao TEXT,
  habilitado_por_padrao BOOLEAN DEFAULT FALSE,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 11. instacar_templates_prompt

Templates completos de prompt para campanhas.

```sql
CREATE TABLE instacar_templates_prompt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  prompt_completo TEXT NOT NULL,
  sessoes_habilitadas JSONB DEFAULT '[]'::jsonb,
  configuracoes_empresa_habilitadas JSONB DEFAULT '[]'::jsonb,
  categoria TEXT NOT NULL CHECK (categoria IN ('natal', 'black-friday', 'relacionamento', 'promocional', 'custom')),
  exemplo_uso TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 12. instacar_uploads_planilhas

Rastreamento de uploads de planilhas.

```sql
CREATE TABLE instacar_uploads_planilhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('xls', 'xlsx', 'csv', 'txt', 'google_sheets')),
  total_linhas INTEGER DEFAULT 0 CHECK (total_linhas >= 0),
  linhas_processadas INTEGER DEFAULT 0 CHECK (linhas_processadas >= 0),
  linhas_com_erro INTEGER DEFAULT 0 CHECK (linhas_com_erro >= 0),
  status TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'concluido', 'erro', 'cancelado')),
  erros JSONB DEFAULT '[]'::jsonb,
  url_google_sheets TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 📦 Dados Mockados para Desenvolvimento

Veja o arquivo `dados-mockados-lovable.json` para dados de exemplo realistas.

## 🔌 Conexão com Supabase em Produção

### Variáveis de Ambiente Necessárias

```bash
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[anon-key]  # Para frontend
SUPABASE_SERVICE_KEY=[service-role-key]  # Para backend/N8N (NUNCA no frontend!)
```

### Configuração no Lovable

1. **Desenvolvimento (Mock)**: Use os dados mockados do arquivo JSON
2. **Produção**: Configure as variáveis de ambiente do Supabase

### Estrutura de Conexão

```javascript
// Exemplo de conexão Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

## 📝 Notas Importantes

1. **UUIDs**: Todas as chaves primárias são UUIDs gerados automaticamente
2. **Timestamps**: Campos `created_at` e `updated_at` são atualizados automaticamente
3. **JSONB**: Vários campos usam JSONB para flexibilidade (veiculos, observacoes_internas, etc.)
4. **Constraints**: Muitas tabelas têm CHECK constraints para validação
5. **Foreign Keys**: Relacionamentos são mantidos via foreign keys com ON DELETE CASCADE/SET NULL
6. **Índices**: Índices estratégicos para performance em queries frequentes
7. **RLS**: Row Level Security está habilitado em todas as tabelas (políticas em `policies.sql`)

## 🔄 Migrações

As tabelas foram criadas incrementalmente através de migrações. A ordem de execução recomendada:

1. `schema.sql` - Tabelas base
2. `schema-campanhas.sql` - Sistema de campanhas
3. `schema-dados-dinamicos-ia.sql` - Dados dinâmicos para IA
4. `schema-whatsapp-apis.sql` - Instâncias WhatsApp
5. `schema-clientes-expansao.sql` - Campos adicionais de clientes
6. `schema-clientes-bloqueio.sql` - Sistema de bloqueio
7. `schema-campanhas-clientes.sql` - Relacionamento campanha-cliente
8. `schema-upload-planilhas.sql` - Sistema de upload
9. `schema-campanhas-expansao-lotes-horario.sql` - Lotes e horários
10. `migracao-intervalo-almoco-dias-semana.sql` - Intervalo de almoço
11. `policies.sql` - Políticas RLS

## 📚 Documentação Adicional

- Schemas completos: `docs/supabase/`
- Políticas RLS: `docs/supabase/policies.sql`
- Índices: `docs/supabase/indexes.sql`

