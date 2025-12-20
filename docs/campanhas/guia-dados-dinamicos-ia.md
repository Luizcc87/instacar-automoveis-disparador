# Guia Completo: Dados Dinâmicos para Agente IA

Este guia explica como usar o sistema de dados dinâmicos para personalizar o prompt do agente de IA em campanhas.

## Visão Geral

O sistema permite cadastrar e gerenciar dados básicos que serão utilizados dinamicamente no prompt do agente de IA, permitindo:

- **Configurações globais da empresa**: Políticas, tom de voz, diretrizes que podem ser sobrescritas por campanha
- **Sessões de contexto pré-definidas**: Blocos de contexto que podem ser habilitados/desabilitados por campanha
- **Templates de prompt completos**: Templates prontos que podem ser selecionados ao criar campanha
- **Sobrescrita de dados globais**: Cada campanha pode sobrescrever configurações globais quando necessário

## Estrutura do Sistema

### 1. Configurações Globais da Empresa

Armazenam dados básicos da empresa que podem ser usados em todas as campanhas.

**Categorias disponíveis:**
- `politicas`: Tom de voz, regras de comunicação, tratamento do cliente
- `sobre_empresa`: Nome, missão, valores, diferenciais
- `contato`: Endereço, horário de funcionamento, canais de atendimento
- `ofertas`: Promoções gerais, condições de pagamento
- `produtos`: Tipos de veículos, garantia

**Como usar:**
1. Acesse a seção "Configurações da Empresa" na interface web
2. Crie ou edite configurações por categoria
3. Use variáveis nos conteúdos (ex: `{{nome_cliente}}`, `{{data_hoje}}`)
4. Configure ordem de exibição

**Exemplo de configuração:**
```
Chave: politicas.tom_voz
Categoria: politicas
Título: Tom de Voz
Conteúdo: Use tom amigável, profissional e caloroso. Evite termos técnicos.
```

### 2. Sessões de Contexto IA

Blocos pré-definidos de contexto que podem ser habilitados por campanha.

**Tipos de sessões:**
- `sobre_empresa`: Informações institucionais
- `ofertas_especiais`: Informações sobre ofertas e promoções
- `historico_cliente`: Histórico de relacionamento com o cliente
- `tom_voz`: Instruções sobre tom de voz
- `contato`: Informações de contato
- `produtos`: Informações sobre produtos/serviços
- `custom`: Sessão customizável

**Como usar:**
1. Acesse a seção "Sessões de Contexto" na interface web
2. Crie ou edite sessões com templates de conteúdo
3. Configure se deve estar habilitada por padrão
4. Use variáveis nos templates (ex: `{{nome_cliente}}`, `{{veiculos.length}}`)

**Exemplo de sessão:**
```
Nome: Sobre a Empresa
Slug: sobre_empresa
Conteúdo Template: A Instacar Automóveis é uma empresa especializada...
Habilitado por Padrão: Sim
```

### 3. Templates de Prompt

Templates completos de prompt que podem ser selecionados ao criar campanha.

**Categorias disponíveis:**
- `natal`: Templates para campanhas de Natal
- `black-friday`: Templates promocionais
- `relacionamento`: Templates de relacionamento e fidelização
- `promocional`: Templates promocionais genéricos
- `custom`: Templates customizáveis

**Como usar:**
1. Acesse a seção "Templates de Prompt" na interface web
2. Crie ou edite templates com prompt completo
3. Configure sessões e configurações habilitadas por padrão
4. Selecione o template ao criar/editar campanha

**Exemplo de template:**
```
Nome: Natal Genérico
Categoria: natal
Prompt Completo: Deseje um Feliz Natal e um Próspero Ano Novo...
Sessões Habilitadas: ["sobre_empresa", "tom_voz"]
```

## Como Funciona no Workflow N8N

### Fluxo de Montagem do Contexto

```
1. Obter Campanha do Supabase
   ↓
2. Buscar Configurações Globais (se usar_configuracoes_globais = TRUE)
   ↓
3. Aplicar Sobrescritas da Campanha
   ↓
4. Buscar Sessões Habilitadas
   ↓
5. Buscar Template (se template_prompt_id preenchido)
   ↓
6. Montar Contexto Dinâmico
   ↓
7. Inserir no Prompt do AI Agent
```

### Estrutura do Contexto Gerado

```
=== DADOS DO CLIENTE ===
Cliente: [Nome]
[Veículos se usar_veiculos=true]
[Vendedor se usar_vendedor=true]

=== CONFIGURAÇÕES DA EMPRESA ===
[Blocos de configurações globais/sobrescritas]

=== SESSÕES DE CONTEXTO ===
[Sessão 1: Sobre a Empresa]
[Sessão 2: Ofertas Especiais]
...

=== INSTRUÇÕES DA CAMPANHA ===
[Prompt da campanha ou template aplicado]
```

## Variáveis Disponíveis

Variáveis que podem ser usadas em templates, sessões e configurações:

- `{{nome_cliente}}` - Nome do cliente
- `{{telefone}}` - Telefone do cliente
- `{{data_hoje}}` - Data atual formatada (ex: "segunda-feira, 15 de janeiro de 2025")
- `{{periodo_ano}}` - Período da campanha (natal, black-friday, etc.)
- `{{veiculos.length}}` - Quantidade de veículos (se usar_veiculos=true)
- `{{vendedor}}` - Nome do vendedor (se usar_vendedor=true)

**Exemplo de uso:**
```
Olá {{nome_cliente}}! Hoje é {{data_hoje}} e temos ofertas especiais para você.
Você já adquiriu {{veiculos.length}} veículo(s) conosco.
```

## Configuração de Campanha

### Campos Disponíveis

1. **Usar Configurações Globais**: Checkbox para usar configurações globais como base
2. **Template de Prompt**: Select para escolher um template (opcional)
3. **Sessões de Contexto Habilitadas**: Checkboxes para selecionar sessões
4. **Sobrescrever Configurações Globais**: Seção colapsável para sobrescrever configurações específicas

### Exemplos de Uso

#### Campanha de Natal (Genérica)
- Template: "Natal Genérico"
- Sessões habilitadas: "Sobre a Empresa", "Tom de Voz"
- Configurações: Usar globais
- Resultado: Mensagem genérica de Natal sem mencionar veículos

#### Campanha Black Friday (Promocional)
- Template: "Black Friday Promocional"
- Sessões habilitadas: "Ofertas Especiais", "Produtos", "Histórico do Cliente"
- Configurações: Sobrescrever "ofertas.desconto" com "20% OFF"
- Resultado: Mensagem promocional focada em ofertas e produtos

#### Campanha Customizada
- Template: Nenhum (usar prompt personalizado)
- Sessões habilitadas: Todas
- Configurações: Usar globais + sobrescrever tom de voz
- Resultado: Mensagem totalmente customizada

## Boas Práticas

1. **Organize por Categoria**: Agrupe configurações e sessões por categoria para facilitar manutenção
2. **Use Variáveis**: Aproveite variáveis para personalizar conteúdo dinamicamente
3. **Teste Templates**: Sempre teste templates em campanhas de teste antes de usar em produção
4. **Documente Sessões**: Adicione descrições claras nas sessões para facilitar seleção
5. **Mantenha Consistência**: Use configurações globais para manter consistência entre campanhas

## Troubleshooting

### Problema: Variáveis não são substituídas
**Solução**: Verifique se a variável está escrita corretamente (ex: `{{nome_cliente}}` com chaves duplas)

### Problema: Sessões não aparecem no contexto
**Solução**: Verifique se a sessão está ativa e foi habilitada na campanha

### Problema: Template não é aplicado
**Solução**: Verifique se o template está ativo e foi selecionado na campanha

### Problema: Configurações sobrescritas não funcionam
**Solução**: Verifique se o campo não está vazio e se a chave está correta

## Referência Rápida

### Criar Nova Configuração
1. Acesse "Configurações da Empresa"
2. Clique em "Nova Configuração"
3. Preencha chave, categoria, título e conteúdo
4. Salve

### Criar Nova Sessão
1. Acesse "Sessões de Contexto"
2. Clique em "Nova Sessão"
3. Preencha nome, slug, template de conteúdo
4. Configure se deve estar habilitada por padrão
5. Salve

### Criar Novo Template
1. Acesse "Templates de Prompt"
2. Clique em "Novo Template"
3. Preencha nome, prompt completo, categoria
4. Selecione sessões e configurações habilitadas
5. Salve

### Usar em Campanha
1. Ao criar/editar campanha, role até "Dados Dinâmicos do Agente IA"
2. Selecione template (opcional)
3. Marque sessões desejadas
4. Sobrescreva configurações se necessário
5. Salve a campanha

