# Guia: Filtros Dinâmicos JSONB

## Estrutura do JSONB

Os filtros dinâmicos são armazenados como JSONB na coluna `filtros_dinamicos` da tabela `instacar_listas`.

### Estrutura Básica

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "status_whatsapp",
      "operador": "=",
      "valor": "valid"
    }
  ]
}
```

### Operador Lógico

- **AND**: Todas as condições devem ser verdadeiras
- **OR**: Pelo menos uma condição deve ser verdadeira

### Estrutura de Condição

Cada condição tem três campos:

- **campo**: Nome da coluna na tabela `instacar_clientes_envios`
- **operador**: Operador de comparação
- **valor**: Valor para comparação

## Campos Suportados

### Campos de Texto
- `nome_cliente` - Nome do cliente
- `email` - Email do cliente
- `telefone` - Telefone normalizado

### Campos Numéricos
- `total_envios` - Total de mensagens enviadas
- `ultimo_envio` - Data/hora do último envio (timestamp)
- `primeiro_envio` - Data/hora do primeiro envio (timestamp)

### Campos de Status
- `status_whatsapp` - Status WhatsApp: "valid", "invalid", "unknown"

### Campo Especial: Campanha
- `campanha` - Filtro baseado em histórico de campanhas
  - Permite selecionar uma campanha específica
  - Critérios disponíveis:
    - `nao_receberam` - Clientes que NÃO receberam mensagem da campanha
    - `receberam` - Clientes que receberam mensagem da campanha
    - `enviado` - Clientes com status "enviado" na campanha
    - `erro` - Clientes com status "erro" na campanha
    - `bloqueado` - Clientes com status "bloqueado" na campanha

## Exemplo com Condição de Campanha

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "status_whatsapp",
      "operador": "=",
      "valor": "valid"
    },
    {
      "campo": "campanha",
      "operador": "nao_receberam",
      "valor": "b2d886f3-5a7a-4d74-b363-530bda6b8f19",
      "tipo": "campanha"
    }
  ]
}
```

Este exemplo retorna clientes que:
- Têm WhatsApp válido (`status_whatsapp = 'valid'`)
- E NÃO receberam mensagem da campanha especificada

## Operadores Suportados

### Operadores para Campos de Texto
- `=` - Igual a
- `!=` - Diferente de
- `LIKE` - Contém (usa padrão SQL LIKE com %)

### Operadores para Campos Numéricos
- `=` - Igual a
- `!=` - Diferente de
- `>` - Maior que
- `>=` - Maior ou igual
- `<` - Menor que
- `<=` - Menor ou igual

### Operadores para Campos de Status
- `=` - Igual a
- `!=` - Diferente de

## Exemplos de Filtros

### Exemplo 1: Clientes com WhatsApp Válido

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "status_whatsapp",
      "operador": "=",
      "valor": "valid"
    }
  ]
}
```

### Exemplo 2: Clientes que Receberam Mais de 5 Mensagens

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "total_envios",
      "operador": ">",
      "valor": "5"
    }
  ]
}
```

### Exemplo 3: Clientes VIP (Nome contém "VIP" OU Total > 10)

```json
{
  "operador": "OR",
  "condicoes": [
    {
      "campo": "nome_cliente",
      "operador": "LIKE",
      "valor": "%VIP%"
    },
    {
      "campo": "total_envios",
      "operador": ">",
      "valor": "10"
    }
  ]
}
```

### Exemplo 4: Clientes Inativos (Último envio há mais de 30 dias)

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "ultimo_envio",
      "operador": "<",
      "valor": "2024-11-01T00:00:00Z"
    }
  ]
}
```

### Exemplo 5: Múltiplas Condições AND

```json
{
  "operador": "AND",
  "condicoes": [
    {
      "campo": "status_whatsapp",
      "operador": "=",
      "valor": "valid"
    },
    {
      "campo": "total_envios",
      "operador": ">",
      "valor": "0"
    },
    {
      "campo": "nome_cliente",
      "operador": "LIKE",
      "valor": "%Silva%"
    }
  ]
}
```

## Como Usar na Interface

1. **Criar Lista Dinâmica**:
   - Acesse "Listas de Clientes" > "+ Nova Lista"
   - Selecione tipo "Dinâmica"
   - Vá para aba "Filtros"

2. **Adicionar Condições**:
   - Clique em "+ Adicionar Condição"
   - Selecione campo, operador e valor
   - Repita para múltiplas condições

3. **Escolher Operador Lógico**:
   - Selecione "AND" ou "OR" no topo
   - AND: todas condições devem ser verdadeiras
   - OR: pelo menos uma deve ser verdadeira

4. **Testar Filtros**:
   - Clique em "Testar Filtros"
   - O sistema mostrará quantos clientes atendem aos critérios

5. **Salvar**:
   - Clique em "Salvar Lista"
   - O total de clientes será calculado automaticamente

## Limitações Atuais

### Operadores Não Suportados (Futuro)
- `IN` - Lista de valores (será implementado)
- `BETWEEN` - Range de valores (será implementado)
- `NOT LIKE` - Não contém (será implementado)

### Campos Não Suportados (Futuro)
- Campos JSONB (ex: `veiculos`)
- Campos calculados (ex: dias desde último envio)
- Agregações (ex: total de veículos)

## Roadmap

### Fase 2 (Futuro)
- Suporte a operador `IN` para múltiplos valores
- Suporte a operador `BETWEEN` para ranges
- Filtros em campos JSONB (ex: veículos)
- Campos calculados (ex: dias desde último envio)

### Fase 3 (Futuro)
- Filtros aninhados (grupos de condições)
- Operadores avançados (regex, case-insensitive)
- Validação visual de filtros complexos

## Troubleshooting

### Filtro não retorna clientes esperados

1. Verifique se os valores estão corretos
2. Use "Testar Filtros" para validar
3. Verifique se há clientes que atendem aos critérios
4. Revise operador lógico (AND vs OR)

### Erro ao salvar filtros

1. Verifique se todas as condições têm campo, operador e valor
2. Valide formato dos valores (números para campos numéricos)
3. Verifique se operador é compatível com o campo

### Performance lenta

1. Evite filtros muito complexos
2. Use índices apropriados (já criados automaticamente)
3. Considere criar lista estática se filtro não muda frequentemente

