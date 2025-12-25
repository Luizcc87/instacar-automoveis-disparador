# Análise: Validações para Evitar Envios Duplicados

## 📋 Resumo Executivo

Este documento analisa todas as camadas de validação existentes para prevenir envios duplicados da mesma campanha para o mesmo cliente, identifica pontos de melhoria e propõe refatorações.

## 🔒 Camadas de Proteção Atuais

### 1. **Interface Web (Frontend)**

#### 1.1. Filtro Visual "Mostrar apenas clientes que ainda não receberam mensagens"

**Localização:** `interface-web/app.js` - Função `carregarClientesSelecionadosCampanha()`

**Como funciona:**
- Busca histórico de envios da campanha: `instacar_historico_envios` onde `campanha_id = X` e `status_envio = 'enviado'`
- Cria dois Sets:
  - `clientesJaEnviados`: IDs de clientes que já receberam
  - `telefonesJaEnviados`: Telefones normalizados que já receberam
- Normaliza telefones antes de comparar (formato `55XXXXXXXXXXX`)
- Marca visualmente clientes já enviados com badge "📨 Já enviado" e fundo azul
- Se checkbox marcado, filtra clientes da lista (remove os já enviados)

**Limitações:**
- ✅ Funciona corretamente após correção v2.7.1 (normalização de telefones)
- ⚠️ É apenas visual - não impede seleção manual de clientes já enviados
- ⚠️ Depende de dados corretos no histórico (se histórico estiver inconsistente, pode falhar)

**Código relevante:**
```javascript
// Linha 3017-3133: carregarClientesSelecionadosCampanha()
// Linha 2828-2848: renderizarListaClientesSelecao() - aplica filtro
```

#### 1.2. Validação ao Salvar Campanha

**Localização:** `interface-web/app.js` - Função `salvarSelecaoClientesCampanha()`

**Como funciona:**
- Salva seleção de clientes na tabela `instacar_campanhas_clientes`
- **NÃO valida** se clientes já receberam mensagens antes de salvar
- Permite salvar clientes já enviados se usuário selecionar manualmente

**Limitações:**
- ❌ Não há validação preventiva ao salvar
- ⚠️ Usuário pode selecionar manualmente clientes já enviados (mesmo com filtro ativo)

### 2. **Workflow N8N (Backend)**

#### 2.1. Nó "Verificar Duplicata por Campanha"

**Localização:** `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json` (linha 2070-2094)

**Query Supabase:**
```sql
SELECT * FROM instacar_historico_envios
WHERE telefone = {{ $json.telefone }}
  AND campanha_id = {{ campanha_id }}
  AND status_envio = 'enviado'
```

**Como funciona:**
- Verifica se existe registro no histórico com:
  - Mesmo telefone
  - Mesma campanha
  - Status "enviado"
- Se encontrar (array.length > 0), cliente é pulado no nó "IF Já Recebeu Esta Campanha"
- Se não encontrar, continua o fluxo de envio

**Limitações:**
- ✅ Validação robusta no backend (última linha de defesa)
- ⚠️ Depende de telefone normalizado (pode falhar se formatos diferentes)
- ⚠️ Não verifica por `cliente_id` (apenas por telefone)

#### 2.2. Função SQL `cliente_recebeu_campanha()`

**Localização:** `docs/supabase/schema-campanhas.sql` (linha 359-372)

**Código:**
```sql
CREATE OR REPLACE FUNCTION cliente_recebeu_campanha(
  p_telefone VARCHAR(15),
  p_campanha_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM instacar_historico_envios 
    WHERE telefone = p_telefone 
      AND campanha_id = p_campanha_id
      AND status_envio = 'enviado'
  );
END;
```

**Como funciona:**
- Função auxiliar para verificar duplicatas
- Usada pela função `pode_enviar_campanha()` (linha 400-432)
- **Não é usada diretamente pelo workflow N8N** (workflow usa query direta)

**Limitações:**
- ⚠️ Não é utilizada pelo workflow atual
- ✅ Poderia ser usada para garantir consistência

### 3. **Banco de Dados (Constraints)**

#### 3.1. Tabela `instacar_historico_envios`

**Estrutura:**
- `telefone` VARCHAR(15)
- `campanha_id` UUID
- `status_envio` VARCHAR
- **NÃO há constraint UNIQUE** em `(telefone, campanha_id, status_envio)`

**Limitações:**
- ❌ Permite múltiplos registros de envio para mesma campanha (apenas status diferente)
- ⚠️ Depende de lógica de aplicação para prevenir duplicatas
- ✅ Campo `status_envio` permite rastrear tentativas falhas vs sucessos

## 🔍 Análise de Fluxo Completo

### Fluxo de Envio (Workflow N8N)

```
1. Buscar Clientes Elegíveis
   ↓
2. Filtrar Clientes Elegíveis para Campanha
   ↓
3. Split in Batches (processa um por vez)
   ↓
4. Verificar Duplicata por Campanha ← VALIDAÇÃO PRINCIPAL
   ↓
5. IF Já Recebeu Esta Campanha
   ├─ TRUE: Pula cliente (não envia)
   └─ FALSE: Continua envio
```

### Fluxo de Seleção (Interface Web)

```
1. Abrir Modal Campanha
   ↓
2. carregarClientesSelecionadosCampanha()
   ├─ Busca histórico de envios
   ├─ Cria Sets: clientesJaEnviados, telefonesJaEnviados
   └─ Marca visualmente clientes já enviados
   ↓
3. renderizarListaClientesSelecao()
   ├─ Se filtro ativo: Remove clientes já enviados da lista
   └─ Se filtro inativo: Mostra todos (marcados visualmente)
   ↓
4. Usuário seleciona clientes
   ↓
5. salvarSelecaoClientesCampanha()
   └─ Salva seleção (SEM validação de duplicatas)
```

## ⚠️ Pontos de Risco Identificados

### 1. **Normalização de Telefones**

**Risco:** Se telefone não estiver normalizado no histórico, validação pode falhar.

**Exemplo:**
- Cliente tem telefone `11999999999` na tabela
- Histórico tem `5511999999999` (normalizado)
- Validação pode não encontrar duplicata

**Status:** ✅ **CORRIGIDO** na v2.7.1 - Normalização implementada

### 2. **Seleção Manual de Clientes Já Enviados**

**Risco:** Usuário pode desmarcar filtro e selecionar manualmente clientes já enviados.

**Cenário:**
1. Filtro "apenas não enviados" está ativo
2. Usuário desmarca filtro
3. Usuário seleciona manualmente clientes já enviados
4. Salva campanha
5. Workflow tenta enviar (mas validação backend previne)

**Impacto:** ⚠️ Baixo - Backend previne envio, mas gera processamento desnecessário

### 3. **Falta de Validação ao Salvar Seleção**

**Risco:** Seleção pode ser salva com clientes já enviados, causando processamento desnecessário.

**Solução proposta:** Adicionar validação antes de salvar, alertando usuário.

### 4. **Dependência de `status_envio = 'enviado'`**

**Risco:** Se histórico tiver registros com status diferente (ex: 'erro'), validação pode não detectar.

**Cenário:**
- Cliente recebeu mensagem com sucesso (`status_envio = 'enviado'`)
- Depois houve tentativa que falhou (`status_envio = 'erro'`)
- Validação funciona corretamente (verifica apenas 'enviado')

**Status:** ✅ Funciona corretamente

### 5. **Múltiplas Execuções Simultâneas**

**Risco:** Se duas execuções da mesma campanha rodarem simultaneamente, ambas podem passar pela validação antes de registrar histórico.

**Cenário:**
1. Execução A verifica duplicata → Não encontra
2. Execução B verifica duplicata → Não encontra (A ainda não registrou)
3. Execução A envia mensagem
4. Execução B envia mensagem (DUPLICATA!)

**Status:** ⚠️ Risco teórico - Workflow tem controle de execução única por dia, mas não há lock de transação

## ✅ Garantias de Segurança Atuais

### 1. **Validação Backend (Última Linha de Defesa)**

✅ **Workflow N8N sempre verifica duplicata antes de enviar**
- Query no histórico antes de cada envio
- Se encontrar, pula cliente automaticamente
- **Esta é a garantia principal de segurança**

### 2. **Normalização de Telefones**

✅ **Telefones são normalizados antes de comparar**
- Função `normalizarTelefone()` garante formato consistente
- Correção v2.7.1 implementada

### 3. **Indicadores Visuais**

✅ **Interface mostra claramente clientes já enviados**
- Badge "📨 Já enviado"
- Fundo azul claro
- Filtro opcional para ocultar

## 🎯 Recomendações de Melhorias

### 1. **Adicionar Validação ao Salvar Seleção** (Prioridade: Média)

**Proposta:**
- Antes de salvar `instacar_campanhas_clientes`, verificar se algum cliente já recebeu mensagem
- Alertar usuário: "X clientes já receberam mensagens desta campanha. Deseja continuar?"
- Opção: Remover automaticamente clientes já enviados da seleção

### 2. **Usar Função SQL `cliente_recebeu_campanha()`** (Prioridade: Baixa)

**Proposta:**
- Workflow N8N usar função SQL ao invés de query direta
- Garante consistência e permite melhorias futuras centralizadas

### 3. **Adicionar Constraint Única (Opcional)** (Prioridade: Baixa)

**Proposta:**
- Adicionar constraint UNIQUE parcial: `(telefone, campanha_id)` WHERE `status_envio = 'enviado'`
- Previne duplicatas mesmo em caso de bug na aplicação
- **CUIDADO:** Pode quebrar se houver necessidade de reenvio (ex: após correção de erro)

### 4. **Melhorar Feedback Visual** (Prioridade: Baixa)

**Proposta:**
- Mostrar contador: "X clientes já receberam mensagens (ocultos pelo filtro)"
- Botão "Mostrar clientes já enviados" para visualização
- Tooltip explicando que backend sempre valida antes de enviar

### 5. **Adicionar Logs de Auditoria** (Prioridade: Baixa)

**Proposta:**
- Registrar quando validação de duplicata previne envio
- Métricas: quantos clientes foram pulados por duplicata por execução

## 📊 Conclusão

### Nível de Segurança Atual: **ALTO** ✅

**Garantias:**
1. ✅ Validação backend robusta (última linha de defesa)
2. ✅ Normalização de telefones implementada
3. ✅ Indicadores visuais claros na interface
4. ✅ Filtro opcional para facilitar seleção

**Riscos Residuais:**
- ⚠️ Seleção manual de clientes já enviados (baixo impacto - backend previne)
- ⚠️ Múltiplas execuções simultâneas (risco teórico - controle de execução existe)

**Recomendação:** Sistema está seguro para produção. Melhorias propostas são incrementais e não críticas.

