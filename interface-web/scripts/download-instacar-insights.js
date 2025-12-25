#!/usr/bin/env node
/**
 * Script para baixar arquivos do repositório instacar-insights
 * para análise e replicação do design
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'Luizcc87';
const REPO_NAME = 'instacar-insights';
const BRANCH = 'main';
const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

// Arquivos e pastas para baixar
const FILES_TO_DOWNLOAD = [
  // Componentes do Dashboard
  'src/components/dashboard/StatsCard.tsx',
  'src/components/dashboard/RecentActivity.tsx',
  'src/components/dashboard/CampaignProgress.tsx',
  
  // Componentes UI
  'src/components/ui/button.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/progress.tsx',
  'src/components/ui/skeleton.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/dropdown-menu.tsx',
  
  // Layout
  'src/components/layout/Header.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/AppLayout.tsx',
  
  // Páginas
  'src/pages/Dashboard.tsx',
  'src/pages/Campanhas.tsx',
  'src/pages/Clientes.tsx',
  'src/pages/Templates.tsx',
  
  // Estilos
  'src/index.css',
  'tailwind.config.ts',
  'components.json',
  
  // Utilitários
  'src/lib/utils.ts',
];

const OUTPUT_DIR = path.join(__dirname, '..', 'instacar-insights-reference');

/**
 * Cria diretório se não existir
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Baixa um arquivo do GitHub
 */
function downloadFile(filePath) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}/${filePath}`;
    const outputPath = path.join(OUTPUT_DIR, filePath);
    const outputDir = path.dirname(outputPath);
    
    ensureDir(outputDir);
    
    console.log(`📥 Baixando: ${filePath}`);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`✅ Salvo: ${filePath}`);
          resolve();
        });
      } else if (response.statusCode === 404) {
        console.warn(`⚠️  Arquivo não encontrado: ${filePath}`);
        resolve(); // Não é erro crítico, apenas aviso
      } else {
        reject(new Error(`Erro HTTP ${response.statusCode} ao baixar ${filePath}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Baixa todos os arquivos
 */
async function downloadAllFiles() {
  console.log('🚀 Iniciando download dos arquivos do instacar-insights...\n');
  
  ensureDir(OUTPUT_DIR);
  
  const results = {
    success: 0,
    failed: 0,
    notFound: 0
  };
  
  // Baixar arquivos em sequência para evitar rate limiting
  for (const filePath of FILES_TO_DOWNLOAD) {
    try {
      await downloadFile(filePath);
      results.success++;
      // Pequeno delay entre downloads
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`❌ Erro ao baixar ${filePath}:`, error.message);
      results.failed++;
    }
  }
  
  console.log('\n📊 Resumo:');
  console.log(`✅ Sucesso: ${results.success}`);
  console.log(`⚠️  Não encontrados: ${results.notFound}`);
  console.log(`❌ Erros: ${results.failed}`);
  console.log(`\n📁 Arquivos salvos em: ${OUTPUT_DIR}`);
  console.log('\n✨ Download concluído!');
}

// Executar
downloadAllFiles().catch(console.error);

