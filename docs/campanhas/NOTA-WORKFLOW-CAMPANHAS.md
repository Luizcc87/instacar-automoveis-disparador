# Nota: Workflow de Campanhas - Status Atual

**Status:** ✅ **100% Implementado**

O workflow `Disparador_Web_Campanhas_Instacar.json` está **completamente implementado** com todas as funcionalidades necessárias para disparo de campanhas.

## Status Atual (Janeiro 2025)

✅ **100% Implementado:**

- ✅ Triggers híbridos (Webhook, Schedule, Manual)
- ✅ Validação de payload
- ✅ Validação de horário comercial e dias úteis
- ✅ Obtenção e validação de campanha
- ✅ Verificação de execução duplicada
- ✅ Criação de execução
- ✅ **Busca de clientes do Supabase** (não usa Google Sheets)
- ✅ **Filtragem de clientes elegíveis** (intervalo mínimo)
- ✅ **Processamento em lotes** (configurável por campanha)
- ✅ **Verificação de horário** (pausa automática)
- ✅ **Preparação de contexto IA** (usar_veiculos, usar_vendedor)
- ✅ **Busca de instância WhatsApp** (suporte a múltiplas APIs)
- ✅ **AI Agent - Gerar Mensagem** (geração de mensagens personalizadas)
- ✅ **OpenAI Chat Model** (modelo de IA configurável)
- ✅ **Processar Mensagem IA** (extração e fallback)
- ✅ **Enviar Mensagem WhatsApp** (suporte a Uazapi, extensível para outras APIs)
- ✅ **Processar Resultado Envio** (detecção de sucesso/erro)
- ✅ **Registrar Histórico Campanha** (salvamento no Supabase)
- ✅ **Atualizar Controle Diário** (incremento de contadores)
- ✅ **Verificar Limite Diário** (pausa quando atingir limite)
- ✅ **Calcular Intervalo** (intervalo fixo ou aleatorizado)
- ✅ **Wait - Intervalo** (espaçamento entre envios)

## Arquitetura Implementada

### Fonte de Dados

**IMPORTANTE:** O workflow de campanhas **NÃO usa Google Sheets**. Ele busca clientes diretamente do Supabase:

- Tabela: `instacar_clientes_envios`
- Filtros: `ativo = true` AND `status_whatsapp = 'valid'`
- Verifica intervalo mínimo entre campanhas

### Processamento em Lotes

- Divide clientes em lotes menores (configurável: `tamanho_lote`)
- Processa apenas o lote atual por execução
- Pausa automaticamente ao sair do horário configurado
- Agenda próxima execução automaticamente

### Agente IA

- Flags `usar_veiculos` e `usar_vendedor` controlam quais dados incluir
- Contexto dinâmico baseado nas flags
- Suporta campanhas genéricas (sem veículos) e promocionais (com veículos)

## Documentação Atualizada

Para informações atualizadas sobre o workflow, consulte:

- **[Guia de Criação de Campanhas](guia-criacao-campanhas.md)** - Como criar e configurar campanhas
- **[Guia de Agente IA](guia-agente-ia-opcoes.md)** - Configurar dados opcionais
- **[README do Sistema de Campanhas](README.md)** - Visão geral completa

## Próximos Passos

O workflow está pronto para uso. Próximos passos:

1. ✅ Testar com campanha pequena (10-20 clientes)
2. ✅ Validar processamento em lotes
3. ✅ Validar pausa por horário
4. ✅ Validar continuação automática
5. ✅ Monitorar métricas no Supabase

---

**Última atualização:** 2025-12-18  
**Status:** ✅ Implementação completa
