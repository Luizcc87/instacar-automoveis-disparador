# CHANGELOG - Dashboard e Histórico de Execuções

**Data:** Dezembro 2025  
**Versão:** 2.7

## Resumo

Melhorias implementadas no dashboard de campanhas para relacionar e visualizar todas as execuções de uma campanha, incluindo histórico completo de envios individuais.

## Melhorias Implementadas

### 1. Tabela de Execuções Aprimorada

**Antes:** Tabela simples com colunas básicas (Data, Status, Enviados, Erros, Trigger, Início, Ações).

**Agora:**
- **Colunas adicionais:**
  - Duplicados
  - Sem WhatsApp
  - Progresso (barra visual + percentual)
  - Início/Fim (horários formatados)
- **Badges de status coloridos:**
  - 🟢 Em andamento (azul)
  - ⏸️ Pausada (laranja)
  - ✅ Concluída (verde)
  - ❌ Erro (vermelho)
- **Indicador "HOJE"** para execuções do dia atual
- **Barra de progresso visual** mostrando processados/total elegíveis
- **Informações de lote:** contatos processados, pendentes e percentual

### 2. Botão "Ver Envios" por Execução

Cada execução na tabela agora possui um botão **"📨 Ver Envios"** que abre um modal com:
- Estatísticas resumidas (Total, Enviados, Erros, Bloqueados)
- Informações da execução (Status, Horário início/fim)
- Lista completa de envios individuais com:
  - Status com ícones visuais
  - Nome do cliente e telefone
  - Mensagem enviada (preview + tooltip com texto completo)
  - Mensagem de erro (se houver)
  - Tipo de envio (teste/debug/normal)
  - Timestamp formatado

### 3. Busca Alternativa de Execuções

**Problema resolvido:** Quando execuções têm `campanha_id` incorreto na tabela `instacar_campanhas_execucoes`, o sistema agora busca via histórico de envios (`instacar_historico_envios`), que possui o `campanha_id` correto.

**Como funciona:**
1. Tenta buscar execuções diretamente pelo `campanha_id`
2. Se não encontrar, busca no histórico de envios por registros com o `campanha_id` correto
3. Extrai os `execucao_id` únicos do histórico
4. Busca as execuções usando esses IDs
5. Exibe as execuções encontradas no dashboard

### 4. Logs de Debug

Logs detalhados adicionados para facilitar diagnóstico:
- Busca de execuções
- Execuções encontradas via histórico
- Total de execuções para renderizar
- Detalhes da primeira execução
- Renderização da tabela

## Arquivos Modificados

- `interface-web/app.js`:
  - Função `abrirDashboardCampanha()`: Melhorias na busca e renderização de execuções
  - Nova função `verHistoricoExecucao()`: Modal para visualizar histórico de envios de uma execução
  - Nova função `fecharModalHistoricoExecucao()`: Fechar modal de histórico

## Como Usar

### Visualizar Execuções de uma Campanha

1. Abra o dashboard de uma campanha (botão "📊 Dashboard")
2. Na seção "📋 Histórico de Execuções", veja todas as execuções relacionadas
3. Cada execução mostra:
   - Data e status
   - Contadores (Enviados, Erros, Duplicados, Sem WhatsApp)
   - Progresso visual
   - Horários de início/fim
   - Ações disponíveis (Pausar/Continuar/Cancelar para execuções de hoje)

### Ver Histórico de Envios de uma Execução

1. No dashboard, localize a execução desejada
2. Clique no botão **"📨 Ver Envios"**
3. O modal exibirá:
   - Estatísticas resumidas
   - Lista completa de envios individuais
   - Detalhes de cada envio (cliente, mensagem, status, erro se houver)

## Benefícios

- **Visão completa:** Todas as execuções de uma campanha em um só lugar
- **Detalhamento:** Histórico completo de cada execução
- **Rastreabilidade:** Cada envio vinculado à execução correta
- **Análise:** Estatísticas por execução para identificar padrões
- **Robustez:** Busca alternativa quando dados estão inconsistentes

## Notas Técnicas

- Limite de 500 envios por execução no modal (com aviso se houver mais)
- Busca alternativa funciona mesmo quando `campanha_id` está incorreto na tabela de execuções
- Logs de debug podem ser visualizados no console do navegador (F12)

