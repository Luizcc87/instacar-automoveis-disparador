-- ============================================================================
-- Schema Supabase - Sistema de Listas Avançado para Campanhas WhatsApp
-- Sistema completo de listas reutilizáveis para dividir clientes em disparos
-- manuais e automáticos com agendamento individual
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
-- Tabela: instacar_listas
-- Tabela principal de listas de clientes
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_listas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('estatica', 'dinamica', 'baseada_campanha')),
  escopo TEXT NOT NULL DEFAULT 'global' CHECK (escopo IN ('global', 'especifica')),
  campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  filtros_dinamicos JSONB, -- Estrutura híbrida expansível para filtros dinâmicos
  campanha_base_id UUID REFERENCES instacar_campanhas(id) ON DELETE SET NULL,
  criterio_campanha_base TEXT CHECK (criterio_campanha_base IN ('nao_receberam', 'receberam', 'status_envio', 'data_envio')),
  agendamento_cron TEXT, -- Expressão cron para execução automática (ex: "0 9 * * 1-5")
  agendamento_ativo BOOLEAN DEFAULT FALSE,
  total_clientes_cache INTEGER DEFAULT 0 CHECK (total_clientes_cache >= 0),
  ultima_atualizacao TIMESTAMP,
  ativo BOOLEAN DEFAULT TRUE,
  limite_envios_dia INTEGER DEFAULT 200 CHECK (limite_envios_dia > 0),
  observacao_sistema TEXT, -- Campo para observações do sistema (ex: "Aguardando vaga")
  proxima_tentativa TIMESTAMP, -- Para rate limiting
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints de validação
  CONSTRAINT check_escopo_campanha CHECK (
    (escopo = 'especifica' AND campanha_id IS NOT NULL) OR
    (escopo = 'global' AND campanha_id IS NULL)
  ),
  CONSTRAINT check_tipo_dinamica CHECK (
    (tipo = 'dinamica' AND filtros_dinamicos IS NOT NULL) OR
    (tipo != 'dinamica')
  ),
  CONSTRAINT check_tipo_baseada_campanha CHECK (
    (tipo = 'baseada_campanha' AND campanha_base_id IS NOT NULL) OR
    (tipo != 'baseada_campanha')
  )
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_listas IS 'Armazena listas reutilizáveis de clientes para campanhas WhatsApp';
COMMENT ON COLUMN instacar_listas.tipo IS 'Tipo de lista: estatica (seleção manual), dinamica (filtros JSONB), baseada_campanha (baseada em histórico de outra campanha)';
COMMENT ON COLUMN instacar_listas.escopo IS 'Escopo da lista: global (reutilizável) ou especifica (vinculada a uma campanha)';
COMMENT ON COLUMN instacar_listas.filtros_dinamicos IS 'Filtros JSONB para listas dinâmicas. Estrutura: {operador: "AND|OR", condicoes: [{campo, operador, valor}]}';
COMMENT ON COLUMN instacar_listas.campanha_base_id IS 'ID da campanha base para listas do tipo baseada_campanha';
COMMENT ON COLUMN instacar_listas.criterio_campanha_base IS 'Critério para filtrar clientes baseado na campanha: nao_receberam, receberam, status_envio, data_envio';
COMMENT ON COLUMN instacar_listas.agendamento_cron IS 'Expressão cron para execução automática (ex: "0 9 * * 1-5" = 9h, dias úteis)';
COMMENT ON COLUMN instacar_listas.total_clientes_cache IS 'Cache do total de clientes na lista (atualizado periodicamente)';
COMMENT ON COLUMN instacar_listas.limite_envios_dia IS 'Limite de envios por dia para esta lista (padrão: 200)';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_listas_updated_at ON instacar_listas;
CREATE TRIGGER update_listas_updated_at
  BEFORE UPDATE ON instacar_listas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Tabela: instacar_listas_clientes
-- Relacionamento N:N entre listas estáticas e clientes
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_listas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES instacar_listas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lista_id, cliente_id) -- Evita duplicatas: um cliente só pode estar uma vez por lista
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_listas_clientes IS 'Relacionamento N:N entre listas estáticas e clientes. Usado apenas para listas do tipo estatica';
COMMENT ON COLUMN instacar_listas_clientes.lista_id IS 'Referência à lista';
COMMENT ON COLUMN instacar_listas_clientes.cliente_id IS 'Referência ao cliente selecionado para esta lista';

-- ============================================================================
-- Tabela: instacar_listas_lotes
-- Divisão de listas em lotes menores para processamento escalonado
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_listas_lotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES instacar_listas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  agendamento_cron TEXT, -- Expressão cron específica para este lote
  agendamento_ativo BOOLEAN DEFAULT FALSE,
  clientes_ids JSONB DEFAULT '[]'::jsonb, -- Array de UUIDs dos clientes deste lote
  total_clientes INTEGER DEFAULT 0 CHECK (total_clientes >= 0),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'pausado', 'erro')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_listas_lotes IS 'Divisão de listas em lotes menores para processamento escalonado';
COMMENT ON COLUMN instacar_listas_lotes.lista_id IS 'Referência à lista pai';
COMMENT ON COLUMN instacar_listas_lotes.ordem IS 'Ordem de processamento dos lotes (menor número primeiro)';
COMMENT ON COLUMN instacar_listas_lotes.clientes_ids IS 'Array JSONB com UUIDs dos clientes deste lote';
COMMENT ON COLUMN instacar_listas_lotes.status IS 'Status do lote: pendente, em_andamento, concluido, pausado, erro';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_lotes_updated_at ON instacar_listas_lotes;
CREATE TRIGGER update_lotes_updated_at
  BEFORE UPDATE ON instacar_listas_lotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Tabela: instacar_listas_execucoes
-- Histórico de execuções de listas e lotes
-- ============================================================================

CREATE TABLE IF NOT EXISTS instacar_listas_execucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES instacar_listas(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES instacar_listas_lotes(id) ON DELETE SET NULL,
  trigger_tipo TEXT NOT NULL CHECK (trigger_tipo IN ('manual', 'cron', 'webhook')),
  total_contatos_elegiveis INTEGER DEFAULT 0 CHECK (total_contatos_elegiveis >= 0),
  total_enviado INTEGER DEFAULT 0 CHECK (total_enviado >= 0),
  total_erros INTEGER DEFAULT 0 CHECK (total_erros >= 0),
  total_duplicados INTEGER DEFAULT 0 CHECK (total_duplicados >= 0),
  total_sem_whatsapp INTEGER DEFAULT 0 CHECK (total_sem_whatsapp >= 0),
  status_execucao TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status_execucao IN ('em_andamento', 'concluida', 'pausada', 'erro')),
  horario_inicio TIMESTAMP DEFAULT NOW(),
  horario_fim TIMESTAMP,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_listas_execucoes IS 'Histórico completo de execuções de listas e lotes';
COMMENT ON COLUMN instacar_listas_execucoes.lista_id IS 'Referência à lista executada';
COMMENT ON COLUMN instacar_listas_execucoes.lote_id IS 'Referência ao lote executado (NULL se execução da lista completa)';
COMMENT ON COLUMN instacar_listas_execucoes.trigger_tipo IS 'Tipo de trigger que iniciou a execução: manual, cron ou webhook';
COMMENT ON COLUMN instacar_listas_execucoes.status_execucao IS 'Status da execução: em_andamento, concluida, pausada, erro';

-- Trigger para updated_at automático
DROP TRIGGER IF EXISTS update_execucoes_updated_at ON instacar_listas_execucoes;
CREATE TRIGGER update_execucoes_updated_at
  BEFORE UPDATE ON instacar_listas_execucoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Índices Críticos para Performance
-- ============================================================================

-- Índice para buscar listas agendadas ativas
CREATE INDEX IF NOT EXISTS idx_listas_agendamento_ativo 
  ON instacar_listas(agendamento_ativo, ativo) 
  WHERE agendamento_ativo = TRUE AND ativo = TRUE;

-- Índice para buscar listas por campanha
CREATE INDEX IF NOT EXISTS idx_listas_campanha 
  ON instacar_listas(campanha_id) 
  WHERE campanha_id IS NOT NULL;

-- Índice para buscar listas globais
CREATE INDEX IF NOT EXISTS idx_listas_globais 
  ON instacar_listas(escopo, ativo) 
  WHERE escopo = 'global' AND ativo = TRUE;

-- Índice para buscar clientes de uma lista
CREATE INDEX IF NOT EXISTS idx_listas_clientes_lista 
  ON instacar_listas_clientes(lista_id);

-- Índice para buscar listas de um cliente
CREATE INDEX IF NOT EXISTS idx_listas_clientes_cliente 
  ON instacar_listas_clientes(cliente_id);

-- Índice composto para otimizar JOINs
CREATE INDEX IF NOT EXISTS idx_listas_clientes_lista_cliente 
  ON instacar_listas_clientes(lista_id, cliente_id);

-- Índice para buscar lotes agendados ativos
CREATE INDEX IF NOT EXISTS idx_listas_lotes_agendamento_ativo 
  ON instacar_listas_lotes(agendamento_ativo, status) 
  WHERE agendamento_ativo = TRUE AND status = 'pendente';

-- Índice para buscar lotes de uma lista ordenados
CREATE INDEX IF NOT EXISTS idx_listas_lotes_lista_ordem 
  ON instacar_listas_lotes(lista_id, ordem);

-- Índice para buscar execuções de uma lista
CREATE INDEX IF NOT EXISTS idx_listas_execucoes_lista 
  ON instacar_listas_execucoes(lista_id, horario_inicio DESC);

-- Índice para buscar execuções de um lote
CREATE INDEX IF NOT EXISTS idx_listas_execucoes_lote 
  ON instacar_listas_execucoes(lote_id) 
  WHERE lote_id IS NOT NULL;

-- Índice para buscar execuções por status
CREATE INDEX IF NOT EXISTS idx_listas_execucoes_status 
  ON instacar_listas_execucoes(status_execucao, horario_inicio DESC);

-- ============================================================================
-- Funções Auxiliares
-- ============================================================================

-- ============================================================================
-- Função: calcular_total_clientes_dinamicos
-- Calcula e atualiza o cache do total de clientes de uma lista dinâmica
-- ============================================================================

CREATE OR REPLACE FUNCTION calcular_total_clientes_dinamicos(p_lista_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
  v_lista RECORD;
BEGIN
  -- Buscar dados da lista
  SELECT tipo, filtros_dinamicos INTO v_lista
  FROM instacar_listas
  WHERE id = p_lista_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista não encontrada: %', p_lista_id;
  END IF;
  
  -- Se não é lista dinâmica, retornar 0
  IF v_lista.tipo != 'dinamica' THEN
    RETURN 0;
  END IF;
  
  -- Resolver filtros e contar clientes
  SELECT COUNT(*) INTO v_total
  FROM resolver_clientes_lista_dinamica(p_lista_id);
  
  -- Atualizar cache
  UPDATE instacar_listas
  SET total_clientes_cache = v_total,
      ultima_atualizacao = NOW()
  WHERE id = p_lista_id;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_total_clientes_dinamicos(UUID) IS 'Calcula e atualiza o cache do total de clientes de uma lista dinâmica';

-- ============================================================================
-- Função: detectar_conflito_agendamento
-- Detecta listas/lotes com mesmo horário cron agendado
-- ============================================================================

CREATE OR REPLACE FUNCTION detectar_conflito_agendamento(
  p_lista_id UUID,
  p_cron TEXT
)
RETURNS TABLE (
  lista_id UUID,
  lista_nome TEXT,
  total_clientes INTEGER,
  tipo_conflito TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.nome,
    l.total_clientes_cache,
    'lista'::TEXT
  FROM instacar_listas l
  WHERE l.agendamento_cron = p_cron
    AND l.agendamento_ativo = TRUE
    AND l.ativo = TRUE
    AND (p_lista_id IS NULL OR l.id != p_lista_id)
  
  UNION ALL
  
  SELECT 
    l.id,
    l.nome || ' - Lote: ' || lt.nome,
    lt.total_clientes,
    'lote'::TEXT
  FROM instacar_listas_lotes lt
  INNER JOIN instacar_listas l ON l.id = lt.lista_id
  WHERE lt.agendamento_cron = p_cron
    AND lt.agendamento_ativo = TRUE
    AND lt.status = 'pendente'
    AND l.ativo = TRUE
    AND (p_lista_id IS NULL OR l.id != p_lista_id);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detectar_conflito_agendamento(UUID, TEXT) IS 'Detecta listas/lotes com mesmo horário cron agendado para alertas na interface';

-- ============================================================================
-- Função: resolver_clientes_lista_dinamica
-- Resolve filtros JSONB dinamicamente e retorna clientes elegíveis
-- Estrutura híbrida: suporta operadores básicos inicialmente, expansível
-- ============================================================================

CREATE OR REPLACE FUNCTION resolver_clientes_lista_dinamica(p_lista_id UUID)
RETURNS SETOF UUID AS $$
DECLARE
  v_lista RECORD;
  v_query TEXT;
  v_condicoes TEXT[];
  v_condicao JSONB;
  v_campo TEXT;
  v_operador TEXT;
  v_valor TEXT;
  v_operador_logico TEXT;
BEGIN
  -- Buscar dados da lista
  SELECT tipo, filtros_dinamicos INTO v_lista
  FROM instacar_listas
  WHERE id = p_lista_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista não encontrada: %', p_lista_id;
  END IF;
  
  IF v_lista.tipo != 'dinamica' THEN
    RAISE EXCEPTION 'Lista não é do tipo dinâmica: %', p_lista_id;
  END IF;
  
  IF v_lista.filtros_dinamicos IS NULL THEN
    RETURN;
  END IF;
  
  -- Obter operador lógico (AND ou OR)
  v_operador_logico := COALESCE(v_lista.filtros_dinamicos->>'operador', 'AND');
  
  -- Construir condições baseado no JSONB
  IF jsonb_typeof(v_lista.filtros_dinamicos->'condicoes') = 'array' THEN
    FOR v_condicao IN SELECT * FROM jsonb_array_elements(v_lista.filtros_dinamicos->'condicoes')
    LOOP
      v_campo := v_condicao->>'campo';
      v_operador := v_condicao->>'operador';
      v_valor := v_condicao->>'valor';
      
      -- Verificar se é condição baseada em campanha
      IF v_campo = 'campanha' OR (v_condicao->>'tipo') = 'campanha' THEN
        -- Construir condição SQL baseada em histórico de campanha
        CASE v_operador
          WHEN 'nao_receberam' THEN
            -- Clientes que NÃO receberam mensagem da campanha
            -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
            v_condicoes := array_append(v_condicoes, format(
              'NOT EXISTS (
                SELECT 1 FROM instacar_historico_envios h 
                LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
                WHERE h.cliente_id = instacar_clientes_envios.id 
                  AND h.status_envio = ''enviado''
                  AND (
                    h.campanha_id = %L 
                    OR (h.campanha_id IS NULL AND e.campanha_id = %L)
                  )
              )',
              v_valor::UUID, v_valor::UUID
            ));
          WHEN 'receberam' THEN
            -- Clientes que receberam mensagem da campanha
            -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
            v_condicoes := array_append(v_condicoes, format(
              'EXISTS (
                SELECT 1 FROM instacar_historico_envios h 
                LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
                WHERE h.cliente_id = instacar_clientes_envios.id 
                  AND h.status_envio = ''enviado''
                  AND (
                    h.campanha_id = %L 
                    OR (h.campanha_id IS NULL AND e.campanha_id = %L)
                  )
              )',
              v_valor::UUID, v_valor::UUID
            ));
          WHEN 'enviado' THEN
            -- Clientes com status "enviado" na campanha
            -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
            v_condicoes := array_append(v_condicoes, format(
              'EXISTS (
                SELECT 1 FROM instacar_historico_envios h 
                LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
                WHERE h.cliente_id = instacar_clientes_envios.id 
                  AND h.status_envio = ''enviado''
                  AND (
                    h.campanha_id = %L 
                    OR (h.campanha_id IS NULL AND e.campanha_id = %L)
                  )
              )',
              v_valor::UUID, v_valor::UUID
            ));
          WHEN 'erro' THEN
            -- Clientes com status "erro" na campanha
            -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
            v_condicoes := array_append(v_condicoes, format(
              'EXISTS (
                SELECT 1 FROM instacar_historico_envios h 
                LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
                WHERE h.cliente_id = instacar_clientes_envios.id 
                  AND h.status_envio = ''erro''
                  AND (
                    h.campanha_id = %L 
                    OR (h.campanha_id IS NULL AND e.campanha_id = %L)
                  )
              )',
              v_valor::UUID, v_valor::UUID
            ));
          WHEN 'bloqueado' THEN
            -- Clientes com status "bloqueado" na campanha
            -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
            v_condicoes := array_append(v_condicoes, format(
              'EXISTS (
                SELECT 1 FROM instacar_historico_envios h 
                LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
                WHERE h.cliente_id = instacar_clientes_envios.id 
                  AND h.status_envio = ''bloqueado''
                  AND (
                    h.campanha_id = %L 
                    OR (h.campanha_id IS NULL AND e.campanha_id = %L)
                  )
              )',
              v_valor::UUID, v_valor::UUID
            ));
          ELSE
            RAISE EXCEPTION 'Critério de campanha não suportado: %', v_operador;
        END CASE;
      ELSE
        -- Condição normal (campo da tabela instacar_clientes_envios)
        CASE v_operador
          WHEN '=' THEN
            v_condicoes := array_append(v_condicoes, format('%I = %L', v_campo, v_valor));
          WHEN '!=' THEN
            v_condicoes := array_append(v_condicoes, format('%I != %L', v_campo, v_valor));
          WHEN '>' THEN
            v_condicoes := array_append(v_condicoes, format('%I > %L', v_campo, v_valor));
          WHEN '>=' THEN
            v_condicoes := array_append(v_condicoes, format('%I >= %L', v_campo, v_valor));
          WHEN '<' THEN
            v_condicoes := array_append(v_condicoes, format('%I < %L', v_campo, v_valor));
          WHEN '<=' THEN
            v_condicoes := array_append(v_condicoes, format('%I <= %L', v_campo, v_valor));
          WHEN 'LIKE' THEN
            v_condicoes := array_append(v_condicoes, format('%I LIKE %L', v_campo, '%' || v_valor || '%'));
          WHEN 'IN' THEN
            -- Valor deve ser array JSON
            v_condicoes := array_append(v_condicoes, format('%I = ANY(ARRAY[%s])', v_campo, 
              (SELECT string_agg(quote_literal(elem::text), ',') 
               FROM jsonb_array_elements_text(v_condicao->'valor'::jsonb) elem)));
          ELSE
            RAISE EXCEPTION 'Operador não suportado: %', v_operador;
        END CASE;
      END IF;
    END LOOP;
  END IF;
  
  -- Construir query final
  -- Nota: A tabela instacar_clientes_envios não tem campos ativo/bloqueado_envios
  -- Filtrar apenas por status_whatsapp = 'valid' para clientes elegíveis
  IF array_length(v_condicoes, 1) IS NULL THEN
    -- Sem condições, retornar todos os clientes elegíveis (com WhatsApp válido)
    v_query := 'SELECT id FROM instacar_clientes_envios WHERE status_whatsapp = ''valid''';
  ELSE
    v_query := format(
      'SELECT id FROM instacar_clientes_envios WHERE status_whatsapp = ''valid'' AND (%s)',
      array_to_string(v_condicoes, ' ' || v_operador_logico || ' ')
    );
  END IF;
  
  -- Executar query e retornar UUIDs
  RETURN QUERY EXECUTE v_query;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolver_clientes_lista_dinamica(UUID) IS 'Resolve filtros JSONB dinamicamente e retorna clientes elegíveis de uma lista dinâmica';

-- ============================================================================
-- Função: resolver_clientes_lista_baseada_campanha
-- Resolve critérios baseados em histórico de campanha e retorna clientes elegíveis
-- ============================================================================

CREATE OR REPLACE FUNCTION resolver_clientes_lista_baseada_campanha(p_lista_id UUID)
RETURNS SETOF UUID AS $$
DECLARE
  v_lista RECORD;
BEGIN
  -- Buscar dados da lista
  SELECT tipo, campanha_base_id, criterio_campanha_base INTO v_lista
  FROM instacar_listas
  WHERE id = p_lista_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lista não encontrada: %', p_lista_id;
  END IF;
  
  IF v_lista.tipo != 'baseada_campanha' THEN
    RAISE EXCEPTION 'Lista não é do tipo baseada_campanha: %', p_lista_id;
  END IF;
  
  IF v_lista.campanha_base_id IS NULL THEN
    RAISE EXCEPTION 'Campanha base não definida para lista: %', p_lista_id;
  END IF;
  
  -- Resolver critério
  CASE v_lista.criterio_campanha_base
    WHEN 'nao_receberam' THEN
      -- Clientes que NÃO receberam mensagem da campanha base
      -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
      RETURN QUERY
      SELECT DISTINCT c.id
      FROM instacar_clientes_envios c
      WHERE c.status_whatsapp = 'valid'
        AND NOT EXISTS (
          SELECT 1
          FROM instacar_historico_envios h
          LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
          WHERE h.cliente_id = c.id
            AND h.status_envio = 'enviado'
            AND (
              h.campanha_id = v_lista.campanha_base_id
              OR (h.campanha_id IS NULL AND e.campanha_id = v_lista.campanha_base_id)
            )
        );
    
    WHEN 'receberam' THEN
      -- Clientes que receberam mensagem da campanha base
      -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
      RETURN QUERY
      SELECT DISTINCT c.id
      FROM instacar_clientes_envios c
      INNER JOIN instacar_historico_envios h ON h.cliente_id = c.id
      LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
      WHERE c.status_whatsapp = 'valid'
        AND h.status_envio = 'enviado'
        AND (
          h.campanha_id = v_lista.campanha_base_id
          OR (h.campanha_id IS NULL AND e.campanha_id = v_lista.campanha_base_id)
        );
    
    WHEN 'status_envio' THEN
      -- Clientes com status específico na campanha base
      -- Nota: Este critério requer campo adicional no JSONB filtros_dinamicos
      -- Por enquanto, retornar todos que receberam (mesmo que com erro)
      -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
      RETURN QUERY
      SELECT DISTINCT c.id
      FROM instacar_clientes_envios c
      INNER JOIN instacar_historico_envios h ON h.cliente_id = c.id
      LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
      WHERE c.status_whatsapp = 'valid'
        AND (
          h.campanha_id = v_lista.campanha_base_id
          OR (h.campanha_id IS NULL AND e.campanha_id = v_lista.campanha_base_id)
        );
    
    WHEN 'data_envio' THEN
      -- Clientes que receberam mensagem em data específica
      -- Nota: Este critério requer campo adicional no JSONB filtros_dinamicos
      -- Por enquanto, retornar todos que receberam
      -- Busca por campanha_id OU por execucao_id (para compatibilidade com registros antigos)
      RETURN QUERY
      SELECT DISTINCT c.id
      FROM instacar_clientes_envios c
      INNER JOIN instacar_historico_envios h ON h.cliente_id = c.id
      LEFT JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
      WHERE c.status_whatsapp = 'valid'
        AND h.status_envio = 'enviado'
        AND (
          h.campanha_id = v_lista.campanha_base_id
          OR (h.campanha_id IS NULL AND e.campanha_id = v_lista.campanha_base_id)
        );
    
    ELSE
      RAISE EXCEPTION 'Critério não suportado: %', v_lista.criterio_campanha_base;
  END CASE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolver_clientes_lista_baseada_campanha(UUID) IS 'Resolve critérios baseados em histórico de campanha e retorna clientes elegíveis';

-- ============================================================================
-- Função: normalizar_telefone_trigger
-- Trigger function para normalizar telefones para formato 55XXXXXXXXXXX
-- ============================================================================

CREATE OR REPLACE FUNCTION normalizar_telefone_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_telefone TEXT;
BEGIN
  -- Aplicar apenas se telefone foi alterado
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.telefone IS DISTINCT FROM NEW.telefone) THEN
    v_telefone := NEW.telefone;
    
    -- Remover caracteres não numéricos
    v_telefone := regexp_replace(v_telefone, '[^0-9]', '', 'g');
    
    -- Se não começa com 55, adicionar
    IF length(v_telefone) >= 10 AND NOT v_telefone LIKE '55%' THEN
      -- Se tem 10 ou 11 dígitos (sem código do país), adicionar 55
      IF length(v_telefone) = 10 OR length(v_telefone) = 11 THEN
        v_telefone := '55' || v_telefone;
      END IF;
    END IF;
    
    -- Validar formato final (deve ter 12 ou 13 dígitos começando com 55)
    IF length(v_telefone) < 12 OR length(v_telefone) > 13 OR NOT v_telefone LIKE '55%' THEN
      RAISE EXCEPTION 'Telefone inválido após normalização: %', NEW.telefone;
    END IF;
    
    NEW.telefone := v_telefone;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION normalizar_telefone_trigger() IS 'Normaliza telefones para formato 55XXXXXXXXXXX antes de inserir/atualizar';

-- ============================================================================
-- Triggers de Normalização de Telefone
-- ============================================================================

-- Aplicar trigger em instacar_clientes_envios (se ainda não existe)
DROP TRIGGER IF EXISTS normalize_telefone_clientes ON instacar_clientes_envios;
CREATE TRIGGER normalize_telefone_clientes
  BEFORE INSERT OR UPDATE OF telefone ON instacar_clientes_envios
  FOR EACH ROW
  EXECUTE FUNCTION normalizar_telefone_trigger();

-- Aplicar trigger em instacar_historico_envios (se ainda não existe)
DROP TRIGGER IF EXISTS normalize_telefone_historico ON instacar_historico_envios;
CREATE TRIGGER normalize_telefone_historico
  BEFORE INSERT OR UPDATE OF telefone ON instacar_historico_envios
  FOR EACH ROW
  EXECUTE FUNCTION normalizar_telefone_trigger();

