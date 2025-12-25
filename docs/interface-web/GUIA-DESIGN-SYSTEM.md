# Guia do Design System - Interface Web

Este documento descreve os padrões de design e estilo aplicados na interface web para manter consistência visual em todas as páginas, seguindo o design do projeto `instacar-insights`.

## 📋 Índice

1. [Classes CSS Principais](#classes-css-principais)
2. [Estrutura de Layout](#estrutura-de-layout)
3. [Componentes Reutilizáveis](#componentes-reutilizáveis)
4. [Variáveis CSS](#variáveis-css)
5. [Padrões de Página](#padrões-de-página)
6. [Checklist de Implementação](#checklist-de-implementação)

---

## Classes CSS Principais

### Cards e Containers

#### `.card-elevated`
**Uso:** Aplicar em todas as seções/cards principais para efeito de elevação.

```html
<div class="card-elevated" style="padding: 1.5rem;">
  <!-- Conteúdo -->
</div>
```

**Características:**
- Background branco (`hsl(var(--card))`)
- Cantos arredondados (`var(--radius-xl)`)
- Borda sutil (`1px solid hsl(var(--border) / 0.5)`)
- Sombra média (`var(--shadow-md)`)
- Hover: sombra aumenta (`var(--shadow-lg)`)

#### `.card-interactive`
**Uso:** Para cards clicáveis (botões de ação rápida, cards interativos).

```html
<button class="card-elevated card-interactive">
  <!-- Conteúdo -->
</button>
```

**Características:**
- Herda `.card-elevated`
- Adiciona `hover-lift` e `cursor-pointer`
- Efeito de elevação no hover

### Grids Responsivos

#### `.stats-grid`
**Uso:** Grid de métricas no topo do dashboard.

```html
<div class="grid stats-grid" style="gap: 1rem;">
  <!-- 4 cards de métricas -->
</div>
```

**Comportamento:**
- Mobile: 1 coluna
- Tablet (≥768px): 2 colunas
- Desktop (≥1024px): 4 colunas

#### `.dashboard-main-grid`
**Uso:** Grid principal do dashboard (Campanhas + Atividade Recente).

```html
<div class="dashboard-main-grid" style="display: grid; gap: 1.5rem;">
  <div class="campanhas-section">...</div>
  <div class="atividade-section">...</div>
</div>
```

**Comportamento:**
- Mobile/Tablet: 1 coluna (empilhado)
- Desktop (≥1024px): 2 colunas (proporção 2:1)

### Animações

#### `.animate-fade-in`
**Uso:** Aplicar em elementos que aparecem dinamicamente.

```html
<div class="animate-fade-in">
  <!-- Conteúdo -->
</div>
```

#### `.hover-lift`
**Uso:** Efeito de elevação no hover (cards de métricas).

```html
<div class="card-elevated hover-lift">
  <!-- Conteúdo -->
</div>
```

---

## Estrutura de Layout

### Estrutura Base de Página

```html
<div id="contentArea">
  <div id="alertContainer"></div>
  
  <div class="p-6" style="display: flex; flex-direction: column; gap: 1.5rem;">
    <!-- Conteúdo da página -->
  </div>
</div>
```

### Padrão de Seção

```html
<div class="card-elevated" style="padding: 1.5rem;">
  <h3 style="font-family: var(--font-family-display); font-weight: 600; font-size: 1.125rem; color: hsl(var(--foreground)); margin: 0 0 1.25rem 0;">
    Título da Seção
  </h3>
  <div>
    <!-- Conteúdo -->
  </div>
</div>
```

---

## Componentes Reutilizáveis

### Botões

**Padrão base:** Todos os botões devem usar a classe `.btn` como base, seguida da variante desejada.

#### Variantes de Botão

**1. Primary (Padrão)**
```html
<button class="btn btn-primary">
  <svg>...</svg>
  Texto do Botão
</button>
```
- **Uso:** Ações principais (criar, salvar, confirmar)
- **Estilo:** Gradiente azul/roxo, texto branco, sombra sutil
- **Hover:** Opacidade 0.9, sombra glow, leve elevação

**2. Secondary**
```html
<button class="btn btn-secondary">
  Texto do Botão
</button>
```
- **Uso:** Ações secundárias (cancelar, fechar, voltar)
- **Estilo:** Background cinza claro, borda, texto escuro
- **Hover:** Background mais escuro

**3. Destructive**
```html
<button class="btn btn-destructive">
  Excluir
</button>
```
- **Uso:** Ações destrutivas (excluir, remover)
- **Estilo:** Background vermelho, texto branco
- **Hover:** Background vermelho mais escuro

**4. Outline**
```html
<button class="btn btn-outline">
  Texto do Botão
</button>
```
- **Uso:** Ações alternativas, menos proeminentes
- **Estilo:** Borda, background transparente
- **Hover:** Background accent

**5. Ghost**
```html
<button class="btn btn-ghost">
  Texto do Botão
</button>
```
- **Uso:** Ações discretas, botões de menu
- **Estilo:** Transparente, apenas texto
- **Hover:** Background accent

#### Tamanhos de Botão

```html
<!-- Pequeno -->
<button class="btn btn-primary btn-sm">Pequeno</button>

<!-- Padrão (default) -->
<button class="btn btn-primary">Padrão</button>

<!-- Grande -->
<button class="btn btn-primary btn-lg">Grande</button>

<!-- Ícone apenas -->
<button class="btn btn-ghost btn-icon">
  <svg>...</svg>
</button>
```

#### Botões com Ícones

**Padrão:** Sempre incluir ícone SVG dentro do botão, usando `currentColor` para herdar a cor do texto.

```html
<button class="btn btn-primary">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Path do ícone -->
  </svg>
  Texto do Botão
</button>
```

**Regras:**
- Ícones devem ter `stroke="currentColor"` para herdar cor
- Tamanho padrão: 18px para botões normais, 16px para botões pequenos
- Gap entre ícone e texto: 0.5rem (já aplicado via `.btn`)

#### Estados de Botão

```html
<!-- Desabilitado -->
<button class="btn btn-primary" disabled>Desabilitado</button>

<!-- Loading (adicione spinner) -->
<button class="btn btn-primary" disabled>
  <div class="spinner"></div>
  Carregando...
</button>
```

#### Botões de Ação Rápida (Quick Actions)

```html
<button class="card-elevated card-interactive" style="padding: 1.25rem; ...">
  <div class="quick-action-icon" style="...">
    <svg>...</svg>
  </div>
  <div>
    <h4>Título</h4>
    <p>Descrição</p>
  </div>
</button>
```

### Cards de Métricas

**Estrutura padrão:**

```html
<div class="card-elevated hover-lift" style="padding: 1rem;" id="idMetrica">
  <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.75rem;">
    <div style="flex: 1; min-width: 0;">
      <p style="font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.025em;">
        Título
      </p>
      <p class="metric-value" style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-family-display); color: hsl(var(--foreground)); line-height: 1.2; margin: 0 0 0.25rem 0;">
        Valor
      </p>
      <p class="metric-description" style="font-size: 0.75rem; font-weight: 400; color: hsl(var(--muted-foreground)); margin: 0;">
        Descrição
      </p>
    </div>
    <div style="padding: 0.625rem; border-radius: 0.5rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.5rem; height: 2.5rem;">
      <!-- Ícone SVG -->
    </div>
  </div>
</div>
```

### Badges de Status

**Cores disponíveis:**
- `success`: Verde (Ativa, Concluída)
- `warning`: Amarelo (Pausada)
- `destructive`: Vermelho (Erro)
- `info`: Azul (Agendada)
- `muted`: Cinza (Inativa)

**Estrutura:**

```html
<span class="status-badge" style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; border: 1px solid; background: hsl(var(--success) / 0.1); color: hsl(var(--success)); border-color: hsl(var(--success) / 0.2);">
  Ativa
</span>
```

### Botões de Ação Rápida

**Estrutura:**

```html
<button onclick="acao()" class="card-elevated card-interactive group" style="padding: 1.25rem; text-align: left; border: none; background: none; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 1rem;">
  <div class="quick-action-icon" style="padding: 0.875rem; border-radius: 0.625rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 3rem; height: 3rem;">
    <!-- Ícone SVG -->
  </div>
  <div style="flex: 1; min-width: 0;">
    <h4 style="font-weight: 600; font-size: 1rem; color: hsl(var(--foreground)); margin: 0 0 0.25rem 0;">Título</h4>
    <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.4;">Descrição</p>
  </div>
</button>
```

---

## Variáveis CSS

### Cores Principais

```css
--card: 0 0% 100%;                    /* Branco para cards */
--foreground: 222 47% 11%;            /* Texto principal (azul escuro) */
--muted-foreground: 220 9% 46%;      /* Texto secundário (cinza) */
--primary: 217 91% 50%;               /* Azul corporativo */
--success: 142 76% 36%;               /* Verde */
--warning: 38 92% 50%;                /* Amarelo */
--destructive: 0 84% 60%;             /* Vermelho */
--info: 199 89% 48%;                  /* Azul claro */
--accent: 262 83% 58%;                /* Roxo/Violeta */
--border: 220 13% 91%;                /* Borda (cinza claro) */
```

### Espaçamentos

```css
--spacing-xs: 0.25rem;    /* 4px */
--spacing-sm: 0.5rem;     /* 8px */
--spacing-md: 1rem;       /* 16px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 3rem;      /* 48px */
```

### Tipografia

```css
--font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, ...;
--font-family-display: "Plus Jakarta Sans", system-ui, sans-serif;
--font-size-xs: 0.75rem;      /* 12px */
--font-size-sm: 0.875rem;     /* 14px */
--font-size-base: 1rem;       /* 16px */
--font-size-lg: 1.125rem;     /* 18px */
--font-size-xl: 1.25rem;      /* 20px */
```

### Bordas e Sombras

```css
--radius: 0.75rem;              /* Border radius base */
--radius-xl: calc(var(--radius) + 4px);  /* ~12px */
--shadow-md: 0 4px 6px -1px ...;  /* Sombra média */
--shadow-lg: 0 10px 15px -3px ...; /* Sombra grande */
```

---

## Padrões de Página

### 1. Dashboard

**Estrutura:**
1. Grid de métricas (4 cards) - `.stats-grid`
2. Grid principal (Campanhas + Atividade) - `.dashboard-main-grid`
3. Botões de ação rápida (3 cards) - `.card-elevated.card-interactive`

### 2. Páginas de Listagem (Campanhas, Clientes, Templates)

**Estrutura padrão:**

```html
<div class="p-6" style="display: flex; flex-direction: column; gap: 1.5rem;">
  <!-- Header com busca e botão -->
  <div class="card-elevated" style="padding: 1.5rem;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <h2 style="font-family: var(--font-family-display); font-weight: 600; font-size: 1.5rem; color: hsl(var(--foreground)); margin: 0;">
        Título
      </h2>
      <button class="btn-primary">Nova Ação</button>
    </div>
    <!-- Filtros/Busca -->
  </div>
  
  <!-- Lista/Grid de itens -->
  <div class="card-elevated" style="padding: 1.5rem;">
    <div id="containerItens">
      <!-- Itens -->
    </div>
  </div>
</div>
```

---

## Checklist de Implementação

Ao criar uma nova página, verifique:

- [ ] **Container principal** usa `class="p-6"` com `display: flex; flex-direction: column; gap: 1.5rem;`
- [ ] **Todas as seções** usam `class="card-elevated"` com `padding: 1.5rem;`
- [ ] **Títulos de seção** usam `font-family: var(--font-family-display); font-weight: 600; font-size: 1.125rem;`
- [ ] **Grids responsivos** usam classes específicas (`.stats-grid`, `.dashboard-main-grid`) ou padrão com media queries
- [ ] **Badges de status** seguem o padrão de cores e estilos definidos
- [ ] **Botões** sempre usam `class="btn"` + variante (`btn-primary`, `btn-secondary`, etc.)
- [ ] **Botões com ícones** incluem SVG com `stroke="currentColor"` e tamanho apropriado (18px padrão, 16px pequeno)
- [ ] **Botões interativos** (quick actions) usam `class="card-elevated card-interactive"`
- [ ] **Ícones** são SVG inline com tamanho consistente (20px para cards, 18px para botões, 16px para badges)
- [ ] **Cores** usam variáveis CSS (`hsl(var(--primary))`, etc.)
- [ ] **Espaçamentos** usam variáveis CSS (`var(--spacing-md)`, etc.)
- [ ] **Animações** aplicadas onde apropriado (`.animate-fade-in`, `.hover-lift`)

---

## Padrões de Botões - Referência Completa

### Estrutura Base

Todos os botões seguem esta estrutura base:

```html
<button class="btn [variante] [tamanho]">
  [ícone SVG opcional]
  Texto do Botão
</button>
```

### Variantes Disponíveis

| Variante | Classe | Uso | Cor Background | Cor Texto |
|----------|--------|-----|---------------|-----------|
| Primary | `.btn-primary` | Ações principais | Gradiente azul/roxo | Branco |
| Secondary | `.btn-secondary` | Ações secundárias | Cinza claro | Escuro |
| Destructive | `.btn-destructive` | Ações destrutivas | Vermelho | Branco |
| Outline | `.btn-outline` | Ações alternativas | Transparente | Escuro |
| Ghost | `.btn-ghost` | Ações discretas | Transparente | Escuro |

### Tamanhos Disponíveis

| Tamanho | Classe | Altura | Padding | Uso |
|---------|--------|--------|---------|-----|
| Small | `.btn-sm` | 2.25rem (36px) | 0.5rem 0.75rem | Ações compactas |
| Default | (sem classe) | 2.5rem (40px) | 0.625rem 1rem | Uso geral |
| Large | `.btn-lg` | 2.75rem (44px) | 0.625rem 2rem | Destaque |
| Icon | `.btn-icon` | 2.5rem (40px) | 0 | Apenas ícone |

### Exemplos Práticos

**Botão Primary com Ícone:**
```html
<button class="btn btn-primary" onclick="acao()">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
  Nova Campanha
</button>
```

**Botão Secondary:**
```html
<button class="btn btn-secondary" onclick="cancelar()">
  Cancelar
</button>
```

**Botão Destructive:**
```html
<button class="btn btn-destructive" onclick="excluir()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
  Excluir
</button>
```

**Botão Ghost (Menu):**
```html
<button class="btn btn-ghost btn-icon" onclick="toggleMenu()">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="12" cy="5" r="1"></circle>
    <circle cx="12" cy="19" r="1"></circle>
  </svg>
</button>
```

### Regras Importantes

1. **Sempre use `.btn` como classe base** antes da variante
2. **Ícones SVG** devem usar `stroke="currentColor"` para herdar cor
3. **Não use estilos inline** para cores, use classes CSS
4. **Gap entre ícone e texto** é automático via `.btn` (0.5rem)
5. **Estados disabled** são tratados automaticamente pela classe `.btn`
6. **Focus visible** tem ring de acessibilidade (2px, cor ring)

### Migração de Botões Antigos

**Antes:**
```html
<button class="btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
  <span>+</span> Nova Campanha
</button>
```

**Depois:**
```html
<button class="btn btn-primary">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
  Nova Campanha
</button>
```

### Compatibilidade com Classes Antigas

Para manter compatibilidade, as seguintes classes antigas ainda funcionam, mas devem ser migradas:

- `btn-success` → Use `btn-primary` ou `btn-secondary` com cor verde via CSS customizado
- `btn-danger` → Use `btn-destructive`

**Exemplo de migração:**
```html
<!-- Antes -->
<button class="btn-success">Salvar</button>
<button class="btn-danger">Excluir</button>

<!-- Depois -->
<button class="btn btn-primary">Salvar</button>
<button class="btn btn-destructive">Excluir</button>
```

---

## Arquivos de Referência

- **CSS Principal:** `interface-web/styles.css` - Variáveis e layout base
- **Componentes:** `interface-web/components.css` - Classes reutilizáveis
- **Exemplo de Dashboard:** `interface-web/app.js` - Função `loadPageDashboard()`
- **Projeto de Referência:** `interface-web/instacar-insights-reference/`

---

## Notas Importantes

1. **Sempre use variáveis CSS** ao invés de valores hardcoded para cores, espaçamentos e fontes.
2. **Mantenha consistência** nos tamanhos de fonte, padding e gaps entre elementos.
3. **Teste responsividade** em diferentes tamanhos de tela (mobile, tablet, desktop).
4. **Use classes existentes** antes de criar novas classes CSS.
5. **Ícones SVG** devem ser inline e usar `currentColor` para facilitar mudanças de cor.

---

**Última atualização:** Dezembro 2025  
**Versão do Design System:** 2.7 (baseado em instacar-insights)

