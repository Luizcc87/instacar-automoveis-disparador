# Sistema de Campanhas WhatsApp - Instacar Automóveis

Sistema completo para gerenciar múltiplas campanhas de marketing via WhatsApp ao longo do ano, com agendamento automático, templates por época e interface de gerenciamento.

## 📋 Visão Geral

O sistema de campanhas estende o sistema base de disparo único, permitindo:

- ✅ **Múltiplas campanhas** ao longo do ano
- ✅ **Reenvio controlado** para os mesmos clientes (com intervalo mínimo)
- ✅ **Agendamento automático** via cron expressions
- ✅ **Templates por época** (janeiro, fevereiro, black-friday, etc.)
- ✅ **Interface web** para gerenciar campanhas
- ✅ **Métricas por campanha** para análise de performance
- ✅ **Agente IA com dados opcionais**: Flags para controlar inclusão de veículos e vendedor
- ✅ **Processamento em lotes**: Processa em lotes menores (configurável, padrão: 50)
- ✅ **Horário configurável**: Define faixa de horário por campanha
- ✅ **Distribuição automática**: Divide campanhas grandes ao longo de múltiplos dias
- ✅ **Fonte de dados Supabase**: Busca clientes diretamente do banco (não usa Google Sheets)

## 🏗️ Arquitetura

### Componentes

1. **Banco de Dados (Supabase)**

   - `instacar_campanhas` - Configuração de campanhas
   - `instacar_campanhas_execucoes` - Histórico de execuções
   - Modificações em tabelas existentes para suportar campanhas

2. **Workflow N8N**

   - Workflow modificado que aceita `campanha_id`
   - Busca clientes elegíveis do Supabase (não usa Google Sheets)
   - Processa em lotes menores (configurável por campanha)
   - Respeita horário configurado (pausa automática)
   - Aplica templates baseados em período
   - Verifica duplicatas por campanha
   - Respeita intervalo mínimo entre envios
   - Gera mensagens com IA usando dados opcionais (veículos, vendedor)

3. **Templates**

   - Arquivo JSON com templates pré-definidos por época
   - Cada template contém prompt base para IA

4. **Interface Web**
   - HTML + JavaScript com Supabase Client
   - CRUD completo de campanhas
   - Disparo manual de campanhas

## 🚀 Instalação

### Passo 1: Configurar Banco de Dados

Execute os scripts SQL na ordem:

```bash
# 1. Schema base (se ainda não executou)
docs/supabase/schema.sql

# 2. Schema de campanhas (inclui colunas usar_veiculos e usar_vendedor)
docs/supabase/schema-campanhas.sql

# 3. Migração: Atualizar campanhas existentes (opcional - apenas se já tiver campanhas criadas)
docs/supabase/migracao-campanhas-opcoes-ia.sql

# 4. Expansão: Sistema de lotes e horários
docs/supabase/schema-campanhas-expansao-lotes-horario.sql
docs/supabase/migracao-campanhas-lotes-horario.sql

# 5. Índices atualizados
docs/supabase/indexes.sql

# 6. Políticas RLS atualizadas
docs/supabase/policies.sql

# 7. Validação: Verificar se tudo foi criado corretamente (opcional)
docs/supabase/validacao-campanhas-opcoes-ia.sql
```

### Passo 2: Configurar Workflow N8N

1. Importe o workflow de campanhas: `fluxos-n8n/Disparador_Web_Campanhas_Instacar.json`
2. O workflow já inclui:
   - Busca de clientes do Supabase (não usa Google Sheets)
   - Processamento em lotes com horário configurável
   - Agente IA com dados opcionais
   - Pausa automática e continuação

**Nota**: O workflow de campanhas busca clientes diretamente do Supabase, não processa planilhas Google Sheets.

### Passo 3: Configurar Interface Web

1. Abra `interface-web/index.html` em um navegador
2. Configure URL e Anon Key do Supabase
3. Comece a criar campanhas!

## 📚 Documentação

### Guias Principais

- **[Guia Completo: Do Cadastro ao Envio](GUIA-COMPLETO-CAMPANHAS.md)** ⭐ **LEIA PRIMEIRO** - Explica todo o fluxo, desde cadastro até envio, incluindo agendamento cron e agente IA
- **[🧪 Guia de Teste de Disparo Completo](GUIA-TESTE-DISPARO-COMPLETO.md)** ⭐ **PARA TESTAR** - Fluxo passo a passo para testar um disparo completo de campanha
- **[Guia de Criação de Campanhas](guia-criacao-campanhas.md)** - Como criar e gerenciar campanhas (referência rápida)
- **[Guia de Agente IA com Dados Opcionais](guia-agente-ia-opcoes.md)** - Configurar flags usar_veiculos e usar_vendedor
- **[Guia de Agendamento Cron](guia-agendamento-cron.md)** - Detalhes sobre expressões cron (referência técnica)

### Arquivos de Referência

- **[Templates por Época](templates-epoca.json)** - Templates pré-definidos
- **[Schema SQL](../supabase/schema-campanhas.sql)** - Estrutura do banco de dados

## 🎯 Uso Básico

### Criar uma Campanha

1. Acesse a interface web
2. Clique em "Criar Nova Campanha"
3. Preencha os campos:
   - Nome, descrição, período
   - Prompt personalizado para IA
   - Agendamento (opcional)
4. Salve

### Disparar Manualmente

1. Na lista de campanhas, clique em "Disparar"
2. Confirme o disparo
3. Acompanhe no N8N

### Agendar Automaticamente

1. Configure `agendamento_cron` na campanha
2. Crie workflow no N8N com Schedule Trigger
3. Configure `CAMPANHA_ID` no workflow
4. O sistema executará automaticamente

## 📊 Estrutura de Dados

### Tabela: instacar_campanhas

```sql
- id (UUID)
- nome (TEXT)
- descricao (TEXT)
- periodo_ano (TEXT) -- 'janeiro', 'black-friday', etc.
- prompt_ia (TEXT) -- Prompt personalizado
- status (TEXT) -- 'ativa', 'pausada', 'concluida', 'cancelada'
- limite_envios_dia (INTEGER)
- intervalo_minimo_dias (INTEGER)
- agendamento_cron (TEXT)
- usar_veiculos (BOOLEAN) -- Incluir dados de veículos no contexto da IA
- usar_vendedor (BOOLEAN) -- Incluir nome do vendedor no contexto da IA
- tamanho_lote (INTEGER) -- Número de clientes por execução (padrão: 50)
- horario_inicio (TIME) -- Horário de início (padrão: 09:00:00)
- horario_fim (TIME) -- Horário de fim (padrão: 18:00:00)
- processar_finais_semana (BOOLEAN) -- Processar sábados e domingos
- ativo (BOOLEAN)
```

### Tabela: instacar_campanhas_execucoes

```sql
- id (UUID)
- campanha_id (UUID, FK)
- data_execucao (DATE)
- total_enviado (INTEGER)
- total_erros (INTEGER)
- status_execucao (TEXT)
- trigger_tipo (TEXT) -- 'manual', 'cron', 'webhook'
```

## 🔄 Fluxo de Execução

```text
1. Trigger (manual/cron/webhook) com campanha_id
2. Obter campanha do Supabase
3. Verificar se já executou hoje
4. Criar registro de execução
5. Buscar clientes elegíveis do Supabase (ativo=true, status_whatsapp='valid')
6. Filtrar clientes elegíveis (verificar intervalo mínimo)
7. Calcular lote atual e verificar horário
8. Se dentro do horário: processar lote atual
9. Para cada cliente no lote:
   - Verificar se já recebeu esta campanha
   - Preparar dados IA (com/sem veículos, com/sem vendedor)
   - Gerar mensagem com IA usando prompt da campanha
   - Enviar via WhatsApp
   - Registrar histórico com campanha_id
10. Atualizar execução (lote_atual, contatos_processados)
11. Se há mais clientes: pausar e agendar próxima execução
12. Se concluído: finalizar execução
```

## 🎨 Templates Disponíveis

O sistema inclui templates pré-definidos para:

- **Meses**: Janeiro a Dezembro
- **Eventos**: Black Friday, Dia das Mães, Dia dos Pais, Natal, Ano Novo

Cada template contém:

- Prompt base para IA
- Exemplo de mensagem
- Contexto do período

## 🔐 Segurança

- RLS (Row Level Security) habilitado em todas as tabelas
- Service role para N8N (acesso total)
- Authenticated users para interface web (leitura/escrita em campanhas)
- Anon users bloqueados

## 📈 Monitoramento

### Métricas por Campanha

```sql
-- Performance de uma campanha
SELECT
  e.data_execucao,
  e.total_enviado,
  e.total_erros,
  e.status_execucao
FROM instacar_campanhas_execucoes e
WHERE e.campanha_id = 'uuid'
ORDER BY e.data_execucao DESC;
```

### Taxa de Sucesso

```sql
-- Taxa de sucesso por campanha
SELECT
  c.nome,
  COUNT(*) FILTER (WHERE h.status_envio = 'enviado') * 100.0 / COUNT(*) as taxa_sucesso
FROM instacar_historico_envios h
JOIN instacar_campanhas c ON c.id = h.campanha_id
WHERE h.campanha_id = 'uuid'
GROUP BY c.nome;
```

## 🐛 Troubleshooting

### Campanha não executa

- Verifique se está `ativa` e `ativo = true`
- Verifique se está dentro do período
- Verifique `agendamento_cron`
- Verifique logs do N8N

### Duplicatas sendo enviadas

- Verifique função `cliente_recebeu_campanha()`
- Verifique constraint UNIQUE em execuções
- Verifique lógica de intervalo mínimo

### Performance

- Ajuste `limite_envios_dia` se necessário
- Verifique intervalos entre mensagens
- Analise índices do banco de dados

## 📝 Exemplos

Veja [guia-criacao-campanhas.md](guia-criacao-campanhas.md) para exemplos completos de:

- Campanha mensal
- Black Friday
- Dia das Mães
- E mais...

## 🔄 Migração do Sistema Antigo

O sistema de campanhas é **compatível** com o sistema antigo:

- Campanhas antigas (sem `campanha_id`) continuam funcionando
- Novas campanhas usam o novo sistema
- Migração gradual possível

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação em `docs/campanhas/`
2. Verifique logs no Supabase
3. Analise execuções em `instacar_campanhas_execucoes`

## 🚀 Próximos Passos

Após implementar:

1. Criar campanhas para os próximos meses
2. Configurar agendamentos automáticos
3. Testar com pequenos lotes
4. Monitorar performance
5. Ajustar prompts baseado em resultados

---

**Versão**: 1.0  
**Data**: Dezembro 2025  
**Status**: Produção
