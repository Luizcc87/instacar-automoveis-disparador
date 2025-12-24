# Changelog - Cálculo Correto de Estimativas com Intervalo Médio (Dezembro 2025)

## 📋 Resumo

Correção do cálculo de estimativas de tempo para usar a média correta dos ranges de intervalo pré-definidos, garantindo que as estimativas reflitam o tempo real necessário baseado no intervalo entre mensagens e número de clientes selecionados.

---

## ✅ Melhorias Implementadas

### 1. **Cálculo Correto do Intervalo Médio**

Agora as estimativas calculam o intervalo médio baseado na opção pré-definida selecionada:

- **Muito curto (1-5s):** Média = 3s
- **Curto (5-20s):** Média = 12.5s
- **Médio (20-50s):** Média = 35s
- **Longo (50-120s):** Média = 85s
- **Muito longo (120-300s):** Média = 210s
- **Padrão (130-150s):** Média = 140s
- **Personalizado:** Usa valor informado (variação ±10s se cancela na média)

### 2. **Nova Função `calcularIntervaloMedio()`**

Função dedicada para calcular o intervalo médio correto:

```javascript
function calcularIntervaloMedio(tipoIntervalo, intervaloInputValue) {
  const rangesIntervalo = {
    muito_curto: { min: 1, max: 5 },
    curto: { min: 5, max: 20 },
    medio: { min: 20, max: 50 },
    longo: { min: 50, max: 120 },
    muito_longo: { min: 120, max: 300 },
    padrao: { min: 130, max: 150 }
  };

  // Se for opção pré-definida, calcular média do range
  if (tipoIntervalo && tipoIntervalo !== 'personalizado' && rangesIntervalo[tipoIntervalo]) {
    const range = rangesIntervalo[tipoIntervalo];
    return (range.min + range.max) / 2;
  }

  // Lógica para valores personalizados e padrão...
}
```

### 3. **Integração com Estimativas**

A função `atualizarEstimativas()` agora:

1. Detecta qual opção pré-definida está selecionada
2. Calcula o intervalo médio correto usando `calcularIntervaloMedio()`
3. Usa esse valor para calcular:
   - Tempo necessário por dia
   - Total de dias necessários
   - Compatibilidade com horário configurado
   - Lotes antes/depois do almoço

---

## 🔧 Detalhes Técnicos

### Cálculo de Tempo Necessário

```javascript
// Antes (incorreto)
const intervaloMedio = intervaloValor === 130 ? 140 : intervaloValor;

// Depois (correto)
const intervaloMedio = calcularIntervaloMedio(tipoIntervalo, intervaloInputValue);
const tempoNecessarioPorDiaHoras = (limiteEnviosDia * intervaloMedio) / 3600;
```

### Exemplo: Opção "Longo: 50-120s"

**Antes:**
- Usava valor fixo do campo (85s) ou 85s ± 10s
- Estimativas não refletiam o range completo

**Depois:**
- Calcula média: (50 + 120) / 2 = 85s
- Estimativas usam 85s como base
- Cálculo considera número de clientes selecionados
- Tempo total = (número de clientes × intervalo médio) / limite diário

### Atualização Automática

As estimativas são atualizadas automaticamente quando:

- Uma opção pré-definida é selecionada
- O campo numérico é alterado
- O limite diário é alterado
- O tamanho do lote é alterado
- Horários são alterados
- Configuração de almoço é alterada
- Número de clientes selecionados muda

---

## 📊 Impacto nas Estimativas

### Exemplo Prático

**Cenário:** 1.388 clientes, opção "Longo: 50-120s", limite 200/dia

**Cálculo:**
- Intervalo médio: 85s
- Tempo por envio: 85s
- Tempo necessário por dia: (200 × 85) / 3600 = 4.72 horas
- Total de lotes: Math.ceil(1388 / 50) = 28 lotes
- Lotes por dia: Math.floor(200 / 50) = 4 lotes/dia
- Dias necessários: Math.ceil(28 / 4) = 7 dias úteis

**Estimativa exibida:**
> "Com 1.388 clientes: 28 lotes de 50 = 7 dias úteis (4 lotes/dia)"

---

## 🎯 Benefícios

1. **Precisão:** Estimativas refletem o tempo real necessário
2. **Consistência:** Usa os mesmos ranges do workflow N8N
3. **Transparência:** Usuário vê estimativas corretas baseadas na opção selecionada
4. **Planejamento:** Facilita planejamento de campanhas com base em tempo real

---

## 📅 Data

Dezembro 2025

