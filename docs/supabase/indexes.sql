-- ============================================================================
-- Índices Supabase - Instacar Automóveis Disparador
-- Índices para otimizar performance das queries frequentes
-- ============================================================================

-- ============================================================================
-- Índices para instacar_clientes_envios
-- ============================================================================

-- Índice único já existe na constraint UNIQUE do telefone
-- Mas criamos índice adicional para busca rápida
CREATE INDEX IF NOT EXISTS idx_clientes_telefone 
  ON instacar_clientes_envios(telefone);

-- Índice para queries por último envio (controle de tempo)
CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_envio 
  ON instacar_clientes_envios(ultimo_envio DESC);

-- Índice para filtros por status WhatsApp
CREATE INDEX IF NOT EXISTS idx_clientes_status 
  ON instacar_clientes_envios(status_whatsapp);

-- Índice composto para queries de clientes que já receberam mensagem
CREATE INDEX IF NOT EXISTS idx_clientes_total_envios 
  ON instacar_clientes_envios(total_envios) 
  WHERE total_envios > 0;

-- Índice para busca por email (validação cruzada)
CREATE INDEX IF NOT EXISTS idx_clientes_email 
  ON instacar_clientes_envios(email) 
  WHERE email IS NOT NULL;

-- ============================================================================
-- Índices para instacar_historico_envios
-- ============================================================================

-- Índice para JOIN com clientes (já existe por FK, mas otimizamos)
CREATE INDEX IF NOT EXISTS idx_historico_cliente_id 
  ON instacar_historico_envios(cliente_id);

-- Índice composto para queries por data e status (dashboard, relatórios)
CREATE INDEX IF NOT EXISTS idx_historico_timestamp_status 
  ON instacar_historico_envios(timestamp_envio DESC, status_envio);

-- Índice para busca direta por telefone (sem JOIN)
CREATE INDEX IF NOT EXISTS idx_historico_telefone 
  ON instacar_historico_envios(telefone);

-- Índice para filtros por planilha de origem
CREATE INDEX IF NOT EXISTS idx_historico_planilha 
  ON instacar_historico_envios(planilha_origem) 
  WHERE planilha_origem IS NOT NULL;

-- Índice para queries de erros
CREATE INDEX IF NOT EXISTS idx_historico_status_erro 
  ON instacar_historico_envios(status_envio) 
  WHERE status_envio = 'erro';

-- ============================================================================
-- Índices para instacar_controle_envios
-- ============================================================================

-- Índice para queries por data (já é PK, mas útil para range queries)
CREATE INDEX IF NOT EXISTS idx_controle_data 
  ON instacar_controle_envios(data DESC);

-- Índice para filtros por status de processamento
CREATE INDEX IF NOT EXISTS idx_controle_status 
  ON instacar_controle_envios(status_processamento) 
  WHERE status_processamento = 'em_andamento';

-- ============================================================================
-- Índices para instacar_erros_criticos
-- ============================================================================

-- Índice para filtros por tipo de erro
CREATE INDEX IF NOT EXISTS idx_erros_tipo 
  ON instacar_erros_criticos(tipo_erro);

-- Índice para filtros por status (erros pendentes)
CREATE INDEX IF NOT EXISTS idx_erros_status 
  ON instacar_erros_criticos(status) 
  WHERE status = 'pendente';

-- Índice composto para queries de erros não reprocessados
CREATE INDEX IF NOT EXISTS idx_erros_reprocessar 
  ON instacar_erros_criticos(reprocessado, created_at DESC) 
  WHERE reprocessado = FALSE;

-- Índice para busca por telefone
CREATE INDEX IF NOT EXISTS idx_erros_telefone 
  ON instacar_erros_criticos(telefone) 
  WHERE telefone IS NOT NULL;

-- ============================================================================
-- Índices para instacar_campanhas
-- ============================================================================

-- Índice para filtros por status (campanhas ativas)
CREATE INDEX IF NOT EXISTS idx_campanhas_status 
  ON instacar_campanhas(status) 
  WHERE status = 'ativa' AND ativo = TRUE;

-- Índice para busca por período do ano
CREATE INDEX IF NOT EXISTS idx_campanhas_periodo 
  ON instacar_campanhas(periodo_ano);

-- Índice para queries por data (campanhas ativas em um período)
CREATE INDEX IF NOT EXISTS idx_campanhas_datas 
  ON instacar_campanhas(data_inicio, data_fim) 
  WHERE data_inicio IS NOT NULL AND data_fim IS NOT NULL;

-- Índice para campanhas com agendamento
CREATE INDEX IF NOT EXISTS idx_campanhas_agendamento 
  ON instacar_campanhas(agendamento_cron) 
  WHERE agendamento_cron IS NOT NULL AND ativo = TRUE;

-- ============================================================================
-- Índices para instacar_campanhas_execucoes
-- ============================================================================

-- Índice para JOIN com campanhas
CREATE INDEX IF NOT EXISTS idx_execucoes_campanha_id 
  ON instacar_campanhas_execucoes(campanha_id);

-- Índice composto para queries por campanha e data
CREATE INDEX IF NOT EXISTS idx_execucoes_campanha_data 
  ON instacar_campanhas_execucoes(campanha_id, data_execucao DESC);

-- Índice para filtros por status de execução
CREATE INDEX IF NOT EXISTS idx_execucoes_status 
  ON instacar_campanhas_execucoes(status_execucao) 
  WHERE status_execucao = 'em_andamento';

-- Índice para queries por tipo de trigger
CREATE INDEX IF NOT EXISTS idx_execucoes_trigger 
  ON instacar_campanhas_execucoes(trigger_tipo);

-- ============================================================================
-- Índices adicionais para tabelas modificadas (campanhas)
-- ============================================================================

-- Índice composto para histórico por campanha e telefone (prevenção duplicatas)
CREATE INDEX IF NOT EXISTS idx_historico_campanha_telefone 
  ON instacar_historico_envios(campanha_id, telefone) 
  WHERE campanha_id IS NOT NULL;

-- Índice para histórico por execução
CREATE INDEX IF NOT EXISTS idx_historico_execucao_id 
  ON instacar_historico_envios(execucao_id) 
  WHERE execucao_id IS NOT NULL;

-- Índice composto para histórico por campanha e data (relatórios)
CREATE INDEX IF NOT EXISTS idx_historico_campanha_timestamp 
  ON instacar_historico_envios(campanha_id, timestamp_envio DESC) 
  WHERE campanha_id IS NOT NULL;

-- Índice para controle por campanha
CREATE INDEX IF NOT EXISTS idx_controle_campanha_id 
  ON instacar_controle_envios(campanha_id) 
  WHERE campanha_id IS NOT NULL;

-- Índice composto para controle por campanha e data
CREATE INDEX IF NOT EXISTS idx_controle_campanha_data 
  ON instacar_controle_envios(campanha_id, data DESC) 
  WHERE campanha_id IS NOT NULL;

-- Índice para última campanha em clientes
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_campanha 
  ON instacar_clientes_envios(ultima_campanha_id) 
  WHERE ultima_campanha_id IS NOT NULL;

-- Índice para queries de intervalo mínimo (última campanha data)
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_campanha_data 
  ON instacar_clientes_envios(ultima_campanha_data DESC) 
  WHERE ultima_campanha_data IS NOT NULL;

