# Como os Dados Dinâmicos são Inseridos no Prompt do Agente IA

Este documento explica como o sistema monta automaticamente o contexto do agente IA usando os dados dinâmicos configurados.

## Visão Geral

O sistema monta o contexto do agente IA em **dois fluxos diferentes**:

1. **Fluxo de Campanhas** (processamento em lote)
2. **Fluxo de Envio Individual** (mensagem única)

Ambos os fluxos seguem a mesma lógica para montar o contexto, garantindo consistência.

## Estrutura do Contexto Montado

O contexto final (`contextoIA`) é montado na seguinte ordem:

```
=== DADOS DO CLIENTE ===
Cliente: [Nome do Cliente]

[Veículos adquiridos (se configurado)]
[Vendedor responsável (se configurado)]

=== CONFIGURAÇÕES DA EMPRESA ===
[Configurações globais + sobrescritas por categoria]

=== SESSÕES DE CONTEXTO ===
[Sessões habilitadas com conteúdo processado]

=== INSTRUÇÕES DA CAMPANHA ===
[Prompt da campanha ou template completo]
```

## Fluxo de Campanhas

### Nós Envolvidos

1. **Buscar Configurações Empresa** - Busca todas as configurações ativas
2. **Buscar Sessões Contexto** - Busca todas as sessões ativas
3. **Verificar Template Prompt** - Verifica se há template configurado
4. **IF Tem Template** - Roteia para buscar template se necessário
5. **Buscar Template Prompt** - Busca o template completo
6. **Preparar Dados IA Campanha** - Monta o contexto final

### Código do Nó "Preparar Dados IA Campanha"

O nó monta o contexto seguindo esta lógica:

1. **Dados do Cliente**: Nome, telefone, veículos
2. **Configurações da Empresa**: 
   - Busca configurações globais do Supabase
   - Aplica sobrescritas da campanha (`configuracoes_empresa_sobrescritas`)
   - Agrupa por categoria
   - Substitui variáveis dinâmicas
3. **Sessões de Contexto**:
   - Busca sessões habilitadas (`sessoes_contexto_habilitadas`)
   - Filtra apenas sessões ativas
   - Substitui variáveis dinâmicas
4. **Template/Prompt**:
   - Se houver `template_prompt_id`, usa o prompt do template
   - Caso contrário, usa `prompt_ia` da campanha
   - Substitui variáveis dinâmicas

## Fluxo de Envio Individual

### Nós Envolvidos

1. **Buscar Configurações Empresa Individual** - Busca configurações ativas
2. **Buscar Sessões Contexto Individual** - Busca sessões ativas
3. **Verificar Template Prompt Individual** - Verifica se há template
4. **IF Tem Template Individual** - Roteia para buscar template
5. **Buscar Template Prompt Individual** - Busca o template completo
6. **Preparar Contexto IA Individual** - Monta o contexto final

### Código do Nó "Preparar Contexto IA Individual"

Similar ao fluxo de campanhas, mas adaptado para envio individual:

- Se **não houver campanha**: Monta contexto básico apenas com dados do cliente
- Se **houver campanha**: Monta contexto completo usando dados dinâmicos

## Variáveis Dinâmicas Suportadas

As seguintes variáveis são substituídas automaticamente nos templates:

- `{{nome_cliente}}` - Nome do cliente
- `{{telefone}}` - Telefone do cliente
- `{{data_hoje}}` - Data atual formatada (ex: "sexta-feira, 20 de dezembro de 2025")
- `{{periodo_ano}}` - Período do ano da campanha (ex: "dezembro")
- `{{veiculos.length}}` - Quantidade de veículos do cliente
- `{{#if veiculos}}...{{/if}}` - Bloco condicional (mostra conteúdo apenas se houver veículos)

## Exemplo de Contexto Montado

```
=== DADOS DO CLIENTE ===
Cliente: Luiz Carlos Ceconi

=== CONFIGURAÇÕES DA EMPRESA ===

[politicas.tom_voz]
Use tom amigável, profissional e caloroso. Evite termos técnicos. Seja empático e próximo do cliente, mas mantenha profissionalismo.

[sobre_empresa.nome]
Instacar Automóveis

[sobre_empresa.missao]
Nossa missão é proporcionar a melhor experiência na compra e venda de veículos...

=== SESSÕES DE CONTEXTO ===

[Tom de Voz]
Use linguagem clara e acessível. Demonstre interesse genuíno em ajudar.

=== INSTRUÇÕES DA CAMPANHA ===
Crie uma mensagem para Natal e final de ano
```

## Como Funciona na Prática

### 1. Configuração da Campanha

Ao criar/editar uma campanha na interface web:

- **Usar Configurações Globais**: Checkbox para habilitar
- **Template de Prompt**: Select para escolher template (opcional)
- **Sessões Habilitadas**: Checkboxes para selecionar sessões
- **Sobrescrever Configurações**: Seção para sobrescrever configurações específicas

### 2. Processamento no N8N

Quando o workflow é executado:

1. Busca a campanha do Supabase
2. Busca configurações globais (se habilitado)
3. Busca sessões de contexto ativas
4. Busca template (se configurado)
5. Monta o contexto combinando todos os dados
6. Envia para o agente IA

### 3. Geração da Mensagem

O agente IA recebe:
- **System Message**: Instruções fixas sobre o papel do assistente
- **User Message (Prompt)**: O contexto completo montado (`contextoIA`)

O agente então gera a mensagem personalizada usando todas essas informações.

## Ordem de Precedência

1. **Configurações Sobrescritas** > Configurações Globais
2. **Template Prompt** > Prompt da Campanha
3. **Sessões Habilitadas** são adicionadas ao contexto
4. **Variáveis** são substituídas em todos os textos

## Troubleshooting

### Problema: Configurações não aparecem no contexto

**Solução**: Verifique se:
- `usar_configuracoes_globais` está `true` na campanha
- As configurações estão ativas no Supabase
- Os nós de busca estão sendo executados corretamente

### Problema: Sessões não aparecem no contexto

**Solução**: Verifique se:
- As sessões estão habilitadas em `sessoes_contexto_habilitadas`
- As sessões estão ativas no Supabase
- Os slugs das sessões estão corretos

### Problema: Template não é aplicado

**Solução**: Verifique se:
- `template_prompt_id` está preenchido na campanha
- O template está ativo no Supabase
- O nó "Buscar Template Prompt" está sendo executado

### Problema: Variáveis não são substituídas

**Solução**: Verifique se:
- A variável está escrita corretamente (ex: `{{nome_cliente}}`)
- Os dados do cliente estão disponíveis no objeto
- A função `substituirVariaveis` está sendo chamada

## Referência Técnica

### Arquivos Relacionados

- **Workflow N8N**: `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`
- **Nó de Montagem (Campanhas)**: "Preparar Dados IA Campanha" (linha ~1656)
- **Nó de Montagem (Individual)**: "Preparar Contexto IA Individual" (linha ~413)
- **Schema do Banco**: `docs/supabase/schema-dados-dinamicos-ia.sql`

### Campos do Banco de Dados

- `instacar_campanhas.configuracoes_empresa_sobrescritas` (JSONB)
- `instacar_campanhas.sessoes_contexto_habilitadas` (JSONB array)
- `instacar_campanhas.template_prompt_id` (UUID)
- `instacar_campanhas.usar_configuracoes_globais` (BOOLEAN)

