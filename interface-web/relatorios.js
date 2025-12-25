// Sistema de Relatórios e Exportação
(function () {
  "use strict";

  /**
   * Exporta dados para CSV
   */
  function exportarCSV(dados, nomeArquivo = "relatorio") {
    if (!dados || dados.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    // Obter cabeçalhos
    const headers = Object.keys(dados[0]);
    
    // Criar CSV
    let csv = headers.join(",") + "\n";
    
    dados.forEach(item => {
      const row = headers.map(header => {
        const value = item[header];
        // Escapar valores que contêm vírgulas ou aspas
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || "";
      });
      csv += row.join(",") + "\n";
    });

    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${nomeArquivo}_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exporta dados para Excel (XLSX)
   */
  async function exportarExcel(dados, nomeArquivo = "relatorio") {
    if (typeof XLSX === "undefined") {
      alert("Biblioteca XLSX não está carregada. Use CSV como alternativa.");
      return;
    }

    if (!dados || dados.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dados);
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");

      // Download
      XLSX.writeFile(wb, `${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      alert("Erro ao exportar para Excel. Tente CSV como alternativa.");
    }
  }

  /**
   * Exporta dados para PDF
   */
  async function exportarPDF(dados, titulo = "Relatório", nomeArquivo = "relatorio") {
    // Verificar se jsPDF está disponível
    if (typeof window.jspdf === "undefined" && typeof window.jsPDF === "undefined") {
      // Tentar carregar dinamicamente
      await carregarJsPDF();
    }

    const jsPDF = window.jsPDF || window.jspdf?.jsPDF;
    if (!jsPDF) {
      alert("Biblioteca jsPDF não está disponível. Adicione o script no HTML.");
      return;
    }

    if (!dados || dados.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(16);
      doc.text(titulo, 14, 20);
      
      // Data
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 30);

      // Tabela
      const headers = Object.keys(dados[0]);
      const rows = dados.map(item => headers.map(h => item[h] || ""));

      // Configuração da tabela
      doc.autoTable({
        head: [headers],
        body: rows,
        startY: 40,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Download
      doc.save(`${nomeArquivo}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert("Erro ao exportar para PDF.");
    }
  }

  /**
   * Carrega jsPDF dinamicamente
   */
  function carregarJsPDF() {
    return new Promise((resolve, reject) => {
      if (window.jsPDF || window.jspdf) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar jsPDF"));
      document.head.appendChild(script);
    });
  }

  /**
   * Obtém o cliente Supabase (singleton - apenas uma instância)
   */
  function obterSupabaseClient() {
    // Sempre usar a instância global criada em app.js
    // NÃO criar nova instância aqui para evitar múltiplas instâncias do GoTrueClient
    if (window.supabaseClient) {
      return window.supabaseClient;
    }
    
    // Se não estiver disponível, retornar null e aguardar
    // A função que chama deve implementar retry logic
    return null;
  }

  /**
   * Gera relatório de campanhas
   */
  async function gerarRelatorioCampanhas(dataInicio, dataFim) {
    const supabase = obterSupabaseClient();
    if (!supabase) {
      alert("Supabase não está conectado");
      return;
    }

    try {
      let query = supabase
        .from("instacar_campanhas")
        .select("*");

      if (dataInicio) {
        query = query.gte("data_inicio", dataInicio);
      }
      if (dataFim) {
        query = query.lte("data_fim", dataFim);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Erro ao gerar relatório de campanhas:", error);
      alert("Erro ao gerar relatório de campanhas");
      return [];
    }
  }

  /**
   * Gera relatório de envios
   */
  async function gerarRelatorioEnvios(dataInicio, dataFim, status = null) {
    const supabase = obterSupabaseClient();
    if (!supabase) {
      alert("Supabase não está conectado");
      return;
    }

    try {
      let query = supabase
        .from("instacar_historico_envios")
        .select("*, instacar_clientes_envios(nome_cliente, telefone), instacar_campanhas(nome)");

      if (dataInicio) {
        query = query.gte("timestamp_envio", `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte("timestamp_envio", `${dataFim}T23:59:59`);
      }
      if (status) {
        query = query.eq("status_envio", status);
      }

      const { data, error } = await query.order("timestamp_envio", { ascending: false });

      if (error) throw error;

      // Formatar dados
      return (data || []).map(item => ({
        Data: new Date(item.timestamp_envio).toLocaleString("pt-BR"),
        Cliente: item.instacar_clientes_envios?.nome_cliente || "N/A",
        Telefone: item.instacar_clientes_envios?.telefone || "N/A",
        Campanha: item.instacar_campanhas?.nome || "N/A",
        Status: item.status_envio,
        Mensagem: item.mensagem_texto?.substring(0, 100) + "..." || "N/A"
      }));
    } catch (error) {
      console.error("Erro ao gerar relatório de envios:", error);
      alert("Erro ao gerar relatório de envios");
      return [];
    }
  }

  /**
   * Gera relatório de clientes
   */
  async function gerarRelatorioClientes() {
    const supabase = obterSupabaseClient();
    if (!supabase) {
      alert("Supabase não está conectado");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("instacar_clientes_envios")
        .select("*")
        .eq("ativo", true)
        .order("nome_cliente", { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        Nome: item.nome_cliente || "N/A",
        Telefone: item.telefone || "N/A",
        Email: item.email || "N/A",
        "Total Envios": item.total_envios || 0,
        "Status WhatsApp": item.status_whatsapp || "N/A",
        "Último Envio": item.ultimo_envio ? new Date(item.ultimo_envio).toLocaleDateString("pt-BR") : "Nunca"
      }));
    } catch (error) {
      console.error("Erro ao gerar relatório de clientes:", error);
      alert("Erro ao gerar relatório de clientes");
      return [];
    }
  }

  /**
   * Gera relatório de erros
   */
  async function gerarRelatorioErros(dataInicio, dataFim) {
    const supabase = obterSupabaseClient();
    if (!supabase) {
      alert("Supabase não está conectado");
      return;
    }

    try {
      let query = supabase
        .from("instacar_erros_criticos")
        .select("*");

      if (dataInicio) {
        query = query.gte("created_at", `${dataInicio}T00:00:00`);
      }
      if (dataFim) {
        query = query.lte("created_at", `${dataFim}T23:59:59`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(item => ({
        Data: new Date(item.created_at).toLocaleString("pt-BR"),
        Tipo: item.tipo_erro || "N/A",
        Mensagem: item.mensagem_erro || "N/A",
        Telefone: item.telefone || "N/A",
        Status: item.status || "N/A"
      }));
    } catch (error) {
      console.error("Erro ao gerar relatório de erros:", error);
      alert("Erro ao gerar relatório de erros");
      return [];
    }
  }

  /**
   * Abre o modal de relatórios
   */
  function abrirModalRelatorios() {
    const modal = document.getElementById("modalRelatorios");
    if (!modal) {
      criarModalRelatorios();
    } else {
      modal.classList.add("active");
    }
  }

  /**
   * Cria o modal de relatórios
   */
  function criarModalRelatorios() {
    const modal = document.createElement("div");
    modal.id = "modalRelatorios";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2 class="modal-title">Gerar Relatório</h2>
          <button class="modal-close" onclick="window.relatoriosSystem.fecharModalRelatorios()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Tipo de Relatório</label>
            <select id="tipoRelatorio" class="form-select" onchange="window.relatoriosSystem.trocarTipoRelatorio()">
              <option value="campanhas">Campanhas</option>
              <option value="envios">Envios</option>
              <option value="clientes">Clientes</option>
              <option value="erros">Erros</option>
            </select>
          </div>
          
          <div id="filtrosRelatorio">
            <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div class="form-group">
                <label class="form-label">Data Início</label>
                <input type="date" id="dataInicio" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Data Fim</label>
                <input type="date" id="dataFim" class="form-input" />
              </div>
            </div>
            
            <div id="filtrosAdicionais"></div>
          </div>
          
          <div class="form-group" style="margin-top: 20px;">
            <label class="form-label">Formato de Exportação</label>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button onclick="window.relatoriosSystem.exportarRelatorio('csv')" class="btn btn-primary">CSV</button>
              <button onclick="window.relatoriosSystem.exportarRelatorio('excel')" class="btn btn-primary">Excel</button>
              <button onclick="window.relatoriosSystem.exportarRelatorio('pdf')" class="btn btn-primary">PDF</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  /**
   * Fecha o modal de relatórios
   */
  function fecharModalRelatorios() {
    const modal = document.getElementById("modalRelatorios");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Troca o tipo de relatório
   */
  function trocarTipoRelatorio() {
    const tipo = document.getElementById("tipoRelatorio")?.value;
    const filtrosAdicionais = document.getElementById("filtrosAdicionais");
    if (!filtrosAdicionais) return;

    if (tipo === "envios") {
      filtrosAdicionais.innerHTML = `
        <div class="form-group">
          <label class="form-label">Status</label>
          <select id="statusFiltro" class="form-select">
            <option value="">Todos</option>
            <option value="enviado">Enviado</option>
            <option value="erro">Erro</option>
            <option value="bloqueado">Bloqueado</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      `;
    } else {
      filtrosAdicionais.innerHTML = "";
    }
  }

  /**
   * Exporta o relatório
   */
  async function exportarRelatorio(formato) {
    const tipo = document.getElementById("tipoRelatorio")?.value;
    const dataInicio = document.getElementById("dataInicio")?.value;
    const dataFim = document.getElementById("dataFim")?.value;
    const status = document.getElementById("statusFiltro")?.value;

    let dados = [];
    let nomeArquivo = "relatorio";
    let titulo = "Relatório";

    // Gerar dados
    switch (tipo) {
      case "campanhas":
        dados = await gerarRelatorioCampanhas(dataInicio, dataFim);
        nomeArquivo = "relatorio_campanhas";
        titulo = "Relatório de Campanhas";
        break;
      case "envios":
        dados = await gerarRelatorioEnvios(dataInicio, dataFim, status || null);
        nomeArquivo = "relatorio_envios";
        titulo = "Relatório de Envios";
        break;
      case "clientes":
        dados = await gerarRelatorioClientes();
        nomeArquivo = "relatorio_clientes";
        titulo = "Relatório de Clientes";
        break;
      case "erros":
        dados = await gerarRelatorioErros(dataInicio, dataFim);
        nomeArquivo = "relatorio_erros";
        titulo = "Relatório de Erros";
        break;
    }

    if (dados.length === 0) {
      alert("Nenhum dado encontrado para o período selecionado");
      return;
    }

    // Exportar
    switch (formato) {
      case "csv":
        exportarCSV(dados, nomeArquivo);
        break;
      case "excel":
        await exportarExcel(dados, nomeArquivo);
        break;
      case "pdf":
        await exportarPDF(dados, titulo, nomeArquivo);
        break;
    }

    // Mostrar notificação
    if (window.notificationSystem) {
      window.notificationSystem.showToast(`Relatório exportado com sucesso!`, "success");
    }
  }

  // Expor API pública
  window.relatoriosSystem = {
    exportarCSV,
    exportarExcel,
    exportarPDF,
    gerarRelatorioCampanhas,
    gerarRelatorioEnvios,
    gerarRelatorioClientes,
    gerarRelatorioErros,
    abrirModalRelatorios,
    fecharModalRelatorios,
    trocarTipoRelatorio,
    exportarRelatorio
  };

  // Expor função global
  window.abrirModalRelatorios = abrirModalRelatorios;
})();

