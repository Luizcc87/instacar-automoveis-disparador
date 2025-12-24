# Changelog - Ranges Completos para Intervalos Pré-definidos (Dezembro 2025)

## 📋 Resumo

Implementação de ranges completos para opções pré-definidas de intervalo, permitindo que cada opção use todo o intervalo especificado (ex: "Longo: 50-120s" agora aleatoriza entre 50s e 120s, não apenas 75-95s).

---

## ✅ Melhorias Implementadas

### 1. **Ranges Completos para Opções Pré-definidas**

Agora cada opção pré-definida usa o range completo especificado:

- **Muito curto:** Aleatoriza entre **1-5s** (não mais 3s ± 10s)
- **Curto:** Aleatoriza entre **5-20s** (não mais 12s ± 10s)
- **Médio:** Aleatoriza entre **20-50s** (não mais 35s ± 10s)
- **Longo:** Aleatoriza entre **50-120s** (não mais 85s ± 10s)
- **Muito longo:** Aleatoriza entre **120-300s** (não mais 210s ± 10s)
- **Padrão:** Mantém **130-150s** aleatorizado (sem mudanças)
- **Personalizado:** Mantém variação de **±10s** do valor informado

### 2. **Novo Campo no Banco de Dados**

Adicionado campo `tipo_intervalo` na tabela `instacar_campanhas`:

- Armazena qual opção pré-definida foi selecionada
- Valores possíveis: `muito_curto`, `curto`, `medio`, `longo`, `muito_longo`, `padrao`, `personalizado`
- Permite ao workflow identificar qual range usar

### 3. **Lógica Atualizada no Workflow N8N**

O workflow agora:

1. **Verifica `tipo_intervalo`** primeiro
2. Se for opção pré-definida, usa o **range completo** correspondente
3. Se for `personalizado` ou valor fixo, aplica **variação de ±10s**
4. Se for `null` ou `padrao`, usa **130-150s** aleatorizado

---

## 🔧 Detalhes Técnicos

### Migração do Banco de Dados

Execute o script de migração:

```sql
-- docs/supabase/migracao-tipo-intervalo-range.sql
ALTER TABLE instacar_campanhas 
  ADD COLUMN tipo_intervalo TEXT;

ALTER TABLE instacar_campanhas
  ADD CONSTRAINT check_tipo_intervalo 
  CHECK (
    tipo_intervalo IS NULL 
    OR tipo_intervalo IN ('muito_curto', 'curto', 'medio', 'longo', 'muito_longo', 'padrao', 'personalizado')
  );
```

### Ranges Definidos no Workflow

```javascript
const rangesIntervalo = {
  muito_curto: { min: 1, max: 5 },
  curto: { min: 5, max: 20 },
  medio: { min: 20, max: 50 },
  longo: { min: 50, max: 120 },
  muito_longo: { min: 120, max: 300 },
  padrao: { min: 130, max: 150 }
};
```

### Lógica de Cálculo

```javascript
if (tipoIntervalo && tipoIntervalo !== 'personalizado' && rangesIntervalo[tipoIntervalo]) {
  // Opção pré-definida: usar range completo
  const range = rangesIntervalo[tipoIntervalo];
  intervalo = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
} else if (intervaloFixo) {
  // Valor fixo personalizado: aplicar variação de ±10s
  const variacao = Math.floor(Math.random() * 21) - 10;
  intervalo = intervaloFixo + variacao;
  intervalo = Math.max(1, intervalo);
} else {
  // Padrão: 130-150s
  intervalo = 130 + Math.floor(Math.random() * 21);
}
```

### Comportamento na Interface

- **Ao selecionar opção pré-definida:**
  - Campo numérico ainda mostra valor médio (para referência)
  - `tipo_intervalo` é salvo no banco
  - `intervalo_envios_segundos` é salvo como `null`

- **Ao digitar valor personalizado:**
  - Opção "Personalizado" é selecionada automaticamente
  - `tipo_intervalo` = `"personalizado"`
  - `intervalo_envios_segundos` = valor digitado

- **Ao carregar campanha:**
  - Se `tipo_intervalo` existe, seleciona opção correspondente
  - Se não existe (campanhas antigas), infere do valor numérico

---

## 📊 Comparação: Antes vs Depois

### Exemplo: Opção "Longo: 50-120s"

**Antes:**
- Valor salvo: `85s` (média)
- Intervalo real: `75s - 95s` (85 ± 10)
- ❌ Não usava o range completo

**Depois:**
- Valor salvo: `null` (não usado)
- `tipo_intervalo`: `"longo"`
- Intervalo real: `50s - 120s` (range completo)
- ✅ Usa todo o intervalo especificado

### Exemplo: Valor Personalizado "200s"

**Antes e Depois (sem mudanças):**
- Valor salvo: `200s`
- `tipo_intervalo`: `"personalizado"`
- Intervalo real: `190s - 210s` (200 ± 10)
- ✅ Mantém comportamento de variação

---

## 🎯 Benefícios

1. **Maior Variabilidade:** Ranges completos oferecem mais variação natural
2. **Melhor Evasão de Detecção:** Intervalos mais variados são menos detectáveis
3. **Flexibilidade:** Opções pré-definidas agora realmente usam os ranges especificados
4. **Compatibilidade:** Campanhas antigas continuam funcionando (fallback por valor)

---

## ⚠️ Migração Necessária

**IMPORTANTE:** Execute a migração SQL antes de usar esta funcionalidade:

```bash
# No Editor SQL do Supabase
docs/supabase/migracao-tipo-intervalo-range.sql
```

Campanhas existentes continuarão funcionando, mas usarão o comportamento antigo até serem editadas e salvas novamente.

---

## 📅 Data

Dezembro 2025

