# Troubleshooting - Erro tipo_intervalo

## Problema

Ao salvar uma campanha, aparece o erro:
```
Could not find the 'tipo_intervalo' column of 'instacar_campanhas' in the schema cache
```

## Causa

A coluna `tipo_intervalo` não existe na tabela `instacar_campanhas` porque a migração SQL não foi executada ainda.

## Solução

### Opção 1: Executar a Migração (Recomendado)

Execute o script de migração no Editor SQL do Supabase:

```sql
-- Arquivo: docs/supabase/migracao-tipo-intervalo-range.sql
```

Este script adiciona a coluna `tipo_intervalo` que permite usar ranges completos para opções pré-definidas de intervalo.

### Opção 2: Continuar sem a Coluna (Compatibilidade)

O código foi ajustado para funcionar mesmo sem a coluna. Se a migração não for executada:

- ✅ Campanhas podem ser salvas normalmente
- ⚠️ Ranges completos de intervalo não funcionarão (usará comportamento antigo)
- ⚠️ Opções pré-definidas usarão valores fixos ao invés de ranges

## Verificar se a Coluna Existe

Execute no Editor SQL do Supabase:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'instacar_campanhas' 
  AND column_name = 'tipo_intervalo';
```

Se retornar vazio, a coluna não existe e a migração precisa ser executada.

## Benefícios da Migração

Após executar a migração:

- ✅ Opções pré-definidas usam ranges completos (ex: "Longo" = 50-120s aleatório)
- ✅ Melhor evasão de detecção de automação
- ✅ Mais variabilidade nos intervalos

## Nota

O código detecta automaticamente se a coluna existe e ajusta o comportamento. Se a migração não for executada, o sistema continua funcionando, mas sem os recursos de ranges completos.

