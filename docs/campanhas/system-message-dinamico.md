# System Message Dinâmico do Agente IA

Este documento explica como o System Message do agente IA é montado dinamicamente usando as configurações da empresa.

## Visão Geral

O System Message define o **comportamento e personalidade** do agente IA. Ele é montado dinamicamente a partir das configurações globais da empresa, especialmente da categoria **`politicas`**.

## Estrutura do System Message

O System Message é composto pelas seguintes partes:

### 1. Identidade do Assistente (Fixo)

```
Você é um assistente da Instacar Automóveis. Escreva mensagens calorosas e personalizadas para clientes.
```

Esta parte é sempre a mesma e define o papel básico do assistente.

### 2. Configurações de Políticas (Dinâmico)

As configurações da categoria **`politicas`** são incluídas automaticamente no System Message:

#### Configurações Incluídas:

1. **`politicas.tom_voz`** - Tom de Voz
   - Define como o agente deve se comunicar
   - Exemplo: "Use tom amigável, profissional e caloroso. Evite termos técnicos..."

2. **`politicas.regras_comunicacao`** - Regras de Comunicação
   - Define regras gerais de comunicação
   - Exemplo: "Sempre chame o cliente pelo nome. Mantenha mensagens breves (máximo 280 caracteres)..."

3. **`politicas.tratamento_cliente`** - Tratamento do Cliente
   - Define como tratar o cliente
   - Exemplo: "Trate o cliente com respeito e cordialidade. Use 'você' ou 'senhor/senhora'..."

#### Ordem de Inclusão

As configurações são incluídas na ordem definida pelo campo `ordem` (menor número primeiro).

#### Sobrescritas

Se a campanha tiver `configuracoes_empresa_sobrescritas` com chaves de políticas, essas sobrescritas são aplicadas no lugar das configurações globais.

### 3. Instrução para Seguir Contexto (Fixo)

```
Siga as instruções da campanha fornecidas no contexto.
```

Esta parte instrui o agente a seguir as instruções específicas da campanha que estão no contexto (User Message).

### 4. Data de Hoje (Dinâmico)

```
*data_de_hoje: Hoje é [dia da semana], [dia] de [mês] de [ano] - [hora]:[minuto]*
```

A data é formatada automaticamente no fuso horário de São Paulo.

## Exemplo de System Message Montado

```
Você é um assistente da Instacar Automóveis. Escreva mensagens calorosas e personalizadas para clientes.

Use tom amigável, profissional e caloroso. Evite termos técnicos. Seja empático e próximo do cliente, mas mantenha profissionalismo. Use linguagem clara e acessível.

Sempre chame o cliente pelo nome. Mantenha mensagens breves (máximo 280 caracteres). Use emojis com moderação. Evite mensagens muito longas ou com múltiplos parágrafos.

Trate o cliente com respeito e cordialidade. Use "você" ou "senhor/senhora" conforme o contexto. Demonstre interesse genuíno em ajudar.

Siga as instruções da campanha fornecidas no contexto.
*data_de_hoje: Hoje é sexta-feira, 20 de dezembro de 2025 - 20:30*
```

## Como Funciona no Workflow

### Fluxo de Campanhas

1. **Buscar Configurações Empresa** - Busca todas as configurações ativas
2. **Preparar Dados IA Campanha** - Monta o contexto (User Message)
3. **Preparar System Message Campanha** - Monta o System Message dinâmico
4. **AI Agent - Gerar Mensagem** - Usa System Message + Contexto

### Fluxo de Envio Individual

1. **Buscar Configurações Empresa Individual** - Busca todas as configurações ativas
2. **Preparar Contexto IA Individual** - Monta o contexto (User Message)
3. **Preparar System Message Individual** - Monta o System Message dinâmico
4. **AI Agent Individual** - Usa System Message + Contexto

## Diferença entre System Message e Contexto (User Message)

### System Message (Comportamento)
- Define **como** o agente deve se comportar
- Inclui políticas, regras, tom de voz
- É fixo durante toda a conversa
- Focado em **comportamento e estilo**

### Contexto/User Message (Conteúdo)
- Define **o que** o agente deve fazer
- Inclui dados do cliente, configurações da empresa, sessões, instruções da campanha
- Pode variar por cliente/campanha
- Focado em **conteúdo e instruções específicas**

## Configurações que Fazem Parte do System Message

**Apenas configurações da categoria `politicas`** são incluídas no System Message:

- ✅ `politicas.tom_voz`
- ✅ `politicas.regras_comunicacao`
- ✅ `politicas.tratamento_cliente`

**Outras categorias** (`sobre_empresa`, `contato`, `ofertas`, `produtos`) são incluídas no **contexto (User Message)**, não no System Message.

## Fallback

Se não houver configurações de políticas cadastradas ou se `usar_configuracoes_globais` estiver desabilitado, o System Message usa um padrão:

```
Mantenha um tom amigável, profissional e breve (máximo 280 caracteres).
Sempre chame o cliente pelo nome. Use emojis com moderação.
```

## Variáveis no System Message

O System Message **não suporta variáveis dinâmicas** como `{{nome_cliente}}` ou `{{data_hoje}}` nas configurações de políticas, pois ele define o comportamento geral do agente, não mensagens específicas.

A única variável dinâmica é a **data de hoje**, que é adicionada automaticamente no final do System Message.

## Personalização por Campanha

Cada campanha pode sobrescrever configurações de políticas através do campo `configuracoes_empresa_sobrescritas`:

```json
{
  "configuracoes_empresa_sobrescritas": {
    "politicas.tom_voz": "Use tom mais formal e técnico para esta campanha específica.",
    "politicas.regras_comunicacao": "Mensagens podem ter até 500 caracteres para esta campanha."
  }
}
```

Isso permite personalizar o comportamento do agente por campanha sem alterar as configurações globais.

## Troubleshooting

### Problema: System Message não está sendo atualizado

**Solução**: Verifique se:
- As configurações de políticas estão ativas no Supabase
- `usar_configuracoes_globais` está `true` na campanha
- O nó "Preparar System Message" está sendo executado antes do AI Agent

### Problema: Configurações não aparecem no System Message

**Solução**: Verifique se:
- As configurações têm `categoria = 'politicas'`
- As configurações têm `ativo = true`
- O campo `ordem` está configurado corretamente

### Problema: Sobrescritas não são aplicadas

**Solução**: Verifique se:
- As chaves em `configuracoes_empresa_sobrescritas` correspondem exatamente às chaves das configurações (ex: `politicas.tom_voz`)
- A campanha tem `usar_configuracoes_globais = true`

## Referência Técnica

### Nós do Workflow

- **Fluxo Individual**: "Preparar System Message Individual" (posição: -480, -1312)
- **Fluxo Campanhas**: "Preparar System Message Campanha" (posição: -2144, -240)

### Campos do Banco de Dados

- `instacar_configuracoes_empresa.categoria = 'politicas'` - Filtro para System Message
- `instacar_configuracoes_empresa.ordem` - Ordem de inclusão
- `instacar_campanhas.configuracoes_empresa_sobrescritas` - Sobrescritas por campanha

