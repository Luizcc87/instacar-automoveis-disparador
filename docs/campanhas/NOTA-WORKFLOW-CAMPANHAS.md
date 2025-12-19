# Nota: Workflow de Campanhas - Status Atualizado

**⚠️ ATENÇÃO: Este arquivo está desatualizado. O workflow foi completamente implementado.**

O workflow `Disparador_Campanhas_Instacar.json` foi **completamente implementado** com todas as funcionalidades.

## Status Atual (2025-12-18)

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
- ✅ **Agente IA com dados opcionais** (usar_veiculos, usar_vendedor)
- ✅ **Geração e envio de mensagens**
- ✅ **Registro completo no histórico**
- ✅ **Controle de limites e pausas**

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
