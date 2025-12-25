# Resumo: Implementação de Continuação de Lotes via Webhook

## Data: Dezembro 2025

## Objetivo

Implementar sistema de continuação de lotes usando chamadas recursivas ao webhook `/campanha`, garantindo que cada lote seja processado em uma execução separada do N8N e que a tabela de execuções seja atualizada corretamente.

## Implementação Realizada

### 1. Novos Nós no Workflow N8N

Foram adicionados 4 novos nós no workflow `Disparador_Web_Campanhas_Instacar.json`:

#### Nó: "Atualizar Lote Atual"
- **Tipo:** Code
- **Função:** Incrementa `lote_atual` na execução antes de chamar o próximo lote
- **Posição:** Após "IF Tem Pendentes" (quando há pendentes)

#### Nó: "HTTP Atualizar Lote Atual"
- **Tipo:** HTTP Request (PATCH)
- **Função:** Atualiza o registro de execução no Supabase com o novo `lote_atual`
- **URL:** `{{SUPABASE_URL}}/rest/v1/instacar_campanhas_execucoes?id=eq.{{execucao_id}}`

#### Nó: "Preparar Chamada Próximo Lote"
- **Tipo:** Code
- **Função:** Prepara o payload para chamar o webhook `/campanha` com `continuar: true`
- **Payload:**
  ```json
  {
    "execucao_id": "uuid-da-execucao",
    "campanha_id": "uuid-da-campanha",
    "trigger_tipo": "cron",
    "continuar": true
  }
  ```

#### Nó: "Chamar Próximo Lote (Webhook)"
- **Tipo:** HTTP Request (POST)
- **Função:** Chama o webhook `/campanha` para processar o próximo lote em uma nova execução
- **URL:** `{{n8n_webhook_url}}` (obtido de `instacar_configuracoes_sistema`)

### 2. Modificações no Fluxo

**Antes:**
- Quando havia pendentes, o workflow fazia loop interno retornando para "Split in Batches"
- Todos os lotes eram processados na mesma execução

**Depois:**
- Quando há pendentes, o workflow:
  1. Incrementa `lote_atual` no banco
  2. Chama o webhook `/campanha` com `continuar: true`
  3. Encerra a execução atual
  4. Nova execução é iniciada pelo webhook para processar o próximo lote

### 3. Regras de Atualização da Tabela

#### Campos Atualizados

- **`lote_atual`**: Incrementado antes de cada novo lote
- **`contatos_processados`**: Incrementado a cada cliente processado
- **`contatos_pendentes`**: Recalculado: `total_contatos_elegiveis - contatos_processados`
- **`status_execucao`**: 
  - `em_andamento` durante processamento
  - `concluida` quando `contatos_pendentes = 0`
  - `pausada` quando pausado manualmente ou limite atingido

#### Fluxo de Atualização

1. **Durante processamento de um lote:**
   - `contatos_processados` incrementa
   - `contatos_pendentes` recalcula
   - `status_execucao = 'em_andamento'`

2. **Ao finalizar um lote (com pendentes):**
   - `lote_atual` incrementa
   - Webhook é chamado
   - Execução atual encerra

3. **Ao finalizar todos os lotes:**
   - `status_execucao = 'concluida'`
   - `horario_fim` é preenchido
   - Webhook **NÃO** é chamado

### 4. Documentação Criada

#### `docs/campanhas/guia-continuacao-lotes-webhook.md`
- Arquitetura completa do sistema
- Regras de atualização da tabela
- Descrição detalhada de cada nó
- Queries SQL úteis
- Troubleshooting

#### `docs/interface-web/CHANGELOG-dashboard-lotes-2025-12.md`
- Melhorias propostas para a dashboard
- Exemplos de código para implementação
- Queries SQL otimizadas
- Benefícios das melhorias

#### `docs/campanhas/guia-testes-continuacao-lotes.md`
- Cenários de teste completos
- Checklist de validação
- Problemas conhecidos e soluções
- Métricas de sucesso

## Benefícios

1. **Escalabilidade:** Cada lote é processado em execução separada, evitando timeouts
2. **Rastreabilidade:** `lote_atual` permite rastrear progresso por lote
3. **Confiabilidade:** Se uma execução falhar, outras continuam normalmente
4. **Monitoramento:** Dashboard pode exibir progresso detalhado por lote

## Próximos Passos

1. **Testes:** Executar cenários de teste documentados
2. **Dashboard:** Implementar melhorias propostas na interface web
3. **Monitoramento:** Adicionar alertas para lotes que demoram muito
4. **Otimização:** Considerar processamento paralelo de lotes (futuro)

## Arquivos Modificados

- `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json` - Adicionados 4 novos nós e modificado fluxo

## Arquivos Criados

- `docs/campanhas/guia-continuacao-lotes-webhook.md`
- `docs/interface-web/CHANGELOG-dashboard-lotes-2025-12.md`
- `docs/campanhas/guia-testes-continuacao-lotes.md`
- `docs/campanhas/RESUMO-IMPLEMENTACAO-CONTINUACAO-LOTES.md` (este arquivo)

## Status

✅ **Implementação Completa**

- Nós criados e configurados
- Fluxo modificado corretamente
- Documentação completa
- Pronto para testes

