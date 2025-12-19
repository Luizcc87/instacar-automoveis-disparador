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

### Opção 1: Servidor HTTP Simples com Python (Recomendado)

Se você tem Python instalado:

```bash
# Navegue até a pasta interface-web
cd interface-web

# Python 3
python -m http.server 8000

# Ou Python 2
python -m SimpleHTTPServer 8000
```

Acesse: http://localhost:8000

### Opção 2: Servidor HTTP com Node.js

Se você tem Node.js instalado:

```bash
# Instale o http-server globalmente (uma vez)
npm install -g http-server

# Navegue até a pasta interface-web
cd interface-web

# Inicie o servidor
http-server -p 8000
```

Acesse: http://localhost:8000

### Opção 3: Abrir Diretamente no Navegador

**⚠️ Nota**: Pode ter problemas com CORS do Supabase se abrir diretamente.

1. Abra `index.html` diretamente no navegador
2. Se houver erros de CORS, use uma das opções acima

### Opção 4: VS Code Live Server (Recomendado para VS Code)

1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

## ⚙️ Configuração

1. Abra a interface no navegador
2. Configure a conexão com Supabase:
   - **URL do Supabase**: `https://seu-projeto.supabase.co`
   - **Anon Key**: Sua chave anon do Supabase (não a service key!)
3. Clique em "Conectar"

## 📝 Notas Importantes

- Use a **Anon Key** do Supabase, não a Service Key
- A Anon Key é segura para uso no frontend
- As políticas RLS garantem que apenas usuários autenticados possam modificar campanhas
- Para desenvolvimento local, você pode precisar configurar CORS no Supabase

## 🔧 Troubleshooting

### Erro de CORS

Se você ver erros de CORS ao abrir diretamente o arquivo:

1. Use um servidor HTTP (Opções 1, 2 ou 4 acima)
2. Ou configure CORS no Supabase:
   - Vá em Settings > API
   - Adicione `http://localhost:8000` nas URLs permitidas

### Erro de Conexão

- Verifique se a URL do Supabase está correta
- Verifique se está usando a Anon Key (não Service Key)
- Verifique se as políticas RLS estão configuradas corretamente

## 🎯 Próximos Passos

Após conectar:

1. Crie sua primeira campanha
2. Configure agendamento (opcional)
3. Teste disparo manual
4. Monitore execuções
