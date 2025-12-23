-- ============================================================================
-- Migração: Permitir Horários que Cruzam a Meia-Noite
-- Modifica a constraint check_horario_inicio_fim para permitir horários
-- que começam em um dia e terminam no dia seguinte (ex: 19:00 até 00:00)
-- ============================================================================

-- Remover constraint antiga (se existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_horario_inicio_fim' 
    AND conrelid = 'instacar_campanhas'::regclass
  ) THEN
    ALTER TABLE instacar_campanhas
      DROP CONSTRAINT check_horario_inicio_fim;
  END IF;
END $$;

-- Adicionar nova constraint que permite horários que cruzam a meia-noite
-- A constraint permite:
-- 1. horario_inicio < horario_fim (horário normal, ex: 09:00 até 18:00)
-- 2. horario_fim < horario_inicio (cruza meia-noite, ex: 19:00 até 00:00)
-- 3. horario_inicio = horario_fim (não permitido - horário inválido)
ALTER TABLE instacar_campanhas
  ADD CONSTRAINT check_horario_inicio_fim 
  CHECK (horario_inicio != horario_fim);

-- Comentário explicativo
COMMENT ON CONSTRAINT check_horario_inicio_fim ON instacar_campanhas IS 
  'Permite horários normais (inicio < fim) e horários que cruzam a meia-noite (fim < inicio). Exemplos: 09:00-18:00 (normal) ou 19:00-00:00 (cruza meia-noite).';

