# Scripts de Download - Instacar Insights Reference

Scripts para baixar arquivos do repositório `instacar-insights` para análise e replicação do design.

## 📥 Como Usar

### ⭐ Opção 1: Clone Completo (Recomendado)

Clona o repositório completo usando Git. Funciona mesmo se o repositório for privado.

#### Windows (PowerShell)

```powershell
cd interface-web
.\scripts\clone-instacar-insights-git.ps1
```

#### Linux/Mac (Bash)

```bash
cd interface-web
chmod +x scripts/clone-instacar-insights.sh
./scripts/clone-instacar-insights.sh
```

**Nota:** Se o repositório for privado, configure autenticação Git primeiro:
```bash
git config --global credential.helper store
# Na primeira vez, será solicitado usuário e senha/token
```

### Opção 2: Download via API (Repositório Público)

#### Node.js (Multiplataforma)

```bash
cd interface-web
npm run download-reference-advanced
```

ou

```bash
cd interface-web
node scripts/download-instacar-insights-advanced.js
```

### Opção 3: Download Manual de Arquivos Específicos

#### Windows (PowerShell)

```powershell
cd interface-web
.\scripts\download-instacar-insights.ps1
```

#### Linux/Mac (Bash)

```bash
cd interface-web
chmod +x scripts/download-instacar-insights.sh
./scripts/download-instacar-insights.sh
```

## 📁 Arquivos Baixados

Os arquivos serão salvos em `interface-web/instacar-insights-reference/` com a seguinte estrutura:

```
instacar-insights-reference/
├── src/
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── RecentActivity.tsx
│   │   │   └── CampaignProgress.tsx
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── input.tsx
│   │   │   └── dropdown-menu.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       └── AppLayout.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Campanhas.tsx
│   │   ├── Clientes.tsx
│   │   └── Templates.tsx
│   ├── lib/
│   │   └── utils.ts
│   └── index.css
├── tailwind.config.ts
└── components.json
```

## 🎯 Objetivo

Estes arquivos servem como referência para:

1. **Analisar padrões de design** - Estrutura de componentes, classes CSS, layout
2. **Replicar estilos** - Cores, espaçamentos, tipografia, animações
3. **Entender estrutura** - Organização de componentes e páginas
4. **Comparar implementações** - Verificar diferenças entre projetos

## ⚠️ Nota

Os arquivos baixados são apenas para **referência e análise**. Não devem ser copiados diretamente, mas sim usados como guia para replicar o design no projeto atual.

## 🔄 Atualizar Referência

Execute o script novamente para atualizar os arquivos de referência com as últimas mudanças do repositório.

## 🔐 Repositório Privado

Se o repositório for privado:

1. **Configure autenticação Git:**
   ```bash
   git config --global credential.helper store
   ```

2. **Ou use Personal Access Token:**
   - Crie um token em: https://github.com/settings/tokens
   - Use no clone: `git clone https://[TOKEN]@github.com/Luizcc87/instacar-insights.git`

3. **Ou clone manualmente:**
   ```bash
   cd interface-web
   git clone https://github.com/Luizcc87/instacar-insights.git instacar-insights-reference
   ```
