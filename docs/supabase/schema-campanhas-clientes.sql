-- ============================================================================
-- Schema: Tabela de Relacionamento Campanha-Cliente
-- Armazena quais clientes estão selecionados para cada campanha
-- ============================================================================

-- Criar tabela de relacionamento N:N entre campanhas e clientes
CREATE TABLE IF NOT EXISTS instacar_campanhas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID NOT NULL REFERENCES instacar_campanhas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campanha_id, cliente_id) -- Evita duplicatas: um cliente só pode estar selecionado uma vez por campanha
);

-- Comentários nas colunas
COMMENT ON TABLE instacar_campanhas_clientes IS 'Relacionamento N:N entre campanhas e clientes. Se uma campanha tem registros aqui, apenas os clientes selecionados receberão mensagens. Se não tem registros, todos os clientes elegíveis receberão (comportamento padrão).';
COMMENT ON COLUMN instacar_campanhas_clientes.campanha_id IS 'Referência à campanha';
COMMENT ON COLUMN instacar_campanhas_clientes.cliente_id IS 'Referência ao cliente selecionado para esta campanha';
COMMENT ON COLUMN instacar_campanhas_clientes.created_at IS 'Data/hora em que o cliente foi selecionado para a campanha';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_campanhas_clientes_campanha 
  ON instacar_campanhas_clientes(campanha_id);

CREATE INDEX IF NOT EXISTS idx_campanhas_clientes_cliente 
  ON instacar_campanhas_clientes(cliente_id);

-- Índice composto para queries frequentes (buscar clientes de uma campanha)
CREATE INDEX IF NOT EXISTS idx_campanhas_clientes_campanha_cliente 
  ON instacar_campanhas_clientes(campanha_id, cliente_id);

-- Comentários nos índices
COMMENT ON INDEX idx_campanhas_clientes_campanha IS 'Índice para buscar todos os clientes de uma campanha específica';
COMMENT ON INDEX idx_campanhas_clientes_cliente IS 'Índice para buscar todas as campanhas de um cliente específico';
COMMENT ON INDEX idx_campanhas_clientes_campanha_cliente IS 'Índice composto para otimizar JOINs entre campanhas e clientes';

