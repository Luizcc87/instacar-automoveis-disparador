# Changelog: Correção de Quebras de Linha em Mensagens Geradas pela IA

**Data:** Dezembro 2025  
**Versão:** 2.7

## Problema Identificado

Quando o prompt personalizado instruía o modelo a usar `/n` ou `/n/n` para quebras de linha (exemplo: "Quebre linhas para melhor visualização no WhatsApp com quebras de linha simples /n ou /n/n duplas"), o modelo GPT-4 estava interpretando isso literalmente e incluindo os caracteres `/n` na mensagem gerada ao invés de usar quebras de linha reais.

**Exemplo de mensagem gerada incorretamente:**
```
ADALBERTO, desejamos um Natal cheio de alegria e um Ano Novo repleto de realizações para você e sua família! 🎄✨  
Conte sempre com a Instacar!

/n

Acompanhe nossas novidades no Instagram:  
@instacarmultimarcas
```

## Solução Implementada

Foi adicionada uma etapa de pós-processamento nos nós que processam mensagens geradas pela IA para normalizar automaticamente as quebras de linha:

1. **Substituição de `/n/n` por `\n\n`** (duplas quebras de linha)
2. **Substituição de `/n` por `\n`** (quebra de linha simples)

### Arquivos Modificados

**Workflow N8N:** `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`

#### Nó: "Processar Mensagem IA" (Campanhas)
- **Localização:** Linha ~2208
- **Função:** Processa mensagens geradas pela IA em campanhas
- **Correção:** Adicionada normalização de quebras de linha antes de limitar caracteres

#### Nó: "Processar Mensagem Final Individual" (Envio Individual)
- **Localização:** Linha ~797
- **Função:** Processa mensagens geradas pela IA em envios individuais
- **Correção:** Adicionada normalização de quebras de linha antes de limitar caracteres

### Código Adicionado

```javascript
// Normalizar quebras de linha: substituir /n e /n/n por quebras de linha reais
// Isso corrige casos onde o modelo interpreta literalmente as instruções do prompt
mensagem = mensagem.replace(/\/n\/n/g, '\n\n'); // Duplas quebras de linha
mensagem = mensagem.replace(/\/n/g, '\n'); // Quebras de linha simples
```

## Comportamento Após Correção

Agora, mesmo que o modelo GPT-4 inclua `/n` ou `/n/n` literalmente na mensagem gerada, o sistema automaticamente converte para quebras de linha reais antes de enviar via WhatsApp.

**Exemplo de mensagem após correção:**
```
ADALBERTO, desejamos um Natal cheio de alegria e um Ano Novo repleto de realizações para você e sua família! 🎄✨  
Conte sempre com a Instacar!

Acompanhe nossas novidades no Instagram:  
@instacarmultimarcas
```

## Recomendações para Prompts

Embora o sistema agora corrija automaticamente, é recomendado usar quebras de linha reais (`\n`) nas instruções do prompt ao invés de `/n`:

**✅ Recomendado:**
```
Use quebras de linha simples (\n) ou duplas (\n\n) para melhor visualização no WhatsApp.
```

**⚠️ Funciona, mas não é ideal:**
```
Use quebras de linha simples /n ou /n/n duplas para melhor visualização no WhatsApp.
```

## Impacto

- ✅ **Compatibilidade retroativa:** Mensagens antigas com `/n` serão corrigidas automaticamente
- ✅ **Sem breaking changes:** Não afeta prompts existentes
- ✅ **Melhora UX:** Mensagens no WhatsApp agora têm formatação correta
- ✅ **Aplica-se a ambos os fluxos:** Campanhas e envios individuais

## Testes Recomendados

1. Criar uma campanha com prompt que instrua uso de `/n` ou `/n/n`
2. Executar a campanha e verificar se as mensagens têm quebras de linha corretas
3. Verificar envio individual com prompt similar
4. Confirmar que mensagens antigas com `/n` também são corrigidas

## Notas Técnicas

- A normalização ocorre **antes** da limitação de 280 caracteres
- A substituição é feita em ordem: primeiro `/n/n`, depois `/n` (para evitar substituir duplas como simples)
- Usa regex global (`/g`) para substituir todas as ocorrências
- Não afeta quebras de linha reais já presentes na mensagem

