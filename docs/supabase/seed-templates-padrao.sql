-- ============================================================================
-- Seed: Templates de Prompt
-- Dados padrão para instacar_templates_prompt
-- ============================================================================

-- Limpar dados existentes (opcional - descomente se quiser resetar)
-- DELETE FROM instacar_templates_prompt;

-- ============================================================================
-- Template: Natal Genérico
-- ============================================================================

INSERT INTO instacar_templates_prompt (
  nome, descricao, prompt_completo, sessoes_habilitadas, 
  configuracoes_empresa_habilitadas, categoria, exemplo_uso, ativo
)
VALUES (
  'Natal Genérico',
  'Template para campanhas de Natal sem mencionar veículos específicos. Foco em relacionamento e boas festas.',
  'Deseje um Feliz Natal e um Próspero Ano Novo de forma calorosa e genuína. Mencione que a Instacar Automóveis valoriza o relacionamento com {{nome_cliente}} e está sempre à disposição. Não mencione veículos específicos ou ofertas comerciais. Seja breve, amigável e mantenha o foco na celebração das festas de fim de ano.',
  '["sobre_empresa", "tom_voz"]'::jsonb,
  '["politicas.tom_voz", "politicas.regras_comunicacao"]'::jsonb,
  'natal',
  'Use este template para campanhas de Natal que focam em relacionamento e boas festas, sem mencionar produtos específicos.',
  TRUE
);

-- ============================================================================
-- Template: Black Friday Promocional
-- ============================================================================

INSERT INTO instacar_templates_prompt (
  nome, descricao, prompt_completo, sessoes_habilitadas, 
  configuracoes_empresa_habilitadas, categoria, exemplo_uso, ativo
)
VALUES (
  'Black Friday Promocional',
  'Template para campanhas promocionais como Black Friday. Foco em ofertas, produtos e senso de urgência.',
  'Crie uma mensagem promocional para Black Friday enfatizando ofertas especiais e condições facilitadas. Mencione o veículo do cliente {{#if veiculos}}({{veiculos.[0].veiculo}}){{/if}} se relevante. Crie senso de urgência e destaque os benefícios exclusivos. Seja direto, entusiasmado mas profissional. Mencione condições de pagamento facilitadas.',
  '["ofertas_especiais", "produtos", "historico_cliente"]'::jsonb,
  '["ofertas.promocoes_gerais", "ofertas.condicoes_pagamento", "produtos.tipos_veiculos"]'::jsonb,
  'black-friday',
  'Use este template para campanhas promocionais como Black Friday, Dia das Mães, Dia dos Pais, etc.',
  TRUE
);

-- ============================================================================
-- Template: Relacionamento Personalizado
-- ============================================================================

INSERT INTO instacar_templates_prompt (
  nome, descricao, prompt_completo, sessoes_habilitadas, 
  configuracoes_empresa_habilitadas, categoria, exemplo_uso, ativo
)
VALUES (
  'Relacionamento Personalizado',
  'Template para campanhas de relacionamento e fidelização. Foco no histórico do cliente e vendedor.',
  'Crie uma mensagem personalizada de relacionamento mencionando o histórico de compras de {{nome_cliente}} {{#if veiculos}}({{veiculos.length}} veículo(s) adquirido(s)){{/if}} e o vendedor responsável {{#if vendedor}}({{vendedor}}){{/if}}. Agradeça pela confiança depositada na Instacar Automóveis e reforce o compromisso com o atendimento de qualidade. Seja caloroso e genuíno.',
  '["sobre_empresa", "historico_cliente", "tom_voz"]'::jsonb,
  '["politicas.tom_voz", "politicas.tratamento_cliente", "sobre_empresa.missao"]'::jsonb,
  'relacionamento',
  'Use este template para campanhas de relacionamento, agradecimento e fidelização de clientes.',
  TRUE
);

-- ============================================================================
-- Template: Promocional Genérico
-- ============================================================================

INSERT INTO instacar_templates_prompt (
  nome, descricao, prompt_completo, sessoes_habilitadas, 
  configuracoes_empresa_habilitadas, categoria, exemplo_uso, ativo
)
VALUES (
  'Promocional Genérico',
  'Template genérico para campanhas promocionais. Pode ser adaptado para diferentes ocasiões.',
  'Crie uma mensagem promocional destacando ofertas especiais e condições facilitadas para {{nome_cliente}}. Mencione que temos sempre novidades e condições que cabem no seu bolso. Convide para conhecer nossas ofertas. Seja entusiasmado mas profissional.',
  '["ofertas_especiais", "produtos", "contato"]'::jsonb,
  '["ofertas.promocoes_gerais", "ofertas.condicoes_pagamento"]'::jsonb,
  'promocional',
  'Use este template para campanhas promocionais genéricas que não se encaixam em categorias específicas.',
  TRUE
);

-- ============================================================================
-- Template: Customizável
-- ============================================================================

INSERT INTO instacar_templates_prompt (
  nome, descricao, prompt_completo, sessoes_habilitadas, 
  configuracoes_empresa_habilitadas, categoria, exemplo_uso, ativo
)
VALUES (
  'Template Customizável',
  'Template base que pode ser totalmente customizado para necessidades específicas.',
  'Crie uma mensagem personalizada seguindo as instruções específicas da campanha. Use o tom de voz definido e as informações de contexto fornecidas. Adapte o conteúdo conforme necessário.',
  '[]'::jsonb,
  '[]'::jsonb,
  'custom',
  'Use este template como base para criar prompts totalmente customizados. Edite o prompt_completo conforme necessário.',
  TRUE
);

-- ============================================================================
-- Notas
-- ============================================================================

-- Variáveis disponíveis nos templates:
-- {{nome_cliente}} - Nome do cliente
-- {{telefone}} - Telefone do cliente
-- {{data_hoje}} - Data atual formatada
-- {{periodo_ano}} - Período da campanha (natal, black-friday, etc.)
-- {{veiculos}} - Array de veículos (se usar_veiculos=true)
-- {{vendedor}} - Nome do vendedor (se usar_vendedor=true)

-- sessoes_habilitadas: Array de slugs de sessões que serão habilitadas automaticamente
-- configuracoes_empresa_habilitadas: Array de chaves de configurações que serão incluídas

-- Quando um template é selecionado em uma campanha:
-- 1. O prompt_completo será usado como base do prompt da campanha
-- 2. As sessões listadas em sessoes_habilitadas serão automaticamente habilitadas
-- 3. As configurações listadas em configuracoes_empresa_habilitadas serão incluídas no contexto

