# Changelog - Opções Pré-definidas de Intervalo (Dezembro 2025)

## 📋 Resumo

Implementação de opções pré-definidas de intervalo entre envios com interface visual intuitiva, mantendo a opção de campo personalizado para valores específicos.

---

## ✅ Melhorias Implementadas

### 1. **Opções Pré-definidas de Intervalo**

Interface com 7 opções pré-definidas para facilitar a configuração:

- **Muito curto:** 1-5s (valor médio: 3s)
- **Curto:** 5-20s (valor médio: 12s)
- **Médio:** 20-50s (valor médio: 35s)
- **Longo:** 50-120s (valor médio: 85s)
- **Muito longo:** 120-300s (valor médio: 210s)
- **Padrão (recomendado):** 130-150s aleatorizado (valor base: 130s)
- **Personalizado:** Permite digitar valor específico

### 2. **Sincronização Bidirecional**

- **Opção → Campo:** Ao selecionar uma opção pré-definida, o campo numérico é atualizado automaticamente com o valor médio da faixa
- **Campo → Opção:** Ao digitar um valor personalizado, a opção correspondente é selecionada automaticamente
- **Carregamento:** Ao editar uma campanha, a opção pré-definida correspondente ao valor salvo é selecionada automaticamente

### 3. **Interface Visual Melhorada**

- Radio buttons com estilo moderno e feedback visual
- Destaque visual para opção selecionada (fundo azul claro)
- Hover effect para melhor UX
- Layout organizado em card com fundo cinza claro

### 4. **Compatibilidade**

- Suporte a navegadores modernos com `:has()` CSS
- Fallback JavaScript para navegadores antigos usando classes CSS
- Funciona perfeitamente em todos os navegadores

---

## 🔧 Detalhes Técnicos

### Mapeamento de Valores

```javascript
const opcoesIntervalo = {
  muito_curto: 3,      // 1-5s, média ~3s
  curto: 12,          // 5-20s, média ~12s
  medio: 35,          // 20-50s, média ~35s
  longo: 85,          // 50-120s, média ~85s
  muito_longo: 210,   // 120-300s, média ~210s
  padrao: 130,        // 130-150s aleatorizado (valor base)
  personalizado: null // Usa valor do campo
};
```

### Funções JavaScript

1. **`configurarIntervalosPredefinidos()`**
   - Configura event listeners para radio buttons e campo numérico
   - Sincroniza seleção bidirecional
   - Chamada ao abrir modal de nova campanha ou editar

2. **`selecionarOpcaoIntervalo(valor)`**
   - Seleciona opção pré-definida correspondente ao valor numérico
   - Usado ao carregar dados de campanha existente

3. **`atualizarClassesIntervaloPreset()`**
   - Atualiza classes CSS para compatibilidade com navegadores antigos
   - Adiciona classe `selected` à opção marcada

### Estrutura HTML

```html
<div style="background: #f8f9fa; border-radius: 6px;">
  <div>Selecionar intervalo pré-definido:</div>
  <div>
    <label class="intervalo-preset-option">
      <input type="radio" name="intervalo_preset" value="medio" />
      <span><strong>Médio:</strong> 20-50s</span>
    </label>
    <!-- ... outras opções ... -->
  </div>
</div>
```

### Estilos CSS

- Classe `.intervalo-preset-option` para estilização das opções
- Estado `:checked` e classe `.selected` para opção selecionada
- Hover effects para feedback visual
- Compatibilidade com `:has()` e fallback JavaScript

---

## 🎯 Benefícios

1. **Usabilidade:** Interface mais intuitiva e fácil de usar
2. **Rapidez:** Seleção rápida de intervalos comuns sem precisar digitar
3. **Flexibilidade:** Mantém opção de valor personalizado para casos específicos
4. **Consistência:** Valores pré-definidos seguem padrões comuns de uso
5. **Visual:** Interface mais moderna e profissional

---

## 📝 Notas de Uso

- **Valor padrão:** Ao criar nova campanha, opção "Padrão" é selecionada automaticamente (130s)
- **Variação aleatória:** Todos os valores (pré-definidos ou personalizados) têm variação de ±10s aplicada no workflow N8N
- **Estimativas:** Cálculos de tempo estimado usam o valor do campo numérico (atualizado automaticamente ao selecionar opção)

---

## 📅 Data

Dezembro 2025

