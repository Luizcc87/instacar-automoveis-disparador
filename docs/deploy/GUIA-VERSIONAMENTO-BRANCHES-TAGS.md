# Guia de Versionamento com Branches e Tags

## 📋 Estratégia de Versionamento

Este documento descreve a estratégia para preservar versões antigas do sistema usando branches e tags no Git.

## 🎯 Objetivo

Preservar a versão estável anterior (antes das refatorações de UI/UX) enquanto desenvolvemos melhorias em uma branch separada, permitindo fácil retorno à versão anterior se necessário.

## 🔖 Estrutura Proposta

### Branches

- **`main`**: Branch principal (versão estável em produção)
- **`layout-refactor`**: Branch de desenvolvimento para refatorações de UI/UX e melhorias

### Tags

- **`v1-layout-antigo`**: Tag apontando para o último commit estável antes das refatorações
- **`v2-refatoracao-ui`**: Tag para marcar versão com refatorações (quando estável)

## 📝 Processo de Criação

### 1. Criar Tag da Versão Antiga

```bash
# Criar tag apontando para o último commit estável antes das refatorações
git tag -a v1-layout-antigo -m "Versão estável antes das refatorações de UI/UX - Dezembro 2025"

# Enviar tag para o repositório remoto
git push origin v1-layout-antigo
```

### 2. Criar Branch para Refatorações

```bash
# Criar branch a partir do estado atual (com as refatorações)
git checkout -b layout-refactor

# Enviar branch para o repositório remoto
git push -u origin layout-refactor
```

### 3. Voltar para Main e Fazer Commit das Refatorações

```bash
# Voltar para main
git checkout main

# Fazer commit das refatorações (ou manter main sem as refatorações)
# Opção A: Manter main sem refatorações (recomendado)
# Opção B: Fazer merge das refatorações em main quando estáveis
```

## 🔄 Fluxo de Trabalho Recomendado

### Desenvolvimento de Refatorações

```bash
# Trabalhar na branch de refatorações
git checkout layout-refactor

# Fazer commits normalmente
git add .
git commit -m "feat: descrição da mudança"

# Enviar para remoto
git push origin layout-refactor
```

### Quando Refatorações Estiverem Estáveis

```bash
# Criar tag da versão refatorada
git tag -a v2-refatoracao-ui -m "Versão com refatorações de UI/UX - Dezembro 2025"
git push origin v2-refatoracao-ui

# Fazer merge em main (quando aprovado)
git checkout main
git merge layout-refactor
git push origin main
```

### Retornar à Versão Antiga

```bash
# Opção 1: Checkout da tag
git checkout v1-layout-antigo

# Opção 2: Criar branch a partir da tag
git checkout -b volta-layout-antigo v1-layout-antigo

# Opção 3: Verificar diferenças
git diff v1-layout-antigo layout-refactor
```

## 📊 Estrutura Visual

```
main (versão estável atual)
  │
  ├─ v1-layout-antigo (tag)
  │
  └─ layout-refactor (branch de desenvolvimento)
       │
       └─ v2-refatoracao-ui (tag - quando estável)
```

## ✅ Benefícios

1. **Preservação**: Versão antiga sempre acessível via tag
2. **Desenvolvimento Isolado**: Refatorações não afetam main até aprovação
3. **Fácil Retorno**: Pode voltar à versão antiga a qualquer momento
4. **Histórico Claro**: Tags marcam versões importantes
5. **Colaboração**: Outros desenvolvedores podem trabalhar em branches separadas

## 🔍 Comandos Úteis

### Ver todas as tags
```bash
git tag -l
```

### Ver informações de uma tag
```bash
git show v1-layout-antigo
```

### Listar branches
```bash
git branch -a
```

### Ver diferenças entre versões
```bash
git diff v1-layout-antigo layout-refactor
```

### Ver histórico de uma branch
```bash
git log layout-refactor --oneline
```

## 📌 Notas Importantes

- **Tags são imutáveis**: Uma vez criada, a tag sempre aponta para o mesmo commit
- **Branches são mutáveis**: Podem receber novos commits
- **Main deve ser estável**: Apenas código testado e aprovado deve ir para main
- **Commits descritivos**: Use mensagens claras para facilitar navegação no histórico

## 🚀 Próximos Passos

1. Criar tag `v1-layout-antigo` apontando para commit estável
2. Criar branch `layout-refactor` para refatorações
3. Continuar desenvolvimento na branch de refatorações
4. Quando estável, criar tag `v2-refatoracao-ui` e fazer merge em main

