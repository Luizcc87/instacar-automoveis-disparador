# Interface Web - Gerenciador de Campanhas

Interface web para gerenciar campanhas de marketing via WhatsApp e upload de planilhas de clientes.

## 📤 Sistema de Upload de Planilhas

A interface suporta upload de planilhas XLSX e CSV para importação em massa de clientes:

- **Prévia antes do processamento**: Visualize os dados antes de confirmar
- **Agrupamento automático**: Clientes com mesmo telefone são agrupados
- **Merge inteligente de veículos**: Veículos múltiplos são mesclados corretamente
- **Detecção automática de colunas**: Suporta múltiplas variações de nomes de colunas
- **Validação e normalização**: Telefones normalizados para formato brasileiro (55XXXXXXXXXXX)

📖 **Changelog completo e documentação técnica**: [../docs/interface-web/CHANGELOG-upload-planilhas.md](../docs/interface-web/CHANGELOG-upload-planilhas.md)

## 🚀 Iniciando em Desenvolvimento

### Opção 1: Script Automatizado (Recomendado)

O script `start-dev.bat` (Windows) ou `start-dev.sh` (Linux/Mac) automatiza todo o processo:

```bash
cd interface-web
.\start-dev.bat  # Windows
# ou
./start-dev.sh   # Linux/Mac
```

O script:

1. ✅ Verifica se Node.js está instalado
2. ✅ Injeta variáveis de ambiente do `.env` no HTML
3. ✅ Inicia o servidor HTTP na porta 8000

Acesse: http://localhost:8000

### Opção 2: NPM Script

```bash
cd interface-web
npm install  # Primeira vez apenas
npm run dev  # Injeta variáveis e inicia servidor
```

### Opção 3: Servidor HTTP Simples

Se você já executou `npm run inject-env` manualmente:

```bash
# Python
python -m http.server 8000

# Ou Node.js
npx http-server . -p 8000
```

## ⚙️ Configuração

### Variáveis de Ambiente (Obrigatório)

As credenciais do Supabase devem ser configuradas via **variáveis de ambiente**:

**Desenvolvimento Local:**

1. Crie um arquivo `.env` na **raiz do projeto** (não na pasta interface-web):

```bash
SUPABASE_URL=https://seu-projeto-id.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
```

2. Execute o script de injeção antes de servir os arquivos:

```bash
npm run inject-env
```

3. Ou use o script de desenvolvimento que já faz isso automaticamente:

```bash
.\start-dev.bat  # Windows
# ou
npm run dev
```

**Produção (Cloudflare Pages):**

Configure as variáveis em **Settings > Environment Variables** do Cloudflare Pages.

### 📝 Notas Importantes

- Use apenas a **Anon Key** do Supabase, nunca a Service Key
- A Anon Key é segura para uso no frontend
- As políticas RLS (Row Level Security) protegem os dados
- **NUNCA** commite credenciais no código - use sempre variáveis de ambiente

## 🔧 Troubleshooting

### Variáveis de Ambiente não encontradas

**Erro:** "Variáveis de ambiente do Supabase não encontradas"

**Solução:**

1. Verifique se o arquivo `.env` existe na raiz do projeto com `SUPABASE_URL` e `SUPABASE_ANON_KEY`
2. Execute `npm run inject-env` antes de iniciar o servidor
3. Ou use `.\start-dev.bat` que faz isso automaticamente

### Erro de CORS

Se você ver erros de CORS:

1. Use um servidor HTTP (não abra o arquivo diretamente)
2. Configure CORS no Supabase:
   - Vá em Settings > API
   - Adicione `http://localhost:8000` nas URLs permitidas

### Erro de Conexão

- Verifique se as variáveis de ambiente foram injetadas corretamente (veja o console do navegador)
- Verifique se está usando a Anon Key (não Service Key)
- Verifique se as políticas RLS estão configuradas corretamente

## 🎨 Melhorias de UI/UX

A interface foi atualizada com:

- **Design System shadcn-ui**: Componentes padronizados e modernos
- **Layout de Lista**: Visualização de campanhas seguindo padrão das instâncias Uazapi
- **Responsividade**: Otimizado para mobile, tablet e desktop
- **Acessibilidade**: Cores e contrastes melhorados
- **Sistema de Tooltips e Ajuda**: Tooltips contextuais em todos os campos e modal de ajuda completo

📖 **Changelogs:**

- [CHANGELOG-UI-UX-2025-12.md](../docs/interface-web/CHANGELOG-UI-UX-2025-12.md) - Melhorias de design
- [CHANGELOG-tooltips-ajuda-2025-12.md](../docs/interface-web/CHANGELOG-tooltips-ajuda-2025-12.md) - Sistema de tooltips e ajuda

## ❓ Sistema de Ajuda

A interface possui um sistema completo de ajuda integrado:

- **Tooltips contextuais**: Passe o mouse ou clique no ícone "?" ao lado de qualquer campo para ver explicações e exemplos
- **Modal de ajuda**: Clique no botão "❓ Ajuda" no cabeçalho para acessar documentação completa
- **Guia de agendamento cron**: Seção dedicada com exemplos práticos de expressões cron

Os tooltips incluem:

- Explicações detalhadas de cada campo
- Exemplos práticos de uso
- Dicas de boas práticas
- Guia completo de agendamento cron com 6 exemplos

## 🔍 Filtros e Ordenação de Clientes

A interface oferece sistema completo de filtros e ordenação para facilitar o gerenciamento de clientes:

### Funcionalidades

- **Ordenação por Campo**: Nome, Último Envio, Status WhatsApp, Status de Bloqueio
- **Direção de Ordenação**: Crescente (↑) ou Decrescente (↓)
- **Persistência**: Preferências salvas automaticamente e restauradas ao recarregar
- **Dois Contextos**: Disponível na tela inicial e na seleção de clientes para campanhas
- **Integração**: Funciona em conjunto com filtros de busca e status WhatsApp existentes

### Como Usar

**Na Tela Inicial (Gerenciar Clientes):**
1. Use os dropdowns de ordenação ao lado dos filtros de busca
2. Selecione o campo e a direção desejados
3. A lista será automaticamente atualizada

**Na Seleção de Clientes para Campanhas:**
1. Abra o modal de criação/edição de campanha
2. Use os dropdowns de ordenação acima da lista de clientes
3. A lista será automaticamente reordenada

📖 **Documentação completa**: [../docs/interface-web/CHANGELOG-filtros-ordenacao-clientes-2025-12.md](../docs/interface-web/CHANGELOG-filtros-ordenacao-clientes-2025-12.md)

## ⚙️ Gerenciamento de Instâncias WhatsApp

A interface permite gerenciar múltiplas instâncias de APIs WhatsApp (Uazapi, Z-API, Evolution, etc.):

### Funcionalidades

- **Criar Instâncias**: Adicione novas instâncias com suporte para múltiplas APIs
- **Prefixo Automático**: Todas as instâncias recebem automaticamente o prefixo `Instacar_codigo_` onde `codigo` é um código único de 6 caracteres alfanuméricos
- **Normalização de Nomes**: Nomes são automaticamente normalizados para minúsculas (espaços viram underscores, acentos removidos, hífens e underscores preservados)
- **Sincronização com Uazapi**: Nomes são sincronizados automaticamente com a Uazapi ao criar/editar

### Tokens

- **Admin Token** (opcional): Necessário apenas para criar novas instâncias na Uazapi via API
  - Não é necessário para editar ou deletar instâncias
  - Não é salvo no banco de dados (usado apenas temporariamente)
- **Instance Token** (obrigatório condicionalmente): Token da instância para operações regulares
  - **Não obrigatório** ao criar nova instância Uazapi com Admin Token (será gerado automaticamente pela Uazapi)
  - **Obrigatório** ao editar instâncias existentes
  - **Obrigatório** ao criar nova instância sem Admin Token (instância já existe na Uazapi)
  - **Obrigatório** para APIs que não sejam Uazapi
  - Usado para conectar, enviar mensagens, deletar instâncias, etc.
  - É salvo no banco de dados

### Formato de Nome

- **Formato final**: `Instacar_codigo_nome-normalizado`
- **Exemplo**: Digite "numero-01" → Será salvo como "Instacar_a3k9m2_numero-01"
- **Proteção**: O prefixo não pode ser editado manualmente - apenas o nome após o prefixo

## 🎯 Próximos Passos

Após conectar:

1. Configure suas instâncias WhatsApp em "⚙️ Gerenciar Configurações"
2. Crie sua primeira campanha
3. Configure agendamento (opcional)
4. Teste disparo manual
5. Monitore execuções
