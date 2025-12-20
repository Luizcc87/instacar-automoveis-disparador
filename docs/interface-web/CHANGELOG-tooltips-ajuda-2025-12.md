# Changelog - Sistema de Tooltips e Ajuda

**Data:** Dezembro 2025  
**Versão:** 2.3

## 📋 Resumo

Implementação completa de sistema de tooltips contextuais e página de ajuda para melhorar a experiência do usuário e facilitar o uso da interface por usuários leigos.

## ✨ Novas Funcionalidades

### 1. Sistema de Tooltips Contextuais

- **Ícones de ajuda "?"** ao lado de todos os labels de campos importantes
- **Tooltip hover:** Dica rápida ao passar o mouse (aparece após 300ms)
- **Tooltip popover:** Detalhes completos ao clicar no ícone
- **Posicionamento inteligente:** Tooltips se ajustam automaticamente para não sair da tela
- **Responsivo:** Funciona perfeitamente em mobile, tablet e desktop
- **Acessível:** Suporte a navegação por teclado (Enter/ESC)

### 2. Tooltips Implementados

#### Formulário de Campanha (18 campos)
- Nome da Campanha
- Descrição
- Período do Ano
- Status
- Data Início/Fim
- Limite de Envios/Dia
- Intervalo Mínimo (dias)
- Intervalo Entre Envios (segundos)
- Prioridade
- Instância API WhatsApp
- **Agendamento Cron** ⭐ (com exemplos práticos detalhados)
- Prompt Personalizado para IA
- Template de Mensagem
- Usar Veículos
- Usar Vendedor
- Tamanho do Lote
- Processar Finais de Semana
- Horário Início/Fim

#### Formulário de Instância Uazapi (5 campos)
- Nome da Instância
- Tipo de API
- URL Base da Instância
- Instance Token
- Configuração Extra (JSON)

### 3. Modal de Ajuda Completo

Botão "❓ Ajuda" no cabeçalho da página abre modal com 5 seções:

1. **📖 Visão Geral**
   - O que é o sistema
   - Como funciona o fluxo completo
   - Componentes principais (Interface Web, N8N, Supabase, Uazapi, OpenAI)

2. **📝 Campos do Formulário**
   - Explicação de todos os campos
   - Dicas de boas práticas
   - Quando usar cada opção

3. **⏰ Agendamento Cron** (Seção Dedicada)
   - O que é cron
   - Formato completo: `minuto hora dia mês dia-semana`
   - Tabela explicativa de cada campo
   - Caracteres especiais (*, ,, -, /)
   - **6 exemplos práticos** com explicações:
     - `0 9 * * 1-5` - 9h, dias úteis
     - `0 9 1 1 *` - 1º de janeiro às 9h
     - `0 */2 * * *` - A cada 2 horas
     - `30 14 * * 0` - Domingos às 14:30
     - `0 9,14 * * 1-5` - 9h e 14h, dias úteis
     - `0 0 1 * *` - Todo dia 1 de cada mês à meia-noite
   - Dicas e recomendações

4. **⚙️ Funcionalidades**
   - Como criar e gerenciar campanhas
   - Upload de planilhas
   - Gerenciar clientes
   - Configurar instâncias WhatsApp

5. **🔧 Troubleshooting**
   - Problemas comuns e soluções
   - Como verificar status
   - Guia de resolução de problemas

## 🎨 Melhorias de UX

- **Tooltips não intrusivos:** Não bloqueiam a interação com o formulário
- **Conteúdo em camadas:** Hover mostra resumo rápido, click mostra detalhes completos
- **Design consistente:** Segue o design system existente (cores, espaçamento, tipografia)
- **Animações suaves:** Transições elegantes para melhor experiência
- **Navegação intuitiva:** Tabs no modal de ajuda facilitam encontrar informações

## 🔧 Implementação Técnica

### Arquivos Modificados

- `interface-web/index.html`
  - CSS completo para tooltips (hover e popover)
  - Estrutura HTML do modal de ajuda
  - Botão de ajuda no cabeçalho
  - Overlay para fechar tooltips

- `interface-web/app.js`
  - Objeto `tooltipsConfig` com configuração de todos os tooltips
  - Função `criarTooltipHelpIcon()` - cria ícone de ajuda reutilizável
  - Função `mostrarTooltipPopover()` - exibe popover com detalhes
  - Função `adicionarTooltipsFormularioCampanha()` - adiciona tooltips automaticamente
  - Função `adicionarTooltipsFormularioInstancia()` - adiciona tooltips no formulário de instância
  - Função `abrirModalAjuda()` - abre modal de ajuda
  - Função `trocarTabAjuda()` - navegação entre tabs do modal

### Estrutura de Dados

Cada tooltip possui:
- `titulo`: Título do campo
- `resumo`: Texto curto para tooltip hover
- `detalhes`: HTML completo com explicações, exemplos e dicas

## 📱 Responsividade

- Tooltips se ajustam automaticamente em telas pequenas
- Popover redimensiona para não sair da viewport
- Modal de ajuda otimizado para mobile com scroll interno
- Ícones de ajuda com tamanho adequado para touch

## ♿ Acessibilidade

- Suporte a navegação por teclado (Tab, Enter, ESC)
- ARIA labels nos ícones de ajuda
- Foco visual claro nos elementos interativos
- Contraste adequado em todos os elementos

## 🚀 Como Usar

### Para Usuários

1. **Tooltips nos campos:**
   - Passe o mouse sobre o ícone "?" ao lado de qualquer label
   - Clique no ícone para ver detalhes completos e exemplos

2. **Modal de ajuda:**
   - Clique no botão "❓ Ajuda" no cabeçalho
   - Navegue entre as tabs para encontrar informações
   - Use a seção "Agendamento Cron" para aprender sobre cron

### Para Desenvolvedores

Para adicionar tooltip a um novo campo:

```javascript
// 1. Adicione configuração em tooltipsConfig
tooltipsConfig: {
  novoCampo: {
    titulo: "Título do Campo",
    resumo: "Resumo curto",
    detalhes: `<p>Detalhes completos com HTML...</p>`
  }
}

// 2. Adicione no mapeamento do formulário
const mapeamentoLabels = {
  novoCampo: "novoCampo",
  // ...
};

// 3. O tooltip será adicionado automaticamente quando o modal abrir
```

## 📝 Notas

- Tooltips são adicionados automaticamente quando os modais abrem
- Não é necessário modificar o HTML manualmente
- O sistema detecta automaticamente labels e inputs
- Suporte especial para checkboxes e campos complexos

## 🔄 Compatibilidade

- Funciona com todos os navegadores modernos
- Não requer bibliotecas externas
- Compatível com o design system existente
- Não interfere com funcionalidades existentes

## 📚 Referências

- Documentação completa de campanhas: `docs/campanhas/GUIA-COMPLETO-CAMPANHAS.md`
- Guia de agendamento cron: `docs/campanhas/guia-agendamento-cron.md`
