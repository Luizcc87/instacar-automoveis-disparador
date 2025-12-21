# Correções: Uso de Template sem Campanha

## Problema Identificado

Quando um template era usado diretamente (sem campanha associada), o sistema estava:

1. **Montando contexto muito básico** - Apenas "Cliente: Cliente\n"
2. **Não usando o prompt do template** - O template não era incluído no contexto
3. **Não buscando configurações de políticas** - System Message usava fallback padrão
4. **Não incluindo sessões do template** - Sessões habilitadas no template eram ignoradas

## Correções Implementadas

### 1. Preparar Contexto IA Individual

**Antes:**
- Se não houver campanha, retornava contexto básico imediatamente
- Não verificava se havia template disponível

**Depois:**
- Verifica se há template mesmo sem campanha
- Se houver template, cria objeto `campanhaAtual` mínimo com:
  - `usar_veiculos: false` (padrão para templates)
  - `usar_vendedor: false`
  - `usar_configuracoes_globais: true`
  - `sessoes_contexto_habilitadas`: do template
  - `prompt_ia`: do template
- Monta contexto completo usando o template como base

### 2. Preparar System Message Individual

**Antes:**
- Só buscava configurações se houver campanha
- Ignorava templates

**Depois:**
- Verifica se há template disponível
- Busca configurações de políticas se houver campanha OU template
- Aplica sobrescritas da campanha (se existir)

## Fluxo Atualizado

### Cenário 1: Template sem Campanha

```
1. Buscar Configurações Empresa Individual
2. Buscar Sessões Contexto Individual
3. Verificar Template Prompt Individual
4. IF Tem Template Individual → Buscar Template Prompt Individual
5. Preparar Contexto IA Individual
   - Detecta template sem campanha
   - Cria campanhaAtual do template
   - Monta contexto completo com:
     * Dados do cliente
     * Configurações da empresa (se habilitadas)
     * Sessões do template
     * Prompt do template
6. Preparar System Message Individual
   - Busca configurações de políticas
   - Monta System Message dinâmico
7. AI Agent Individual
   - Usa System Message + Contexto completo
```

### Cenário 2: Campanha com Template

```
1. Buscar Configurações Empresa
2. Buscar Sessões Contexto
3. Verificar Template Prompt
4. IF Tem Template → Buscar Template Prompt
5. Preparar Dados IA Campanha
   - Usa campanha completa
   - Template sobrescreve prompt_ia se existir
   - Combina sessões da campanha + template
6. Preparar System Message Campanha
   - Busca configurações de políticas
   - Aplica sobrescritas da campanha
7. AI Agent - Gerar Mensagem
   - Usa System Message + Contexto completo
```

### Cenário 3: Sem Campanha nem Template

```
1. Preparar Contexto IA Individual
   - Retorna contexto básico apenas com dados do cliente
2. Preparar System Message Individual
   - Usa fallback padrão
3. AI Agent Individual
   - Usa System Message padrão + Contexto básico
```

## Exemplo de Contexto Montado com Template

Quando há template "Natal Genérico" sem campanha:

```
=== DADOS DO CLIENTE ===
Cliente: João Silva

=== CONFIGURAÇÕES DA EMPRESA ===
[Tom de Voz]
Use tom amigável, profissional e caloroso...

[Regras de Comunicação]
Sempre chame o cliente pelo nome...

=== SESSÕES DE CONTEXTO ===
[Sobre a Empresa]
A Instacar Automóveis é...

[Tom de Voz]
Use tom amigável...

=== INSTRUÇÕES DA CAMPANHA ===
Deseje um Feliz Natal e um Próspero Ano Novo de forma calorosa e genuína. 
Mencione que a Instacar Automóveis valoriza o relacionamento com João Silva 
e está sempre à disposição. Não mencione veículos específicos ou ofertas comerciais. 
Seja breve, amigável e mantenha o foco na celebração das festas de fim de ano.
```

## Variáveis Suportadas no Template

Mesmo sem campanha, o template pode usar variáveis:

- `{{nome_cliente}}` - Substituído pelo nome do cliente
- `{{telefone}}` - Substituído pelo telefone
- `{{data_hoje}}` - Data atual formatada
- `{{periodo_ano}}` - Vazio se não houver campanha
- `{{veiculos.length}}` - Quantidade de veículos

## Testes Recomendados

1. **Teste com template sem campanha:**
   - Criar envio individual
   - Selecionar template
   - Verificar se contexto inclui prompt do template
   - Verificar se sessões do template são incluídas

2. **Teste com template + campanha:**
   - Criar campanha com template
   - Verificar se prompt do template sobrescreve prompt da campanha
   - Verificar se sessões são combinadas

3. **Teste sem template nem campanha:**
   - Criar envio individual sem template
   - Verificar se usa contexto básico
   - Verificar se System Message usa fallback

## Notas Técnicas

- Templates não têm sobrescritas de configurações (apenas campanhas têm)
- Templates podem habilitar sessões automaticamente
- Se template tem `configuracoes_empresa_habilitadas`, essas são usadas para filtrar configurações no contexto
- System Message sempre busca todas as políticas ativas (não filtra por `configuracoes_empresa_habilitadas`)

