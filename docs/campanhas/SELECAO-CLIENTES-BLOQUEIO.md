# Seleção de Clientes e Bloqueio de Envios

Sistema completo de seleção de clientes para campanhas e bloqueio de envios para clientes que solicitaram opt-out ou que a empresa decidiu não enviar mensagens.

## 📋 Funcionalidades

### 1. Seleção de Clientes para Campanhas

- **Selecionar Todos**: Marca todos os clientes elegíveis com um clique
- **Desmarcar Todos**: Remove todas as seleções
- **Inverter Seleção**: Inverte a seleção atual
- **Seleção Individual**: Marcar/desmarcar clientes individualmente
- **Busca**: Filtrar clientes por nome ou telefone

**Comportamento:**
- Se nenhum cliente for selecionado → Campanha envia para todos os clientes elegíveis
- Se clientes forem selecionados → Campanha envia apenas para os selecionados

### 2. Bloqueio de Envios

- **Campo `bloqueado_envios`**: Indica se o cliente está bloqueado para receber mensagens
- **Cliente bloqueado NUNCA recebe mensagens**, mesmo que esteja selecionado em campanhas
- **Clientes bloqueados não aparecem** na lista de seleção de campanhas

**Onde gerenciar:**
- Modal de edição do cliente: Checkbox "Não enviar mensagens"
- Lista de clientes: Coluna "Bloqueado" com botão rápido para alternar

## 🗄️ Estrutura do Banco de Dados

### Campo de Bloqueio

**Tabela:** `instacar_clientes_envios`

```sql
bloqueado_envios BOOLEAN DEFAULT FALSE NOT NULL
```

- `true`: Cliente bloqueado - não receberá mensagens
- `false`: Cliente permitido - pode receber mensagens

**Índice:** `idx_clientes_bloqueado_envios` (otimiza queries que filtram clientes não bloqueados)

### Tabela de Relacionamento

**Tabela:** `instacar_campanhas_clientes`

Armazena quais clientes estão selecionados para cada campanha.

```sql
CREATE TABLE instacar_campanhas_clientes (
  id UUID PRIMARY KEY,
  campanha_id UUID REFERENCES instacar_campanhas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES instacar_clientes_envios(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campanha_id, cliente_id)
);
```

**Lógica:**
- Se campanha tem registros nesta tabela → Usa seleção específica
- Se campanha NÃO tem registros → Envia para todos os elegíveis (comportamento padrão)

## 🎯 Filtros Aplicados

### Clientes Elegíveis para Seleção

A interface web mostra apenas clientes que atendem TODOS os critérios:

1. `ativo = true` (cliente ativo)
2. `bloqueado_envios = false` (não bloqueado)
3. `status_whatsapp = 'valid'` (WhatsApp validado)

### Workflow N8N

O workflow aplica os mesmos filtros ao buscar clientes:

1. `ativo = true`
2. `bloqueado_envios = false`
3. `status_whatsapp = 'valid'`

**Se campanha tem seleção específica:**
- Busca apenas clientes que estão na tabela `instacar_campanhas_clientes`
- Ainda aplica os filtros acima (bloqueio, ativo, WhatsApp válido)

**Se campanha não tem seleção específica:**
- Busca todos os clientes elegíveis (comportamento padrão)

## 📝 Como Usar

### Bloquear um Cliente

1. **Via Modal de Cliente:**
   - Abra os detalhes do cliente
   - Clique em "✏️ Editar"
   - Marque o checkbox "🚫 Não enviar mensagens (Bloqueado)"
   - Clique em "💾 Salvar"

2. **Via Lista de Clientes:**
   - Na coluna "Bloqueado", clique no botão "🚫"
   - Confirme o bloqueio

### Desbloquear um Cliente

1. **Via Modal de Cliente:**
   - Abra os detalhes do cliente
   - Clique em "✏️ Editar"
   - Desmarque o checkbox "🚫 Não enviar mensagens"
   - Clique em "💾 Salvar"

2. **Via Lista de Clientes:**
   - Na coluna "Bloqueado", clique no botão "🔓"
   - Confirme o desbloqueio

### Selecionar Clientes para Campanha

1. **Criar/Editar Campanha:**
   - Abra o modal de criação/edição de campanha
   - Role até a seção "👥 Selecionar Clientes para Campanha"

2. **Selecionar:**
   - Use "✅ Selecionar Todos" para marcar todos os elegíveis
   - Use "❌ Desmarcar Todos" para remover todas as seleções
   - Use "🔄 Inverter Seleção" para inverter a seleção atual
   - Marque/desmarque individualmente conforme necessário

3. **Salvar:**
   - Clique em "Salvar" na campanha
   - A seleção será salva automaticamente

### Ver Clientes Selecionados

1. Abra o dashboard da campanha
2. Veja a seção "👥 Clientes Selecionados"
3. Mostra:
   - Modo de seleção (específica ou todos)
   - Lista de clientes selecionados (se houver)
   - Botão para editar seleção

## 🔧 Scripts SQL

### Aplicar Schemas

Execute na ordem no Editor SQL do Supabase:

```bash
# 1. Adicionar campo de bloqueio
docs/supabase/schema-clientes-bloqueio.sql

# 2. Criar tabela de relacionamento
docs/supabase/schema-campanhas-clientes.sql
```

### Verificar Configuração

```bash
# Verificar se tudo está configurado corretamente
docs/supabase/verificar-selecao-clientes.sql
```

### Verificar Status dos Clientes

```bash
# Ver distribuição de status_whatsapp
docs/supabase/verificar-status-clientes.sql
```

## ⚠️ Observações Importantes

1. **Clientes bloqueados são sempre excluídos**, mesmo que estejam selecionados na campanha
2. **Apenas clientes com WhatsApp validado** aparecem na seleção (segurança)
3. **Seleção vazia = todos os elegíveis** (comportamento padrão)
4. **Deletar campanha** remove automaticamente todas as seleções (CASCADE)

## 🎨 Interface e UX

### Layout da Lista de Seleção

A lista de clientes na seleção de campanhas foi otimizada para:
- Checkbox compacto (18x18px) que não ocupa espaço excessivo
- Nome do cliente em destaque com quebra de linha automática
- Telefone e status em linhas separadas para melhor legibilidade
- Espaçamento otimizado usando `gap` em vez de margens fixas

### Responsividade

A interface se adapta a diferentes tamanhos de tela:
- Lista com scroll vertical quando há muitos clientes
- Busca responsiva que filtra em tempo real
- Contador de seleção sempre visível

## 🐛 Troubleshooting

### Problema: Cliente bloqueado ainda recebe mensagens

**Solução:** Verifique se o workflow N8N está usando a versão atualizada com filtro `bloqueado_envios = false`

### Problema: Cliente não aparece na seleção

**Possíveis causas:**
1. Cliente está bloqueado (`bloqueado_envios = true`)
2. Cliente está desativado (`ativo = false`)
3. WhatsApp não está validado (`status_whatsapp != 'valid'`)

**Solução:** Verifique os três campos no modal de edição do cliente

### Problema: "Selecionar Todos" não marca todos

**Causa:** Apenas clientes elegíveis são marcados (ativo, não bloqueado, WhatsApp válido)

**Solução:** Isso é o comportamento esperado. Clientes bloqueados ou com WhatsApp inválido não devem ser incluídos.

### Problema: Apenas 1000 clientes aparecem na seleção

**Causa:** ~~Limite antigo do Supabase (corrigido em Dezembro 2025)~~

**Solução:** ✅ **Corrigido** - O sistema agora carrega todos os clientes elegíveis automaticamente em lotes, sem limite de 1000. Todos os clientes com WhatsApp válido aparecem na lista de seleção.

