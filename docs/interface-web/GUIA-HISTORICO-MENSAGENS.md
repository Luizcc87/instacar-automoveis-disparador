# Guia: Histórico de Mensagens por Contato e Campanha

## Visão Geral

O sistema de histórico de mensagens permite visualizar, filtrar e analisar todas as mensagens enviadas para cada contato, vinculadas às campanhas correspondentes. Este guia explica como usar todas as funcionalidades disponíveis.

## Acessando o Histórico

1. **Abrir detalhes do cliente:**
   - Na lista de clientes, clique no botão "👁️ Ver" ao lado do cliente desejado
   - O modal de detalhes será aberto

2. **Acessar aba Histórico:**
   - No modal de detalhes, clique na aba "Histórico"
   - O histórico completo de mensagens será carregado automaticamente

## Funcionalidades da Interface

### Estatísticas Resumidas

No topo da aba Histórico, você verá 4 cards com estatísticas:

- **Total de Envios**: Número total de mensagens enviadas para este contato
- **Enviados com Sucesso**: Quantidade de mensagens enviadas com sucesso
- **Erros**: Quantidade de mensagens que falharam
- **Campanhas Diferentes**: Número de campanhas distintas que enviaram mensagens para este contato

### Filtros Disponíveis

#### 1. Filtro por Campanha
- **Localização**: Dropdown "Todas as campanhas"
- **Uso**: Selecione uma campanha específica para ver apenas mensagens dessa campanha
- **Opções**: Lista todas as campanhas cadastradas no sistema

#### 2. Filtro por Status
- **Localização**: Dropdown "Todos os status"
- **Opções**:
  - **Todos os status**: Mostra todos os registros
  - **Enviado**: Apenas mensagens enviadas com sucesso
  - **Erro**: Apenas mensagens que falharam
  - **Bloqueado**: Apenas mensagens bloqueadas

#### 3. Filtro por Período de Datas
- **Localização**: Campos "De" e "Até"
- **Uso**: 
  - Selecione a data inicial no campo "De"
  - Selecione a data final no campo "Até"
  - O histórico será filtrado para mostrar apenas mensagens neste período
- **Dica**: Você pode usar apenas um dos campos (início ou fim) para filtrar

#### 4. Busca por Texto
- **Localização**: Campo "Buscar na mensagem..."
- **Uso**: Digite qualquer texto para buscar dentro do conteúdo das mensagens
- **Funcionamento**: A busca é feita em tempo real enquanto você digita
- **Exemplo**: Digite "promoção" para encontrar todas as mensagens que contêm essa palavra

### Botões de Ação

#### Exportar CSV
- **Localização**: Botão "📥 Exportar CSV"
- **Funcionalidade**: Exporta o histórico filtrado para um arquivo CSV
- **Uso**: 
  1. Aplique os filtros desejados
  2. Clique em "Exportar CSV"
  3. O arquivo será baixado automaticamente com nome `historico_envios_YYYY-MM-DD.csv`
- **Conteúdo do CSV**:
  - Data/Hora
  - Status
  - Tipo (normal, teste, debug)
  - Campanha
  - Mensagem completa
  - Mensagem de erro (se houver)

#### Limpar Filtros
- **Localização**: Botão "🔄 Limpar"
- **Funcionalidade**: Remove todos os filtros aplicados e mostra o histórico completo novamente

### Paginação

Quando há muitos registros, o sistema divide em páginas:

- **Registros por página**: 20 registros
- **Controles**: 
  - Botão "← Anterior": Vai para a página anterior
  - Informação "Página X de Y": Mostra página atual e total
  - Botão "Próxima →": Vai para a próxima página
- **Observação**: A paginação aparece apenas quando há mais de 20 registros

### Tabela de Histórico

A tabela exibe as seguintes colunas:

1. **Data/Hora**: Data e hora do envio formatada (DD/MM/YYYY HH:MM)
2. **Status**: Badge visual indicando o status:
   - ✅ **Enviado**: Mensagem enviada com sucesso (verde)
   - ❌ **Erro**: Mensagem falhou (vermelho)
   - 🚫 **Bloqueado**: Mensagem bloqueada (cinza)
3. **Tipo**: Tipo de envio:
   - 📱 **Normal**: Envio padrão
   - 🧪 **Teste**: Envio de teste
   - 🔍 **Debug**: Envio para debug
4. **Campanha**: Nome da campanha (clicável para ver detalhes)
5. **Mensagem**: Preview da mensagem (passe o mouse para ver completa)

## Casos de Uso

### Caso 1: Ver todas as mensagens de uma campanha específica

1. Abra os detalhes do cliente
2. Vá para a aba "Histórico"
3. No filtro "Todas as campanhas", selecione a campanha desejada
4. A tabela será atualizada automaticamente

### Caso 2: Encontrar mensagens com erro

1. Abra os detalhes do cliente
2. Vá para a aba "Histórico"
3. No filtro "Todos os status", selecione "Erro"
4. Revise as mensagens de erro e suas causas

### Caso 3: Ver mensagens de um período específico

1. Abra os detalhes do cliente
2. Vá para a aba "Histórico"
3. No campo "De", selecione a data inicial
4. No campo "Até", selecione a data final
5. O histórico será filtrado automaticamente

### Caso 4: Buscar mensagem específica

1. Abra os detalhes do cliente
2. Vá para a aba "Histórico"
3. No campo "Buscar na mensagem...", digite palavras-chave
4. A tabela será filtrada em tempo real

### Caso 5: Exportar histórico para análise

1. Abra os detalhes do cliente
2. Vá para a aba "Histórico"
3. Aplique os filtros desejados (opcional)
4. Clique em "📥 Exportar CSV"
5. Abra o arquivo CSV no Excel ou Google Sheets para análise

## Dicas e Truques

### Dica 1: Combinar Filtros
Você pode combinar múltiplos filtros simultaneamente:
- Exemplo: Filtrar por campanha "Black Friday" + status "Enviado" + período "Novembro 2024"

### Dica 2: Ver Mensagem Completa
Passe o mouse sobre a coluna "Mensagem" para ver o texto completo em um tooltip

### Dica 3: Ver Detalhes da Campanha
Clique no nome da campanha na tabela para abrir os detalhes da campanha (se implementado)

### Dica 4: Estatísticas em Tempo Real
As estatísticas no topo são atualizadas automaticamente quando você aplica filtros

### Dica 5: Limpar Filtros Rapidamente
Use o botão "🔄 Limpar" para remover todos os filtros de uma vez

## Troubleshooting

### Problema: Histórico não aparece

**Sintomas:**
- Tabela mostra "Nenhum histórico de envio encontrado"
- Estatísticas mostram zeros

**Soluções:**
1. Verifique se o cliente tem mensagens registradas no banco de dados
2. Verifique se os filtros não estão muito restritivos
3. Clique em "🔄 Limpar" para remover filtros
4. Verifique o console do navegador (F12) para erros

### Problema: Filtros não funcionam

**Sintomas:**
- Filtros não atualizam a tabela
- Mensagens de erro no console

**Soluções:**
1. Verifique se está conectado ao Supabase
2. Recarregue a página (F5)
3. Verifique o console do navegador (F12) para erros específicos

### Problema: Exportação CSV não funciona

**Sintomas:**
- Botão não faz nada
- Arquivo não é baixado

**Soluções:**
1. Verifique se há registros para exportar
2. Verifique se o navegador permite downloads
3. Tente em outro navegador
4. Verifique o console do navegador (F12) para erros

## Limitações Conhecidas

1. **Limite de registros por página**: 20 registros (pode ser ajustado no código)
2. **Busca por texto**: Apenas busca no conteúdo da mensagem, não em outros campos
3. **Exportação**: Apenas formato CSV (Excel pode abrir CSV)
4. **Performance**: Com muitos registros (milhares), os filtros podem ser mais lentos

## Melhorias Futuras

- [ ] Gráficos de envios ao longo do tempo
- [ ] Filtro por tipo de envio (normal, teste, debug)
- [ ] Exportação em formato Excel (.xlsx)
- [ ] Busca avançada com múltiplos critérios
- [ ] Histórico comparativo entre campanhas
- [ ] Notificações quando novos envios são registrados

## Suporte

Para mais informações ou problemas, consulte:
- Documentação dos relatórios SQL: `docs/supabase/RELATORIOS-HISTORICO.md`
- Queries de verificação: `docs/supabase/verificar-historico-sem-campanha.sql`
- Documentação do sistema: `CLAUDE.md`

