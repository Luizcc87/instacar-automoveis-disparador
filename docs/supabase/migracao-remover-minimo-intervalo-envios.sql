-- ============================================================================
-- Migração: Remover validação de mínimo de 60s no intervalo entre envios
-- ============================================================================
-- Data: Dezembro 2025
-- Descrição: Altera constraint para permitir valores a partir de 1 segundo
--            ao invés de 60 segundos, permitindo maior flexibilidade
-- ============================================================================

-- Remover constraint antiga
ALTER TABLE instacar_campanhas
DROP CONSTRAINT IF EXISTS check_intervalo_envios_segundos;

-- Recriar constraint com novo mínimo (1 segundo ao invés de 60)
ALTER TABLE instacar_campanhas
ADD CONSTRAINT check_intervalo_envios_segundos 
CHECK (
  intervalo_envios_segundos IS NULL 
  OR (intervalo_envios_segundos >= 1 AND intervalo_envios_segundos <= 300)
);

-- Comentário
COMMENT ON CONSTRAINT check_intervalo_envios_segundos ON instacar_campanhas IS 
'Valida que intervalo_envios_segundos seja NULL (usa padrão) ou entre 1 e 300 segundos';

