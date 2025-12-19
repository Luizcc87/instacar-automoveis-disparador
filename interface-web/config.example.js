// ============================================================================
// Arquivo de Configuração - Interface Web
// Instacar Automóveis - Sistema de Campanhas WhatsApp
// ============================================================================
//
// INSTRUÇÕES:
// 1. Copie este arquivo para config.js
// 2. Preencha com seus valores reais
// 3. O arquivo config.js está no .gitignore e não será versionado
//
// ============================================================================

window.INSTACAR_CONFIG = {
  // NOTA: Supabase agora é configurado via variáveis de ambiente
  // Não configure Supabase aqui - use SUPABASE_URL e SUPABASE_ANON_KEY no .env ou Cloudflare Pages

  // Configurações da Uazapi (WhatsApp API)
  // Essas configurações podem ser feitas aqui ou através da interface web
  uazapi: {
    baseUrl: "", // URL base da instância (ex: https://fourtakeoff.uazapi.com)
    token: "", // Instance Token (não Admin Token!)
  },

  // URL do webhook do N8N (opcional)
  // Deixe null se não usar disparo manual via interface
  n8nWebhookUrl: null, // ou 'https://seu-n8n.com/webhook/campanha'
};
