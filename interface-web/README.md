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

📖 **Changelog completo**: [../docs/interface-web/CHANGELOG-UI-UX-2025-12.md](../docs/interface-web/CHANGELOG-UI-UX-2025-12.md)

## 🎯 Próximos Passos

Após conectar:

1. Crie sua primeira campanha
2. Configure agendamento (opcional)
3. Teste disparo manual
4. Monitore execuções
