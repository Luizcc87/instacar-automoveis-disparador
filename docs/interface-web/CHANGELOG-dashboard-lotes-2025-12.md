# Changelog: Dashboard de Lotes - Dezembro 2025

> **Nota:** Este documento descreve melhorias propostas/planejadas. Para ver as melhorias implementadas, consulte [CHANGELOG-dashboard-historico-execucoes-2025-12.md](CHANGELOG-dashboard-historico-execucoes-2025-12.md)

## Objetivo

Melhorar a dashboard de campanhas para exibir informações detalhadas sobre o progresso de lotes, permitindo que o usuário acompanhe visualmente o andamento de cada execução.

## Campos Disponíveis na Tabela

A tabela `instacar_campanhas_execucoes` possui os seguintes campos relacionados a lotes:

- `lote_atual` (INTEGER): Número do lote atual sendo processado
- `contatos_processados` (INTEGER): Total de contatos processados (acumulado)
- `contatos_pendentes` (INTEGER): Total de contatos ainda pendentes
- `total_contatos_elegiveis` (INTEGER): Total de contatos elegíveis para a campanha
- `clientes_no_lote_atual` (INTEGER): Quantidade de clientes no lote atual
- `status_execucao` (TEXT): Status da execução (`em_andamento`, `concluida`, `pausada`, `erro`)

## Melhorias Propostas

### 1. Adicionar Coluna "Progresso" na Tabela de Execuções

**Localização:** `interface-web/app.js` - função `abrirDashboardCampanha()`

**Implementação:**

```javascript
// Calcular progresso
const totalElegiveis = exec.total_contatos_elegiveis || 0;
const processados = exec.contatos_processados || 0;
const pendentes = exec.contatos_pendentes || 0;
const percentual = totalElegiveis > 0 
  ? Math.round((processados / totalElegiveis) * 100) 
  : 0;

// Adicionar coluna na tabela
<td style="padding: 10px; border-bottom: 1px solid #eee;">
  <div style="display: flex; align-items: center; gap: 8px;">
    <div style="flex: 1; background: #f0f0f0; border-radius: 4px; height: 20px; position: relative; overflow: hidden;">
      <div style="background: #4CAF50; height: 100%; width: ${percentual}%; transition: width 0.3s;"></div>
    </div>
    <span style="font-size: 12px; color: #666;">${percentual}%</span>
  </div>
  <div style="font-size: 11px; color: #999; margin-top: 4px;">
    ${processados}/${totalElegiveis} processados
    ${pendentes > 0 ? ` • ${pendentes} pendentes` : ''}
  </div>
</td>
```

### 2. Adicionar Coluna "Lote Atual"

**Implementação:**

```javascript
<td style="padding: 10px; border-bottom: 1px solid #eee;">
  <div style="font-weight: 500;">Lote ${exec.lote_atual || 1}</div>
  ${exec.clientes_no_lote_atual 
    ? `<div style="font-size: 11px; color: #666;">${exec.clientes_no_lote_atual} clientes</div>`
    : ''
  }
</td>
```

### 3. Adicionar Badge de Status Detalhado

**Implementação:**

```javascript
// Badge de status com mais informações
const statusBadge = (() => {
  const status = exec.status_execucao;
  const cores = {
    'em_andamento': { bg: '#e3f2fd', text: '#1976d2', icon: '🔄' },
    'concluida': { bg: '#e8f5e9', text: '#388e3c', icon: '✅' },
    'pausada': { bg: '#fff3e0', text: '#f57c00', icon: '⏸️' },
    'erro': { bg: '#ffebee', text: '#d32f2f', icon: '❌' }
  };
  const cor = cores[status] || cores['em_andamento'];
  
  return `
    <span class="status ${status}" style="
      background: ${cor.bg};
      color: ${cor.text};
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    ">
      ${cor.icon} ${status}
    </span>
  `;
})();
```

### 4. Adicionar Seção de Métricas Resumidas

**Localização:** Acima da tabela de execuções

**Implementação:**

```javascript
// Calcular métricas resumidas
const execucaoAtual = execucoesAtualizadas && execucoesAtualizadas.length > 0 
  ? execucoesAtualizadas[0] 
  : null;

if (execucaoAtual) {
  const totalElegiveis = execucaoAtual.total_contatos_elegiveis || 0;
  const processados = execucaoAtual.contatos_processados || 0;
  const pendentes = execucaoAtual.contatos_pendentes || 0;
  const loteAtual = execucaoAtual.lote_atual || 1;
  const totalLotes = totalElegiveis > 0 
    ? Math.ceil(totalElegiveis / (execucaoAtual.clientes_no_lote_atual || 50))
    : 0;
  
  const metricasHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Lote Atual</div>
        <div style="font-size: 24px; font-weight: bold; color: #1976d2;">
          ${loteAtual}${totalLotes > 0 ? ` / ${totalLotes}` : ''}
        </div>
      </div>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Progresso</div>
        <div style="font-size: 24px; font-weight: bold; color: #388e3c;">
          ${processados} / ${totalElegiveis}
        </div>
        <div style="font-size: 11px; color: #999; margin-top: 4px;">
          ${pendentes} pendentes
        </div>
      </div>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Enviados</div>
        <div style="font-size: 24px; font-weight: bold; color: #4CAF50;">
          ${execucaoAtual.total_enviado || 0}
        </div>
      </div>
      <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Erros</div>
        <div style="font-size: 24px; font-weight: bold; color: #d32f2f;">
          ${execucaoAtual.total_erros || 0}
        </div>
      </div>
    </div>
  `;
  
  // Inserir antes da tabela
  const tabelaContainer = document.querySelector('#tabelaExecucoesContainer');
  if (tabelaContainer) {
    tabelaContainer.insertAdjacentHTML('beforebegin', metricasHtml);
  }
}
```

### 5. Query SQL Otimizada para Dashboard

**Localização:** Função `abrirDashboardCampanha()` - query Supabase

**Query Atualizada:**

```javascript
const { data: execucoes, error } = await supabaseClient
  .from('instacar_campanhas_execucoes')
  .select(`
    id,
    data_execucao,
    status_execucao,
    total_enviado,
    total_erros,
    total_duplicados,
    total_sem_whatsapp,
    trigger_tipo,
    horario_inicio,
    horario_fim,
    lote_atual,
    contatos_processados,
    contatos_pendentes,
    total_contatos_elegiveis,
    clientes_no_lote_atual,
    proxima_execucao_em
  `)
  .eq('campanha_id', campanhaId)
  .order('data_execucao', { ascending: false })
  .order('created_at', { ascending: false })
  .limit(30);
```

## Exemplo de Tabela Atualizada

| Data | Status | Lote | Progresso | Enviados | Erros | Tipo | Início | Ações |
|------|--------|------|-----------|----------|-------|------|--------|-------|
| 23/12/2025 | 🔄 em_andamento | Lote 3 / 5 | ████████░░ 80%<br>400/500 processados • 100 pendentes | 380 | 2 | cron | 23/12/2025 09:00 | ⏸️ Pausar |

## Benefícios

1. **Visibilidade:** Usuário vê claramente o progresso de cada execução
2. **Rastreabilidade:** Fácil identificar em qual lote a execução está
3. **Métricas:** Informações resumidas facilitam tomada de decisão
4. **Debugging:** Ajuda a identificar problemas de processamento

## Próximos Passos

1. Implementar as melhorias propostas no `app.js`
2. Testar com execuções reais
3. Coletar feedback dos usuários
4. Adicionar gráficos de progresso ao longo do tempo (opcional)

