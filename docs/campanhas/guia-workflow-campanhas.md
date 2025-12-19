# Guia: Modificações do Workflow para Campanhas

**⚠️ ATENÇÃO: Este documento está parcialmente desatualizado. O workflow foi completamente implementado.**

Este documento descreve as modificações no workflow N8N para suportar o sistema de campanhas.

## Estrutura do Workflow Implementado

O workflow `Disparador_Campanhas_Instacar.json` foi **completamente implementado** com as seguintes funcionalidades:

**IMPORTANTE:** O workflow de campanhas **NÃO usa Google Sheets**. Ele busca clientes diretamente do Supabase.

### 1. Trigger Inicial

**Opção A: Manual Trigger com Parâmetro**

- Adicionar campo `campanha_id` no trigger manual
- O usuário informa qual campanha executar

**Opção B: Webhook Trigger (Recomendado)**

- Webhook recebe `campanha_id` via POST
- Permite disparo manual via interface web

**Opção C: Schedule Trigger**

- Para campanhas agendadas automaticamente
- Variável `campanha_id` fixa no workflow

### 2. Novos Nós Adicionados

#### Nó: "Obter Campanha Ativa"

- **Tipo**: Supabase - GetAll
- **Tabela**: `instacar_campanhas`
- **Filtro**: `id = {{ $json.campanha_id }} AND status = 'ativa' AND ativo = true`
- **Função**: Busca configuração da campanha no banco

#### Nó: "Verificar Execução Hoje"

- **Tipo**: Supabase - GetAll
- **Tabela**: `instacar_campanhas_execucoes`
- **Filtro**: `campanha_id = {{ $json.campanha_id }} AND data_execucao = CURRENT_DATE`
- **Função**: Verifica se campanha já foi executada hoje (evita duplicatas)

#### Nó: "Criar Execução"

- **Tipo**: Supabase - Insert
- **Tabela**: `instacar_campanhas_execucoes`
- **Função**: Cria registro de execução da campanha

#### Nó: "Aplicar Template"

- **Tipo**: Code
- **Função**:
  - Carrega template do arquivo `templates-epoca.json` baseado em `periodo_ano`
  - Combina template com prompt personalizado da campanha
  - Prepara prompt final para IA

#### Nó: "Verificar Última Campanha Cliente"

- **Tipo**: Supabase - GetAll
- **Tabela**: `instacar_historico_envios`
- **Filtro**: `telefone = {{ $json.numeroFormatado }} AND campanha_id = {{ $json.campanha_id }}`
- **Função**: Verifica se cliente já recebeu esta campanha específica

#### Nó: "Verificar Intervalo Mínimo"

- **Tipo**: Code
- **Função**:
  - Consulta última campanha enviada para o cliente
  - Verifica se passou o intervalo mínimo (campanha.intervalo_minimo_dias)
  - Permite ou bloqueia envio

### 3. Nós Modificados

#### Nó: "Processar Cliente"

- **Modificação**: Verificar duplicatas por campanha
- **Lógica**:

  ```javascript
  // Verificar se já recebeu esta campanha específica
  const jaRecebeuEstaCampanha = await verificarCampanhaCliente(
    telefone,
    campanha_id
  );

  // Verificar intervalo mínimo
  const podeEnviar = await verificarIntervaloMinimo(
    telefone,
    campanha.intervalo_minimo_dias
  );

  jaRecebeuMensagem = jaRecebeuEstaCampanha || !podeEnviar;
  ```

#### Nó: "Preparar Dados IA"

- **Modificação**: Usar prompt da campanha + template
- **Lógica**:
  ```javascript
  const promptBase = campanha.prompt_ia;
  const template = templates[campanha.periodo_ano];
  const promptFinal = `${template.prompt_base_ia}\n\n${promptBase}`;
  ```

#### Nó: "Preparar Dados Histórico"

- **Modificação**: Adicionar `campanha_id` e `execucao_id`
- **Campos adicionados**:
  ```javascript
  historicoData = {
    ...historicoData,
    campanha_id: campanha.id,
    execucao_id: execucao.id,
  };
  ```

#### Nó: "Supabase - Registrar Histórico"

- **Modificação**: Incluir campos `campanha_id` e `execucao_id` no mapeamento

#### Nó: "Supabase - Verificar Limite Diário"

- **Modificação**: Filtrar por `campanha_id`
- **Filtro**: `campanha_id = {{ $json.campanha_id }} AND data = CURRENT_DATE`

#### Nó: "Processar Controle Diário"

- **Modificação**: Usar `limite_envios_dia` da campanha
- **Lógica**:
  ```javascript
  const limiteDia = campanha.limite_envios_dia || 200;
  ```

### 4. Fluxo Completo Modificado

```
Trigger (com campanha_id)
    ↓
Obter Campanha Ativa
    ↓
Verificar Execução Hoje
    ↓ (se não executou hoje)
Criar Execução
    ↓
Buscar Clientes Elegíveis Supabase (NOVO - não usa planilhas)
    ↓
Filtrar Clientes Elegíveis para Campanha (NOVO - verifica intervalo mínimo)
    ↓
Calcular Lote e Verificar Horário (NOVO - seleciona lote atual)
    ↓
IF Dentro Horário e Pode Processar (NOVO)
    ↓
Split in Batches (processa apenas lote atual)
    ↓
Verificar Duplicata por Campanha (NOVO - verifica se já recebeu esta campanha)
    ↓
Preparar Dados IA Campanha (NOVO - constrói contexto dinâmico)
    ↓
IF Já Recebeu Esta Campanha
    ↓
Uazapi - Check WhatsApp
    ↓
Processar WhatsApp
    ↓
IF Tem WhatsApp
    ↓
Aplicar Template (NOVO)
    ↓
Preparar Dados IA (modificado)
    ↓
AI Agent - Gerar Mensagem
    ↓
Processar Mensagem IA
    ↓
Uazapi - Enviar Mensagem
    ↓
Processar Resultado Envio
    ↓
Preparar Dados Cliente
    ↓
Preparar URL Supabase
    ↓
IF Cliente Existe
    ↓
Supabase - Upsert Cliente
    ↓
Preparar Dados Histórico (modificado com campanha_id)
    ↓
Supabase - Registrar Histórico (modificado)
    ↓
Preparar Data Hoje
    ↓
Supabase - Verificar Limite Diário (modificado)
    ↓
Processar Controle Diário (modificado)
    ↓
Preparar URL Controle
    ↓
Supabase - Atualizar Controle
    ↓
IF Atingiu Limite
    ↓
Calcular Intervalo
    ↓
Wait - Intervalo Randomizado
    ↓
Split in Batches (loop)
```

## Código JavaScript para Novos Nós

### Nó: "Aplicar Template"

```javascript
// Carregar template baseado no período da campanha
const campanha = $("Obter Campanha Ativa").item.json;
const periodo = campanha.periodo_ano;

// Carregar templates (pode ser hardcoded ou lido de arquivo)
const templates = {
  janeiro: { prompt_base_ia: "..." },
  fevereiro: { prompt_base_ia: "..." },
  // ... outros períodos
};

const template = templates[periodo] || templates["janeiro"]; // fallback
const promptBase = template.prompt_base_ia;
const promptCampanha = campanha.prompt_ia;

// Combinar prompts
const promptFinal = `${promptBase}\n\n${promptCampanha}`;

return [
  {
    json: {
      ...$input.item.json,
      promptFinal: promptFinal,
      template: template,
      campanha: campanha,
    },
  },
];
```

### Nó: "Verificar Intervalo Mínimo"

```javascript
const item = $input.item;
const telefone = item.json.numeroFormatado;
const campanha = $("Obter Campanha Ativa").item.json;
const intervaloMinimo = campanha.intervalo_minimo_dias || 30;

// Buscar última campanha do cliente
const ultimaCampanha = await buscarUltimaCampanha(telefone);

if (!ultimaCampanha) {
  // Nunca recebeu campanha, pode enviar
  return [
    {
      json: {
        ...item.json,
        podeEnviar: true,
        motivo: "Cliente nunca recebeu campanha",
      },
    },
  ];
}

// Calcular dias desde última campanha
const diasDesdeUltima = Math.floor(
  (new Date() - new Date(ultimaCampanha.timestamp_envio)) /
    (1000 * 60 * 60 * 24)
);

const podeEnviar = diasDesdeUltima >= intervaloMinimo;

return [
  {
    json: {
      ...item.json,
      podeEnviar: podeEnviar,
      diasDesdeUltima: diasDesdeUltima,
      intervaloMinimo: intervaloMinimo,
      motivo: podeEnviar
        ? `Passaram ${diasDesdeUltima} dias desde última campanha`
        : `Apenas ${diasDesdeUltima} dias desde última campanha (mínimo: ${intervaloMinimo})`,
    },
  },
];
```

## Variáveis de Ambiente Adicionais

Adicionar ao nó "Set Variables - CONFIGURAR AQUI":

- `CAMPANHA_ID` (opcional, pode vir do trigger)
- `TEMPLATES_PATH` (caminho para arquivo de templates, opcional)

## Notas de Implementação

1. **Compatibilidade**: O workflow mantém compatibilidade com o sistema antigo se `campanha_id` for NULL
2. **Fallback**: Se template não for encontrado, usa template padrão (janeiro)
3. **Performance**: Templates podem ser carregados uma vez no início e reutilizados
4. **Validação**: Sempre validar que campanha existe e está ativa antes de processar

## Próximos Passos

1. Criar workflow completo no N8N
2. Testar com campanha manual
3. Configurar Schedule Triggers para campanhas automáticas
4. Integrar com interface web para disparo manual
