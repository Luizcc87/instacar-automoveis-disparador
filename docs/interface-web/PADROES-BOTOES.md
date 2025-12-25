# Padrões de Botões - Interface Web

Este documento detalha os padrões de botões utilizados na interface web, baseados no projeto de referência `instacar-insights`.

## 📋 Índice

1. [Estrutura Base](#estrutura-base)
2. [Variantes de Botão](#variantes-de-botão)
3. [Tamanhos](#tamanhos)
4. [Botões com Ícones](#botões-com-ícones)
5. [Estados](#estados)
6. [Migração](#migração)
7. [Referências](#referências)

---

## Estrutura Base

Todos os botões devem seguir esta estrutura:

```html
<button class="btn [variante] [tamanho]">
  [ícone SVG opcional]
  Texto do Botão
</button>
```

**Regra fundamental:** Sempre use `.btn` como classe base antes da variante.

---

## Variantes de Botão

### 1. Primary (`.btn-primary`)

**Uso:** Ações principais (criar, salvar, confirmar, enviar)

**Características:**
- Background: Gradiente azul/roxo (`var(--gradient-primary)`)
- Texto: Branco (`hsl(var(--primary-foreground))`)
- Sombra: Sutil (`var(--shadow-sm)`)
- Hover: Opacidade 0.9, sombra glow, leve elevação

**Exemplo:**
```html
<button class="btn btn-primary" onclick="criarCampanha()">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
  Nova Campanha
</button>
```

### 2. Secondary (`.btn-secondary`)

**Uso:** Ações secundárias (cancelar, fechar, voltar, editar)

**Características:**
- Background: Cinza claro (`hsl(var(--secondary))`)
- Texto: Escuro (`hsl(var(--secondary-foreground))`)
- Borda: Sutil (`1px solid hsl(var(--border))`)
- Hover: Background mais escuro

**Exemplo:**
```html
<button class="btn btn-secondary" onclick="cancelar()">
  Cancelar
</button>
```

### 3. Destructive (`.btn-destructive`)

**Uso:** Ações destrutivas (excluir, remover, deletar)

**Características:**
- Background: Vermelho (`hsl(var(--destructive))`)
- Texto: Branco (`hsl(var(--destructive-foreground))`)
- Hover: Background vermelho mais escuro

**Exemplo:**
```html
<button class="btn btn-destructive" onclick="excluir()">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
  Excluir
</button>
```

### 4. Outline (`.btn-outline`)

**Uso:** Ações alternativas, menos proeminentes

**Características:**
- Background: Transparente
- Borda: `1px solid hsl(var(--input))`
- Texto: Escuro (`hsl(var(--foreground))`)
- Hover: Background accent

**Exemplo:**
```html
<button class="btn btn-outline" onclick="alternativa()">
  Ver Detalhes
</button>
```

### 5. Ghost (`.btn-ghost`)

**Uso:** Ações discretas, botões de menu, ações terciárias

**Características:**
- Background: Transparente
- Texto: Escuro (`hsl(var(--foreground))`)
- Hover: Background accent

**Exemplo:**
```html
<button class="btn btn-ghost btn-icon" onclick="toggleMenu()">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="1"></circle>
    <circle cx="12" cy="5" r="1"></circle>
    <circle cx="12" cy="19" r="1"></circle>
  </svg>
</button>
```

---

## Tamanhos

### Small (`.btn-sm`)

- **Altura:** 2.25rem (36px)
- **Padding:** 0.5rem 0.75rem
- **Font-size:** 0.75rem (12px)
- **Uso:** Ações compactas, botões em tabelas

```html
<button class="btn btn-primary btn-sm">Pequeno</button>
```

### Default (sem classe)

- **Altura:** 2.5rem (40px)
- **Padding:** 0.625rem 1rem
- **Font-size:** 0.875rem (14px)
- **Uso:** Uso geral, maioria dos botões

```html
<button class="btn btn-primary">Padrão</button>
```

### Large (`.btn-lg`)

- **Altura:** 2.75rem (44px)
- **Padding:** 0.625rem 2rem
- **Font-size:** 1rem (16px)
- **Uso:** Destaque, CTAs principais

```html
<button class="btn btn-primary btn-lg">Grande</button>
```

### Icon (`.btn-icon`)

- **Altura:** 2.5rem (40px)
- **Largura:** 2.5rem (40px)
- **Padding:** 0
- **Uso:** Apenas ícone, sem texto

```html
<button class="btn btn-ghost btn-icon" onclick="acao()">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Ícone -->
  </svg>
</button>
```

---

## Botões com Ícones

### Regras Gerais

1. **Sempre use SVG inline** (não imagens ou fontes de ícone)
2. **Use `stroke="currentColor"`** para herdar a cor do texto
3. **Tamanho padrão:** 18px para botões normais, 16px para botões pequenos
4. **Gap automático:** 0.5rem entre ícone e texto (via `.btn`)

### Estrutura

```html
<button class="btn btn-primary">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Path do ícone -->
  </svg>
  Texto do Botão
</button>
```

### Tamanhos de Ícone por Contexto

| Contexto | Tamanho | Classe Botão |
|----------|---------|--------------|
| Botão padrão | 18px | `.btn` (default) |
| Botão pequeno | 16px | `.btn-sm` |
| Botão grande | 20px | `.btn-lg` |
| Botão ícone | 20px | `.btn-icon` |
| Badge | 12px | `.status-badge` |
| Card de métrica | 20px | - |

### Exemplos de Ícones Comuns

**Plus (Adicionar):**
```html
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="12" y1="5" x2="12" y2="19"></line>
  <line x1="5" y1="12" x2="19" y2="12"></line>
</svg>
```

**Trash (Excluir):**
```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <polyline points="3 6 5 6 21 6"></polyline>
  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
</svg>
```

**More Vertical (Menu):**
```html
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <circle cx="12" cy="12" r="1"></circle>
  <circle cx="12" cy="5" r="1"></circle>
  <circle cx="12" cy="19" r="1"></circle>
</svg>
```

---

## Estados

### Disabled

```html
<button class="btn btn-primary" disabled>
  Desabilitado
</button>
```

**Características:**
- Opacidade: 0.5
- Cursor: `not-allowed`
- Pointer events: `none`

### Loading

```html
<button class="btn btn-primary" disabled>
  <div class="spinner"></div>
  Carregando...
</button>
```

**Nota:** Adicione um spinner/loader visual quando o botão estiver em estado de carregamento.

### Focus Visible

Todos os botões têm ring de foco para acessibilidade:

- **Ring:** 2px
- **Cor:** `hsl(var(--ring))`
- **Offset:** 2px
- **Cor offset:** `hsl(var(--background))`

---

## Migração

### De Classes Antigas para Novas

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

As seguintes classes antigas ainda funcionam, mas devem ser migradas:

| Classe Antiga | Nova Classe | Notas |
|---------------|-------------|-------|
| `btn-success` | `btn-primary` | Ou use `btn-secondary` com CSS customizado |
| `btn-danger` | `btn-destructive` | Migração direta |

**Exemplo:**
```html
<!-- Antes -->
<button class="btn-success">Salvar</button>
<button class="btn-danger">Excluir</button>

<!-- Depois -->
<button class="btn btn-primary">Salvar</button>
<button class="btn btn-destructive">Excluir</button>
```

---

## Referências

### Arquivos CSS

- **Estilos de botões:** `interface-web/components.css` (linhas 123-199)
- **Variáveis CSS:** `interface-web/styles.css`

### Projeto de Referência

- **Componente Button:** `interface-web/instacar-insights-reference/src/components/ui/button.tsx`
- **CSS Base:** `interface-web/instacar-insights-reference/src/index.css`

### Documentação Relacionada

- **Guia Completo do Design System:** `docs/interface-web/GUIA-DESIGN-SYSTEM.md`
- **Seção de Botões:** `docs/interface-web/GUIA-DESIGN-SYSTEM.md#botões`

---

## Checklist de Uso

Ao criar ou modificar um botão, verifique:

- [ ] Usa `class="btn"` como base
- [ ] Inclui variante apropriada (`btn-primary`, `btn-secondary`, etc.)
- [ ] Ícones SVG usam `stroke="currentColor"`
- [ ] Tamanho do ícone é apropriado (18px padrão, 16px pequeno)
- [ ] Não usa estilos inline para cores
- [ ] Gap entre ícone e texto é automático (0.5rem)
- [ ] Estados disabled são tratados corretamente
- [ ] Focus visible está funcionando (teste com Tab)

---

**Última atualização:** Dezembro 2025  
**Versão:** 2.7 (baseado em instacar-insights)

