# Changelog - Correção de Formato de Hora (Dezembro 2025)

## 📋 Resumo

Correção do erro `invalid input syntax for type time` ao salvar horários de campanha no banco de dados.

---

## 🐛 Problema Corrigido

**Erro:** `invalid input syntax for type time: "18:30:00:00"`

**Causa:**
- Input `type="time"` retorna formato variável (HH:MM ou HH:MM:SS) dependendo do navegador
- Código adicionava `:00` sem verificar se segundos já existiam
- Isso gerava formatos inválidos como "18:30:00:00" (4 partes)

---

## ✅ Solução Implementada

### Função `normalizarHora()`

Nova função auxiliar que normaliza formatos de hora para `HH:MM:SS`:

- **HH:MM** → adiciona `:00` → `HH:MM:SS`
- **HH:MM:SS** → retorna como está
- **HH:MM:SS:XX** (mais de 3 partes) → pega apenas as 3 primeiras partes
- **Formato inválido** → retorna `null`

### Campos Corrigidos

Aplicada normalização em todos os campos de horário:

- `horario_inicio` e `horario_fim` (campanha)
- `horario_almoco_inicio` e `horario_almoco_fim` (intervalo de almoço)
- Horários na configuração por dia da semana

---

## 🔧 Detalhes Técnicos

### Código

```javascript
function normalizarHora(hora) {
  if (!hora) return null;
  
  const horaLimpa = hora.trim();
  if (!horaLimpa) return null;
  
  const partes = horaLimpa.split(':');
  
  // HH:MM:SS - retornar como está
  if (partes.length === 3) {
    return horaLimpa;
  }
  
  // HH:MM - adicionar :00
  if (partes.length === 2) {
    return horaLimpa + ':00';
  }
  
  // Mais de 3 partes - pegar apenas as 3 primeiras
  if (partes.length > 3) {
    return partes.slice(0, 3).join(':');
  }
  
  return null;
}
```

### Uso

```javascript
// Antes (causava erro)
horario_inicio: (document.getElementById("horario_inicio").value || "09:00") + ":00"

// Depois (corrigido)
horario_inicio: normalizarHora(document.getElementById("horario_inicio").value || "09:00")
```

---

## 📝 Arquivos Modificados

- `interface-web/app.js`
  - Nova função: `normalizarHora()`
  - Atualizado: salvamento de todos os campos de horário

---

## ✅ Resultado

- Horários sempre salvos no formato `HH:MM:SS` válido para PostgreSQL
- Compatível com diferentes formatos retornados por `input type="time"`
- Prevenção de erros de formato inválido

