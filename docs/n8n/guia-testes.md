# 🧪 Guia de Testes - Instacar Automóveis Disparador

Guia completo para testar o sistema de disparo escalonado.

## 📋 Pré-requisitos para Testes

Antes de começar os testes, certifique-se de:

- ✅ Supabase configurado e tabelas criadas
- ✅ Variáveis de ambiente configuradas no N8N
- ✅ Credenciais configuradas (Google Sheets, Uazapi, OpenAI)
- ✅ Workflow importado no N8N
- ✅ Planilhas de teste preparadas (com poucas linhas)

## 🧪 Fase 1: Testes Iniciais (5-10 envios)

### Objetivo
Validar que o fluxo completo funciona end-to-end.

### Preparação

1. **Criar planilha de teste:**
   - Criar planilha Google Sheets com 5-10 linhas
   - Incluir colunas: Cliente, Celular, E-mail, Dt Venda, Veículo, Placa, Vendedor
   - Usar números de teste (não reais para não enviar mensagens reais)

2. **Configurar variáveis:**
   - `SHEET_ID_1` = ID da planilha de teste
   - `LIMITE_ENVIOS_DIA` = 10 (para teste)
   - `LIMITE_ENVIOS_WARMUP` = 5

3. **Limpar dados de teste no Supabase:**
   ```sql
   -- CUIDADO: Apenas em ambiente de teste!
   DELETE FROM instacar_historico_envios WHERE planilha_origem LIKE '%Teste%';
   DELETE FROM instacar_clientes_envios WHERE telefone LIKE '55%';
   DELETE FROM instacar_controle_envios WHERE data = CURRENT_DATE;
   ```

### Execução

1. **Executar workflow manualmente:**
   - No N8N, clique em "Execute Workflow"
   - Observe a execução passo a passo
   - Verifique logs de cada nó

2. **Verificar cada etapa:**
   - ✅ Leitura da planilha
   - ✅ Normalização de telefones
   - ✅ Verificação no Supabase
   - ✅ Verificação WhatsApp (Uazapi)
   - ✅ Geração de mensagem (OpenAI)
   - ✅ Envio de mensagem (Uazapi)
   - ✅ Registro no Supabase

### Validações

#### 1. Verificar Duplicatas

```sql
-- Verificar se clientes foram criados
SELECT telefone, nome_cliente, total_envios 
FROM instacar_clientes_envios 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar se não há duplicatas (mesmo telefone, múltiplos envios)
SELECT telefone, COUNT(*) as total_envios
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE
GROUP BY telefone
HAVING COUNT(*) > 1;
-- Deve retornar 0 linhas (sem duplicatas)
```

#### 2. Verificar Histórico

```sql
-- Verificar histórico de envios
SELECT 
  telefone,
  status_envio,
  mensagem_enviada,
  timestamp_envio
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE
ORDER BY timestamp_envio DESC;
```

#### 3. Verificar Controle Diário

```sql
-- Verificar controle do dia
SELECT 
  data,
  total_enviado,
  total_erros,
  status_processamento
FROM instacar_controle_envios
WHERE data = CURRENT_DATE;
```

### Resultados Esperados

- ✅ 5-10 envios processados
- ✅ Todos os clientes criados no Supabase
- ✅ Histórico registrado corretamente
- ✅ Controle diário atualizado
- ✅ Nenhuma duplicata enviada
- ✅ Mensagens personalizadas geradas

## 🧪 Fase 2: Teste de Duplicatas

### Objetivo
Validar que clientes duplicados não recebem múltiplas mensagens.

### Preparação

1. **Criar planilha com duplicatas:**
   - Mesmo telefone em 2-3 linhas diferentes
   - Diferentes veículos para mesmo cliente

2. **Limpar dados:**
   ```sql
   DELETE FROM instacar_historico_envios WHERE timestamp_envio >= CURRENT_DATE;
   DELETE FROM instacar_clientes_envios WHERE telefone = '55XXXXXXXXXXX'; -- Telefone de teste
   ```

### Execução

1. Executar workflow
2. Verificar que apenas 1 mensagem foi enviada

### Validação

```sql
-- Verificar que cliente tem total_envios = 1
SELECT telefone, total_envios, jsonb_array_length(veiculos) as total_veiculos
FROM instacar_clientes_envios
WHERE telefone = '55XXXXXXXXXXX'; -- Telefone de teste

-- Verificar histórico (deve ter apenas 1 envio)
SELECT COUNT(*) 
FROM instacar_historico_envios
WHERE telefone = '55XXXXXXXXXXX'
  AND timestamp_envio >= CURRENT_DATE;
-- Deve retornar 1
```

### Resultados Esperados

- ✅ Cliente criado com `total_envios = 1`
- ✅ Array `veiculos` contém todos os veículos
- ✅ Apenas 1 mensagem enviada
- ✅ Linhas duplicadas marcadas como "Duplicado"

## 🧪 Fase 3: Teste de Escalonamento

### Objetivo
Validar que intervalos e limites estão sendo respeitados.

### Preparação

1. **Configurar limites baixos:**
   - `LIMITE_ENVIOS_DIA` = 5
   - `INTERVALO_BASE` = 10 (segundos, para teste rápido)
   - `INTERVALO_VARIACAO` = 5

2. **Criar planilha com 10 linhas**

### Execução

1. Executar workflow
2. Medir tempo entre envios
3. Verificar que para após 5 envios

### Validação

```sql
-- Verificar timestamps (intervalos)
SELECT 
  telefone,
  timestamp_envio,
  LAG(timestamp_envio) OVER (ORDER BY timestamp_envio) as envio_anterior,
  EXTRACT(EPOCH FROM (timestamp_envio - LAG(timestamp_envio) OVER (ORDER BY timestamp_envio))) as intervalo_segundos
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE
  AND status_envio = 'enviado'
ORDER BY timestamp_envio;

-- Verificar limite
SELECT total_enviado 
FROM instacar_controle_envios 
WHERE data = CURRENT_DATE;
-- Deve ser <= 5
```

### Resultados Esperados

- ✅ Intervalos entre 10-15 segundos (base + variação)
- ✅ Workflow para após 5 envios
- ✅ Controle diário mostra `total_enviado = 5`
- ✅ Status muda para "concluido"

## 🧪 Fase 4: Teste de Erros

### Objetivo
Validar tratamento de erros e fallbacks.

### Cenários de Teste

#### 4.1 Telefone Inválido

1. Criar linha com telefone inválido (menos de 10 dígitos)
2. Executar workflow
3. Verificar que linha é pulada

#### 4.2 Sem WhatsApp

1. Criar linha com número sem WhatsApp
2. Executar workflow
3. Verificar que:
   - Status = "Sem WhatsApp"
   - Cliente criado com `status_whatsapp = 'invalid'`
   - Mensagem não é enviada

#### 4.3 Erro na IA

1. Simular erro na OpenAI (token inválido temporariamente)
2. Verificar que fallback é usado
3. Mensagem genérica é enviada

#### 4.4 Erro no Uazapi

1. Simular erro no envio (instância desconectada)
2. Verificar que:
   - Retry é executado (3 tentativas)
   - Erro é registrado no histórico
   - Dead letter queue é atualizado

### Validação

```sql
-- Verificar erros
SELECT 
  telefone,
  status_envio,
  mensagem_erro
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE
  AND status_envio = 'erro';

-- Verificar erros críticos
SELECT 
  tipo_erro,
  mensagem_erro,
  status
FROM instacar_erros_criticos
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

## 🧪 Fase 5: Teste Warm-up Period

### Objetivo
Validar período de warm-up (50 envios/dia primeiros 7 dias).

### Preparação

1. **Configurar warm-up:**
   - `LIMITE_ENVIOS_WARMUP` = 50
   - Verificar lógica de warm-up no código

2. **Simular primeiro dia:**
   - Limpar controle diário
   - Executar workflow

### Validação

```sql
-- Verificar que não excede 50 no warm-up
SELECT total_enviado 
FROM instacar_controle_envios 
WHERE data = CURRENT_DATE;
-- Deve ser <= 50 nos primeiros 7 dias
```

## 📊 Métricas de Sucesso

### Taxa de Sucesso

```sql
SELECT 
  COUNT(*) FILTER (WHERE status_envio = 'enviado') * 100.0 / COUNT(*) as taxa_sucesso
FROM instacar_historico_envios
WHERE timestamp_envio >= CURRENT_DATE;
-- Deve ser > 95%
```

### Performance

- Tempo médio por envio: < 15 segundos
- Taxa de erro: < 5%
- Duplicatas: 0%

## 🐛 Troubleshooting Durante Testes

### Workflow não executa

- Verificar variáveis de ambiente
- Verificar credenciais
- Verificar logs do N8N

### Erros no Supabase

- Verificar URL e Service Key
- Verificar se tabelas existem
- Verificar políticas RLS

### Erros no Uazapi

- Verificar token e base URL
- Verificar se instância está conectada
- Verificar rate limits

### Erros na OpenAI

- Verificar API Key
- Verificar créditos
- Verificar rate limits

## ✅ Checklist Final

Após todos os testes:

- [ ] Fluxo completo funciona
- [ ] Duplicatas são prevenidas
- [ ] Escalonamento funciona
- [ ] Erros são tratados
- [ ] Histórico está correto
- [ ] Controle diário funciona
- [ ] Warm-up period funciona
- [ ] Taxa de sucesso > 95%
- [ ] Nenhuma duplicata enviada

## 🚀 Próximos Passos

Após testes bem-sucedidos:

1. Aumentar para warm-up (50/dia)
2. Monitorar por 7 dias
3. Escalar para produção (200/dia)
4. Monitoramento contínuo

---

**Última atualização**: 2025-01-24  
**Versão**: 2.0

