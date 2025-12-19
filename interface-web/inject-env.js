/**
 * Script para injetar variáveis de ambiente no HTML
 *
 * ⚠️ SEGURANÇA: Este script injeta credenciais no HTML. Nunca commite o HTML após execução.
 * O arquivo index.html deve ser versionado apenas com valores vazios no script env-config.
 *
 * Para Cloudflare Pages:
 * - Configure variáveis em Settings > Environment Variables
 * - Configure Build Command: cd interface-web && npm install && npm run inject-env
 *
 * Para desenvolvimento local:
 * - Use arquivo .env na raiz do projeto (não na pasta interface-web)
 * - Execute: npm run inject-env antes de servir os arquivos
 * - Ou use: .\start-dev.bat que faz isso automaticamente
 *
 * Documentação completa: README.md
 */

const fs = require("fs");
const path = require("path");

// Tentar carregar dotenv se disponível (opcional)
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch (e) {
  // dotenv não instalado, usar apenas process.env (Cloudflare Pages)
}

// Ler variáveis de ambiente (prioridade: process.env > .env)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Caminho do arquivo HTML
const htmlPath = path.join(__dirname, "index.html");

if (!fs.existsSync(htmlPath)) {
  console.error("❌ Arquivo index.html não encontrado em:", htmlPath);
  process.exit(1);
}

// Ler HTML
let html = fs.readFileSync(htmlPath, "utf8");

// Criar script de injeção de variáveis
const envScript = `    <script id="env-config">
      // Variáveis de ambiente injetadas em build time
      window.ENV = {
        SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},
        SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY)}
      };
    </script>`;

// Substituir o placeholder ou adicionar antes do config.js
if (html.includes('<script id="env-config">')) {
  // Substituir placeholder existente
  html = html.replace(
    /<script id="env-config">[\s\S]*?<\/script>/,
    envScript.trim()
  );
} else {
  // Adicionar antes do config.js
  html = html.replace(
    /<script src="config\.js"><\/script>/,
    envScript + '\n    <script src="config.js"></script>'
  );
}

// Escrever HTML atualizado
fs.writeFileSync(htmlPath, html, "utf8");

console.log("✅ Variáveis de ambiente injetadas no index.html");
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log("✅ Supabase configurado via variáveis de ambiente");
  console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...`);
} else {
  console.warn("⚠️  SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas");
  console.warn("   Configure no .env (dev) ou Cloudflare Pages (produção)");
}
