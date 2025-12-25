# Prompt para Lovable - Melhorias de Design do Sistema Instacar

## 🎯 Objetivo

Clonar o repositório GitHub `instacar-automoveis-disparador` e criar uma versão melhorada do frontend com design moderno, mantendo **100% da estrutura de backend e banco de dados** intacta.

## 📋 Contexto do Projeto

Este é um sistema de disparo escalonado de mensagens WhatsApp para a Instacar Automóveis que:

- Processa múltiplas planilhas do Google Sheets
- Valida duplicatas no Supabase (PostgreSQL)
- Verifica números WhatsApp via Uazapi
- Gera mensagens personalizadas com OpenAI GPT-4
- Envia mensagens via WhatsApp com controle de taxa
- Gerencia campanhas de marketing com agendamento automático
- Oferece interface web para gerenciamento de clientes e campanhas

**Stack Tecnológico:**
- **Frontend**: HTML/CSS/JavaScript vanilla (sem frameworks)
- **Backend**: N8N Workflows (orquestração)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Integrações**: Uazapi (WhatsApp), OpenAI (IA), Google Sheets

## 🔒 O QUE DEVE SER MANTIDO (CRÍTICO)

### Backend e Integrações
- ✅ **N8N Workflows**: Não alterar nenhum workflow em `fluxos-n8n/`
- ✅ **Estrutura do Banco de Dados**: Manter todas as tabelas e schemas do Supabase
- ✅ **APIs e Integrações**: Manter todas as chamadas de API (Supabase, Uazapi, OpenAI)
- ✅ **Lógica de Negócio**: Manter toda a lógica JavaScript existente em `app.js`
- ✅ **Variáveis de Ambiente**: Manter sistema de configuração via `.env`

### Funcionalidades que DEVEM Continuar Funcionando
- ✅ Gerenciamento de campanhas (criar, editar, deletar, agendar)
- ✅ Gerenciamento de clientes (visualizar, editar, criar, deletar)
- ✅ Upload de planilhas XLSX/CSV com prévia
- ✅ Seleção de clientes para campanhas
- ✅ Filtros e ordenação de clientes
- ✅ Histórico de envios
- ✅ Observações internas
- ✅ Gerenciamento de instâncias WhatsApp
- ✅ Sistema de dados dinâmicos para agente IA
- ✅ Validação de telefones
- ✅ Sistema de bloqueio de clientes

## 🎨 O QUE PODE SER MELHORADO

### Design e UX
- ✨ **Design System Moderno**: Implementar um design system consistente e profissional
- ✨ **Componentes Reutilizáveis**: Criar componentes modulares e bem estruturados
- ✨ **Responsividade Aprimorada**: Melhorar experiência em mobile, tablet e desktop
- ✨ **Animações e Transições**: Adicionar micro-interações suaves
- ✨ **Acessibilidade**: Melhorar contraste, navegação por teclado, ARIA labels
- ✨ **Loading States**: Adicionar estados de carregamento elegantes
- ✨ **Feedback Visual**: Melhorar mensagens de sucesso/erro
- ✨ **Tipografia**: Hierarquia tipográfica mais clara
- ✨ **Espaçamento**: Sistema de espaçamento consistente
- ✨ **Cores**: Paleta de cores moderna e profissional

### Estrutura do Código Frontend
- ✨ **Organização**: Separar CSS em arquivos modulares
- ✨ **Componentes**: Modularizar JavaScript em funções/objetos reutilizáveis
- ✨ **Performance**: Otimizar carregamento de recursos
- ✨ **Manutenibilidade**: Código mais limpo e documentado

## 📁 Estrutura do Projeto Atual

```
instacar-automoveis-disparador/
├── interface-web/          # Frontend (MELHORAR AQUI)
│   ├── index.html          # HTML principal
│   ├── app.js              # JavaScript principal (manter lógica)
│   ├── config.default.js   # Configurações padrão
│   ├── package.json        # Dependências
│   └── inject-env.js       # Script de injeção de variáveis
├── fluxos-n8n/            # Backend N8N (NÃO ALTERAR)
│   └── *.json             # Workflows N8N
├── docs/                   # Documentação
│   ├── supabase/          # Schemas SQL
│   ├── campanhas/         # Documentação de campanhas
│   └── interface-web/     # Documentação da interface
└── README.md              # Documentação principal
```

## 🎯 Diretrizes de Design

### Paleta de Cores Sugerida
- **Primária**: Azul moderno (#3B82F6 ou similar)
- **Secundária**: Roxo/Violeta (#8B5CF6 ou similar)
- **Sucesso**: Verde (#10B981)
- **Erro**: Vermelho (#EF4444)
- **Aviso**: Amarelo (#F59E0B)
- **Neutros**: Escala de cinzas (#111827, #6B7280, #E5E7EB, #F9FAFB)

### Componentes a Criar/Melhorar
1. **Botões**: Estados hover, active, disabled, loading
2. **Inputs**: Labels flutuantes, validação visual, mensagens de erro
3. **Modais**: Animações de entrada/saída, overlay escuro
4. **Cards**: Sombras suaves, hover effects
5. **Tabelas**: Striped rows, hover states, sorting visual
6. **Badges**: Cores contextuais, tamanhos variados
7. **Tooltips**: Posicionamento inteligente, animações
8. **Loading Spinners**: Skeleton screens, spinners elegantes
9. **Alerts/Toasts**: Notificações não intrusivas
10. **Forms**: Validação em tempo real, feedback visual

### Padrões de Layout
- **Container**: Max-width 1200px, padding responsivo
- **Grid**: Sistema de grid flexível para cards/tabelas
- **Espaçamento**: Múltiplos de 4px (4, 8, 12, 16, 24, 32, 48, 64)
- **Border Radius**: 8px (padrão), 12px (cards), 16px (modais)
- **Sombras**: Elevação sutil (0 1px 3px rgba(0,0,0,0.1))

## 🔧 Tecnologias e Ferramentas Permitidas

### Frontend
- ✅ HTML5 semântico
- ✅ CSS3 moderno (Grid, Flexbox, Custom Properties)
- ✅ JavaScript ES6+ (vanilla, sem frameworks)
- ✅ Bibliotecas permitidas:
  - Supabase JS (@supabase/supabase-js)
  - SheetJS (xlsx) para planilhas
  - PapaParse para CSV
  - CDN para ícones (Font Awesome, Heroicons, ou similar)

### Não Usar
- ❌ Frameworks (React, Vue, Angular)
- ❌ Build tools complexos (Webpack, Vite - exceto se necessário para otimização)
- ❌ CSS Frameworks completos (Bootstrap, Tailwind - mas pode usar como referência de design)
- ❌ TypeScript (manter JavaScript)

## 📝 Checklist de Implementação

### Fase 1: Análise e Preparação
- [ ] Clonar repositório do GitHub
- [ ] Analisar estrutura atual do `app.js` e `index.html`
- [ ] Identificar todas as funcionalidades existentes
- [ ] Mapear todas as chamadas de API ao Supabase
- [ ] Documentar estrutura de dados

### Fase 2: Design System
- [ ] Criar paleta de cores
- [ ] Definir tipografia (fontes, tamanhos, pesos)
- [ ] Criar componentes base (botões, inputs, cards)
- [ ] Estabelecer sistema de espaçamento
- [ ] Definir breakpoints responsivos

### Fase 3: Refatoração do HTML
- [ ] Estruturar HTML semântico
- [ ] Adicionar ARIA labels para acessibilidade
- [ ] Organizar seções com IDs/classes consistentes
- [ ] Separar CSS em arquivos modulares (opcional)

### Fase 4: Melhorias de UI/UX
- [ ] Melhorar layout de campanhas
- [ ] Melhorar layout de clientes
- [ ] Adicionar estados de loading
- [ ] Melhorar feedback visual (sucesso/erro)
- [ ] Adicionar animações sutis
- [ ] Melhorar responsividade mobile

### Fase 5: Testes e Validação
- [ ] Testar todas as funcionalidades existentes
- [ ] Validar que todas as APIs continuam funcionando
- [ ] Testar em diferentes tamanhos de tela
- [ ] Validar acessibilidade básica
- [ ] Verificar performance

## 🚨 Pontos de Atenção Críticos

### NÃO Alterar
1. **Estrutura de dados do Supabase**: Todas as tabelas, campos e relacionamentos devem permanecer iguais
2. **Chamadas de API**: Manter exatamente as mesmas queries e mutations
3. **Variáveis de ambiente**: Sistema de configuração via `.env` deve continuar funcionando
4. **Lógica de negócio**: Toda a lógica JavaScript em `app.js` deve ser preservada
5. **Workflows N8N**: Não alterar nenhum arquivo em `fluxos-n8n/`

### Manter Compatibilidade
- ✅ Todas as funções JavaScript existentes devem continuar funcionando
- ✅ IDs e classes críticos devem ser mantidos (ou mapeados)
- ✅ Event listeners devem continuar funcionando
- ✅ Sistema de injeção de variáveis de ambiente deve funcionar

## 📚 Referências de Design

### Inspirações
- **shadcn/ui**: Componentes modernos e acessíveis
- **Tailwind UI**: Layouts limpos e profissionais
- **Vercel Design**: Minimalismo e funcionalidade
- **Linear**: Interface moderna e rápida

### Princípios
- **Clareza**: Interface intuitiva e fácil de usar
- **Consistência**: Padrões visuais consistentes
- **Performance**: Carregamento rápido e responsivo
- **Acessibilidade**: WCAG 2.1 AA mínimo

## 🎯 Resultado Esperado

Ao final, o projeto deve ter:

1. ✅ **Design moderno e profissional** que melhore a experiência do usuário
2. ✅ **100% das funcionalidades** existentes funcionando perfeitamente
3. ✅ **Código mais organizado** e fácil de manter
4. ✅ **Melhor responsividade** em todos os dispositivos
5. ✅ **Performance otimizada** com carregamento rápido
6. ✅ **Acessibilidade melhorada** para todos os usuários

## 📝 Notas Finais

- **Prioridade**: Design e UX, mantendo funcionalidade
- **Abordagem**: Melhorias incrementais, não reescrita completa
- **Testes**: Validar cada funcionalidade após cada mudança
- **Documentação**: Manter comentários no código explicando melhorias

---

**Repositório GitHub**: `instacar-automoveis-disparador`  
**Foco**: Melhorias de design e UX no frontend  
**Restrição**: Manter backend e banco de dados 100% intactos

