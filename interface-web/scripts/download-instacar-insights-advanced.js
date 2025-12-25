#!/usr/bin/env node
/**
 * Script avançado para baixar arquivos do repositório instacar-insights
 * Usa API do GitHub para descobrir estrutura e baixar arquivos
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'Luizcc87';
const REPO_NAME = 'instacar-insights';
const GITHUB_API = 'https://api.github.com';
const GITHUB_RAW = 'https://raw.githubusercontent.com';

const OUTPUT_DIR = path.join(__dirname, '..', 'instacar-insights-reference');

/**
 * Faz requisição HTTP
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'instacar-downloader',
        ...options.headers
      }
    };

    https.get(requestOptions, (response) => {
      let data = '';
      
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Seguir redirect
        return httpRequest(response.headers.location, options).then(resolve).catch(reject);
      }

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({ statusCode: response.statusCode, data, headers: response.headers });
        } else {
          reject(new Error(`HTTP ${response.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Lista branches do repositório
 */
async function listBranches() {
  try {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/branches`;
    const response = await httpRequest(url);
    const branches = JSON.parse(response.data);
    return branches.map(b => b.name);
  } catch (error) {
    console.warn('⚠️  Não foi possível listar branches:', error.message);
    return ['main', 'master', 'develop'];
  }
}

/**
 * Lista conteúdo de um diretório
 */
async function listDirectory(branch, path = '') {
  try {
    const url = `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${branch}`;
    const response = await httpRequest(url);
    return JSON.parse(response.data);
  } catch (error) {
    return null;
  }
}

/**
 * Baixa um arquivo
 */
async function downloadFile(branch, filePath) {
  const url = `${GITHUB_RAW}/${REPO_OWNER}/${REPO_NAME}/${branch}/${filePath}`;
  const outputPath = path.join(OUTPUT_DIR, filePath);
  const outputDir = path.dirname(outputPath);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    const response = await httpRequest(url);
    fs.writeFileSync(outputPath, response.data, 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Busca arquivos recursivamente
 */
async function findFiles(branch, dirPath = '', filePatterns = ['.tsx', '.ts', '.css', '.json'], maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];

  const contents = await listDirectory(branch, dirPath);
  if (!contents || !Array.isArray(contents)) return [];

  const files = [];

  for (const item of contents) {
    if (item.type === 'file') {
      const ext = path.extname(item.name);
      if (filePatterns.includes(ext) || filePatterns.includes('*')) {
        files.push(item.path);
      }
    } else if (item.type === 'dir') {
      // Ignorar node_modules, .git, etc
      if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(item.name)) {
        const subFiles = await findFiles(branch, item.path, filePatterns, maxDepth, currentDepth + 1);
        files.push(...subFiles);
      }
    }
  }

  return files;
}

/**
 * Função principal
 */
async function main() {
  console.log('🔍 Descobrindo estrutura do repositório...\n');

  // Listar branches
  const branches = await listBranches();
  console.log(`📋 Branches encontrados: ${branches.join(', ')}`);
  
  const branch = branches[0] || 'main';
  console.log(`🌿 Usando branch: ${branch}\n`);

  // Buscar arquivos relevantes
  console.log('🔎 Buscando arquivos...');
  const allFiles = await findFiles(branch, '', ['.tsx', '.ts', '.css', '.json'], 6);
  
  // Filtrar arquivos relevantes
  const relevantFiles = allFiles.filter(file => {
    const lowerFile = file.toLowerCase();
    return (
      lowerFile.includes('component') ||
      lowerFile.includes('page') ||
      lowerFile.includes('layout') ||
      lowerFile.includes('dashboard') ||
      lowerFile.includes('campanha') ||
      lowerFile.includes('cliente') ||
      lowerFile.includes('template') ||
      lowerFile.includes('index.css') ||
      lowerFile.includes('tailwind.config') ||
      lowerFile.includes('components.json') ||
      lowerFile.includes('utils')
    );
  });

  console.log(`📦 Encontrados ${relevantFiles.length} arquivos relevantes\n`);

  // Baixar arquivos
  console.log('📥 Baixando arquivos...\n');
  let success = 0;
  let failed = 0;

  for (const file of relevantFiles) {
    console.log(`📥 ${file}`);
    if (await downloadFile(branch, file)) {
      console.log(`✅ Salvo\n`);
      success++;
      await new Promise(resolve => setTimeout(resolve, 300)); // Delay para evitar rate limiting
    } else {
      console.log(`❌ Erro\n`);
      failed++;
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`✅ Sucesso: ${success}`);
  console.log(`❌ Erros: ${failed}`);
  console.log(`\n📁 Arquivos salvos em: ${OUTPUT_DIR}`);
  console.log('\n✨ Download concluído!');
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

