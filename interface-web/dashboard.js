// Dashboard com Métricas e Gráficos
(function () {
  "use strict";

  // Verificar se Chart.js está disponível
  if (typeof Chart === "undefined") {
    console.warn("Chart.js não está carregado. Adicione o script no HTML.");
    return;
  }

  let charts = {};

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
   * Carrega métricas do dashboard
   */
  async function carregarMetricas() {
    const supabase = obterSupabaseClient();
    
    if (!supabase) {
      console.warn("Supabase não está disponível. Aguardando conexão...");
      // Tentar novamente após um delay
      setTimeout(() => {
        if (obterSupabaseClient()) {
          carregarMetricas();
        }
      }, 2000);
      return;
    }

    try {

      // Total de Clientes
      const { count: totalClientes } = await supabase
        .from("instacar_clientes_envios")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      // Total de Mensagens Enviadas
      const { count: totalMensagens } = await supabase
        .from("instacar_historico_envios")
        .select("*", { count: "exact", head: true })
        .eq("status_envio", "enviado");

      // Mensagens de hoje
      const hoje = new Date().toISOString().split("T")[0];
      const { count: mensagensHoje } = await supabase
        .from("instacar_historico_envios")
        .select("*", { count: "exact", head: true })
        .eq("status_envio", "enviado")
        .gte("timestamp_envio", `${hoje}T00:00:00`);

      // Campanhas Ativas
      const { count: campanhasAtivas } = await supabase
        .from("instacar_campanhas")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativa");

      // Taxa de Entrega (últimos 7 dias)
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      const { data: enviosRecentes } = await supabase
        .from("instacar_historico_envios")
        .select("status_envio")
        .gte("timestamp_envio", seteDiasAtras.toISOString());

      const totalEnviados = enviosRecentes?.filter(e => e.status_envio === "enviado").length || 0;
      const totalRecentes = enviosRecentes?.length || 1;
      const taxaEntrega = totalRecentes > 0 ? ((totalEnviados / totalRecentes) * 100).toFixed(1) : 0;

      // Buscar instâncias conectadas
      const { data: instancias } = await supabase
        .from("instacar_whatsapp_apis")
        .select("status_conexao");
      
      const totalInstancias = instancias?.length || 0;
      const instanciasConectadas = instancias?.filter(i => i.status_conexao === "connected").length || 0;
      const textoInstancias = totalInstancias > 0 
        ? `${instanciasConectadas}/${totalInstancias} instâncias conectadas`
        : "Nenhuma instância";

      // Atualizar cards de métricas (seguindo padrão StatsCard.tsx)
      atualizarCardMetrica("totalClientes", totalClientes || 0, "Base de contatos", null, "neutral");
      atualizarCardMetrica("mensagensEnviadas", totalMensagens || 0, "Total histórico", null, "neutral");
      atualizarCardMetrica("taxaEntrega", `${taxaEntrega}%`, "Mensagens com sucesso", "hsl(var(--success))", "positive");
      atualizarCardMetrica("campanhasAtivas", campanhasAtivas || 0, textoInstancias, null, "neutral");

    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    }
  }

  /**
   * Atualiza um card de métrica
   */
  function atualizarCardMetrica(id, valor, descricao, corValor = null, changeType = "neutral") {
    const card = document.getElementById(id);
    if (!card) return;

    const valorEl = card.querySelector(".metric-value");
    const descEl = card.querySelector(".metric-description");

    if (valorEl) {
      valorEl.textContent = typeof valor === "number" ? valor.toLocaleString() : valor;
      if (corValor) {
        valorEl.style.color = corValor;
      } else {
        // Resetar cor para foreground se não especificada
        valorEl.style.color = "hsl(var(--foreground))";
      }
    }
    if (descEl) {
      descEl.textContent = descricao;
      // Aplicar cor baseada no changeType (seguindo padrão StatsCard.tsx)
      if (changeType === "positive") {
        descEl.style.color = "hsl(var(--success))";
      } else if (changeType === "negative") {
        descEl.style.color = "hsl(var(--destructive))";
      } else {
        descEl.style.color = "hsl(var(--muted-foreground))";
      }
    }
  }

  /**
   * Carrega gráficos do dashboard
   */
  async function carregarGraficos() {
    const supabase = obterSupabaseClient();
    if (!supabase) return;

    try {

      // Dados dos últimos 7 dias
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const { data: envios } = await supabase
        .from("instacar_historico_envios")
        .select("timestamp_envio, status_envio")
        .gte("timestamp_envio", seteDiasAtras.toISOString())
        .order("timestamp_envio", { ascending: true });

      if (!envios) return;

      // Agrupar por dia
      const enviosPorDia = {};
      envios.forEach(envio => {
        const data = new Date(envio.timestamp_envio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (!enviosPorDia[data]) {
          enviosPorDia[data] = { enviados: 0, erros: 0, bloqueados: 0 };
        }
        if (envio.status_envio === "enviado") {
          enviosPorDia[data].enviados++;
        } else if (envio.status_envio === "erro") {
          enviosPorDia[data].erros++;
        } else if (envio.status_envio === "bloqueado") {
          enviosPorDia[data].bloqueados++;
        }
      });

      const labels = Object.keys(enviosPorDia).sort();
      const enviadosData = labels.map(label => enviosPorDia[label].enviados);
      const errosData = labels.map(label => enviosPorDia[label].erros);

      // Gráfico de linha - Envios por dia
      const ctxLinha = document.getElementById("chartEnviosPorDia");
      if (ctxLinha) {
        if (charts.enviosPorDia) {
          charts.enviosPorDia.destroy();
        }
        charts.enviosPorDia = new Chart(ctxLinha, {
          type: "line",
          data: {
            labels: labels,
            datasets: [
              {
                label: "Enviados",
                data: enviadosData,
                borderColor: "#10b981",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                tension: 0.4
              },
              {
                label: "Erros",
                data: errosData,
                borderColor: "#ef4444",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top"
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }
        });
      }

      // Gráfico de pizza - Status de mensagens
      const { data: statusData } = await supabase
        .from("instacar_historico_envios")
        .select("status_envio")
        .gte("timestamp_envio", seteDiasAtras.toISOString());

      if (statusData) {
        const statusCount = {
          enviado: 0,
          erro: 0,
          bloqueado: 0,
          pendente: 0
        };

        statusData.forEach(item => {
          statusCount[item.status_envio] = (statusCount[item.status_envio] || 0) + 1;
        });

        const ctxPizza = document.getElementById("chartStatusMensagens");
        if (ctxPizza) {
          if (charts.statusMensagens) {
            charts.statusMensagens.destroy();
          }
          charts.statusMensagens = new Chart(ctxPizza, {
            type: "doughnut",
            data: {
              labels: ["Enviados", "Erros", "Bloqueados", "Pendentes"],
              datasets: [
                {
                  data: [
                    statusCount.enviado,
                    statusCount.erro,
                    statusCount.bloqueado,
                    statusCount.pendente
                  ],
                  backgroundColor: [
                    "#10b981",
                    "#ef4444",
                    "#f59e0b",
                    "#64748b"
                  ]
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom"
                }
              }
            }
          });
        }
      }

    } catch (error) {
      console.error("Erro ao carregar gráficos:", error);
    }
  }

  /**
   * Carrega atividade recente
   */
  async function carregarAtividadeRecente() {
    const supabase = obterSupabaseClient();
    if (!supabase) return;

    try {
      const { data: atividades } = await supabase
        .from("instacar_historico_envios")
        .select("*, instacar_clientes_envios(nome_cliente)")
        .order("timestamp_envio", { ascending: false })
        .limit(5);

      const container = document.getElementById("atividadeRecente");
      if (!container) return;

      if (!atividades || atividades.length === 0) {
        container.innerHTML = '<p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 0;">Nenhuma atividade recente.</p>';
        return;
      }

      // Função para calcular tempo relativo
      const calcularTempoRelativo = (data) => {
        const agora = new Date();
        const timestamp = new Date(data);
        const diffMs = agora - timestamp;
        const diffSegundos = Math.floor(diffMs / 1000);
        const diffMinutos = Math.floor(diffSegundos / 60);
        const diffHoras = Math.floor(diffMinutos / 60);
        const diffDias = Math.floor(diffHoras / 24);
        const diffMeses = Math.floor(diffDias / 30);
        const diffAnos = Math.floor(diffDias / 365);
        
        if (diffAnos > 0) return `há cerca de ${diffAnos} ano${diffAnos > 1 ? 's' : ''}`;
        if (diffMeses > 0) return `há cerca de ${diffMeses} mês${diffMeses > 1 ? 'es' : ''}`;
        if (diffDias > 0) return `há cerca de ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
        if (diffHoras > 0) return `há cerca de ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
        if (diffMinutos > 0) return `há cerca de ${diffMinutos} minuto${diffMinutos > 1 ? 's' : ''}`;
        return "agora";
      };
      

      // Mapeamento de ícones SVG (seguindo padrão RecentActivity.tsx com ícones diferentes)
      const iconMap = {
        enviado: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>`,
        entregue: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        erro: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
        pendente: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>`
      };
      
      const colorMap = {
        enviado: { color: "hsl(var(--success))", background: "hsl(var(--success) / 0.1)" },
        entregue: { color: "hsl(var(--success))", background: "hsl(var(--success) / 0.1)" },
        erro: { color: "hsl(var(--destructive))", background: "hsl(var(--destructive) / 0.1)" },
        pendente: { color: "hsl(var(--warning))", background: "hsl(var(--warning) / 0.1)" }
      };

      container.innerHTML = atividades.map(ativ => {
        const status = ativ.status_envio || "pendente";
        const icon = iconMap[status] || iconMap.pendente;
        const styles = colorMap[status] || colorMap.pendente;

        const tempoRelativo = calcularTempoRelativo(ativ.timestamp_envio);
        const nome = ativ.instacar_clientes_envios?.nome_cliente || "Cliente";
        const telefone = ativ.telefone || ativ.instacar_clientes_envios?.telefone || "";
        
        // Formatar descrição conforme status (seguindo padrão RecentActivity.tsx)
        let descricao = "";
        if (status === "enviado" || status === "entregue") {
          descricao = `Mensagem enviada para ${nome}`;
        } else if (status === "erro") {
          descricao = `Falha no envio para ${nome}`;
        } else {
          descricao = `Envio pendente para ${nome}`;
        }

        return `
          <div class="animate-fade-in" style="display: flex; align-items: start; gap: 0.75rem; margin-bottom: 1rem;">
            <div style="padding: 0.5rem; border-radius: 0.5rem; color: ${styles.color}; background: ${styles.background}; display: flex; align-items: center; justify-content: center;">
              ${icon}
            </div>
            <div style="flex: 1; min-width: 0;">
              <p style="font-size: 0.875rem; color: hsl(var(--foreground)); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${descricao}</p>
              <p style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); margin: 0; margin-top: 0.25rem;">${telefone}</p>
            </div>
            <span style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); white-space: nowrap;">${tempoRelativo}</span>
          </div>
        `;
      }).join("");
    } catch (error) {
      console.error("Erro ao carregar atividade recente:", error);
    }
  }

  /**
   * Inicializa o dashboard
   */
  function inicializarDashboard() {
    // Aguardar Supabase estar disponível antes de carregar dados
    const tentarInicializar = () => {
      const supabase = obterSupabaseClient();
      if (supabase) {
        carregarMetricas();
        carregarGraficos();
        carregarAtividadeRecente();
        setInterval(carregarMetricas, 60000); // Atualizar a cada minuto
        setInterval(carregarAtividadeRecente, 30000); // Atualizar atividade a cada 30s
      } else {
        // Tentar novamente após 1 segundo
        setTimeout(tentarInicializar, 1000);
      }
    };
    tentarInicializar();
  }

  // Expor funções globalmente
  window.carregarMetricas = carregarMetricas;
  window.carregarGraficos = carregarGraficos;
  window.carregarAtividadeRecente = carregarAtividadeRecente;
  window.inicializarDashboard = inicializarDashboard;
  
  // NÃO sobrescrever loadPageDashboard - ela é definida em app.js
  // Apenas expor inicializarDashboard para ser chamada após o conteúdo ser renderizado

  // Auto-inicializar quando Chart.js estiver disponível
  if (typeof Chart !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", inicializarDashboard);
    } else {
      inicializarDashboard();
    }
  } else {
    // Aguardar Chart.js
    window.addEventListener("load", () => {
      if (typeof Chart !== "undefined") {
        inicializarDashboard();
      }
    });
  }
})();

