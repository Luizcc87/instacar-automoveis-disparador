# Changelog - Filtros e Ordenação de Clientes (Dezembro 2025)

## Funcionalidade: Sistema de Filtros e Ordenação na Lista de Clientes

### Resumo

Implementação completa de sistema de filtros e ordenação para a lista de clientes, disponível em dois contextos:
- **Tela inicial (Gerenciar Clientes)**: Ordenação e filtros na visualização principal
- **Seleção de clientes para campanhas**: Ordenação e filtros na tela de criação/edição de campanhas

### Campos de Ordenação Disponíveis

1. **Nome do Cliente** (alfabética) - Padrão: A-Z
2. **Último Envio** (data/hora)
3. **Número de Veículos** (numérico) - Ordenação client-side
4. **Status WhatsApp** (valid, invalid, unknown)
5. **Status de Bloqueio** (bloqueado_envios: true/false)

### Funcionalidades Implementadas

#### 1. Controles de Ordenação

- **Seletor de Campo**: Dropdown para escolher o campo de ordenação
- **Seletor de Direção**: Dropdown para escolher ordem crescente (↑) ou decrescente (↓)
- **Aplicação Automática**: Ordenação aplicada automaticamente ao selecionar campo ou direção
- **Indicadores Visuais**: Setas (↑ ↓) para indicar direção de ordenação

#### 2. Persistência de Preferências

- **localStorage**: Preferências salvas automaticamente
- **Restauração**: Preferências restauradas ao recarregar a página
- **Contextos Separados**: Preferências independentes para tela inicial e seleção de campanhas

#### 3. Tratamento de Campos Especiais

- **Timestamps** (`ultimo_envio`): Ordenação por data/hora com tratamento de valores nulos
- **Booleanos** (`bloqueado_envios`): Ordenação booleana (false < true)
- **Strings** (`nome_cliente`, `status_whatsapp`): Ordenação alfabética padrão
- **JSONB/Arrays** (`num_veiculos`): Ordenação client-side (não suportada diretamente pelo Supabase)
  - Busca todos os registros em lotes de 1000 para evitar limite do Supabase
  - Ordena client-side após buscar todos os registros filtrados
  - Aplica paginação após ordenação

#### 4. Integração com Filtros Existentes

- **Compatibilidade**: Funciona em conjunto com filtros de busca, status WhatsApp, bloqueio e número de veículos
- **Paginação**: Mantém paginação ao alterar ordenação
- **Performance**: Ordenação realizada no banco de dados (Supabase) para melhor performance
- **Busca Paginada**: Quando ordenar por número de veículos, busca todos os registros em lotes de 1000 para evitar limite do Supabase

### Implementação Técnica

#### Arquivos Modificados

1. **interface-web/index.html**
   - Adicionados controles de ordenação na seção "Gerenciar Clientes"
   - Adicionados controles de ordenação na seção "Seleção de Clientes para Campanhas"

2. **interface-web/app.js**
   - Modificada função `carregarListaClientes()` para aplicar ordenação nas queries do Supabase
   - Modificada função `carregarClientesParaSelecao()` para aplicar ordenação e incluir campos necessários
   - Adicionada ordenação local na função `renderizarListaClientesSelecao()` para manter consistência após filtros
   - Criada função `inicializarOrdenacaoClientes()` para restaurar preferências do localStorage
   - Exposição global da função `renderizarListaClientesSelecao()` para acesso via HTML

#### Detalhes de Implementação

**Tela Inicial (Gerenciar Clientes):**
- Ordenação aplicada diretamente na query do Supabase
- Mantém paginação atual ao alterar ordenação
- Integrado com filtros de busca e status WhatsApp

**Seleção de Clientes para Campanhas:**
- Ordenação aplicada na query do Supabase ao carregar clientes
- Ordenação local adicional após filtros de busca para manter consistência
- Campos adicionais incluídos na query (`ultimo_envio`, `bloqueado_envios`) para suportar ordenação

### Benefícios

1. **Organização**: Facilita encontrar clientes específicos na lista
2. **Produtividade**: Reduz tempo de busca ao organizar por critérios relevantes
3. **Flexibilidade**: Múltiplas opções de ordenação para diferentes necessidades
4. **Persistência**: Preferências mantidas entre sessões
5. **Performance**: Ordenação no banco de dados é mais eficiente que ordenação local

### Uso

#### Na Tela Inicial (Gerenciar Clientes)

1. Selecione o campo de ordenação no dropdown "Ordenar por"
2. Selecione a direção (Crescente ↑ ou Decrescente ↓)
3. A lista será automaticamente atualizada com a nova ordenação

#### Na Seleção de Clientes para Campanhas

1. Abra o modal de criação/edição de campanha
2. Na seção "Selecionar Clientes para Campanha"
3. Use os dropdowns de ordenação acima da lista de clientes
4. A lista será automaticamente reordenada

### Ordenação Padrão

- **Campo**: Nome do Cliente (A-Z)
- **Direção**: Crescente (↑)

### Notas Técnicas

- Ordenação no Supabase é mais eficiente para grandes volumes de dados
- Índices existentes no banco otimizam performance das ordenações
- Valores nulos são tratados adequadamente em cada tipo de campo
- Compatibilidade retroativa mantida (valores padrão quando controles não existirem)
- **Ordenação por Veículos**: Requer busca paginada em lotes devido ao limite de 1000 registros do Supabase e impossibilidade de ordenar JSONB diretamente
- **Otimização de Histórico**: Busca histórico de envios apenas para clientes da página atual para evitar URLs muito longas

