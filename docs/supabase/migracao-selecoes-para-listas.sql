-- ============================================================================
-- Migração: Converter Seleções de Campanhas para Sistema de Listas
-- Migra dados existentes de instacar_campanhas_clientes para instacar_listas
-- Estratégia de deprecação gradual: mantém tabela antiga por 30 dias
-- ============================================================================

-- ============================================================================
-- Script de Migração Automática
-- ============================================================================

DO $$ 
DECLARE
  v_campanha RECORD;
  v_lista_id UUID;
  v_total_clientes INTEGER;
BEGIN
  -- Iterar sobre todas as campanhas que têm seleção específica
  FOR v_campanha IN 
    SELECT DISTINCT c.id, c.nome
    FROM instacar_campanhas c
    WHERE EXISTS (
      SELECT 1 
      FROM instacar_campanhas_clientes cc 
      WHERE cc.campanha_id = c.id
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM instacar_campanhas c2
      WHERE c2.id = c.id 
      AND c2.lista_id IS NOT NULL
    )
  LOOP
    -- Criar lista estática para esta campanha
    INSERT INTO instacar_listas (
      nome,
      descricao,
      tipo,
      escopo,
      campanha_id,
      ativo,
      limite_envios_dia,
      created_at,
      updated_at
    ) VALUES (
      'Lista Legado: ' || v_campanha.nome,
      'Migrada automaticamente de seleção antiga em ' || CURRENT_DATE::TEXT,
      'estatica',
      'especifica',
      v_campanha.id,
      TRUE,
      200, -- Limite padrão
      NOW(),
      NOW()
    )
    RETURNING id INTO v_lista_id;

    -- Copiar clientes da seleção antiga para a nova lista
    INSERT INTO instacar_listas_clientes (lista_id, cliente_id, created_at)
    SELECT 
      v_lista_id,
      cc.cliente_id,
      cc.created_at
    FROM instacar_campanhas_clientes cc
    WHERE cc.campanha_id = v_campanha.id
    ON CONFLICT (lista_id, cliente_id) DO NOTHING; -- Evitar duplicatas

    -- Contar total de clientes migrados
    SELECT COUNT(*) INTO v_total_clientes
    FROM instacar_listas_clientes
    WHERE lista_id = v_lista_id;

    -- Atualizar cache da lista
    UPDATE instacar_listas
    SET 
      total_clientes_cache = v_total_clientes,
      ultima_atualizacao = NOW()
    WHERE id = v_lista_id;

    -- Vincular lista à campanha
    UPDATE instacar_campanhas
    SET lista_id = v_lista_id
    WHERE id = v_campanha.id;

    -- Log da migração
    RAISE NOTICE 'Migrada campanha "%" (ID: %): % clientes -> Lista ID: %', 
      v_campanha.nome, 
      v_campanha.id, 
      v_total_clientes, 
      v_lista_id;
  END LOOP;

  RAISE NOTICE 'Migração concluída!';
END $$;

-- ============================================================================
-- Verificação Pós-Migração
-- ============================================================================

-- Verificar quantas campanhas foram migradas
SELECT 
  COUNT(*) as total_campanhas_migradas,
  COUNT(DISTINCT lista_id) as total_listas_criadas
FROM instacar_campanhas
WHERE lista_id IS NOT NULL;

-- Verificar total de clientes migrados
SELECT 
  COUNT(*) as total_clientes_migrados
FROM instacar_listas_clientes llc
INNER JOIN instacar_listas l ON l.id = llc.lista_id
WHERE l.nome LIKE 'Lista Legado:%';

-- Listar campanhas migradas
SELECT 
  c.id as campanha_id,
  c.nome as campanha_nome,
  l.id as lista_id,
  l.nome as lista_nome,
  l.total_clientes_cache as total_clientes
FROM instacar_campanhas c
INNER JOIN instacar_listas l ON l.id = c.lista_id
WHERE l.nome LIKE 'Lista Legado:%'
ORDER BY c.created_at DESC;

