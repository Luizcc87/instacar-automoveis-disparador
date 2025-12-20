-- ============================================================================
-- Seed: Sessões de Contexto IA
-- Dados padrão para instacar_sessoes_contexto_ia
-- ============================================================================

-- Limpar dados existentes (opcional - descomente se quiser resetar)
-- DELETE FROM instacar_sessoes_contexto_ia;

-- ============================================================================
-- Sessão: Sobre a Empresa
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Sobre a Empresa',
  'sobre_empresa',
  'institucional',
  'A Instacar Automóveis é uma empresa especializada em veículos seminovos e usados. Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, oferecendo qualidade, transparência e confiança em cada negócio. Valorizamos a transparência, o comprometimento com a qualidade, o respeito ao cliente e a inovação constante.',
  'A Instacar Automóveis é uma empresa especializada em veículos seminovos e usados. Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, oferecendo qualidade, transparência e confiança em cada negócio. Valorizamos a transparência, o comprometimento com a qualidade, o respeito ao cliente e a inovação constante.',
  'Informações institucionais sobre a empresa. Use em campanhas de relacionamento e institucionais.',
  TRUE,
  1,
  TRUE
);

-- ============================================================================
-- Sessão: Ofertas Especiais
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Ofertas Especiais',
  'ofertas_especiais',
  'promocional',
  'Temos ofertas especiais e condições facilitadas para você, {{nome_cliente}}! Entre em contato para conhecer nossas promoções atuais e condições de pagamento que cabem no seu bolso.',
  'Temos ofertas especiais e condições facilitadas para você, João Silva! Entre em contato para conhecer nossas promoções atuais e condições de pagamento que cabem no seu bolso.',
  'Informações sobre ofertas e promoções. Use em campanhas promocionais como Black Friday, Dia das Mães, etc.',
  FALSE,
  2,
  TRUE
);

-- ============================================================================
-- Sessão: Histórico do Cliente
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Histórico do Cliente',
  'historico_cliente',
  'relacionamento',
  '{{nome_cliente}}, você já é nosso cliente há algum tempo e valorizamos muito nosso relacionamento. {{#if veiculos}}Você já adquiriu {{veiculos.length}} veículo(s) conosco.{{/if}} Estamos sempre à disposição para continuar oferecendo o melhor atendimento.',
  'João Silva, você já é nosso cliente há algum tempo e valorizamos muito nosso relacionamento. Você já adquiriu 2 veículo(s) conosco. Estamos sempre à disposição para continuar oferecendo o melhor atendimento.',
  'Informações sobre o histórico de relacionamento com o cliente. Use em campanhas de fidelização e relacionamento.',
  FALSE,
  3,
  TRUE
);

-- ============================================================================
-- Sessão: Tom de Voz
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Tom de Voz',
  'tom_voz',
  'politicas',
  'Use tom amigável, profissional e caloroso. Evite termos técnicos. Seja empático e próximo do cliente, mas mantenha profissionalismo. Use linguagem clara e acessível. Sempre chame o cliente pelo nome.',
  'Use tom amigável, profissional e caloroso. Evite termos técnicos. Seja empático e próximo do cliente, mas mantenha profissionalismo. Use linguagem clara e acessível. Sempre chame o cliente pelo nome.',
  'Instruções sobre o tom de voz a ser usado nas mensagens. Use quando quiser reforçar o estilo de comunicação.',
  TRUE,
  4,
  TRUE
);

-- ============================================================================
-- Sessão: Informações de Contato
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Informações de Contato',
  'contato',
  'institucional',
  'Estamos sempre disponíveis para atendê-lo! Funcionamos de segunda a sexta, das 9h às 18h, e aos sábados das 9h às 13h. Você pode nos contatar via WhatsApp, telefone ou visitar nossa loja.',
  'Estamos sempre disponíveis para atendê-lo! Funcionamos de segunda a sexta, das 9h às 18h, e aos sábados das 9h às 13h. Você pode nos contatar via WhatsApp, telefone ou visitar nossa loja.',
  'Informações sobre como entrar em contato com a empresa. Use quando quiser destacar canais de atendimento.',
  FALSE,
  5,
  TRUE
);

-- ============================================================================
-- Sessão: Informações de Produtos
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Informações de Produtos',
  'produtos',
  'comercial',
  'Trabalhamos com veículos seminovos e usados de todas as marcas e modelos, sempre com qualidade garantida e procedência verificada. Todos os nossos veículos passam por rigorosa vistoria e oferecemos garantia para sua tranquilidade na compra.',
  'Trabalhamos com veículos seminovos e usados de todas as marcas e modelos, sempre com qualidade garantida e procedência verificada. Todos os nossos veículos passam por rigorosa vistoria e oferecemos garantia para sua tranquilidade na compra.',
  'Informações sobre os produtos/serviços oferecidos. Use em campanhas promocionais e comerciais.',
  FALSE,
  6,
  TRUE
);

-- ============================================================================
-- Sessão: Customizável
-- ============================================================================

INSERT INTO instacar_sessoes_contexto_ia (
  nome, slug, categoria, conteudo_template, exemplo_preenchido, descricao, 
  habilitado_por_padrao, ordem, ativo
)
VALUES (
  'Sessão Customizável',
  'custom',
  'custom',
  'Esta é uma sessão customizável. Edite o conteúdo conforme necessário para sua campanha específica.',
  'Esta é uma sessão customizável. Edite o conteúdo conforme necessário para sua campanha específica.',
  'Sessão genérica que pode ser customizada para necessidades específicas de cada campanha.',
  FALSE,
  99,
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

-- As sessões serão incluídas no contexto da IA quando habilitadas na campanha.
-- O conteúdo será processado e as variáveis serão substituídas pelos valores reais.

