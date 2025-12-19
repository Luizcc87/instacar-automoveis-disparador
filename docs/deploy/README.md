# Guia de Deploy

Documentação para fazer deploy do sistema em diferentes plataformas.

## 📦 Opções de Deploy

### Interface Web

- **[Cloudflare Pages](cloudflare-pages.md)** ⭐ Recomendado (Gratuito, rápido, CDN global)
- Vercel (alternativa)
- Netlify (alternativa)
- GitHub Pages (alternativa)

### Backend/Workflows

- **N8N Cloud** (recomendado)
- N8N Self-Hosted (VPS, Docker)
- Railway
- Render

## 🚀 Deploy Rápido - Cloudflare Pages

1. Siga o guia: [cloudflare-pages.md](cloudflare-pages.md)
2. Tempo estimado: 5-10 minutos
3. Custo: **Gratuito**

## 📋 Checklist Geral

Antes de fazer deploy:

- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais seguras (não versionadas)
- [ ] Testes locais realizados
- [ ] Documentação atualizada
- [ ] Backup do banco de dados (se necessário)

## 🔐 Segurança

- ✅ Use apenas Anon Key no frontend
- ✅ Service Role Key apenas no N8N
- ✅ RLS (Row Level Security) configurado
- ✅ CORS configurado corretamente
- ✅ Tokens rotacionados regularmente

## 📚 Documentação Adicional

- [Configuração Supabase](../supabase/README.md)
- [Configuração N8N](../n8n/configuracao.md)
- [Checklist de Segurança](../seguranca/checklist.md)
