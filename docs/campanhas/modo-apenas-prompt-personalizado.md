# Modo "Apenas Prompt Personalizado"

## Visão Geral

Quando todas as configurações de IA estão **desmarcadas** na edição da campanha e há um **"Prompt Personalizado para IA"** preenchido, o sistema entra no **modo "apenas prompt personalizado"**.

## Comportamento do Fluxo N8N

O modo "apenas prompt personalizado" funciona em **ambos os fluxos**:
- ✅ **Fluxo de Campanhas** (processamento em lote)
- ✅ **Fluxo de Envio Individual** (mensagem única)

### Condições para Ativar o Modo

O modo é ativado quando **TODAS** as seguintes condições são verdadeiras:

1. ✅ `usar_veiculos = false` (ou não marcado)
2. ✅ `usar_configuracoes_globais = false` (ou não marcado)
3. ✅ `sessoes_contexto_habilitadas = []` (nenhuma sessão habilitada)
4. ✅ `prompt_ia` está preenchido (não vazio)

### Contexto Enviado ao Agente IA

No modo "apenas prompt personalizado", o contexto enviado é **mínimo**:

```
Cliente: [Nome do Cliente]

[Prompt Personalizado]
```

**O que NÃO é incluído:**
- ❌ Seção "=== DADOS DO CLIENTE ===" (formatação completa)
- ❌ Veículos adquiridos
- ❌ Configurações da empresa
- ❌ Sessões de contexto
- ❌ Seção "=== INSTRUÇÕES DA CAMPANHA ===" (formatação)

**O que É incluído:**
- ✅ Nome do cliente (mínimo necessário)
- ✅ Prompt personalizado (com variáveis substituídas)

### Variáveis Disponíveis no Prompt

Mesmo no modo mínimo, as seguintes variáveis podem ser usadas no prompt:

- `{{nome_cliente}}` - Nome do cliente
- `{{telefone}}` - Telefone do cliente
- `{{data_hoje}}` - Data atual formatada
- `{{periodo_ano}}` - Período/ano da campanha (se houver)
- `{{veiculos.length}}` - Quantidade de veículos (mesmo que não sejam listados)

### System Message

O System Message continua sendo montado dinamicamente:

- Se `usar_configuracoes_globais = false`, usa apenas o padrão básico
- Não inclui configurações de políticas da empresa

## Exemplo de Uso

### Cenário: Campanha Simples de Aniversário

**Configuração da Campanha:**
- ❌ Usar veículos: **Desmarcado**
- ❌ Usar configurações globais: **Desmarcado**
- ❌ Sessões de contexto: **Nenhuma selecionada**
- ✅ Prompt personalizado: `"Deseje um feliz aniversário para {{nome_cliente}} e ofereça um desconto especial de 10% na próxima compra."`

**Contexto Gerado:**
```
Cliente: João Silva

Deseje um feliz aniversário para João Silva e ofereça um desconto especial de 10% na próxima compra.
```

**System Message:**
```
Você é um assistente da Instacar Automóveis. Escreva mensagens calorosas e personalizadas para clientes.

Mantenha um tom amigável, profissional e breve (máximo 280 caracteres).
Sempre chame o cliente pelo nome. Use emojis com moderação.

Siga as instruções da campanha fornecidas no contexto.
*data_de_hoje: Hoje é sábado, 20 de dezembro de 2025 às 22:30*
```

## Vantagens do Modo Mínimo

1. **Simplicidade**: Contexto limpo e direto
2. **Controle Total**: Você define exatamente o que o agente IA recebe
3. **Menos Tokens**: Economia de tokens na API da OpenAI
4. **Respostas Mais Focadas**: O agente não se distrai com informações desnecessárias

## Quando Usar

Use o modo "apenas prompt personalizado" quando:

- ✅ Você quer controle total sobre o prompt
- ✅ A campanha é simples e não precisa de contexto adicional
- ✅ Você quer economizar tokens
- ✅ O prompt já contém todas as informações necessárias

## Quando NÃO Usar

Evite o modo "apenas prompt personalizado" quando:

- ❌ Você precisa que o agente conheça informações da empresa
- ❌ Você quer incluir dados dos veículos do cliente
- ❌ Você precisa de sessões de contexto pré-definidas
- ❌ O prompt precisa de contexto adicional para funcionar bem

