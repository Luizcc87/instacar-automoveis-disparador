# 📋 Como Obter ID do Google Sheets

Guia para encontrar o ID correto do documento Google Sheets para usar no workflow.

## 🔍 Diferença entre Document ID e Sheet ID (gid)

Na URL do Google Sheets:
```
https://docs.google.com/spreadsheets/d/{DOCUMENT_ID}/edit?gid={SHEET_GID}#gid={SHEET_GID}
```

- **DOCUMENT_ID**: ID do documento (planilha completa)
- **SHEET_GID**: ID da aba específica dentro do documento

## ✅ O que usar no workflow

No workflow, você precisa usar o **DOCUMENT_ID**, não o gid.

### Exemplo

**URL completa:**
```
https://docs.google.com/spreadsheets/d/1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g/edit?gid=490554065#gid=490554065
```

**Document ID (use este):**
```
1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g
```

**Sheet gid (NÃO use este):**
```
490554065
```

## 📝 Passo a Passo

### 1. Abrir a Planilha no Google Sheets

1. Abra a planilha no navegador
2. Veja a URL na barra de endereços

### 2. Extrair o Document ID

O Document ID está entre `/d/` e `/edit`:

```
https://docs.google.com/spreadsheets/d/[AQUI_ESTA_O_ID]/edit?gid=...
```

**Exemplo:**
- URL: `https://docs.google.com/spreadsheets/d/1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g/edit?gid=490554065`
- Document ID: `1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g`

### 3. Verificar Nome da Aba

O nome da aba está visível na parte inferior da planilha (abas).

**Exemplo:**
- Nome da aba: `Listagem de Clientes por Vended`

### 4. Configurar no Workflow

No nó **"Set Variables - CONFIGURAR AQUI"**, configure:

#### SHEET_IDS
```json
["1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g", "outro-document-id", ...]
```

**⚠️ IMPORTANTE**: Use Document IDs, não gids!

#### SHEET_PAGE_NAME
```
Listagem de Clientes por Vended
```

## 🔄 Se Você Tem Múltiplas Planilhas

Se você tem 9 planilhas diferentes (documentos diferentes):

1. Abra cada planilha
2. Copie o Document ID de cada uma
3. Cole no array `SHEET_IDS`

**Exemplo:**
```json
[
  "1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g",
  "1abc123def456ghi789jkl012mno345pqr",
  "1xyz789uvw456rst123opq012mno345abc",
  ...
]
```

## 🔄 Se Você Tem Uma Planilha com Múltiplas Abas

Se todas as planilhas são na verdade abas do mesmo documento:

1. Use o mesmo Document ID para todas
2. Configure nomes diferentes de abas (se necessário)

**Exemplo:**
```json
// Mesmo documento, abas diferentes
SHEET_IDS: ["1qeXbidqd3I-oBj-07kbARtpjKvxjKIAKmjpbEl7PE5g"]
SHEET_PAGE_NAME: "Listagem de Clientes por Vended"
```

## ⚠️ Erro Comum

### Erro 404: "Requested entity was not found"

**Causa**: Você está usando o `gid` (ID da aba) em vez do Document ID.

**Solução**: 
1. Verifique a URL da planilha
2. Use o ID que está entre `/d/` e `/edit`
3. Atualize `SHEET_IDS` com o Document ID correto

## 🧪 Verificar se Está Correto

Após configurar, teste o nó "Read Google Sheets":

1. Execute o workflow
2. Verifique se o nó "Read Google Sheets" consegue ler os dados
3. Se der erro 404, o Document ID está incorreto

## 📚 Referência

- [Google Sheets API - Document IDs](https://developers.google.com/sheets/api/guides/concepts)
- [N8N Google Sheets Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlesheets/)

---

**Última atualização**: 2025-01-24

