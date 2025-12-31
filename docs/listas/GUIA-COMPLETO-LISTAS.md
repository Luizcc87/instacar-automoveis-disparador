# Guia Completo: Sistema de Listas Avançado para Campanhas WhatsApp

## Visão Geral

O sistema de listas permite criar listas reutilizáveis de clientes que podem ser vinculadas a campanhas ou disparadas independentemente. As listas podem ser divididas em lotes menores e agendadas para execução automática.

## Tipos de Listas

### 1. Listas Estáticas

Listas com seleção manual de clientes. Ideal para:
- Listas VIP específicas
- Grupos de clientes selecionados manualmente
- Listas pequenas e específicas

**Como criar:**
1. Acesse "Listas de Clientes" no menu lateral
2. Clique em "+ Nova Lista"
3. Selecione tipo "Estática"
4. Na aba "Seleção", escolha os clientes desejados
5. Salve a lista

### 2. Listas Dinâmicas

Listas baseadas em filtros JSONB que são resolvidos em tempo de execução. Ideal para:
- Clientes com características específicas (ex: status WhatsApp, total de envios)
- Listas que precisam ser atualizadas automaticamente
- Filtros complexos com múltiplas condições

**Como criar:**
1. Acesse "Listas de Clientes"
2. Clique em "+ Nova Lista"
3. Selecione tipo "Dinâmica"
4. Na aba "Filtros", adicione condições de filtro
5. Use "Testar Filtros" para ver quantos clientes atendem aos critérios
6. Salve a lista

**Exemplos de filtros:**
- Status WhatsApp = "valid"
- Total de Envios > 5
- Nome do Cliente contém "Silva"

### 3. Listas Baseadas em Campanhas

Listas que filtram clientes baseado no histórico de outra campanha. Ideal para:
- Clientes que não receberam mensagem de uma campanha específica
- Clientes que receberam mensagem com erro
- Segmentação baseada em comportamento de campanhas anteriores

**Como criar:**
1. Acesse "Listas de Clientes"
2. Clique em "+ Nova Lista"
3. Selecione tipo "Baseada em Campanha"
4. Escolha a campanha base e o critério (não receberam, receberam, etc.)
5. Salve a lista

## Escopo de Listas

### Listas Globais

- Reutilizáveis em múltiplas campanhas
- Podem ser selecionadas no formulário de campanha
- Ideais para listas que serão usadas várias vezes

### Listas Específicas

- Vinculadas a uma campanha específica
- Criadas automaticamente ao selecionar clientes manualmente em uma campanha
- Não aparecem no seletor de listas globais

## Gerenciamento de Lotes

Lotes permitem dividir uma lista em grupos menores para processamento escalonado.

### Criar Lotes Automaticamente

1. Abra uma lista existente
2. Vá para a aba "Lotes"
3. Clique em "Gerar Lotes Automaticamente"
4. Informe o tamanho de cada lote (ex: 200 clientes)
5. O sistema criará lotes automaticamente dividindo a lista

### Criar Lote Manualmente

1. Na aba "Lotes", clique em "Criar Lote Manual"
2. Informe nome, ordem e selecione os clientes
3. Salve o lote

### Visualizar Clientes de um Lote

1. Na lista de lotes, clique em "👁️ Ver" no lote desejado
2. Uma tabela mostrará todos os clientes do lote com seus detalhes

## Agendamento Automático

Listas e lotes podem ser agendados para execução automática usando expressões cron.

### Sintaxe de Expressões Cron

Formato: `minuto hora dia_mês mês dia_semana`

**Exemplos:**
- `0 9 * * 1-5` - 9h, dias úteis (segunda a sexta)
- `30 14 * * *` - 14:30, todos os dias
- `0 10 * * 0` - 10h, domingos
- `*/15 * * * *` - A cada 15 minutos

### Configurar Agendamento

1. Abra uma lista ou lote
2. Vá para a aba "Agendamento"
3. Marque "Ativar Agendamento Automático"
4. Digite a expressão cron
5. O sistema mostrará as próximas execuções e detectará conflitos

### Detecção de Conflitos

O sistema detecta automaticamente quando múltiplas listas/lotes estão agendados para o mesmo horário e alerta sobre possíveis conflitos de limite diário.

## Integração com Campanhas

### Vincular Lista a uma Campanha

1. Ao criar/editar uma campanha, use o campo "Lista de Clientes"
2. Selecione uma lista global
3. A campanha usará apenas os clientes dessa lista

### Seleção Manual vs Lista

- Se uma lista está vinculada, a seleção manual é desabilitada
- Se não há lista, a seleção manual funciona normalmente
- Listas específicas são criadas automaticamente ao selecionar clientes manualmente

## Limites e Validações

### Limite Diário por Lista

Cada lista pode ter seu próprio limite de envios por dia (padrão: 200). Isso permite múltiplas listas no mesmo dia sem exceder limites globais.

### Validação de Lista Vazia

- Ao salvar uma lista dinâmica vazia, o sistema alerta
- Ao disparar uma lista vazia, o workflow registra erro e para
- Listas estáticas podem ser salvas vazias (útil para preencher depois)

### Rate Limiting

O workflow N8N limita a 5 listas/lotes simultâneos para evitar sobrecarga. Demais são marcadas como "em espera".

## Casos de Uso Comuns

### Caso 1: Lista VIP

1. Criar lista estática "Clientes VIP"
2. Selecionar clientes manualmente
3. Vincular à campanha "Promoção VIP"
4. Disparar manualmente ou agendar

### Caso 2: Clientes Inativos

1. Criar lista dinâmica "Inativos há 30 dias"
2. Adicionar filtro: Último Envio < (hoje - 30 dias)
3. Agendar para executar mensalmente
4. Vincular a campanha de reativação

### Caso 3: Clientes que Não Receberam Campanha

1. Criar lista baseada em campanha
2. Selecionar campanha anterior
3. Critério: "Não receberam mensagem"
4. Usar para campanha de follow-up

### Caso 4: Divisão em Lotes

1. Criar lista com 1000 clientes
2. Gerar 5 lotes de 200 clientes cada
3. Agendar cada lote em dias diferentes
4. Processar gradualmente respeitando limites

## Troubleshooting

### Lista não aparece no seletor de campanhas

- Verifique se o escopo é "Global"
- Verifique se a lista está ativa
- Recarregue a página

### Filtros dinâmicos não retornam clientes

- Verifique se os filtros estão corretos
- Use "Testar Filtros" para validar
- Verifique se há clientes que atendem aos critérios

### Agendamento não executa

- Verifique se o agendamento está ativo
- Valide a expressão cron
- Verifique logs do workflow N8N

### Lote muito grande

- Use "Gerar Lotes Automaticamente" para dividir
- Configure tamanho menor (ex: 100 em vez de 500)
- Agende lotes em dias diferentes

## Boas Práticas

1. **Nomenclatura clara**: Use nomes descritivos para listas (ex: "VIP - Dezembro 2025")
2. **Documentação**: Use o campo descrição para explicar o propósito da lista
3. **Testes**: Sempre teste filtros dinâmicos antes de salvar
4. **Agendamento**: Evite conflitos de horário entre múltiplas listas
5. **Lotes**: Divida listas grandes em lotes menores para melhor controle
6. **Limites**: Configure limites diários realistas para evitar bloqueios

## Migração de Dados Existentes

Se você tinha seleções específicas de clientes em campanhas antigas, elas foram automaticamente migradas para o sistema de listas com o nome "Lista Legado: [nome da campanha]".

Para verificar:
1. Acesse "Listas de Clientes"
2. Procure por listas com nome começando com "Lista Legado:"
3. Revise e renomeie conforme necessário

