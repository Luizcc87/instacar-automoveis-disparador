-- ============================================================================
-- Schema Supabase - Sistema de Dados Dinâmicos para Agente IA
-- Tabelas para gerenciar configurações globais, sessões de contexto e templates
-- ============================================================================

-- ============================================================================
-- Função auxiliar para atualizar updated_at automaticamente
-- (Garantir que existe, mesmo se schema.sql não foi executado)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Tabela: instacar_configuracoes_empresa
-- Armazena dados básicos globais da empresa que podem ser sobrescritos por campanha
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_configuracoes_empresa (
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

-- Comentários
COMMENT ON TABLE instacar_configuracoes_empresa IS 'Armazena configurações globais da empresa que podem ser usadas no prompt do agente IA';
COMMENT ON COLUMN instacar_configuracoes_empresa.chave IS 'Identificador único da configuração (ex: politicas.tom_voz, sobre_empresa.missao)';
COMMENT ON COLUMN instacar_configuracoes_empresa.categoria IS 'Categoria da configuração: politicas, tom_voz, contato, sobre_empresa, ofertas, produtos';
COMMENT ON COLUMN instacar_configuracoes_empresa.conteudo IS 'Conteúdo da configuração (pode incluir variáveis como {{nome_cliente}}, {{data_hoje}})';
COMMENT ON COLUMN instacar_configuracoes_empresa.ordem IS 'Ordem de exibição (menor número aparece primeiro)';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_configuracoes_empresa_updated_at ON instacar_configuracoes_empresa;
CREATE TRIGGER update_configuracoes_empresa_updated_at
  BEFORE UPDATE ON instacar_configuracoes_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_categoria ON instacar_configuracoes_empresa(categoria);
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_ativo ON instacar_configuracoes_empresa(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_configuracoes_empresa_ordem ON instacar_configuracoes_empresa(ordem);

-- ============================================================================
-- Tabela: instacar_sessoes_contexto_ia
-- Armazena sessões/blocos de contexto pré-definidos que podem ser habilitados por campanha
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_sessoes_contexto_ia (
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

-- Comentários
COMMENT ON TABLE instacar_sessoes_contexto_ia IS 'Armazena sessões/blocos de contexto pré-definidos para o agente IA';
COMMENT ON COLUMN instacar_sessoes_contexto_ia.slug IS 'Identificador único da sessão (ex: sobre_empresa, ofertas_especiais)';
COMMENT ON COLUMN instacar_sessoes_contexto_ia.conteudo_template IS 'Template do conteúdo da sessão (pode usar variáveis como {{nome_cliente}})';
COMMENT ON COLUMN instacar_sessoes_contexto_ia.exemplo_preenchido IS 'Exemplo já preenchido para referência do usuário';
COMMENT ON COLUMN instacar_sessoes_contexto_ia.habilitado_por_padrao IS 'Se TRUE, esta sessão será habilitada por padrão em novas campanhas';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_sessoes_contexto_updated_at ON instacar_sessoes_contexto_ia;
CREATE TRIGGER update_sessoes_contexto_updated_at
  BEFORE UPDATE ON instacar_sessoes_contexto_ia
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessoes_contexto_slug ON instacar_sessoes_contexto_ia(slug);
CREATE INDEX IF NOT EXISTS idx_sessoes_contexto_ativo ON instacar_sessoes_contexto_ia(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_sessoes_contexto_ordem ON instacar_sessoes_contexto_ia(ordem);

-- ============================================================================
-- Tabela: instacar_templates_prompt
-- Armazena templates completos de prompt que podem ser selecionados ao criar campanha
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_templates_prompt (
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

-- Comentários
COMMENT ON TABLE instacar_templates_prompt IS 'Armazena templates completos de prompt para campanhas';
COMMENT ON COLUMN instacar_templates_prompt.prompt_completo IS 'Template completo do prompt que será usado na campanha';
COMMENT ON COLUMN instacar_templates_prompt.sessoes_habilitadas IS 'Array JSON de slugs de sessões habilitadas por padrão quando usar este template';
COMMENT ON COLUMN instacar_templates_prompt.configuracoes_empresa_habilitadas IS 'Array JSON de chaves de configurações habilitadas por padrão quando usar este template';
COMMENT ON COLUMN instacar_templates_prompt.categoria IS 'Categoria do template: natal, black-friday, relacionamento, promocional, custom';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_templates_prompt_updated_at ON instacar_templates_prompt;
CREATE TRIGGER update_templates_prompt_updated_at
  BEFORE UPDATE ON instacar_templates_prompt
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_templates_prompt_categoria ON instacar_templates_prompt(categoria);
CREATE INDEX IF NOT EXISTS idx_templates_prompt_ativo ON instacar_templates_prompt(ativo) WHERE ativo = TRUE;

-- ============================================================================
-- Modificações em instacar_campanhas
-- Adicionar campos para suportar dados dinâmicos
-- ============================================================================

-- Adicionar coluna template_prompt_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'template_prompt_id'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN template_prompt_id UUID REFERENCES instacar_templates_prompt(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar coluna sessoes_contexto_habilitadas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'sessoes_contexto_habilitadas'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN sessoes_contexto_habilitadas JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Adicionar coluna configuracoes_empresa_sobrescritas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'configuracoes_empresa_sobrescritas'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN configuracoes_empresa_sobrescritas JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Adicionar coluna usar_configuracoes_globais
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instacar_campanhas' 
    AND column_name = 'usar_configuracoes_globais'
  ) THEN
    ALTER TABLE instacar_campanhas 
      ADD COLUMN usar_configuracoes_globais BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Comentários para colunas adicionadas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas' AND column_name = 'template_prompt_id') THEN
    COMMENT ON COLUMN instacar_campanhas.template_prompt_id IS 'Template de prompt selecionado (opcional). Se preenchido, usa template como base do prompt';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas' AND column_name = 'sessoes_contexto_habilitadas') THEN
    COMMENT ON COLUMN instacar_campanhas.sessoes_contexto_habilitadas IS 'Array JSON de slugs de sessões habilitadas para esta campanha (ex: ["sobre_empresa", "ofertas_especiais"])';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas' AND column_name = 'configuracoes_empresa_sobrescritas') THEN
    COMMENT ON COLUMN instacar_campanhas.configuracoes_empresa_sobrescritas IS 'Objeto JSON com chaves de configurações sobrescritas (ex: {"politicas.tom_voz": "Novo tom..."})';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instacar_campanhas' AND column_name = 'usar_configuracoes_globais') THEN
    COMMENT ON COLUMN instacar_campanhas.usar_configuracoes_globais IS 'Se TRUE, usa configurações globais como base + sobrescritas. Se FALSE, usa apenas sobrescritas';
  END IF;
END $$;

-- ============================================================================
-- Habilitar RLS nas novas tabelas
-- ============================================================================

ALTER TABLE instacar_configuracoes_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_sessoes_contexto_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE instacar_templates_prompt ENABLE ROW LEVEL SECURITY;

