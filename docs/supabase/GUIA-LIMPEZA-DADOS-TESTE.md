# Guia: Limpeza de Dados de Teste para Produção

## Visão Geral

Este guia explica como limpar dados de teste do banco de dados antes de iniciar campanhas em produção. A limpeza é importante para:

- ✅ Manter métricas de produção precisas
- ✅ Evitar confusão entre dados de teste e produção
- ✅ Garantir que relatórios reflitam apenas dados reais
- ✅ Liberar espaço no banco de dados

## Quando Limpar Dados de Teste

**Limpe antes de iniciar produção se:**
- Você fez vários testes e há muitos registros de teste no banco
- As métricas estão sendo afetadas por dados de teste
- Você quer começar "do zero" em produção

**NÃO limpe se:**
- Você ainda está em fase de testes
- Precisa manter histórico de testes para referência
- Os dados de teste não estão interferindo nas métricas

## Como Identificar Dados de Teste

O sistema identifica dados de teste através de:

1. **Campo `tipo_envio`** na tabela `instacar_historico_envios`:
   - `'teste'` = Envio de teste
   - `'debug'` = Envio de debug
   - `'normal'` ou `NULL` = Envio de produção

2. **Campo `modo_teste`** na tabela `instacar_campanhas`:
   - `TRUE` = Campanha em modo teste
   - `FALSE` = Campanha de produção

3. **Campo `planilha_origem`** na tabela `instacar_historico_envios`:
   - Contém "teste" ou "debug" no nome

4. **Nome da campanha**:
   - Contém "teste" ou "debug" no nome

## Processo de Limpeza

### Passo 1: Fazer Backup

**IMPORTANTE:** Sempre faça backup antes de deletar dados!

```sql
-- No Supabase, vá em Database > Backups
-- Ou exporte as tabelas manualmente:
-- - instacar_historico_envios
-- - instacar_campanhas_execucoes
-- - instacar_campanhas
-- - instacar_controle_envios
```

### Passo 2: Executar Verificações

Execute o arquivo `docs/supabase/limpar-dados-teste-producao.sql` e rode apenas a **FASE 1** (queries de verificação).

Isso mostrará:
- Quantos registros de teste existem
- Quais campanhas são de teste
- Quais execuções são de teste
- Resumo geral

**Revise cuidadosamente os resultados!**

### Passo 3: Decidir Estratégia de Limpeza

Você tem duas opções:

#### Opção A: Limpeza Completa (Recomendado para começar do zero)

Remove todos os dados de teste:
- Histórico de envios de teste/debug
- Execuções de campanhas de teste
- Controle de envios de teste
- Campanhas de teste (ou desativa)

**Quando usar:** Quando você quer começar produção completamente limpo.

#### Opção B: Limpeza Seletiva (Recomendado para manter referência)

Remove apenas dados específicos:
- Mantém campanhas de teste (mas desativa)
- Remove apenas histórico antigo de teste
- Mantém execuções recentes para referência

**Quando usar:** Quando você quer manter alguns dados de teste para referência futura.

### Passo 4: Executar Limpeza

1. **Abra o arquivo:** `docs/supabase/limpar-dados-teste-producao.sql`

2. **Descomente apenas as seções que você quer executar:**
   - Comece pela seção 2.1 (histórico)
   - Execute uma seção por vez
   - Verifique os resultados após cada seção

3. **Execute as queries de verificação pós-limpeza (FASE 3)**

4. **Execute as queries de preparação (FASE 4)**

### Passo 5: Verificar Estado Final

Execute a query de resumo final no arquivo para confirmar:
- ✅ Não há mais dados de teste (ou apenas os que você quis manter)
- ✅ Dados de produção estão intactos
- ✅ Campanhas ativas não estão em modo teste

## Estratégias Recomendadas

### Estratégia 1: Limpeza Completa (Recomendado)

**Para:** Começar produção do zero

```sql
-- 1. Deletar histórico de teste/debug
DELETE FROM instacar_historico_envios
WHERE tipo_envio IN ('teste', 'debug');

-- 2. Deletar execuções de campanhas de teste
DELETE FROM instacar_campanhas_execucoes e
USING instacar_campanhas c
WHERE e.campanha_id = c.id
  AND (c.modo_teste = TRUE OR c.modo_debug = TRUE);

-- 3. Desativar campanhas de teste
UPDATE instacar_campanhas
SET ativo = FALSE, status = 'cancelada'
WHERE modo_teste = TRUE OR modo_debug = TRUE;

-- 4. Limpar controle de envios de teste
DELETE FROM instacar_controle_envios c
USING instacar_campanhas camp
WHERE c.campanha_id = camp.id
  AND (camp.modo_teste = TRUE OR camp.modo_debug = TRUE);
```

### Estratégia 2: Limpeza Conservadora

**Para:** Manter referência mas limpar dados antigos

```sql
-- 1. Deletar apenas histórico antigo de teste (mais de 7 dias)
DELETE FROM instacar_historico_envios
WHERE tipo_envio IN ('teste', 'debug')
  AND timestamp_envio < CURRENT_DATE - INTERVAL '7 days';

-- 2. Desativar campanhas de teste (não deletar)
UPDATE instacar_campanhas
SET ativo = FALSE, status = 'cancelada'
WHERE modo_teste = TRUE OR modo_debug = TRUE;

-- 3. Manter execuções e controle (para referência)
```

### Estratégia 3: Apenas Preparação (Mais Seguro)

**Para:** Não deletar nada, apenas garantir que produção está limpa

```sql
-- 1. Garantir que campanhas ativas não estão em modo teste
UPDATE instacar_campanhas
SET modo_teste = FALSE, modo_debug = FALSE
WHERE ativo = TRUE;

-- 2. Limpar telefones de teste de campanhas de produção
UPDATE instacar_campanhas
SET telefones_teste = '[]'::jsonb
WHERE ativo = TRUE AND modo_teste = FALSE;
```

## Tabelas Afetadas

A limpeza pode afetar as seguintes tabelas:

1. **instacar_historico_envios** - Histórico de envios
2. **instacar_campanhas_execucoes** - Execuções de campanhas
3. **instacar_controle_envios** - Controle diário de envios
4. **instacar_campanhas** - Configuração de campanhas
5. **instacar_clientes_envios** - Clientes (apenas se só receberam teste)

**Tabelas NÃO afetadas:**
- `instacar_whatsapp_apis` - Instâncias WhatsApp
- `instacar_configuracoes_empresa` - Configurações globais
- `instacar_sessoes_contexto_ia` - Sessões de contexto
- `instacar_templates_prompt` - Templates de prompt

## Verificações Pós-Limpeza

Após a limpeza, verifique:

```sql
-- 1. Não há mais histórico de teste
SELECT COUNT(*) 
FROM instacar_historico_envios 
WHERE tipo_envio IN ('teste', 'debug');
-- Deve retornar 0 (ou o número que você quis manter)

-- 2. Campanhas ativas não estão em modo teste
SELECT id, nome, modo_teste, modo_debug
FROM instacar_campanhas
WHERE ativo = TRUE 
  AND (modo_teste = TRUE OR modo_debug = TRUE);
-- Deve retornar 0 linhas

-- 3. Dados de produção estão intactos
SELECT COUNT(*) 
FROM instacar_historico_envios 
WHERE tipo_envio = 'normal' OR tipo_envio IS NULL;
-- Deve retornar o número esperado de envios de produção
```

## Checklist Antes de Produção

Antes de iniciar a primeira campanha em produção, verifique:

- [ ] Backup do banco de dados feito
- [ ] Dados de teste limpos (ou isolados)
- [ ] Campanhas ativas não estão em modo teste
- [ ] Telefones de teste removidos das campanhas de produção
- [ ] Modo teste desativado globalmente (se configurado)
- [ ] Verificação pós-limpeza executada
- [ ] Dados de produção confirmados intactos

## Troubleshooting

### Problema: Delete falhou por foreign key

**Causa:** Há relacionamentos que impedem a deleção.

**Solução:** Delete na ordem correta:
1. Histórico (referencia execuções)
2. Execuções (referencia campanhas)
3. Controle (referencia campanhas)
4. Campanhas (por último)

### Problema: Delete removeu dados de produção

**Causa:** Query de delete muito ampla ou dados mal identificados.

**Solução:**
1. Restaure do backup
2. Revise as queries de verificação
3. Execute de forma mais seletiva

### Problema: Ainda aparecem dados de teste

**Causa:** Dados não foram identificados corretamente.

**Solução:**
1. Execute queries de verificação novamente
2. Verifique se há dados sem `tipo_envio` marcado
3. Verifique se há campanhas sem `modo_teste` mas com nome de teste

## Próximos Passos

Após a limpeza:

1. **Criar primeira campanha de produção:**
   - Nome claro (sem "teste" ou "debug")
   - `modo_teste = FALSE`
   - `modo_debug = FALSE`
   - `telefones_teste = []`

2. **Configurar limites de produção:**
   - `limite_envios_dia = 200` (ou conforme sua estratégia)
   - Horários comerciais configurados
   - Intervalo entre envios configurado

3. **Monitorar primeira execução:**
   - Verificar que `tipo_envio = 'normal'`
   - Confirmar que mensagens estão sendo enviadas
   - Verificar métricas no dashboard

## Referências

- Script de limpeza: `docs/supabase/limpar-dados-teste-producao.sql`
- Schema do banco: `docs/supabase/schema.sql`
- Guia de testes: `docs/campanhas/GUIA-TESTE-DISPARO-COMPLETO.md`

