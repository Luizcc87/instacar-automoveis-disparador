-- ============================================================================
-- Seed: Configurações Globais da Empresa
-- Dados padrão para instacar_configuracoes_empresa
-- ============================================================================

-- Limpar dados existentes (opcional - descomente se quiser resetar)
-- DELETE FROM instacar_configuracoes_empresa;

-- ============================================================================
-- Categoria: Políticas
-- ============================================================================

INSERT INTO instacar_configuracoes_empresa (chave, categoria, titulo, conteudo, descricao, ordem, ativo)
VALUES 
  (
    'politicas.tom_voz',
    'politicas',
    'Tom de Voz',
    'Use tom amigável, profissional e caloroso. Evite termos técnicos. Seja empático e próximo do cliente, mas mantenha profissionalismo. Use linguagem clara e acessível.',
    'Define o tom de voz padrão para todas as mensagens',
    1,
    TRUE
  ),
  (
    'politicas.regras_comunicacao',
    'politicas',
    'Regras de Comunicação',
    'Sempre chame o cliente pelo nome. Mantenha mensagens breves (máximo 280 caracteres). Use emojis com moderação. Evite mensagens muito longas ou com múltiplos parágrafos.',
    'Regras gerais de comunicação com clientes',
    2,
    TRUE
  ),
  (
    'politicas.tratamento_cliente',
    'politicas',
    'Tratamento do Cliente',
    'Trate o cliente com respeito e cordialidade. Use "você" ou "senhor/senhora" conforme o contexto. Demonstre interesse genuíno em ajudar.',
    'Como tratar o cliente nas mensagens',
    3,
    TRUE
  );

-- ============================================================================
-- Categoria: Sobre a Empresa
-- ============================================================================

INSERT INTO instacar_configuracoes_empresa (chave, categoria, titulo, conteudo, descricao, ordem, ativo)
VALUES 
  (
    'sobre_empresa.nome',
    'sobre_empresa',
    'Nome da Empresa',
    'Instacar Automóveis',
    'Nome oficial da empresa',
    10,
    TRUE
  ),
  (
    'sobre_empresa.missao',
    'sobre_empresa',
    'Missão',
    'Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, oferecendo qualidade, transparência e confiança em cada negócio.',
    'Missão da empresa',
    11,
    TRUE
  ),
  (
    'sobre_empresa.valores',
    'sobre_empresa',
    'Valores',
    'Valorizamos a transparência, o comprometimento com a qualidade, o respeito ao cliente e a inovação constante em nossos processos.',
    'Valores da empresa',
    12,
    TRUE
  ),
  (
    'sobre_empresa.diferenciais',
    'sobre_empresa',
    'Diferenciais',
    'Somos especializados em veículos seminovos e usados, com ampla variedade de opções, financiamento facilitado e atendimento personalizado.',
    'Principais diferenciais da empresa',
    13,
    TRUE
  );

-- ============================================================================
-- Categoria: Contato
-- ============================================================================

INSERT INTO instacar_configuracoes_empresa (chave, categoria, titulo, conteudo, descricao, ordem, ativo)
VALUES 
  (
    'contato.endereco',
    'contato',
    'Endereço',
    'Estamos localizados em uma localização estratégica para melhor atendê-lo. Entre em contato para conhecer nosso endereço completo.',
    'Endereço da empresa (pode ser genérico ou específico)',
    20,
    TRUE
  ),
  (
    'contato.horario_funcionamento',
    'contato',
    'Horário de Funcionamento',
    'Funcionamos de segunda a sexta, das 9h às 18h, e aos sábados das 9h às 13h. Estamos sempre disponíveis para atendê-lo!',
    'Horário de funcionamento da empresa',
    21,
    TRUE
  ),
  (
    'contato.canais_atendimento',
    'contato',
    'Canais de Atendimento',
    'Você pode nos contatar via WhatsApp, telefone ou visitar nossa loja. Estamos sempre prontos para ajudar!',
    'Canais disponíveis para atendimento',
    22,
    TRUE
  );

-- ============================================================================
-- Categoria: Ofertas
-- ============================================================================

INSERT INTO instacar_configuracoes_empresa (chave, categoria, titulo, conteudo, descricao, ordem, ativo)
VALUES 
  (
    'ofertas.promocoes_gerais',
    'ofertas',
    'Promoções Gerais',
    'Temos sempre ofertas especiais e condições facilitadas para você. Entre em contato para conhecer nossas promoções atuais!',
    'Texto genérico sobre promoções',
    30,
    TRUE
  ),
  (
    'ofertas.condicoes_pagamento',
    'ofertas',
    'Condições de Pagamento',
    'Oferecemos diversas formas de pagamento, incluindo financiamento facilitado, entrada facilitada e condições especiais para você.',
    'Informações sobre condições de pagamento',
    31,
    TRUE
  );

-- ============================================================================
-- Categoria: Produtos
-- ============================================================================

INSERT INTO instacar_configuracoes_empresa (chave, categoria, titulo, conteudo, descricao, ordem, ativo)
VALUES 
  (
    'produtos.tipos_veiculos',
    'produtos',
    'Tipos de Veículos',
    'Trabalhamos com veículos seminovos e usados de todas as marcas e modelos, sempre com qualidade garantida e procedência verificada.',
    'Tipos de veículos comercializados',
    40,
    TRUE
  ),
  (
    'produtos.garantia',
    'produtos',
    'Garantia',
    'Todos os nossos veículos passam por rigorosa vistoria e oferecemos garantia para sua tranquilidade na compra.',
    'Informações sobre garantia dos veículos',
    41,
    TRUE
  );

-- ============================================================================
-- Notas
-- ============================================================================

-- Variáveis disponíveis nos conteúdos:
-- {{nome_cliente}} - Nome do cliente
-- {{telefone}} - Telefone do cliente
-- {{data_hoje}} - Data atual formatada
-- {{periodo_ano}} - Período da campanha (natal, black-friday, etc.)
-- {{veiculos}} - Array de veículos (se usar_veiculos=true)
-- {{vendedor}} - Nome do vendedor (se usar_vendedor=true)

