// Sistema de Filtros Avançados
(function () {
  "use strict";

  let filtrosAtivos = {};

  /**
   * Cria componente de filtros para clientes
   */
  function criarFiltrosClientes(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="filters-panel" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Filtros</h3>
          <button onclick="window.filtersSystem.limparFiltros('clientes')" class="btn btn-sm btn-secondary">Limpar</button>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div class="form-group">
            <label class="form-label">Status WhatsApp</label>
            <select id="filtroStatusWhatsapp" class="form-select" onchange="window.filtersSystem.aplicarFiltro('clientes', 'status_whatsapp', this.value)">
              <option value="">Todos</option>
              <option value="valid">Válido</option>
              <option value="invalid">Inválido</option>
              <option value="unknown">Desconhecido</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Total de Envios</label>
            <select id="filtroTotalEnvios" class="form-select" onchange="window.filtersSystem.aplicarFiltro('clientes', 'total_envios', this.value)">
              <option value="">Todos</option>
              <option value="0">Nunca enviado</option>
              <option value="1-5">1 a 5 envios</option>
              <option value="6-10">6 a 10 envios</option>
              <option value="11+">Mais de 10 envios</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Último Envio</label>
            <select id="filtroUltimoEnvio" class="form-select" onchange="window.filtersSystem.aplicarFiltro('clientes', 'ultimo_envio', this.value)">
              <option value="">Todos</option>
              <option value="hoje">Hoje</option>
              <option value="semana">Esta semana</option>
              <option value="mes">Este mês</option>
              <option value="nunca">Nunca</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Buscar</label>
            <input type="text" id="filtroBuscaClientes" class="form-input" placeholder="Nome, telefone ou email..." 
                   onkeyup="window.filtersSystem.aplicarFiltro('clientes', 'busca', this.value)" />
          </div>
        </div>
        <div id="filtrosAtivosClientes" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
    `;

    window.filtersSystem.onFilterChange = onFilterChange;
  }

  /**
   * Cria componente de filtros para campanhas
   */
  function criarFiltrosCampanhas(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="filters-panel" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Filtros</h3>
          <button onclick="window.filtersSystem.limparFiltros('campanhas')" class="btn btn-sm btn-secondary">Limpar</button>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="filtroStatusCampanha" class="form-select" onchange="window.filtersSystem.aplicarFiltro('campanhas', 'status', this.value)">
              <option value="">Todos</option>
              <option value="ativa">Ativa</option>
              <option value="pausada">Pausada</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Período</label>
            <select id="filtroPeriodo" class="form-select" onchange="window.filtersSystem.aplicarFiltro('campanhas', 'periodo', this.value)">
              <option value="">Todos</option>
              <option value="natal">Natal</option>
              <option value="black-friday">Black Friday</option>
              <option value="relacionamento">Relacionamento</option>
              <option value="promocional">Promocional</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Início</label>
            <input type="date" id="filtroDataInicio" class="form-input" 
                   onchange="window.filtersSystem.aplicarFiltro('campanhas', 'data_inicio', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Data Fim</label>
            <input type="date" id="filtroDataFim" class="form-input" 
                   onchange="window.filtersSystem.aplicarFiltro('campanhas', 'data_fim', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Buscar</label>
            <input type="text" id="filtroBuscaCampanhas" class="form-input" placeholder="Nome da campanha..." 
                   onkeyup="window.filtersSystem.aplicarFiltro('campanhas', 'busca', this.value)" />
          </div>
        </div>
        <div id="filtrosAtivosCampanhas" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
    `;

    window.filtersSystem.onFilterChange = onFilterChange;
  }

  /**
   * Cria componente de filtros para histórico
   */
  function criarFiltrosHistorico(containerId, onFilterChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="filters-panel" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Filtros</h3>
          <button onclick="window.filtersSystem.limparFiltros('historico')" class="btn btn-sm btn-secondary">Limpar</button>
        </div>
        <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select id="filtroStatusHistorico" class="form-select" onchange="window.filtersSystem.aplicarFiltro('historico', 'status', this.value)">
              <option value="">Todos</option>
              <option value="enviado">Enviado</option>
              <option value="erro">Erro</option>
              <option value="bloqueado">Bloqueado</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Data Início</label>
            <input type="date" id="filtroDataInicioHistorico" class="form-input" 
                   onchange="window.filtersSystem.aplicarFiltro('historico', 'data_inicio', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Data Fim</label>
            <input type="date" id="filtroDataFimHistorico" class="form-input" 
                   onchange="window.filtersSystem.aplicarFiltro('historico', 'data_fim', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Campanha</label>
            <input type="text" id="filtroCampanhaHistorico" class="form-input" placeholder="Nome da campanha..." 
                   onkeyup="window.filtersSystem.aplicarFiltro('historico', 'campanha', this.value)" />
          </div>
          <div class="form-group">
            <label class="form-label">Cliente</label>
            <input type="text" id="filtroClienteHistorico" class="form-input" placeholder="Nome ou telefone..." 
                   onkeyup="window.filtersSystem.aplicarFiltro('historico', 'cliente', this.value)" />
          </div>
        </div>
        <div id="filtrosAtivosHistorico" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;"></div>
      </div>
    `;

    window.filtersSystem.onFilterChange = onFilterChange;
  }

  /**
   * Aplica um filtro
   */
  function aplicarFiltro(tipo, campo, valor) {
    if (!filtrosAtivos[tipo]) {
      filtrosAtivos[tipo] = {};
    }

    if (valor === "" || !valor) {
      delete filtrosAtivos[tipo][campo];
    } else {
      filtrosAtivos[tipo][campo] = valor;
    }

    atualizarFiltrosAtivos(tipo);
    
    if (window.filtersSystem.onFilterChange) {
      window.filtersSystem.onFilterChange(tipo, filtrosAtivos[tipo]);
    }
  }

  /**
   * Limpa todos os filtros de um tipo
   */
  function limparFiltros(tipo) {
    filtrosAtivos[tipo] = {};
    
    // Limpar campos do formulário
    const container = document.getElementById(`filtrosAtivos${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (container) {
      const inputs = container.parentElement.querySelectorAll("input, select");
      inputs.forEach(input => {
        if (input.type === "text" || input.tagName === "SELECT") {
          input.value = "";
        }
      });
    }

    atualizarFiltrosAtivos(tipo);
    
    if (window.filtersSystem.onFilterChange) {
      window.filtersSystem.onFilterChange(tipo, {});
    }
  }

  /**
   * Atualiza a visualização dos filtros ativos
   */
  function atualizarFiltrosAtivos(tipo) {
    const container = document.getElementById(`filtrosAtivos${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`);
    if (!container) return;

    const filtros = filtrosAtivos[tipo] || {};
    const filtrosArray = Object.entries(filtros);

    if (filtrosArray.length === 0) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = filtrosArray.map(([campo, valor]) => {
      const labels = {
        status_whatsapp: "Status WhatsApp",
        total_envios: "Total Envios",
        ultimo_envio: "Último Envio",
        busca: "Busca",
        status: "Status",
        periodo: "Período",
        data_inicio: "Data Início",
        data_fim: "Data Fim",
        campanha: "Campanha",
        cliente: "Cliente"
      };

      return `
        <span class="badge badge-info" style="display: inline-flex; align-items: center; gap: 6px;">
          ${labels[campo] || campo}: ${valor}
          <button onclick="window.filtersSystem.removerFiltro('${tipo}', '${campo}')" 
                  style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 4px; font-size: 14px;">&times;</button>
        </span>
      `;
    }).join("");
  }

  /**
   * Remove um filtro específico
   */
  function removerFiltro(tipo, campo) {
    if (filtrosAtivos[tipo]) {
      delete filtrosAtivos[tipo][campo];
      
      // Limpar campo do formulário
      const input = document.getElementById(`filtro${campo.charAt(0).toUpperCase() + campo.slice(1)}${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`) ||
                    document.getElementById(`filtro${campo.charAt(0).toUpperCase() + campo.slice(1)}`);
      if (input) {
        input.value = "";
      }

      atualizarFiltrosAtivos(tipo);
      
      if (window.filtersSystem.onFilterChange) {
        window.filtersSystem.onFilterChange(tipo, filtrosAtivos[tipo]);
      }
    }
  }

  /**
   * Obtém filtros ativos de um tipo
   */
  function obterFiltros(tipo) {
    return filtrosAtivos[tipo] || {};
  }

  // Expor API pública
  window.filtersSystem = {
    criarFiltrosClientes,
    criarFiltrosCampanhas,
    criarFiltrosHistorico,
    aplicarFiltro,
    limparFiltros,
    removerFiltro,
    obterFiltros,
    onFilterChange: null
  };
})();

