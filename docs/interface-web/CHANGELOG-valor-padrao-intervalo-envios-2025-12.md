# Changelog - Valor Padrão Intervalo de Envios (Dezembro 2025)

## 📋 Resumo

Definição de valor padrão (130 segundos) para o campo de intervalo entre envios em campanhas, mantendo a compatibilidade com o sistema de aleatorização automática do workflow N8N.

---

## ✅ Melhorias Implementadas

### 1. **Valor Padrão Visível no Campo**

- Campo `intervalo_envios_segundos` agora exibe `130` como valor padrão
- Facilita a compreensão do valor base usado para aleatorização
- Usuário pode ver claramente qual é o intervalo padrão configurado

### 2. **Lógica Inteligente de Salvamento**

- **Valor 130 (padrão):** Salvo como `null` no banco de dados para manter aleatorização automática (130-150s)
- **Outros valores:** Salvos como valor fixo para controle preciso do intervalo
- Mantém compatibilidade total com workflow N8N existente

### 3. **Carregamento Inteligente**

- Ao carregar campanha com `intervalo_envios_segundos = null`, campo exibe `130`
- Campanhas com valores fixos são exibidos corretamente
- Nova campanha sempre inicia com valor padrão `130`

### 4. **Estimativas Ajustadas**

- Quando valor é `130` (padrão), estimativas usam média de `140s` (meio do intervalo aleatorizado 130-150)
- Valores fixos usam o valor informado diretamente
- Cálculos de tempo estimado mais precisos

---

## 🔧 Detalhes Técnicos

### Comportamento do Campo

```javascript
// Ao salvar
const intervaloEnvios = intervaloEnviosInput ? parseInt(intervaloEnviosInput) : null;
const intervaloEnviosFinal = intervaloEnvios === 130 ? null : intervaloEnvios;
// Se for 130, salva como null para manter aleatorização

// Ao carregar
document.getElementById("intervalo_envios_segundos").value = 
  data.intervalo_envios_segundos || 130;
// Se null, exibe 130 (padrão)
```

### Integração com Workflow N8N

O workflow N8N já possui lógica para tratar valores `null`:

```javascript
// Calcular intervalo entre envios
const intervaloFixo = campanha.intervalo_envios_segundos;
let intervalo = 130; // Padrão

if (intervaloFixo) {
  intervalo = intervaloFixo; // Valor fixo
} else {
  // Aleatorizado: 130-150s
  intervalo = 130 + Math.floor(Math.random() * 21);
}
```

### Estimativas de Tempo

```javascript
// Se intervalo não configurado ou for 130 (padrão), usar média de 140s
const intervaloValor = intervaloInputValue ? parseInt(intervaloInputValue) : 130;
const intervaloMedio = intervaloValor === 130 ? 140 : intervaloValor;
```

---

## 📝 Texto de Ajuda Atualizado

O campo agora possui texto de ajuda mais claro:

> "Valor base para aleatorização (130-150s). Deixe 130 para usar padrão aleatorizado ou configure valor fixo para controle preciso."

---

## 🎯 Benefícios

1. **Transparência:** Usuário vê claramente qual é o valor padrão
2. **Compatibilidade:** Mantém comportamento existente do workflow
3. **Flexibilidade:** Permite usar valor fixo quando necessário
4. **Precisão:** Estimativas mais corretas considerando aleatorização

---

## 📅 Data

Dezembro 2025

