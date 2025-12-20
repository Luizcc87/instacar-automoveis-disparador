# Exemplos de Templates e Sessões

Este documento contém exemplos práticos de templates de prompt e sessões de contexto para uso no sistema.

## Exemplos de Sessões de Contexto

### 1. Sessão: Sobre a Empresa

**Nome:** Sobre a Empresa  
**Slug:** `sobre_empresa`  
**Categoria:** institucional  
**Habilitado por Padrão:** Sim

**Template de Conteúdo:**
```
A Instacar Automóveis é uma empresa especializada em veículos seminovos e usados. 
Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, 
oferecendo qualidade, transparência e confiança em cada negócio. 
Valorizamos a transparência, o comprometimento com a qualidade, o respeito ao cliente 
e a inovação constante em nossos processos.
```

**Exemplo Preenchido:**
```
A Instacar Automóveis é uma empresa especializada em veículos seminovos e usados. 
Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, 
oferecendo qualidade, transparência e confiança em cada negócio. 
Valorizamos a transparência, o comprometimento com a qualidade, o respeito ao cliente 
e a inovação constante em nossos processos.
```

**Descrição:** Informações institucionais sobre a empresa. Use em campanhas de relacionamento e institucionais.

---

### 2. Sessão: Ofertas Especiais

**Nome:** Ofertas Especiais  
**Slug:** `ofertas_especiais`  
**Categoria:** promocional  
**Habilitado por Padrão:** Não

**Template de Conteúdo:**
```
Temos ofertas especiais e condições facilitadas para você, {{nome_cliente}}! 
Entre em contato para conhecer nossas promoções atuais e condições de pagamento 
que cabem no seu bolso.
```

**Exemplo Preenchido:**
```
Temos ofertas especiais e condições facilitadas para você, João Silva! 
Entre em contato para conhecer nossas promoções atuais e condições de pagamento 
que cabem no seu bolso.
```

**Descrição:** Informações sobre ofertas e promoções. Use em campanhas promocionais como Black Friday, Dia das Mães, etc.

---

### 3. Sessão: Histórico do Cliente

**Nome:** Histórico do Cliente  
**Slug:** `historico_cliente`  
**Categoria:** relacionamento  
**Habilitado por Padrão:** Não

**Template de Conteúdo:**
```
{{nome_cliente}}, você já é nosso cliente há algum tempo e valorizamos muito nosso relacionamento. 
{{#if veiculos}}Você já adquiriu {{veiculos.length}} veículo(s) conosco.{{/if}} 
Estamos sempre à disposição para continuar oferecendo o melhor atendimento.
```

**Exemplo Preenchido:**
```
João Silva, você já é nosso cliente há algum tempo e valorizamos muito nosso relacionamento. 
Você já adquiriu 2 veículo(s) conosco. 
Estamos sempre à disposição para continuar oferecendo o melhor atendimento.
```

**Descrição:** Informações sobre o histórico de relacionamento com o cliente. Use em campanhas de fidelização e relacionamento.

---

### 4. Sessão: Tom de Voz

**Nome:** Tom de Voz  
**Slug:** `tom_voz`  
**Categoria:** politicas  
**Habilitado por Padrão:** Sim

**Template de Conteúdo:**
```
Use tom amigável, profissional e caloroso. Evite termos técnicos. 
Seja empático e próximo do cliente, mas mantenha profissionalismo. 
Use linguagem clara e acessível. Sempre chame o cliente pelo nome.
```

**Exemplo Preenchido:**
```
Use tom amigável, profissional e caloroso. Evite termos técnicos. 
Seja empático e próximo do cliente, mas mantenha profissionalismo. 
Use linguagem clara e acessível. Sempre chame o cliente pelo nome.
```

**Descrição:** Instruções sobre o tom de voz a ser usado nas mensagens. Use quando quiser reforçar o estilo de comunicação.

---

## Exemplos de Templates de Prompt

### 1. Template: Natal Genérico

**Nome:** Natal Genérico  
**Categoria:** natal  
**Ativo:** Sim

**Prompt Completo:**
```
Deseje um Feliz Natal e um Próspero Ano Novo de forma calorosa e genuína. 
Mencione que a Instacar Automóveis valoriza o relacionamento com {{nome_cliente}} 
e está sempre à disposição. Não mencione veículos específicos ou ofertas comerciais. 
Seja breve, amigável e mantenha o foco na celebração das festas de fim de ano.
```

**Sessões Habilitadas:**
- `sobre_empresa`
- `tom_voz`

**Configurações Habilitadas:**
- `politicas.tom_voz`
- `politicas.regras_comunicacao`

**Exemplo de Uso:**
Use este template para campanhas de Natal que focam em relacionamento e boas festas, sem mencionar produtos específicos.

**Mensagem Gerada (Exemplo):**
```
Olá João Silva! Desejamos um Feliz Natal e um Próspero Ano Novo! 
Que 2026 traga muitas realizações. Estamos à disposição para o que precisar!
```

---

### 2. Template: Black Friday Promocional

**Nome:** Black Friday Promocional  
**Categoria:** black-friday  
**Ativo:** Sim

**Prompt Completo:**
```
Crie uma mensagem promocional para Black Friday enfatizando ofertas especiais 
e condições facilitadas. Mencione o veículo do cliente {{#if veiculos}}({{veiculos.[0].veiculo}}){{/if}} 
se relevante. Crie senso de urgência e destaque os benefícios exclusivos. 
Seja direto, entusiasmado mas profissional. Mencione condições de pagamento facilitadas.
```

**Sessões Habilitadas:**
- `ofertas_especiais`
- `produtos`
- `historico_cliente`

**Configurações Habilitadas:**
- `ofertas.promocoes_gerais`
- `ofertas.condicoes_pagamento`
- `produtos.tipos_veiculos`

**Exemplo de Uso:**
Use este template para campanhas promocionais como Black Friday, Dia das Mães, Dia dos Pais, etc.

**Mensagem Gerada (Exemplo):**
```
Olá Maria Santos! Black Friday na Instacar! 
Ofertas especiais para seu Honda Civic 2020. 
Condições facilitadas e até 20% OFF. Não perca!
```

---

### 3. Template: Relacionamento Personalizado

**Nome:** Relacionamento Personalizado  
**Categoria:** relacionamento  
**Ativo:** Sim

**Prompt Completo:**
```
Crie uma mensagem personalizada de relacionamento mencionando o histórico de compras 
de {{nome_cliente}} {{#if veiculos}}({{veiculos.length}} veículo(s) adquirido(s)){{/if}} 
e o vendedor responsável {{#if vendedor}}({{vendedor}}){{/if}}. 
Agradeça pela confiança depositada na Instacar Automóveis e reforce o compromisso 
com o atendimento de qualidade. Seja caloroso e genuíno.
```

**Sessões Habilitadas:**
- `sobre_empresa`
- `historico_cliente`
- `tom_voz`

**Configurações Habilitadas:**
- `politicas.tom_voz`
- `politicas.tratamento_cliente`
- `sobre_empresa.missao`

**Exemplo de Uso:**
Use este template para campanhas de relacionamento, agradecimento e fidelização de clientes.

**Mensagem Gerada (Exemplo):**
```
Olá Pedro Oliveira! Agradecemos pela confiança em adquirir 2 veículos conosco. 
Seu vendedor Carlos Mendes está sempre à disposição. 
Continuamos comprometidos com seu atendimento!
```

---

## Exemplos de Configurações da Empresa

### 1. Configuração: Tom de Voz

**Chave:** `politicas.tom_voz`  
**Categoria:** politicas  
**Título:** Tom de Voz

**Conteúdo:**
```
Use tom amigável, profissional e caloroso. Evite termos técnicos. 
Seja empático e próximo do cliente, mas mantenha profissionalismo. 
Use linguagem clara e acessível.
```

**Descrição:** Define o tom de voz padrão para todas as mensagens

---

### 2. Configuração: Regras de Comunicação

**Chave:** `politicas.regras_comunicacao`  
**Categoria:** politicas  
**Título:** Regras de Comunicação

**Conteúdo:**
```
Sempre chame o cliente pelo nome. Mantenha mensagens breves (máximo 280 caracteres). 
Use emojis com moderação. Evite mensagens muito longas ou com múltiplos parágrafos.
```

**Descrição:** Regras gerais de comunicação com clientes

---

### 3. Configuração: Missão

**Chave:** `sobre_empresa.missao`  
**Categoria:** sobre_empresa  
**Título:** Missão

**Conteúdo:**
```
Nossa missão é proporcionar a melhor experiência na compra e venda de veículos, 
oferecendo qualidade, transparência e confiança em cada negócio.
```

**Descrição:** Missão da empresa

---

## Dicas de Criação

### Para Sessões

1. **Seja Específico**: Defina claramente o propósito da sessão
2. **Use Variáveis**: Aproveite variáveis para personalização
3. **Mantenha Conciso**: Sessões devem ser objetivas
4. **Documente**: Adicione descrições claras

### Para Templates

1. **Contexto Claro**: Forneça contexto suficiente para a IA
2. **Instruções Específicas**: Seja claro sobre o que deseja
3. **Teste**: Sempre teste templates antes de usar em produção
4. **Itere**: Ajuste templates baseado em resultados

### Para Configurações

1. **Organize por Categoria**: Agrupe configurações relacionadas
2. **Use Chaves Descritivas**: Facilite identificação (ex: `politicas.tom_voz`)
3. **Mantenha Atualizado**: Revise configurações periodicamente
4. **Documente Uso**: Explique quando usar cada configuração

## Variáveis Disponíveis

- `{{nome_cliente}}` - Nome do cliente
- `{{telefone}}` - Telefone do cliente  
- `{{data_hoje}}` - Data atual formatada
- `{{periodo_ano}}` - Período da campanha
- `{{veiculos.length}}` - Quantidade de veículos
- `{{vendedor}}` - Nome do vendedor

## Estrutura Condicional

Use `{{#if variavel}}...{{/if}}` para conteúdo condicional:

```
{{#if veiculos}}
Você já adquiriu {{veiculos.length}} veículo(s) conosco.
{{/if}}
```

