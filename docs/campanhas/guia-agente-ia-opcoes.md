# Guia: Agente IA com Dados Opcionais para Campanhas

Este guia explica como usar as flags `usar_veiculos` e `usar_vendedor` para controlar quais dados são incluídos no contexto da IA ao gerar mensagens personalizadas.

## Visão Geral

O sistema permite configurar por campanha quais informações do cliente serão fornecidas à IA:

- **`usar_veiculos`**: Controla se dados de veículos são incluídos
- **`usar_vendedor`**: Controla se o nome do vendedor é incluído

Isso permite criar campanhas genéricas (como Natal/Ano Novo) que não mencionam veículos específicos, enquanto mantém a flexibilidade de campanhas personalizadas (como Black Friday) que usam todos os dados disponíveis.

## Flags Disponíveis

### `usar_veiculos` (BOOLEAN)

**Padrão:** `TRUE`

**Descrição:** Se `TRUE`, inclui dados de veículos adquiridos pelo cliente no contexto da IA. Se `FALSE`, não menciona veículos.

**Quando usar `FALSE`:**
- Campanhas genéricas (Natal, Ano Novo, Páscoa)
- Mensagens de relacionamento que não focam em produtos
- Campanhas de agradecimento ou boas-vindas

**Quando usar `TRUE`:**
- Campanhas promocionais (Black Friday, Dia das Mães)
- Ofertas relacionadas a veículos específicos
- Campanhas de upgrade/troca de veículo

### `usar_vendedor` (BOOLEAN)

**Padrão:** `FALSE`

**Descrição:** Se `TRUE`, inclui o nome do vendedor do veículo mais recente no contexto da IA. Se `FALSE`, não menciona vendedor.

**Quando usar `TRUE`:**
- Campanhas de relacionamento personalizado
- Mensagens que mencionam o atendimento recebido
- Campanhas de fidelização

**Quando usar `FALSE`:**
- Campanhas genéricas
- Mensagens que não focam no relacionamento pessoal
- Campanhas promocionais focadas em produto

## Como o Sistema Funciona

### Seleção de Vendedor

Quando `usar_vendedor = TRUE`, o sistema:

1. Ordena os veículos do cliente por data de compra (mais recente primeiro)
2. Seleciona o vendedor do veículo mais recente
3. Inclui no contexto: `"Vendedor responsável: [Nome do Vendedor]"`

**Nota:** Se o cliente não tiver veículos ou o veículo mais recente não tiver vendedor, o campo não é incluído.

### Construção do Contexto

O contexto enviado à IA é construído dinamicamente:

```javascript
// Sempre incluído
"Cliente: [Nome do Cliente]"

// Incluído se usar_veiculos = TRUE e cliente tem veículos
"Veículos adquiridos:
- [Veículo 1] (Placa: XXX) - Comprado em [Data]
- [Veículo 2] (Placa: YYY) - Comprado em [Data]
Vendedor responsável: [Nome] (se usar_vendedor = TRUE)"

// Sempre incluído
"---
Instruções da campanha:
[Prompt personalizado da campanha]"
```

## Exemplos de Uso

### Exemplo 1: Campanha de Natal (Genérica)

```sql
INSERT INTO instacar_campanhas (
  nome, periodo_ano, prompt_ia, usar_veiculos, usar_vendedor
) VALUES (
  'Natal 2025',
  'natal',
  'Deseje um Feliz Natal de forma calorosa. Mencione oportunidades de fim de ano sem mencionar veículos específicos.',
  false,  -- Não usar veículos
  false   -- Não usar vendedor
);
```

**Contexto gerado:**
```
Cliente: João Silva

---
Instruções da campanha:
Deseje um Feliz Natal de forma calorosa. Mencione oportunidades de fim de ano sem mencionar veículos específicos.
```

### Exemplo 2: Black Friday (Com Veículos)

```sql
INSERT INTO instacar_campanhas (
  nome, periodo_ano, prompt_ia, usar_veiculos, usar_vendedor
) VALUES (
  'Black Friday 2025',
  'black-friday',
  'Enfatize descontos exclusivos. Mencione o veículo do cliente e crie senso de urgência.',
  true,   -- Usar veículos
  false   -- Não usar vendedor
);
```

**Contexto gerado:**
```
Cliente: Maria Santos

Veículos adquiridos:
- Honda Civic 2020 (Placa: ABC1234) - Comprado em 2020-03-15
- Toyota Corolla 2022 (Placa: XYZ5678) - Comprado em 2022-08-20

Este cliente comprou 2 veículos conosco.

---
Instruções da campanha:
Enfatize descontos exclusivos. Mencione o veículo do cliente e crie senso de urgência.
```

### Exemplo 3: Campanha de Relacionamento (Completa)

```sql
INSERT INTO instacar_campanhas (
  nome, periodo_ano, prompt_ia, usar_veiculos, usar_vendedor
) VALUES (
  'Campanha Relacionamento',
  'janeiro',
  'Mensagem personalizada mencionando o vendedor que atendeu o cliente e agradecendo pela confiança.',
  true,   -- Usar veículos
  true    -- Usar vendedor
);
```

**Contexto gerado:**
```
Cliente: Pedro Oliveira

Veículos adquiridos:
- Ford Ranger 2023 (Placa: DEF9012) - Comprado em 2023-11-10

Vendedor responsável: Carlos Mendes

---
Instruções da campanha:
Mensagem personalizada mencionando o vendedor que atendeu o cliente e agradecendo pela confiança.
```

## Validação Inteligente

A interface web inclui validação que detecta inconsistências entre o prompt e as flags:

- Se o prompt menciona "veículo" mas `usar_veiculos = FALSE`, sugere marcar a flag
- Se o prompt menciona "vendedor" mas `usar_vendedor = FALSE`, sugere marcar a flag
- Para campanhas genéricas (natal, ano-novo), sugere desmarcar `usar_veiculos`

## Tratamento de Edge Cases

O sistema trata automaticamente:

- **Cliente sem nome:** Usa "Cliente" como fallback
- **Cliente sem veículos:** Se `usar_veiculos = TRUE`, inclui mensagem: "Cliente ainda não possui veículos registrados"
- **Vendedor vazio:** Não inclui o campo se vendedor estiver vazio ou apenas espaços
- **Dados incompletos:** Processa apenas campos válidos (ignora campos vazios)

## Boas Práticas

1. **Campanhas Genéricas:** Use `usar_veiculos = FALSE` para mensagens que não devem mencionar produtos específicos
2. **Campanhas Promocionais:** Use `usar_veiculos = TRUE` para personalizar ofertas
3. **Relacionamento:** Use `usar_vendedor = TRUE` apenas quando o prompt menciona relacionamento pessoal
4. **Teste o Prompt:** Sempre teste o prompt com diferentes configurações de flags para garantir consistência

## Perguntas Frequentes

**P: Posso mudar as flags depois de criar a campanha?**
R: Sim, mas mensagens já enviadas não serão afetadas. A mudança se aplica apenas a novos envios.

**P: O que acontece se o cliente não tiver veículos?**
R: Se `usar_veiculos = TRUE`, o contexto incluirá: "Cliente ainda não possui veículos registrados". Se `FALSE`, não menciona veículos.

**P: Qual vendedor é usado quando há múltiplos veículos?**
R: Sempre o vendedor do veículo mais recente (ordenado por data de compra).

**P: Posso usar apenas vendedor sem veículos?**
R: Sim, mas o vendedor só será incluído se houver pelo menos um veículo com vendedor cadastrado.

