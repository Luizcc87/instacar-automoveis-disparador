-- ============================================================================
-- Migração: Preencher campanha_id em instacar_historico_envios
-- Preenche campanha_id baseado em execucao_id para registros antigos
-- ============================================================================

-- Atualizar registros que têm execucao_id mas não têm campanha_id
UPDATE instacar_historico_envios h
SET campanha_id = e.campanha_id
FROM instacar_campanhas_execucoes e
WHERE h.execucao_id = e.id
  AND h.campanha_id IS NULL
  AND e.campanha_id IS NOT NULL;

-- Estatísticas da migração
DO $$
DECLARE
  v_total_registros INTEGER;
  v_atualizados INTEGER;
  v_com_campanha_id INTEGER;
  v_sem_campanha_id INTEGER;
BEGIN
  -- Total de registros
  SELECT COUNT(*) INTO v_total_registros FROM instacar_historico_envios;
  
  -- Registros atualizados nesta migração
  SELECT COUNT(*) INTO v_atualizados
  FROM instacar_historico_envios h
  INNER JOIN instacar_campanhas_execucoes e ON h.execucao_id = e.id
  WHERE h.campanha_id = e.campanha_id;
  
  -- Registros com campanha_id preenchido
  SELECT COUNT(*) INTO v_com_campanha_id
  FROM instacar_historico_envios
  WHERE campanha_id IS NOT NULL;
  
  -- Registros sem campanha_id
  SELECT COUNT(*) INTO v_sem_campanha_id
  FROM instacar_historico_envios
  WHERE campanha_id IS NULL;
  
  RAISE NOTICE 'Migração concluída:';
  RAISE NOTICE '  Total de registros: %', v_total_registros;
  RAISE NOTICE '  Registros com campanha_id: %', v_com_campanha_id;
  RAISE NOTICE '  Registros sem campanha_id: %', v_sem_campanha_id;
  RAISE NOTICE '  Registros atualizados nesta migração: %', v_atualizados;
END $$;

-- Criar índice para melhorar performance de queries por campanha_id
CREATE INDEX IF NOT EXISTS idx_historico_campanha_id 
  ON instacar_historico_envios(campanha_id) 
  WHERE campanha_id IS NOT NULL;

-- Comentário
COMMENT ON INDEX idx_historico_campanha_id IS 'Índice para melhorar performance de queries que filtram por campanha_id';

