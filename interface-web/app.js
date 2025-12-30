// IIFE para isolar escopo e evitar conflitos
(function () {
  "use strict";

  // Verificar se já foi carregado - usar nome único para evitar conflitos
  if (window.instacarCampanhasAppLoaded) {
    // Log de aviso sempre visível (problema de carregamento duplo)
    console.warn("app.js já foi carregado. Ignorando segunda carga.");
    return;
  }
  window.instacarCampanhasAppLoaded = true;

  // Variável para cliente Supabase (escopo local da IIFE)
  let supabaseClient = null;
  let supabaseConfig = null; // Armazenar configuração atual para evitar recriação

  // ============================================================================
  // Sistema de Logging Condicional
  // ============================================================================
  // Em produção: apenas erros são logados
  // Para habilitar logs detalhados, defina no console do navegador:
  //   window.DEBUG = true
  //   window.DEBUG_MERGE = true (logs de merge de veículos)
  //   window.DEBUG_MAP = true (logs de mapeamento de colunas)
  //   window.DEBUG_HISTORICO = true (logs de busca de histórico)
  // ============================================================================

  const isDebugMode = () => {
    return (
      window.DEBUG === true ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  };

  const logger = {
    error: (...args) => console.error(...args),
    warn: (...args) => {
      if (isDebugMode()) console.warn(...args);
    },
    log: (...args) => {
      if (isDebugMode()) console.log(...args);
    },
    debug: (flag, ...args) => {
      if (isDebugMode() && (window[flag] === true || window.DEBUG === true)) {
        console.log(...args);
      }
    },
  };

  // ============================================================================
  // Função auxiliar: Formatar timestamp do Supabase para timezone de São Paulo
  // ============================================================================
  // O Supabase armazena timestamps em UTC. Esta função garante que o valor
  // seja interpretado como UTC antes de converter para "America/Sao_Paulo"
  // ============================================================================
  function formatarTimestampSP(timestamp) {
    if (!timestamp) return "N/A";
    
    try {
      let timestampStr = String(timestamp).trim();
      
      // Se o timestamp já tem timezone explícito (Z ou +/-), usar diretamente
      const temTimezone = timestampStr.includes('Z') || timestampStr.match(/[+-]\d{2}:\d{2}$/);
      
      let date;
      
      if (!temTimezone) {
        // Se não tem timezone, o Supabase armazena em UTC
        // Precisamos forçar interpretação como UTC
        // Normalizar formato: substituir espaço por T se necessário
        timestampStr = timestampStr.replace(' ', 'T');
        
        // Extrair componentes da data/hora
        const match = timestampStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{3})?$/);
        
        if (match) {
          // Usar Date.UTC para criar data em UTC explicitamente
          const [, year, month, day, hour, minute, second, millis] = match;
          const ms = millis ? parseFloat(millis) * 1000 : 0;
          date = new Date(Date.UTC(
            parseInt(year, 10),
            parseInt(month, 10) - 1, // Mês é 0-indexed
            parseInt(day, 10),
            parseInt(hour, 10),
            parseInt(minute, 10),
            parseInt(second, 10),
            ms
          ));
        } else {
          // Fallback: adicionar Z e tentar parse normal
          timestampStr = timestampStr + 'Z';
          date = new Date(timestampStr);
        }
      } else {
        // Já tem timezone, usar diretamente
        date = new Date(timestampStr);
      }
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.warn("Timestamp inválido:", timestamp, "->", timestampStr);
        return "N/A";
      }
      
      // Formatar para timezone de São Paulo
      return date.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch (error) {
      console.error("Erro ao formatar timestamp:", error, timestamp);
      return "N/A";
    }
  }

  // Conectar ao Supabase
  function conectarSupabase() {
    let url = "";
    let key = "";

    // Prioridade: Variáveis de ambiente (Cloudflare Pages ou .env em dev)
    // Cloudflare Pages injeta variáveis como window.ENV
    // Em dev, um script de build pode injetar de .env
    if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
      url = window.ENV.SUPABASE_URL;
      key = window.ENV.SUPABASE_ANON_KEY;
    } else if (typeof process !== "undefined" && process.env) {
      // Fallback para Node.js/Webpack (dev com build tool)
      url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
      key =
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        "";
    }

    // Se não encontrou em variáveis de ambiente, mostrar erro
    if (!url || !key) {
      const statusSupabaseIcon = document.getElementById("statusSupabaseIcon");
      const statusSupabaseText = document.getElementById("statusSupabaseText");
      const statusSupabaseDiv = document.getElementById("statusSupabase");

      if (statusSupabaseIcon) statusSupabaseIcon.textContent = "❌";
      if (statusSupabaseText)
        statusSupabaseText.textContent =
          "Variáveis de ambiente não configuradas";
      if (statusSupabaseDiv) {
        statusSupabaseDiv.style.borderColor = "#dc3545";
        statusSupabaseDiv.style.background = "#fff5f5";
      }

      mostrarAlerta(
        "Variáveis de ambiente do Supabase não encontradas. Configure SUPABASE_URL e SUPABASE_ANON_KEY no Cloudflare Pages ou arquivo .env.",
        "error"
      );
      return;
    }

    // Validar URL
    if (!validarURL(url)) {
      mostrarAlerta(
        "URL do Supabase inválida. Deve começar com https://",
        "error"
      );
      return;
    }

    // Verificar se já existe uma conexão com as mesmas credenciais
    if (supabaseClient && supabaseConfig) {
      if (supabaseConfig.url === url && supabaseConfig.key === key) {
        // Já está conectado com as mesmas credenciais, apenas recarregar dados e atualizar status
        atualizarStatusConexoes().catch(console.error);
        // Recarregar dados silenciosamente (sem alerta)
        setTimeout(() => {
          if (supabaseClient) {
            carregarCampanhas();
            carregarListaClientes();
            carregarInstanciasParaSelect(); // Carregar instâncias para selects
          }
        }, 100);
        return;
      } else {
        // Credenciais mudaram, limpar instância antiga
        console.log("Credenciais mudaram, recriando conexão...");
        supabaseClient = null;
        supabaseConfig = null;
      }
    }

    try {
      // Verificar se a biblioteca Supabase foi carregada
      // A biblioteca pode expor como window.supabase ou apenas supabase (global)
      let supabaseLib =
        window.supabase || (typeof supabase !== "undefined" ? supabase : null);

      if (!supabaseLib) {
        const errorMsg =
          "Biblioteca Supabase não foi carregada. Verifique se o script do Supabase está incluído no HTML antes do app.js.";
        console.error(errorMsg);
        mostrarAlerta(errorMsg, "error");
        throw new Error(errorMsg);
      }

      if (typeof supabaseLib.createClient !== "function") {
        const errorMsg =
          "Função createClient não encontrada na biblioteca Supabase. Verifique a versão da biblioteca.";
        console.error(errorMsg, supabaseLib);
        mostrarAlerta(errorMsg, "error");
        throw new Error(errorMsg);
      }

      // Verificar se já existe uma instância com as mesmas credenciais
      // Se existir e as credenciais forem as mesmas, reutilizar
      if (supabaseClient && supabaseConfig && supabaseConfig.url === url && supabaseConfig.key === key) {
        // Já existe uma instância válida, apenas garantir que está exposta globalmente
        window.supabaseClient = supabaseClient;
        return;
      }

      // Criar nova instância apenas se necessário (singleton)
      // Limpar instância anterior se existir
      if (supabaseClient) {
        // Não há método de cleanup explícito no Supabase, mas podemos limpar a referência
        supabaseClient = null;
      }

      supabaseClient = supabaseLib.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: 'instacar-supabase-auth', // Chave única para evitar conflitos
        },
      });

      // Expor globalmente para outros scripts (singleton)
      window.supabaseClient = supabaseClient;

      // Armazenar configuração atual
      supabaseConfig = { url, key };

      // Não salvar Supabase no localStorage (vem de variáveis de ambiente)

      // Atualizar status
      atualizarStatusConexoes().catch(console.error);

      // Carregar dados após um pequeno delay para garantir que a conexão está estável
      setTimeout(() => {
        if (supabaseClient) {
          carregarCampanhas();
          carregarListaClientes();
          carregarInstanciasParaSelect(); // Carregar instâncias para selects
        }
      }, 100);
    } catch (error) {
      mostrarAlerta("Erro ao conectar: " + error.message, "error");
      console.error(error);
      supabaseClient = null;
      supabaseConfig = null;
      atualizarStatusConexoes().catch(console.error);
    }
  }

  /**
   * Atualiza os indicadores de status de conexão
   */
  async function atualizarStatusConexoes() {
    // Verificar se os elementos do DOM existem
    const statusSupabaseIcon = document.getElementById("statusSupabaseIcon");
    const statusSupabaseText = document.getElementById("statusSupabaseText");
    const statusSupabaseDiv = document.getElementById("statusSupabase");

    // Se os elementos não existirem ainda, não fazer nada (DOM pode não estar pronto)
    if (!statusSupabaseIcon || !statusSupabaseText || !statusSupabaseDiv) {
      return;
    }

    if (supabaseClient && supabaseConfig) {
      // Mostrar estado de verificação
      if (statusSupabaseIcon) statusSupabaseIcon.textContent = "⏳";
      if (statusSupabaseText) statusSupabaseText.textContent = "Verificando...";
      if (statusSupabaseDiv) {
        statusSupabaseDiv.style.borderColor = "#ffc107";
        statusSupabaseDiv.style.background = "#fffbf0";
      }

      // Testar conexão fazendo uma query simples na tabela de clientes (mais confiável)
      supabaseClient
        .from("instacar_clientes_envios")
        .select("id")
        .limit(1)
        .then(({ data, error }) => {
          if (error) {
            // Erro na conexão
            console.error("Erro ao verificar conexão Supabase:", error);
            if (statusSupabaseIcon) statusSupabaseIcon.textContent = "❌";
            if (statusSupabaseText) {
              // Mostrar mensagem de erro mais específica
              if (
                error.message.includes("permission") ||
                error.message.includes("policy")
              ) {
                statusSupabaseText.textContent = "Erro de permissão (RLS)";
              } else if (
                error.message.includes("relation") ||
                error.message.includes("does not exist")
              ) {
                statusSupabaseText.textContent = "Tabela não encontrada";
              } else {
                statusSupabaseText.textContent = `Erro: ${error.message.substring(
                  0,
                  30
                )}...`;
              }
            }
            if (statusSupabaseDiv) {
              statusSupabaseDiv.style.borderColor = "#dc3545";
              statusSupabaseDiv.style.background = "#fff5f5";
            }
          } else {
            // Conectado com sucesso
            if (statusSupabaseIcon) statusSupabaseIcon.textContent = "✅";
            if (statusSupabaseText)
              statusSupabaseText.textContent = "Conectado";
            if (statusSupabaseDiv) {
              statusSupabaseDiv.style.borderColor = "#28a745";
              statusSupabaseDiv.style.background = "#f0fff4";
            }
          }
        })
        .catch((err) => {
          // Erro ao testar
          console.error("Erro ao verificar conexão:", err);
          if (statusSupabaseIcon) statusSupabaseIcon.textContent = "❌";
          if (statusSupabaseText)
            statusSupabaseText.textContent = "Erro ao verificar";
          if (statusSupabaseDiv) {
            statusSupabaseDiv.style.borderColor = "#dc3545";
            statusSupabaseDiv.style.background = "#fff5f5";
          }
        });
    } else {
      // Não conectado
      if (statusSupabaseIcon) statusSupabaseIcon.textContent = "⚪";
      if (statusSupabaseText) statusSupabaseText.textContent = "Não conectado";
      if (statusSupabaseDiv) {
        statusSupabaseDiv.style.borderColor = "#6c757d";
        statusSupabaseDiv.style.background = "#f8f9fa";
      }
    }

    // Status Uazapi
    const statusUazapiIcon = document.getElementById("statusUazapiIcon");
    const statusUazapiText = document.getElementById("statusUazapiText");
    const statusUazapiDiv = document.getElementById("statusUazapi");

    // Se os elementos não existirem, não fazer nada
    if (!statusUazapiIcon || !statusUazapiText || !statusUazapiDiv) {
      return;
    }

    // Verificar instâncias Uazapi no Supabase
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .select("id")
          .eq("ativo", true)
          .limit(1);

        if (!error && data && data.length > 0) {
          // Contar total de instâncias ativas
          const { count } = await supabaseClient
            .from("instacar_whatsapp_apis")
            .select("*", { count: "exact", head: true })
            .eq("ativo", true);

          const totalAtivas = count || data.length;
          if (statusUazapiIcon) statusUazapiIcon.textContent = "✅";
          if (statusUazapiText)
            statusUazapiText.textContent = `${totalAtivas} instância(s) ativa(s)`;
          if (statusUazapiDiv) {
            statusUazapiDiv.style.borderColor = "#28a745";
            statusUazapiDiv.style.background = "#f0fff4";
          }
        } else {
          // Fallback para localStorage (compatibilidade)
          const config = await carregarConfiguracoesDoLocalStorage();
          if (config && config.uazapiBaseUrl && config.uazapiToken) {
            if (statusUazapiIcon) statusUazapiIcon.textContent = "✅";
            if (statusUazapiText)
              statusUazapiText.textContent = "Configurado (legado)";
            if (statusUazapiDiv) {
              statusUazapiDiv.style.borderColor = "#28a745";
              statusUazapiDiv.style.background = "#f0fff4";
            }
          } else {
            if (statusUazapiIcon) statusUazapiIcon.textContent = "⚪";
            if (statusUazapiText)
              statusUazapiText.textContent = "Não configurado";
            if (statusUazapiDiv) {
              statusUazapiDiv.style.borderColor = "#6c757d";
              statusUazapiDiv.style.background = "#f8f9fa";
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar instâncias Uazapi:", error);
        if (statusUazapiIcon) statusUazapiIcon.textContent = "❌";
        if (statusUazapiText)
          statusUazapiText.textContent = "Erro ao verificar";
        if (statusUazapiDiv) {
          statusUazapiDiv.style.borderColor = "#dc3545";
          statusUazapiDiv.style.background = "#fff5f5";
        }
      }
    } else {
      // Fallback para localStorage se Supabase não estiver conectado
      const config = await carregarConfiguracoesDoLocalStorage();
      if (config && config.uazapiBaseUrl && config.uazapiToken) {
        if (statusUazapiIcon) statusUazapiIcon.textContent = "✅";
        if (statusUazapiText)
          statusUazapiText.textContent = "Configurado (legado)";
        if (statusUazapiDiv) {
          statusUazapiDiv.style.borderColor = "#28a745";
          statusUazapiDiv.style.background = "#f0fff4";
        }
      } else {
        if (statusUazapiIcon) statusUazapiIcon.textContent = "⚪";
        if (statusUazapiText) statusUazapiText.textContent = "Não configurado";
        if (statusUazapiDiv) {
          statusUazapiDiv.style.borderColor = "#6c757d";
          statusUazapiDiv.style.background = "#f8f9fa";
        }
      }
    }
  }

  // Validar URL
  function validarURL(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Toggle visibilidade de senha
  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
    } else {
      input.type = "password";
    }
  }

  // Abrir modal de configurações
  async function abrirModalConfiguracoes() {
    const modal = document.getElementById("modalConfiguracoes");
    if (!modal) return;

    // Iniciar verificação periódica quando abrir modal de configurações
    iniciarVerificacaoPeriodicaStatus();

    // Tentar carregar do Supabase/localStorage (async)
    const savedConfig = await carregarConfiguracoesDoLocalStorage();

    // Obter referências aos elementos (verificar se existem)
    const n8nWebhookInput = document.getElementById("configN8nWebhook");

    if (savedConfig) {
      if (savedConfig.n8nWebhookUrl && n8nWebhookInput) {
        n8nWebhookInput.value = savedConfig.n8nWebhookUrl;
      }
    } else {
      // Se não houver salvo, tentar usar config.js
      if (window.INSTACAR_CONFIG) {
        if (window.INSTACAR_CONFIG.n8nWebhookUrl && n8nWebhookInput) {
          n8nWebhookInput.value = window.INSTACAR_CONFIG.n8nWebhookUrl;
        }
      }
    }

    // Carregar e renderizar instâncias Uazapi
    await renderizarInstanciasUazapi();

    modal.classList.add("active");
  }

  // Fechar modal de configurações
  function fecharModalConfiguracoes() {
    const modal = document.getElementById("modalConfiguracoes");
    if (modal) {
      modal.classList.remove("active");
    }
    // Parar verificação periódica ao fechar modal (economiza recursos)
    pararVerificacaoPeriodicaStatus();
    // Atualizar status após fechar modal
    atualizarStatusConexoes().catch(console.error);
  }

  // ============================================================================
  // Gerenciamento de Instâncias Uazapi
  // ============================================================================

  /**
   * Carrega lista de instâncias Uazapi do Supabase
   */
  async function carregarInstanciasUazapi() {
    if (!supabaseClient) {
      return [];
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .order("nome");

      if (error) {
        console.error("Erro ao carregar instâncias WhatsApp APIs:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Erro ao carregar instâncias Uazapi:", error);
      return [];
    }
  }

  /**
   * Renderiza lista de instâncias Uazapi na interface de configurações
   * @param {boolean} verificarStatusAutomatico - Se deve verificar status automaticamente (padrão: true)
   * @param {boolean} forcarRecarregamento - Se deve forçar recarregamento do banco (padrão: false)
   */
  async function renderizarInstanciasUazapi(
    verificarStatusAutomatico = true,
    forcarRecarregamento = false
  ) {
    const container = document.getElementById("instanciasUazapiList");
    if (!container) return;

    container.innerHTML =
      '<p style="color: #666; font-style: italic">Carregando instâncias...</p>';

    // Se forçar recarregamento, limpar cache e recarregar
    if (forcarRecarregamento) {
      // Pequeno delay para garantir que o banco foi atualizado
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const instancias = await carregarInstanciasUazapi();

    // Debug: Log das instâncias carregadas (apenas se forçar recarregamento)
    if (forcarRecarregamento) {
      console.log(
        "Instâncias carregadas do banco (recarregamento forçado):",
        instancias
      );
    }

    // Verificar status automaticamente para instâncias Uazapi
    if (verificarStatusAutomatico && instancias.length > 0) {
      const instanciasUazapi = instancias.filter(
        (i) => i.tipo_api === "uazapi" && i.ativo
      );
      if (instanciasUazapi.length > 0) {
        // Verificar status em paralelo (sem bloquear a renderização)
        verificarStatusInstanciasAutomatico(instanciasUazapi).catch(
          console.error
        );
      }
    }

    if (instancias.length === 0) {
      container.innerHTML = `
        <div style="padding: 15px; background: #fff3cd; border-radius: 6px; border: 1px solid #ffc107">
          <p style="margin: 0; color: #856404">
            <strong>⚠️ Nenhuma instância configurada</strong><br>
            <small>Adicione pelo menos uma instância Uazapi para usar nas campanhas.</small>
          </p>
        </div>
      `;
      return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 10px">';

    for (const instancia of instancias) {
      const statusBadge = instancia.ativo
        ? '<span style="background: #d4edda; color: #155724; padding: 2px 8px; border-radius: 4px; font-size: 11px">✅ Ativa</span>'
        : '<span style="background: #f8d7da; color: #721c24; padding: 2px 8px; border-radius: 4px; font-size: 11px">❌ Inativa</span>';

      const tipoApiBadge = `<span style="background: #e7f3ff; color: #0066cc; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase">${
        instancia.tipo_api || "uazapi"
      }</span>`;

      // Status de conexão
      let statusConexaoBadge = "";
      let statusConexaoCor = "#6c757d";
      if (instancia.status_conexao === "connected") {
        statusConexaoBadge =
          '<span style="background: #d4edda; color: #155724; padding: 2px 8px; border-radius: 4px; font-size: 11px">🟢 Conectado</span>';
        statusConexaoCor = "#28a745";
      } else if (instancia.status_conexao === "connecting") {
        statusConexaoBadge =
          '<span style="background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 4px; font-size: 11px">🟡 Conectando...</span>';
        statusConexaoCor = "#ffc107";
      } else {
        statusConexaoBadge =
          '<span style="background: #f8d7da; color: #721c24; padding: 2px 8px; border-radius: 4px; font-size: 11px">🔴 Desconectado</span>';
        statusConexaoCor = "#dc3545";
      }

      // Número WhatsApp (se conectado)
      let numeroWhatsApp = "";
      if (instancia.status_conexao === "connected") {
        if (instancia.numero_whatsapp) {
          numeroWhatsApp = `<div style="color: #28a745; font-size: 12px; margin-top: 4px; font-weight: 500">
            📱 WhatsApp: ${instancia.numero_whatsapp}
            ${instancia.profile_name ? ` (${instancia.profile_name})` : ""}
          </div>`;
        } else {
          // Conectado mas número não está no banco - precisa sincronizar
          numeroWhatsApp = `<div style="color: #ffc107; font-size: 12px; margin-top: 4px; font-weight: 500">
            ⚠️ Conectado (número não sincronizado - clique em "🔄 Sincronizar")
          </div>`;
        }
      }

      html += `
        <div style="
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background: ${instancia.ativo ? "#f8f9fa" : "#f5f5f5"};
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        ">
          <div style="flex: 1; min-width: 200px">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap">
              <strong>${instancia.nome}</strong>
              ${tipoApiBadge}
              ${statusBadge}
              ${statusConexaoBadge}
            </div>
            <div style="color: #666; font-size: 12px">
              ${instancia.base_url}
            </div>
            ${numeroWhatsApp}
            ${
              instancia.descricao
                ? `<div style="color: #999; font-size: 11px; margin-top: 4px">${instancia.descricao}</div>`
                : ""
            }
          </div>
          <div style="display: flex; gap: 5px; flex-wrap: wrap">
            ${
              instancia.tipo_api === "uazapi"
                ? `
                  <button
                    onclick="sincronizarStatusInstancia('${instancia.id}')"
                    class="btn-secondary"
                    style="padding: 6px 12px; font-size: 12px; background: #17a2b8; color: white; border-color: #17a2b8"
                    title="Sincronizar status com a API Uazapi"
                  >
                    🔄 Sincronizar
                  </button>
                  ${
                    instancia.status_conexao === "connected"
                      ? `
                        <button
                          onclick="desconectarInstanciaWhatsApp('${instancia.id}')"
                          class="btn-secondary"
                          style="padding: 6px 12px; font-size: 12px; background: #dc3545; color: white; border-color: #dc3545"
                          title="Desconectar o WhatsApp desta instância"
                        >
                          🔌 Desconectar
                        </button>
                        <button
                          onclick="conectarInstanciaWhatsApp('${instancia.id}')"
                          class="btn-secondary"
                          style="padding: 6px 12px; font-size: 12px; background: ${statusConexaoCor}; color: white; border-color: ${statusConexaoCor}"
                          title="Desconectar e reconectar com novo QR code"
                        >
                          🔄 Reconectar
                        </button>`
                      : `<button
                          onclick="conectarInstanciaWhatsApp('${instancia.id}')"
                          class="btn-secondary"
                          style="padding: 6px 12px; font-size: 12px; background: ${statusConexaoCor}; color: white; border-color: ${statusConexaoCor}"
                        >
                          ${
                            instancia.status_conexao === "connecting"
                              ? "⏳ Verificar"
                              : "🔗 Conectar"
                          }
                        </button>`
                  }
                `
                : ""
            }
            <button
              onclick="editarInstanciaUazapi('${instancia.id}')"
              class="btn-secondary"
              style="padding: 6px 12px; font-size: 12px"
            >
              ✏️ Editar
            </button>
            <button
              onclick="excluirInstanciaUazapi('${instancia.id}', '${
        instancia.nome
      }')"
              class="btn-secondary"
              style="padding: 6px 12px; font-size: 12px; background: #dc3545; color: white; border-color: #dc3545"
            >
              🗑️ Excluir
            </button>
          </div>
        </div>
      `;
    }

    html += "</div>";
    container.innerHTML = html;
  }

  /**
   * Atualiza o status de obrigatório do Instance Token baseado no contexto
   */
  function atualizarStatusInstanceToken() {
    const id = document.getElementById("instanciaUazapiId")?.value;
    const tipoApi =
      document.getElementById("instanciaUazapiTipoApi")?.value || "uazapi";
    const adminToken =
      document.getElementById("instanciaUazapiAdminToken")?.value.trim() || "";
    const requiredIndicator = document.getElementById(
      "instanciaUazapiTokenRequired"
    );
    const tokenInput = document.getElementById("instanciaUazapiToken");

    // Se está editando, sempre obrigatório
    if (id) {
      if (requiredIndicator) requiredIndicator.style.display = "inline";
      if (tokenInput) tokenInput.required = true;
      return;
    }

    // Se não é Uazapi, sempre obrigatório
    if (tipoApi !== "uazapi") {
      if (requiredIndicator) requiredIndicator.style.display = "inline";
      if (tokenInput) tokenInput.required = true;
      return;
    }

    // Se é nova instância Uazapi e tem Admin Token, não é obrigatório
    if (adminToken) {
      if (requiredIndicator) requiredIndicator.style.display = "none";
      if (tokenInput) tokenInput.required = false;
      return;
    }

    // Se é nova instância Uazapi e não tem Admin Token, é obrigatório
    if (requiredIndicator) requiredIndicator.style.display = "inline";
    if (tokenInput) tokenInput.required = true;
  }

  /**
   * Abre modal para criar/editar instância Uazapi
   */
  async function abrirModalNovaInstanciaUazapi(instanciaId = null) {
    const modal = document.getElementById("modalInstanciaUazapi");
    const form = document.getElementById("formInstanciaUazapi");
    const title = document.getElementById("modalInstanciaUazapiTitle");

    if (!modal || !form || !title) return;

    // Limpar formulário
    form.reset();
    document.getElementById("instanciaUazapiId").value = "";
    const tipoApiSelect = document.getElementById("instanciaUazapiTipoApi");
    if (tipoApiSelect) tipoApiSelect.value = "uazapi";
    document.getElementById("instanciaUazapiAtivo").checked = true;
    const adminTokenInput = document.getElementById(
      "instanciaUazapiAdminToken"
    );
    if (adminTokenInput) adminTokenInput.value = "";
    const configExtraInput = document.getElementById(
      "instanciaUazapiConfigExtra"
    );
    if (configExtraInput) configExtraInput.value = "";

    // Atualizar status do Instance Token baseado no contexto
    atualizarStatusInstanceToken();

    if (instanciaId) {
      // Editar instância existente
      title.textContent = "Editar Instância Uazapi";

      try {
        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .select("*")
          .eq("id", instanciaId)
          .single();

        if (error || !data) {
          mostrarAlerta(
            "Erro ao carregar instância: " +
              (error?.message || "Não encontrada"),
            "error"
          );
          return;
        }

        document.getElementById("instanciaUazapiId").value = data.id;
        // Remover prefixo ao carregar para edição (será reaplicado ao salvar)
        const nomeSemPrefixo = removerPrefixoInstancia(data.nome || "");
        document.getElementById("instanciaUazapiNome").value = nomeSemPrefixo;
        const tipoApiSelect = document.getElementById("instanciaUazapiTipoApi");
        if (tipoApiSelect) tipoApiSelect.value = data.tipo_api || "uazapi";
        document.getElementById("instanciaUazapiBaseUrl").value =
          data.base_url || "";
        document.getElementById("instanciaUazapiToken").value =
          data.token || "";
        // Limpar Admin Token ao editar (não salvamos no banco, apenas usamos para criar)
        const adminTokenInput = document.getElementById(
          "instanciaUazapiAdminToken"
        );
        if (adminTokenInput) adminTokenInput.value = "";
        document.getElementById("instanciaUazapiDescricao").value =
          data.descricao || "";
        const configExtraInput = document.getElementById(
          "instanciaUazapiConfigExtra"
        );
        if (configExtraInput) {
          configExtraInput.value = data.configuracao_extra
            ? JSON.stringify(data.configuracao_extra, null, 2)
            : "";
        }
        document.getElementById("instanciaUazapiAtivo").checked =
          data.ativo !== false;

        // Atualizar status do Instance Token (ao editar, sempre obrigatório)
        atualizarStatusInstanceToken();
      } catch (error) {
        mostrarAlerta("Erro ao carregar instância: " + error.message, "error");
        return;
      }
    } else {
      // Nova instância
      title.textContent = "Nova Instância Uazapi";

      // Atualizar status do Instance Token (nova instância)
      atualizarStatusInstanceToken();
    }

    modal.classList.add("active");

    // Adicionar tooltips após um pequeno delay
    setTimeout(() => {
      adicionarTooltipsFormularioInstancia();
    }, 100);
  }

  /**
   * Fecha modal de instância Uazapi
   */
  function fecharModalInstanciaUazapi() {
    const modal = document.getElementById("modalInstanciaUazapi");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Normaliza o nome da instância para minúsculas preservando hífens e underscores
   * Espaços viram underscores, acentos são removidos
   * @param {string} nome - Nome original da instância
   * @returns {string} - Nome normalizado em minúsculas (espaços viram underscores, acentos removidos)
   */
  function normalizarNomeInstancia(nome) {
    if (!nome || !nome.trim()) {
      return nome;
    }

    return (
      nome
        .trim()
        .toLowerCase()
        // Remover acentos (normalizar para forma sem acentos)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Substituir espaços por underscores (preservar hífens e underscores existentes)
        .replace(/\s+/g, "_")
        // Remover caracteres especiais, mantendo apenas letras, números, hífens e underscores
        .replace(/[^a-z0-9_-]/g, "")
        // Remover hífens duplicados (mas não misturar com underscores)
        .replace(/-+/g, "-")
        // Remover underscores duplicados (mas não misturar com hífens)
        .replace(/_+/g, "_")
        // Remover hífens e underscores no início e fim
        .replace(/^[-_]+|[-_]+$/g, "")
    );
  }

  /**
   * Remove prefixo Instacar_UUID_ do nome da instância (para exibição em edição)
   * @param {string} nome - Nome com ou sem prefixo
   * @returns {string} - Nome sem prefixo
   */
  function removerPrefixoInstancia(nome) {
    if (!nome || !nome.trim()) {
      return nome;
    }

    // Remover prefixo existente se houver (formato: Instacar_XXXXXX_ onde XXXX é código de 6 caracteres alfanuméricos)
    const nomeLimpo = nome.replace(/^Instacar_[a-z0-9]{6}_/i, "").trim();

    // Se não sobrou nada após remover o prefixo, retornar o nome original
    return nomeLimpo || nome;
  }

  /**
   * Aplica prefixo obrigatório Instacar_UUID_ no nome da instância
   * Normaliza o nome para minúsculas e kebab-case antes de aplicar o prefixo
   * @param {string} nome - Nome original da instância
   * @param {string} uuidExistente - UUID existente para manter (opcional, usado ao editar)
   * @returns {string} - Nome normalizado com prefixo aplicado no formato Instacar_{UUID}_{nome-normalizado}
   */
  function aplicarPrefixoInstancia(nome, uuidExistente = null) {
    if (!nome || !nome.trim()) {
      return nome;
    }

    // Extrair código existente do nome se houver (formato: Instacar_XXXXXX_ onde XXXX é código de 6 caracteres alfanuméricos)
    let uuidCurto = uuidExistente;
    let nomeLimpo = nome.replace(/^Instacar_[a-z0-9]{6}_?/i, "").trim();

    // Se não encontrou código no nome e não foi fornecido, tentar extrair do nome original
    if (!uuidCurto) {
      const match = nome.match(/^Instacar_([a-z0-9]{6})_/i);
      if (match) {
        uuidCurto = match[1];
      }
    }

    // Se não sobrou nada após remover o prefixo, usar um nome padrão
    if (!nomeLimpo) {
      return nome; // Retornar original se ficou vazio
    }

    // Normalizar nome para minúsculas (preservando hífens e underscores)
    nomeLimpo = normalizarNomeInstancia(nomeLimpo);

    // Se após normalização ficou vazio, retornar original
    if (!nomeLimpo) {
      return nome;
    }

    // Se não tem UUID existente, gerar novo código curto (6 caracteres) com letras e números misturados
    if (!uuidCurto) {
      // Gerar código de 6 caracteres com letras minúsculas e números
      // Usa caracteres: a-z (26) + 0-9 (10) = 36 possibilidades por caractere
      const caracteres = "abcdefghijklmnopqrstuvwxyz0123456789";
      uuidCurto = "";
      for (let i = 0; i < 6; i++) {
        uuidCurto += caracteres.charAt(
          Math.floor(Math.random() * caracteres.length)
        );
      }
    }

    // Aplicar formato: Instacar_{UUID}_{nome-normalizado}
    return `Instacar_${uuidCurto}_${nomeLimpo}`;
  }

  /**
   * Cria uma nova instância na Uazapi usando Admin Token
   * @param {string} baseUrl - URL base da API Uazapi
   * @param {string} adminToken - Admin Token para criar instância
   * @param {string} nomeInstancia - Nome da instância a ser criada
   * @returns {Promise<Object>} - Dados da instância criada incluindo o Instance Token
   */
  async function criarInstanciaUazapi(baseUrl, adminToken, nomeInstancia) {
    try {
      const response = await fetch(`${baseUrl}/instance/init`, {
        method: "POST",
        headers: {
          admintoken: adminToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: nomeInstancia,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Erro HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      // A resposta pode ter 'token' diretamente ou dentro de 'instance'
      // Segundo a documentação: token pode estar no nível raiz ou dentro de instance
      const instanceToken = data.token || data.instance?.token;
      const instanceId = data.instance?.id || data.id;

      // Retornar o Instance Token gerado
      return {
        success: true,
        instanceToken: instanceToken,
        instanceId: instanceId,
        instance: data.instance || data,
      };
    } catch (error) {
      console.error("Erro ao criar instância na Uazapi:", error);
      throw error;
    }
  }

  /**
   * Atualiza o nome de uma instância na Uazapi usando Instance Token
   * @param {string} baseUrl - URL base da API Uazapi
   * @param {string} instanceToken - Instance Token da instância
   * @param {string} novoNome - Novo nome para a instância (sem prefixo Instacar_UUID_)
   * @returns {Promise<boolean>} - true se atualizado com sucesso
   */
  async function atualizarNomeInstanciaUazapi(
    baseUrl,
    instanceToken,
    novoNome
  ) {
    try {
      console.log(
        `Chamando Uazapi para atualizar nome: ${baseUrl}/instance/updateInstanceName`,
        {
          token: instanceToken.substring(0, 10) + "...",
          novoNome: novoNome,
        }
      );

      const response = await fetch(`${baseUrl}/instance/updateInstanceName`, {
        method: "POST",
        headers: {
          token: instanceToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: novoNome,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Erro HTTP ${response.status}: ${response.statusText}`;
        console.error("Erro na resposta da Uazapi:", {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData,
        });
        throw new Error(errorMessage);
      }

      const responseData = await response.json().catch(() => ({}));
      console.log("Resposta da Uazapi ao atualizar nome:", responseData);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar nome da instância na Uazapi:", error);
      throw error;
    }
  }

  /**
   * Deleta uma instância na Uazapi usando Instance Token
   * @param {string} baseUrl - URL base da API Uazapi
   * @param {string} instanceToken - Instance Token da instância a ser deletada
   * @returns {Promise<boolean>} - true se deletado com sucesso
   */
  async function deletarInstanciaUazapi(baseUrl, instanceToken) {
    try {
      const response = await fetch(`${baseUrl}/instance`, {
        method: "DELETE",
        headers: {
          token: instanceToken,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Se a instância já não existe (404), considerar sucesso
        if (response.status === 404) {
          return true;
        }
        throw new Error(
          errorData.error ||
            `Erro HTTP ${response.status}: ${response.statusText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Erro ao deletar instância na Uazapi:", error);
      throw error;
    }
  }

  /**
   * Salva instância Uazapi (criar ou atualizar)
   */
  async function salvarInstanciaUazapi() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const id = document.getElementById("instanciaUazapiId").value;
    let nomeOriginal = document
      .getElementById("instanciaUazapiNome")
      .value.trim();

    // Se está editando, buscar UUID existente para manter
    let uuidExistente = null;
    let instanciaExistente = null;
    if (id) {
      try {
        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .select("nome, tipo_api, base_url, token")
          .eq("id", id)
          .single();

        if (!error && data) {
          instanciaExistente = data;
          // Extrair código do nome existente (formato: Instacar_XXXXXX_ onde XXXX é código de 6 caracteres)
          const match = data.nome?.match(/^Instacar_([a-z0-9]{6})_/i);
          if (match) {
            uuidExistente = match[1];
          }
        }
      } catch (error) {
        console.warn("Erro ao buscar instância existente:", error);
      }
    }

    // IMPORTANTE: Remover qualquer prefixo que o usuário possa ter digitado manualmente
    // O prefixo deve ser sempre gerado automaticamente pelo sistema
    nomeOriginal = removerPrefixoInstancia(nomeOriginal);

    // Aplicar prefixo obrigatório Instacar_codigo_ (mantendo código existente se estiver editando)
    const nome = aplicarPrefixoInstancia(nomeOriginal, uuidExistente);

    // Atualizar campo do formulário com nome prefixado (feedback visual)
    // Mas apenas se o usuário não estiver editando (para não confundir durante a edição)
    const nomeInput = document.getElementById("instanciaUazapiNome");
    if (nomeInput && !id && nome !== nomeOriginal) {
      nomeInput.value = nome;
    }

    const tipoApi =
      document.getElementById("instanciaUazapiTipoApi")?.value || "uazapi";
    const baseUrl = document
      .getElementById("instanciaUazapiBaseUrl")
      .value.trim();
    const adminToken =
      document.getElementById("instanciaUazapiAdminToken")?.value.trim() || "";
    let token = document.getElementById("instanciaUazapiToken").value.trim();
    const descricao = document
      .getElementById("instanciaUazapiDescricao")
      .value.trim();
    const ativo = document.getElementById("instanciaUazapiAtivo").checked;

    // Configuração extra (JSONB) - por enquanto vazio, pode ser expandido depois
    const configuracaoExtra = document.getElementById(
      "instanciaUazapiConfigExtra"
    )?.value;
    let configExtraJson = {};
    if (configuracaoExtra && configuracaoExtra.trim()) {
      try {
        configExtraJson = JSON.parse(configuracaoExtra);
      } catch (e) {
        mostrarAlerta(
          "Configuração extra inválida. Deve ser um JSON válido.",
          "error"
        );
        return;
      }
    }

    // Validações
    if (!nome || !baseUrl) {
      mostrarAlerta("Preencha todos os campos obrigatórios!", "error");
      return;
    }

    // Se é nova instância Uazapi e tem Admin Token, não precisa de Instance Token ainda
    // Se é edição ou não é Uazapi, precisa do Instance Token
    if (id || tipoApi !== "uazapi") {
      if (!token) {
        mostrarAlerta(
          "Instance Token é obrigatório para edição ou APIs que não sejam Uazapi!",
          "error"
        );
        return;
      }
    } else if (tipoApi === "uazapi" && !id && !adminToken && !token) {
      mostrarAlerta(
        "Para criar uma nova instância Uazapi, forneça o Admin Token ou o Instance Token de uma instância existente!",
        "error"
      );
      return;
    }

    if (!validarURL(baseUrl)) {
      mostrarAlerta("URL inválida. Deve começar com https://", "error");
      return;
    }

    try {
      // Se é nova instância Uazapi e tem Admin Token, criar na Uazapi primeiro
      if (!id && tipoApi === "uazapi" && adminToken) {
        try {
          // Enviar nome completo com prefixo para a Uazapi (para identificar instâncias da Instacar no servidor)
          const resultadoCriacao = await criarInstanciaUazapi(
            baseUrl,
            adminToken,
            nome
          );

          // Usar o Instance Token retornado pela Uazapi
          token = resultadoCriacao.instanceToken;

          mostrarAlerta(
            `Instância criada na Uazapi com sucesso! Instance Token gerado automaticamente.`,
            "success"
          );
        } catch (error) {
          mostrarAlerta(
            `Erro ao criar instância na Uazapi: ${error.message}. Verifique o Admin Token e tente novamente.`,
            "error"
          );
          return;
        }
      }

      const dados = {
        nome,
        tipo_api: tipoApi,
        base_url: baseUrl,
        token,
        descricao: descricao || null,
        ativo,
        configuracao_extra: configExtraJson,
      };

      let result;
      if (id) {
        // Atualizar
        // Verificar se o nome realmente mudou (comparar nomes completos com prefixo)
        const nomeMudou =
          instanciaExistente && instanciaExistente.nome !== nome;

        // Se é instância Uazapi e o nome mudou, atualizar na Uazapi também
        if (
          nomeMudou &&
          instanciaExistente &&
          instanciaExistente.tipo_api === "uazapi" &&
          instanciaExistente.base_url &&
          instanciaExistente.token
        ) {
          try {
            console.log(
              `Atualizando nome na Uazapi: "${instanciaExistente.nome}" → "${nome}"`
            );
            // Enviar nome completo com prefixo para a Uazapi (para identificar instâncias da Instacar no servidor)
            await atualizarNomeInstanciaUazapi(
              instanciaExistente.base_url,
              instanciaExistente.token,
              nome
            );
            console.log("Nome atualizado na Uazapi com sucesso");
          } catch (error) {
            // Se der erro ao atualizar na Uazapi, avisar mas continuar salvando no Supabase
            console.error("Erro ao atualizar nome na Uazapi:", error);
            mostrarAlerta(
              `Aviso: Nome atualizado no banco de dados, mas houve erro ao atualizar na Uazapi: ${error.message}. ` +
                `O nome na Uazapi pode estar desatualizado.`,
              "warning"
            );
          }
        } else if (nomeMudou) {
          console.log(
            `Nome mudou mas não é Uazapi ou não tem token: "${instanciaExistente?.nome}" → "${nome}"`
          );
        } else {
          console.log(
            `Nome não mudou: "${instanciaExistente?.nome}" === "${nome}"`
          );
        }

        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .update(dados)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar instância no Supabase:", error);
          throw error;
        }
        result = data;
        console.log("Instância atualizada no Supabase:", result);
        mostrarAlerta("Instância atualizada com sucesso!", "success");
      } else {
        // Criar
        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .insert(dados)
          .select()
          .single();

        if (error) throw error;
        result = data;
        mostrarAlerta("Instância criada com sucesso!", "success");
      }

      fecharModalInstanciaUazapi();
      await renderizarInstanciasUazapi();
      await carregarInstanciasParaSelect(); // Atualizar selects
      atualizarStatusConexoes().catch(console.error); // Atualizar status
    } catch (error) {
      console.error("Erro ao salvar instância:", error);
      mostrarAlerta("Erro ao salvar instância: " + error.message, "error");
    }
  }

  /**
   * Exclui instância Uazapi
   */
  async function excluirInstanciaUazapi(instanciaId, nome) {
    if (
      !confirm(
        `Tem certeza que deseja excluir a instância "${nome}"?\n\nEsta ação não pode ser desfeita.`
      )
    ) {
      return;
    }

    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    try {
      // Buscar dados da instância antes de deletar
      const { data: instancia, error: errorBuscar } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .eq("id", instanciaId)
        .single();

      if (errorBuscar || !instancia) {
        mostrarAlerta(
          "Erro ao buscar instância: " +
            (errorBuscar?.message || "Não encontrada"),
          "error"
        );
        return;
      }

      // Se é instância Uazapi, deletar na Uazapi primeiro usando Instance Token
      if (
        instancia.tipo_api === "uazapi" &&
        instancia.token &&
        instancia.base_url
      ) {
        try {
          await deletarInstanciaUazapi(instancia.base_url, instancia.token);
          console.log("Instância deletada na Uazapi com sucesso");
        } catch (error) {
          // Se der erro ao deletar na Uazapi, perguntar se quer continuar
          const continuar = confirm(
            `Erro ao deletar instância na Uazapi: ${error.message}\n\n` +
              `Deseja continuar e remover apenas do banco de dados local?`
          );

          if (!continuar) {
            return;
          }

          console.warn("Continuando exclusão apenas do banco de dados local");
        }
      }

      // Deletar do Supabase
      const { error } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .delete()
        .eq("id", instanciaId);

      if (error) throw error;

      mostrarAlerta("Instância excluída com sucesso!", "success");
      await renderizarInstanciasUazapi();
      await carregarInstanciasParaSelect(); // Atualizar selects
      atualizarStatusConexoes().catch(console.error); // Atualizar status
    } catch (error) {
      console.error("Erro ao excluir instância:", error);
      mostrarAlerta("Erro ao excluir instância: " + error.message, "error");
    }
  }

  /**
   * Carrega instâncias para os selects (campanha, etc)
   */
  async function carregarInstanciasParaSelect() {
    const instancias = await carregarInstanciasUazapi();
    const ativas = instancias.filter((i) => i.ativo !== false);

    // Atualizar select no formulário de campanha
    const selectCampanha = document.getElementById("whatsapp_api_id");
    if (selectCampanha) {
      // Salvar valor atual antes de limpar (se houver)
      const valorAtual = selectCampanha.value;
      
      selectCampanha.innerHTML =
        '<option value="">Selecione uma instância...</option>';

      if (ativas.length === 0) {
        selectCampanha.innerHTML =
          '<option value="">Nenhuma instância ativa configurada</option>';
        selectCampanha.disabled = true;
      } else {
        selectCampanha.disabled = false;
        
        // Ordenar instâncias: connected primeiro, depois por nome
        const instanciasOrdenadas = [...ativas].sort((a, b) => {
          // Prioridade 1: Status de conexão (connected primeiro)
          const statusA = a.status_conexao === 'connected' ? 0 : 1;
          const statusB = b.status_conexao === 'connected' ? 0 : 1;
          if (statusA !== statusB) {
            return statusA - statusB;
          }
          // Prioridade 2: Ordenar por nome
          return (a.nome || '').localeCompare(b.nome || '');
        });
        
        instanciasOrdenadas.forEach((instancia) => {
          const option = document.createElement("option");
          option.value = instancia.id;
          const tipoApiLabel = instancia.tipo_api
            ? `[${instancia.tipo_api.toUpperCase()}]`
            : "";
          
          // Adicionar indicador de status
          let statusLabel = '';
          if (instancia.status_conexao === 'connected') {
            statusLabel = ' ✅ Conectada';
          } else if (instancia.status_conexao === 'disconnected') {
            statusLabel = ' ⚠️ Desconectada';
          } else if (instancia.status_conexao) {
            statusLabel = ` (${instancia.status_conexao})`;
          }
          
          option.textContent = `${tipoApiLabel} ${instancia.nome}${statusLabel} - ${instancia.base_url}`;
          selectCampanha.appendChild(option);
        });
        
        // Restaurar valor anterior se ainda existir nas opções
        if (valorAtual && Array.from(selectCampanha.options).some(opt => opt.value === valorAtual)) {
          selectCampanha.value = valorAtual;
        }
      }
    }
  }

  /**
   * Obtém configuração de uma instância Uazapi por ID
   * @param {string} instanciaId - ID da instância (ou null para usar padrão/primeira ativa)
   */
  async function obterConfiguracaoUazapi(instanciaId = null) {
    if (!supabaseClient) {
      // Fallback para localStorage (compatibilidade)
      const config = await carregarConfiguracoesDoLocalStorage();
      if (config && config.uazapiBaseUrl && config.uazapiToken) {
        return {
          baseUrl: config.uazapiBaseUrl,
          token: config.uazapiToken,
        };
      }
      return null;
    }

    try {
      let query = supabaseClient
        .from("instacar_whatsapp_apis")
        .select("base_url, token")
        .eq("ativo", true)
        .limit(1);

      if (instanciaId) {
        query = query.eq("id", instanciaId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        return {
          baseUrl: data[0].base_url,
          token: data[0].token,
        };
      }

      // Fallback para localStorage se não houver no Supabase
      const config = await carregarConfiguracoesDoLocalStorage();
      if (config && config.uazapiBaseUrl && config.uazapiToken) {
        return {
          baseUrl: config.uazapiBaseUrl,
          token: config.uazapiToken,
        };
      }

      return null;
    } catch (error) {
      console.error("Erro ao obter configuração Uazapi:", error);
      // Fallback para localStorage
      const config = await carregarConfiguracoesDoLocalStorage();
      if (config && config.uazapiBaseUrl && config.uazapiToken) {
        return {
          baseUrl: config.uazapiBaseUrl,
          token: config.uazapiToken,
        };
      }
      return null;
    }
  }

  // ============================================================================
  // Função auxiliar: Obter Webhook N8N do Supabase ou fallback
  // ============================================================================
  /**
   * Obtém a URL do webhook N8N com prioridade:
   * 1. Supabase (banco de dados)
   * 2. localStorage (fallback)
   * 3. window.INSTACAR_CONFIG (fallback)
   * 
   * @returns {Promise<string|null>} URL do webhook ou null se não encontrado
   */
  async function obterWebhookN8N() {
    // 1. Tentar buscar do Supabase primeiro
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("instacar_configuracoes_sistema")
          .select("valor")
          .eq("chave", "n8n_webhook_url")
          .eq("ativo", true)
          .maybeSingle();

        if (!error && data && data.valor && data.valor.trim() !== "") {
          return data.valor.trim();
        }
      } catch (error) {
        logger.warn("Erro ao buscar webhook do Supabase:", error);
        // Continuar para fallback
      }
    }

    // 2. Fallback para localStorage
    const webhookLocalStorage = localStorage.getItem("n8nWebhookUrl");
    if (webhookLocalStorage && webhookLocalStorage.trim() !== "") {
      return webhookLocalStorage.trim();
    }

    // 3. Fallback para window.INSTACAR_CONFIG
    if (window.INSTACAR_CONFIG?.n8nWebhookUrl) {
      return window.INSTACAR_CONFIG.n8nWebhookUrl.trim();
    }

    return null;
  }

  // Carregar configurações do localStorage (apenas N8N, Uazapi agora vem do Supabase)
  // ATUALIZADO: Agora busca webhook do Supabase primeiro
  async function carregarConfiguracoesDoLocalStorage() {
    // Buscar webhook do Supabase primeiro (async)
    const webhook = await obterWebhookN8N();
    
    const uazapiUrl = localStorage.getItem("uazapiBaseUrl");
    const uazapiToken = localStorage.getItem("uazapiToken");

    // Também verificar config.js se não houver no localStorage
    if (!webhook && !uazapiUrl && !uazapiToken) {
      if (window.INSTACAR_CONFIG && window.INSTACAR_CONFIG.uazapi) {
        return {
          n8nWebhookUrl: window.INSTACAR_CONFIG.n8nWebhookUrl || "",
          uazapiBaseUrl: window.INSTACAR_CONFIG.uazapi.baseUrl || "",
          uazapiToken: window.INSTACAR_CONFIG.uazapi.token || "",
        };
      }
      return null;
    }

    return {
      n8nWebhookUrl: webhook || "",
      uazapiBaseUrl: uazapiUrl || "",
      uazapiToken: uazapiToken || "",
    };
  }

  // Salvar configurações (do modal) - apenas N8N agora
  // ATUALIZADO: Agora salva no Supabase também
  async function salvarConfiguracoes() {
    // Remover campos de Supabase - agora vem de variáveis de ambiente
    // Remover campos de Uazapi - agora gerenciado via instâncias no Supabase
    const webhookInput = document.getElementById("configN8nWebhook");

    const webhook = webhookInput ? webhookInput.value.trim() : "";

    // Validar URL do N8N (se preenchida)
    if (webhook && !validarURL(webhook)) {
      mostrarAlerta(
        "URL do Webhook N8N inválida. Deve começar com https://",
        "error"
      );
      return;
    }

    // Salvar no Supabase (se conectado)
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("instacar_configuracoes_sistema")
          .upsert(
            {
              chave: "n8n_webhook_url",
              valor: webhook || null,
              tipo: "url",
              descricao: "URL do webhook do N8N para disparos manuais de campanhas",
              categoria: "n8n",
              sensivel: false,
              ativo: true,
            },
            {
              onConflict: "chave",
            }
          );

        if (error) {
          logger.error("Erro ao salvar webhook no Supabase:", error);
          mostrarAlerta(
            "Erro ao salvar no banco de dados. Salvando apenas localmente.",
            "warning"
          );
        } else {
          logger.log("Webhook salvo no Supabase com sucesso");
        }
      } catch (error) {
        logger.error("Erro inesperado ao salvar webhook no Supabase:", error);
        mostrarAlerta(
          "Erro ao salvar no banco de dados. Salvando apenas localmente.",
          "warning"
        );
      }
    }

    // Salvar no localStorage (fallback e compatibilidade)
    if (webhook) {
      localStorage.setItem("n8nWebhookUrl", webhook);
    } else {
      localStorage.removeItem("n8nWebhookUrl");
    }

    // Atualizar config global se existir
    if (window.INSTACAR_CONFIG) {
      if (webhook) window.INSTACAR_CONFIG.n8nWebhookUrl = webhook || null;
    }

    mostrarAlerta("Configurações salvas com sucesso!", "success");

    // Atualizar status
    atualizarStatusConexoes().catch(console.error);

    fecharModalConfiguracoes();
  }

  // Carregar configurações salvas (botão na seção principal) - REMOVIDO
  // Agora as configurações são carregadas automaticamente

  // Carregar configurações no modal (apenas N8N, Uazapi é gerenciado via instâncias)
  // ATUALIZADO: Agora busca do Supabase primeiro
  async function carregarConfiguracoesNoModal() {
    const config = await carregarConfiguracoesDoLocalStorage();
    if (!config || !config.n8nWebhookUrl) {
      mostrarAlerta("Nenhuma configuração salva encontrada", "error");
      return;
    }

    // Obter referências aos elementos (verificar se existem)
    const n8nWebhookInput = document.getElementById("configN8nWebhook");

    // Carregar apenas N8N (Supabase vem de variáveis de ambiente, Uazapi via instâncias)
    if (config.n8nWebhookUrl && n8nWebhookInput) {
      n8nWebhookInput.value = config.n8nWebhookUrl;
    }

    mostrarAlerta("Configurações carregadas!", "success");
  }

  // Exportar configurações como JSON (apenas N8N, Uazapi é gerenciado via instâncias)
  // ATUALIZADO: Agora busca do Supabase primeiro
  async function exportarConfiguracoes() {
    const config = await carregarConfiguracoesDoLocalStorage();
    if (!config || !config.n8nWebhookUrl) {
      mostrarAlerta(
        "Nenhuma configuração para exportar (apenas N8N Webhook). Instâncias Uazapi são gerenciadas no Supabase.",
        "error"
      );
      return;
    }

    const json = JSON.stringify(
      {
        n8nWebhookUrl: config.n8nWebhookUrl,
        // Nota: Instâncias Uazapi não são exportadas, pois são gerenciadas no Supabase
      },
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `instacar-config-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarAlerta("Configurações exportadas com sucesso!", "success");
  }

  // Importar configurações de JSON
  // ATUALIZADO: Agora salva no Supabase também
  function importarConfiguracoes() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const config = JSON.parse(event.target.result);

          // Validar estrutura
          if (typeof config !== "object") {
            throw new Error("Formato inválido");
          }

          // Validar URLs se existirem (apenas N8N, Uazapi agora é gerenciado via instâncias)
          if (config.n8nWebhookUrl && !validarURL(config.n8nWebhookUrl)) {
            mostrarAlerta("URL do Webhook N8N inválida no arquivo", "error");
            return;
          }

          // Salvar no Supabase (se conectado)
          if (config.n8nWebhookUrl && supabaseClient) {
            try {
              const { error } = await supabaseClient
                .from("instacar_configuracoes_sistema")
                .upsert(
                  {
                    chave: "n8n_webhook_url",
                    valor: config.n8nWebhookUrl,
                    tipo: "url",
                    descricao: "URL do webhook do N8N para disparos manuais de campanhas",
                    categoria: "n8n",
                    sensivel: false,
                    ativo: true,
                  },
                  {
                    onConflict: "chave",
                  }
                );

              if (error) {
                logger.error("Erro ao salvar webhook no Supabase:", error);
              } else {
                logger.log("Webhook importado e salvo no Supabase com sucesso");
              }
            } catch (error) {
              logger.error("Erro inesperado ao salvar webhook no Supabase:", error);
            }
          }

          // Salvar no localStorage (fallback e compatibilidade)
          if (config.n8nWebhookUrl)
            localStorage.setItem("n8nWebhookUrl", config.n8nWebhookUrl);

          // Atualizar campos do modal (apenas N8N)
          if (config.n8nWebhookUrl) {
            const n8nInput = document.getElementById("configN8nWebhook");
            if (n8nInput) {
              n8nInput.value = config.n8nWebhookUrl;
            }
          }

          // Se houver configurações antigas de Uazapi no JSON, informar que devem ser migradas
          if (config.uazapiBaseUrl || config.uazapiToken) {
            mostrarAlerta(
              "⚠️ Configurações antigas de Uazapi detectadas. Por favor, adicione uma instância Uazapi em '⚙️ Gerenciar Configurações' > '➕ Adicionar Instância'.",
              "error"
            );
          }

          mostrarAlerta("Configurações importadas com sucesso!", "success");
        } catch (error) {
          mostrarAlerta("Erro ao importar: " + error.message, "error");
          console.error(error);
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  // Limpar todas as configurações (apenas N8N, Supabase vem de variáveis de ambiente, Uazapi é gerenciado no Supabase)
  // ATUALIZADO: Agora limpa do Supabase também
  async function limparConfiguracoes() {
    if (
      !confirm(
        "Tem certeza que deseja limpar as configurações salvas? (N8N Webhook)\n\nNota: Instâncias Uazapi são gerenciadas no Supabase e não serão removidas."
      )
    ) {
      return;
    }

    // Limpar do Supabase (se conectado)
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from("instacar_configuracoes_sistema")
          .update({
            valor: null,
            ativo: false,
          })
          .eq("chave", "n8n_webhook_url");

        if (error) {
          logger.error("Erro ao limpar webhook do Supabase:", error);
          mostrarAlerta(
            "Erro ao limpar do banco de dados. Limpando apenas localmente.",
            "warning"
          );
        } else {
          logger.log("Webhook removido do Supabase com sucesso");
        }
      } catch (error) {
        logger.error("Erro inesperado ao limpar webhook do Supabase:", error);
        mostrarAlerta(
          "Erro ao limpar do banco de dados. Limpando apenas localmente.",
          "warning"
        );
      }
    }

    // Não remover Supabase (vem de variáveis de ambiente)
    // Não remover Uazapi (gerenciado via instâncias no Supabase)
    localStorage.removeItem("n8nWebhookUrl");

    // Limpar campos do modal (apenas N8N) - verificar se existem
    const n8nWebhookInput = document.getElementById("configN8nWebhook");
    if (n8nWebhookInput) n8nWebhookInput.value = "";

    // Atualizar status
    atualizarStatusConexoes().catch(console.error);

    mostrarAlerta("Configurações limpas com sucesso!", "success");
  }

  // Mostrar alerta
  function mostrarAlerta(mensagem, tipo = "success") {
    const container = document.getElementById("alertContainer");
    if (!container) {
      console.warn("Container de alertas não encontrado");
      return;
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${tipo}`;
    alert.textContent = mensagem;

    // Limpar alertas anteriores
    container.innerHTML = "";
    container.appendChild(alert);

    // Remover após 8 segundos (mais tempo para o usuário ver)
    setTimeout(() => {
      if (alert.parentNode) {
        alert.style.opacity = "0";
        alert.style.transition = "opacity 0.5s";
        setTimeout(() => {
          alert.remove();
        }, 500);
      }
    }, 8000);
  }

  // Variável para armazenar modo de visualização das campanhas
  let modoVisualizacaoCampanhas =
    localStorage.getItem("campanhasViewMode") || "grid";

  // Alternar visualização entre grid e lista
  function alternarVisualizacaoCampanhas(modo) {
    modoVisualizacaoCampanhas = modo;
    localStorage.setItem("campanhasViewMode", modo);

    // Atualizar botões de toggle
    const btnGrid = document.getElementById("viewToggleGrid");
    const btnList = document.getElementById("viewToggleList");

    if (btnGrid && btnList) {
      if (modo === "grid") {
        btnGrid.classList.add("active");
        btnList.classList.remove("active");
      } else {
        btnGrid.classList.remove("active");
        btnList.classList.add("active");
      }
    }

    // Recarregar campanhas com o novo modo
    carregarCampanhas();
  }

  // Carregar campanhas
  async function carregarCampanhas() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    const container = document.getElementById("campanhasContainer");
    if (!container) return;

    // Estado de carregamento com design system
    container.innerHTML = `
      <div class="card-elevated" style="padding: 2rem; text-align: center; grid-column: 1 / -1;">
        <p style="color: hsl(var(--muted-foreground)); margin: 0;">Carregando campanhas...</p>
      </div>
    `;

    try {
      const { data, error } = await supabaseClient
        .from("instacar_campanhas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data.length === 0) {
        container.innerHTML = `
          <div class="card-elevated" style="padding: 2rem; text-align: center; grid-column: 1 / -1;">
            <p style="color: hsl(var(--muted-foreground)); margin: 0;">
              ${document.getElementById("buscaCampanhas")?.value ? "Nenhuma campanha encontrada" : "Nenhuma campanha cadastrada"}
            </p>
          </div>
        `;
        return;
      }

      container.innerHTML = "";
      
      // Verificar se é modo grid ou list
      const isGridMode = modoVisualizacaoCampanhas === "grid";
      
      // Se for modo grid, o container já tem o grid CSS aplicado
      // Se for modo list, criar wrapper com layout de lista
      let wrapper;
      if (isGridMode) {
        // Modo grid: usar o container diretamente (já tem grid CSS)
        wrapper = container;
      } else {
        // Modo list: criar wrapper com layout de lista
        wrapper = document.createElement("div");
        wrapper.className = "campanhas-list";
        wrapper.style.cssText = "display: flex; flex-direction: column; gap: 1rem;";
      }

      // Buscar execuções pendentes para todas as campanhas
      const hojeStr = new Date().toISOString().split("T")[0];
      const { data: execucoesPendentes } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("id, campanha_id, status_execucao, pausa_manual, total_enviado, total_contatos_elegiveis, contatos_processados")
        .eq("data_execucao", hojeStr)
        .in("status_execucao", ["pausada", "em_andamento"]);
      
      // Buscar execuções ativas para calcular progresso
      const { data: execucoesAtivas } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("campanha_id, total_enviado, total_contatos_elegiveis, contatos_processados")
        .eq("status_execucao", "em_andamento")
        .order("created_at", { ascending: false });

      // Criar mapa de execuções pendentes por campanha
      const execucoesPorCampanha = {};
      if (execucoesPendentes) {
        execucoesPendentes.forEach((exec) => {
          if (!execucoesPorCampanha[exec.campanha_id]) {
            execucoesPorCampanha[exec.campanha_id] = [];
          }
          execucoesPorCampanha[exec.campanha_id].push(exec);
        });
      }

      // Criar mapa de execuções ativas por campanha (para progresso)
      const execucoesAtivasPorCampanha = {};
      if (execucoesAtivas) {
        execucoesAtivas.forEach((exec) => {
          if (!execucoesAtivasPorCampanha[exec.campanha_id]) {
            execucoesAtivasPorCampanha[exec.campanha_id] = exec;
          }
        });
      }

      // Verificar se é o container do dashboard
      const isDashboardContainer = container.id === "campanhasContainer" && 
        container.closest(".card")?.querySelector(".card-title")?.textContent === "Campanhas em Andamento";
      
      data.forEach((campanha) => {
        const execucoes = execucoesPorCampanha[campanha.id] || [];
        const execucaoAtiva = execucoesAtivasPorCampanha[campanha.id];
        
        // Se for dashboard, usar formato simplificado
        if (isDashboardContainer && campanha.status === "ativa" && campanha.ativo) {
          const card = criarCardCampanhaDashboard(campanha, execucaoAtiva);
          wrapper.appendChild(card);
        } else if (!isDashboardContainer) {
          const card = criarCardCampanha(campanha, modoVisualizacaoCampanhas, execucoes);
          wrapper.appendChild(card);
        }
      });

      // Se criou wrapper (modo list), adicionar ao container
      if (wrapper !== container) {
        container.appendChild(wrapper);
      }

      // Garantir que os botões de toggle estão no estado correto
      const btnGrid = document.getElementById("viewToggleGrid");
      const btnList = document.getElementById("viewToggleList");

      if (btnGrid && btnList) {
        if (modoVisualizacaoCampanhas === "grid") {
          btnGrid.classList.add("active");
          btnList.classList.remove("active");
        } else {
          btnGrid.classList.remove("active");
          btnList.classList.add("active");
        }
      }
    } catch (error) {
      container.innerHTML = `
        <div class="card-elevated" style="padding: 2rem; text-align: center; grid-column: 1 / -1;">
          <p style="color: hsl(var(--destructive)); margin: 0;">Erro ao carregar campanhas: ${error.message}</p>
        </div>
      `;
      console.error(error);
    }
  }

  // Criar card de campanha para dashboard (formato simplificado)
  /**
   * Carrega campanhas ativas para o dashboard
   */
  async function carregarCampanhasDashboard() {
    if (!supabaseClient && !window.supabaseClient) {
      console.warn("Supabase não está disponível. Aguardando conexão...");
      setTimeout(() => {
        if (supabaseClient || window.supabaseClient) {
          carregarCampanhasDashboard();
        }
      }, 2000);
      return;
    }

    const supabase = supabaseClient || window.supabaseClient;
    const container = document.getElementById("campanhasContainer");
    if (!container) return;

    try {
      // Buscar apenas campanhas ativas
      const { data: campanhas, error } = await supabase
        .from("instacar_campanhas")
        .select("*")
        .eq("status", "ativa")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!campanhas || campanhas.length === 0) {
        container.innerHTML = '<p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 0;">Nenhuma campanha ativa no momento.</p>';
        return;
      }

      // Buscar execuções ativas para calcular progresso
      const { data: execucoesAtivas } = await supabase
        .from("instacar_campanhas_execucoes")
        .select("campanha_id, total_enviado, total_contatos_elegiveis, contatos_processados")
        .eq("status_execucao", "em_andamento")
        .order("created_at", { ascending: false });

      // Criar mapa de execuções por campanha
      const execucoesPorCampanha = {};
      if (execucoesAtivas) {
        execucoesAtivas.forEach(exec => {
          if (!execucoesPorCampanha[exec.campanha_id]) {
            execucoesPorCampanha[exec.campanha_id] = exec;
          }
        });
      }

      container.innerHTML = "";
      campanhas.forEach((campanha, index) => {
        const execucaoAtiva = execucoesPorCampanha[campanha.id] || null;
        const card = criarCardCampanhaDashboard(campanha, execucaoAtiva);
        // Remover margin-bottom do último card
        if (index === campanhas.length - 1) {
          card.style.marginBottom = "0";
        }
        container.appendChild(card);
      });

    } catch (error) {
      console.error("Erro ao carregar campanhas do dashboard:", error);
      container.innerHTML = '<p style="font-size: 0.875rem; color: hsl(var(--destructive)); margin: 0;">Erro ao carregar campanhas.</p>';
    }
  }

  // Expor função globalmente
  window.carregarCampanhasDashboard = carregarCampanhasDashboard;
  
  // Função para abrir detalhes da campanha
  window.abrirDetalhesCampanha = function(campanhaId) {
    abrirDashboardCampanha(campanhaId);
  };
  
  // Função para toggle status (ativa/pausada)
  window.toggleStatusCampanha = async function(campanhaId, statusAtual) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }
    
    const novoStatus = statusAtual === "ativa" ? "pausada" : "ativa";
    
    try {
      const { error } = await supabaseClient
        .from("instacar_campanhas")
        .update({ status: novoStatus })
        .eq("id", campanhaId);
      
      if (error) throw error;
      
      mostrarAlerta(
        `Campanha ${novoStatus === "ativa" ? "ativada" : "pausada"} com sucesso!`,
        "success"
      );
      carregarCampanhas();
    } catch (error) {
      mostrarAlerta("Erro ao alterar status: " + error.message, "error");
      console.error(error);
    }
  };
  
  // Função para excluir campanha
  window.excluirCampanha = async function(campanhaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }
    
    if (!confirm("Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    try {
      const { error } = await supabaseClient
        .from("instacar_campanhas")
        .update({ ativo: false })
        .eq("id", campanhaId);
      
      if (error) throw error;
      
      mostrarAlerta("Campanha excluída com sucesso!", "success");
      carregarCampanhas();
    } catch (error) {
      mostrarAlerta("Erro ao excluir campanha: " + error.message, "error");
      console.error(error);
    }
  };
  
  // Expor função toggleDropdownMenu globalmente
  window.toggleDropdownMenu = toggleDropdownMenu;

  function criarCardCampanhaDashboard(campanha, execucaoAtiva = null) {
    const card = document.createElement("div");
    card.className = "campanha-dashboard-card animate-fade-in";
    card.style.cssText = "margin-bottom: 1.25rem; padding: 0;";
    
    const totalEnviados = execucaoAtiva?.total_enviado || 0;
    const totalElegiveis = execucaoAtiva?.total_contatos_elegiveis || 0;
    const processados = execucaoAtiva?.contatos_processados || totalEnviados;
    const progress = totalElegiveis > 0 ? Math.min((processados / totalElegiveis) * 100, 100) : 0;
    
    // Configuração de status (seguindo padrão CampaignProgress.tsx)
    const statusConfig = {
      ativa: { label: "Ativa", className: "bg-success/10 text-success border-success/20" },
      pausada: { label: "Pausada", className: "bg-warning/10 text-warning border-warning/20" },
      concluida: { label: "Concluída", className: "bg-muted text-muted-foreground border-muted" },
      agendada: { label: "Agendada", className: "bg-info/10 text-info border-info/20" }
    };
    const config = statusConfig[campanha.status] || statusConfig.ativa;
    
    // Helper para aplicar estilos do badge
    function getStatusBadgeStyles(className) {
      const styles = {
        "bg-success/10 text-success border-success/20": "background: hsl(var(--success) / 0.1); color: hsl(var(--success)); border-color: hsl(var(--success) / 0.2);",
        "bg-warning/10 text-warning border-warning/20": "background: hsl(var(--warning) / 0.1); color: hsl(var(--warning)); border-color: hsl(var(--warning) / 0.2);",
        "bg-muted text-muted-foreground border-muted": "background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); border-color: hsl(var(--muted));",
        "bg-info/10 text-info border-info/20": "background: hsl(var(--info) / 0.1); color: hsl(var(--info)); border-color: hsl(var(--info) / 0.2);"
      };
      return styles[className] || styles["bg-success/10 text-success border-success/20"];
    }
    
    const badgeStyles = getStatusBadgeStyles(config.className);
    
    card.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.75rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
          <p style="font-weight: 500; font-size: 0.9375rem; color: hsl(var(--foreground)); margin: 0; flex: 1; min-width: 0;">${campanha.nome || "Sem nome"}</p>
          <span class="status-badge" style="display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; border: 1px solid; ${badgeStyles}; white-space: nowrap; flex-shrink: 0;">
            ${config.label}
          </span>
        </div>
        <div style="width: 100%; height: 10px; background: hsl(var(--muted)); border-radius: 5px; overflow: hidden; position: relative;">
          <div style="width: ${progress}%; height: 100%; background: hsl(var(--primary)); transition: width 0.3s ease; border-radius: 5px;"></div>
        </div>
        <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.4;">
          ${processados.toLocaleString()} de ${totalElegiveis.toLocaleString()} enviados
        </p>
      </div>
    `;
    
    return card;
  }

  // Helper para obter ícone SVG (padronizado com instacar-insights)
  function getIconSVG(iconName, size = 20) {
    const icons = {
      send: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>`,
      play: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>`,
      pause: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="4" width="4" height="16"></rect>
        <rect x="14" y="4" width="4" height="16"></rect>
      </svg>`,
      check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`,
      x: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`,
      moreVertical: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; color: inherit;">
        <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
        <circle cx="12" cy="5" r="2.5" fill="currentColor"></circle>
        <circle cx="12" cy="19" r="2.5" fill="currentColor"></circle>
      </svg>`,
      eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>`,
      edit: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>`,
      trash: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>`,
      search: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>`,
      filter: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>`,
      upload: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>`,
      plus: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>`,
      phone: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>`,
      mail: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>`,
      ban: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>`,
      checkCircle: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>`,
      xCircle: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>`,
      helpCircle: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>`
    };
    return icons[iconName] || icons.send;
  }
  
  // Função para toggle do dropdown menu
  function toggleDropdownMenu(menuId, event) {
    if (event) {
      event.stopPropagation();
    }
    
    // Fechar todos os outros dropdowns
    document.querySelectorAll('.dropdown-content.show').forEach(menu => {
      if (menu.id !== menuId) {
        menu.classList.remove('show');
      }
    });
    
    // Toggle do menu atual
    const menu = document.getElementById(menuId);
    if (menu) {
      menu.classList.toggle('show');
    }
  }
  
  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-content.show').forEach(menu => {
        menu.classList.remove('show');
      });
    }
  });

  // Criar card de campanha
  function criarCardCampanha(campanha, modo = "grid", execucoesPendentes = []) {
    const card = document.createElement("div");
    card.className = "campanha-card";

    const statusClass = campanha.status || "pausada";
    const periodo = campanha.periodo_ano || "N/A";
    const status = campanha.status || "pausada";
    const descricao = campanha.descricao || "Sem descrição";
    const limiteDia = campanha.limite_envios_dia || 200;
    const intervaloMinimo = campanha.intervalo_minimo_dias || 30;
    const tempoEnvios = campanha.intervalo_envios_segundos
      ? `${campanha.intervalo_envios_segundos}s (${(
          campanha.intervalo_envios_segundos / 60
        ).toFixed(1)} min)`
      : "130-150s (aleatorizado)";
    const prioridade = campanha.prioridade || 5;
    const dataInicio = campanha.data_inicio
      ? new Date(campanha.data_inicio).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : null;
    const dataFim = campanha.data_fim
      ? new Date(campanha.data_fim).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      : null;
    const podeDisparar = campanha.ativo && campanha.status === "ativa";
    
    // Verificar se há execução pausada (não manual) para mostrar botão "Continuar"
    const execucaoPausada = execucoesPendentes.find(
      (e) => e.status_execucao === "pausada" && !e.pausa_manual
    );
    const temExecucaoPausada = execucaoPausada !== undefined;
    const botaoLabel = temExecucaoPausada ? "▶️ Continuar" : "🚀 Disparar";
    const botaoClass = temExecucaoPausada ? "btn-warning" : "btn-success";
    const botaoStyle = temExecucaoPausada
      ? "padding: 6px 12px; font-size: 12px; background: #ffc107; color: #000; border-color: #ffc107"
      : "padding: 6px 12px; font-size: 12px; background: #28a745; color: white; border-color: #28a745";

    if (modo === "list") {
      // Visualização em lista (seguindo padrão das instâncias Uazapi)
      // Badge "Ativa/Inativa" só aparece quando status é "ativa" ou não definido
      // Para status específicos (pausada, concluida, cancelada), não mostrar badge duplicado
      const statusBadge =
        statusClass === "pausada" ||
        statusClass === "concluida" ||
        statusClass === "cancelada"
          ? "" // Não mostrar badge "Ativa/Inativa" quando há status específico
          : campanha.ativo
          ? '<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">✅ Ativa</span>'
          : '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">❌ Inativa</span>';

      const statusCampanhaBadge =
        statusClass === "ativa" && campanha.ativo
          ? '<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">▶ Em execução</span>'
          : statusClass === "pausada"
          ? '<span style="background: #fed7aa; color: #9a3412; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">⏸ Pausada</span>'
          : statusClass === "concluida"
          ? '<span style="background: #ccfbf1; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">✓ Concluída</span>'
          : statusClass === "cancelada"
          ? '<span style="background: #f9fafb; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500">✗ Cancelada</span>'
          : "";

      card.innerHTML = `
        <div class="campanha-info">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap">
            <strong>${campanha.nome || "Sem nome"}</strong>
            <span class="periodo">${periodo}</span>
            ${statusBadge}
            ${statusCampanhaBadge}
          </div>
          <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px">
            ${descricao !== "Sem descrição" ? descricao : "Sem descrição"}
          </div>
          <div class="meta-info">
            <span>📊 Limite/dia: <strong>${limiteDia}</strong></span>
            <span>⏱️ Intervalo: <strong>${intervaloMinimo} dias</strong></span>
            <span>⏱️ Tempo: <strong>${tempoEnvios}</strong></span>
            <span>📈 Prioridade: <strong>${prioridade}/10</strong></span>
            ${
              dataInicio
                ? `<span>📅 Início: <strong>${dataInicio}</strong></span>`
                : ""
            }
            ${dataFim ? `<span>📅 Fim: <strong>${dataFim}</strong></span>` : ""}
          </div>
        </div>
        <div class="actions">
          <button onclick="editarCampanha('${
            campanha.id
          }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
            ✏️ Editar
          </button>
          <button onclick="toggleAtivo('${
            campanha.id
          }', ${!campanha.ativo})" class="${
        campanha.ativo ? "btn-danger" : "btn-success"
      }" style="padding: 6px 12px; font-size: 12px">
            ${campanha.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
          </button>
          <button onclick="dispararCampanha('${
            campanha.id
          }')" class="${botaoClass}" style="${botaoStyle}" ${
        !podeDisparar ? "disabled" : ""
      }>
            ${botaoLabel}
          </button>
          <button onclick="verEnviosCampanha('${
            campanha.id
          }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
            📨 Ver Envios
          </button>
          <button onclick="abrirDashboardCampanha('${
            campanha.id
          }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
            📊 Dashboard
          </button>
        </div>
      `;
    } else {
      // Visualização em blocos (grid - design instacar-insights)
      card.className = "card-elevated hover-lift animate-fade-in";
      card.style.cssText = "padding: 1.25rem;"; // p-5 equivalente
      
      // Configuração de status badges (com ícones SVG padronizados)
      const statusConfig = {
        ativa: { label: "Ativa", className: "status-success", icon: getIconSVG('play', 12) },
        pausada: { label: "Pausada", className: "status-warning", icon: getIconSVG('pause', 12) },
        concluida: { label: "Concluída", className: "status-info", icon: getIconSVG('check', 12) },
        cancelada: { label: "Cancelada", className: "status-error", icon: getIconSVG('x', 12) }
      };
      const config = statusConfig[statusClass] || statusConfig.pausada;
      
      card.innerHTML = `
        <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="padding: 0.5rem; border-radius: 0.5rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center;">
              ${getIconSVG('send', 20)}
        </div>
            <div>
              <h3 style="font-weight: 600; color: hsl(var(--foreground)); margin: 0 0 0.25rem 0; font-size: 1rem;">${campanha.nome || "Sem nome"}</h3>
              <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 0;">${periodo}</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="status-badge ${config.className}">
              ${config.icon}
              ${config.label}
            </span>
            <div class="dropdown-menu" style="position: relative;">
              <button onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}', event)" 
                      class="dropdown-trigger-btn">
                ${getIconSVG('moreVertical', 16)}
              </button>
              <div id="dropdown-campanha-${campanha.id}" class="dropdown-content">
                <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}'); if(typeof window.abrirDetalhesCampanha === 'function') window.abrirDetalhesCampanha('${campanha.id}')">
                  ${getIconSVG('eye', 16)}
                  Ver detalhes
                </button>
                ${campanha.ativo && campanha.status === "ativa" ? `
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}'); if(typeof window.dispararCampanha === 'function') window.dispararCampanha('${campanha.id}')">
                    ${getIconSVG('send', 16)}
                    Disparar
                  </button>
                ` : ""}
                <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}'); editarCampanha('${campanha.id}')">
                  ${getIconSVG('edit', 16)}
                  Editar
                </button>
                ${(statusClass === "ativa" || statusClass === "pausada") ? `
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}'); if(typeof window.toggleStatusCampanha === 'function') window.toggleStatusCampanha('${campanha.id}', '${statusClass}')">
                    ${statusClass === "ativa" ? getIconSVG('pause', 16) : getIconSVG('play', 16)}
                    ${statusClass === "ativa" ? "Pausar" : "Retomar"}
                  </button>
                ` : ""}
                <button class="dropdown-item destructive" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('dropdown-campanha-${campanha.id}'); if(typeof window.excluirCampanha === 'function') window.excluirCampanha('${campanha.id}')">
                  ${getIconSVG('trash', 16)}
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
        
        ${descricao && descricao !== "Sem descrição" ? `
          <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin-bottom: 1rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${descricao}
          </p>
        ` : ""}
        
        <div style="display: flex; align-items: center; justify-between; padding-top: 0.75rem; border-top: 1px solid hsl(var(--border));">
          <div style="display: flex; align-items: center; gap: 1rem; font-size: 0.75rem; color: hsl(var(--muted-foreground)); flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 0.25rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              ${dataInicio ? new Date(campanha.data_inicio).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem data"}
            </span>
            <span style="display: flex; align-items: center; gap: 0.25rem;">
              Limite: ${limiteDia}/dia
            </span>
          </div>
          <span style="font-size: 0.75rem; color: hsl(var(--muted-foreground)); white-space: nowrap;">
            ${new Date(campanha.created_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          </span>
        </div>
      `;
      
      // Adicionar menu dropdown de ações (simulado com onclick no botão)
      card.onclick = function(e) {
        if (e.target.closest('button')) return; // Não fazer nada se clicou no botão
        // Pode adicionar ação de abrir detalhes aqui
      };
    }

    return card;
  }

  // Abrir modal para nova campanha
  /**
   * Adiciona tooltips aos labels do formulário de instância Uazapi
   */
  function adicionarTooltipsFormularioInstancia() {
    const mapeamentoLabels = {
      instanciaUazapiNome: "instanciaUazapiNome",
      instanciaUazapiTipoApi: "instanciaUazapiTipoApi",
      instanciaUazapiBaseUrl: "instanciaUazapiBaseUrl",
      instanciaUazapiAdminToken: "instanciaUazapiAdminToken",
      instanciaUazapiToken: "instanciaUazapiToken",
      instanciaUazapiConfigExtra: "instanciaUazapiConfigExtra",
    };

    Object.entries(mapeamentoLabels).forEach(([campoId, configKey]) => {
      const input = document.getElementById(campoId);
      if (!input) return;

      const label = document.querySelector(`label[for="${campoId}"]`);
      if (label && !label.querySelector(".help-icon")) {
        adicionarTooltipAoLabel(label, configKey);
      }
    });
  }

  /**
   * Adiciona tooltips aos labels do formulário de campanha
   */
  function adicionarTooltipsFormularioCampanha() {
    // Mapeamento de labels para IDs de campo
    const mapeamentoLabels = {
      nome: "nome",
      descricao: "descricao",
      periodo_ano: "periodo_ano",
      status: "status",
      data_inicio: "data_inicio",
      data_fim: "data_fim",
      limite_envios_dia: "limite_envios_dia",
      intervalo_minimo_dias: "intervalo_minimo_dias",
      intervalo_envios_segundos: "intervalo_envios_segundos",
      prioridade: "prioridade",
      whatsapp_api_id: "whatsapp_api_id",
      prompt_ia: "prompt_ia",
      template_mensagem: "template_mensagem",
      usar_veiculos: "usar_veiculos",
      usar_vendedor: "usar_vendedor",
      tamanho_lote: "tamanho_lote",
      processar_finais_semana: "processar_finais_semana",
      horario_inicio: "horario_inicio",
      horario_fim: "horario_fim",
    };

    // Adicionar tooltips aos labels
    Object.entries(mapeamentoLabels).forEach(([campoId, configKey]) => {
      const input = document.getElementById(campoId);
      if (!input) return;

      // Encontrar o label associado
      let label = null;
      if (
        input.id === "usar_veiculos" ||
        input.id === "usar_vendedor" ||
        input.id === "processar_finais_semana"
      ) {
        // Para checkboxes, o label pode estar em um elemento pai
        const parent = input.closest("label") || input.parentElement;
        if (parent) {
          // Procurar pelo span dentro do label
          const span = parent.querySelector("span");
          if (span) {
            label = span;
          } else {
            label = parent;
          }
        }
      } else {
        // Tentar primeiro pelo atributo for
        label = document.querySelector(`label[for="${campoId}"]`);

        // Se não encontrou, procurar no mesmo form-group (estrutura comum no HTML)
        if (!label) {
          const formGroup = input.closest(".form-group");
          if (formGroup) {
            label = formGroup.querySelector("label");
          }
        }

        // Se ainda não encontrou, procurar label que contenha o input
        if (!label) {
          label = input.closest("label");
        }
      }

      if (label && !label.querySelector(".help-icon")) {
        // Para checkboxes, adicionar tooltip após o texto do label
        if (input.type === "checkbox") {
          const icon = criarTooltipHelpIcon(configKey);
          if (icon) {
            label.appendChild(icon);
          }
        } else {
          adicionarTooltipAoLabel(label, configKey);
        }
      }
    });
  }

  // Variável global para armazenar lista de clientes elegíveis
  let clientesElegiveis = [];
  let clientesSelecionados = new Set();
  let clientesJaEnviados = new Set(); // Clientes que já receberam mensagens da campanha atual (por ID)
  let telefonesJaEnviados = new Set(); // Telefones que já receberam mensagens da campanha atual

  /**
   * Carrega clientes elegíveis para seleção na campanha
   * Apenas clientes com WhatsApp validado (status_whatsapp = 'valid')
   * Busca todos os clientes em lotes para evitar limite de 1000 do Supabase
   */
  async function carregarClientesParaSelecao() {
    if (!supabaseClient) return;

    try {
      // Mostrar loading
      const container = document.getElementById("listaClientesSelecao");
      if (container) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px">Carregando clientes...</p>';
      }

      // Obter valores de ordenação (com fallback para valores padrão)
      const ordenacaoCampoSalvo = localStorage.getItem('ordenacaoClientesSelecao_campo');
      const ordenacaoDirecaoSalva = localStorage.getItem('ordenacaoClientesSelecao_direcao');
      const ordenacaoCampo = document.getElementById("ordenacaoCampoSelecao")?.value || ordenacaoCampoSalvo || "nome_cliente";
      const ordenacaoDirecao = document.getElementById("ordenacaoDirecaoSelecao")?.value || ordenacaoDirecaoSalva || "asc";
      const ascending = ordenacaoDirecao === "asc";

      // Salvar preferências no localStorage
      localStorage.setItem('ordenacaoClientesSelecao_campo', ordenacaoCampo);
      localStorage.setItem('ordenacaoClientesSelecao_direcao', ordenacaoDirecao);

      // Buscar TODOS os clientes elegíveis em lotes (sem limite de 1000)
      let todosClientes = [];
      let offset = 0;
      const limit = 1000; // Lote máximo do Supabase

      while (true) {
        const { data: clientes, error } = await supabaseClient
          .from("instacar_clientes_envios")
          .select("id, nome_cliente, telefone, status_whatsapp, ultimo_envio, bloqueado_envios")
          .eq("ativo", true)
          .eq("bloqueado_envios", false)
          .eq("status_whatsapp", "valid")
          .order(ordenacaoCampo, { ascending: ascending })
          .range(offset, offset + limit - 1);

        if (error) throw error;

        if (!clientes || clientes.length === 0) {
          break; // Não há mais clientes
        }

        todosClientes.push(...clientes);
        offset += limit;

        // Se retornou menos que o limite, chegamos ao fim
        if (clientes.length < limit) {
          break;
        }
      }

      clientesElegiveis = todosClientes;
      renderizarListaClientesSelecao();
      atualizarContadorSelecao();

      // Mostrar aviso se houver muitos clientes
      if (todosClientes.length > 1000) {
        logger.log(`Carregados ${todosClientes.length} clientes elegíveis para seleção`);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      const container = document.getElementById("listaClientesSelecao");
      if (container) {
        container.innerHTML =
          '<p style="color: red; text-align: center; padding: 20px">Erro ao carregar clientes: ' + error.message + '</p>';
      }
    }
  }

  /**
   * Renderiza lista de clientes para seleção
   */
  function renderizarListaClientesSelecao() {
    const container = document.getElementById("listaClientesSelecao");
    if (!container) return;

    const busca =
      document.getElementById("buscaClientesSelecao")?.value.toLowerCase() ||
      "";
    const filtroApenasNaoEnviados = document.getElementById("filtroApenasNaoEnviados")?.checked || false;
    
    let clientesFiltrados = clientesElegiveis.filter(
      (c) =>
        !busca ||
        (c.nome_cliente || "").toLowerCase().includes(busca) ||
        (c.telefone || "").includes(busca)
    );

    // Aplicar filtro de "apenas não enviados" se ativo
    let clientesOcultadosPeloFiltro = 0;
    if (filtroApenasNaoEnviados) {
      const totalAntes = clientesFiltrados.length;
      clientesFiltrados = clientesFiltrados.filter((c) => {
        // Verificar por ID E por telefone (caso cliente_id seja null no histórico)
        const jaEnviadoPorId = clientesJaEnviados.has(c.id);
        // Normalizar telefone do cliente antes de comparar
        const telefoneClienteNormalizado = normalizarTelefone(c.telefone || "");
        const jaEnviadoPorTelefone = telefoneClienteNormalizado ? telefonesJaEnviados.has(telefoneClienteNormalizado) : false;
        const jaEnviado = jaEnviadoPorId || jaEnviadoPorTelefone;
        
        if (jaEnviado) {
          clientesOcultadosPeloFiltro++;
          console.log(`  ❌ Cliente ${c.nome_cliente} (ID: ${c.id}, Tel: ${c.telefone}, Normalizado: ${telefoneClienteNormalizado}) já recebeu mensagem - removido do filtro`);
        }
        
        return !jaEnviado;
      });
      const totalDepois = clientesFiltrados.length;
      console.log(`🔍 Filtro "apenas não enviados" ativo: ${totalAntes} → ${totalDepois} clientes`);
      console.log(`🔍 Clientes já enviados (IDs):`, Array.from(clientesJaEnviados));
      console.log(`🔍 Telefones já enviados:`, Array.from(telefonesJaEnviados));
      
      // Atualizar mensagem do filtro com contador
      atualizarMensagemFiltroApenasNaoEnviados(clientesOcultadosPeloFiltro, totalDepois);
    } else {
      // Resetar mensagem quando filtro desmarcado
      atualizarMensagemFiltroApenasNaoEnviados(0, clientesFiltrados.length);
    }

    // Ordenar clientes filtrados
    const ordenacaoCampo = document.getElementById("ordenacaoCampoSelecao")?.value || "nome_cliente";
    const ordenacaoDirecao = document.getElementById("ordenacaoDirecaoSelecao")?.value || "asc";
    const ascending = ordenacaoDirecao === "asc";

    clientesFiltrados.sort((a, b) => {
      let valorA = a[ordenacaoCampo];
      let valorB = b[ordenacaoCampo];
      
      // Tratamento para valores nulos
      if (valorA == null) valorA = ordenacaoCampo === "ultimo_envio" ? new Date(0) : "";
      if (valorB == null) valorB = ordenacaoCampo === "ultimo_envio" ? new Date(0) : "";
      
      // Tratamento especial para timestamps
      if (ordenacaoCampo === "ultimo_envio") {
        const dataA = valorA ? new Date(valorA).getTime() : 0;
        const dataB = valorB ? new Date(valorB).getTime() : 0;
        return ascending ? dataA - dataB : dataB - dataA;
      }
      
      // Tratamento especial para booleanos
      if (ordenacaoCampo === "bloqueado_envios") {
        const boolA = valorA === true ? 1 : 0;
        const boolB = valorB === true ? 1 : 0;
        return ascending ? boolA - boolB : boolB - boolA;
      }
      
      // Comparação padrão (strings e outros)
      if (valorA < valorB) return ascending ? -1 : 1;
      if (valorA > valorB) return ascending ? 1 : -1;
      return 0;
    });

    if (clientesFiltrados.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px">Nenhum cliente encontrado</p>';
      return;
    }

    let html = "";
    clientesFiltrados.forEach((cliente) => {
      const isSelected = clientesSelecionados.has(cliente.id);
      // Verificar se já recebeu mensagem por ID ou por telefone
      const jaEnviadoPorId = clientesJaEnviados.has(cliente.id);
      // Normalizar telefone do cliente antes de comparar
      const telefoneClienteOriginal = cliente.telefone || "";
      const telefoneClienteNormalizado = normalizarTelefone(telefoneClienteOriginal);
      const jaEnviadoPorTelefone = telefoneClienteNormalizado ? telefonesJaEnviados.has(telefoneClienteNormalizado) : false;
      const jaEnviado = jaEnviadoPorId || jaEnviadoPorTelefone;
      
      // Debug: log apenas para clientes que deveriam estar marcados mas não estão
      if (telefoneClienteNormalizado && telefonesJaEnviados.has(telefoneClienteNormalizado) && !jaEnviado) {
        console.log(`⚠️ Cliente ${cliente.nome_cliente} (Tel: ${telefoneClienteOriginal}, Normalizado: ${telefoneClienteNormalizado}) deveria estar marcado como enviado!`);
      }
      
      // Todos os clientes aqui já são 'valid', mas mantemos o badge para consistência
      const statusBadge =
        '<span style="color: #4caf50; font-size: 10px;">✅ Válido</span>';
      
      // Badge indicando que já recebeu mensagem
      const badgeJaEnviado = jaEnviado
        ? '<span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 6px;">📨 Já enviado</span>'
        : '';

      // Estilo do label se já foi enviado
      const labelStyle = jaEnviado
        ? 'display: flex; align-items: flex-start; padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; gap: 8px; background: #f0f7ff; border-left: 3px solid #2196F3;'
        : 'display: flex; align-items: flex-start; padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; gap: 8px';

      html += `
        <label style="${labelStyle}">
          <input
            type="checkbox"
            data-cliente-id="${cliente.id}"
            ${isSelected ? "checked" : ""}
            onchange="toggleClienteSelecao('${cliente.id}')"
            style="margin-top: 2px; flex-shrink: 0; width: 18px; height: 18px; cursor: pointer"
          />
          <span style="flex: 1; min-width: 0">
            <div style="font-weight: 600; margin-bottom: 4px; word-break: break-word; display: flex; align-items: center;">
              ${cliente.nome_cliente || "-"}
              ${badgeJaEnviado}
            </div>
            <div style="color: #666; font-size: 13px; margin-bottom: 2px">${
              cliente.telefone
            }</div>
            <div>${statusBadge}</div>
          </span>
        </label>
      `;
    });

    container.innerHTML = html;
    
    // Atualizar contador após renderizar (para refletir total correto com/sem filtro)
    atualizarContadorSelecao();
  }

  /**
   * Alterna seleção de um cliente
   */
  function toggleClienteSelecao(clienteId) {
    if (clientesSelecionados.has(clienteId)) {
      clientesSelecionados.delete(clienteId);
    } else {
      clientesSelecionados.add(clienteId);
    }
    atualizarContadorSelecao();
  }

  /**
   * Atualiza contador de clientes selecionados e mostra informações sobre clientes já enviados
   */
  function atualizarContadorSelecao() {
    const contador = document.getElementById("contadorClientesSelecionados");
    if (contador) {
      const total = clientesSelecionados.size;
      
      // Verificar se o filtro está ativo para mostrar o total correto
      const filtroApenasNaoEnviados = document.getElementById("filtroApenasNaoEnviados")?.checked || false;
      let totalElegiveis = clientesElegiveis.length;
      
      if (filtroApenasNaoEnviados) {
        // Se filtro ativo, contar apenas clientes que não receberam mensagens
        const clientesVisiveis = clientesElegiveis.filter((c) => {
          const jaEnviadoPorId = clientesJaEnviados.has(c.id);
          const telefoneClienteNormalizado = normalizarTelefone(c.telefone || "");
          const jaEnviadoPorTelefone = telefoneClienteNormalizado ? telefonesJaEnviados.has(telefoneClienteNormalizado) : false;
          return !(jaEnviadoPorId || jaEnviadoPorTelefone);
        });
        totalElegiveis = clientesVisiveis.length;
      }
      
      contador.textContent = `${total} de ${totalElegiveis} clientes selecionados`;
      
      // Atualizar estimativas quando a seleção mudar
      if (typeof atualizarEstimativas === 'function') {
        setTimeout(atualizarEstimativas, 100);
      }
    }
    
    // Atualizar contador de clientes já enviados
    atualizarContadorClientesJaEnviados();
  }
  
  /**
   * Atualiza a mensagem do filtro "apenas não enviados" com contador de clientes ocultados
   */
  function atualizarMensagemFiltroApenasNaoEnviados(clientesOcultados, clientesVisiveis) {
    const filtroCheckbox = document.getElementById("filtroApenasNaoEnviados");
    if (!filtroCheckbox) return;
    
    // Encontrar o elemento de mensagem do filtro (small abaixo do checkbox)
    const filtroContainer = filtroCheckbox.closest("div");
    if (!filtroContainer) return;
    
    // Buscar ou criar elemento de contador
    let contadorFiltro = document.getElementById("contadorFiltroApenasNaoEnviados");
    if (!contadorFiltro) {
      contadorFiltro = document.createElement("div");
      contadorFiltro.id = "contadorFiltroApenasNaoEnviados";
      contadorFiltro.style.marginTop = "8px";
      contadorFiltro.style.marginLeft = "26px";
      contadorFiltro.style.padding = "8px 12px";
      contadorFiltro.style.borderRadius = "4px";
      contadorFiltro.style.fontSize = "12px";
      filtroContainer.appendChild(contadorFiltro);
    }
    
    // Obter total de registros (igual à dashboard) se disponível
    const totalRegistrosEnviados = window.totalRegistrosEnviadosCampanha || 0;
    const textoRegistros = totalRegistrosEnviados > 0 && totalRegistrosEnviados !== clientesOcultados
      ? ` <small style="color: #666;">(Dashboard: ${totalRegistrosEnviados} registros enviados)</small>`
      : '';
    
    if (filtroCheckbox.checked && clientesOcultados > 0) {
      contadorFiltro.style.display = "block";
      contadorFiltro.style.background = "#fff3cd";
      contadorFiltro.style.border = "1px solid #ffc107";
      contadorFiltro.style.color = "#856404";
      contadorFiltro.innerHTML = 
        `<strong>ℹ️ Filtro ativo:</strong> ${clientesOcultados.toLocaleString()} cliente(s) que já receberam mensagens foram ocultados. ` +
        `Exibindo ${clientesVisiveis.toLocaleString()} cliente(s) que ainda não receberam mensagens.${textoRegistros}`;
    } else if (filtroCheckbox.checked) {
      contadorFiltro.style.display = "block";
      contadorFiltro.style.background = "#e3f2fd";
      contadorFiltro.style.border = "1px solid #2196F3";
      contadorFiltro.style.color = "#1976d2";
      contadorFiltro.innerHTML = 
        `<strong>✅ Filtro ativo:</strong> Todos os ${clientesVisiveis.toLocaleString()} cliente(s) exibidos ainda não receberam mensagens desta campanha.${textoRegistros}`;
    } else {
      contadorFiltro.style.display = "none";
    }
  }
  
  /**
   * Atualiza o contador e informações sobre clientes já enviados
   * IMPORTANTE: Conta apenas clientes que estão na lista de elegíveis E que já receberam mensagens
   */
  function atualizarContadorClientesJaEnviados() {
    const contadorDiv = document.getElementById("contadorClientesJaEnviados");
    const textoContador = document.getElementById("textoContadorJaEnviados");
    
    if (!contadorDiv || !textoContador) return;
    
    // Contar clientes únicos que já receberam mensagens
    // IMPORTANTE: A dashboard conta registros do histórico (pode ter múltiplos por cliente)
    // O contador deve contar apenas clientes ELEGÍVEIS que já receberam (não todos os IDs do histórico)
    // Um cliente pode estar em ambos os Sets (por ID e por telefone), então precisamos contar únicos
    const clientesUnicosJaEnviados = new Set();
    
    // Contar apenas clientes que estão na lista de elegíveis E que já receberam mensagens
    // Isso garante que o contador e o filtro usem a mesma lógica
    clientesElegiveis.forEach(cliente => {
      // Verificar por ID
      const jaEnviadoPorId = clientesJaEnviados.has(cliente.id);
      
      // Verificar por telefone (caso cliente_id seja null no histórico)
      let jaEnviadoPorTelefone = false;
      if (cliente.telefone) {
        const telefoneNormalizado = normalizarTelefone(cliente.telefone);
        if (telefoneNormalizado && telefonesJaEnviados.has(telefoneNormalizado)) {
          jaEnviadoPorTelefone = true;
        }
      }
      
      // Se recebeu por ID ou por telefone, adicionar ao Set
      if (jaEnviadoPorId || jaEnviadoPorTelefone) {
        clientesUnicosJaEnviados.add(cliente.id);
      }
    });
    
    const totalJaEnviados = clientesUnicosJaEnviados.size;
    
    // Obter total de registros (igual à dashboard) se disponível
    const totalRegistrosEnviados = window.totalRegistrosEnviadosCampanha || totalJaEnviados;
    const totalClientesUnicosNoHistorico = window.totalClientesUnicosEnviadosCampanha || totalJaEnviados;
    
    // Log para debug
    console.log(`📊 Contador: ${totalJaEnviados} clientes elegíveis já receberam mensagens (de ${clientesElegiveis.length} elegíveis)`);
    console.log(`📊 Total de registros enviados (dashboard): ${totalRegistrosEnviados}`);
    console.log(`📊 Breakdown: ${clientesJaEnviados.size} IDs no histórico, ${telefonesJaEnviados.size} telefones únicos no histórico`);
    console.log(`📊 Clientes únicos no histórico (pode incluir não elegíveis): ${totalClientesUnicosNoHistorico}`);
    console.log(`📊 Nota: Contador conta apenas clientes elegíveis (mesma lógica do filtro)`);
    
    const totalElegiveis = clientesElegiveis.length;
    const totalNovos = totalElegiveis - totalJaEnviados;
    
    if (totalJaEnviados > 0) {
      contadorDiv.style.display = "block";
      
      // Verificar quantos clientes já enviados estão selecionados
      const clientesJaEnviadosSelecionados = Array.from(clientesSelecionados).filter(id => 
        clientesJaEnviados.has(id) || 
        (() => {
          const cliente = clientesElegiveis.find(c => c.id === id);
          if (cliente && cliente.telefone) {
            const telefoneNormalizado = normalizarTelefone(cliente.telefone);
            return telefoneNormalizado && telefonesJaEnviados.has(telefoneNormalizado);
          }
          return false;
        })()
      ).length;
      
      const totalSelecionados = clientesSelecionados.size;
      
      // Mostrar diferença entre registros e clientes únicos se houver
      const diferencaRegistros = totalRegistrosEnviados - totalJaEnviados;
      const diferencaClientesHistorico = totalClientesUnicosNoHistorico - totalJaEnviados;
      
      let textoDiferenca = ` <small style="color: #666;">(Dashboard: ${totalRegistrosEnviados} registros`;
      if (diferencaRegistros > 0) {
        textoDiferenca += ` - alguns clientes receberam múltiplas mensagens`;
      }
      if (diferencaClientesHistorico > 0) {
        textoDiferenca += ` - ${diferencaClientesHistorico} cliente(s) do histórico não está(ão) mais elegível(is)`;
      }
      textoDiferenca += `)</small>`;
      
      if (clientesJaEnviadosSelecionados > 0) {
        textoContador.innerHTML = 
          `<strong>${clientesJaEnviadosSelecionados} cliente(s) já enviado(s) selecionado(s)</strong> de ${totalSelecionados} selecionados. ` +
          `Estes serão pulados automaticamente pelo sistema durante a execução. ` +
          `Total de clientes elegíveis já enviados: ${totalJaEnviados} de ${totalElegiveis} (${totalNovos} novos disponíveis)${textoDiferenca}.`;
        contadorDiv.style.background = "#fff3cd";
        contadorDiv.style.border = "1px solid #ffc107";
        contadorDiv.style.color = "#856404";
      } else {
        textoContador.innerHTML = 
          `${totalJaEnviados} de ${totalElegiveis} clientes elegíveis já receberam mensagens desta campanha ` +
          `(${totalNovos} novos disponíveis)${textoDiferenca}. ` +
          `O sistema sempre valida no backend antes de enviar.`;
        contadorDiv.style.background = "#e3f2fd";
        contadorDiv.style.border = "1px solid #2196F3";
        contadorDiv.style.color = "#1976d2";
      }
    } else {
      contadorDiv.style.display = "none";
    }
  }

  /**
   * Seleciona todos os clientes
   */
  function selecionarTodosClientes() {
    clientesElegiveis.forEach((c) => clientesSelecionados.add(c.id));
    renderizarListaClientesSelecao();
    atualizarContadorSelecao();
  }

  /**
   * Desmarca todos os clientes
   */
  function desmarcarTodosClientes() {
    clientesSelecionados.clear();
    renderizarListaClientesSelecao();
    atualizarContadorSelecao();
  }

  /**
   * Inverte seleção de clientes
   */
  function inverterSelecaoClientes() {
    clientesElegiveis.forEach((c) => {
      if (clientesSelecionados.has(c.id)) {
        clientesSelecionados.delete(c.id);
      } else {
        clientesSelecionados.add(c.id);
      }
    });
    renderizarListaClientesSelecao();
    atualizarContadorSelecao();
  }

  /**
   * Filtra clientes na lista de seleção
   */
  function filtrarClientesSelecao() {
    renderizarListaClientesSelecao();
  }

  /**
   * Carrega clientes selecionados de uma campanha
   */
  async function carregarClientesSelecionadosCampanha(campanhaId) {
    if (!supabaseClient || !campanhaId) {
      clientesSelecionados.clear();
      clientesJaEnviados.clear();
      telefonesJaEnviados.clear();
      return;
    }

    try {
      // Buscar clientes selecionados manualmente
      const { data: selecionados, error: errorSelecionados } = await supabaseClient
        .from("instacar_campanhas_clientes")
        .select("cliente_id")
        .eq("campanha_id", campanhaId);

      if (errorSelecionados) throw errorSelecionados;

      // Inicializar seleção vazia - não carregar clientes selecionados anteriormente
      // O usuário deve selecionar manualmente os clientes desejados
      clientesSelecionados = new Set();

      // Buscar clientes que já receberam mensagens desta campanha
      // IMPORTANTE: Buscar registros únicos por telefone OU cliente_id para evitar duplicatas
      const { data: historico, error: errorHistorico } = await supabaseClient
        .from("instacar_historico_envios")
        .select("cliente_id, telefone")
        .eq("campanha_id", campanhaId)
        .eq("status_envio", "enviado");

      if (errorHistorico) {
        console.error("Erro ao buscar histórico de envios:", errorHistorico);
        clientesJaEnviados.clear();
      } else {
        console.log(`📊 Histórico encontrado: ${historico?.length || 0} envios para campanha ${campanhaId}`);
        
        // Criar Set com clientes que já receberam mensagens
        const idsEnviados = new Set();
        const telefonesEnviados = new Set();
        
        (historico || []).forEach((h) => {
          if (h.cliente_id) {
            idsEnviados.add(h.cliente_id);
          }
          if (h.telefone) {
            // Normalizar telefone antes de adicionar ao Set
            const telefoneOriginal = h.telefone;
            const telefoneNormalizado = normalizarTelefone(h.telefone);
            if (telefoneNormalizado) {
              telefonesEnviados.add(telefoneNormalizado);
              if (telefoneOriginal !== telefoneNormalizado) {
                console.log(`📞 Telefone normalizado: ${telefoneOriginal} → ${telefoneNormalizado}`);
              }
            }
          }
        });

        // IMPORTANTE: A dashboard conta TODOS os registros do histórico (pode ter múltiplos por cliente)
        // Armazenar total de registros para exibir no contador (igual à dashboard)
        const totalRegistrosHistorico = historico?.length || 0;
        window.totalRegistrosEnviadosCampanha = totalRegistrosHistorico;
        window.totalClientesUnicosEnviadosCampanha = idsEnviados.size;
        
        console.log(`📊 IDs encontrados no histórico: ${idsEnviados.size}, Telefones: ${telefonesEnviados.size}`);
        console.log(`📊 Total de registros no histórico (igual à dashboard): ${totalRegistrosHistorico}`);
        console.log(`📊 Total de clientes únicos: ${idsEnviados.size}`);
        console.log(`📊 Telefones normalizados coletados:`, Array.from(telefonesEnviados));

        // Sempre buscar por telefone também (mesmo que tenha cliente_id)
        // Isso garante que clientes com cliente_id null sejam encontrados
        if (telefonesEnviados.size > 0) {
          const telefonesArray = Array.from(telefonesEnviados);
          console.log(`🔍 Buscando clientes por telefone (${telefonesArray.length} telefones):`, telefonesArray);
          
          // Normalizar telefones antes de buscar (garantir formato consistente)
          const telefonesNormalizados = telefonesArray.map(t => normalizarTelefone(t)).filter(t => t);
          console.log(`🔍 Telefones normalizados para busca:`, telefonesNormalizados);
          
          // Buscar clientes que têm qualquer um desses telefones (buscar por telefones normalizados E originais)
          // Nota: Supabase pode ter telefones em formato diferente, então buscamos ambos
          const telefonesParaBusca = [...new Set([...telefonesArray, ...telefonesNormalizados])];
          const { data: clientesPorTelefone, error: errorTelefone } = await supabaseClient
            .from("instacar_clientes_envios")
            .select("id, telefone")
            .in("telefone", telefonesParaBusca);

          if (errorTelefone) {
            console.error("Erro ao buscar clientes por telefone:", errorTelefone);
          } else if (clientesPorTelefone) {
            console.log(`✅ Encontrados ${clientesPorTelefone.length} clientes por telefone`);
            clientesPorTelefone.forEach((c) => {
              idsEnviados.add(c.id);
              console.log(`  - Cliente ID: ${c.id}, Telefone: ${c.telefone}`);
            });
          } else {
            console.log(`⚠️ Nenhum cliente encontrado por telefone. Verificando se telefones estão normalizados...`);
            // Verificar se os telefones no histórico estão no mesmo formato dos clientes
            const { data: todosClientes, error: errorTodos } = await supabaseClient
              .from("instacar_clientes_envios")
              .select("id, telefone")
              .limit(5);
            
            if (!errorTodos && todosClientes) {
              console.log(`📋 Exemplo de telefones na tabela clientes:`, todosClientes.map(c => c.telefone));
              console.log(`📋 Telefones do histórico:`, telefonesArray);
            }
          }
        }

        clientesJaEnviados = idsEnviados;
        telefonesJaEnviados = telefonesEnviados; // Armazenar telefones também
        
        // IMPORTANTE: A dashboard conta TODOS os registros do histórico com status_envio = 'enviado'
        // O contador deve mostrar o mesmo número para consistência
        // Mas para o filtro, usamos clientes únicos (não queremos mostrar o mesmo cliente múltiplas vezes)
        // Nota: totalRegistrosHistorico já foi declarado acima (linha 3228)
        const totalClientesUnicos = idsEnviados.size; // Total de clientes únicos (para filtro)
        const totalTelefonesUnicos = telefonesEnviados.size;
        
        // Armazenar total de registros para exibir no contador (igual à dashboard)
        // Nota: window.totalRegistrosEnviadosCampanha já foi definido acima (linha 3229)
        window.totalClientesUnicosEnviadosCampanha = totalClientesUnicos;
        
        console.log(`✅ Total de registros no histórico (igual à dashboard): ${window.totalRegistrosEnviadosCampanha}`);
        console.log(`✅ Total de clientes únicos (por ID): ${totalClientesUnicos}`);
        console.log(`✅ Total de telefones únicos: ${totalTelefonesUnicos}`);
        console.log(`✅ IDs finais:`, Array.from(idsEnviados));
        console.log(`✅ Telefones finais:`, Array.from(telefonesEnviados));
        
        // NÃO marcar automaticamente os clientes já enviados
        // Eles serão filtrados pela checkbox "Mostrar apenas clientes que ainda não receberam mensagens"
      }

      renderizarListaClientesSelecao();
      atualizarContadorSelecao();
      
      // Atualizar contador de clientes já enviados após carregar histórico
      setTimeout(() => {
        atualizarContadorClientesJaEnviados();
      }, 100);
    } catch (error) {
      console.error("Erro ao carregar clientes selecionados:", error);
      clientesSelecionados.clear();
      clientesJaEnviados.clear();
    }
  }

  /**
   * Salva seleção de clientes para uma campanha
   * Valida se há clientes já enviados na seleção e alerta o usuário
   */
  async function salvarSelecaoClientesCampanha(campanhaId, mostrarAlertaDuplicatas = true) {
    if (!supabaseClient || !campanhaId) {
      console.error('salvarSelecaoClientesCampanha: supabaseClient ou campanhaId não fornecido', { supabaseClient: !!supabaseClient, campanhaId });
      return;
    }

    try {
      console.log(`Salvando seleção de clientes para campanha ${campanhaId}. Total selecionados: ${clientesSelecionados.size}`);
      
      // VALIDAÇÃO: Verificar se há clientes já enviados na seleção
      if (mostrarAlertaDuplicatas && clientesSelecionados.size > 0 && (clientesJaEnviados.size > 0 || telefonesJaEnviados.size > 0)) {
        const clientesSelecionadosArray = Array.from(clientesSelecionados);
        const clientesJaEnviadosNaSelecao = [];
        
        // Verificar por ID
        clientesSelecionadosArray.forEach((clienteId) => {
          if (clientesJaEnviados.has(clienteId)) {
            const cliente = clientesElegiveis.find(c => c.id === clienteId);
            if (cliente) {
              clientesJaEnviadosNaSelecao.push({
                id: clienteId,
                nome: cliente.nome_cliente || 'Sem nome',
                telefone: cliente.telefone || 'Sem telefone'
              });
            }
          }
        });
        
        // Verificar por telefone (caso cliente_id seja null no histórico)
        clientesSelecionadosArray.forEach((clienteId) => {
          const cliente = clientesElegiveis.find(c => c.id === clienteId);
          if (cliente && cliente.telefone) {
            const telefoneNormalizado = normalizarTelefone(cliente.telefone);
            if (telefoneNormalizado && telefonesJaEnviados.has(telefoneNormalizado)) {
              // Só adicionar se não estiver já na lista (evitar duplicata)
              if (!clientesJaEnviadosNaSelecao.find(c => c.id === clienteId)) {
                clientesJaEnviadosNaSelecao.push({
                  id: clienteId,
                  nome: cliente.nome_cliente || 'Sem nome',
                  telefone: cliente.telefone || 'Sem telefone'
                });
              }
            }
          }
        });
        
        // Se encontrou clientes já enviados, alertar usuário
        if (clientesJaEnviadosNaSelecao.length > 0) {
          const totalSelecionados = clientesSelecionados.size;
          const totalJaEnviados = clientesJaEnviadosNaSelecao.length;
          const totalNovos = totalSelecionados - totalJaEnviados;
          
          const mensagem = 
            `⚠️ Atenção: ${totalJaEnviados} de ${totalSelecionados} clientes selecionados já receberam mensagens desta campanha.\n\n` +
            `📊 Resumo:\n` +
            `• Clientes novos: ${totalNovos}\n` +
            `• Clientes já enviados: ${totalJaEnviados}\n\n` +
            `ℹ️ O sistema sempre valida no backend antes de enviar, então estes clientes serão pulados automaticamente.\n\n` +
            `Deseja continuar e salvar a seleção mesmo assim?`;
          
          const continuar = confirm(mensagem);
          
          if (!continuar) {
            console.log('Salvamento cancelado pelo usuário devido a clientes já enviados na seleção');
            return false; // Retorna false para indicar que não salvou
          }
          
          // Opção: Remover automaticamente clientes já enviados
          const removerAutomaticamente = confirm(
            `Deseja remover automaticamente os ${totalJaEnviados} clientes já enviados da seleção?\n\n` +
            `(Apenas os ${totalNovos} clientes novos serão salvos)`
          );
          
          if (removerAutomaticamente) {
            // Remover clientes já enviados da seleção
            clientesJaEnviadosNaSelecao.forEach(cliente => {
              clientesSelecionados.delete(cliente.id);
            });
            
            console.log(`Removidos ${clientesJaEnviadosNaSelecao.length} clientes já enviados da seleção. Restam ${clientesSelecionados.size} clientes.`);
            
            // Atualizar interface
            renderizarListaClientesSelecao();
            atualizarContadorSelecao();
            
            mostrarAlerta(
              `${totalJaEnviados} clientes já enviados foram removidos automaticamente da seleção. ${clientesSelecionados.size} clientes novos serão salvos.`,
              "info"
            );
          }
        }
      }
      
      // Deletar seleção atual
      const { error: deleteError } = await supabaseClient
        .from("instacar_campanhas_clientes")
        .delete()
        .eq("campanha_id", campanhaId);

      if (deleteError) {
        console.error('Erro ao deletar seleção anterior:', deleteError);
        throw deleteError;
      }

      // Se há clientes selecionados, inserir novos
      if (clientesSelecionados.size > 0) {
        const registros = Array.from(clientesSelecionados).map((clienteId) => ({
          campanha_id: campanhaId,
          cliente_id: clienteId,
        }));

        console.log(`Inserindo ${registros.length} registros na tabela instacar_campanhas_clientes`);
        
        const { data, error } = await supabaseClient
          .from("instacar_campanhas_clientes")
          .insert(registros)
          .select("id");

        if (error) {
          console.error('Erro ao inserir seleção de clientes:', error);
          throw error;
        }

        console.log(`Seleção de clientes salva com sucesso. ${data?.length || 0} registros inseridos.`);
        return true; // Retorna true para indicar que salvou com sucesso
      } else {
        console.log('Nenhum cliente selecionado. Seleção anterior foi removida.');
        return true; // Retorna true mesmo sem clientes (seleção foi limpa)
      }
    } catch (error) {
      console.error("Erro ao salvar seleção de clientes:", error);
      throw error;
    }
  }

  async function abrirModalNovaCampanha() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    // Verificar se o modal existe antes de tentar acessá-lo
    const modal = document.getElementById("modalCampanha");
    const modalTitle = document.getElementById("modalTitle");
    const formCampanha = document.getElementById("formCampanha");
    const campanhaId = document.getElementById("campanhaId");
    const whatsappApiId = document.getElementById("whatsapp_api_id");
    const intervaloEnviosSegundos = document.getElementById("intervalo_envios_segundos");
    
    if (!modal || !modalTitle || !formCampanha || !campanhaId) {
      console.error("Modal de campanha não encontrado. Elementos necessários:", {
        modal: !!modal,
        modalTitle: !!modalTitle,
        formCampanha: !!formCampanha,
        campanhaId: !!campanhaId
      });
      mostrarAlerta("Erro: Modal de campanha não encontrado. Recarregue a página.", "error");
      return;
    }

    // Abrir o modal primeiro
    modal.classList.add("active");

    modalTitle.textContent = "Nova Campanha";
    if (formCampanha) formCampanha.reset();
    if (campanhaId) campanhaId.value = "";
    if (whatsappApiId) whatsappApiId.value = "";
    // Definir valor padrão do intervalo (130 = base para aleatorização)
    if (intervaloEnviosSegundos) intervaloEnviosSegundos.value = 130;

    // Limpar seleção de clientes e histórico de envios
    clientesSelecionados.clear();
    clientesJaEnviados.clear();
    telefonesJaEnviados.clear();
    const buscaClientesSelecao = document.getElementById("buscaClientesSelecao");
    if (buscaClientesSelecao) buscaClientesSelecao.value = "";
    
    // Marcar checkbox "apenas não enviados" por padrão (para não exibir clientes já enviados)
    const filtroCheckbox = document.getElementById("filtroApenasNaoEnviados");
    if (filtroCheckbox) {
      filtroCheckbox.checked = true;
    }

    // Carregar instâncias para o select
    await carregarInstanciasParaSelect();

    // Carregar clientes para seleção
    await carregarClientesParaSelecao();
    
    // Atualizar validação do prompt (inicializar como obrigatório)
    setTimeout(() => {
      if (typeof window.atualizarValidacaoPrompt === 'function') {
        window.atualizarValidacaoPrompt();
      }
    }, 100);

    document.getElementById("modalCampanha").classList.add("active");

    // Configurar intervalos pré-definidos
    configurarIntervalosPredefinidos();

    // Adicionar tooltips após um pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
      adicionarTooltipsFormularioCampanha();
    }, 100);
  }

  /**
   * Configura os event listeners para opções pré-definidas de intervalo
   */
  function configurarIntervalosPredefinidos() {
    const intervaloInput = document.getElementById("intervalo_envios_segundos");
    const radioButtons = document.querySelectorAll('input[name="intervalo_preset"]');

    if (!intervaloInput || radioButtons.length === 0) return;

    // Mapeamento de opções pré-definidas para valores médios
    const opcoesIntervalo = {
      muito_curto: 3,      // 1-5s, média ~3s
      curto: 12,          // 5-20s, média ~12s
      medio: 35,          // 20-50s, média ~35s
      longo: 85,          // 50-120s, média ~85s
      muito_longo: 210,   // 120-300s, média ~210s
      padrao: 130,        // 130-150s aleatorizado (valor base)
      personalizado: null // Usa valor do campo
    };

    // Quando uma opção pré-definida for selecionada
    radioButtons.forEach(radio => {
      radio.addEventListener("change", function() {
        const valor = opcoesIntervalo[this.value];
        if (valor !== null) {
          intervaloInput.value = valor;
        }
        // Atualizar estimativas sempre que opção mudar (usa range completo)
        if (typeof atualizarEstimativas === 'function') {
          atualizarEstimativas();
        }
        // Atualizar classes CSS para compatibilidade
        atualizarClassesIntervaloPreset();
      });
    });

    // Atualizar classes CSS inicialmente
    atualizarClassesIntervaloPreset();

    // Quando o campo numérico for alterado manualmente
    intervaloInput.addEventListener("input", function() {
      const valor = parseInt(this.value) || 0;
      
      // Verificar qual opção corresponde ao valor
      let opcaoSelecionada = null;
      
      if (valor >= 1 && valor <= 5) {
        opcaoSelecionada = "muito_curto";
      } else if (valor > 5 && valor <= 20) {
        opcaoSelecionada = "curto";
      } else if (valor > 20 && valor <= 50) {
        opcaoSelecionada = "medio";
      } else if (valor > 50 && valor <= 120) {
        opcaoSelecionada = "longo";
      } else if (valor > 120 && valor <= 300) {
        opcaoSelecionada = "muito_longo";
      } else if (valor === 130) {
        opcaoSelecionada = "padrao";
      } else {
        opcaoSelecionada = "personalizado";
      }

      // Marcar a opção correspondente
      const radioCorrespondente = document.querySelector(`input[name="intervalo_preset"][value="${opcaoSelecionada}"]`);
      if (radioCorrespondente) {
        radioCorrespondente.checked = true;
        atualizarClassesIntervaloPreset();
      }
    });
  }

  /**
   * Atualiza classes CSS das opções pré-definidas para compatibilidade
   */
  function atualizarClassesIntervaloPreset() {
    const radioButtons = document.querySelectorAll('input[name="intervalo_preset"]');
    radioButtons.forEach(radio => {
      const label = radio.closest('.intervalo-preset-option');
      if (label) {
        if (radio.checked) {
          label.classList.add('selected');
        } else {
          label.classList.remove('selected');
        }
      }
    });
  }

  /**
   * Seleciona a opção pré-definida correspondente ao valor do intervalo
   */
  function selecionarOpcaoIntervalo(valor) {
    if (!valor) {
      valor = 130; // Padrão
    }

    const valorNum = parseInt(valor);
    let opcaoSelecionada = "padrao";

    if (valorNum >= 1 && valorNum <= 5) {
      opcaoSelecionada = "muito_curto";
    } else if (valorNum > 5 && valorNum <= 20) {
      opcaoSelecionada = "curto";
    } else if (valorNum > 20 && valorNum <= 50) {
      opcaoSelecionada = "medio";
    } else if (valorNum > 50 && valorNum <= 120) {
      opcaoSelecionada = "longo";
    } else if (valorNum > 120 && valorNum <= 300) {
      opcaoSelecionada = "muito_longo";
    } else if (valorNum === 130) {
      opcaoSelecionada = "padrao";
    } else {
      opcaoSelecionada = "personalizado";
    }

    const radioCorrespondente = document.querySelector(`input[name="intervalo_preset"][value="${opcaoSelecionada}"]`);
    if (radioCorrespondente) {
      radioCorrespondente.checked = true;
      atualizarClassesIntervaloPreset();
    }
  }

  // Editar campanha
  /**
   * Normaliza formato de hora para HH:MM:SS
   * Aceita HH:MM ou HH:MM:SS e retorna sempre HH:MM:SS
   * Evita duplicar segundos se já existirem
   * @param {string} hora - Hora no formato HH:MM ou HH:MM:SS
   * @returns {string|null} Hora normalizada no formato HH:MM:SS ou null se inválido
   */
  function normalizarHora(hora) {
    if (!hora) return null;
    
    // Remover espaços
    const horaLimpa = hora.trim();
    
    // Se vazio após limpar, retornar null
    if (!horaLimpa) return null;
    
    // Dividir por ':'
    const partes = horaLimpa.split(':');
    
    // Se já tem 3 partes (HH:MM:SS), retornar como está (já está no formato correto)
    if (partes.length === 3) {
      return horaLimpa;
    }
    
    // Se tem 2 partes (HH:MM), adicionar :00
    if (partes.length === 2) {
      return horaLimpa + ':00';
    }
    
    // Se tem mais de 3 partes (HH:MM:SS:XX), pegar apenas as 3 primeiras
    if (partes.length > 3) {
      return partes.slice(0, 3).join(':');
    }
    
    // Formato inválido (menos de 2 partes), retornar null
    return null;
  }

  async function editarCampanha(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_campanhas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

    // Verificar se o modal existe antes de tentar acessá-lo
    // O modal deve estar sempre no DOM (fora do contentArea), mas vamos garantir
    let modal = document.getElementById("modalCampanha");
    let modalTitle = document.getElementById("modalTitle");
    let campanhaId = document.getElementById("campanhaId");
    
    // Se o modal não existir, pode ter sido removido acidentalmente - tentar recriar estrutura básica
    if (!modal) {
      console.warn("Modal de campanha não encontrado no DOM. Tentando recriar...");
      // O modal deveria estar no index.html, mas se não estiver, vamos criar um placeholder
      // Na prática, isso não deveria acontecer, mas é uma medida de segurança
      mostrarAlerta("Erro: Modal de campanha não encontrado. Recarregue a página.", "error");
      return;
    }
    
    if (!modalTitle || !campanhaId) {
      console.error("Modal de campanha encontrado, mas elementos internos faltando:", {
        modal: !!modal,
        modalTitle: !!modalTitle,
        campanhaId: !!campanhaId
      });
      mostrarAlerta("Erro: Estrutura do modal de campanha incompleta. Recarregue a página.", "error");
      return;
    }

      // Abrir o modal primeiro
      modal.classList.add("active");
      
      modalTitle.textContent = "Editar Campanha";
      campanhaId.value = data.id;
      
      // Preencher campos com verificações de null
      const nomeEl = document.getElementById("nome");
      const descricaoEl = document.getElementById("descricao");
      const periodoAnoEl = document.getElementById("periodo_ano");
      const statusEl = document.getElementById("status");
      const dataInicioEl = document.getElementById("data_inicio");
      const dataFimEl = document.getElementById("data_fim");
      const limiteEnviosDiaEl = document.getElementById("limite_envios_dia");
      const intervaloMinimoDiasEl = document.getElementById("intervalo_minimo_dias");
      const intervaloEnviosSegundosEl = document.getElementById("intervalo_envios_segundos");
      
      if (nomeEl) nomeEl.value = data.nome || "";
      if (descricaoEl) descricaoEl.value = data.descricao || "";
      if (periodoAnoEl) periodoAnoEl.value = data.periodo_ano || "";
      if (statusEl) statusEl.value = data.status || "ativa";
      if (dataInicioEl) dataInicioEl.value = data.data_inicio || "";
      if (dataFimEl) dataFimEl.value = data.data_fim || "";
      if (limiteEnviosDiaEl) limiteEnviosDiaEl.value = data.limite_envios_dia || 200;
      if (intervaloMinimoDiasEl) intervaloMinimoDiasEl.value = data.intervalo_minimo_dias || 30;
      
      // Se intervalo_envios_segundos for null, mostrar 130 (padrão para aleatorização)
      const intervaloValor = data.intervalo_envios_segundos || 130;
      if (intervaloEnviosSegundosEl) intervaloEnviosSegundosEl.value = intervaloValor;
      
      // Selecionar opção pré-definida: usar tipo_intervalo se disponível, senão inferir do valor
      if (data.tipo_intervalo) {
        const radioCorrespondente = document.querySelector(`input[name="intervalo_preset"][value="${data.tipo_intervalo}"]`);
        if (radioCorrespondente) {
          radioCorrespondente.checked = true;
          if (typeof atualizarClassesIntervaloPreset === "function") {
          atualizarClassesIntervaloPreset();
          }
        }
      } else {
        // Fallback: selecionar baseado no valor (compatibilidade com campanhas antigas)
        if (typeof selecionarOpcaoIntervalo === "function") {
        selecionarOpcaoIntervalo(intervaloValor);
        }
      }
      
      const prioridadeEl = document.getElementById("prioridade");
      const promptIaEl = document.getElementById("prompt_ia");
      const templateMensagemEl = document.getElementById("template_mensagem");
      
      if (prioridadeEl) prioridadeEl.value = data.prioridade || 5;
      if (promptIaEl) promptIaEl.value = data.prompt_ia || "";
      if (templateMensagemEl) templateMensagemEl.value = data.template_mensagem || "";

      // Novos campos: Flags de IA
      const usarVeiculosEl = document.getElementById("usar_veiculos");
      const usarVendedorEl = document.getElementById("usar_vendedor");
      if (usarVeiculosEl) usarVeiculosEl.checked = data.usar_veiculos !== false;
      if (usarVendedorEl) usarVendedorEl.checked = data.usar_vendedor === true;

      // Novos campos: Lotes e Horário
      const tamanhoLoteEl = document.getElementById("tamanho_lote");
      const horarioInicioEl = document.getElementById("horario_inicio");
      const horarioFimEl = document.getElementById("horario_fim");
      const processarFinaisSemanaEl = document.getElementById("processar_finais_semana");
      
      if (tamanhoLoteEl) tamanhoLoteEl.value = data.tamanho_lote || 50;
      if (horarioInicioEl) horarioInicioEl.value = data.horario_inicio || "09:00";
      if (horarioFimEl) horarioFimEl.value = data.horario_fim || "18:00";
      if (processarFinaisSemanaEl) processarFinaisSemanaEl.checked = data.processar_finais_semana === true;

      // Preencher novos campos - Intervalo de Almoço
      const pausarAlmocoCheck = document.getElementById("pausar_almoco");
      if (pausarAlmocoCheck) {
        pausarAlmocoCheck.checked = data.pausar_almoco || false;
        if (typeof toggleCamposAlmoco === "function") {
        toggleCamposAlmoco();
        }
        if (data.horario_almoco_inicio) {
          const horarioAlmocoInicioEl = document.getElementById("horario_almoco_inicio");
          if (horarioAlmocoInicioEl) horarioAlmocoInicioEl.value = data.horario_almoco_inicio;
        }
        if (data.horario_almoco_fim) {
          const horarioAlmocoFimEl = document.getElementById("horario_almoco_fim");
          if (horarioAlmocoFimEl) horarioAlmocoFimEl.value = data.horario_almoco_fim;
        }
      }

      // Preencher novos campos - Configuração por Dia da Semana
      if (data.configuracao_dias_semana && typeof carregarConfiguracaoDiasSemana === "function") {
        carregarConfiguracaoDiasSemana(
          data.configuracao_dias_semana,
          data.horario_inicio || "09:00",
          data.horario_fim || "18:00",
          data.processar_finais_semana || false
        );
      } else {
        // Usar configuração padrão
        const modoPadrao = document.getElementById("modo_configuracao_padrao");
        if (modoPadrao) {
          modoPadrao.checked = true;
          if (typeof toggleConfiguracaoDiasSemana === "function") {
          toggleConfiguracaoDiasSemana();
          }
        }
      }

      // Preencher novos campos - Modo Teste e Debug
      const modoTesteEl = document.getElementById("modo_teste");
      const modoDebugEl = document.getElementById("modo_debug");
      const telefonesTesteEl = document.getElementById("telefones_teste");
      const telefonesTesteGroupEl = document.getElementById("telefones_teste_group");
      
      if (modoTesteEl) modoTesteEl.checked = data.modo_teste || false;
      if (modoDebugEl) modoDebugEl.checked = data.modo_debug || false;

      // Preencher textareas de telefones (converter array JSON para texto)
      if (telefonesTesteEl && data.telefones_teste && Array.isArray(data.telefones_teste)) {
        telefonesTesteEl.value = data.telefones_teste.join("\n");
      }

      // Mostrar campo de telefones_teste se modo_teste estiver ativo
      if (telefonesTesteGroupEl && data.modo_teste) {
        telefonesTesteGroupEl.style.display = "block";
      }

      // Preencher novos campos - Notificações Admin
      const notificarInicioEl = document.getElementById("notificar_inicio");
      const notificarErrosEl = document.getElementById("notificar_erros");
      const notificarConclusaoEl = document.getElementById("notificar_conclusao");
      const notificarLimiteEl = document.getElementById("notificar_limite");
      const whatsappApiIdAdminEl = document.getElementById("whatsapp_api_id_admin");
      const telefonesAdminEl = document.getElementById("telefones_admin");
      
      if (notificarInicioEl) notificarInicioEl.checked = data.notificar_inicio || false;
      if (notificarErrosEl) notificarErrosEl.checked = data.notificar_erros !== false; // default TRUE
      if (notificarConclusaoEl) notificarConclusaoEl.checked = data.notificar_conclusao !== false; // default TRUE
      if (notificarLimiteEl) notificarLimiteEl.checked = data.notificar_limite || false;
      if (whatsappApiIdAdminEl) whatsappApiIdAdminEl.value = data.whatsapp_api_id_admin || "";

      if (telefonesAdminEl && data.telefones_admin && Array.isArray(data.telefones_admin)) {
        telefonesAdminEl.value = data.telefones_admin.join("\n");
      }

      // Carregar instâncias e selecionar a correta
      await carregarInstanciasParaSelect();
      
      // Definir valor após carregar instâncias (garantir que as opções já existam)
      if (data.whatsapp_api_id) {
        const selectWhatsapp = document.getElementById("whatsapp_api_id");
        if (selectWhatsapp) {
          // Verificar se a opção existe antes de definir
          const opcaoExiste = Array.from(selectWhatsapp.options).some(
            opt => opt.value === data.whatsapp_api_id
          );
          
          if (opcaoExiste) {
            selectWhatsapp.value = data.whatsapp_api_id;
            console.log('✅ Instância WhatsApp selecionada:', data.whatsapp_api_id);
          } else {
            console.warn('⚠️ Instância WhatsApp não encontrada nas opções:', data.whatsapp_api_id);
            // Tentar novamente após um pequeno delay (caso haja problema de timing)
            setTimeout(() => {
              const opcaoExisteAgora = Array.from(selectWhatsapp.options).some(
                opt => opt.value === data.whatsapp_api_id
              );
              if (opcaoExisteAgora) {
                selectWhatsapp.value = data.whatsapp_api_id;
                console.log('✅ Instância WhatsApp selecionada (retry):', data.whatsapp_api_id);
              } else {
                console.error('❌ Instância WhatsApp não encontrada após retry:', data.whatsapp_api_id);
              }
            }, 100);
          }
        }
      }

      // Carregar instâncias para select admin também
      if (window.carregarInstanciasAdmin) {
        await window.carregarInstanciasAdmin();
        if (data.whatsapp_api_id_admin) {
          document.getElementById("whatsapp_api_id_admin").value =
            data.whatsapp_api_id_admin;
        }
      }

      // Limpar busca e carregar clientes para seleção
      const buscaClientesSelecaoEl = document.getElementById("buscaClientesSelecao");
      if (buscaClientesSelecaoEl) buscaClientesSelecaoEl.value = "";
      
      // Marcar checkbox "apenas não enviados" por padrão (para não exibir clientes já enviados)
      const filtroCheckbox = document.getElementById("filtroApenasNaoEnviados");
      if (filtroCheckbox) {
        filtroCheckbox.checked = true;
      }
      await carregarClientesParaSelecao();
      await carregarClientesSelecionadosCampanha(data.id);

      // Carregar dados dinâmicos (templates, sessões, configurações)
      await carregarDadosDinamicosCampanha();

      // Preencher novos campos - Dados Dinâmicos do Agente IA
      const usarConfiguracoesGlobaisEl = document.getElementById("usar_configuracoes_globais");
      const templatePromptIdEl = document.getElementById("template_prompt_id");
      
      if (usarConfiguracoesGlobaisEl) usarConfiguracoesGlobaisEl.checked = data.usar_configuracoes_globais !== false;
      if (templatePromptIdEl && data.template_prompt_id) {
        templatePromptIdEl.value = data.template_prompt_id;
      }
      
      // Atualizar validação do prompt baseado no template selecionado
      setTimeout(() => {
        if (typeof window.atualizarValidacaoPrompt === 'function') {
          window.atualizarValidacaoPrompt();
        }
      }, 100);

      // Marcar sessões habilitadas
      const sessoesHabilitadas = data.sessoes_contexto_habilitadas || [];
      setTimeout(() => {
        document
          .querySelectorAll(
            "#sessoes_contexto_checkboxes input[type='checkbox']"
          )
          .forEach((cb) => {
            cb.checked = sessoesHabilitadas.includes(cb.value);
          });
      }, 500);

      // Preencher configurações sobrescritas
      const sobrescritas = data.configuracoes_empresa_sobrescritas || {};
      setTimeout(() => {
        document
          .querySelectorAll("#configuracoes_sobrescritas textarea")
          .forEach((textarea) => {
            const chave = textarea.dataset.chave;
            if (chave && sobrescritas[chave]) {
              textarea.value = sobrescritas[chave];
            }
          });
      }, 500);

      // Atualizar estimativas após carregar dados
      if (typeof atualizarEstimativas === "function") {
      setTimeout(atualizarEstimativas, 100);
      }

      // Configurar intervalos pré-definidos
      if (typeof configurarIntervalosPredefinidos === "function") {
      configurarIntervalosPredefinidos();
      }

      // Modal já foi aberto no início da função, mas garantir que está ativo
      if (modal) {
        modal.classList.add("active");
      }

      // Adicionar tooltips após um pequeno delay
      setTimeout(() => {
        adicionarTooltipsFormularioCampanha();
      }, 100);
    } catch (error) {
      mostrarAlerta("Erro ao carregar campanha: " + error.message, "error");
      console.error(error);
    }
  }

  // Fechar modal
  function fecharModal() {
    document.getElementById("modalCampanha").classList.remove("active");
  }

  // Função auxiliar para obter configurações sobrescritas
  function obterConfiguracoesSobrescritas() {
    const sobrescritas = {};
    const inputs = document.querySelectorAll(
      "#configuracoes_sobrescritas input[type='text'], #configuracoes_sobrescritas textarea"
    );
    inputs.forEach((input) => {
      const chave = input.dataset.chave;
      const valor = input.value.trim();
      if (chave && valor) {
        sobrescritas[chave] = valor;
      }
    });
    return sobrescritas;
  }

  // Função para carregar templates e sessões no formulário de campanha
  async function carregarDadosDinamicosCampanha() {
    if (!supabaseClient) return;

    try {
      // Carregar templates
      const { data: templates } = await supabaseClient
        .from("instacar_templates_prompt")
        .select("id, nome, categoria")
        .eq("ativo", true)
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      const selectTemplate = document.getElementById("template_prompt_id");
      if (selectTemplate && templates) {
        selectTemplate.innerHTML =
          '<option value="">Nenhum - usar prompt personalizado</option>';
        templates.forEach((template) => {
          const option = document.createElement("option");
          option.value = template.id;
          option.textContent = `${template.nome} (${template.categoria})`;
          selectTemplate.appendChild(option);
        });
        
        // Adicionar listener para atualizar validação do prompt quando template mudar
        selectTemplate.addEventListener("change", function() {
          if (typeof window.atualizarValidacaoPrompt === 'function') {
            window.atualizarValidacaoPrompt();
          }
        });
      }
      
      // Chamar uma vez para inicializar
      if (typeof window.atualizarValidacaoPrompt === 'function') {
        window.atualizarValidacaoPrompt();
      }

      // Carregar sessões
      const { data: sessoes } = await supabaseClient
        .from("instacar_sessoes_contexto_ia")
        .select(
          "id, nome, slug, descricao, exemplo_preenchido, habilitado_por_padrao"
        )
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      const containerSessoes = document.getElementById(
        "sessoes_contexto_checkboxes"
      );
      if (containerSessoes && sessoes) {
        if (sessoes.length === 0) {
          containerSessoes.innerHTML =
            "<p style='color: #666; font-size: 14px'>Nenhuma sessão disponível.</p>";
        } else {
          let html = "";
          sessoes.forEach((sessao) => {
            html += `
              <label style="display: flex; align-items: start; margin-bottom: 10px; cursor: pointer">
                <input type="checkbox" value="${
                  sessao.slug
                }" style="width: auto; margin-right: 8px; margin-top: 3px" ${
              sessao.habilitado_por_padrao ? "checked" : ""
            } />
                <div>
                  <strong>${sessao.nome}</strong>
                  <p style="margin: 2px 0; color: #666; font-size: 13px">${
                    sessao.descricao || ""
                  }</p>
                  ${
                    sessao.exemplo_preenchido
                      ? `<small style="color: #999; font-size: 12px">Exemplo: ${sessao.exemplo_preenchido.substring(
                          0,
                          100
                        )}...</small>`
                      : ""
                  }
                </div>
              </label>
            `;
          });
          containerSessoes.innerHTML = html;
        }
      }

      // Carregar configurações para sobrescrita
      const { data: configuracoes } = await supabaseClient
        .from("instacar_configuracoes_empresa")
        .select("id, chave, titulo, conteudo, categoria")
        .eq("ativo", true)
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true });

      const containerConfigs = document.getElementById(
        "configuracoes_sobrescritas"
      );
      if (containerConfigs && configuracoes) {
        if (configuracoes.length === 0) {
          containerConfigs.innerHTML =
            "<p style='color: #666; font-size: 14px'>Nenhuma configuração disponível.</p>";
        } else {
          let html = "";
          const porCategoria = {};
          configuracoes.forEach((config) => {
            if (!porCategoria[config.categoria]) {
              porCategoria[config.categoria] = [];
            }
            porCategoria[config.categoria].push(config);
          });

          Object.keys(porCategoria)
            .sort()
            .forEach((categoria) => {
              html += `<h5 style="margin-top: 15px; margin-bottom: 8px; color: #333">${categoria}</h5>`;
              porCategoria[categoria].forEach((config) => {
                html += `
                <div style="margin-bottom: 10px">
                  <label style="display: block; margin-bottom: 4px; font-weight: 600">${
                    config.titulo
                  } <small style="color: #999">(${config.chave})</small></label>
                  <textarea data-chave="${
                    config.chave
                  }" style="width: 100%; min-height: 60px; padding: 8px; border: 1px solid #ddd; border-radius: 4px" placeholder="Deixe vazio para usar configuração global">${
                  config.conteudo
                }</textarea>
                  <small style="color: #666; font-size: 12px">Global: ${config.conteudo.substring(
                    0,
                    100
                  )}...</small>
                </div>
              `;
              });
            });
          containerConfigs.innerHTML = html;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados dinâmicos:", error);
    }
  }

  // Salvar campanha
  function inicializarFormulario() {
    const form = document.getElementById("formCampanha");

    // Carregar dados dinâmicos quando abrir modal
    const originalAbrirModal = window.abrirModalNovaCampanha;
    if (originalAbrirModal) {
      window.abrirModalNovaCampanha = async function () {
        await originalAbrirModal();
        await carregarDadosDinamicosCampanha();
        // Atualizar validação do prompt após carregar dados dinâmicos
        setTimeout(() => {
          if (typeof window.atualizarValidacaoPrompt === 'function') {
            window.atualizarValidacaoPrompt();
          }
        }, 200);
      };
    }
    if (!form) return;

    // Toggle visibilidade de telefones_teste quando modo_teste é marcado
    const modoTesteCheckbox = document.getElementById("modo_teste");
    const telefonesTesteGroup = document.getElementById(
      "telefones_teste_group"
    );
    if (modoTesteCheckbox && telefonesTesteGroup) {
      modoTesteCheckbox.addEventListener("change", (e) => {
        telefonesTesteGroup.style.display = e.target.checked ? "block" : "none";
      });
    }

    // Validação em tempo real dos textareas de telefones
    validarTelefonesTexarea("telefones_teste", "telefones_teste_validacao");
    validarTelefonesTexarea("telefones_admin", "telefones_admin_validacao");

    // Carregar instâncias WhatsApp para o select whatsapp_api_id_admin
    const selectAdmin = document.getElementById("whatsapp_api_id_admin");
    if (selectAdmin) {
      // Função para carregar instâncias no select admin
      async function carregarInstanciasAdmin() {
        if (!supabaseClient) return;
        try {
          const { data, error } = await supabaseClient
            .from("instacar_whatsapp_apis")
            .select("id, nome")
            .eq("ativo", true)
            .order("nome");

          if (error) throw error;

          // Limpar opções existentes (exceto a primeira)
          selectAdmin.innerHTML =
            '<option value="">-- Usar instância da campanha --</option>';

          // Adicionar instâncias
          if (data && data.length > 0) {
            data.forEach((instancia) => {
              const option = document.createElement("option");
              option.value = instancia.id;
              option.textContent = instancia.nome;
              selectAdmin.appendChild(option);
            });
          }
        } catch (error) {
          console.error(
            "Erro ao carregar instâncias para select admin:",
            error
          );
        }
      }

      // Carregar instâncias quando o formulário for aberto
      carregarInstanciasAdmin();

      // Recarregar quando necessário (pode ser chamado externamente)
      window.carregarInstanciasAdmin = carregarInstanciasAdmin;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!supabaseClient) {
        mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
        return;
      }

      const id = document.getElementById("campanhaId").value;
      const intervaloEnviosInput = document.getElementById(
        "intervalo_envios_segundos"
      ).value;
      const prioridadeInput = document.getElementById("prioridade").value;

      // Obter tipo de intervalo selecionado (opção pré-definida)
      const tipoIntervaloRadio = document.querySelector('input[name="intervalo_preset"]:checked');
      const tipoIntervalo = tipoIntervaloRadio ? tipoIntervaloRadio.value : null;

      // Se o intervalo for 130 (padrão), salvar como null para manter aleatorização
      const intervaloEnvios = intervaloEnviosInput
        ? parseInt(intervaloEnviosInput)
        : null;
      
      // Se for opção pré-definida (não personalizado), salvar tipo e null no valor fixo
      let intervaloEnviosFinal = null;
      let tipoIntervaloFinal = null;
      
      if (tipoIntervalo === "personalizado") {
        // Personalizado: usar valor do campo
        intervaloEnviosFinal = intervaloEnvios;
        tipoIntervaloFinal = "personalizado";
      } else if (tipoIntervalo === "padrao") {
        // Padrão: null para manter aleatorização 130-150s
        intervaloEnviosFinal = null;
        tipoIntervaloFinal = "padrao";
      } else if (tipoIntervalo && tipoIntervalo !== "personalizado") {
        // Opção pré-definida: salvar tipo para usar range completo
        intervaloEnviosFinal = null; // Não usar valor fixo, usar range
        tipoIntervaloFinal = tipoIntervalo;
      } else {
        // Fallback: se não houver seleção, usar valor do campo ou null
        intervaloEnviosFinal = intervaloEnvios === 130 ? null : intervaloEnvios;
        tipoIntervaloFinal = intervaloEnvios ? "personalizado" : null;
      }

      const dados = {
        nome: document.getElementById("nome").value,
        descricao: document.getElementById("descricao").value,
        periodo_ano: document.getElementById("periodo_ano").value,
        status: document.getElementById("status").value,
        data_inicio: document.getElementById("data_inicio").value || null,
        data_fim: document.getElementById("data_fim").value || null,
        limite_envios_dia:
          parseInt(document.getElementById("limite_envios_dia").value) || 200,
        intervalo_minimo_dias:
          parseInt(document.getElementById("intervalo_minimo_dias").value) ||
          30,
        intervalo_envios_segundos: intervaloEnviosFinal,
        prioridade: prioridadeInput ? parseInt(prioridadeInput) : 5,
        prompt_ia: document.getElementById("prompt_ia").value,
        template_mensagem:
          document.getElementById("template_mensagem").value || null,
        whatsapp_api_id: (() => {
          const selectWhatsapp = document.getElementById("whatsapp_api_id");
          const valor = selectWhatsapp ? selectWhatsapp.value : null;
          
          // Validação e log
          if (selectWhatsapp) {
            const opcaoSelecionada = selectWhatsapp.options[selectWhatsapp.selectedIndex];
            console.log('📱 Instância WhatsApp selecionada:', {
              valor: valor,
              texto: opcaoSelecionada ? opcaoSelecionada.textContent : 'N/A',
              todasOpcoes: Array.from(selectWhatsapp.options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
              }))
            });
            
            // Validar se o valor é um UUID válido
            if (valor && valor.trim() !== '') {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
              if (!uuidRegex.test(valor)) {
                console.error('❌ whatsapp_api_id inválido (não é UUID):', valor);
                mostrarAlerta('Instância WhatsApp selecionada é inválida. Por favor, selecione novamente.', 'error');
                return null;
              }
            }
          }
          
          return valor || null;
        })(),
        usar_veiculos: document.getElementById("usar_veiculos").checked,
        usar_vendedor: document.getElementById("usar_vendedor").checked,
        tamanho_lote:
          parseInt(document.getElementById("tamanho_lote").value) || 50,
        horario_inicio: normalizarHora(
          document.getElementById("horario_inicio").value || "09:00"
        ),
        horario_fim: normalizarHora(
          document.getElementById("horario_fim").value || "18:00"
        ),
        processar_finais_semana: document.getElementById(
          "processar_finais_semana"
        ).checked,
        // NOVOS CAMPOS - Intervalo de Almoço
        pausar_almoco: document.getElementById("pausar_almoco")?.checked || false,
        horario_almoco_inicio: document.getElementById("pausar_almoco")?.checked
          ? normalizarHora(document.getElementById("horario_almoco_inicio")?.value || "12:00")
          : null,
        horario_almoco_fim: document.getElementById("pausar_almoco")?.checked
          ? normalizarHora(document.getElementById("horario_almoco_fim")?.value || "13:00")
          : null,
        // NOVO CAMPO - Configuração por Dia da Semana
        configuracao_dias_semana: salvarConfiguracaoDiasSemana(),
        // NOVOS CAMPOS - Modo Teste e Debug
        modo_teste: document.getElementById("modo_teste").checked,
        telefones_teste: parseTelefonesTextarea(
          document.getElementById("telefones_teste").value
        ).telefones,
        modo_debug: document.getElementById("modo_debug").checked,
        // NOVOS CAMPOS - Notificações Admin
        telefones_admin: parseTelefonesTextarea(
          document.getElementById("telefones_admin").value
        ).telefones,
        notificar_inicio: document.getElementById("notificar_inicio").checked,
        notificar_erros: document.getElementById("notificar_erros").checked,
        notificar_conclusao: document.getElementById("notificar_conclusao")
          .checked,
        notificar_limite: document.getElementById("notificar_limite").checked,
        whatsapp_api_id_admin:
          document.getElementById("whatsapp_api_id_admin").value || null,
        // NOVOS CAMPOS - Dados Dinâmicos do Agente IA
        usar_configuracoes_globais: document.getElementById(
          "usar_configuracoes_globais"
        ).checked,
        template_prompt_id:
          document.getElementById("template_prompt_id").value || null,
        sessoes_contexto_habilitadas: Array.from(
          document.querySelectorAll(
            "#sessoes_contexto_checkboxes input:checked"
          )
        ).map((cb) => cb.value),
        configuracoes_empresa_sobrescritas: obterConfiguracoesSobrescritas(),
        ativo: true,
      };

      // Validação de horários (permitir horários que cruzam a meia-noite)
      // Obter valores diretamente dos inputs (formato HH:MM)
      const horarioInicioInput = document.getElementById("horario_inicio").value || "09:00";
      const horarioFimInput = document.getElementById("horario_fim").value || "18:00";
      
      // Converter para minutos para comparação (formato HH:MM)
      const [hInicio, mInicio] = horarioInicioInput.split(':').map(Number);
      const [hFim, mFim] = horarioFimInput.split(':').map(Number);
      const minutosInicio = hInicio * 60 + mInicio;
      const minutosFim = hFim * 60 + mFim;
      
      // Verificar se horários são iguais (não permitido)
      if (minutosInicio === minutosFim) {
        mostrarAlerta(
          "Horário de início e fim não podem ser iguais. Por favor, ajuste os horários.",
          "error"
        );
        return;
      }
      
      // Se horário fim < horário início, significa que cruza a meia-noite (permitido)
      const cruzaMeiaNoite = minutosFim < minutosInicio;
      if (cruzaMeiaNoite) {
        // Mostrar aviso informativo (não é erro, apenas informação)
        console.log(`Campanha configurada para cruzar a meia-noite: ${horarioInicioInput} até ${horarioFimInput} (dia seguinte)`);
      }

      // Validação adicional antes de enviar
      const validacaoTeste = parseTelefonesTextarea(
        document.getElementById("telefones_teste").value
      );
      const validacaoAdmin = parseTelefonesTextarea(
        document.getElementById("telefones_admin").value
      );

      if (!validacaoTeste.valido) {
        mostrarAlerta(
          "Telefones de teste inválidos: " + validacaoTeste.erros.join(", "),
          "error"
        );
        return;
      }

      if (!validacaoAdmin.valido) {
        mostrarAlerta(
          "Telefones admin inválidos: " + validacaoAdmin.erros.join(", "),
          "error"
        );
        return;
      }

      // Validar prompt_ia: obrigatório apenas se não houver template selecionado
      const templatePromptId = document.getElementById("template_prompt_id").value;
      const promptIa = document.getElementById("prompt_ia").value.trim();
      
      if (!templatePromptId && !promptIa) {
        mostrarAlerta(
          "É necessário preencher o 'Prompt Personalizado para IA' ou selecionar um 'Template de Prompt'.",
          "error"
        );
        document.getElementById("prompt_ia").focus();
        return;
      }

      // Verificar se modo_teste está ativo mas não há telefones
      if (dados.modo_teste && dados.telefones_teste.length === 0) {
        const confirmar = confirm(
          "Modo Teste está ativo mas nenhum telefone de teste foi configurado.\n\n" +
            "Será usada a configuração global. Deseja continuar?"
        );
        if (!confirmar) return;
      }

      // Validação inteligente com sugestões
      const validacao = validarECorrigirCampanha(dados);
      if (!validacao.valido && validacao.sugestoes.length > 0) {
        const sugestoesTexto = validacao.sugestoes
          .map((s) => s.mensagem + " " + s.sugestao)
          .join("\n");
        const aplicar = confirm(
          "Foram detectadas inconsistências entre o prompt e as configurações:\n\n" +
            sugestoesTexto +
            "\n\nDeseja aplicar as correções sugeridas automaticamente?"
        );

        if (aplicar) {
          validacao.sugestoes.forEach((sugestao) => {
            if (sugestao.correcao) {
              Object.assign(dados, sugestao.correcao);
              // Atualizar checkboxes na interface
              if (sugestao.correcao.usar_veiculos !== undefined) {
                document.getElementById("usar_veiculos").checked =
                  sugestao.correcao.usar_veiculos;
              }
              if (sugestao.correcao.usar_vendedor !== undefined) {
                document.getElementById("usar_vendedor").checked =
                  sugestao.correcao.usar_vendedor;
              }
            }
          });
        }
      }

      try {
        let result;
        let campanhaIdFinal = id;
        
        // Tentar salvar com tipo_intervalo primeiro
        let dadosParaSalvar = { ...dados };
        if (tipoIntervaloFinal !== null) {
          dadosParaSalvar.tipo_intervalo = tipoIntervaloFinal;
        }
        
        if (id) {
          // Atualizar campanha existente
          result = await supabaseClient
            .from("instacar_campanhas")
            .update(dadosParaSalvar)
            .eq("id", id)
            .select("id")
            .single();
        } else {
          // Criar nova campanha - IMPORTANTE: usar .select() para retornar o ID
          result = await supabaseClient
            .from("instacar_campanhas")
            .insert([dadosParaSalvar])
            .select("id")
            .single();
        }

        // Se erro relacionado a coluna não encontrada, tentar sem tipo_intervalo
        if (result.error) {
          const errorMessage = result.error.message || "";
          if (errorMessage.includes("tipo_intervalo") || errorMessage.includes("schema cache")) {
            console.warn("⚠️ Coluna tipo_intervalo não encontrada. Salvando sem esse campo. Execute a migração SQL para habilitar ranges de intervalo.");
            // Remover tipo_intervalo e tentar novamente
            delete dadosParaSalvar.tipo_intervalo;
            
            if (id) {
              result = await supabaseClient
                .from("instacar_campanhas")
                .update(dadosParaSalvar)
                .eq("id", id)
                .select("id")
                .single();
            } else {
              result = await supabaseClient
                .from("instacar_campanhas")
                .insert([dadosParaSalvar])
                .select("id")
                .single();
            }
          }
          
          if (result.error) throw result.error;
        }

        // Obter ID da campanha (novo ou existente)
        if (result.data && result.data.id) {
          campanhaIdFinal = result.data.id;
        }

        // Salvar seleção de clientes
        if (campanhaIdFinal) {
          console.log('Salvando seleção de clientes para campanha:', campanhaIdFinal, 'Total selecionados:', clientesSelecionados.size);
          await salvarSelecaoClientesCampanha(campanhaIdFinal);
          console.log('Seleção de clientes salva com sucesso');
        } else {
          console.error('ERRO: Não foi possível obter o ID da campanha para salvar seleção de clientes');
          mostrarAlerta("Campanha salva, mas não foi possível salvar a seleção de clientes. Tente editar a campanha e salvar novamente.", "warning");
        }

        mostrarAlerta(
          `Campanha ${id ? "atualizada" : "criada"} com sucesso!`,
          "success"
        );
        fecharModal();
        carregarCampanhas();
      } catch (error) {
        mostrarAlerta("Erro ao salvar campanha: " + error.message, "error");
        console.error(error);
      }
    });
  }

  // Toggle ativo/inativo
  async function toggleAtivo(id, novoEstado) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_campanhas")
        .update({ ativo: novoEstado })
        .eq("id", id);

      if (error) throw error;

      mostrarAlerta(
        `Campanha ${novoEstado ? "ativada" : "desativada"} com sucesso!`,
        "success"
      );
      carregarCampanhas();
    } catch (error) {
      mostrarAlerta("Erro ao alterar status: " + error.message, "error");
      console.error(error);
    }
  }

  // Disparar campanha manualmente
  async function dispararCampanha(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      // 1. OBTER CAMPANHA
      const { data: campanha, error: errorCampanha } = await supabaseClient
        .from("instacar_campanhas")
        .select("*")
        .eq("id", id)
        .single();

      if (errorCampanha || !campanha) {
        mostrarAlerta("Erro ao carregar campanha", "error");
        return;
      }

      // 2. VALIDAR STATUS
      if (campanha.status !== "ativa") {
        mostrarAlerta("Campanha não está ativa", "error");
        return;
      }
      if (!campanha.ativo) {
        mostrarAlerta("Campanha está desativada", "error");
        return;
      }

      // 3. VALIDAR PERÍODO
      // Função auxiliar para normalizar data (apenas dia/mês/ano, sem hora)
      function normalizarData(dataString) {
        if (!dataString) return null;
        // Se a data vem no formato YYYY-MM-DD, criar data no timezone local
        const partes = dataString.split("-");
        if (partes.length === 3) {
          // Criar data no timezone local (não UTC)
          return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
        }
        // Se já for um objeto Date ou outro formato, converter
        const data = new Date(dataString);
        return new Date(data.getFullYear(), data.getMonth(), data.getDate());
      }
      
      // Obter data atual normalizada (apenas dia/mês/ano)
      const hoje = new Date();
      const hojeNormalizado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
      
      if (campanha.data_inicio) {
        const dataInicioNormalizada = normalizarData(campanha.data_inicio);
        if (dataInicioNormalizada && dataInicioNormalizada > hojeNormalizado) {
          const dataInicioFormatada = new Date(campanha.data_inicio).toLocaleDateString("pt-BR", { 
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          });
          mostrarAlerta(
            `Campanha inicia em ${dataInicioFormatada}`,
            "error"
          );
          return;
        }
      }
      
      if (campanha.data_fim) {
        const dataFimNormalizada = normalizarData(campanha.data_fim);
        if (dataFimNormalizada && dataFimNormalizada < hojeNormalizado) {
          const dataFimFormatada = new Date(campanha.data_fim).toLocaleDateString("pt-BR", { 
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
          });
          mostrarAlerta(
            `Campanha encerrou em ${dataFimFormatada}`,
            "error"
          );
          return;
        }
      }

      // 4. VERIFICAR EXECUÇÕES PENDENTES (pausadas ou em_andamento)
      const hojeStr = hoje.toISOString().split("T")[0];
      const { data: execucoes } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("id, status_execucao, pausa_manual, total_enviado, created_at")
        .eq("campanha_id", id)
        .eq("data_execucao", hojeStr)
        .in("status_execucao", ["pausada", "em_andamento"])
        .order("created_at", { ascending: false })
        .limit(1);

      let execucaoPausada = null;
      let continuarExecucao = false;

      if (execucoes && execucoes.length > 0) {
        const execucao = execucoes[0];
        
        // Se está pausada e não foi pausada manualmente, oferecer continuar
        if (execucao.status_execucao === "pausada" && !execucao.pausa_manual) {
          const resposta = confirm(
            `Campanha "${campanha.nome}" tem uma execução pausada automaticamente.\n\n` +
            `Total enviado: ${execucao.total_enviado || 0}\n\n` +
            `Deseja CONTINUAR a execução pausada ou criar uma NOVA execução?`
          );
          
          if (resposta) {
            // Continuar execução pausada
            execucaoPausada = execucao;
            continuarExecucao = true;
          } else {
            // Criar nova execução
            if (!confirm(`Criar nova execução para "${campanha.nome}"?`)) {
              return;
            }
          }
        } else if (execucao.status_execucao === "em_andamento") {
          // Se está em andamento, perguntar se quer criar nova
          if (!confirm(
            `Campanha "${campanha.nome}" já está em execução.\n\n` +
            `Total enviado: ${execucao.total_enviado || 0}\n\n` +
            `Deseja criar uma nova execução mesmo assim?`
          )) {
            return;
          }
        } else if (execucao.status_execucao === "pausada" && execucao.pausa_manual) {
          // Se foi pausada manualmente, perguntar se quer continuar
          const resposta = confirm(
            `Campanha "${campanha.nome}" foi pausada manualmente.\n\n` +
            `Total enviado: ${execucao.total_enviado || 0}\n\n` +
            `Deseja CONTINUAR a execução pausada ou criar uma NOVA execução?`
          );
          
          if (resposta) {
            execucaoPausada = execucao;
            continuarExecucao = true;
          } else {
            if (!confirm(`Criar nova execução para "${campanha.nome}"?`)) {
              return;
            }
          }
        }
      } else {
        // 5. CONFIRMAR DISPARO (se não há execução pendente)
        if (
          !confirm(
            `Disparar "${campanha.nome}"?\n\nLimite: ${campanha.limite_envios_dia}/dia`
          )
        ) {
          return;
        }
      }

      // 6. OBTER WEBHOOK URL (busca do Supabase primeiro)
      let webhookUrl = await obterWebhookN8N();

      if (!webhookUrl) {
        mostrarAlerta(
          "Webhook N8N não configurado. Configure em Configurações.",
          "error"
        );
        return;
      }

      // 7. SALVAR SELEÇÃO DE CLIENTES ANTES DE DISPARAR
      // IMPORTANTE: Sempre salvar clientes selecionados antes de disparar para garantir
      // que o workflow N8N encontre a seleção correta no banco de dados
      try {
        // Se há clientes selecionados na variável global (interface de edição), salvar
        if (clientesSelecionados && clientesSelecionados.size > 0) {
          console.log(`[DISPARO] Salvando ${clientesSelecionados.size} clientes selecionados antes de disparar campanha ${id}`);
          await salvarSelecaoClientesCampanha(id);
          console.log('[DISPARO] Seleção de clientes salva com sucesso antes do disparo');
        } else {
          // Se não há clientes selecionados na variável global, verificar se há no banco
          // Isso garante que se o usuário salvou a campanha com clientes selecionados, eles serão usados
          const { data: clientesNoBanco, error: errorClientes } = await supabaseClient
            .from("instacar_campanhas_clientes")
            .select("cliente_id")
            .eq("campanha_id", id);
          
          if (!errorClientes && clientesNoBanco && clientesNoBanco.length > 0) {
            console.log(`[DISPARO] Encontrados ${clientesNoBanco.length} clientes selecionados no banco de dados para campanha ${id}`);
            console.log(`[DISPARO] IDs dos clientes: ${clientesNoBanco.map(c => c.cliente_id).join(', ')}`);
          } else {
            console.log(`[DISPARO] Nenhum cliente selecionado encontrado. Campanha processará todos os clientes elegíveis.`);
          }
        }
      } catch (error) {
        console.error("[DISPARO] Erro ao salvar/verificar seleção de clientes antes do disparo:", error);
        // Continuar mesmo se houver erro - o workflow tentará buscar do banco
      }

      // 8. CHAMAR WEBHOOK
      if (continuarExecucao) {
        mostrarAlerta("Continuando execução pausada...", "success");
      } else {
        mostrarAlerta("Disparando campanha...", "success");
      }

      const payload = continuarExecucao
        ? {
            execucao_id: execucaoPausada.id,
            continuar: true,
            trigger_tipo: "manual",
          }
        : {
            campanha_id: id,
            trigger_tipo: "manual",
          };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      if (continuarExecucao) {
        mostrarAlerta(`Execução da campanha "${campanha.nome}" continuada!`, "success");
      } else {
        mostrarAlerta(`Campanha "${campanha.nome}" disparada!`, "success");
      }
      setTimeout(() => carregarCampanhas(), 2000);
    } catch (error) {
      mostrarAlerta("Erro ao disparar: " + error.message, "error");
      console.error(error);
    }
  }
  
  // Expor função dispararCampanha globalmente
  window.dispararCampanha = dispararCampanha;

  // Dashboard de campanha
  async function abrirDashboardCampanha(campanhaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data: campanha, error: errorCampanha } = await supabaseClient
        .from("instacar_campanhas")
        .select("*")
        .eq("id", campanhaId)
        .single();

      if (errorCampanha || !campanha) {
        console.error("Erro ao carregar campanha:", errorCampanha);
        mostrarAlerta("Erro ao carregar campanha: " + (errorCampanha?.message || "Campanha não encontrada"), "error");
        return;
      }

      console.log("Campanha carregada:", campanha.nome, "ID:", campanhaId);

      // Buscar execuções da campanha
      // Garantir que campanhaId é uma string válida
      const campanhaIdStr = String(campanhaId).trim();
      console.log("Buscando execuções com campanha_id:", campanhaIdStr);
      
      let { data: execucoes, error: errorExecucoes } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("*")
        .eq("campanha_id", campanhaIdStr)
        .order("data_execucao", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50); // Aumentar limite para 50

      if (errorExecucoes) {
        console.error("Erro ao buscar execuções:", errorExecucoes);
        mostrarAlerta("Erro ao buscar execuções: " + errorExecucoes.message, "error");
        throw errorExecucoes;
      }

      // Log para debug
      console.log("Execuções encontradas:", execucoes?.length || 0, "para campanha:", campanhaId);
      if (execucoes && execucoes.length > 0) {
        console.log("Primeira execução:", execucoes[0]);
      } else {
        console.log("⚠️ Nenhuma execução encontrada. Verificando se há execuções no banco...");
        // Verificação adicional: buscar todas as execuções sem filtro para debug
        const { data: todasExecucoes, error: errorTodas } = await supabaseClient
          .from("instacar_campanhas_execucoes")
          .select("id, campanha_id, data_execucao, status_execucao")
          .limit(10);
        
        if (!errorTodas && todasExecucoes) {
          console.log("Execuções no banco (amostra):", todasExecucoes);
          console.log("Campanha ID usado na busca:", campanhaId, "Tipo:", typeof campanhaId);
          
          // Verificar se alguma execução tem o mesmo campanha_id
          const execucoesComMesmoId = todasExecucoes.filter(e => e.campanha_id === campanhaId);
          console.log("Execuções com mesmo campanha_id:", execucoesComMesmoId.length);
          
          if (execucoesComMesmoId.length === 0 && todasExecucoes.length > 0) {
            console.log("⚠️ ATENÇÃO: Há execuções no banco, mas nenhuma com o campanha_id correto!");
            console.log("Campanha ID buscado:", campanhaId);
            console.log("Campanha IDs encontrados nas execuções:", todasExecucoes.map(e => e.campanha_id));
            
            // Verificar se há execuções com execucao_id no histórico que apontam para esta campanha
            const { data: historicoComExecucao, error: errorHistorico } = await supabaseClient
              .from("instacar_historico_envios")
              .select("execucao_id, campanha_id")
              .eq("campanha_id", campanhaId)
              .not("execucao_id", "is", null)
              .limit(10);
            
            if (!errorHistorico && historicoComExecucao && historicoComExecucao.length > 0) {
              const execucaoIdsDoHistorico = [...new Set(historicoComExecucao.map(h => h.execucao_id))];
              console.log("Execuções encontradas no histórico:", execucaoIdsDoHistorico);
              
              // Buscar essas execuções
              if (execucaoIdsDoHistorico.length > 0) {
                const { data: execucoesDoHistorico, error: errorExecHist } = await supabaseClient
                  .from("instacar_campanhas_execucoes")
                  .select("*")
                  .in("id", execucaoIdsDoHistorico)
                  .order("data_execucao", { ascending: false })
                  .order("created_at", { ascending: false });
                
                if (!errorExecHist && execucoesDoHistorico && execucoesDoHistorico.length > 0) {
                  console.log("✅ Encontradas execuções via histórico:", execucoesDoHistorico.length);
                  // Usar essas execuções encontradas via histórico
                  execucoes = execucoesDoHistorico;
                  console.log("✅ Execuções atribuídas:", execucoes.length, "execuções");
                }
              }
            }
          }
        }
      }

      // Se ainda não encontrou execuções, tentar buscar via histórico de envios
      if ((!execucoes || execucoes.length === 0) && campanhaId) {
        console.log("🔄 Tentando buscar execuções via histórico de envios...");
        const { data: historicoEnvios, error: errorHist } = await supabaseClient
          .from("instacar_historico_envios")
          .select("execucao_id")
          .eq("campanha_id", campanhaId)
          .not("execucao_id", "is", null)
          .limit(100);
        
        if (!errorHist && historicoEnvios && historicoEnvios.length > 0) {
          const execucaoIdsUnicos = [...new Set(historicoEnvios.map(h => h.execucao_id).filter(id => id))];
          console.log("✅ Execuções encontradas via histórico:", execucaoIdsUnicos.length, "IDs:", execucaoIdsUnicos);
          
          if (execucaoIdsUnicos.length > 0) {
            const { data: execucoesViaHist, error: errorExecHist } = await supabaseClient
              .from("instacar_campanhas_execucoes")
              .select("*")
              .in("id", execucaoIdsUnicos)
              .order("data_execucao", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(50);
            
            if (!errorExecHist && execucoesViaHist && execucoesViaHist.length > 0) {
              console.log("✅ Execuções carregadas via histórico:", execucoesViaHist.length);
              execucoes = execucoesViaHist;
              console.log("✅ Execuções finais atribuídas:", execucoes.length, "execuções");
            }
          }
        } else {
          console.log("⚠️ Nenhum histórico de envios encontrado para esta campanha");
        }
      }

      // Log final para debug
      console.log("📊 Total de execuções para renderizar:", execucoes?.length || 0);
      if (execucoes && execucoes.length > 0) {
        console.log("📊 Primeira execução:", {
          id: execucoes[0].id,
          campanha_id: execucoes[0].campanha_id,
          data_execucao: execucoes[0].data_execucao,
          status: execucoes[0].status_execucao
        });
      }

      // Calcular estatísticas a partir do histórico de envios (mais confiável que contadores das execuções)
      const { data: historicoEstatisticas, error: errorHistoricoStats } = await supabaseClient
        .from("instacar_historico_envios")
        .select("status_envio")
        .eq("campanha_id", campanhaId);

      let totalEnviados = 0;
      let totalErros = 0;
      let totalDuplicados = 0;
      let totalSemWhatsapp = 0;

      if (!errorHistoricoStats && historicoEstatisticas) {
        historicoEstatisticas.forEach((envio) => {
          if (envio.status_envio === "enviado") {
            totalEnviados++;
          } else if (envio.status_envio === "erro") {
            totalErros++;
          } else if (envio.status_envio === "duplicado") {
            totalDuplicados++;
          } else if (envio.status_envio === "bloqueado" || envio.status_envio === "sem_whatsapp") {
            totalSemWhatsapp++;
          }
        });
      } else {
        // Fallback: usar contadores das execuções se histórico não disponível
        totalEnviados = (execucoes || []).reduce(
          (sum, e) => sum + (e.total_enviado || 0),
          0
        );
        totalErros = execucoes.reduce(
          (sum, e) => sum + (e.total_erros || 0),
          0
        );
        totalDuplicados = execucoes.reduce(
          (sum, e) => sum + (e.total_duplicados || 0),
          0
        );
        totalSemWhatsapp = execucoes.reduce(
          (sum, e) => sum + (e.total_sem_whatsapp || 0),
          0
        );
      }

      const totalGeral =
        totalEnviados + totalErros + totalDuplicados + totalSemWhatsapp;
      const taxaSucesso =
        totalGeral > 0 ? ((totalEnviados / totalGeral) * 100).toFixed(2) : 0;

      // Buscar clientes selecionados
      const { data: clientesSelecionados, error: errorClientes } =
        await supabaseClient
          .from("instacar_campanhas_clientes")
          .select(
            `
          cliente_id,
          instacar_clientes_envios (
            id,
            nome_cliente,
            telefone
          )
        `
          )
          .eq("campanha_id", campanhaId)
          .limit(100);

      const totalClientesSelecionados = clientesSelecionados?.length || 0;
      const usaSelecaoEspecifica = totalClientesSelecionados > 0;

      // Criar modal de dashboard
      const modalHtml = `
        <div id="modalDashboard" class="modal active">
          <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
              <h2>📊 Dashboard - ${campanha.nome}</h2>
              <button onclick="fecharModalDashboard()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${totalEnviados}</div>
                  <div style="color: #666;">Total Enviados</div>
                  <small style="display: block; color: #999; font-size: 11px; margin-top: 4px;">
                    Registros no histórico (pode incluir múltiplos envios para o mesmo cliente)
                  </small>
                </div>
                <div style="background: #ffebee; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #f44336;">${totalErros}</div>
                  <div style="color: #666;">Total Erros</div>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${totalDuplicados}</div>
                  <div style="color: #666;">Duplicados</div>
                </div>
                <div style="background: #f3e5f5; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #9c27b0;">${totalSemWhatsapp}</div>
                  <div style="color: #666;">Sem WhatsApp</div>
                </div>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${taxaSucesso}%</div>
                  <div style="color: #666;">Taxa de Sucesso</div>
                </div>
              </div>

              <h3 style="margin-top: 30px; margin-bottom: 15px;">👥 Clientes Selecionados</h3>
              <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;">
                  <strong>Modo de Seleção:</strong> 
                  ${
                    usaSelecaoEspecifica
                      ? `<span style="color: #667eea;">Seleção Específica (${totalClientesSelecionados} clientes)</span>`
                      : '<span style="color: #4caf50;">Todos os Clientes Elegíveis</span>'
                  }
                </p>
                ${
                  usaSelecaoEspecifica
                    ? `
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    Esta campanha enviará apenas para os clientes selecionados abaixo.
                  </p>
                  <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: white;">
                    ${clientesSelecionados
                      .slice(0, 50)
                      .map((cc) => {
                        const cliente = cc.instacar_clientes_envios;
                        return cliente
                          ? `<div style="padding: 5px 0; border-bottom: 1px solid #eee;">
                            <strong>${cliente.nome_cliente || "-"}</strong>
                            <br><small style="color: #666;">${
                              cliente.telefone
                            }</small>
                          </div>`
                          : "";
                      })
                      .join("")}
                    ${
                      totalClientesSelecionados > 50
                        ? `<p style="text-align: center; color: #666; margin-top: 10px;">... e mais ${
                            totalClientesSelecionados - 50
                          } clientes</p>`
                        : ""
                    }
                  </div>
                  <button onclick="editarCampanha('${campanhaId}')" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px;">
                    ✏️ Editar Seleção de Clientes
                  </button>
                `
                    : `
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    Esta campanha enviará para todos os clientes elegíveis (ativo, WhatsApp válido, não bloqueado).
                    Para limitar a clientes específicos, edite a campanha e selecione os clientes desejados.
                  </p>
                  <button onclick="editarCampanha('${campanhaId}')" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px;">
                    ✏️ Editar Campanha e Selecionar Clientes
                  </button>
                `
                }
              </div>

              <h3 style="margin-top: 30px; margin-bottom: 15px;">📋 Histórico de Execuções</h3>
              <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
                  Total de execuções: <strong>${execucoes?.length || 0}</strong> | 
                  Mostrando as últimas 20 execuções ordenadas por data (mais recente primeiro)
                </p>
                <div style="overflow-x: auto;">
                  <table id="tabelaExecucoes" style="width: 100%; border-collapse: collapse; background: white;">
                    <thead>
                      <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Data</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Status</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: 600;">Enviados</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: 600;">Erros</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: 600;">Duplicados</th>
                        <th style="padding: 12px; text-align: center; border-bottom: 2px solid #ddd; font-weight: 600;">Sem WhatsApp</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Progresso</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Início/Fim</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 600;">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${
                        (() => {
                          console.log("🎨 Renderizando tabela - execucoes:", execucoes?.length || 0);
                          if (execucoes && execucoes.length > 0) {
                            console.log("🎨 Renderizando", execucoes.length, "execuções");
                            return execucoes
                              .map(
                                (exec) => {
                                  const podePausar = exec.status_execucao === "em_andamento";
                                  const podeContinuar = exec.status_execucao === "pausada";
                                  const podeCancelar = exec.status_execucao === "em_andamento" || exec.status_execucao === "pausada";
                                  const hojeStr = new Date().toISOString().split("T")[0];
                                  const execucaoHoje = exec.data_execucao === hojeStr;
                                  
                                  // Calcular progresso
                                  const totalElegiveis = exec.total_contatos_elegiveis || 0;
                                  const processados = exec.contatos_processados || 0;
                                  const pendentes = exec.contatos_pendentes || 0;
                                  const percentualProgresso = totalElegiveis > 0 
                                    ? ((processados / totalElegiveis) * 100).toFixed(1)
                                    : 0;
                                  
                                  // Status badge
                                  let statusBadge = "";
                                  if (exec.status_execucao === "em_andamento") {
                                    statusBadge = `<span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🟢 EM ANDAMENTO</span>`;
                                  } else if (exec.status_execucao === "pausada") {
                                    statusBadge = `<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">⏸️ PAUSADA</span>`;
                                  } else if (exec.status_execucao === "concluida") {
                                    statusBadge = `<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ CONCLUÍDA</span>`;
                                  } else if (exec.status_execucao === "erro") {
                                    statusBadge = `<span style="background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">❌ ERRO</span>`;
                                  } else {
                                    statusBadge = `<span style="background: #999; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${exec.status_execucao || "N/A"}</span>`;
                                  }
                                  
                                  // Botões de ação
                                  let botoesAcoes = "";
                                  if (execucaoHoje && podePausar) {
                                    botoesAcoes += `<button onclick="pausarExecucao('${exec.id}')" class="btn-warning" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; margin-bottom: 4px;">⏸️ Pausar</button>`;
                                  }
                                  if (execucaoHoje && podeContinuar) {
                                    botoesAcoes += `<button onclick="continuarExecucao('${exec.id}')" class="btn-success" style="padding: 4px 8px; font-size: 11px; margin-right: 4px; margin-bottom: 4px;">▶️ Continuar</button>`;
                                  }
                                  if (execucaoHoje && podeCancelar) {
                                    botoesAcoes += `<button onclick="cancelarExecucao('${exec.id}')" class="btn-danger" style="padding: 4px 8px; font-size: 11px; margin-bottom: 4px;">❌ Cancelar</button>`;
                                  }
                                  // Botão para ver histórico de envios desta execução
                                  botoesAcoes += `<button onclick="verHistoricoExecucao('${exec.id}', '${campanhaId}')" class="btn-secondary" style="padding: 4px 8px; font-size: 11px; margin-top: 4px; display: block; width: 100%;">📨 Ver Envios</button>`;
                                  
                                  // Formatação de data/hora
                                  const dataFormatada = new Date(exec.data_execucao).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
                                  const horarioInicio = exec.horario_inicio
                                    ? new Date(exec.horario_inicio).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" })
                                    : "N/A";
                                  const horarioFim = exec.horario_fim
                                    ? new Date(exec.horario_fim).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit', timeZone: "America/Sao_Paulo" })
                                    : null;
                                  
                                  return `
                        <tr style="border-bottom: 1px solid #eee;">
                          <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            <strong>${dataFormatada}</strong>
                            ${execucaoHoje ? '<br><small style="color: #4caf50; font-weight: 600;">HOJE</small>' : ''}
                          </td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee;">${statusBadge}</td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                            <strong style="color: #2196F3; font-size: 16px;">${exec.total_enviado || 0}</strong>
                          </td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                            <strong style="color: #f44336; font-size: 16px;">${exec.total_erros || 0}</strong>
                          </td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                            <span style="color: #ff9800;">${exec.total_duplicados || 0}</span>
                          </td>
                          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                            <span style="color: #9c27b0;">${exec.total_sem_whatsapp || 0}</span>
                          </td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee;">
                            ${totalElegiveis > 0 ? `
                              <div style="margin-bottom: 4px;">
                                <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                                  <div style="background: #4caf50; height: 100%; width: ${percentualProgresso}%; transition: width 0.3s;"></div>
                                </div>
                                <small style="color: #666; font-size: 11px;">
                                  ${processados}/${totalElegiveis} (${percentualProgresso}%)
                                  ${pendentes > 0 ? `| ${pendentes} pendentes` : ''}
                                </small>
                              </div>
                            ` : '<span style="color: #999; font-size: 11px;">N/A</span>'}
                          </td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee; font-size: 12px;">
                            <div><strong>Início:</strong> ${horarioInicio}</div>
                            ${horarioFim ? `<div><strong>Fim:</strong> ${horarioFim}</div>` : '<div style="color: #999;">Em andamento...</div>'}
                          </td>
                          <td style="padding: 12px; border-bottom: 1px solid #eee; min-width: 120px;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                              ${botoesAcoes}
                            </div>
                          </td>
                        </tr>
                      `;
                                }
                              )
                              .join("");
                          } else {
                            console.log("🎨 Nenhuma execução para renderizar");
                            return `<tr>
                              <td colspan="9" style="padding: 30px; text-align: center; color: #666;">
                                <div style="margin-bottom: 15px;">
                                  <span style="font-size: 48px;">📭</span>
                                </div>
                                <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px; color: #333;">
                                  Nenhuma execução encontrada para esta campanha
                                </div>
                                <div style="font-size: 13px; color: #666; line-height: 1.6; max-width: 500px; margin: 0 auto;">
                                  <p style="margin: 5px 0;">
                                    Esta campanha ainda não foi executada. Para iniciar uma execução:
                                  </p>
                                  <ol style="text-align: left; display: inline-block; margin: 10px 0; padding-left: 20px;">
                                    <li>Verifique se a campanha está ativa</li>
                                    <li>Verifique se há clientes elegíveis ou selecionados</li>
                                    <li>Dispare a campanha manualmente ou aguarde o agendamento (se configurado)</li>
                                  </ol>
                                  <p style="margin: 10px 0; font-size: 12px; color: #999;">
                                    <strong>Dica:</strong> As execuções são criadas automaticamente quando uma campanha é disparada.
                                  </p>
                                </div>
                              </td>
                            </tr>`;
                          }
                        })()
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <h3 style="margin-top: 30px; margin-bottom: 15px;">📨 Últimos Envios (Tempo Real)</h3>
              <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                  Mostrando os últimos 50 envios da execução atual. Atualiza automaticamente a cada 12 segundos.
                </p>
                <div id="enviosIndividuais" style="max-height: 400px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                  <div style="text-align: center; padding: 20px; color: #999;">Carregando envios...</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button onclick="fecharModalDashboard()" class="btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao DOM
      const existingModal = document.getElementById("modalDashboard");
      if (existingModal) {
        existingModal.remove();
      }
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      
      // Armazenar campanha_id no modal para recarregar após ações
      const modal = document.getElementById("modalDashboard");
      if (modal) {
        modal.dataset.campanhaId = campanhaId;
      }

      // Função para carregar envios individuais
      const carregarEnviosIndividuais = async () => {
        try {
          // Buscar execução atual (em_andamento ou pausada de hoje)
          const hojeStr = new Date().toISOString().split("T")[0];
          let { data: execucaoAtual, error: errorExecucaoAtual } = await supabaseClient
            .from("instacar_campanhas_execucoes")
            .select("id")
            .eq("campanha_id", campanhaId)
            .eq("data_execucao", hojeStr)
            .in("status_execucao", ["em_andamento", "pausada"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406 quando não há resultados

          if (!execucaoAtual) {
            // Se não há execução atual, buscar última execução concluída
            let { data: ultimaExecucao, error: errorUltima } = await supabaseClient
              .from("instacar_campanhas_execucoes")
              .select("id")
              .eq("campanha_id", campanhaId)
              .order("data_execucao", { ascending: false })
              .limit(1)
              .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406 quando não há resultados

            if (errorUltima || !ultimaExecucao) {
              // FALLBACK: Buscar execução via histórico de envios (quando campanha_id está incorreto na execução)
              console.log("⚠️ Execução não encontrada por campanha_id. Buscando via histórico de envios...");
              const { data: historicoEnvios, error: errorHistorico } = await supabaseClient
                .from("instacar_historico_envios")
                .select("execucao_id")
                .eq("campanha_id", campanhaId)
                .not("execucao_id", "is", null)
                .order("timestamp_envio", { ascending: false })
                .limit(1);

              if (!errorHistorico && historicoEnvios && historicoEnvios.length > 0) {
                const execucaoIdEncontrado = historicoEnvios[0].execucao_id;
                console.log("✅ Execução encontrada via histórico:", execucaoIdEncontrado);
                
                // Buscar dados completos da execução
                const { data: execucaoCompleta, error: errorCompleta } = await supabaseClient
                  .from("instacar_campanhas_execucoes")
                  .select("id")
                  .eq("id", execucaoIdEncontrado)
                  .maybeSingle();

                if (!errorCompleta && execucaoCompleta) {
                  execucaoAtual = { id: execucaoCompleta.id };
                } else {
                  document.getElementById("enviosIndividuais").innerHTML = 
                    '<div style="text-align: center; padding: 20px; color: #999;">Nenhuma execução encontrada</div>';
                  return;
                }
              } else {
                document.getElementById("enviosIndividuais").innerHTML = 
                  '<div style="text-align: center; padding: 20px; color: #999;">Nenhuma execução encontrada</div>';
                return;
              }
            } else {
              execucaoAtual = { id: ultimaExecucao.id };
            }
          }

          // Buscar últimos 50 envios desta execução
          const { data: envios, error: errorEnvios } = await supabaseClient
            .from("instacar_historico_envios")
            .select(`
              *,
              instacar_clientes_envios (
                nome_cliente,
                telefone
              )
            `)
            .eq("execucao_id", execucaoAtual.id)
            .order("timestamp_envio", { ascending: false })
            .limit(50);

          if (errorEnvios) {
            console.error("Erro ao buscar envios individuais:", errorEnvios);
            document.getElementById("enviosIndividuais").innerHTML = 
              '<div style="text-align: center; padding: 20px; color: #f44336;">Erro ao carregar envios</div>';
            return;
          }

          if (!envios || envios.length === 0) {
            document.getElementById("enviosIndividuais").innerHTML = 
              '<div style="text-align: center; padding: 20px; color: #999;">Nenhum envio registrado ainda</div>';
            return;
          }

          // Renderizar envios
          const enviosHtml = envios.map((envio) => {
            const cliente = envio.instacar_clientes_envios;
            const nomeCliente = cliente?.nome_cliente || "N/A";
            const telefone = envio.telefone || cliente?.telefone || "N/A";
            
            // Determinar cor do status
            let statusColor = "#999";
            let statusIcon = "⏳";
            if (envio.status_envio === "enviado") {
              statusColor = "#4caf50";
              statusIcon = "✅";
            } else if (envio.status_envio === "erro") {
              statusColor = "#f44336";
              statusIcon = "❌";
            } else if (envio.status_envio === "bloqueado") {
              statusColor = "#ff9800";
              statusIcon = "🚫";
            }

            const timestamp = formatarTimestampSP(envio.timestamp_envio);

            const mensagemPreview = envio.mensagem_enviada 
              ? (envio.mensagem_enviada.length > 80 
                  ? envio.mensagem_enviada.substring(0, 80) + "..." 
                  : envio.mensagem_enviada)
              : "Sem mensagem";

            return `
              <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: start;">
                <div style="flex: 1;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 16px;">${statusIcon}</span>
                    <strong style="color: ${statusColor};">${envio.status_envio || "N/A"}</strong>
                    <span style="color: #999; font-size: 12px;">${timestamp}</span>
                  </div>
                  <div style="margin-bottom: 4px;">
                    <strong>${nomeCliente}</strong>
                    <span style="color: #666; font-size: 12px; margin-left: 8px;">${telefone}</span>
                  </div>
                  <div style="color: #666; font-size: 12px; font-style: italic;">
                    "${mensagemPreview}"
                  </div>
                  ${envio.mensagem_erro ? `
                    <div style="color: #f44336; font-size: 11px; margin-top: 4px;">
                      ⚠️ ${envio.mensagem_erro}
                    </div>
                  ` : ""}
                </div>
              </div>
            `;
          }).join("");

          document.getElementById("enviosIndividuais").innerHTML = enviosHtml;
        } catch (error) {
          console.error("Erro ao carregar envios individuais:", error);
          document.getElementById("enviosIndividuais").innerHTML = 
            '<div style="text-align: center; padding: 20px; color: #f44336;">Erro ao carregar envios</div>';
        }
      };

      // Carregar envios individuais inicialmente
      await carregarEnviosIndividuais();
      
      // Iniciar polling automático para atualização em tempo real
      let pollingInterval = null;
      const iniciarPolling = () => {
        // Limpar intervalo anterior se existir
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
        
        // Atualizar a cada 12 segundos
        pollingInterval = setInterval(async () => {
          const modalAtual = document.getElementById("modalDashboard");
          if (!modalAtual) {
            // Modal foi fechado, parar polling
            clearInterval(pollingInterval);
            return;
          }
          
          try {
            // Buscar execuções atualizadas
            const { data: execucoesAtualizadas, error: errorExecucoes } = await supabaseClient
              .from("instacar_campanhas_execucoes")
              .select("*")
              .eq("campanha_id", campanhaId)
              .order("data_execucao", { ascending: false })
              .limit(20);
            
            if (errorExecucoes) {
              console.error("Erro ao atualizar execuções:", errorExecucoes);
              return;
            }
            
            // Recalcular métricas a partir do histórico de envios (mais confiável)
            const { data: historicoStats, error: errorHistoricoStats } = await supabaseClient
              .from("instacar_historico_envios")
              .select("status_envio")
              .eq("campanha_id", campanhaId);

            let totalEnviados = 0;
            let totalErros = 0;
            let totalDuplicados = 0;
            let totalSemWhatsapp = 0;

            if (!errorHistoricoStats && historicoStats) {
              historicoStats.forEach((envio) => {
                if (envio.status_envio === "enviado") {
                  totalEnviados++;
                } else if (envio.status_envio === "erro") {
                  totalErros++;
                } else if (envio.status_envio === "duplicado") {
                  totalDuplicados++;
                } else if (envio.status_envio === "bloqueado" || envio.status_envio === "sem_whatsapp") {
                  totalSemWhatsapp++;
                }
              });
            } else {
              // Fallback: usar contadores das execuções se histórico não disponível
              totalEnviados = execucoesAtualizadas.reduce(
                (sum, e) => sum + (e.total_enviado || 0),
                0
              );
              totalErros = execucoesAtualizadas.reduce(
                (sum, e) => sum + (e.total_erros || 0),
                0
              );
              totalDuplicados = execucoesAtualizadas.reduce(
                (sum, e) => sum + (e.total_duplicados || 0),
                0
              );
              totalSemWhatsapp = execucoesAtualizadas.reduce(
                (sum, e) => sum + (e.total_sem_whatsapp || 0),
                0
              );
            }

            const totalGeral = totalEnviados + totalErros + totalDuplicados + totalSemWhatsapp;
            const taxaSucesso = totalGeral > 0 ? ((totalEnviados / totalGeral) * 100).toFixed(2) : 0;
            
            // Atualizar métricas no DOM
            const metricasContainer = modalAtual.querySelector(".modal-body");
            if (metricasContainer) {
              const metricasGrid = metricasContainer.querySelector("div[style*='grid-template-columns']");
              if (metricasGrid) {
                metricasGrid.innerHTML = `
                  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${totalEnviados}</div>
                    <div style="color: #666;">Total Enviados</div>
                    <small style="display: block; color: #999; font-size: 11px; margin-top: 4px;">
                      Registros no histórico (pode incluir múltiplos envios para o mesmo cliente)
                    </small>
                  </div>
                  <div style="background: #ffebee; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #f44336;">${totalErros}</div>
                    <div style="color: #666;">Total Erros</div>
                  </div>
                  <div style="background: #fff3e0; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${totalDuplicados}</div>
                    <div style="color: #666;">Duplicados</div>
                  </div>
                  <div style="background: #f3e5f5; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #9c27b0;">${totalSemWhatsapp}</div>
                    <div style="color: #666;">Sem WhatsApp</div>
                  </div>
                  <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${taxaSucesso}%</div>
                    <div style="color: #666;">Taxa de Sucesso</div>
                  </div>
                  <div style="background: #f9fafb; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 14px; font-weight: bold; color: #666;">🔄 Atualizado</div>
                    <div style="color: #999; font-size: 12px;">${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</div>
                  </div>
                `;
              }
              
              // Atualizar tabela de execuções
              const tabela = metricasContainer.querySelector("table");
              if (tabela) {
                const tbody = tabela.querySelector("tbody");
                if (tbody) {
                  const hojeStr = new Date().toISOString().split("T")[0];
                  tbody.innerHTML = execucoesAtualizadas && execucoesAtualizadas.length > 0
                    ? execucoesAtualizadas
                        .map((exec) => {
                          const podePausar = exec.status_execucao === "em_andamento";
                          const podeContinuar = exec.status_execucao === "pausada";
                          const podeCancelar = exec.status_execucao === "em_andamento" || exec.status_execucao === "pausada";
                          const execucaoHoje = exec.data_execucao === hojeStr;
                          
                          let botoesAcoes = "";
                          if (execucaoHoje && podePausar) {
                            botoesAcoes += `<button onclick="pausarExecucao('${exec.id}')" class="btn-warning" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">⏸️ Pausar</button>`;
                          }
                          if (execucaoHoje && podeContinuar) {
                            botoesAcoes += `<button onclick="continuarExecucao('${exec.id}')" class="btn-success" style="padding: 4px 8px; font-size: 11px; margin-right: 4px;">▶️ Continuar</button>`;
                          }
                          if (execucaoHoje && podeCancelar) {
                            botoesAcoes += `<button onclick="cancelarExecucao('${exec.id}')" class="btn-danger" style="padding: 4px 8px; font-size: 11px;">❌ Cancelar</button>`;
                          }
                          if (!botoesAcoes) {
                            botoesAcoes = "<span style='color: #999; font-size: 11px;'>-</span>";
                          }
                          
                          return `
                            <tr>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(
                                exec.data_execucao
                              ).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="status ${
                                exec.status_execucao
                              }">${exec.status_execucao}</span></td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${
                                exec.total_enviado || 0
                              }</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${
                                exec.total_erros || 0
                              }</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${
                                exec.trigger_tipo || "N/A"
                              }</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${
                                exec.horario_inicio
                                  ? new Date(exec.horario_inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
                                  : "N/A"
                              }</td>
                              <td style="padding: 10px; border-bottom: 1px solid #eee;">${botoesAcoes}</td>
                            </tr>
                          `;
                        })
                        .join("")
                    : '<tr><td colspan="7" style="padding: 20px; text-align: center; color: #666;">Nenhuma execução encontrada</td></tr>';
                }
              }
            }

            // Atualizar envios individuais (usar função definida no escopo externo)
            const campanhaIdAtual = modalAtual.dataset.campanhaId;
            if (campanhaIdAtual) {
              try {
                // Buscar execução atual
                const hojeStr = new Date().toISOString().split("T")[0];
                const { data: execucaoAtual } = await supabaseClient
                  .from("instacar_campanhas_execucoes")
                  .select("id")
                  .eq("campanha_id", campanhaIdAtual)
                  .eq("data_execucao", hojeStr)
                  .in("status_execucao", ["em_andamento", "pausada"])
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406

                let execucaoId = execucaoAtual?.id;
                if (!execucaoId) {
                  const { data: ultimaExecucao } = await supabaseClient
                    .from("instacar_campanhas_execucoes")
                    .select("id")
                    .eq("campanha_id", campanhaIdAtual)
                    .order("data_execucao", { ascending: false })
                    .limit(1)
                    .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro 406
                  execucaoId = ultimaExecucao?.id;
                  
                  // FALLBACK: Buscar via histórico de envios se não encontrou
                  if (!execucaoId) {
                    const { data: historicoEnvios } = await supabaseClient
                      .from("instacar_historico_envios")
                      .select("execucao_id")
                      .eq("campanha_id", campanhaIdAtual)
                      .not("execucao_id", "is", null)
                      .order("timestamp_envio", { ascending: false })
                      .limit(1);
                    
                    if (historicoEnvios && historicoEnvios.length > 0) {
                      execucaoId = historicoEnvios[0].execucao_id;
                    }
                  }
                }

                if (execucaoId) {
                  const { data: envios } = await supabaseClient
                    .from("instacar_historico_envios")
                    .select(`
                      *,
                      instacar_clientes_envios (
                        nome_cliente,
                        telefone
                      )
                    `)
                    .eq("execucao_id", execucaoId)
                    .order("timestamp_envio", { ascending: false })
                    .limit(50);

                  const enviosContainer = document.getElementById("enviosIndividuais");
                  if (enviosContainer && envios && envios.length > 0) {
                    enviosContainer.innerHTML = envios.map((envio) => {
                      const cliente = envio.instacar_clientes_envios;
                      const nomeCliente = cliente?.nome_cliente || "N/A";
                      const telefone = envio.telefone || cliente?.telefone || "N/A";
                      let statusColor = "#999";
                      let statusIcon = "⏳";
                      if (envio.status_envio === "enviado") {
                        statusColor = "#4caf50";
                        statusIcon = "✅";
                      } else if (envio.status_envio === "erro") {
                        statusColor = "#f44336";
                        statusIcon = "❌";
                      } else if (envio.status_envio === "bloqueado") {
                        statusColor = "#ff9800";
                        statusIcon = "🚫";
                      }
                      const timestamp = formatarTimestampSP(envio.timestamp_envio);
                      const mensagemPreview = envio.mensagem_enviada 
                        ? (envio.mensagem_enviada.length > 80 
                            ? envio.mensagem_enviada.substring(0, 80) + "..." 
                            : envio.mensagem_enviada)
                        : "Sem mensagem";
                      return `
                        <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: start;">
                          <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                              <span style="font-size: 16px;">${statusIcon}</span>
                              <strong style="color: ${statusColor};">${envio.status_envio || "N/A"}</strong>
                              <span style="color: #999; font-size: 12px;">${timestamp}</span>
                            </div>
                            <div style="margin-bottom: 4px;">
                              <strong>${nomeCliente}</strong>
                              <span style="color: #666; font-size: 12px; margin-left: 8px;">${telefone}</span>
                            </div>
                            <div style="color: #666; font-size: 12px; font-style: italic;">
                              "${mensagemPreview}"
                            </div>
                            ${envio.mensagem_erro ? `
                              <div style="color: #f44336; font-size: 11px; margin-top: 4px;">
                                ⚠️ ${envio.mensagem_erro}
                              </div>
                            ` : ""}
                          </div>
                        </div>
                      `;
                    }).join("");
                  }
                }
              } catch (err) {
                console.error("Erro ao atualizar envios individuais:", err);
              }
            }
          } catch (error) {
            console.error("Erro ao atualizar dashboard:", error);
          }
        }, 12000); // 12 segundos
      };
      
      // Iniciar polling
      iniciarPolling();
      
      // Parar polling quando modal for fechado
      const observer = new MutationObserver((mutations) => {
        const modalAtual = document.getElementById("modalDashboard");
        if (!modalAtual) {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          observer.disconnect();
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      mostrarAlerta("Erro ao carregar dashboard: " + error.message, "error");
      console.error(error);
    }
  }

  // Fechar modal dashboard
  function fecharModalDashboard() {
    const modal = document.getElementById("modalDashboard");
    if (modal) {
      modal.remove();
    }
    // Polling será parado automaticamente pelo observer
  }

  // Função para visualizar histórico de envios de uma execução específica
  async function verHistoricoExecucao(execucaoId, campanhaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      // Buscar dados da execução
      const { data: execucao, error: errorExecucao } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("*")
        .eq("id", execucaoId)
        .single();

      if (errorExecucao || !execucao) {
        mostrarAlerta("Erro ao carregar execução", "error");
        return;
      }

      // Buscar todos os envios desta execução
      const { data: envios, error: errorEnvios } = await supabaseClient
        .from("instacar_historico_envios")
        .select(`
          *,
          instacar_clientes_envios (
            nome_cliente,
            telefone
          )
        `)
        .eq("execucao_id", execucaoId)
        .order("timestamp_envio", { ascending: false })
        .limit(500); // Limitar a 500 para performance

      if (errorEnvios) {
        mostrarAlerta("Erro ao carregar histórico de envios", "error");
        return;
      }

      // Estatísticas
      const totalEnvios = envios?.length || 0;
      const enviados = envios?.filter(e => e.status_envio === "enviado").length || 0;
      const erros = envios?.filter(e => e.status_envio === "erro").length || 0;
      const bloqueados = envios?.filter(e => e.status_envio === "bloqueado").length || 0;

      // Criar modal de histórico
      const modalHtml = `
        <div id="modalHistoricoExecucao" class="modal active">
          <div class="modal-content" style="max-width: 1000px; max-height: 90vh;">
            <div class="modal-header">
              <h2>📨 Histórico de Envios - Execução ${new Date(execucao.data_execucao).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</h2>
              <button onclick="fecharModalHistoricoExecucao()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 120px);">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #2196F3;">${totalEnvios}</div>
                  <div style="color: #666; font-size: 12px;">Total de Envios</div>
                </div>
                <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #4caf50;">${enviados}</div>
                  <div style="color: #666; font-size: 12px;">Enviados</div>
                </div>
                <div style="background: #ffebee; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #f44336;">${erros}</div>
                  <div style="color: #666; font-size: 12px;">Erros</div>
                </div>
                <div style="background: #fff3e0; padding: 15px; border-radius: 5px;">
                  <div style="font-size: 24px; font-weight: bold; color: #ff9800;">${bloqueados}</div>
                  <div style="color: #666; font-size: 12px;">Bloqueados</div>
                </div>
              </div>

              <div style="background: #f9fafb; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                <p style="margin: 0; color: #666; font-size: 13px;">
                  <strong>Status:</strong> ${execucao.status_execucao} | 
                  <strong>Início:</strong> ${execucao.horario_inicio ? new Date(execucao.horario_inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "N/A"} | 
                  <strong>Fim:</strong> ${execucao.horario_fim ? new Date(execucao.horario_fim).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Em andamento..."}
                </p>
              </div>

              <h3 style="margin-top: 20px; margin-bottom: 15px;">Lista de Envios</h3>
              <div id="listaEnviosExecucao" style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 10px; max-height: 500px; overflow-y: auto;">
                ${
                  envios && envios.length > 0
                    ? envios.map((envio) => {
                        const cliente = envio.instacar_clientes_envios;
                        const nomeCliente = cliente?.nome_cliente || "N/A";
                        const telefone = envio.telefone || cliente?.telefone || "N/A";
                        
                        let statusColor = "#999";
                        let statusIcon = "⏳";
                        if (envio.status_envio === "enviado") {
                          statusColor = "#4caf50";
                          statusIcon = "✅";
                        } else if (envio.status_envio === "erro") {
                          statusColor = "#f44336";
                          statusIcon = "❌";
                        } else if (envio.status_envio === "bloqueado") {
                          statusColor = "#ff9800";
                          statusIcon = "🚫";
                        }

                        const timestamp = formatarTimestampSP(envio.timestamp_envio);

                        const mensagemCompleta = envio.mensagem_enviada || "Sem mensagem";
                        const mensagemPreview = mensagemCompleta.length > 100 
                          ? mensagemCompleta.substring(0, 100) + "..." 
                          : mensagemCompleta;

                        return `
                          <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                                <span style="font-size: 18px;">${statusIcon}</span>
                                <strong style="color: ${statusColor}; font-size: 14px;">${envio.status_envio?.toUpperCase() || "N/A"}</strong>
                                <span style="color: #999; font-size: 11px;">${timestamp}</span>
                              </div>
                              <div style="margin-bottom: 4px;">
                                <strong style="font-size: 14px;">${nomeCliente}</strong>
                                <span style="color: #666; font-size: 12px; margin-left: 8px;">${telefone}</span>
                              </div>
                              <div style="color: #666; font-size: 12px; margin-top: 6px; padding: 8px; background: #f5f5f5; border-radius: 4px; white-space: pre-wrap;" title="${mensagemCompleta.replace(/"/g, '&quot;')}">
                                ${mensagemPreview}
                              </div>
                              ${envio.mensagem_erro ? `
                                <div style="color: #f44336; font-size: 11px; margin-top: 6px; padding: 6px; background: #ffebee; border-radius: 4px;">
                                  ⚠️ <strong>Erro:</strong> ${envio.mensagem_erro}
                                </div>
                              ` : ""}
                              ${envio.tipo_envio && envio.tipo_envio !== "normal" ? `
                                <div style="margin-top: 6px;">
                                  <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">
                                    ${envio.tipo_envio === "teste" ? "🧪 TESTE" : envio.tipo_envio === "debug" ? "🔍 DEBUG" : envio.tipo_envio.toUpperCase()}
                                  </span>
                                </div>
                              ` : ""}
                            </div>
                          </div>
                        `;
                      }).join("")
                    : '<div style="text-align: center; padding: 40px; color: #999;">Nenhum envio registrado para esta execução</div>'
                }
              </div>
              ${envios && envios.length >= 500 ? `
                <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 15px; text-align: center; color: #856404; font-size: 12px;">
                  ⚠️ Mostrando apenas os últimos 500 envios. Total de envios pode ser maior.
                </div>
              ` : ""}
            </div>
            <div class="modal-footer">
              <button onclick="fecharModalHistoricoExecucao()" class="btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      `;

      // Adicionar modal ao DOM
      const existingModal = document.getElementById("modalHistoricoExecucao");
      if (existingModal) {
        existingModal.remove();
      }
      document.body.insertAdjacentHTML("beforeend", modalHtml);
    } catch (error) {
      mostrarAlerta("Erro ao carregar histórico: " + error.message, "error");
      console.error(error);
    }
  }

  function fecharModalHistoricoExecucao() {
    const modal = document.getElementById("modalHistoricoExecucao");
    if (modal) {
      modal.remove();
    }
  }

  // Pausar execução
  async function pausarExecucao(execucaoId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    if (!confirm("Deseja pausar esta execução?")) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .update({
          status_execucao: "pausada",
          pausa_manual: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", execucaoId);

      if (error) throw error;

      mostrarAlerta("Execução pausada com sucesso!", "success");
      
      // Recarregar dashboard se estiver aberto
      const modal = document.getElementById("modalDashboard");
      if (modal) {
        const campanhaId = modal.dataset.campanhaId;
        if (campanhaId) {
          setTimeout(() => abrirDashboardCampanha(campanhaId), 1000);
        }
      }
      
      // Recarregar lista de campanhas
      setTimeout(() => carregarCampanhas(), 1000);
    } catch (error) {
      mostrarAlerta("Erro ao pausar execução: " + error.message, "error");
      console.error(error);
    }
  }

  // Continuar execução
  async function continuarExecucao(execucaoId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      // Obter dados da execução
      const { data: execucao, error: errorExecucao } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("campanha_id")
        .eq("id", execucaoId)
        .single();

      if (errorExecucao || !execucao) {
        throw new Error("Execução não encontrada");
      }

      // Obter webhook URL (busca do Supabase primeiro)
      let webhookUrl = await obterWebhookN8N();

      if (!webhookUrl) {
        mostrarAlerta(
          "Webhook N8N não configurado. Configure em Configurações.",
          "error"
        );
        return;
      }

      // Atualizar status no banco
      const { error: updateError } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .update({
          status_execucao: "em_andamento",
          updated_at: new Date().toISOString(),
        })
        .eq("id", execucaoId);

      if (updateError) throw updateError;

      // Chamar webhook para continuar execução
      mostrarAlerta("Continuando execução...", "success");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execucao_id: execucaoId,
          continuar: true,
          trigger_tipo: "manual",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      mostrarAlerta("Execução continuada com sucesso!", "success");
      
      // Recarregar dashboard se estiver aberto
      const modal = document.getElementById("modalDashboard");
      if (modal) {
        const campanhaId = modal.dataset.campanhaId || execucao.campanha_id;
        if (campanhaId) {
          setTimeout(() => abrirDashboardCampanha(campanhaId), 1000);
        }
      }
      
      // Recarregar lista de campanhas
      setTimeout(() => carregarCampanhas(), 1000);
    } catch (error) {
      mostrarAlerta("Erro ao continuar execução: " + error.message, "error");
      console.error(error);
    }
  }

  // Cancelar execução
  async function cancelarExecucao(execucaoId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    if (!confirm("Deseja cancelar esta execução? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      // Obter campanha_id antes de cancelar
      const { data: execucao, error: errorExecucao } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("campanha_id")
        .eq("id", execucaoId)
        .single();

      if (errorExecucao || !execucao) {
        throw new Error("Execução não encontrada");
      }

      const { error } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .update({
          status_execucao: "cancelada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", execucaoId);

      if (error) throw error;

      mostrarAlerta("Execução cancelada com sucesso!", "success");
      
      // Recarregar dashboard se estiver aberto
      const modal = document.getElementById("modalDashboard");
      if (modal) {
        const campanhaId = modal.dataset.campanhaId || execucao.campanha_id;
        if (campanhaId) {
          setTimeout(() => abrirDashboardCampanha(campanhaId), 1000);
        }
      }
      
      // Recarregar lista de campanhas
      setTimeout(() => carregarCampanhas(), 1000);
    } catch (error) {
      mostrarAlerta("Erro ao cancelar execução: " + error.message, "error");
      console.error(error);
    }
  }

  // Ver execuções da campanha
  /**
   * Abre modal com histórico de envios de uma campanha
   * @param {string} campanhaId - ID da campanha
   */
  async function verEnviosCampanha(campanhaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      // Buscar dados da campanha
      const { data: campanha, error: errorCampanha } = await supabaseClient
        .from("instacar_campanhas")
        .select("nome")
        .eq("id", campanhaId)
        .single();

      if (errorCampanha) throw errorCampanha;

      // Buscar histórico de envios da campanha (sem limite para ter todos os dados)
      const { data: envios, error: errorEnvios } = await supabaseClient
        .from("instacar_historico_envios")
        .select(`
          *,
          instacar_clientes_envios (
            nome_cliente,
            telefone
          )
        `)
        .eq("campanha_id", campanhaId)
        .order("timestamp_envio", { ascending: false });

      if (errorEnvios) throw errorEnvios;

      // Calcular estatísticas
      const totalEnvios = envios?.length || 0;
      const enviados = envios?.filter(e => e.status_envio === "enviado").length || 0;
      const erros = envios?.filter(e => e.status_envio === "erro").length || 0;
      const bloqueados = envios?.filter(e => e.status_envio === "bloqueado" || e.status_envio === "sem_whatsapp").length || 0;

      // Criar modal usando a mesma estrutura do verHistoricoExecucao
      const modalHtml = `
        <div id="modalEnviosCampanha" class="modal active" data-campanha-id="${campanhaId}">
          <div class="modal-content" style="max-width: 1000px; max-height: 90vh;">
            <div class="modal-header">
              <h2>📨 Histórico de Envios - ${campanha?.nome || "Campanha"}</h2>
              <button onclick="fecharModalEnviosCampanha()" class="close-btn">&times;</button>
            </div>
            <div class="modal-body" style="overflow-y: auto; max-height: calc(90vh - 120px);">
              ${envios && envios.length > 0 ? `
                <!-- Estatísticas -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                  <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #2196F3;" id="statTotalEnvios">${totalEnvios}</div>
                    <div style="color: #666; font-size: 12px;">Total de Envios</div>
                  </div>
                  <div style="background: #e8f5e9; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #4caf50;" id="statEnviados">${enviados}</div>
                    <div style="color: #666; font-size: 12px;">Enviados</div>
                  </div>
                  <div style="background: #ffebee; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #f44336;" id="statErros">${erros}</div>
                    <div style="color: #666; font-size: 12px;">Erros</div>
                  </div>
                  <div style="background: #fff3e0; padding: 15px; border-radius: 5px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ff9800;" id="statBloqueados">${bloqueados}</div>
                    <div style="color: #666; font-size: 12px;">Bloqueados</div>
                  </div>
                </div>

                <!-- Filtros e Ordenação -->
                <div style="background: #f9fafb; padding: 10px; border-radius: 5px; margin-bottom: 15px;">
                  <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 8px;">
                    <label style="font-weight: 500; color: #666; font-size: 13px;">Filtros:</label>
                    <select id="filtroStatusEnvios" onchange="filtrarEnviosCampanha()" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                      <option value="">Todos os Status</option>
                      <option value="enviado">✅ Enviado</option>
                      <option value="erro">❌ Erro</option>
                      <option value="bloqueado">🚫 Bloqueado</option>
                      <option value="sem_whatsapp">📵 Sem WhatsApp</option>
                    </select>
                    <input 
                      type="text" 
                      id="buscaEnvios" 
                      placeholder="🔍 Buscar por nome do cliente..." 
                      onkeyup="filtrarEnviosCampanha()"
                      style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; flex: 1; min-width: 200px;"
                    />
                    <input 
                      type="text" 
                      id="buscaTelefoneEnvios" 
                      placeholder="📱 Buscar por telefone..." 
                      onkeyup="filtrarEnviosCampanha()"
                      style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px; min-width: 180px;"
                    />
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                    <label style="font-weight: 500; color: #666; font-size: 13px;">Ordenar por:</label>
                    <select id="ordenacaoEnvios" onchange="filtrarEnviosCampanha()" style="padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;">
                      <option value="timestamp_desc">📅 Data/Hora (Mais Recente)</option>
                      <option value="timestamp_asc">📅 Data/Hora (Mais Antigo)</option>
                      <option value="cliente_asc">👤 Cliente (A-Z)</option>
                      <option value="cliente_desc">👤 Cliente (Z-A)</option>
                      <option value="status_asc">✅ Status (A-Z)</option>
                      <option value="status_desc">✅ Status (Z-A)</option>
                      <option value="telefone_asc">📱 Telefone (Crescente)</option>
                      <option value="telefone_desc">📱 Telefone (Decrescente)</option>
                    </select>
                    <span style="color: #666; font-size: 12px; margin-left: auto;" id="contadorEnviosFiltrados">
                      Mostrando ${totalEnvios} de ${totalEnvios} envios
                    </span>
                  </div>
                </div>

                <h3 style="margin-top: 20px; margin-bottom: 15px;">Lista de Envios</h3>
                <div id="listaEnviosCampanha" style="background: white; border: 1px solid #ddd; border-radius: 4px; padding: 10px; max-height: 500px; overflow-y: auto;">
                  <!-- Será preenchido por filtrarEnviosCampanha() -->
                </div>
              ` : `
                <div style="text-align: center; padding: 40px; color: #999;">
                  <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                  <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">Nenhum envio encontrado</div>
                  <div style="font-size: 14px;">Esta campanha ainda não teve envios registrados.</div>
                </div>
              `}
            </div>
            <div class="modal-footer">
              <button onclick="fecharModalEnviosCampanha()" class="btn-secondary">Fechar</button>
            </div>
          </div>
        </div>
      `;

      // Remover modal anterior se existir
      const modalAnterior = document.getElementById("modalEnviosCampanha");
      if (modalAnterior) {
        modalAnterior.remove();
      }

      // Adicionar modal ao DOM
      document.body.insertAdjacentHTML("beforeend", modalHtml);

      // Armazenar dados no modal para acesso das funções de filtro
      const modal = document.getElementById("modalEnviosCampanha");
      if (modal && envios) {
        modal.dataset.envios = JSON.stringify(envios);
      }

      // Renderizar lista inicial
      if (envios && envios.length > 0) {
        filtrarEnviosCampanha();
      }
    } catch (error) {
      mostrarAlerta("Erro ao carregar envios: " + error.message, "error");
      console.error(error);
    }
  }

  /**
   * Filtra e ordena os envios no modal
   */
  function filtrarEnviosCampanha() {
    const modal = document.getElementById("modalEnviosCampanha");
    if (!modal) return;

    const enviosJson = modal.dataset.envios;
    if (!enviosJson) return;

    const envios = JSON.parse(enviosJson);
    const filtroStatus = document.getElementById("filtroStatusEnvios")?.value || "";
    const buscaNome = document.getElementById("buscaEnvios")?.value.toLowerCase() || "";
    const buscaTelefone = document.getElementById("buscaTelefoneEnvios")?.value.toLowerCase() || "";
    const ordenacao = document.getElementById("ordenacaoEnvios")?.value || "timestamp_desc";

    // Aplicar filtros
    let enviosFiltrados = envios.filter((envio) => {
      const cliente = envio.instacar_clientes_envios;
      const nomeCliente = (cliente?.nome_cliente || "").toLowerCase();
      const telefone = (envio.telefone || cliente?.telefone || "").toLowerCase();

      // Filtro por status
      if (filtroStatus && envio.status_envio !== filtroStatus) {
        return false;
      }

      // Filtro por nome do cliente
      if (buscaNome && !nomeCliente.includes(buscaNome)) {
        return false;
      }

      // Filtro por telefone
      if (buscaTelefone && !telefone.includes(buscaTelefone)) {
        return false;
      }

      return true;
    });

    // Aplicar ordenação
    enviosFiltrados.sort((a, b) => {
      const clienteA = a.instacar_clientes_envios;
      const clienteB = b.instacar_clientes_envios;
      const nomeA = clienteA?.nome_cliente || "";
      const nomeB = clienteB?.nome_cliente || "";

      const telefoneA = (a.telefone || clienteA?.telefone || "").toLowerCase();
      const telefoneB = (b.telefone || clienteB?.telefone || "").toLowerCase();

      switch (ordenacao) {
        case "timestamp_desc":
          return new Date(b.timestamp_envio || 0) - new Date(a.timestamp_envio || 0);
        case "timestamp_asc":
          return new Date(a.timestamp_envio || 0) - new Date(b.timestamp_envio || 0);
        case "cliente_asc":
          return nomeA.localeCompare(nomeB);
        case "cliente_desc":
          return nomeB.localeCompare(nomeA);
        case "status_asc":
          return (a.status_envio || "").localeCompare(b.status_envio || "");
        case "status_desc":
          return (b.status_envio || "").localeCompare(a.status_envio || "");
        case "telefone_asc":
          return telefoneA.localeCompare(telefoneB);
        case "telefone_desc":
          return telefoneB.localeCompare(telefoneA);
        default:
          return 0;
      }
    });

    // Recalcular estatísticas dos envios filtrados
    const totalFiltrado = enviosFiltrados.length;
    const enviadosFiltrado = enviosFiltrados.filter(e => e.status_envio === "enviado").length;
    const errosFiltrado = enviosFiltrados.filter(e => e.status_envio === "erro").length;
    const bloqueadosFiltrado = enviosFiltrados.filter(e => e.status_envio === "bloqueado" || e.status_envio === "sem_whatsapp").length;

    // Atualizar estatísticas no DOM
    const statTotal = document.getElementById("statTotalEnvios");
    const statEnviados = document.getElementById("statEnviados");
    const statErros = document.getElementById("statErros");
    const statBloqueados = document.getElementById("statBloqueados");

    if (statTotal) statTotal.textContent = totalFiltrado;
    if (statEnviados) statEnviados.textContent = enviadosFiltrado;
    if (statErros) statErros.textContent = errosFiltrado;
    if (statBloqueados) statBloqueados.textContent = bloqueadosFiltrado;

    // Atualizar contador
    const contador = document.getElementById("contadorEnviosFiltrados");
    if (contador) {
      contador.textContent = `Mostrando ${enviosFiltrados.length} de ${envios.length} envios`;
    }

    // Renderizar lista (mesmo formato do verHistoricoExecucao)
    const listaContainer = document.getElementById("listaEnviosCampanha");
    if (!listaContainer) return;

    if (enviosFiltrados.length === 0) {
      listaContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
          <div style="font-size: 16px; font-weight: 600; margin-bottom: 10px;">Nenhum envio encontrado</div>
          <div style="font-size: 14px;">Tente ajustar os filtros de busca.</div>
        </div>
      `;
      return;
    }

    listaContainer.innerHTML = enviosFiltrados.map((envio) => {
      const cliente = envio.instacar_clientes_envios;
      const nomeCliente = cliente?.nome_cliente || "N/A";
      const telefone = envio.telefone || cliente?.telefone || "N/A";
      const timestamp = formatarTimestampSP(envio.timestamp_envio);
      
      let statusColor = "#999";
      let statusIcon = "⏳";
      if (envio.status_envio === "enviado") {
        statusColor = "#4caf50";
        statusIcon = "✅";
      } else if (envio.status_envio === "erro") {
        statusColor = "#f44336";
        statusIcon = "❌";
      } else if (envio.status_envio === "bloqueado") {
        statusColor = "#ff9800";
        statusIcon = "🚫";
      } else if (envio.status_envio === "sem_whatsapp") {
        statusColor = "#ff9800";
        statusIcon = "📵";
      }

      const mensagemCompleta = envio.mensagem_enviada || "Sem mensagem";
      const mensagemId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const isLonga = mensagemCompleta.length > 200;

      return `
        <div style="padding: 12px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="font-size: 18px;">${statusIcon}</span>
              <strong style="color: ${statusColor}; font-size: 14px;">${envio.status_envio?.toUpperCase() || "N/A"}</strong>
              <span style="color: #999; font-size: 11px;">${timestamp}</span>
            </div>
            <div style="margin-bottom: 4px;">
              <strong style="font-size: 14px;">${nomeCliente}</strong>
              <span style="color: #666; font-size: 12px; margin-left: 8px;">${telefone}</span>
            </div>
            <div style="color: #666; font-size: 13px; margin-top: 6px; padding: 10px; background: #f5f5f5; border-radius: 4px; white-space: pre-wrap; line-height: 1.5; word-wrap: break-word; max-width: 100%;">
              ${isLonga ? `
                <div id="${mensagemId}-preview">
                  ${mensagemCompleta.substring(0, 200)}...
                  <button onclick="expandirMensagem('${mensagemId}')" style="margin-top: 8px; padding: 4px 8px; background: #2196F3; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Ver mensagem completa</button>
                </div>
                <div id="${mensagemId}-completa" style="display: none;">
                  ${mensagemCompleta}
                  <button onclick="colapsarMensagem('${mensagemId}')" style="margin-top: 8px; padding: 4px 8px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Ocultar</button>
                </div>
              ` : mensagemCompleta}
            </div>
            ${envio.mensagem_erro ? `
              <div style="color: #f44336; font-size: 11px; margin-top: 6px; padding: 6px; background: #ffebee; border-radius: 4px;">
                ⚠️ <strong>Erro:</strong> ${envio.mensagem_erro}
              </div>
            ` : ""}
            ${envio.tipo_envio && envio.tipo_envio !== "normal" ? `
              <div style="margin-top: 6px;">
                <span style="background: #e3f2fd; color: #1976d2; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600;">
                  ${envio.tipo_envio === "teste" ? "🧪 TESTE" : envio.tipo_envio === "debug" ? "🔍 DEBUG" : envio.tipo_envio.toUpperCase()}
                </span>
              </div>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  /**
   * Expande mensagem completa
   */
  function expandirMensagem(mensagemId) {
    const preview = document.getElementById(`${mensagemId}-preview`);
    const completa = document.getElementById(`${mensagemId}-completa`);
    if (preview) preview.style.display = 'none';
    if (completa) completa.style.display = 'block';
  }

  /**
   * Colapsa mensagem para preview
   */
  function colapsarMensagem(mensagemId) {
    const preview = document.getElementById(`${mensagemId}-preview`);
    const completa = document.getElementById(`${mensagemId}-completa`);
    if (preview) preview.style.display = 'block';
    if (completa) completa.style.display = 'none';
  }

  // Expor funções globalmente
  window.filtrarEnviosCampanha = filtrarEnviosCampanha;
  window.expandirMensagem = expandirMensagem;
  window.colapsarMensagem = colapsarMensagem;

  /**
   * Fecha o modal de envios da campanha
   */
  function fecharModalEnviosCampanha() {
    const modal = document.getElementById("modalEnviosCampanha");
    if (modal) {
      modal.remove();
    }
  }

  // Expor função globalmente
  window.verEnviosCampanha = verEnviosCampanha;
  window.fecharModalEnviosCampanha = fecharModalEnviosCampanha;

  // ============================================================================
  // Gerenciamento de Conexão WhatsApp (QR Code)
  // ============================================================================

  /**
   * Conecta uma instância WhatsApp via QR code (Uazapi)
   * @param {string} instanciaId - ID da instância no Supabase
   */
  async function conectarInstanciaWhatsApp(instanciaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    try {
      // Buscar dados da instância
      const { data: instancia, error: errorInstancia } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .eq("id", instanciaId)
        .single();

      if (errorInstancia || !instancia) {
        mostrarAlerta(
          "Erro ao carregar instância: " +
            (errorInstancia?.message || "Não encontrada"),
          "error"
        );
        return;
      }

      // Verificar se é Uazapi
      if (instancia.tipo_api !== "uazapi") {
        mostrarAlerta(
          "Conexão via QR code disponível apenas para instâncias Uazapi",
          "error"
        );
        return;
      }

      // Se já está conectado, perguntar se quer reconectar
      if (instancia.status_conexao === "connected") {
        const numeroInfo = instancia.numero_whatsapp
          ? `\n\n📱 WhatsApp atual: ${instancia.numero_whatsapp}${
              instancia.profile_name ? ` (${instancia.profile_name})` : ""
            }`
          : "";

        if (
          !confirm(
            `A instância "${instancia.nome}" já está conectada.${numeroInfo}\n\nDeseja desconectar e reconectar com um novo QR code?`
          )
        ) {
          return;
        }
        // Desconectar primeiro (sem pedir confirmação novamente)
        await desconectarInstanciaWhatsApp(instanciaId, instancia, false);

        // Aguardar um pouco para garantir que desconectou
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Atualizar status para connecting
      await supabaseClient
        .from("instacar_whatsapp_apis")
        .update({
          status_conexao: "connecting",
          ultima_atualizacao_status: new Date().toISOString(),
        })
        .eq("id", instanciaId);

      // Chamar API Uazapi para conectar (sem phone = gera QR code)
      const response = await fetch(`${instancia.base_url}/instance/connect`, {
        method: "POST",
        headers: {
          token: instancia.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Sem phone = gera QR code
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();

      // Exibir modal com QR code
      await exibirModalQRCode(instanciaId, instancia, data.instance?.qrcode);

      // Iniciar verificação periódica de status
      iniciarVerificacaoStatus(instanciaId, instancia);
    } catch (error) {
      console.error("Erro ao conectar instância:", error);
      mostrarAlerta("Erro ao conectar instância: " + error.message, "error");

      // Atualizar status para disconnected em caso de erro
      await supabaseClient
        .from("instacar_whatsapp_apis")
        .update({
          status_conexao: "disconnected",
          ultima_atualizacao_status: new Date().toISOString(),
        })
        .eq("id", instanciaId);
    }
  }

  /**
   * Desconecta uma instância WhatsApp
   * @param {string} instanciaId - ID da instância
   * @param {object} instancia - Dados da instância (opcional)
   * @param {boolean} confirmar - Se deve pedir confirmação (padrão: true)
   */
  async function desconectarInstanciaWhatsApp(
    instanciaId,
    instancia = null,
    confirmar = true
  ) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    if (!instancia) {
      const { data, error } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .eq("id", instanciaId)
        .single();

      if (error || !data) {
        mostrarAlerta("Erro ao carregar instância", "error");
        return;
      }
      instancia = data;
    }

    // Verificar se está conectado
    if (instancia.status_conexao !== "connected") {
      mostrarAlerta("A instância já está desconectada", "info");
      return;
    }

    // Pedir confirmação
    if (confirmar) {
      const numeroInfo = instancia.numero_whatsapp
        ? `\n\n📱 WhatsApp conectado: ${instancia.numero_whatsapp}${
            instancia.profile_name ? ` (${instancia.profile_name})` : ""
          }`
        : "";

      if (
        !confirm(
          `Tem certeza que deseja desconectar a instância "${instancia.nome}"?${numeroInfo}\n\nApós desconectar, será necessário escanear um novo QR code para reconectar.`
        )
      ) {
        return;
      }
    }

    try {
      // Chamar API Uazapi para desconectar
      const response = await fetch(
        `${instancia.base_url}/instance/disconnect`,
        {
          method: "POST",
          headers: {
            token: instancia.token,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      // Atualizar status no banco
      await supabaseClient
        .from("instacar_whatsapp_apis")
        .update({
          status_conexao: "disconnected",
          numero_whatsapp: null,
          profile_name: null,
          ultima_atualizacao_status: new Date().toISOString(),
        })
        .eq("id", instanciaId);

      mostrarAlerta(
        `✅ Instância "${instancia.nome}" desconectada com sucesso!\n\nPara reconectar, clique em "🔗 Conectar" e escaneie o novo QR code.`,
        "success"
      );

      // Atualizar interface
      await renderizarInstanciasUazapi();

      // Fechar modal de QR code se estiver aberto
      fecharModalQRCode();
    } catch (error) {
      console.error("Erro ao desconectar:", error);
      mostrarAlerta("Erro ao desconectar: " + error.message, "error");

      // Mesmo com erro, tentar atualizar status no banco para "disconnected"
      try {
        await supabaseClient
          .from("instacar_whatsapp_apis")
          .update({
            status_conexao: "disconnected",
            ultima_atualizacao_status: new Date().toISOString(),
          })
          .eq("id", instanciaId);
        await renderizarInstanciasUazapi();
      } catch (updateError) {
        console.error("Erro ao atualizar status no banco:", updateError);
      }
    }
  }

  /**
   * Exibe modal com QR code para conexão
   * @param {string} instanciaId - ID da instância
   * @param {object} instancia - Dados da instância
   * @param {string} qrcodeBase64 - QR code em base64
   */
  async function exibirModalQRCode(instanciaId, instancia, qrcodeBase64) {
    // Criar ou obter modal
    let modal = document.getElementById("modalQRCode");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "modalQRCode";
      modal.className = "modal";
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; text-align: center">
          <div class="modal-header">
            <h2>🔗 Conectar WhatsApp</h2>
            <button class="close" onclick="fecharModalQRCode()">&times;</button>
          </div>
          <div id="modalQRCodeContent">
            <p>Carregando QR code...</p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const content = document.getElementById("modalQRCodeContent");
    if (!content) return;

    if (qrcodeBase64) {
      content.innerHTML = `
        <div style="padding: 20px">
          <p style="margin-bottom: 20px; color: #666">
            Escaneie o QR code abaixo com o WhatsApp no seu celular:
          </p>
          <div style="display: flex; justify-content: center; margin-bottom: 20px">
            <img src="${qrcodeBase64}" alt="QR Code WhatsApp" style="max-width: 300px; border: 2px solid #ddd; border-radius: 8px" />
          </div>
          <p style="color: #856404; font-size: 12px; margin-bottom: 15px">
            ⚠️ O QR code expira em 2 minutos. Se expirar, clique em "Atualizar QR Code"
          </p>
          <div style="display: flex; gap: 10px; justify-content: center">
            <button onclick="atualizarQRCode('${instanciaId}')" class="btn-secondary">
              🔄 Atualizar QR Code
            </button>
            <button onclick="verificarStatusConexao('${instanciaId}')" class="btn-success">
              ✅ Verificar Conexão
            </button>
            <button onclick="fecharModalQRCode()" class="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="padding: 20px">
          <p style="color: #856404">
            ⚠️ QR code não disponível. Verificando status da conexão...
          </p>
          <button onclick="verificarStatusConexao('${instanciaId}')" class="btn-success" style="margin-top: 15px">
            ✅ Verificar Status
          </button>
        </div>
      `;
    }

    modal.classList.add("active");
  }

  /**
   * Fecha modal de QR code
   */
  function fecharModalQRCode() {
    const modal = document.getElementById("modalQRCode");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Atualiza QR code da instância
   * @param {string} instanciaId - ID da instância
   */
  async function atualizarQRCode(instanciaId) {
    await conectarInstanciaWhatsApp(instanciaId);
  }

  /**
   * Sincroniza status da instância com a API Uazapi
   * Busca o status real da API e atualiza o banco de dados
   * @param {string} instanciaId - ID da instância
   */
  async function sincronizarStatusInstancia(instanciaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    try {
      // Buscar dados da instância
      const { data: instancia, error: errorInstancia } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .eq("id", instanciaId)
        .single();

      if (errorInstancia || !instancia) {
        mostrarAlerta(
          "Erro ao carregar instância: " +
            (errorInstancia?.message || "Não encontrada"),
          "error"
        );
        return;
      }

      if (instancia.tipo_api !== "uazapi") {
        mostrarAlerta(
          "Sincronização de status disponível apenas para instâncias Uazapi",
          "error"
        );
        return;
      }

      // Mostrar indicador de carregamento
      mostrarAlerta("🔄 Sincronizando status com a API Uazapi...", "info");

      // Chamar API Uazapi para verificar status
      const response = await fetch(`${instancia.base_url}/instance/status`, {
        method: "GET",
        headers: {
          token: instancia.token,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const instanceData = data.instance || {};

      // Debug: Log da resposta completa para diagnóstico (apenas em caso de erro ou quando necessário)
      // console.log("=== SINCRONIZAÇÃO DE STATUS ===");
      // console.log("Resposta completa da API Uazapi:", JSON.stringify(data, null, 2));

      // Extrair número do WhatsApp do JID (múltiplas tentativas)
      let numeroWhatsApp = null;

      // Tentativa 1: data.status.jid como string (formato: "555591112668:21@s.whatsapp.net")
      // Extrair o número antes dos dois pontos
      if (data.status?.jid && typeof data.status.jid === "string") {
        const jidMatch = data.status.jid.match(/^(\d+):/);
        if (jidMatch && jidMatch[1]) {
          numeroWhatsApp = jidMatch[1];
          // console.log("✅ Número extraído de data.status.jid (string):", numeroWhatsApp);
        }
      }
      // Tentativa 2: data.status.jid.user (formato objeto com propriedades)
      else if (data.status?.jid?.user) {
        numeroWhatsApp = String(data.status.jid.user).trim();
      }
      // Tentativa 3: instanceData.owner (número do proprietário da instância)
      else if (instanceData.owner) {
        numeroWhatsApp = String(instanceData.owner).trim();
      }
      // Tentativa 4: instanceData.jid?.user
      else if (instanceData.jid?.user) {
        numeroWhatsApp = String(instanceData.jid.user).trim();
      }
      // Tentativa 5: data.jid?.user (direto no objeto data)
      else if (data.jid?.user) {
        numeroWhatsApp = String(data.jid.user).trim();
      }
      // Tentativa 6: instanceData.phoneNumber (algumas APIs retornam assim)
      else if (instanceData.phoneNumber) {
        numeroWhatsApp = String(instanceData.phoneNumber).trim();
      }

      // Log apenas se não encontrou o número (para diagnóstico)
      if (!numeroWhatsApp && statusReal === "connected") {
        console.warn(
          "⚠️ Número de WhatsApp não encontrado na resposta da API (instância conectada)"
        );
        console.warn("Estrutura da resposta:", {
          hasStatus: !!data.status,
          hasJid: !!data.status?.jid,
          jidType: typeof data.status?.jid,
          jidValue: data.status?.jid,
          instanceOwner: instanceData.owner,
        });
      }

      // Determinar status real
      const statusReal = instanceData.status || "disconnected";
      const statusAnterior = instancia.status_conexao || "disconnected";

      // Preparar dados para atualização
      const updateData = {
        status_conexao: statusReal,
        ultima_atualizacao_status: new Date().toISOString(),
      };

      // Atualizar número de WhatsApp
      if (numeroWhatsApp) {
        updateData.numero_whatsapp = numeroWhatsApp;
      } else if (statusReal === "disconnected") {
        // Se desconectado, limpar número
        updateData.numero_whatsapp = null;
        updateData.profile_name = null;
      }
      // Se conectado mas não tem número na resposta, manter o que já existe no banco
      // Não adicionar numero_whatsapp ao updateData para não sobrescrever

      // Atualizar nome do perfil
      if (instanceData.profileName) {
        updateData.profile_name = instanceData.profileName;
      }

      // Atualizar no banco de dados
      const { data: updatedData, error: updateError } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .update(updateData)
        .eq("id", instanciaId)
        .select()
        .single();

      if (updateError) {
        console.error("Erro ao atualizar banco de dados:", updateError);
        throw new Error("Erro ao atualizar banco: " + updateError.message);
      }

      // Aguardar um pouco para garantir que o banco foi atualizado
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Atualizar interface (forçar recarregamento completo sem verificação automática)
      // false = não verificar status automaticamente (já foi verificado)
      // true = forçar recarregamento do banco
      await renderizarInstanciasUazapi(false, true);

      // Mensagem de sucesso
      if (statusReal === "connected") {
        if (numeroWhatsApp) {
          mostrarAlerta(
            `✅ Status sincronizado!\n\nStatus: 🟢 Conectado\n📱 WhatsApp: ${numeroWhatsApp}${
              instanceData.profileName ? ` (${instanceData.profileName})` : ""
            }`,
            "success"
          );
        } else {
          // Conectado mas número não foi encontrado na resposta
          mostrarAlerta(
            `✅ Status sincronizado!\n\nStatus: 🟢 Conectado\n⚠️ Número de WhatsApp não encontrado na resposta da API.\n\nVerifique o console (F12) para ver a resposta completa da API.`,
            "warning"
          );
        }
      } else if (statusReal === "connecting") {
        mostrarAlerta(
          `🟡 Status sincronizado!\n\nStatus: Conectando...\nAguarde o escaneamento do QR code.`,
          "info"
        );
      } else {
        const mudouStatus = statusAnterior !== statusReal;
        mostrarAlerta(
          `🔴 Status sincronizado!\n\nStatus: Desconectado${
            mudouStatus
              ? "\n\n⚠️ O status foi atualizado no banco de dados."
              : ""
          }`,
          mudouStatus ? "warning" : "info"
        );
      }
    } catch (error) {
      console.error("Erro ao sincronizar status:", error);
      mostrarAlerta("Erro ao sincronizar status: " + error.message, "error");
    }
  }

  /**
   * Verifica status automaticamente de múltiplas instâncias
   * Executa em paralelo sem bloquear a interface
   * @param {Array} instancias - Array de instâncias para verificar
   */
  async function verificarStatusInstanciasAutomatico(instancias) {
    if (!supabaseClient || !instancias || instancias.length === 0) {
      return;
    }

    // Verificar apenas instâncias Uazapi ativas
    const instanciasParaVerificar = instancias.filter(
      (i) => i.tipo_api === "uazapi" && i.ativo
    );

    if (instanciasParaVerificar.length === 0) {
      return;
    }

    // Verificar status em paralelo (máximo 3 por vez para não sobrecarregar)
    const batchSize = 3;
    for (let i = 0; i < instanciasParaVerificar.length; i += batchSize) {
      const batch = instanciasParaVerificar.slice(i, i + batchSize);

      // Executar verificações em paralelo
      await Promise.allSettled(
        batch.map((instancia) => verificarStatusInstanciaSilencioso(instancia))
      );

      // Pequeno delay entre batches para não sobrecarregar a API
      if (i + batchSize < instanciasParaVerificar.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Atualizar interface após todas as verificações
    await renderizarInstanciasUazapi(false); // false = não verificar novamente
  }

  /**
   * Verifica status de uma instância silenciosamente (sem mostrar alertas)
   * Usado para verificação automática
   * @param {object} instancia - Dados da instância
   */
  async function verificarStatusInstanciaSilencioso(instancia) {
    if (!instancia || instancia.tipo_api !== "uazapi") {
      return;
    }

    try {
      const response = await fetch(`${instancia.base_url}/instance/status`, {
        method: "GET",
        headers: {
          token: instancia.token,
        },
      });

      if (!response.ok) {
        return; // Silenciosamente ignora erros na verificação automática
      }

      const data = await response.json();
      const instanceData = data.instance || {};

      // Extrair número do WhatsApp do JID
      let numeroWhatsApp = null;
      if (data.status?.jid?.user) {
        numeroWhatsApp = data.status.jid.user;
      }

      // Preparar dados para atualização
      const updateData = {
        status_conexao: instanceData.status || "disconnected",
        ultima_atualizacao_status: new Date().toISOString(),
      };

      if (numeroWhatsApp) {
        updateData.numero_whatsapp = numeroWhatsApp;
      } else if (instanceData.status === "disconnected") {
        updateData.numero_whatsapp = null;
        updateData.profile_name = null;
      }

      if (instanceData.profileName) {
        updateData.profile_name = instanceData.profileName;
      }

      // Atualizar no banco de dados
      await supabaseClient
        .from("instacar_whatsapp_apis")
        .update(updateData)
        .eq("id", instancia.id);
    } catch (error) {
      // Silenciosamente ignora erros na verificação automática
      console.debug("Erro na verificação automática de status:", error);
    }
  }

  /**
   * Inicia verificação periódica de status para instâncias conectadas ou conectando
   * Verifica a cada 30 segundos
   */
  function iniciarVerificacaoPeriodicaStatus() {
    // Limpar verificação anterior se existir
    if (window.verificacaoPeriodicaStatusInterval) {
      clearInterval(window.verificacaoPeriodicaStatusInterval);
    }

    // Verificar a cada 30 segundos
    window.verificacaoPeriodicaStatusInterval = setInterval(async () => {
      if (!supabaseClient) return;

      try {
        // Buscar apenas instâncias Uazapi ativas que estão connected ou connecting
        const { data: instancias, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .select("*")
          .eq("tipo_api", "uazapi")
          .eq("ativo", true)
          .in("status_conexao", ["connected", "connecting"]);

        if (error || !instancias || instancias.length === 0) {
          return;
        }

        // Verificar status de cada instância
        await verificarStatusInstanciasAutomatico(instancias);

        // Atualizar interface
        await renderizarInstanciasUazapi(false);
      } catch (error) {
        console.debug("Erro na verificação periódica:", error);
      }
    }, 30000); // 30 segundos
  }

  /**
   * Para verificação periódica de status
   */
  function pararVerificacaoPeriodicaStatus() {
    if (window.verificacaoPeriodicaStatusInterval) {
      clearInterval(window.verificacaoPeriodicaStatusInterval);
      window.verificacaoPeriodicaStatusInterval = null;
    }
  }

  /**
   * Verifica status da conexão da instância
   * @param {string} instanciaId - ID da instância
   */
  async function verificarStatusConexao(instanciaId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    try {
      // Buscar dados da instância
      const { data: instancia, error: errorInstancia } = await supabaseClient
        .from("instacar_whatsapp_apis")
        .select("*")
        .eq("id", instanciaId)
        .single();

      if (errorInstancia || !instancia) {
        mostrarAlerta("Erro ao carregar instância", "error");
        return;
      }

      if (instancia.tipo_api !== "uazapi") {
        mostrarAlerta(
          "Verificação de status disponível apenas para instâncias Uazapi",
          "error"
        );
        return;
      }

      // Chamar API Uazapi para verificar status
      const response = await fetch(`${instancia.base_url}/instance/status`, {
        method: "GET",
        headers: {
          token: instancia.token,
        },
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      const instanceData = data.instance || {};

      // Extrair número do WhatsApp do JID
      let numeroWhatsApp = null;
      if (data.status?.jid?.user) {
        numeroWhatsApp = data.status.jid.user;
      }

      // Atualizar no banco de dados
      const updateData = {
        status_conexao: instanceData.status || "disconnected",
        ultima_atualizacao_status: new Date().toISOString(),
      };

      if (numeroWhatsApp) {
        updateData.numero_whatsapp = numeroWhatsApp;
      }
      if (instanceData.profileName) {
        updateData.profile_name = instanceData.profileName;
      }

      await supabaseClient
        .from("instacar_whatsapp_apis")
        .update(updateData)
        .eq("id", instanciaId);

      // Atualizar interface
      await renderizarInstanciasUazapi();

      // Se conectado, fechar modal de QR code
      if (instanceData.status === "connected") {
        fecharModalQRCode();
        mostrarAlerta(
          `✅ Instância conectada com sucesso!${
            numeroWhatsApp ? `\n📱 WhatsApp: ${numeroWhatsApp}` : ""
          }`,
          "success"
        );
      } else if (instanceData.status === "connecting") {
        // Se ainda está conectando, atualizar QR code se disponível
        if (instanceData.qrcode) {
          await exibirModalQRCode(instanciaId, instancia, instanceData.qrcode);
        }
        mostrarAlerta(
          "⏳ Aguardando conexão... Escaneie o QR code no WhatsApp",
          "info"
        );
      } else {
        mostrarAlerta(
          "❌ Instância desconectada. Tente conectar novamente.",
          "error"
        );
        fecharModalQRCode();
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      mostrarAlerta("Erro ao verificar status: " + error.message, "error");
    }
  }

  /**
   * Inicia verificação periódica de status da conexão
   * @param {string} instanciaId - ID da instância
   * @param {object} instancia - Dados da instância
   */
  function iniciarVerificacaoStatus(instanciaId, instancia) {
    // Limpar verificação anterior se existir
    if (window.verificacaoStatusInterval) {
      clearInterval(window.verificacaoStatusInterval);
    }

    let tentativas = 0;
    const maxTentativas = 40; // 40 tentativas * 3s = 2 minutos (tempo de expiração do QR code)

    window.verificacaoStatusInterval = setInterval(async () => {
      tentativas++;

      try {
        const response = await fetch(`${instancia.base_url}/instance/status`, {
          method: "GET",
          headers: {
            token: instancia.token,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const instanceData = data.instance || {};

          // Atualizar no banco
          let numeroWhatsApp = null;
          if (data.status?.jid?.user) {
            numeroWhatsApp = data.status.jid.user;
          }

          const updateData = {
            status_conexao: instanceData.status || "disconnected",
            ultima_atualizacao_status: new Date().toISOString(),
          };

          if (numeroWhatsApp) {
            updateData.numero_whatsapp = numeroWhatsApp;
          }
          if (instanceData.profileName) {
            updateData.profile_name = instanceData.profileName;
          }

          await supabaseClient
            .from("instacar_whatsapp_apis")
            .update(updateData)
            .eq("id", instanciaId);

          // Se conectado, parar verificação
          if (instanceData.status === "connected") {
            clearInterval(window.verificacaoStatusInterval);
            await renderizarInstanciasUazapi();
            fecharModalQRCode();
            mostrarAlerta(
              `✅ Instância conectada com sucesso!${
                numeroWhatsApp ? `\n📱 WhatsApp: ${numeroWhatsApp}` : ""
              }`,
              "success"
            );
          } else if (instanceData.status === "disconnected") {
            // Se desconectou, parar verificação
            clearInterval(window.verificacaoStatusInterval);
            await renderizarInstanciasUazapi();
          } else if (instanceData.qrcode) {
            // Atualizar QR code se mudou
            await exibirModalQRCode(
              instanciaId,
              instancia,
              instanceData.qrcode
            );
          }
        }

        // Parar após max tentativas
        if (tentativas >= maxTentativas) {
          clearInterval(window.verificacaoStatusInterval);
          mostrarAlerta(
            "⏱️ Tempo de conexão expirado. Tente novamente.",
            "warning"
          );
        }
      } catch (error) {
        console.error("Erro na verificação periódica:", error);
        // Continuar tentando mesmo com erro
      }
    }, 3000); // Verificar a cada 3 segundos
  }

  // Expor funções globalmente IMEDIATAMENTE (antes do DOM estar pronto)
  // Isso garante que as funções estejam disponíveis para os atributos onclick
  window.conectarSupabase = conectarSupabase;
  window.atualizarStatusConexoes = atualizarStatusConexoes;
  window.abrirModalNovaCampanha = abrirModalNovaCampanha;
  window.carregarCampanhas = carregarCampanhas;
  window.fecharModal = fecharModal;
  window.editarCampanha = editarCampanha;
  window.selecionarTodosClientes = selecionarTodosClientes;
  window.desmarcarTodosClientes = desmarcarTodosClientes;
  window.inverterSelecaoClientes = inverterSelecaoClientes;
  window.filtrarClientesSelecao = filtrarClientesSelecao;
  window.toggleClienteSelecao = toggleClienteSelecao;
  window.renderizarListaClientesSelecao = renderizarListaClientesSelecao;
  window.atualizarContadorSelecao = atualizarContadorSelecao;
  window.desmarcarTodosClientes = desmarcarTodosClientes;
  window.inverterSelecaoClientes = inverterSelecaoClientes;
  window.filtrarClientesSelecao = filtrarClientesSelecao;
  window.toggleClienteSelecao = toggleClienteSelecao;
  window.renderizarListaClientesSelecao = renderizarListaClientesSelecao;
  window.toggleAtivo = toggleAtivo;
  window.dispararCampanha = dispararCampanha;
  window.abrirDashboardCampanha = abrirDashboardCampanha;
  window.fecharModalDashboard = fecharModalDashboard;
  window.pausarExecucao = pausarExecucao;
  window.continuarExecucao = continuarExecucao;
  window.cancelarExecucao = cancelarExecucao;
  window.alternarVisualizacaoCampanhas = alternarVisualizacaoCampanhas;
  window.verHistoricoExecucao = verHistoricoExecucao;
  window.fecharModalHistoricoExecucao = fecharModalHistoricoExecucao;
  
  // Função global para atualizar validação do prompt baseado no template selecionado
  window.atualizarValidacaoPrompt = function() {
    const templatePromptId = document.getElementById("template_prompt_id")?.value;
    const promptIaField = document.getElementById("prompt_ia");
    const promptIaRequired = document.getElementById("prompt_ia_required");
    const promptIaHelp = document.getElementById("prompt_ia_help");
    
    if (!promptIaField) return; // Campo não existe ainda
    
    if (templatePromptId) {
      // Template selecionado: prompt não é obrigatório
      promptIaField.removeAttribute("required");
      if (promptIaRequired) promptIaRequired.style.display = "none";
      if (promptIaHelp) {
        promptIaHelp.textContent = "Opcional quando um template está selecionado. O prompt do template será usado.";
        promptIaHelp.style.color = "#666";
      }
    } else {
      // Sem template: prompt é obrigatório
      promptIaField.setAttribute("required", "required");
      if (promptIaRequired) promptIaRequired.style.display = "inline";
      if (promptIaHelp) {
        promptIaHelp.textContent = "Obrigatório apenas se nenhum template de prompt for selecionado.";
        promptIaHelp.style.color = "#666";
      }
    }
  };

  // Funções de configurações
  window.abrirModalConfiguracoes = abrirModalConfiguracoes;
  window.fecharModalConfiguracoes = fecharModalConfiguracoes;
  window.salvarConfiguracoes = salvarConfiguracoes;
  // window.carregarConfiguracoesSalvas removido - agora é automático
  window.carregarConfiguracoesNoModal = carregarConfiguracoesNoModal;
  window.exportarConfiguracoes = exportarConfiguracoes;
  window.importarConfiguracoes = importarConfiguracoes;
  window.limparConfiguracoes = limparConfiguracoes;
  window.togglePasswordVisibility = togglePasswordVisibility;

  // Funções de instâncias Uazapi
  window.abrirModalNovaInstanciaUazapi = abrirModalNovaInstanciaUazapi;
  window.fecharModalInstanciaUazapi = fecharModalInstanciaUazapi;
  window.salvarInstanciaUazapi = salvarInstanciaUazapi;
  window.editarInstanciaUazapi = abrirModalNovaInstanciaUazapi;
  window.excluirInstanciaUazapi = excluirInstanciaUazapi;
  window.renderizarInstanciasUazapi = renderizarInstanciasUazapi;
  window.carregarInstanciasUazapi = carregarInstanciasUazapi;

  // Funções de conexão WhatsApp
  window.conectarInstanciaWhatsApp = conectarInstanciaWhatsApp;
  window.desconectarInstanciaWhatsApp = desconectarInstanciaWhatsApp;
  window.fecharModalQRCode = fecharModalQRCode;
  window.atualizarQRCode = atualizarQRCode;
  window.verificarStatusConexao = verificarStatusConexao;
  window.sincronizarStatusInstancia = sincronizarStatusInstancia;

  /**
   * Inicializa preferências de ordenação de clientes do localStorage
   */
  function inicializarOrdenacaoClientes() {
    // Inicializar ordenação da tela inicial (Gerenciar Clientes)
    const campoSalvo = localStorage.getItem('ordenacaoClientes_campo');
    const direcaoSalva = localStorage.getItem('ordenacaoClientes_direcao');
    
    if (campoSalvo) {
      const selectCampo = document.getElementById("ordenacaoCampo");
      if (selectCampo) {
        selectCampo.value = campoSalvo;
      }
    }
    
    if (direcaoSalva) {
      const selectDirecao = document.getElementById("ordenacaoDirecao");
      if (selectDirecao) {
        selectDirecao.value = direcaoSalva;
      }
    }

    // Inicializar ordenação da seleção de clientes para campanhas
    const campoSalvoSelecao = localStorage.getItem('ordenacaoClientesSelecao_campo');
    const direcaoSalvaSelecao = localStorage.getItem('ordenacaoClientesSelecao_direcao');
    
    if (campoSalvoSelecao) {
      const selectCampoSelecao = document.getElementById("ordenacaoCampoSelecao");
      if (selectCampoSelecao) {
        selectCampoSelecao.value = campoSalvoSelecao;
      }
    }
    
    if (direcaoSalvaSelecao) {
      const selectDirecaoSelecao = document.getElementById("ordenacaoDirecaoSelecao");
      if (selectDirecaoSelecao) {
        selectDirecaoSelecao.value = direcaoSalvaSelecao;
      }
    }
  }

  // Inicializar quando DOM estiver pronto
  async function inicializarApp() {
    // Carregar configurações automaticamente (Supabase > localStorage > config.js)
    const savedConfig = await carregarConfiguracoesDoLocalStorage();

    // Atualizar config global com valores do localStorage ou config.js
    if (!window.INSTACAR_CONFIG) {
      window.INSTACAR_CONFIG = {};
    }

    if (savedConfig) {
      // Prioridade: localStorage (apenas N8N, Supabase vem de variáveis de ambiente, Uazapi via instâncias)
      if (savedConfig.n8nWebhookUrl) {
        window.INSTACAR_CONFIG.n8nWebhookUrl = savedConfig.n8nWebhookUrl;
      }
      // Uazapi agora é gerenciado via instâncias no Supabase, não mais no localStorage
    } else if (window.INSTACAR_CONFIG) {
      // Fallback: usar config.js se localStorage não tiver nada (apenas N8N)
      // (já está em window.INSTACAR_CONFIG)
    }

    // Atualizar status inicial (após DOM estar pronto)
    setTimeout(() => {
      atualizarStatusConexoes().catch(console.error);
    }, 200);

    // Tentar conectar automaticamente (Supabase vem de variáveis de ambiente)
    // Conectar automaticamente após um pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
      conectarSupabase();
      // Após conectar ao Supabase, a verificação periódica será iniciada
      // quando o modal de configurações for aberto
      // carregarListaClientes será chamada automaticamente após a conexão ser estabelecida
    }, 400);

    // Inicializar formulário
    inicializarFormulario();

    // Inicializar preferências de ordenação de clientes
    inicializarOrdenacaoClientes();

    // Inicializar preferência de visualização de campanhas
    const modoSalvo = localStorage.getItem("campanhasViewMode") || "grid";
    modoVisualizacaoCampanhas = modoSalvo;
    // Atualizar botões de toggle se existirem
    setTimeout(() => {
      const btnGrid = document.getElementById("viewToggleGrid");
      const btnList = document.getElementById("viewToggleList");
      if (btnGrid && btnList) {
        if (modoSalvo === "grid") {
          btnGrid.classList.add("active");
          btnList.classList.remove("active");
        } else {
          btnGrid.classList.remove("active");
          btnList.classList.add("active");
        }
      }
    }, 100);

    // Configurar event listeners para atualizar estimativas
    const limiteInput = document.getElementById("limite_envios_dia");
    const intervaloInput = document.getElementById("intervalo_envios_segundos");

    if (limiteInput) {
      limiteInput.addEventListener("input", atualizarEstimativas);
    }
    if (intervaloInput) {
      intervaloInput.addEventListener("input", atualizarEstimativas);
    }

    // Event listeners para novos campos de lote e horário
    const tamanhoLoteInput = document.getElementById("tamanho_lote");
    const horarioInicioInput = document.getElementById("horario_inicio");
    const horarioFimInput = document.getElementById("horario_fim");

    if (tamanhoLoteInput) {
      tamanhoLoteInput.addEventListener("input", atualizarEstimativas);
    }
    if (horarioInicioInput) {
      horarioInicioInput.addEventListener("change", atualizarEstimativas);
    }
    if (horarioFimInput) {
      horarioFimInput.addEventListener("change", atualizarEstimativas);
    }

    // Event listeners para campos de almoço
    const pausarAlmocoCheck = document.getElementById("pausar_almoco");
    const horarioAlmocoInicioInput = document.getElementById("horario_almoco_inicio");
    const horarioAlmocoFimInput = document.getElementById("horario_almoco_fim");
    const quantidadeClientesInput = document.getElementById("quantidade_clientes");

    if (pausarAlmocoCheck) {
      pausarAlmocoCheck.addEventListener("change", atualizarEstimativas);
    }
    if (horarioAlmocoInicioInput) {
      horarioAlmocoInicioInput.addEventListener("change", atualizarEstimativas);
    }
    if (horarioAlmocoFimInput) {
      horarioAlmocoFimInput.addEventListener("change", atualizarEstimativas);
    }
    if (quantidadeClientesInput) {
      quantidadeClientesInput.addEventListener("input", atualizarEstimativas);
    }

    // Event listeners para configuração de dias da semana
    const modoConfiguracaoPadrao = document.getElementById("modo_configuracao_padrao");
    const modoConfiguracaoIndividual = document.getElementById("modo_configuracao_individual");
    if (modoConfiguracaoPadrao) {
      modoConfiguracaoPadrao.addEventListener("change", atualizarEstimativas);
    }
    if (modoConfiguracaoIndividual) {
      modoConfiguracaoIndividual.addEventListener("change", atualizarEstimativas);
    }

    // Event listener para validação inteligente ao mudar prompt ou flags
    const promptInput = document.getElementById("prompt_ia");
    const usarVeiculosCheck = document.getElementById("usar_veiculos");
    const usarVendedorCheck = document.getElementById("usar_vendedor");

    if (promptInput) {
      promptInput.addEventListener("blur", function () {
        const campanha = {
          prompt_ia: promptInput.value,
          usar_veiculos: usarVeiculosCheck?.checked !== false,
          usar_vendedor: usarVendedorCheck?.checked === true,
          periodo_ano: document.getElementById("periodo_ano")?.value || "",
        };
        const validacao = validarECorrigirCampanha(campanha);
        if (!validacao.valido && validacao.sugestoes.length > 0) {
          const mensagem = validacao.sugestoes
            .map((s) => s.mensagem)
            .join("\n");
          mostrarAlerta(mensagem, "warning");
        }
      });
    }

    // Calcular estimativas na carga inicial
    setTimeout(atualizarEstimativas, 500);
  }

  /**
   * Calcula estimativas completas da campanha
   * @param {Object} parametros - Parâmetros da campanha
   * @returns {Object} Objeto com todas as estimativas calculadas
   */
  function calcularEstimativasCompleta(parametros) {
    const {
      quantidadeClientes,
      tamanhoLote,
      limiteEnviosDia,
      intervaloEnviosSegundos,
      horarioInicio,
      horarioFim,
      pausarAlmoco,
      horarioAlmocoInicio,
      horarioAlmocoFim,
      processarFinaisSemana,
      configuracaoDiasSemana,
    } = parametros;

    // Calcular total de lotes
    const totalLotes = Math.ceil(quantidadeClientes / tamanhoLote);

    // Calcular lotes por dia
    const lotesPorDia = Math.floor(limiteEnviosDia / tamanhoLote);

    // Calcular tempo necessário por dia
    const tempoNecessarioPorDiaHoras =
      (limiteEnviosDia * intervaloEnviosSegundos) / 3600;

    // Converter horários para horas decimais
    const [hInicio, mInicio] = horarioInicio.split(":").map(Number);
    const horaInicioDecimal = hInicio + mInicio / 60;

    const [hFim, mFim] = horarioFim.split(":").map(Number);
    const horaFimDecimal = hFim + mFim / 60;

    // Calcular duração do almoço
    let duracaoAlmocoHoras = 0;
    if (pausarAlmoco && horarioAlmocoInicio && horarioAlmocoFim) {
      const [hAlmocoInicio, mAlmocoInicio] = horarioAlmocoInicio
        .split(":")
        .map(Number);
      const [hAlmocoFim, mAlmocoFim] = horarioAlmocoFim.split(":").map(Number);
      const horaAlmocoInicioDecimal = hAlmocoInicio + mAlmocoInicio / 60;
      const horaAlmocoFimDecimal = hAlmocoFim + mAlmocoFim / 60;
      duracaoAlmocoHoras = horaAlmocoFimDecimal - horaAlmocoInicioDecimal;
    }

    // Calcular horas disponíveis
    let horasDisponiveis = horaFimDecimal - horaInicioDecimal;
    if (pausarAlmoco) {
      horasDisponiveis -= duracaoAlmocoHoras;
    }

    // Calcular lotes antes e depois do almoço (se configurado)
    let lotesAntesAlmoco = 0;
    let lotesDepoisAlmoco = 0;

    if (pausarAlmoco && horarioAlmocoInicio && horarioAlmocoFim) {
      const [hAlmocoInicio, mAlmocoInicio] = horarioAlmocoInicio
        .split(":")
        .map(Number);
      const [hAlmocoFim, mAlmocoFim] = horarioAlmocoFim.split(":").map(Number);
      const horaAlmocoInicioDecimal = hAlmocoInicio + mAlmocoInicio / 60;
      const horaAlmocoFimDecimal = hAlmocoFim + mAlmocoFim / 60;

      // Horas antes do almoço
      const horasAntesAlmoco = horaAlmocoInicioDecimal - horaInicioDecimal;
      const clientesPossiveisAntes =
        (horasAntesAlmoco * 3600) / intervaloEnviosSegundos;
      lotesAntesAlmoco = Math.floor(clientesPossiveisAntes / tamanhoLote);

      // Horas depois do almoço
      const horasDepoisAlmoco = horaFimDecimal - horaAlmocoFimDecimal;
      const clientesPossiveisDepois =
        (horasDepoisAlmoco * 3600) / intervaloEnviosSegundos;
      lotesDepoisAlmoco = Math.floor(clientesPossiveisDepois / tamanhoLote);
    }

    // Calcular dias necessários
    // Considerar configuração de dias da semana se disponível
    let diasUteisPorSemana = 5; // Padrão: segunda a sexta
    if (configuracaoDiasSemana) {
      const diasHabilitados = Object.values(configuracaoDiasSemana).filter(
        (d) => d.habilitado
      ).length;
      diasUteisPorSemana = diasHabilitados;
    } else if (processarFinaisSemana) {
      diasUteisPorSemana = 7;
    }

    const diasNecessarios = Math.ceil(totalLotes / lotesPorDia);

    // Calcular tempo total previsto para concluir todos os envios
    // Tempo total = número de clientes × intervalo médio entre envios
    const tempoTotalSegundos = quantidadeClientes * intervaloEnviosSegundos;
    const tempoTotalHoras = tempoTotalSegundos / 3600;
    const tempoTotalDias = tempoTotalHoras / 24;
    
    // Formatar tempo total de forma legível
    let tempoTotalFormatado = "";
    if (tempoTotalDias >= 1) {
      const dias = Math.floor(tempoTotalDias);
      const horasRestantes = Math.floor((tempoTotalDias - dias) * 24);
      if (horasRestantes > 0) {
        tempoTotalFormatado = `${dias} dia${dias > 1 ? 's' : ''} e ${horasRestantes} hora${horasRestantes > 1 ? 's' : ''}`;
      } else {
        tempoTotalFormatado = `${dias} dia${dias > 1 ? 's' : ''}`;
      }
    } else if (tempoTotalHoras >= 1) {
      const horas = Math.floor(tempoTotalHoras);
      const minutosRestantes = Math.floor((tempoTotalHoras - horas) * 60);
      if (minutosRestantes > 0) {
        tempoTotalFormatado = `${horas} hora${horas > 1 ? 's' : ''} e ${minutosRestantes} minuto${minutosRestantes > 1 ? 's' : ''}`;
      } else {
        tempoTotalFormatado = `${horas} hora${horas > 1 ? 's' : ''}`;
      }
    } else {
      const minutos = Math.floor(tempoTotalHoras * 60);
      tempoTotalFormatado = `${minutos} minuto${minutos > 1 ? 's' : ''}`;
    }

    // Verificar compatibilidade
    const compativel = horasDisponiveis >= tempoNecessarioPorDiaHoras;
    const margem = horasDisponiveis - tempoNecessarioPorDiaHoras;
    const margemPequena = margem < 1 && margem >= 0; // Menos de 1 hora de margem

    return {
      totalClientes: quantidadeClientes,
      totalLotes: totalLotes,
      lotesPorDia: lotesPorDia,
      lotesAntesAlmoco: lotesAntesAlmoco,
      lotesDepoisAlmoco: lotesDepoisAlmoco,
      diasNecessarios: diasNecessarios,
      tempoNecessarioPorDiaHoras: tempoNecessarioPorDiaHoras,
      tempoTotalSegundos: tempoTotalSegundos,
      tempoTotalHoras: tempoTotalHoras,
      tempoTotalFormatado: tempoTotalFormatado,
      horasDisponiveis: horasDisponiveis,
      duracaoAlmocoHoras: duracaoAlmocoHoras,
      compativel: compativel,
      margemPequena: margemPequena,
      intervaloEnviosSegundos: intervaloEnviosSegundos,
      horarioInicio: horarioInicio,
      horarioFim: horarioFim,
      pausarAlmoco: pausarAlmoco,
      horarioAlmocoInicio: horarioAlmocoInicio,
      horarioAlmocoFim: horarioAlmocoFim,
    };
  }

  /**
   * Gera sugestões automáticas de ajustes
   * @param {Object} estimativas - Resultado de calcularEstimativasCompleta
   * @returns {Array} Array de sugestões
   */
  function gerarSugestoesAutomaticas(estimativas) {
    const sugestoes = [];

    if (!estimativas.compativel) {
      // Não cabe no horário
      sugestoes.push({
        tipo: "erro",
        titulo: "Horário insuficiente",
        mensagem: `O horário disponível (${estimativas.horasDisponiveis.toFixed(
          1
        )}h) é menor que o tempo necessário (${estimativas.tempoNecessarioPorDiaHoras.toFixed(
          1
        )}h).`,
        sugestoes: [
          {
            campo: "horario_fim",
            valor: estimativas.horarioFim,
            acao: "Aumentar horário fim",
            motivo:
              "Permite processar todos os clientes no horário disponível",
          },
          {
            campo: "tamanho_lote",
            valor: Math.floor(estimativas.totalLotes * 0.8),
            acao: "Diminuir tamanho do lote",
            motivo: "Reduz lotes e tempo necessário por dia",
          },
          {
            campo: "limite_envios_dia",
            valor: Math.floor(estimativas.limiteEnviosDia * 0.8),
            acao: "Diminuir limite diário",
            motivo: "Reduz tempo necessário por dia",
          },
        ],
      });
    } else if (estimativas.margemPequena) {
      // Margem pequena
      sugestoes.push({
        tipo: "aviso",
        titulo: "Margem pequena",
        mensagem: `Há apenas ${(
          estimativas.horasDisponiveis - estimativas.tempoNecessarioPorDiaHoras
        ).toFixed(1)}h de margem. Considere ajustar os parâmetros.`,
        sugestoes: [],
      });
    } else if (
      estimativas.horasDisponiveis - estimativas.tempoNecessarioPorDiaHoras >
      3
    ) {
      // Sobra muito tempo
      sugestoes.push({
        tipo: "info",
        titulo: "Tempo disponível",
        mensagem: `Há ${(
          estimativas.horasDisponiveis - estimativas.tempoNecessarioPorDiaHoras
        ).toFixed(1)}h disponíveis além do necessário.`,
        sugestoes: [
          {
            campo: "tamanho_lote",
            valor: Math.floor(estimativas.totalLotes * 1.2),
            acao: "Aumentar tamanho do lote",
            motivo: "Processa mais clientes por execução",
          },
        ],
      });
    }

    return sugestoes;
  }

  // Calcular e exibir estimativas de tempo (mantida para compatibilidade)
  function calcularTempoEstimado(
    limiteDiario,
    intervaloMedio,
    totalContatosEstimado = 2000
  ) {
    const diasNecessarios = Math.ceil(totalContatosEstimado / limiteDiario);
    const tempoPorEnvio = intervaloMedio; // segundos
    const tempoPorDia = limiteDiario * tempoPorEnvio; // segundos
    const horasPorDia = tempoPorDia / 3600; // horas

    const horarioInicio = 9; // 9h
    const horarioFimEstimado = horarioInicio + horasPorDia;
    const horasFim = Math.floor(horarioFimEstimado);
    const minutosFim = Math.floor((horarioFimEstimado % 1) * 60);

    return {
      tempoEntreEnvios: `${tempoPorEnvio}s (${(tempoPorEnvio / 60).toFixed(
        1
      )} min)`,
      tempoPorDia: `${horasPorDia.toFixed(1)} horas`,
      diasNecessarios: diasNecessarios,
      horarioInicio: `${horarioInicio}:00`,
      horarioFimEstimado: `${horasFim.toString().padStart(2, "0")}:${minutosFim
        .toString()
        .padStart(2, "0")}`,
      totalTempo: `${(diasNecessarios * horasPorDia).toFixed(
        1
      )} horas (${diasNecessarios} dias úteis)`,
    };
  }

  // Atualizar estimativas na interface
  /**
   * Valida consistência entre prompt e flags de IA, sugerindo correções
   * @param {Object} campanha - Objeto com dados da campanha
   * @returns {Object} - Objeto com valido, sugestoes e correcoes
   */
  function validarECorrigirCampanha(campanha) {
    const prompt = (campanha.prompt_ia || "").toLowerCase();
    const usarVeiculos = campanha.usar_veiculos !== false;
    const usarVendedor = campanha.usar_vendedor === true;

    const sugestoes = [];
    const correcoes = {};

    // Verificar menção a veículos
    const mencionaVeiculo =
      prompt.includes("veículo") ||
      prompt.includes("veiculo") ||
      prompt.includes("carro") ||
      prompt.includes("automóvel") ||
      prompt.includes("automovel");

    if (!usarVeiculos && mencionaVeiculo) {
      sugestoes.push({
        tipo: "inconsistencia",
        campo: "usar_veiculos",
        mensagem:
          'Seu prompt menciona veículos mas a opção "Incluir informações de veículos" está desmarcada.',
        sugestao:
          'Marcar "Incluir informações de veículos" para que a IA tenha acesso aos dados.',
        correcao: { usar_veiculos: true },
      });
    }

    // Verificar menção a vendedor
    const mencionaVendedor =
      prompt.includes("vendedor") ||
      prompt.includes("atendente") ||
      prompt.includes("consultor");

    if (!usarVendedor && mencionaVendedor) {
      sugestoes.push({
        tipo: "inconsistencia",
        campo: "usar_vendedor",
        mensagem:
          'Seu prompt menciona vendedor mas a opção "Incluir nome do vendedor" está desmarcada.',
        sugestao:
          'Marcar "Incluir nome do vendedor" para que a IA possa mencionar o vendedor.',
        correcao: { usar_vendedor: true },
      });
    }

    // Verificar campanhas genéricas
    const periodosGenericos = ["natal", "ano-novo", "pascoa"];
    if (
      periodosGenericos.includes(campanha.periodo_ano) &&
      usarVeiculos &&
      !mencionaVeiculo
    ) {
      sugestoes.push({
        tipo: "sugestao",
        campo: "usar_veiculos",
        mensagem: `Campanhas de ${campanha.periodo_ano} geralmente são genéricas e não mencionam veículos específicos.`,
        sugestao:
          'Desmarcar "Incluir informações de veículos" para uma mensagem mais genérica.',
        correcao: { usar_veiculos: false },
      });
    }

    return {
      valido: sugestoes.length === 0,
      sugestoes: sugestoes,
      correcoes: correcoes,
    };
  }

  /**
   * Calcula o intervalo médio baseado na opção pré-definida ou valor personalizado
   * @param {string|null} tipoIntervalo - Tipo de intervalo pré-definido
   * @param {string} intervaloInputValue - Valor do campo numérico (se personalizado)
   * @returns {number} Intervalo médio em segundos
   */
  function calcularIntervaloMedio(tipoIntervalo, intervaloInputValue) {
    // Ranges para opções pré-definidas (mesmos do workflow N8N)
    const rangesIntervalo = {
      muito_curto: { min: 1, max: 5 },
      curto: { min: 5, max: 20 },
      medio: { min: 20, max: 50 },
      longo: { min: 50, max: 120 },
      muito_longo: { min: 120, max: 300 },
      padrao: { min: 130, max: 150 }
    };

    // Se for opção pré-definida, calcular média do range
    if (tipoIntervalo && tipoIntervalo !== 'personalizado' && rangesIntervalo[tipoIntervalo]) {
      const range = rangesIntervalo[tipoIntervalo];
      return (range.min + range.max) / 2; // Média do range
    }

    // Se for personalizado ou não especificado, usar valor do campo
    const intervaloValor = intervaloInputValue ? parseInt(intervaloInputValue) : 130;
    
    // Se for 130 (padrão), usar média de 130-150s = 140s
    if (intervaloValor === 130 && (!tipoIntervalo || tipoIntervalo === 'padrao')) {
      return 140;
    }

    // Para valores personalizados, considerar variação de ±10s
    // Média seria o próprio valor (variação se cancela na média)
    return intervaloValor;
  }

  /**
   * Atualiza estimativas de tempo e lotes
   */
  function atualizarEstimativas() {
    const limiteInput = document.getElementById("limite_envios_dia");
    const intervaloInput = document.getElementById("intervalo_envios_segundos");
    const tamanhoLoteInput = document.getElementById("tamanho_lote");
    const estimativasDiv = document.getElementById("estimativas-conteudo");
    const estimativasLoteDiv = document.getElementById("estimativa-dias-lote");

    if (!limiteInput || !estimativasDiv) return;

    const limiteDiario = parseInt(limiteInput.value) || 200;
    const intervaloInputValue = intervaloInput ? intervaloInput.value : "";
    const tamanhoLote = parseInt(tamanhoLoteInput?.value) || 50;

    // Obter opção pré-definida selecionada
    const tipoIntervaloRadio = document.querySelector('input[name="intervalo_preset"]:checked');
    const tipoIntervalo = tipoIntervaloRadio ? tipoIntervaloRadio.value : null;

    // Calcular intervalo médio baseado na opção selecionada
    const intervaloMedio = calcularIntervaloMedio(tipoIntervalo, intervaloInputValue);

    // Estimativa de contatos (pode ser ajustado)
    const totalContatosEstimado = 2000; // ou buscar de execução anterior

    const estimativas = calcularTempoEstimado(
      limiteDiario,
      intervaloMedio,
      totalContatosEstimado
    );

    // Calcular estimativas com lotes
    const totalLotes = Math.ceil(totalContatosEstimado / tamanhoLote);
    const lotesPorDia = Math.floor(limiteDiario / tamanhoLote);
    const diasNecessariosLotes = Math.ceil(totalLotes / lotesPorDia);

    // Obter valores adicionais para cálculo completo
    const horarioInicioInput = document.getElementById("horario_inicio");
    const horarioFimInput = document.getElementById("horario_fim");
    const pausarAlmocoCheck = document.getElementById("pausar_almoco");
    const horarioAlmocoInicioInput = document.getElementById("horario_almoco_inicio");
    const horarioAlmocoFimInput = document.getElementById("horario_almoco_fim");
    const processarFinaisSemanaCheck = document.getElementById("processar_finais_semana");
    const quantidadeClientesInput = document.getElementById("quantidade_clientes");
    const contadorClientesSelecionados = document.getElementById("contadorClientesSelecionados");
    const painelEstimativas = document.getElementById("painel_estimativas");
    const sugestoesDiv = document.getElementById("sugestoes-automaticas");

    const horarioInicio = horarioInicioInput?.value || "09:00";
    const horarioFim = horarioFimInput?.value || "18:00";
    const pausarAlmoco = pausarAlmocoCheck?.checked || false;
    const horarioAlmocoInicio = horarioAlmocoInicioInput?.value || "12:00";
    const horarioAlmocoFim = horarioAlmocoFimInput?.value || "13:00";
    const processarFinaisSemana = processarFinaisSemanaCheck?.checked || false;

    // Obter quantidade de clientes
    let quantidadeClientes = 0;
    
    // Prioridade 1: Campo de quantidade manual (se preenchido)
    if (quantidadeClientesInput && quantidadeClientesInput.value) {
      quantidadeClientes = parseInt(quantidadeClientesInput.value);
    } 
    // Prioridade 2: Número de clientes selecionados (se houver seleção)
    else if (typeof clientesSelecionados !== 'undefined' && clientesSelecionados.size > 0) {
      quantidadeClientes = clientesSelecionados.size;
    }
    // Prioridade 3: Tentar obter do contador visual (fallback)
    else if (contadorClientesSelecionados) {
      const textoContador = contadorClientesSelecionados.textContent || "";
      const match = textoContador.match(/(\d+)\s+de\s+(\d+)\s+clientes?/i);
      if (match) {
        // Pegar o primeiro número (clientes selecionados)
        quantidadeClientes = parseInt(match[1]);
      } else {
        // Tentar formato alternativo
        const matchAlt = textoContador.match(/(\d+)\s+clientes?/i);
        if (matchAlt) {
          quantidadeClientes = parseInt(matchAlt[1]);
        }
      }
    }
    // Prioridade 4: Usar total estimado (fallback final)
    if (quantidadeClientes === 0) {
      quantidadeClientes = totalContatosEstimado;
    }

    // Obter configuração de dias da semana
    let configuracaoDiasSemana = null;
    const modoIndividual = document.getElementById("modo_configuracao_individual")?.checked;
    if (modoIndividual) {
      configuracaoDiasSemana = salvarConfiguracaoDiasSemana();
    }

    // Calcular estimativas completas
    const estimativasCompletas = calcularEstimativasCompleta({
      quantidadeClientes,
      tamanhoLote,
      limiteEnviosDia: limiteDiario,
      intervaloEnviosSegundos: intervaloMedio,
      horarioInicio,
      horarioFim,
      pausarAlmoco,
      horarioAlmocoInicio: pausarAlmoco ? horarioAlmocoInicio : null,
      horarioAlmocoFim: pausarAlmoco ? horarioAlmocoFim : null,
      processarFinaisSemana,
      configuracaoDiasSemana,
    });

    // Gerar sugestões
    const sugestoes = gerarSugestoesAutomaticas(estimativasCompletas);

    // Determinar cor de status
    let corStatus = "#10b981";
    let textoStatus = "✅ Compatível com horário configurado";
    if (!estimativasCompletas.compativel) {
      corStatus = "#ef4444";
      textoStatus = "❌ Não cabe no horário configurado";
    } else if (estimativasCompletas.margemPequena) {
      corStatus = "#f59e0b";
      textoStatus = "⚠️ Margem pequena de tempo";
    }

    // Montar HTML do painel de estimativas
    let htmlEstimativas = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">
        <div>
          <strong style="color: #111827; font-weight: 600;">👥 Total de Clientes:</strong><br>
          <span style="color: #2196F3; font-size: 18px;">${estimativasCompletas.totalClientes.toLocaleString()}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">📦 Total de Lotes:</strong><br>
          <span style="color: #2196F3; font-size: 18px;">${estimativasCompletas.totalLotes}</span>
        </div>
    `;

    if (pausarAlmoco && estimativasCompletas.lotesAntesAlmoco > 0 && estimativasCompletas.lotesDepoisAlmoco > 0) {
      htmlEstimativas += `
        <div>
          <strong style="color: #111827; font-weight: 600;">🍽️ Intervalo de Almoço:</strong><br>
          <span style="color: #2196F3;">${horarioAlmocoInicio} - ${horarioAlmocoFim}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">📦 Lotes Antes do Almoço:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.lotesAntesAlmoco}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">📦 Lotes Depois do Almoço:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.lotesDepoisAlmoco}</span>
        </div>
      `;
    }

    htmlEstimativas += `
        <div>
          <strong style="color: #111827; font-weight: 600;">📅 Lotes por Dia:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.lotesPorDia}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">⏱️ Dias Necessários:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.diasNecessarios} dias úteis</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">⏰ Tempo Necessário por Dia:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.tempoNecessarioPorDiaHoras.toFixed(1)}h</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">🕐 Horário Disponível:</strong><br>
          <span style="color: #2196F3;">${estimativasCompletas.horasDisponiveis.toFixed(1)}h (${horarioInicio} - ${horarioFim}${pausarAlmoco ? `, menos ${estimativasCompletas.duracaoAlmocoHoras.toFixed(1)}h de almoço` : ""})</span>
        </div>
        <div style="grid-column: 1 / -1; margin-top: 10px; padding: 12px; background: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196F3;">
          <strong style="color: #111827; font-weight: 600; display: block; margin-bottom: 5px;">⏳ Tempo Total Previsto para Concluir:</strong>
          <span style="color: #1976d2; font-size: 18px; font-weight: 600;">${estimativasCompletas.tempoTotalFormatado}</span>
          <small style="color: #666; display: block; margin-top: 5px;">Baseado em ${estimativasCompletas.totalClientes.toLocaleString()} clientes × ${(estimativasCompletas.intervaloEnviosSegundos / 60).toFixed(1)} min de intervalo médio</small>
        </div>
      </div>
      <div style="margin-top: 15px; padding: 10px; background: ${corStatus}20; border-left: 4px solid ${corStatus}; border-radius: 4px;">
        <strong style="color: ${corStatus};">${textoStatus}</strong>
      </div>
    `;

    estimativasDiv.innerHTML = htmlEstimativas;

    // Exibir sugestões
    if (sugestoesDiv) {
      if (sugestoes.length > 0) {
        let htmlSugestoes = `<div style="margin-top: 15px;"><strong>💡 Sugestões:</strong><ul style="margin-top: 10px; padding-left: 20px;">`;
        sugestoes.forEach((sugestao) => {
          htmlSugestoes += `<li style="margin-bottom: 8px; color: ${sugestao.tipo === "erro" ? "#ef4444" : sugestao.tipo === "aviso" ? "#f59e0b" : "#3b82f6"};">`;
          htmlSugestoes += `<strong>${sugestao.titulo}:</strong> ${sugestao.mensagem}`;
          if (sugestao.sugestoes && sugestao.sugestoes.length > 0) {
            htmlSugestoes += `<ul style="margin-top: 5px; padding-left: 20px;">`;
            sugestao.sugestoes.forEach((s) => {
              htmlSugestoes += `<li style="margin-bottom: 4px;">${s.acao}: ${s.motivo}</li>`;
            });
            htmlSugestoes += `</ul>`;
          }
          htmlSugestoes += `</li>`;
        });
        htmlSugestoes += `</ul></div>`;
        sugestoesDiv.innerHTML = htmlSugestoes;
      } else {
        sugestoesDiv.innerHTML = `<div style="margin-top: 15px; color: #666;"><strong>💡 Sugestões:</strong> Nenhuma sugestão no momento</div>`;
      }
    }

    // Mostrar painel
    if (painelEstimativas) {
      painelEstimativas.style.display = "block";
    }

    // Atualizar estimativa de lotes (compatibilidade)
    if (estimativasLoteDiv) {
      estimativasLoteDiv.textContent = `Com ${quantidadeClientes.toLocaleString()} clientes: ${estimativasCompletas.totalLotes} lotes de ${tamanhoLote} = ${estimativasCompletas.diasNecessarios} dias úteis (${estimativasCompletas.lotesPorDia} lotes/dia) | Tempo total previsto: ${estimativasCompletas.tempoTotalFormatado}`;
    }
  }

  // Expor função globalmente
  window.atualizarEstimativas = atualizarEstimativas;
  window.calcularTempoEstimado = calcularTempoEstimado;

  // ============================================================================
  // FUNÇÕES DE UPLOAD E PROCESSAMENTO DE PLANILHAS
  // ============================================================================

  /**
   * Sanitiza número de telefone brasileiro para formato 55XXXXXXXXXXX
   * @param {string} numero - Número de telefone em qualquer formato
   * @returns {string|null} - Número normalizado ou null se inválido
   */
  function sanitizarTelefoneBrasileiro(numero) {
    if (!numero) return null;

    const digitos = numero.toString().replace(/\D/g, "");

    // Caso 1: Já tem DDI 55 (13 dígitos)
    if (digitos.length === 13 && digitos.startsWith("55")) {
      return digitos;
    }

    // Caso 2: Tem DDD mas sem DDI (10 ou 11 dígitos)
    if (digitos.length === 10 || digitos.length === 11) {
      return `55${digitos}`;
    }

    // Caso 3: Apenas número (sem DDD) - requer DDD
    if (digitos.length === 8 || digitos.length === 9) {
      return null; // Requer DDD
    }

    return null;
  }

  /**
   * Parse e valida textarea com múltiplos telefones (um por linha)
   * @param {string} texto - Texto com telefones separados por linha
   * @returns {Object} { valido: boolean, telefones: string[], erros: string[] }
   */
  function parseTelefonesTextarea(texto) {
    if (!texto || texto.trim() === "") {
      return { valido: true, telefones: [], erros: [] };
    }
    const linhas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const telefones = [];
    const erros = [];
    linhas.forEach((linha, index) => {
      const sanitizado = sanitizarTelefoneBrasileiro(linha);
      if (sanitizado) {
        telefones.push(sanitizado);
      } else {
        erros.push(`Linha ${index + 1}: "${linha}" não é um telefone válido`);
      }
    });
    return {
      valido: erros.length === 0,
      telefones,
      erros,
    };
  }

  /**
   * Exibir validação em tempo real no textarea de telefones
   * @param {string} textareaId - ID do textarea
   * @param {string} validacaoId - ID da div de validação
   */
  function validarTelefonesTexarea(textareaId, validacaoId) {
    const textarea = document.getElementById(textareaId);
    const validacaoDiv = document.getElementById(validacaoId);
    if (!textarea || !validacaoDiv) return;
    textarea.addEventListener("blur", () => {
      const resultado = parseTelefonesTextarea(textarea.value);
      if (textarea.value.trim() === "") {
        validacaoDiv.innerHTML = "";
        validacaoDiv.className = "validation-message";
        return;
      }
      if (resultado.valido) {
        validacaoDiv.innerHTML = `✅ ${resultado.telefones.length} telefone(s) válido(s)`;
        validacaoDiv.className = "validation-message success";
      } else {
        validacaoDiv.innerHTML = `❌ ${resultado.erros.join("<br>")}`;
        validacaoDiv.className = "validation-message error";
      }
    });
  }

  /**
   * Processa dados da planilha e agrupa por telefone
   * @param {Array} dados - Array de objetos com dados da planilha
   * @param {string} tipoArquivo - Tipo do arquivo (xlsx, csv, etc)
   * @returns {Array} - Array de clientes agrupados com veículos
   */
  function processarDadosPlanilha(dados, tipoArquivo) {
    // Mapear colunas automaticamente (detectar por nome similar)
    // Fazer mapeamento apenas uma vez usando a primeira linha
    let mapeamentoGlobal = null;

    const mapearColunas = (linha) => {
      // Se já temos mapeamento global, reutilizar
      if (mapeamentoGlobal) {
        return mapeamentoGlobal;
      }

      const colunas = Object.keys(linha);
      const mapeamento = {
        nome: null,
        telefone: null,
        email: null,
        veiculo: {},
      };

      // Buscar nome (Cliente, Nome, Nome Cliente, etc)
      for (const col of colunas) {
        const colLower = col.toLowerCase();
        if (
          colLower.includes("cliente") ||
          colLower.includes("nome") ||
          colLower === "name" ||
          colLower === "name_cliente"
        ) {
          mapeamento.nome = col;
          break;
        }
      }

      // Buscar telefone (Celular, Telefone, Tel, etc)
      for (const col of colunas) {
        const colLower = col.toLowerCase();
        if (
          colLower.includes("celular") ||
          colLower.includes("telefone") ||
          colLower.includes("tel") ||
          colLower === "phone"
        ) {
          mapeamento.telefone = col;
          break;
        }
      }

      // Buscar email
      for (const col of colunas) {
        const colLower = col.toLowerCase();
        if (
          colLower.includes("email") ||
          colLower.includes("e-mail") ||
          colLower === "mail"
        ) {
          mapeamento.email = col;
          break;
        }
      }

      // Buscar campos de veículo (Modelo, Ano, Placa, Data Venda, Vendedor, etc)
      for (const col of colunas) {
        const colLower = col.toLowerCase().trim();

        // Detectar campo Veículo/Modelo (prioridade para "veiculo" ou "veículo")
        if (!mapeamento.veiculo.modelo) {
          if (
            colLower.includes("veículo") ||
            colLower.includes("veiculo") ||
            colLower === "veiculo" ||
            colLower === "veículo"
          ) {
            mapeamento.veiculo.modelo = col;
          } else if (colLower.includes("modelo")) {
            mapeamento.veiculo.modelo = col;
          }
        }

        // Ano
        if (!mapeamento.veiculo.ano && colLower.includes("ano")) {
          mapeamento.veiculo.ano = col;
        }

        // Placa
        if (!mapeamento.veiculo.placa && colLower.includes("placa")) {
          mapeamento.veiculo.placa = col;
        }

        // Data Venda (múltiplas variações)
        if (!mapeamento.veiculo.dtVenda) {
          if (
            colLower.includes("dt venda") ||
            colLower.includes("data venda") ||
            colLower.includes("data_venda") ||
            colLower.includes("dt_venda") ||
            colLower.includes("dt. venda") ||
            colLower.includes("data de venda") ||
            colLower === "dt venda" ||
            colLower === "data venda"
          ) {
            mapeamento.veiculo.dtVenda = col;
          }
        }

        // Vendedor
        if (!mapeamento.veiculo.vendedor && colLower.includes("vendedor")) {
          mapeamento.veiculo.vendedor = col;
        }
      }

      // Salvar mapeamento global e logar apenas uma vez
      mapeamentoGlobal = mapeamento;

      // Verificar se campo veiculo foi encontrado
      if (!mapeamento.veiculo.modelo) {
        console.warn("⚠️ Campo 'Veículo' não foi detectado automaticamente.");
        console.warn("Colunas disponíveis na planilha:", colunas);
        console.warn("Tentando encontrar coluna manualmente...");

        // Tentar encontrar coluna que contenha "veiculo" ou "veículo"
        const colunaVeiculoEncontrada = colunas.find((col) => {
          const colLower = col.toLowerCase();
          return (
            colLower.includes("veiculo") ||
            colLower.includes("veículo") ||
            colLower.includes("modelo")
          );
        });

        if (colunaVeiculoEncontrada) {
          console.log(
            "✅ Coluna de veículo encontrada manualmente:",
            colunaVeiculoEncontrada
          );
          mapeamento.veiculo.modelo = colunaVeiculoEncontrada;
        } else {
          console.error(
            "❌ Não foi possível encontrar coluna de veículo. Colunas disponíveis:",
            colunas
          );
        }
      } else {
        console.log(
          "✅ Campo 'Veículo' detectado na coluna:",
          mapeamento.veiculo.modelo
        );
      }

      // Log de mapeamento apenas uma vez por upload (já controlado por mapeamentoGlobal)
      if (window.DEBUG_MAP) {
        console.log("📋 Mapeamento completo:", {
          nome: mapeamento.nome,
          telefone: mapeamento.telefone,
          email: mapeamento.email,
          veiculo: mapeamento.veiculo,
        });
      }

      // Mostrar exemplo de extração da primeira linha para debug (apenas uma vez)
      if (
        mapeamento.veiculo.modelo &&
        linha[mapeamento.veiculo.modelo] &&
        !window.exemploExtracaoMostrado &&
        window.DEBUG_MAP
      ) {
        console.log(
          "📦 Exemplo de extração - Campo 'Veículo' da primeira linha:",
          linha[mapeamento.veiculo.modelo]
        );
        window.exemploExtracaoMostrado = true;
      }

      return mapeamento;
    };

    // Agrupar por telefone
    const clientesMap = new Map();

    for (const linha of dados) {
      const mapeamento = mapearColunas(linha);

      if (!mapeamento.nome || !mapeamento.telefone) {
        continue; // Pular linhas sem nome ou telefone
      }

      const nome = linha[mapeamento.nome]?.toString().trim();
      const telefoneRaw = linha[mapeamento.telefone]?.toString().trim();
      const telefone = sanitizarTelefoneBrasileiro(telefoneRaw);

      if (!telefone) {
        continue; // Pular telefones inválidos
      }

      // Extrair dados do veículo (todos os campos disponíveis)
      const veiculo = {};

      // Modelo/Veículo (pode conter modelo completo como "HONDA - BIZ 125 ES - 2011")
      if (mapeamento.veiculo.modelo) {
        const valorVeiculo = linha[mapeamento.veiculo.modelo];

        if (
          valorVeiculo !== undefined &&
          valorVeiculo !== null &&
          valorVeiculo !== ""
        ) {
          const veiculoCompleto = valorVeiculo.toString().trim();

          if (veiculoCompleto) {
            veiculo.veiculo = veiculoCompleto;

            // Tentar extrair modelo e ano do campo veículo se não tiver campos separados
            if (!mapeamento.veiculo.ano && veiculoCompleto) {
              // Tentar extrair ano do final (ex: "HONDA - BIZ 125 ES - 2011")
              const anoMatch = veiculoCompleto.match(/\b(19|20)\d{2}\b/);
              if (anoMatch) {
                veiculo.ano = anoMatch[0];
              }
            }
          }
        }
      }

      // Ano (se campo separado)
      if (mapeamento.veiculo.ano && linha[mapeamento.veiculo.ano]) {
        veiculo.ano = linha[mapeamento.veiculo.ano]?.toString().trim();
      }

      // Placa
      if (mapeamento.veiculo.placa && linha[mapeamento.veiculo.placa]) {
        veiculo.placa = linha[mapeamento.veiculo.placa]?.toString().trim();
      }

      // Data Venda
      if (mapeamento.veiculo.dtVenda && linha[mapeamento.veiculo.dtVenda]) {
        veiculo.dtVenda = linha[mapeamento.veiculo.dtVenda]?.toString().trim();
      }

      // Vendedor
      if (mapeamento.veiculo.vendedor && linha[mapeamento.veiculo.vendedor]) {
        veiculo.vendedor = linha[mapeamento.veiculo.vendedor]
          ?.toString()
          .trim();
      }

      // Debug: verificar se campos estão sendo extraídos corretamente
      // Log apenas para os primeiros 3 veículos sem campo veiculo para não poluir o console
      if (
        Object.keys(veiculo).length > 0 &&
        !veiculo.veiculo &&
        veiculo.placa
      ) {
        // Contar quantos avisos já foram mostrados
        if (!window.veiculoSemCampoCount) {
          window.veiculoSemCampoCount = 0;
        }

        if (window.veiculoSemCampoCount < 3) {
          console.warn(
            `⚠️ Veículo sem campo "veiculo" extraído (${
              window.veiculoSemCampoCount + 1
            }/3):`,
            {
              veiculo,
              colunaMapeada: mapeamento.veiculo.modelo,
              valorNaColuna: mapeamento.veiculo.modelo
                ? linha[mapeamento.veiculo.modelo]
                : "N/A",
              colunasLinha: Object.keys(linha),
              mapeamento: mapeamento.veiculo,
            }
          );
          window.veiculoSemCampoCount++;
        }

        // Tentar extrair veículo de colunas possíveis (fallback)
        const possiveisColunas = Object.keys(linha).filter((k) => {
          const kLower = k.toLowerCase();
          return (
            (kLower.includes("veiculo") ||
              kLower.includes("veículo") ||
              kLower.includes("modelo")) &&
            !kLower.includes("placa") &&
            !kLower.includes("ano") &&
            !kLower.includes("vendedor")
          );
        });

        if (possiveisColunas.length > 0) {
          const colunaVeiculo = possiveisColunas[0];
          const valorVeiculo = linha[colunaVeiculo]?.toString().trim();
          if (valorVeiculo) {
            veiculo.veiculo = valorVeiculo;
            if (window.veiculoSemCampoCount <= 3) {
              console.log(
                `✅ Campo "veiculo" extraído via fallback da coluna "${colunaVeiculo}":`,
                valorVeiculo
              );
            }
          }
        }
      }

      // Se já existe cliente com este telefone, adicionar veículo
      if (clientesMap.has(telefone)) {
        const cliente = clientesMap.get(telefone);
        // Adicionar veículo se tiver dados (mesmo que seja apenas placa ou veiculo)
        if (Object.keys(veiculo).length > 0) {
          cliente.veiculos.push(veiculo);
        }
      } else {
        // Criar novo cliente
        clientesMap.set(telefone, {
          telefone,
          nome_cliente: nome,
          email: mapeamento.email
            ? linha[mapeamento.email]?.toString().trim()
            : null,
          veiculos: Object.keys(veiculo).length > 0 ? [veiculo] : [],
          dados_extras: linha, // Manter todos os dados originais
        });
      }
    }

    return Array.from(clientesMap.values());
  }

  /**
   * Faz merge de veículos para um cliente existente
   * @param {Object} clienteExistente - Cliente existente do Supabase
   * @param {Object} novosDados - Novos dados do upload
   * @returns {Object} - Cliente com veículos mesclados
   */
  function fazerMergeVeiculos(clienteExistente, novosDados) {
    const veiculosExistentes = Array.isArray(clienteExistente?.veiculos)
      ? clienteExistente.veiculos
      : [];
    const novosVeiculos = Array.isArray(novosDados.veiculos)
      ? novosDados.veiculos
      : [];

    // Log resumido apenas para debug (desabilitar em produção se necessário)
    if (window.DEBUG_MERGE) {
      console.log("fazerMergeVeiculos - Início:", {
        telefone: clienteExistente.telefone,
        veiculosExistentes: veiculosExistentes.length,
        novosVeiculos: novosVeiculos.length,
      });
    }

    // Função para normalizar strings para comparação
    const normalizar = (str) => {
      if (!str) return "";
      return str.toString().trim().toUpperCase().replace(/\s+/g, " ");
    };

    // Função para comparar veículos (por placa, ou veiculo+placa, ou veiculo+dtVenda)
    function veiculoJaExiste(veiculo, lista) {
      return lista.some((v) => {
        // Comparar por placa (mais confiável) - normalizar para comparação
        if (v.placa && veiculo.placa) {
          if (normalizar(v.placa) === normalizar(veiculo.placa)) {
            return true;
          }
        }

        // Comparar por veículo + placa
        if (v.veiculo && veiculo.veiculo && v.placa && veiculo.placa) {
          if (
            normalizar(v.veiculo) === normalizar(veiculo.veiculo) &&
            normalizar(v.placa) === normalizar(veiculo.placa)
          ) {
            return true;
          }
        }

        // Comparar por veículo + data venda (se não tiver placa)
        if (v.veiculo && veiculo.veiculo && v.dtVenda && veiculo.dtVenda) {
          if (
            normalizar(v.veiculo) === normalizar(veiculo.veiculo) &&
            normalizar(v.dtVenda) === normalizar(veiculo.dtVenda)
          ) {
            return true;
          }
        }

        // Comparar por modelo + ano (fallback)
        if (v.modelo && veiculo.modelo && v.ano && veiculo.ano) {
          if (
            normalizar(v.modelo) === normalizar(veiculo.modelo) &&
            normalizar(v.ano) === normalizar(veiculo.ano)
          ) {
            return true;
          }
        }

        return false;
      });
    }

    // Adicionar apenas veículos novos
    const veiculosCombinados = [...veiculosExistentes];
    let adicionados = 0;
    let atualizados = 0;
    let ignorados = 0;

    novosVeiculos.forEach((novo) => {
      if (!veiculoJaExiste(novo, veiculosExistentes)) {
        // Preservar todos os campos do veículo e adicionar data de aquisição se não tiver
        const veiculoCompleto = {
          ...novo,
          data_aquisicao: novo.data_aquisicao || new Date().toISOString(),
        };
        veiculosCombinados.push(veiculoCompleto);
        adicionados++;
      } else {
        // Se o veículo já existe, atualizar campos que podem ter mudado
        const indexExistente = veiculosExistentes.findIndex((v) => {
          if (
            v.placa &&
            novo.placa &&
            normalizar(v.placa) === normalizar(novo.placa)
          ) {
            return true;
          }
          if (
            v.veiculo &&
            novo.veiculo &&
            v.dtVenda &&
            novo.dtVenda &&
            normalizar(v.veiculo) === normalizar(novo.veiculo) &&
            normalizar(v.dtVenda) === normalizar(novo.dtVenda)
          ) {
            return true;
          }
          return false;
        });

        if (indexExistente >= 0) {
          // Atualizar campos do veículo existente mantendo campos que já existem
          veiculosCombinados[indexExistente] = {
            ...veiculosCombinados[indexExistente],
            ...novo,
            // Manter data_aquisicao original se existir
            data_aquisicao:
              veiculosCombinados[indexExistente].data_aquisicao ||
              novo.data_aquisicao ||
              new Date().toISOString(),
          };
          atualizados++;
        } else {
          ignorados++;
        }
      }
    });

    console.log("fazerMergeVeiculos - Resultado:", {
      totalAntes: veiculosExistentes.length,
      totalDepois: veiculosCombinados.length,
      adicionados,
      atualizados,
      ignorados,
    });

    // Retornar apenas campos válidos, sem campos extras como dados_extras
    return {
      telefone: clienteExistente.telefone,
      nome_cliente:
        novosDados.nome_cliente || clienteExistente?.nome_cliente || null,
      email: novosDados.email || clienteExistente?.email || null,
      veiculos: veiculosCombinados,
      primeiro_envio: clienteExistente?.primeiro_envio || null,
      ultimo_envio: clienteExistente?.ultimo_envio || null,
      total_envios: clienteExistente?.total_envios || 0,
      status_whatsapp: clienteExistente?.status_whatsapp || null,
      ultima_atualizacao_planilha: new Date().toISOString(),
      fonte_dados: "upload_manual",
    };
  }

  /**
   * Processa upload completo de planilha
   * @param {Array} dadosAgrupados - Dados já agrupados por telefone
   * @param {string} nomeArquivo - Nome do arquivo
   * @param {string} tipoArquivo - Tipo do arquivo
   */
  async function processarUploadCompleto(
    dadosAgrupados,
    nomeArquivo,
    tipoArquivo
  ) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const totalClientes = dadosAgrupados.length;
    let processados = 0;
    let erros = 0;
    const errosDetalhados = [];

    // Criar registro de upload
    const { data: uploadRecord, error: uploadError } = await supabaseClient
      .from("instacar_uploads_planilhas")
      .insert({
        nome_arquivo: nomeArquivo,
        tipo: tipoArquivo,
        total_linhas: totalClientes,
        status: "processando",
      })
      .select()
      .single();

    if (uploadError) {
      mostrarAlerta(
        "Erro ao criar registro de upload: " + uploadError.message,
        "error"
      );
      return;
    }

    // Mostrar progresso
    const progressDiv = document.getElementById("uploadProgress");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");
    progressDiv.style.display = "block";

    // Processar em lotes de 50 para não travar a UI
    const batchSize = 50;
    for (let i = 0; i < dadosAgrupados.length; i += batchSize) {
      const batch = dadosAgrupados.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (cliente) => {
          try {
            // Verificar se cliente existe
            // Usar maybeSingle() para evitar erro 406 quando cliente não existe
            const { data: clienteExistente, error: errorConsulta } =
              await supabaseClient
                .from("instacar_clientes_envios")
                .select("*")
                .eq("telefone", cliente.telefone)
                .maybeSingle();

            // Se houver erro na consulta (não é erro de "não encontrado"), tratar
            if (errorConsulta && errorConsulta.code !== "PGRST116") {
              console.error("Erro ao consultar cliente:", errorConsulta);
              throw errorConsulta;
            }

            let dadosParaUpsert;

            if (clienteExistente) {
              // Fazer merge de veículos
              dadosParaUpsert = fazerMergeVeiculos(clienteExistente, cliente);
            } else {
              // Criar novo - garantir apenas campos válidos
              dadosParaUpsert = {
                telefone: cliente.telefone,
                nome_cliente: cliente.nome_cliente || null,
                email: cliente.email || null,
                veiculos: Array.isArray(cliente.veiculos)
                  ? cliente.veiculos
                  : [],
                total_envios: 0,
                fonte_dados: "upload_manual",
                ultima_atualizacao_planilha: new Date().toISOString(),
              };
            }

            // Filtrar apenas campos válidos da tabela (remover campos extras como dados_extras, id, created_at, updated_at)
            const camposValidos = [
              "telefone",
              "nome_cliente",
              "email",
              "veiculos",
              "primeiro_envio",
              "ultimo_envio",
              "total_envios",
              "status_whatsapp",
              "fonte_dados",
              "ultima_atualizacao_planilha",
            ];

            const dadosLimpos = {};
            camposValidos.forEach((campo) => {
              if (dadosParaUpsert[campo] !== undefined) {
                // Converter strings vazias para null em campos opcionais
                if (
                  campo !== "telefone" &&
                  campo !== "veiculos" &&
                  campo !== "total_envios"
                ) {
                  dadosLimpos[campo] =
                    dadosParaUpsert[campo] === ""
                      ? null
                      : dadosParaUpsert[campo];
                } else {
                  dadosLimpos[campo] = dadosParaUpsert[campo];
                }
              }
            });

            // Remover campos que não devem ser enviados no upsert
            delete dadosLimpos.id;
            delete dadosLimpos.created_at;
            delete dadosLimpos.updated_at;

            // Garantir que telefone está presente (obrigatório)
            if (!dadosLimpos.telefone || dadosLimpos.telefone.trim() === "") {
              throw new Error("Telefone é obrigatório");
            }

            // Garantir que veiculos é um array válido
            if (!Array.isArray(dadosLimpos.veiculos)) {
              dadosLimpos.veiculos = [];
            }

            // Garantir que total_envios é um número válido
            if (
              typeof dadosLimpos.total_envios !== "number" ||
              dadosLimpos.total_envios < 0
            ) {
              dadosLimpos.total_envios = 0;
            }

            // Upsert no Supabase
            const { error: upsertError } = await supabaseClient
              .from("instacar_clientes_envios")
              .upsert(dadosLimpos, { onConflict: "telefone" });

            if (upsertError) {
              // Log detalhado do erro para debug
              console.error("Erro no upsert:", {
                telefone: dadosLimpos.telefone,
                erro: upsertError,
                dados: dadosLimpos,
                mensagemErro: upsertError.message,
                detalhes: upsertError.details,
                hint: upsertError.hint,
              });

              // Criar mensagem de erro mais detalhada
              let mensagemErro = upsertError.message || "Erro desconhecido";
              if (upsertError.details) {
                mensagemErro += ` - Detalhes: ${upsertError.details}`;
              }
              if (upsertError.hint) {
                mensagemErro += ` - Dica: ${upsertError.hint}`;
              }

              throw new Error(mensagemErro);
            }

            processados++;
          } catch (error) {
            erros++;
            errosDetalhados.push({
              telefone: cliente.telefone,
              erro: error.message,
            });
          }

          // Atualizar progresso
          const percentual = Math.round(
            ((processados + erros) / totalClientes) * 100
          );
          progressBar.style.width = `${percentual}%`;
          progressBar.textContent = `${percentual}%`;
          progressText.textContent = `Processados: ${
            processados + erros
          } / ${totalClientes} (${erros} erros)`;
        })
      );

      // Pequeno delay para não sobrecarregar
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Atualizar registro de upload
    await supabaseClient
      .from("instacar_uploads_planilhas")
      .update({
        linhas_processadas: processados,
        linhas_com_erro: erros,
        status:
          erros === 0
            ? "concluido"
            : erros < totalClientes
            ? "concluido"
            : "erro",
        erros: errosDetalhados,
      })
      .eq("id", uploadRecord.id);

    // Mostrar resultado detalhado
    const uploadResults = document.getElementById("uploadResults");
    if (uploadResults) {
      let resultadoHTML = `
        <div style="
          background: ${erros === 0 ? "#d4edda" : "#f8d7da"};
          border: 2px solid ${erros === 0 ? "#28a745" : "#dc3545"};
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        ">
          <h3 style="margin-top: 0; color: ${
            erros === 0 ? "#28a745" : "#dc3545"
          };">
            ${
              erros === 0
                ? "✅ Upload Concluído!"
                : "⚠️ Upload Concluído com Erros"
            }
          </h3>
          <p><strong>Processados com sucesso:</strong> ${processados}</p>
          <p><strong>Erros:</strong> ${erros}</p>
          <p><strong>Total:</strong> ${totalClientes}</p>
      `;

      if (errosDetalhados.length > 0) {
        resultadoHTML += `
          <details style="margin-top: 15px;">
            <summary style="cursor: pointer; font-weight: bold; color: #dc3545;">
              Ver detalhes dos erros (${errosDetalhados.length})
            </summary>
            <div style="max-height: 300px; overflow-y: auto; margin-top: 10px; background: white; padding: 10px; border-radius: 4px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background: #dc3545; color: white;">
                    <th style="padding: 8px; text-align: left;">Telefone</th>
                    <th style="padding: 8px; text-align: left;">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  ${errosDetalhados
                    .slice(0, 50)
                    .map(
                      (erro) => `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 8px;">${erro.telefone || "-"}</td>
                      <td style="padding: 8px; color: #dc3545;">${
                        erro.erro || "Erro desconhecido"
                      }</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              ${
                errosDetalhados.length > 50
                  ? `<p style="text-align: center; margin-top: 10px; color: #666;">... e mais ${
                      errosDetalhados.length - 50
                    } erros</p>`
                  : ""
              }
            </div>
          </details>
        `;
      }

      resultadoHTML += `</div>`;
      uploadResults.innerHTML = resultadoHTML;
    }

    // Mostrar alerta também
    mostrarAlerta(
      `Upload concluído! Processados: ${processados}, Erros: ${erros}`,
      erros === 0 ? "success" : "warning"
    );

    if (errosDetalhados.length > 0) {
      console.error("Erros detalhados:", errosDetalhados);
    }
  }

  /**
   * Processa arquivo Excel ou CSV
   * @param {File} file - Arquivo a ser processado
   */
  // Variável para armazenar dados pendentes de confirmação
  let dadosPendentesUpload = null;

  async function processarUploadPlanilha(file) {
    const nomeArquivo = file.name;
    const extensao = nomeArquivo.split(".").pop().toLowerCase();
    let dados = [];

    try {
      if (extensao === "xlsx" || extensao === "xls") {
        // Processar Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const primeiraAba = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[primeiraAba];
        dados = XLSX.utils.sheet_to_json(worksheet);
      } else if (extensao === "csv") {
        // Processar CSV
        const text = await file.text();
        const resultado = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });
        dados = resultado.data;
      } else if (extensao === "txt") {
        // Processar TXT (assumir formato CSV)
        const text = await file.text();
        const resultado = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
        });
        dados = resultado.data;
      } else {
        mostrarAlerta("Formato de arquivo não suportado!", "error");
        return;
      }

      // Processar dados
      const dadosAgrupados = processarDadosPlanilha(dados, extensao);

      if (dadosAgrupados.length === 0) {
        mostrarAlerta("Nenhum dado válido encontrado na planilha!", "error");
        return;
      }

      // Armazenar dados pendentes e mostrar prévia
      dadosPendentesUpload = {
        dadosAgrupados,
        nomeArquivo,
        extensao,
      };

      // Mostrar prévia e botão de confirmação
      mostrarPreviaUpload(dadosAgrupados, nomeArquivo);
    } catch (error) {
      console.error("Erro ao processar arquivo:", error);
      mostrarAlerta("Erro ao processar arquivo: " + error.message, "error");
    }
  }

  /**
   * Mostra prévia dos dados e botão de confirmação
   * @param {Array} dadosAgrupados - Dados processados
   * @param {string} nomeArquivo - Nome do arquivo
   */
  function mostrarPreviaUpload(dadosAgrupados, nomeArquivo) {
    const uploadResults = document.getElementById("uploadResults");
    if (!uploadResults) return;

    // Calcular estatísticas
    const totalClientes = dadosAgrupados.length;
    const totalVeiculos = dadosAgrupados.reduce(
      (acc, cliente) => acc + (cliente.veiculos?.length || 0),
      0
    );

    // Mostrar prévia
    uploadResults.innerHTML = `
      <div style="
        background: #f8f9fa;
        border: 2px solid #667eea;
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
      ">
        <h3 style="margin-top: 0; color: #667eea;">📋 Prévia do Upload</h3>
        <div style="margin-bottom: 15px;">
          <p><strong>Arquivo:</strong> ${nomeArquivo}</p>
          <p><strong>Total de clientes:</strong> ${totalClientes}</p>
          <p><strong>Total de veículos:</strong> ${totalVeiculos}</p>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 15px; background: white; padding: 10px; border-radius: 4px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #667eea; color: white;">
                <th style="padding: 8px; text-align: left;">Telefone</th>
                <th style="padding: 8px; text-align: left;">Nome</th>
                <th style="padding: 8px; text-align: left;">Veículos</th>
              </tr>
            </thead>
            <tbody>
              ${dadosAgrupados
                .slice(0, 10)
                .map(
                  (cliente) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 8px;">${cliente.telefone || "-"}</td>
                  <td style="padding: 8px;">${cliente.nome_cliente || "-"}</td>
                  <td style="padding: 8px;">${
                    cliente.veiculos?.length || 0
                  }</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          ${
            totalClientes > 10
              ? `<p style="text-align: center; margin-top: 10px; color: #666;">... e mais ${
                  totalClientes - 10
                } clientes</p>`
              : ""
          }
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button
            type="button"
            onclick="cancelarUpload()"
            class="btn-secondary"
            style="background: #6c757d;"
          >
            ❌ Cancelar
          </button>
          <button
            type="button"
            onclick="confirmarUpload()"
            class="btn-primary"
            style="background: #28a745;"
          >
            ✅ Confirmar e Processar
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Cancela o upload pendente
   */
  function cancelarUpload() {
    dadosPendentesUpload = null;
    const uploadResults = document.getElementById("uploadResults");
    if (uploadResults) {
      uploadResults.innerHTML = "";
    }
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.value = "";
    }
    mostrarAlerta("Upload cancelado.", "info");
  }

  /**
   * Confirma e processa o upload
   */
  async function confirmarUpload() {
    if (!dadosPendentesUpload) {
      mostrarAlerta("Nenhum upload pendente para processar.", "error");
      return;
    }

    const { dadosAgrupados, nomeArquivo, extensao } = dadosPendentesUpload;

    // Limpar prévia
    const uploadResults = document.getElementById("uploadResults");
    if (uploadResults) {
      uploadResults.innerHTML = "";
    }

    // Processar upload
    await processarUploadCompleto(dadosAgrupados, nomeArquivo, extensao);

    // Limpar dados pendentes
    dadosPendentesUpload = null;
  }

  /**
   * Verifica WhatsApp em lote
   * @param {Array<string>} telefones - Array de telefones para verificar
   */
  /**
   * Atualiza o indicador de progresso da verificação
   * @param {number} processados - Quantidade de clientes processados
   * @param {number} total - Total de clientes a processar
   * @param {number} loteAtual - Lote atual sendo processado
   * @param {number} totalLotes - Total de lotes
   */
  function atualizarProgressoVerificacao(processados, total, loteAtual, totalLotes) {
    const progressoDiv = document.getElementById("progressoVerificacaoWhatsApp");
    const barraProgresso = document.getElementById("barraProgressoVerificacao");
    const statusTexto = document.getElementById("statusVerificacaoTexto");
    const contador = document.getElementById("contadorVerificacao");
    const tempoEstimado = document.getElementById("tempoEstimadoVerificacao");

    if (!progressoDiv || !barraProgresso || !statusTexto || !contador) {
      return;
    }

    // Mostrar indicador
    progressoDiv.style.display = "block";

    // Calcular porcentagem
    const porcentagem = total > 0 ? Math.round((processados / total) * 100) : 0;
    barraProgresso.style.width = `${porcentagem}%`;
    barraProgresso.textContent = `${porcentagem}%`;

    // Atualizar status
    statusTexto.textContent = `Processando lote ${loteAtual} de ${totalLotes}...`;
    contador.textContent = `${processados} / ${total} processados`;

    // Calcular tempo estimado (assumindo ~2 segundos por lote)
    if (loteAtual < totalLotes) {
      const lotesRestantes = totalLotes - loteAtual;
      const segundosRestantes = lotesRestantes * 2; // ~2s por lote (API + delay)
      const minutos = Math.floor(segundosRestantes / 60);
      const segundos = segundosRestantes % 60;
      
      if (minutos > 0) {
        tempoEstimado.textContent = `⏱️ ~${minutos}m ${segundos}s restantes`;
      } else {
        tempoEstimado.textContent = `⏱️ ~${segundos}s restantes`;
      }
    } else {
      tempoEstimado.textContent = "⏱️ Finalizando...";
    }
  }

  /**
   * Esconde o indicador de progresso
   */
  function esconderProgressoVerificacao() {
    const progressoDiv = document.getElementById("progressoVerificacaoWhatsApp");
    if (progressoDiv) {
      progressoDiv.style.display = "none";
    }
  }

  async function verificarWhatsAppLote(telefones, instanciaId = null) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Obter configuração da instância (usar primeira ativa se não especificada)
    const config = await obterConfiguracaoUazapi(instanciaId);
    if (!config || !config.baseUrl || !config.token) {
      mostrarAlerta(
        "Configure pelo menos uma instância Uazapi nas configurações primeiro!",
        "error"
      );
      return;
    }

    const UAZAPI_BASE_URL = config.baseUrl;
    const UAZAPI_TOKEN = config.token;

    // Dividir em lotes de 50
    const lotes = [];
    for (let i = 0; i < telefones.length; i += 50) {
      lotes.push(telefones.slice(i, i + 50));
    }

    const totalLotes = lotes.length;
    const totalTelefones = telefones.length;
    const resultados = [];
    let processados = 0;

    // Mostrar indicador de progresso inicial
    atualizarProgressoVerificacao(0, totalTelefones, 0, totalLotes);

    for (let indiceLote = 0; indiceLote < lotes.length; indiceLote++) {
      const lote = lotes[indiceLote];
      
      try {
        // Atualizar progresso antes de processar lote
        atualizarProgressoVerificacao(
          processados,
          totalTelefones,
          indiceLote + 1,
          totalLotes
        );

        const response = await fetch(`${UAZAPI_BASE_URL}/chat/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: UAZAPI_TOKEN,
          },
          body: JSON.stringify({ numbers: lote }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const resultadosLote = Array.isArray(data) ? data : [data];
        resultados.push(...resultadosLote);

        // Atualizar Supabase em batch
        const updates = resultadosLote.map((r, idx) => {
          // Tentar extrair telefone de diferentes formatos de resposta da API
          // A API pode retornar: r.query, r.jid (formato: 5511999999999@s.whatsapp.net), ou r.number
          let telefone = r.query || r.number;
          
          // Se não encontrou, tentar extrair do jid
          if (!telefone && r.jid) {
            telefone = r.jid.split("@")[0];
          }
          
          // Se ainda não encontrou, usar o telefone do lote original
          if (!telefone) {
            telefone = lote[idx];
          }
          
          return {
            telefone: telefone,
            status_whatsapp: r.isInWhatsapp ? "valid" : "invalid",
          };
        });

        await supabaseClient
          .from("instacar_clientes_envios")
          .upsert(updates, { onConflict: "telefone" });

        processados += lote.length;

        // Atualizar progresso após processar lote
        atualizarProgressoVerificacao(
          processados,
          totalTelefones,
          indiceLote + 1,
          totalLotes
        );

        // Delay entre lotes para evitar rate limiting
        if (indiceLote < lotes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("Erro ao verificar WhatsApp:", error);
        mostrarAlerta(`Erro ao verificar lote ${indiceLote + 1}: ${error.message}`, "error");
        // Continuar com próximo lote mesmo se houver erro
      }
    }

    // Esconder indicador de progresso
    esconderProgressoVerificacao();

    // Mostrar resultado final
    const validos = resultados.filter((r) => r.isInWhatsapp === true).length;
    const invalidos = resultados.filter((r) => r.isInWhatsapp === false).length;

    mostrarAlerta(
      `✅ Verificação concluída!\n\n` +
      `📊 ${processados} números processados\n` +
      `✅ ${validos} válidos\n` +
      `❌ ${invalidos} inválidos`,
      "success"
    );

    // Atualizar lista mantendo página atual
    carregarListaClientes(paginaAtualClientes);
  }

  // Variáveis de paginação (expostas globalmente para acesso via HTML)
  let paginaAtualClientes = 1;
  let totalClientes = 0;
  let itensPorPaginaClientes = 25;

  // Expor variáveis globalmente para acesso via onclick no HTML
  window.paginaAtualClientes = paginaAtualClientes;

  /**
   * Renderiza controles de paginação
   */
  function renderizarPaginacaoClientes() {
    const paginacaoContainer = document.getElementById("paginacaoClientes");
    if (!paginacaoContainer) return;

    const totalPaginas = Math.ceil(totalClientes / itensPorPaginaClientes);
    const totalExibido = Math.min(paginaAtualClientes * itensPorPaginaClientes, totalClientes);

    // Seguindo padrão do projeto de referência: texto à esquerda, botões à direita
    let html = `
      <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 0;">
        ${totalClientes} cliente(s) encontrado(s)
      </p>
      <div style="display: flex; gap: 0.5rem;">
        <button 
          onclick="carregarListaClientes(${paginaAtualClientes - 1})" 
          class="btn btn-secondary"
          style="padding: 0.5rem 0.75rem; font-size: 0.875rem; height: auto;"
          ${paginaAtualClientes === 1 ? "disabled" : ""}
        >Anterior</button>
        <button 
          onclick="carregarListaClientes(${paginaAtualClientes + 1})" 
          class="btn btn-secondary"
          style="padding: 0.5rem 0.75rem; font-size: 0.875rem; height: auto;"
          ${totalExibido >= totalClientes ? "disabled" : ""}
        >Próximo</button>
      </div>
    `;

    paginacaoContainer.innerHTML = html;
  }

  /**
   * Carrega lista de clientes com filtros e paginação
   * Busca todos os clientes existentes no Supabase, independente da origem (upload, Google Sheets, etc)
   */
  async function carregarListaClientes(pagina = null) {
    const container = document.getElementById("clientesContainer");
    if (!container) return;

    if (!supabaseClient) {
      // Verificar se há variáveis de ambiente configuradas
      if (
        window.ENV &&
        window.ENV.SUPABASE_URL &&
        window.ENV.SUPABASE_ANON_KEY
      ) {
        container.innerHTML =
          '<p style="text-align: center; color: #666">Conectando ao Supabase... Aguarde.</p>';
        // Tentar conectar automaticamente
        setTimeout(() => {
          conectarSupabase();
        }, 100);
      } else {
        container.innerHTML =
          '<p style="text-align: center; color: #666">Configure as variáveis de ambiente do Supabase (SUPABASE_URL e SUPABASE_ANON_KEY) para visualizar clientes.</p>';
      }
      return;
    }

    container.innerHTML = '<p class="loading">Carregando clientes...</p>';

    const busca = document.getElementById("buscaClientes")?.value.trim() || "";
    const filtroStatus =
      document.getElementById("filtroStatusWhatsapp")?.value || "";

    // Obter valores de ordenação (com fallback para valores padrão)
    const ordenacaoCampoSalvo = localStorage.getItem('ordenacaoClientes_campo');
    const ordenacaoDirecaoSalva = localStorage.getItem('ordenacaoClientes_direcao');
    const ordenacaoCampo = document.getElementById("ordenacaoCampo")?.value || ordenacaoCampoSalvo || "nome_cliente";
    const ordenacaoDirecao = document.getElementById("ordenacaoDirecao")?.value || ordenacaoDirecaoSalva || "asc";
    const ascending = ordenacaoDirecao === "asc";

    // Salvar preferências no localStorage
    localStorage.setItem('ordenacaoClientes_campo', ordenacaoCampo);
    localStorage.setItem('ordenacaoClientes_direcao', ordenacaoDirecao);

    // Obter itens por página do seletor
    const itensPorPaginaSelect = document.getElementById("itensPorPagina");
    const novoItensPorPagina = itensPorPaginaSelect
      ? parseInt(itensPorPaginaSelect.value) || 25
      : 25;

    // Se página foi especificada, usar ela
    if (pagina !== null) {
      paginaAtualClientes = pagina;
    } else {
      // Se mudou o número de itens por página, resetar para página 1
      if (novoItensPorPagina !== itensPorPaginaClientes) {
        paginaAtualClientes = 1;
      }
    }
    itensPorPaginaClientes = novoItensPorPagina;

    // Atualizar variável global
    window.paginaAtualClientes = paginaAtualClientes;

    try {
      // Construir query base
      let queryBase = supabaseClient
        .from("instacar_clientes_envios")
        .select("*", { count: "exact" });

      // Filtrar apenas clientes ativos por padrão (soft delete)
      queryBase = queryBase.eq("ativo", true);

      // Aplicar filtros
      if (filtroStatus) {
        // Para "unknown", buscar tanto NULL quanto "unknown"
        if (filtroStatus === "unknown") {
          queryBase = queryBase.or("status_whatsapp.is.null,status_whatsapp.eq.unknown");
        } else {
          queryBase = queryBase.eq("status_whatsapp", filtroStatus);
        }
      }

      // Filtro de bloqueio
      const filtroBloqueado = document.getElementById("filtroBloqueado")?.value;
      if (filtroBloqueado === "true") {
        queryBase = queryBase.eq("bloqueado_envios", true);
      } else if (filtroBloqueado === "false") {
        queryBase = queryBase.eq("bloqueado_envios", false);
      }

      if (busca) {
        queryBase = queryBase.or(
          `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
        );
      }

      // Calcular offset
      const offset = (paginaAtualClientes - 1) * itensPorPaginaClientes;

      // Buscar total de registros (com filtros aplicados) - usar head: true para apenas contar
      const { count, error: countError } = await queryBase.select("*", {
        count: "exact",
        head: true,
      });

      if (countError) {
        console.error("Erro ao contar clientes:", countError);
        // Se falhar a contagem, tentar sem ela
        totalClientes = 0;
      } else {
        totalClientes = count || 0;
      }

      // Buscar dados da página atual
      // Usar timestamp para evitar cache
      const timestamp = Date.now();
      
      // Se ordenação for por número de veículos, buscar todos e ordenar client-side
      // (não é possível ordenar JSONB diretamente no Supabase)
      const ordenarPorVeiculos = ordenacaoCampo === "num_veiculos";
      
      let clientes = [];
      let error = null;

      if (ordenarPorVeiculos) {
        // Quando ordenar por veículos, buscar TODOS os registros em lotes (Supabase limita a 1000 por query)
        // Construir query base com filtros
        let queryBase = supabaseClient
          .from("instacar_clientes_envios")
          .select("*", { count: "exact" })
          .eq("ativo", true);

        // Aplicar filtros na query base
        if (filtroStatus) {
          if (filtroStatus === "unknown") {
            queryBase = queryBase.or("status_whatsapp.is.null,status_whatsapp.eq.unknown");
          } else {
            queryBase = queryBase.eq("status_whatsapp", filtroStatus);
          }
        }

        if (filtroBloqueado === "true") {
          queryBase = queryBase.eq("bloqueado_envios", true);
        } else if (filtroBloqueado === "false") {
          queryBase = queryBase.eq("bloqueado_envios", false);
        }

        if (busca) {
          queryBase = queryBase.or(
            `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
          );
        }

        // Buscar total de registros para contagem
        const { count, error: countError } = await queryBase.select("*", {
          count: "exact",
          head: true,
        });

        if (countError) {
          console.error("Erro ao contar clientes:", countError);
          totalClientes = 0;
        } else {
          totalClientes = count || 0;
        }

        // Buscar todos os registros em lotes de 1000
        const limiteLote = 1000;
        let todosClientes = [];
        let offsetLote = 0;
        let temMaisRegistros = true;

        while (temMaisRegistros) {
          let queryLote = supabaseClient
            .from("instacar_clientes_envios")
            .select("*")
            .eq("ativo", true)
            .range(offsetLote, offsetLote + limiteLote - 1);

          // Aplicar filtros no lote
          if (filtroStatus) {
            if (filtroStatus === "unknown") {
              queryLote = queryLote.or("status_whatsapp.is.null,status_whatsapp.eq.unknown");
            } else {
              queryLote = queryLote.eq("status_whatsapp", filtroStatus);
            }
          }

          if (filtroBloqueado === "true") {
            queryLote = queryLote.eq("bloqueado_envios", true);
          } else if (filtroBloqueado === "false") {
            queryLote = queryLote.eq("bloqueado_envios", false);
          }

          if (busca) {
            queryLote = queryLote.or(
              `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
            );
          }

          const { data: loteClientes, error: errorLote } = await queryLote;

          if (errorLote) {
            console.error("Erro ao buscar lote de clientes:", errorLote);
            error = errorLote;
            temMaisRegistros = false;
          } else if (loteClientes && loteClientes.length > 0) {
            todosClientes = todosClientes.concat(loteClientes);
            offsetLote += limiteLote;
            // Se retornou menos que o limite, não há mais registros
            temMaisRegistros = loteClientes.length === limiteLote;
          } else {
            temMaisRegistros = false;
          }
        }

        clientes = todosClientes;
      } else {
        // Ordenação normal: buscar apenas a página atual
        let query = supabaseClient
          .from("instacar_clientes_envios")
          .select("*", { count: "exact" })
          .eq("ativo", true)
          .order(ordenacaoCampo, { ascending: ascending })
          .range(offset, offset + itensPorPaginaClientes - 1);

        // Aplicar filtros na query de dados
        if (filtroStatus) {
          if (filtroStatus === "unknown") {
            query = query.or("status_whatsapp.is.null,status_whatsapp.eq.unknown");
          } else {
            query = query.eq("status_whatsapp", filtroStatus);
          }
        }

        if (filtroBloqueado === "true") {
          query = query.eq("bloqueado_envios", true);
        } else if (filtroBloqueado === "false") {
          query = query.eq("bloqueado_envios", false);
        }

        if (busca) {
          query = query.or(
            `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
          );
        }

        // Executar query
        const { data: clientesData, error: errorData, count: countData } = await query;
        clientes = clientesData || [];
        error = errorData;
        
        // Buscar total de registros (com filtros aplicados)
        if (!error) {
          let queryCount = supabaseClient
            .from("instacar_clientes_envios")
            .select("*", { count: "exact", head: true })
            .eq("ativo", true);

          if (filtroStatus) {
            if (filtroStatus === "unknown") {
              queryCount = queryCount.or("status_whatsapp.is.null,status_whatsapp.eq.unknown");
            } else {
              queryCount = queryCount.eq("status_whatsapp", filtroStatus);
            }
          }

          if (filtroBloqueado === "true") {
            queryCount = queryCount.eq("bloqueado_envios", true);
          } else if (filtroBloqueado === "false") {
            queryCount = queryCount.eq("bloqueado_envios", false);
          }

          if (busca) {
            queryCount = queryCount.or(
              `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
            );
          }

          const { count: totalCount, error: countError } = await queryCount;
          if (!countError) {
            totalClientes = totalCount || 0;
          }
        }
      }

      if (error) {
        console.error("Erro ao carregar clientes:", error);

        // Mensagem de erro mais informativa
        let mensagemErro = `Erro ao carregar clientes: ${error.message}`;
        let detalhes = "";

        if (
          error.message &&
          error.message.includes("column") &&
          error.message.includes("ativo")
        ) {
          detalhes =
            "<br><small>⚠️ O campo 'ativo' não foi encontrado. Certifique-se de executar o script <code>docs/supabase/schema-clientes-expansao.sql</code> no Supabase.</small>";
        } else if (
          error.message &&
          (error.message.includes("permission") ||
            error.message.includes("policy") ||
            error.message.includes("RLS"))
        ) {
          detalhes =
            "<br><small>⚠️ Erro de permissão. Verifique se as políticas RLS estão configuradas corretamente. Execute o script <code>docs/supabase/policies.sql</code> no Supabase.</small>";
        } else if (
          error.message &&
          error.message.includes("relation") &&
          error.message.includes("does not exist")
        ) {
          detalhes =
            "<br><small>⚠️ A tabela não foi encontrada. Certifique-se de que o schema do banco de dados foi criado corretamente.</small>";
        } else {
          detalhes =
            "<br><small>Verifique o console do navegador (F12) para mais detalhes do erro.</small>";
        }

        container.innerHTML = `<p style="text-align: center; color: #dc3545">${mensagemErro}${detalhes}</p>`;
        return;
      }

      if (!clientes || clientes.length === 0) {
        container.innerHTML =
          '<p style="text-align: center; color: #666">Nenhum cliente encontrado no banco de dados.<br><small>Faça upload de uma planilha ou aguarde a sincronização automática.</small></p>';
        // Limpar paginação se não houver resultados
        const paginacaoContainer = document.getElementById("paginacaoClientes");
        if (paginacaoContainer) {
          paginacaoContainer.innerHTML = `<p style="text-align: center; color: #666; margin: 0">Total: 0 cliente(s)</p>`;
        }
        totalClientes = 0;
        return;
      }

      // Se não conseguiu contar antes, usar o tamanho do array como fallback
      if (totalClientes === 0 && clientes.length < itensPorPaginaClientes) {
        totalClientes = offset + clientes.length;
      }

      // Ajustar página atual se estiver além do total de páginas
      const totalPaginas = Math.ceil(totalClientes / itensPorPaginaClientes);
      if (paginaAtualClientes > totalPaginas && totalPaginas > 0) {
        paginaAtualClientes = totalPaginas;
        // Recarregar com a página corrigida
        return carregarListaClientes(paginaAtualClientes);
      }

      // Função auxiliar para contar número de veículos
      const contarVeiculos = (cliente) => {
        if (!cliente.veiculos) return 0;
        if (Array.isArray(cliente.veiculos)) {
          return cliente.veiculos.length;
        } else if (typeof cliente.veiculos === 'object' && cliente.veiculos !== null) {
          try {
            const veiculosArray = Object.values(cliente.veiculos);
            return Array.isArray(veiculosArray) ? veiculosArray.length : 0;
          } catch (e) {
            return 0;
          }
        }
        return 0;
      };

      // Aplicar filtro de veículos (se configurado) - filtro client-side
      let clientesFiltrados = clientes;
      const filtroVeiculos = document.getElementById("filtroVeiculos")?.value;
      if (filtroVeiculos) {
        clientesFiltrados = clientes.filter(cliente => {
          const numVeiculos = contarVeiculos(cliente);

          // Aplicar filtro
          if (filtroVeiculos === "0") {
            return numVeiculos === 0;
          } else if (filtroVeiculos === "1") {
            return numVeiculos === 1;
          } else if (filtroVeiculos === "2") {
            return numVeiculos === 2;
          } else if (filtroVeiculos === "3") {
            return numVeiculos === 3;
          } else if (filtroVeiculos === "4+") {
            return numVeiculos >= 4;
          }
          return true;
        });
      }

      // Aplicar ordenação por número de veículos (client-side)
      if (ordenarPorVeiculos) {
        clientesFiltrados.sort((a, b) => {
          const numVeiculosA = contarVeiculos(a);
          const numVeiculosB = contarVeiculos(b);
          if (ascending) {
            return numVeiculosA - numVeiculosB;
          } else {
            return numVeiculosB - numVeiculosA;
          }
        });
        
        // Atualizar total de clientes para a contagem filtrada (após ordenação)
        totalClientes = clientesFiltrados.length;
        
        // Aplicar paginação após ordenação
        const inicio = offset;
        const fim = offset + itensPorPaginaClientes;
        clientesFiltrados = clientesFiltrados.slice(inicio, fim);
      }

      // Buscar totais de envios e último envio do histórico para os clientes da página atual
      // IMPORTANTE: Buscar apenas para os clientes que serão exibidos (já paginados)
      // para evitar URLs muito longas quando há muitos clientes
      const totaisEnviosMap = new Map();
      const ultimoEnvioMap = new Map();
      
      if (clientesFiltrados.length > 0) {
        // Coletar IDs e telefones apenas dos clientes da página atual
        const clienteIds = clientesFiltrados.map(c => c.id).filter(id => id);
        const telefones = clientesFiltrados.map(c => normalizarTelefone(c.telefone || "")).filter(t => t);
        
        // Buscar todos os envios por cliente_id (sem limite para contar corretamente)
        if (clienteIds.length > 0) {
          const { data: enviosPorId, error: errorId } = await supabaseClient
            .from("instacar_historico_envios")
            .select("cliente_id, timestamp_envio")
            .in("cliente_id", clienteIds)
            .order("timestamp_envio", { ascending: false });
          
          if (!errorId && enviosPorId) {
            // Contar envios e encontrar último envio por cliente_id
            enviosPorId.forEach(item => {
              if (item.cliente_id) {
                // Contar envios
                const atual = totaisEnviosMap.get(item.cliente_id) || 0;
                totaisEnviosMap.set(item.cliente_id, atual + 1);
                
                // Atualizar último envio (mais recente)
                if (item.timestamp_envio) {
                  const ultimoAtual = ultimoEnvioMap.get(item.cliente_id);
                  if (!ultimoAtual || new Date(item.timestamp_envio) > new Date(ultimoAtual)) {
                    ultimoEnvioMap.set(item.cliente_id, item.timestamp_envio);
                  }
                }
              }
            });
          }
        }
        
        // Buscar todos os envios por telefone (para capturar envios sem cliente_id)
        // IMPORTANTE: Normalizar telefones antes de buscar
        if (telefones.length > 0) {
          const { data: enviosPorTelefone, error: errorTelefone } = await supabaseClient
            .from("instacar_historico_envios")
            .select("telefone, cliente_id, timestamp_envio")
            .in("telefone", telefones)
            .order("timestamp_envio", { ascending: false });
          
          if (!errorTelefone && enviosPorTelefone) {
            // Contar envios e encontrar último envio por telefone, mas apenas se não tiver cliente_id ou se o cliente_id não estiver na lista
            enviosPorTelefone.forEach(item => {
              if (item.telefone) {
                const telNormalizado = normalizarTelefone(item.telefone);
                const clienteComTelefone = clientesFiltrados.find(c => normalizarTelefone(c.telefone) === telNormalizado);
                
                if (clienteComTelefone) {
                  // Se o envio não tem cliente_id OU o cliente_id não está na lista atual, contar por telefone
                  if (!item.cliente_id || !clienteIds.includes(item.cliente_id)) {
                    // Contar envios
                    const atual = totaisEnviosMap.get(clienteComTelefone.id) || 0;
                    totaisEnviosMap.set(clienteComTelefone.id, atual + 1);
                    
                    // Atualizar último envio (mais recente)
                    if (item.timestamp_envio) {
                      const ultimoAtual = ultimoEnvioMap.get(clienteComTelefone.id);
                      if (!ultimoAtual || new Date(item.timestamp_envio) > new Date(ultimoAtual)) {
                        ultimoEnvioMap.set(clienteComTelefone.id, item.timestamp_envio);
                      }
                    }
                  }
                  // Se já foi contado por cliente_id, não contar novamente
                }
              }
            });
          }
        }
      }

      // Renderizar tabela (design instacar-insights)
      // A tabela já está no HTML da página, apenas atualizar o tbody
      let html = "";

      for (const cliente of clientesFiltrados) {
        // Obter total de envios do histórico (mais confiável que o campo do banco)
        const totalEnviosHistorico = totaisEnviosMap.get(cliente.id) || 0;
        // Usar histórico se disponível, senão usar campo do banco como fallback
        const totalEnviosExibir = totalEnviosHistorico > 0 ? totalEnviosHistorico : (cliente.total_envios || 0);
        
        // Obter último envio do histórico (mais confiável que o campo do banco)
        const ultimoEnvioHistorico = ultimoEnvioMap.get(cliente.id);
        // Usar histórico se disponível, senão usar campo do banco como fallback
        const ultimoEnvioData = ultimoEnvioHistorico || cliente.ultimo_envio;
        const ultimoEnvio = ultimoEnvioData 
          ? new Date(ultimoEnvioData).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
          : "Nunca";
        
        // Mapear status WhatsApp (design instacar-insights)
        const statusWhatsappConfig = {
          valid: { label: "Válido", className: "status-success", icon: getIconSVG('checkCircle', 12) },
          invalid: { label: "Inválido", className: "status-error", icon: getIconSVG('xCircle', 12) },
          unknown: { label: "Desconhecido", className: "status-warning", icon: getIconSVG('helpCircle', 12) }
        };
        const statusTexto = cliente.status_whatsapp || "unknown";
        const statusConfig = statusWhatsappConfig[statusTexto] || statusWhatsappConfig.unknown;
        
        // Status do cliente (ativo/bloqueado)
        const statusCliente = cliente.bloqueado_envios 
          ? { label: "Bloqueado", className: "status-error" }
          : cliente.ativo
            ? { label: "Ativo", className: "status-success" }
            : { label: "Inativo", className: "status-info" };

        // Contar número de veículos
        let numVeiculos = 0;
        if (cliente.veiculos) {
          if (Array.isArray(cliente.veiculos)) {
            numVeiculos = cliente.veiculos.length;
          } else if (typeof cliente.veiculos === 'object' && cliente.veiculos !== null) {
            // Se for um objeto, tentar converter para array
            try {
              const veiculosArray = Object.values(cliente.veiculos);
              numVeiculos = Array.isArray(veiculosArray) ? veiculosArray.length : 0;
            } catch (e) {
              numVeiculos = 0;
            }
          }
        }

        // ID único para dropdown deste cliente
        const dropdownId = `dropdown-cliente-${cliente.id}`;

        html += `
          <tr data-cliente-id="${cliente.id}" class="animate-fade-in">
            <td>
              <p style="font-weight: 500; color: hsl(var(--foreground)); margin: 0;">
                ${cliente.nome_cliente || "Sem nome"}
              </p>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;">
                  <span style="color: hsl(var(--muted-foreground)); display: flex; align-items: center;">
                    ${getIconSVG('phone', 14)}
                  </span>
                  <span>${cliente.telefone}</span>
                </div>
                ${cliente.email ? `
                  <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; color: hsl(var(--muted-foreground));">
                    <span style="display: flex; align-items: center;">
                      ${getIconSVG('mail', 14)}
                    </span>
                    <span>${cliente.email}</span>
                  </div>
                ` : ""}
              </div>
            </td>
            <td>
              <span style="font-weight: 500;">${numVeiculos}</span>
            </td>
            <td>
              <span class="status-badge ${statusConfig.className}" style="display: inline-flex; align-items: center; gap: 0.25rem;">
                ${statusConfig.icon}
                ${statusConfig.label}
              </span>
            </td>
            <td>
              <span style="font-weight: 500;">${totalEnviosExibir}</span>
            </td>
            <td>
              <span class="status-badge ${statusCliente.className}">
                ${statusCliente.label}
              </span>
            </td>
            <td>
              <span style="font-size: 0.875rem; color: hsl(var(--muted-foreground));">
                ${ultimoEnvio}
              </span>
            </td>
            <td style="text-align: right;">
              <div class="dropdown-menu" style="position: relative; display: inline-block;">
                <button onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}', event)" 
                        class="dropdown-trigger-btn">
                  ${getIconSVG('moreVertical', 16)}
                </button>
                <div id="${dropdownId}" class="dropdown-content">
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}'); verDetalhesCliente('${cliente.id}')">
                    ${getIconSVG('eye', 16)}
                    Ver detalhes
                  </button>
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}'); if(typeof window.enviarMensagemIndividual === 'function') window.enviarMensagemIndividual('${cliente.id}', '${cliente.telefone || ''}')">
                    ${getIconSVG('send', 16)}
                    Enviar
                  </button>
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}'); editarCliente('${cliente.id}')">
                    ${getIconSVG('edit', 16)}
                    Editar
                  </button>
                  <button class="dropdown-item" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}'); toggleBloqueioCliente('${cliente.id}', ${cliente.bloqueado_envios || false})">
                    ${getIconSVG('ban', 16)}
                    ${cliente.bloqueado_envios ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button class="dropdown-item" style="color: hsl(var(--destructive));" onclick="if(typeof window.toggleDropdownMenu === 'function') window.toggleDropdownMenu('${dropdownId}'); excluirCliente('${cliente.id}')">
                    ${getIconSVG('trash', 16)}
                    Excluir
                  </button>
                </div>
              </div>
            </td>
          </tr>
        `;
      }

      // Se não houver clientes, mostrar mensagem
      if (html === "") {
        html = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 2rem; color: hsl(var(--muted-foreground));">
              ${busca ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </td>
          </tr>
        `;
      }

      // Atualizar apenas o tbody da tabela existente
      const tbody = container.querySelector("tbody");
      if (tbody) {
        tbody.innerHTML = html;
      } else {
        // Fallback: se não encontrar tbody, atualizar container completo
      container.innerHTML = html;
      }

      // Renderizar paginação
      renderizarPaginacaoClientes();
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      container.innerHTML = `<p style="color: red">Erro ao carregar: ${error.message}</p>`;
      const paginacaoContainer = document.getElementById("paginacaoClientes");
      if (paginacaoContainer) {
        paginacaoContainer.innerHTML = "";
      }
    }
  }

  /**
   * Abre modal para enviar mensagem individual
   * @param {string} clienteId - ID do cliente
   * @param {string} telefone - Telefone do cliente
   */
  async function enviarMensagemIndividual(clienteId, telefone) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Buscar dados do cliente
    const { data: cliente, error } = await supabaseClient
      .from("instacar_clientes_envios")
      .select("*")
      .eq("id", clienteId)
      .single();

    if (error || !cliente) {
      mostrarAlerta(
        "Erro ao buscar dados do cliente: " +
          (error?.message || "Cliente não encontrado"),
        "error"
      );
      return;
    }

    // Preencher modal
    document.getElementById("enviarMensagemClienteId").value = clienteId;
    document.getElementById("enviarMensagemTelefone").value = telefone;
    document.getElementById("enviarMensagemClienteNome").value =
      cliente.nome_cliente || "-";
    document.getElementById("enviarMensagemClienteTelefone").value = telefone;

    // Carregar instâncias WhatsApp ativas
    const instancias = await carregarInstanciasUazapi();
    const instanciasAtivas = instancias.filter((i) => i.ativo !== false);
    const selectInstancia = document.getElementById(
      "enviarMensagemInstanciaId"
    );

    if (selectInstancia) {
      selectInstancia.innerHTML =
        '<option value="">Selecione uma instância...</option>';

      if (instanciasAtivas.length === 0) {
        selectInstancia.innerHTML =
          '<option value="">Nenhuma instância ativa configurada</option>';
        selectInstancia.disabled = true;
      } else {
        selectInstancia.disabled = false;
        instanciasAtivas.forEach((instancia) => {
          const option = document.createElement("option");
          option.value = instancia.id;
          const tipoApiLabel = instancia.tipo_api
            ? `[${instancia.tipo_api.toUpperCase()}]`
            : "";
          option.textContent = `${tipoApiLabel} ${instancia.nome} (${instancia.base_url})`;
          selectInstancia.appendChild(option);
        });
      }
    }

    // Carregar campanhas ativas
    const { data: campanhas } = await supabaseClient
      .from("instacar_campanhas")
      .select("id, nome, status")
      .eq("status", "ativa")
      .eq("ativo", true)
      .order("nome");

    const campanhaSelect = document.getElementById("campanhaSelecionada");
    campanhaSelect.innerHTML =
      '<option value="">Selecione uma campanha...</option>';

    if (campanhas && campanhas.length > 0) {
      campanhas.forEach((campanha) => {
        const option = document.createElement("option");
        option.value = campanha.id;
        option.textContent = campanha.nome;
        campanhaSelect.appendChild(option);
      });
    } else {
      campanhaSelect.innerHTML =
        '<option value="">Nenhuma campanha ativa encontrada</option>';
    }

    // Resetar formulário
    document.getElementById("tipoEnvio").value = "";
    document.getElementById("mensagemCustomizada").value = "";
    document.getElementById("enviarMensagemInstanciaId").value = "";
    toggleTipoEnvio();

    // Abrir modal
    document.getElementById("modalEnviarMensagem").classList.add("active");
  }

  /**
   * Toggle campos do formulário de envio baseado no tipo
   */
  function toggleTipoEnvio() {
    const tipoEnvio = document.getElementById("tipoEnvio").value;
    const campanhaGroup = document.getElementById("campanhaSelectGroup");
    const mensagemGroup = document.getElementById("mensagemCustomizadaGroup");

    if (tipoEnvio === "campanha") {
      campanhaGroup.style.display = "block";
      mensagemGroup.style.display = "none";
      document.getElementById("campanhaSelecionada").required = true;
      document.getElementById("mensagemCustomizada").required = false;
    } else if (tipoEnvio === "customizada") {
      campanhaGroup.style.display = "none";
      mensagemGroup.style.display = "block";
      document.getElementById("campanhaSelecionada").required = false;
      document.getElementById("mensagemCustomizada").required = true;
    } else {
      campanhaGroup.style.display = "none";
      mensagemGroup.style.display = "none";
      document.getElementById("campanhaSelecionada").required = false;
      document.getElementById("mensagemCustomizada").required = false;
    }
  }

  /**
   * Fecha modal de enviar mensagem
   */
  function fecharModalEnviarMensagem() {
    document.getElementById("modalEnviarMensagem").classList.remove("active");
    // Resetar campos do formulário
    document.getElementById("formEnviarMensagem").reset();
    document.getElementById("enviarMensagemInstanciaId").value = "";
    document.getElementById("tipoEnvio").value = "";
    toggleTipoEnvio();
  }

  /**
   * Processa envio de mensagem individual
   */
  async function processarEnvioMensagemIndividual(event) {
    event.preventDefault();

    const clienteId = document.getElementById("enviarMensagemClienteId").value;
    const telefone = document.getElementById("enviarMensagemTelefone").value;
    const tipoEnvio = document.getElementById("tipoEnvio").value;
    const instanciaId = document.getElementById(
      "enviarMensagemInstanciaId"
    ).value;

    if (!tipoEnvio) {
      mostrarAlerta("Selecione o tipo de envio!", "error");
      return;
    }

    if (!instanciaId) {
      mostrarAlerta("Selecione uma instância WhatsApp!", "error");
      return;
    }

    const config = await carregarConfiguracoesDoLocalStorage();
    if (!config || !config.n8nWebhookUrl) {
      mostrarAlerta(
        "Configure o webhook N8N nas configurações primeiro!",
        "error"
      );
      return;
    }

    try {
      let payload = {
        telefone: telefone,
        trigger_tipo: "manual_individual",
        instance_id: instanciaId,
      };

      if (tipoEnvio === "campanha") {
        const campanhaId = document.getElementById("campanhaSelecionada").value;
        if (!campanhaId) {
          mostrarAlerta("Selecione uma campanha!", "error");
          return;
        }
        
        // Verificar se já existe histórico de envios para este cliente + campanha
        if (supabaseClient && clienteId) {
          const telefoneNormalizado = normalizarTelefone(telefone);
          
          // Buscar histórico de envios para este cliente e campanha
          const { data: historicoExistente, error: errorHistorico } = await supabaseClient
            .from("instacar_historico_envios")
            .select("id, timestamp_envio, status_envio, mensagem_enviada")
            .eq("campanha_id", campanhaId)
            .or(`cliente_id.eq.${clienteId},telefone.eq.${telefoneNormalizado || telefone}`)
            .order("timestamp_envio", { ascending: false })
            .limit(1);
          
          if (!errorHistorico && historicoExistente && historicoExistente.length > 0) {
            const ultimoEnvio = historicoExistente[0];
            const dataUltimoEnvio = ultimoEnvio.timestamp_envio 
              ? new Date(ultimoEnvio.timestamp_envio).toLocaleString("pt-BR", { 
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : "data desconhecida";
            
            const statusUltimoEnvio = ultimoEnvio.status_envio === "enviado" 
              ? "enviado com sucesso" 
              : ultimoEnvio.status_envio === "erro"
              ? "com erro"
              : "bloqueado";
            
            // Buscar nome da campanha para exibir na mensagem
            const { data: campanha } = await supabaseClient
              .from("instacar_campanhas")
              .select("nome")
              .eq("id", campanhaId)
              .single();
            
            const nomeCampanha = campanha?.nome || "esta campanha";
            
            // Pedir confirmação
            const confirmar = confirm(
              `⚠️ ATENÇÃO: Este cliente já recebeu mensagem desta campanha!\n\n` +
              `Campanha: ${nomeCampanha}\n` +
              `Último envio: ${dataUltimoEnvio}\n` +
              `Status: ${statusUltimoEnvio}\n\n` +
              `Deseja continuar e enviar novamente?`
            );
            
            if (!confirmar) {
              mostrarAlerta("Envio cancelado pelo usuário.", "info");
              return;
            }
          }
        }
        
        payload.campanha_id = campanhaId;
      } else if (tipoEnvio === "customizada") {
        const mensagem = document
          .getElementById("mensagemCustomizada")
          .value.trim();
        if (!mensagem) {
          mostrarAlerta("Digite a mensagem customizada!", "error");
          return;
        }
        payload.mensagem_customizada = mensagem;
      }

      // Chamar webhook N8N
      const response = await fetch(config.n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Se o envio foi bem-sucedido E for do tipo "campanha", registrar no histórico
      if (tipoEnvio === "campanha" && supabaseClient) {
        try {
          const campanhaId = document.getElementById("campanhaSelecionada").value;
          const telefoneNormalizado = normalizarTelefone(telefone);
          
          // Buscar dados da campanha para obter informações adicionais (opcional)
          const { data: campanha } = await supabaseClient
            .from("instacar_campanhas")
            .select("nome, prompt_ia")
            .eq("id", campanhaId)
            .single();
          
          // Registrar no histórico de envios
          const registroHistorico = {
            cliente_id: clienteId || null,
            telefone: telefoneNormalizado || telefone,
            campanha_id: campanhaId,
            status_envio: "enviado", // Assumindo sucesso já que o N8N processou
            mensagem_enviada: null, // A mensagem é gerada pela IA no N8N, não temos aqui
            tipo_envio: "normal", // Tipo manual individual (schema aceita: 'normal', 'teste', 'debug')
            timestamp_envio: new Date().toISOString(),
            planilha_origem: "envio_manual_individual",
          };
          
          const { error: errorHistorico } = await supabaseClient
            .from("instacar_historico_envios")
            .insert(registroHistorico);
          
          if (errorHistorico) {
            console.error("Erro ao registrar histórico de envio:", errorHistorico);
            // Não falhar o envio se o registro do histórico falhar, apenas logar
          } else {
            console.log("✅ Histórico de envio registrado para campanha:", campanhaId);
            
            // Atualizar contadores do cliente (total_envios, ultimo_envio)
            if (clienteId) {
              const { data: clienteAtual } = await supabaseClient
                .from("instacar_clientes_envios")
                .select("total_envios, primeiro_envio")
                .eq("id", clienteId)
                .single();
              
              const novoTotalEnvios = (clienteAtual?.total_envios || 0) + 1;
              const agora = new Date().toISOString();
              const primeiroEnvio = clienteAtual?.primeiro_envio || agora;
              
              await supabaseClient
                .from("instacar_clientes_envios")
                .update({
                  total_envios: novoTotalEnvios,
                  ultimo_envio: agora,
                  primeiro_envio: primeiroEnvio, // Manter o primeiro se já existir
                })
                .eq("id", clienteId);
            }
          }
        } catch (errorRegistro) {
          console.error("Erro ao registrar envio no histórico:", errorRegistro);
          // Não falhar o envio se o registro do histórico falhar, apenas logar
        }
      }
      // Se for "customizada", não registra no histórico (mensagem fora das campanhas)

      mostrarAlerta(
        "Mensagem enviada com sucesso! Verifique o status no N8N.",
        "success"
      );
      fecharModalEnviarMensagem();
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      mostrarAlerta("Erro ao enviar mensagem: " + error.message, "error");
    }
  }

  // Event listener para formulário de envio
  function inicializarFormularioEnvio() {
    const form = document.getElementById("formEnviarMensagem");
    if (form) {
      form.addEventListener("submit", processarEnvioMensagemIndividual);
    }
  }

  /**
   * Verifica WhatsApp para clientes não verificados
   * @param {boolean} apenasPaginaAtual - Se true, verifica apenas clientes da página atual
   */
  async function verificarWhatsAppSelecionados(apenasPaginaAtual = false) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    let telefones = [];

    if (apenasPaginaAtual) {
      // Verificar apenas clientes da página atual
      const container = document.getElementById("clientesContainer");
      if (!container) {
        mostrarAlerta("Lista de clientes não encontrada!", "error");
        return;
      }

      // Buscar telefones dos clientes visíveis na página atual
      const linhas = container.querySelectorAll("tbody tr[data-cliente-id]");
      if (linhas.length === 0) {
        mostrarAlerta("Nenhum cliente na página atual!", "error");
        return;
      }

      // Extrair telefones das linhas da tabela
      telefones = Array.from(linhas).map((linha) => {
        const celulaTelefone = linha.querySelector("td:nth-child(2)");
        return celulaTelefone ? celulaTelefone.textContent.trim() : null;
      }).filter((tel) => tel !== null);

      if (telefones.length === 0) {
        mostrarAlerta("Nenhum telefone encontrado na página atual!", "error");
        return;
      }

      mostrarAlerta(
        `Verificando ${telefones.length} cliente(s) da página atual...`,
        "info"
      );
    } else {
      // Buscar TODOS os clientes não verificados (sem limite)
      mostrarAlerta("Buscando todos os clientes não verificados...", "info");

      let todosClientes = [];
      let offset = 0;
      const limit = 1000; // Buscar em lotes de 1000

      while (true) {
        const { data: clientes, error } = await supabaseClient
          .from("instacar_clientes_envios")
          .select("telefone")
          .eq("ativo", true)
          .or("status_whatsapp.is.null,status_whatsapp.eq.unknown")
          .range(offset, offset + limit - 1);

        if (error) {
          mostrarAlerta("Erro ao buscar clientes: " + error.message, "error");
          return;
        }

        if (!clientes || clientes.length === 0) {
          break; // Não há mais clientes
        }

        todosClientes.push(...clientes.map((c) => c.telefone));
        offset += limit;

        // Se retornou menos que o limite, chegamos ao fim
        if (clientes.length < limit) {
          break;
        }
      }

      if (todosClientes.length === 0) {
        mostrarAlerta("Nenhum cliente não verificado encontrado!", "info");
        return;
      }

      telefones = todosClientes;

      // Confirmar se o usuário quer verificar muitos clientes
      if (telefones.length > 100) {
        const confirmar = confirm(
          `Encontrados ${telefones.length} clientes não verificados.\n\n` +
          `Isso pode levar alguns minutos. Deseja continuar?`
        );
        if (!confirmar) {
          return;
        }
      }

      mostrarAlerta(
        `Verificando ${telefones.length} cliente(s) não verificado(s)...`,
        "info"
      );
    }

    await verificarWhatsAppLote(telefones);
  }

  /**
   * Processa Google Sheets via URL
   */
  async function processarGoogleSheets() {
    const url = document.getElementById("googleSheetsUrl")?.value.trim();
    if (!url) {
      mostrarAlerta("Informe a URL do Google Sheets!", "error");
      return;
    }

    // TODO: Implementar leitura de Google Sheets
    // Por enquanto, apenas mostrar alerta
    mostrarAlerta(
      "Processamento de Google Sheets será implementado em breve!",
      "error"
    );
  }

  // Event listeners para upload
  function inicializarUploadListeners() {
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("fileInput");

    if (!uploadArea || !fileInput) return;

    // Click para abrir seletor
    uploadArea.addEventListener("click", () => {
      fileInput.click();
    });

    // Drag and drop
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
      uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.classList.remove("dragover");

      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        processarUploadPlanilha(file);
      });
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        processarUploadPlanilha(file);
      });
    });
  }

  // Expor funções globalmente
  window.processarGoogleSheets = processarGoogleSheets;
  window.cancelarUpload = cancelarUpload;
  window.confirmarUpload = confirmarUpload;
  /**
   * Verifica WhatsApp de um cliente individual e atualiza o status
   * @param {string} clienteId - ID do cliente no Supabase
   * @param {string} telefone - Telefone do cliente (formato 55XXXXXXXXXXX)
   */
  async function verificarWhatsAppIndividual(clienteId, telefone) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Obter configuração da instância (usar primeira ativa se não especificada)
    const config = await obterConfiguracaoUazapi();
    if (!config || !config.baseUrl || !config.token) {
      mostrarAlerta(
        "Configure pelo menos uma instância de API WhatsApp nas configurações! Acesse '⚙️ Gerenciar Configurações' e adicione uma instância.",
        "error"
      );
      return;
    }

    // Encontrar o botão que foi clicado
    const buttons = document.querySelectorAll(
      `button[onclick*="verificarWhatsAppIndividual('${clienteId}'"]`
    );
    const button = buttons.length > 0 ? buttons[0] : null;

    const originalText = button ? button.innerHTML : "✅ Verificar";
    if (button) {
      button.disabled = true;
      button.innerHTML = "⏳ Verificando...";
    }

    try {
      // Chamar API Uazapi
      const response = await fetch(`${config.baseUrl}/chat/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token: config.token,
        },
        body: JSON.stringify({ numbers: [telefone] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Erro na API: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Resposta da API Uazapi:", data);

      // Processar resultado - a API pode retornar diferentes formatos
      let statusWhatsapp = "unknown";
      if (data && Array.isArray(data) && data.length > 0) {
        const resultado = data[0];
        console.log("Resultado processado:", resultado);
        // Verificar diferentes formatos de resposta da API
        if (
          resultado.exists === true ||
          resultado.valid === true ||
          resultado.isInWhatsapp === true
        ) {
          statusWhatsapp = "valid";
        } else if (
          resultado.exists === false ||
          resultado.valid === false ||
          resultado.isInWhatsapp === false
        ) {
          statusWhatsapp = "invalid";
        }
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        // Formato alternativo de resposta (objeto único)
        console.log("Resultado processado (objeto):", data);
        if (
          data.exists === true ||
          data.valid === true ||
          data.isInWhatsapp === true
        ) {
          statusWhatsapp = "valid";
        } else if (
          data.exists === false ||
          data.valid === false ||
          data.isInWhatsapp === false
        ) {
          statusWhatsapp = "invalid";
        }
      }

      console.log("Status WhatsApp determinado:", statusWhatsapp);

      // Atualizar no Supabase
      const { data: updateData, error: updateError } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({ status_whatsapp: statusWhatsapp })
        .eq("id", clienteId)
        .select();

      if (updateError) {
        console.error("Erro ao atualizar Supabase:", updateError);
        throw updateError;
      }

      console.log("✅ Cliente atualizado no Supabase:", updateData);
      console.log("📊 Status salvo:", updateData[0]?.status_whatsapp);

      // Verificar se a atualização foi bem-sucedida
      if (!updateData || updateData.length === 0) {
        throw new Error("Nenhum registro foi atualizado");
      }

      // Verificar se o status foi realmente atualizado
      const clienteAtualizado = updateData[0];

      // Mapear status para português para exibição (versão simples para log)
      const statusMapPtSimple = {
        valid: "Válido",
        invalid: "Inválido",
        unknown: "Não verificado",
      };
      const statusEmPortugues =
        statusMapPtSimple[statusWhatsapp] || statusWhatsapp;

      console.log(
        "📊 Status atualizado - Esperado:",
        statusWhatsapp,
        `(${statusEmPortugues})`,
        "Recebido:",
        clienteAtualizado.status_whatsapp
      );

      if (clienteAtualizado.status_whatsapp !== statusWhatsapp) {
        console.warn(
          "⚠️ Status não corresponde ao esperado. Aguardando propagação..."
        );
        // Tentar novamente após um pequeno delay para garantir propagação
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: recheckData, error: recheckError } = await supabaseClient
          .from("instacar_clientes_envios")
          .select("status_whatsapp")
          .eq("id", clienteId)
          .single();

        if (recheckError) {
          console.error("Erro ao rechecar status:", recheckError);
        } else if (
          recheckData &&
          recheckData.status_whatsapp === statusWhatsapp
        ) {
          console.log(
            "✅ Status confirmado após recheck:",
            recheckData.status_whatsapp
          );
        } else {
          console.warn(
            "⚠️ Status ainda não corresponde após recheck. Esperado:",
            statusWhatsapp,
            "Recebido:",
            recheckData?.status_whatsapp
          );
        }
      } else {
        console.log(
          "✅ Status confirmado imediatamente:",
          clienteAtualizado.status_whatsapp
        );
      }

      // Mapear status para português (reutilizar mapeamento)
      const statusMapPt = {
        valid: { label: "Válido", icon: "✅" },
        invalid: { label: "Inválido", icon: "❌" },
        unknown: { label: "Não verificado", icon: "⚪" },
      };
      const statusInfo = statusMapPt[statusWhatsapp] || {
        label: "Desconhecido",
        icon: "❓",
      };

      // Mostrar sucesso com mensagem em português
      mostrarAlerta(
        `Status WhatsApp atualizado com sucesso: ${statusInfo.label} ${statusInfo.icon}`,
        "success"
      );

      // Restaurar botão
      if (button) {
        button.innerHTML = originalText;
        button.disabled = false;
      }

      // Atualizar visualmente a linha do cliente imediatamente (otimista)
      // Isso dá feedback imediato ao usuário enquanto aguarda a propagação
      // Tentar múltiplos seletores para garantir que encontre a linha
      let row = document.querySelector(`tr[data-cliente-id="${clienteId}"]`);

      // Se não encontrar pelo atributo, tentar pelo botão de verificar
      if (!row && button) {
        const buttonRow = button.closest("tr");
        if (buttonRow) {
          row = buttonRow;
          // Adicionar atributo se não tiver
          if (!row.hasAttribute("data-cliente-id")) {
            row.setAttribute("data-cliente-id", clienteId);
          }
        }
      }

      if (row) {
        // Tentar encontrar célula de status (3ª coluna ou pelo atributo)
        let statusCell = row.querySelector("td[data-status-whatsapp]");
        if (!statusCell) {
          // Se não encontrar pelo atributo, usar índice da coluna (3ª coluna = índice 2)
          const cells = row.querySelectorAll("td");
          if (cells.length >= 3) {
            statusCell = cells[2]; // 3ª coluna (índice 2)
            statusCell.setAttribute("data-status-whatsapp", statusWhatsapp);
          }
        }

        if (statusCell) {
          // Atualizar badge imediatamente em português
          statusCell.setAttribute("data-status-whatsapp", statusWhatsapp);
          statusCell.innerHTML = `<span class="badge badge-${statusWhatsapp}" title="${statusInfo.label}">${statusInfo.icon} ${statusInfo.label}</span>`;
          console.log(
            "✨ Status atualizado visualmente na tabela:",
            statusInfo.label
          );

          // Adicionar animação visual para destacar a mudança
          statusCell.style.transition = "background-color 0.3s";
          statusCell.style.backgroundColor = "#e7f3ff";
          setTimeout(() => {
            statusCell.style.backgroundColor = "";
          }, 1000);
        } else {
          console.warn(
            "⚠️ Célula de status não encontrada na linha do cliente"
          );
        }
      } else {
        console.warn(
          "⚠️ Linha do cliente não encontrada para atualização imediata. Cliente ID:",
          clienteId
        );
      }

      // Recarregar lista completa após um delay para garantir sincronização
      setTimeout(async () => {
        console.log(
          "🔄 Recarregando lista completa de clientes após atualização..."
        );
        const pagina = window.paginaAtualClientes || paginaAtualClientes || 1;
        console.log("📄 Página atual:", pagina);

        await carregarListaClientes(pagina);
        console.log("✅ Lista completa recarregada");
      }, 1200);
    } catch (error) {
      console.error("Erro ao verificar WhatsApp:", error);
      mostrarAlerta(`Erro ao verificar WhatsApp: ${error.message}`, "error");
      if (button) {
        button.innerHTML = originalText;
        button.disabled = false;
      }
      // Recarregar lista mesmo em caso de erro para garantir sincronização
      setTimeout(() => {
        carregarListaClientes(paginaAtualClientes || 1);
      }, 500);
    }
  }

  window.carregarListaClientes = carregarListaClientes;
  window.renderizarPaginacaoClientes = renderizarPaginacaoClientes;
  window.verificarWhatsAppSelecionados = verificarWhatsAppSelecionados;
  window.verificarWhatsAppIndividual = verificarWhatsAppIndividual;
  window.enviarMensagemIndividual = enviarMensagemIndividual;
  window.alternarBloqueioCliente = alternarBloqueioCliente;
  window.fecharModalEnviarMensagem = fecharModalEnviarMensagem;
  window.toggleTipoEnvio = toggleTipoEnvio;
  window.atualizarStatusConexoes = atualizarStatusConexoes;
  /**
   * Carrega dados completos do cliente incluindo histórico de envios
   * @param {string} clienteId - ID do cliente
   * @returns {Promise<Object>} Dados do cliente e histórico
   */
  async function carregarDadosClienteCompleto(clienteId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return null;
    }

    try {
      // Buscar dados do cliente
      const { data: cliente, error: errorCliente } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("*")
        .eq("id", clienteId)
        .single();

      if (errorCliente) {
        throw new Error(`Erro ao buscar cliente: ${errorCliente.message}`);
      }

      if (!cliente) {
        throw new Error("Cliente não encontrado");
      }

      // Buscar histórico de envios
      // Buscar por cliente_id OU telefone (para capturar envios individuais que podem não ter cliente_id)
      // IMPORTANTE: Normalizar telefone para garantir formato consistente (55XXXXXXXXXXX)
      const telefoneCliente = normalizarTelefone(cliente.telefone || "");

      // Log para debug (apenas em modo debug)
      logger.debug(
        "DEBUG_HISTORICO",
        "=== DEBUG: Busca de Histórico - Telefone ==="
      );
      logger.debug(
        "DEBUG_HISTORICO",
        "Telefone original do cliente:",
        cliente.telefone
      );
      logger.debug(
        "DEBUG_HISTORICO",
        "Telefone normalizado para busca:",
        telefoneCliente
      );

      // Fazer duas queries separadas e combinar resultados (mais confiável que .or())
      // IMPORTANTE: Buscar TODOS os registros (sem limite) para garantir que todas as campanhas apareçam
      const [resultClienteId, resultTelefone] = await Promise.all([
        // Query 1: Buscar por cliente_id (sem limite para garantir todos os registros)
        supabaseClient
          .from("instacar_historico_envios")
          .select(
            `
            *,
            instacar_campanhas (
              id,
              nome
            )
          `
          )
          .eq("cliente_id", clienteId)
          .order("timestamp_envio", { ascending: false }),
        // Query 2: Buscar por telefone (para capturar envios individuais) (sem limite)
        supabaseClient
          .from("instacar_historico_envios")
          .select(
            `
            *,
            instacar_campanhas (
              id,
              nome
            )
          `
          )
          .eq("telefone", telefoneCliente)
          .order("timestamp_envio", { ascending: false }),
      ]);

      // Combinar resultados e remover duplicatas (mesmo registro pode aparecer nas duas queries)
      const historicoMap = new Map();

      // Adicionar resultados da query por cliente_id
      if (resultClienteId.data) {
        resultClienteId.data.forEach((item) => {
          historicoMap.set(item.id, item);
        });
      }

      // Adicionar resultados da query por telefone
      if (resultTelefone.data) {
        resultTelefone.data.forEach((item) => {
          historicoMap.set(item.id, item);
        });
      }

      // Converter Map para Array e ordenar por timestamp
      // IMPORTANTE: Não limitar aqui - manter todos os registros para exibição completa
      const historico = Array.from(historicoMap.values())
        .sort((a, b) => {
          const timestampA = new Date(a.timestamp_envio || a.created_at || 0);
          const timestampB = new Date(b.timestamp_envio || b.created_at || 0);
          return timestampB - timestampA; // Mais recente primeiro
        });

      // Verificar erros
      const errorHistorico = resultClienteId.error || resultTelefone.error;

      // Log detalhado para debug (apenas em modo debug)
      logger.debug("DEBUG_HISTORICO", "=== DEBUG: Busca de Histórico ===");
      logger.debug("DEBUG_HISTORICO", "Cliente ID:", clienteId);
      logger.debug("DEBUG_HISTORICO", "Telefone original:", cliente.telefone);
      logger.debug("DEBUG_HISTORICO", "Telefone normalizado:", telefoneCliente);
      logger.debug("DEBUG_HISTORICO", "Query por cliente_id:", {
        data: resultClienteId.data,
        error: resultClienteId.error,
        count: resultClienteId.data?.length || 0,
        errorDetails: resultClienteId.error
          ? {
              message: resultClienteId.error.message,
              code: resultClienteId.error.code,
              details: resultClienteId.error.details,
              hint: resultClienteId.error.hint,
            }
          : null,
      });
      logger.debug("DEBUG_HISTORICO", "Query por telefone:", {
        data: resultTelefone.data,
        error: resultTelefone.error,
        count: resultTelefone.data?.length || 0,
        errorDetails: resultTelefone.error
          ? {
              message: resultTelefone.error.message,
              code: resultTelefone.error.code,
              details: resultTelefone.error.details,
              hint: resultTelefone.error.hint,
            }
          : null,
      });
      logger.debug("DEBUG_HISTORICO", "Histórico combinado:", {
        total: historico.length,
        items: historico.map((h) => ({
          id: h.id,
          cliente_id: h.cliente_id,
          telefone: h.telefone,
          status: h.status_envio,
          timestamp: h.timestamp_envio,
        })),
      });

      if (errorHistorico) {
        logger.error("❌ Erro ao buscar histórico:", errorHistorico);
      } else {
        logger.debug(
          "DEBUG_HISTORICO",
          `✅ Histórico encontrado: ${historico.length} registros para cliente ${clienteId} ou telefone ${telefoneCliente}`
        );
      }

      // Armazenar histórico completo para filtros
      window.historicoCompleto = historico || [];
      window.clienteAtualId = clienteId;
      window.clienteAtualTelefone = telefoneCliente;

      return {
        cliente,
        historico: historico || [],
      };
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      throw error;
    }
  }

  // Variáveis globais para histórico e paginação
  window.historicoCompleto = [];
  window.historicoFiltrado = [];
  window.paginaAtualHistorico = 1;
  window.registrosPorPagina = 20;
  window.clienteAtualId = null;
  window.clienteAtualTelefone = null;

  /**
   * Busca histórico com filtros e paginação
   * @param {Object} filtros - Objeto com filtros (campanha_id, status, dataInicio, dataFim, buscaTexto)
   * @param {number} pagina - Número da página
   * @returns {Promise<Object>} Histórico filtrado e paginado
   */
  async function buscarHistoricoComFiltros(filtros = {}, pagina = 1) {
    if (!supabaseClient || !window.clienteAtualId) {
      return { historico: [], total: 0, totalPaginas: 0 };
    }

    try {
      const clienteId = window.clienteAtualId;
      const telefone = window.clienteAtualTelefone;

      // Construir query base
      let queryClienteId = supabaseClient
        .from("instacar_historico_envios")
        .select(
          `
          *,
          instacar_campanhas (
            id,
            nome
          )
        `,
          { count: "exact" }
        )
        .eq("cliente_id", clienteId);

      let queryTelefone = supabaseClient
        .from("instacar_historico_envios")
        .select(
          `
          *,
          instacar_campanhas (
            id,
            nome
          )
        `,
          { count: "exact" }
        )
        .eq("telefone", telefone);

      // Aplicar filtros
      if (filtros.campanha_id) {
        queryClienteId = queryClienteId.eq("campanha_id", filtros.campanha_id);
        queryTelefone = queryTelefone.eq("campanha_id", filtros.campanha_id);
      }

      if (filtros.status) {
        queryClienteId = queryClienteId.eq("status_envio", filtros.status);
        queryTelefone = queryTelefone.eq("status_envio", filtros.status);
      }

      if (filtros.dataInicio) {
        queryClienteId = queryClienteId.gte("timestamp_envio", filtros.dataInicio + "T00:00:00");
        queryTelefone = queryTelefone.gte("timestamp_envio", filtros.dataInicio + "T00:00:00");
      }

      if (filtros.dataFim) {
        queryClienteId = queryClienteId.lte("timestamp_envio", filtros.dataFim + "T23:59:59");
        queryTelefone = queryTelefone.lte("timestamp_envio", filtros.dataFim + "T23:59:59");
      }

      // Ordenar e limitar
      queryClienteId = queryClienteId
        .order("timestamp_envio", { ascending: false })
        .range((pagina - 1) * window.registrosPorPagina, pagina * window.registrosPorPagina - 1);

      queryTelefone = queryTelefone
        .order("timestamp_envio", { ascending: false })
        .range((pagina - 1) * window.registrosPorPagina, pagina * window.registrosPorPagina - 1);

      // Executar queries
      const [resultClienteId, resultTelefone] = await Promise.all([
        queryClienteId,
        queryTelefone,
      ]);

      // Combinar resultados
      const historicoMap = new Map();
      if (resultClienteId.data) {
        resultClienteId.data.forEach((item) => {
          historicoMap.set(item.id, item);
        });
      }
      if (resultTelefone.data) {
        resultTelefone.data.forEach((item) => {
          historicoMap.set(item.id, item);
        });
      }

      let historico = Array.from(historicoMap.values()).sort((a, b) => {
        const timestampA = new Date(a.timestamp_envio || a.created_at || 0);
        const timestampB = new Date(b.timestamp_envio || b.created_at || 0);
        return timestampB - timestampA;
      });

      // Aplicar filtro de busca por texto (se houver)
      if (filtros.buscaTexto) {
        const textoBusca = filtros.buscaTexto.toLowerCase();
        historico = historico.filter((item) => {
          const mensagem = (item.mensagem_enviada || "").toLowerCase();
          return mensagem.includes(textoBusca);
        });
      }

      // Obter total (usar o maior count entre as duas queries)
      const total = Math.max(
        resultClienteId.count || 0,
        resultTelefone.count || 0
      );
      const totalPaginas = Math.ceil(total / window.registrosPorPagina);

      return {
        historico,
        total,
        totalPaginas,
        pagina,
      };
    } catch (error) {
      console.error("Erro ao buscar histórico com filtros:", error);
      return { historico: [], total: 0, totalPaginas: 0, pagina: 1 };
    }
  }

  /**
   * Filtra e renderiza histórico
   */
  async function filtrarHistorico() {
    const filtros = {
      campanha_id: document.getElementById("filtroCampanhaHistorico")?.value || "",
      status: document.getElementById("filtroStatusHistorico")?.value || "",
      dataInicio: document.getElementById("filtroDataInicioHistorico")?.value || "",
      dataFim: document.getElementById("filtroDataFimHistorico")?.value || "",
      buscaTexto: document.getElementById("filtroBuscaTextoHistorico")?.value || "",
    };

    // Remover filtros vazios
    Object.keys(filtros).forEach((key) => {
      if (!filtros[key]) delete filtros[key];
    });

    window.paginaAtualHistorico = 1;
    const resultado = await buscarHistoricoComFiltros(filtros, window.paginaAtualHistorico);
    window.historicoFiltrado = resultado.historico;

    renderizarHistoricoEnvios(resultado.historico);
    atualizarEstatisticasHistorico(resultado.historico);
    atualizarPaginacaoHistorico(resultado.totalPaginas, resultado.pagina);
  }

  /**
   * Limpa todos os filtros
   */
  function limparFiltrosHistorico() {
    document.getElementById("filtroCampanhaHistorico").value = "";
    document.getElementById("filtroStatusHistorico").value = "";
    document.getElementById("filtroDataInicioHistorico").value = "";
    document.getElementById("filtroDataFimHistorico").value = "";
    document.getElementById("filtroBuscaTextoHistorico").value = "";
    filtrarHistorico();
  }

  /**
   * Muda página do histórico
   */
  async function mudarPaginaHistorico(direcao) {
    const novaPagina = window.paginaAtualHistorico + direcao;
    if (novaPagina < 1) return;

    const filtros = {
      campanha_id: document.getElementById("filtroCampanhaHistorico")?.value || "",
      status: document.getElementById("filtroStatusHistorico")?.value || "",
      dataInicio: document.getElementById("filtroDataInicioHistorico")?.value || "",
      dataFim: document.getElementById("filtroDataFimHistorico")?.value || "",
      buscaTexto: document.getElementById("filtroBuscaTextoHistorico")?.value || "",
    };

    Object.keys(filtros).forEach((key) => {
      if (!filtros[key]) delete filtros[key];
    });

    const resultado = await buscarHistoricoComFiltros(filtros, novaPagina);
    if (resultado.historico.length === 0 && novaPagina > 1) return; // Não mudar se não houver resultados

    window.paginaAtualHistorico = novaPagina;
    window.historicoFiltrado = resultado.historico;

    renderizarHistoricoEnvios(resultado.historico);
    atualizarPaginacaoHistorico(resultado.totalPaginas, resultado.pagina);
  }

  /**
   * Atualiza controles de paginação
   */
  function atualizarPaginacaoHistorico(totalPaginas, paginaAtual) {
    const divPaginacao = document.getElementById("historicoPaginacao");
    const infoPagina = document.getElementById("infoPaginaHistorico");
    const btnAnterior = document.getElementById("btnPaginaAnterior");
    const btnProxima = document.getElementById("btnPaginaProxima");

    if (totalPaginas <= 1) {
      if (divPaginacao) divPaginacao.style.display = "none";
      return;
    }

    if (divPaginacao) divPaginacao.style.display = "block";
    if (infoPagina) infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
    if (btnAnterior) btnAnterior.disabled = paginaAtual <= 1;
    if (btnProxima) btnProxima.disabled = paginaAtual >= totalPaginas;
  }

  /**
   * Atualiza estatísticas do histórico
   */
  function atualizarEstatisticasHistorico(historico) {
    const total = historico.length;
    const enviados = historico.filter((h) => h.status_envio === "enviado").length;
    const erros = historico.filter((h) => h.status_envio === "erro").length;
    const campanhasUnicas = new Set(
      historico
        .filter((h) => h.campanha_id)
        .map((h) => h.campanha_id)
    ).size;

    document.getElementById("statTotalHistorico").textContent = total;
    document.getElementById("statEnviadosHistorico").textContent = enviados;
    document.getElementById("statErrosHistorico").textContent = erros;
    document.getElementById("statCampanhasHistorico").textContent = campanhasUnicas;
  }

  /**
   * Exporta histórico filtrado para CSV
   */
  function exportarHistorico() {
    const historico = window.historicoFiltrado || window.historicoCompleto || [];
    if (historico.length === 0) {
      mostrarAlerta("Nenhum histórico para exportar", "warning");
      return;
    }

    // Cabeçalhos CSV
    const headers = ["Data/Hora", "Status", "Tipo", "Campanha", "Mensagem", "Erro"];
    const rows = historico.map((item) => {
      const dataHora = formatarData(item.timestamp_envio || item.created_at);
      const status = item.status_envio || "-";
      const tipo = item.tipo_envio || "normal";
      const campanha = item.instacar_campanhas?.nome || "-";
      const mensagem = (item.mensagem_enviada || "-").replace(/"/g, '""');
      const erro = (item.mensagem_erro || "-").replace(/"/g, '""');
      return [dataHora, status, tipo, campanha, mensagem, erro];
    });

    // Criar CSV
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `historico_envios_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Carrega lista de campanhas para o filtro
   */
  async function carregarCampanhasParaFiltro() {
    if (!supabaseClient) return;

    try {
      const { data: campanhas, error } = await supabaseClient
        .from("instacar_campanhas")
        .select("id, nome")
        .order("nome");

      if (error) {
        console.error("Erro ao carregar campanhas:", error);
        return;
      }

      const select = document.getElementById("filtroCampanhaHistorico");
      if (!select) return;

      // Limpar opções existentes (exceto "Todas as campanhas")
      select.innerHTML = '<option value="">Todas as campanhas</option>';

      // Adicionar campanhas
      campanhas.forEach((campanha) => {
        const option = document.createElement("option");
        option.value = campanha.id;
        option.textContent = campanha.nome;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("Erro ao carregar campanhas para filtro:", error);
    }
  }

  /**
   * Formata telefone para exibição
   * @param {string} telefone - Telefone no formato 55XXXXXXXXXXX
   * @returns {string} Telefone formatado
   */
  function formatarTelefone(telefone) {
    if (!telefone) return "-";
    // Celular: 5511999999999 -> (11) 99999-9999
    if (telefone.length === 13 && telefone.startsWith("55")) {
      const ddd = telefone.substring(2, 4);
      const parte1 = telefone.substring(4, 9);
      const parte2 = telefone.substring(9);
      return `(${ddd}) ${parte1}-${parte2}`;
    }
    // Fixo: 551112345678 -> (11) 1234-5678
    if (telefone.length === 12 && telefone.startsWith("55")) {
      const ddd = telefone.substring(2, 4);
      const parte1 = telefone.substring(4, 8);
      const parte2 = telefone.substring(8);
      return `(${ddd}) ${parte1}-${parte2}`;
    }
    return telefone;
  }

  /**
   * Formata data para pt-BR
   * @param {string|Date} data - Data a formatar
   * @returns {string} Data formatada
   */
  function formatarData(data) {
    if (!data) return "-";
    try {
      const date = new Date(data);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
    } catch (e) {
      return String(data);
    }
  }

  /**
   * Normaliza telefone para formato 55XXXXXXXXXXX
   * @param {string} telefone - Telefone a normalizar
   * @returns {string} Telefone normalizado
   */
  function normalizarTelefone(telefone) {
    if (!telefone) return "";
    // Remove tudo que não é número
    let numeros = telefone.replace(/\D/g, "");
    
    // DDDs válidos no Brasil (lista completa):
    // 11-19 (SP), 21-28 (RJ/ES), 31-38 (MG), 41-49 (PR/SC), 51-59 (RS), 
    // 61 (DF), 62-64 (GO/TO), 65-69 (MT/MS), 71-79 (BA/SE), 81-89 (PE/AL/PB/RN/CE/PI/MA),
    // 91-99 (PA/AP/AM/RR/RO/AC)
    // IMPORTANTE: DDD 55 é válido (Rio Grande do Sul)
    
    // Se não começa com 55, adiciona código do país
    if (!numeros.startsWith("55")) {
      numeros = "55" + numeros;
    }
    
    // Padronizar números de celular antigos (8 dígitos) para 9 dígitos
    // Números antigos: 55 + DDD + 8 dígitos começando com 6, 7, 8 ou 9
    // Números modernos: 55 + DDD + 9 dígitos começando com 9
    // Para padronizar: adicionar um 9 ANTES do número antigo
    if (numeros.length === 12) {
      // Estrutura: 55 (país, posições 0-1) + DDD (2 dígitos, posições 2-3) + número (8 dígitos, posições 4-11)
      const codigoPais = numeros.substring(0, 2); // "55"
      const ddd = numeros.substring(2, 4); // DDD (2 dígitos)
      const primeiroDigitoAposDDD = numeros.charAt(4); // Primeiro dígito do número
      
      // Celulares antigos no Brasil geralmente começam com 6, 7, 8 ou 9
      // Fixos geralmente começam com 1, 2, 3, 4 ou 5
      // Se começa com 6, 7, 8 ou 9 após o DDD, é provavelmente celular antigo (8 dígitos)
      // Padronizar: adicionar 9 antes do número antigo para ter 9 dígitos
      // Exemplos:
      // - 555596773757 → 55 + 55 + 9 + 96773757 = 5555996773757 (13 dígitos)
      // - 555581158181 → 55 + 55 + 9 + 81158181 = 5555991158181 (13 dígitos)
      if (["6", "7", "8", "9"].includes(primeiroDigitoAposDDD)) {
        const numeroAposDDD = numeros.substring(4); // Número completo após DDD (8 dígitos)
        // Adicionar 9 padronizado ANTES do número antigo
        numeros = codigoPais + ddd + "9" + numeroAposDDD; // 55 + DDD + 9 + número antigo
      }
    }
    
    return numeros;
  }

  /**
   * Valida telefone em tempo real e exibe mensagem de validação
   */
  function validarTelefoneTempoReal() {
    const telefoneInput = document.getElementById("fieldTelefoneInput");
    const validacaoDiv = document.getElementById("fieldTelefoneValidacao");
    const btnSalvar = document.getElementById("btnSalvarCliente");

    if (!telefoneInput || !validacaoDiv) return;

    const telefone = telefoneInput.value.trim();
    
    // Se vazio, ocultar validação mas manter botão habilitado (validação será feita no submit)
    if (!telefone) {
      validacaoDiv.style.display = "none";
      validacaoDiv.className = "validation-message";
      validacaoDiv.textContent = "";
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.style.opacity = "1";
        btnSalvar.style.cursor = "pointer";
      }
      return;
    }

    // Normalizar telefone
    const telefoneNormalizado = normalizarTelefone(telefone);
    
    // Detectar se o número original tinha código duplicado
    const telefoneOriginalLimpo = telefone.replace(/\D/g, "");
    const tinhaCodigoDuplicado = telefoneOriginalLimpo.startsWith("5555");
    
    // Validar comprimento
    // Padrões brasileiros:
    // - Fixo: 55 + DDD (2) + número (8) = 12 dígitos (ex: 551112345678)
    // - Celular: 55 + DDD (2) + número (9) = 13 dígitos (ex: 5511999999999)
    // - Mínimo aceitável: 12 dígitos (telefone fixo)
    // - Máximo aceitável: 13 dígitos (celular)
    
    if (telefoneNormalizado.length < 12 || telefoneNormalizado.length > 13) {
      validacaoDiv.style.display = "block";
      validacaoDiv.className = "validation-message error";
      
      // Mensagem mais clara baseada no que foi digitado
      let mensagem = `⚠️ Telefone inválido. `;
      
      if (telefoneNormalizado.length === 11) {
        // 55 + DDD + 7 dígitos (faltou 1 dígito)
        mensagem += `Falta 1 dígito. `;
      } else if (telefoneNormalizado.length === 10) {
        // 55 + DDD + 6 dígitos (faltam 2 dígitos)
        mensagem += `Faltam 2 dígitos. `;
      } else if (telefoneNormalizado.length < 12) {
        mensagem += `Faltam dígitos. `;
      } else if (telefoneNormalizado.length === 14 || tinhaCodigoDuplicado) {
        // Possível "55" duplicado ou número muito longo
        mensagem += `Código do país duplicado detectado. `;
        mensagem += `Exemplo: se você copiou "+55 55 98765-4321" do WhatsApp, use apenas "55987654321" (celular) ou "5511987654321" (fixo). `;
      } else if (telefoneNormalizado.length > 13) {
        mensagem += `Número muito longo. `;
      }
      
      mensagem += `Formato esperado: 55 + DDD (2 dígitos) + número. `;
      mensagem += `- Fixo: 8 dígitos (ex: 551112345678) `;
      mensagem += `- Celular: 9 dígitos (ex: 5511999999999). `;
      mensagem += `Telefone normalizado: ${telefoneNormalizado} (${telefoneNormalizado.length} dígitos, precisa de 12 ou 13).`;
      
      validacaoDiv.textContent = mensagem;
      
      if (btnSalvar) {
        btnSalvar.disabled = true;
        btnSalvar.style.opacity = "0.5";
        btnSalvar.style.cursor = "not-allowed";
      }
      return;
    }

    // Telefone válido (12 ou 13 dígitos)
    // Após normalização e padronização:
    // - 12 dígitos: 55 + DDD (2) + número (8) = fixo
    // - 13 dígitos: 55 + DDD (2) + número (9) = celular (padronizado)
    let tipoTelefone = telefoneNormalizado.length === 12 ? "fixo" : "celular";
    let numeroParaExibir = telefoneNormalizado;
    let foiPadronizado = false;
    
    // Se tem 12 dígitos mas começa com 6, 7, 8 ou 9 após o DDD, é celular antigo que será padronizado
    if (telefoneNormalizado.length === 12 && telefoneNormalizado.length >= 5) {
      const primeiroDigitoAposDDD = telefoneNormalizado.charAt(4);
      // Celulares antigos geralmente começam com 6, 7, 8 ou 9
      if (["6", "7", "8", "9"].includes(primeiroDigitoAposDDD)) {
        tipoTelefone = "celular";
        // Aplicar padronização para mostrar o número correto
        const codigoPais = telefoneNormalizado.substring(0, 2);
        const ddd = telefoneNormalizado.substring(2, 4);
        const numeroAposDDD = telefoneNormalizado.substring(4);
        numeroParaExibir = codigoPais + ddd + "9" + numeroAposDDD; // Padronizado
        foiPadronizado = true;
      }
    }
    
    // Mensagem de sucesso
    let mensagemSucesso = `✅ Telefone válido (${tipoTelefone}): ${numeroParaExibir}`;
    if (foiPadronizado) {
      mensagemSucesso += ` (padronizado de ${telefoneNormalizado} para 9 dígitos)`;
    }
    
    // Se tinha código duplicado detectado mas o número está correto, não avisar
    // (porque 5555 pode ser correto: 55 país + 55 DDD RS)
    if (tinhaCodigoDuplicado && telefoneNormalizado.length <= 13) {
      // Se o número está válido, provavelmente não era duplicado, era DDD 55 válido
      // Não adicionar aviso neste caso
    }
    
    validacaoDiv.style.display = "block";
    validacaoDiv.className = "validation-message success";
    validacaoDiv.textContent = mensagemSucesso;
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.style.opacity = "1";
      btnSalvar.style.cursor = "pointer";
    }
  }

  /**
   * Renderiza modal com dados do cliente
   * @param {Object} dados - Dados do cliente e histórico
   */
  function renderizarModalCliente(dados) {
    const { cliente, historico } = dados;
    const modal = document.getElementById("modalCliente");
    const loading = document.getElementById("modalClienteLoading");
    const content = document.getElementById("modalClienteContent");

    if (!modal || !loading || !content) {
      console.error("Elementos do modal não encontrados");
      return;
    }

    // Log para debug (apenas em modo debug)
    logger.debug("DEBUG_HISTORICO", "=== DEBUG: Renderizar Modal Cliente ===");
    logger.debug(
      "DEBUG_HISTORICO",
      "Cliente:",
      cliente?.nome_cliente,
      cliente?.id
    );
    logger.debug("DEBUG_HISTORICO", "Histórico recebido:", {
      isArray: Array.isArray(historico),
      length: historico?.length || 0,
      items: historico?.slice(0, 3).map((h) => ({
        id: h.id,
        cliente_id: h.cliente_id,
        telefone: h.telefone,
        status: h.status_envio,
      })),
    });

    // Ocultar loading, mostrar conteúdo
    loading.style.display = "none";
    content.style.display = "block";

    // Preencher ID do cliente
    document.getElementById("clienteId").value = cliente.id;

    // Preencher campos de dados
    document.getElementById("fieldNomeValue").textContent =
      cliente.nome_cliente || "-";
    document.getElementById("fieldNomeInput").value =
      cliente.nome_cliente || "";

    document.getElementById("fieldTelefoneValue").textContent =
      formatarTelefone(cliente.telefone);
    document.getElementById("fieldTelefoneInput").value =
      cliente.telefone || "";

    document.getElementById("fieldEmailValue").textContent =
      cliente.email || "-";
    document.getElementById("fieldEmailInput").value = cliente.email || "";

    // Bloqueado Envios
    const bloqueadoEnvios = cliente.bloqueado_envios === true;
    document.getElementById("fieldBloqueadoEnviosInput").checked =
      bloqueadoEnvios;
    document.getElementById("fieldBloqueadoEnviosValue").textContent =
      bloqueadoEnvios
        ? "🚫 Bloqueado - Não receberá mensagens"
        : "✅ Permitido - Receberá mensagens";

    // Status WhatsApp
    const statusTexto = cliente.status_whatsapp || "unknown";
    let statusLabel = "Não verificado";
    let statusIcon = "⚪";
    if (statusTexto === "valid") {
      statusLabel = "Válido";
      statusIcon = "✅";
    } else if (statusTexto === "invalid") {
      statusLabel = "Inválido";
      statusIcon = "❌";
    }
    document.getElementById(
      "fieldStatusWhatsappValue"
    ).innerHTML = `<span class="badge badge-${statusTexto}">${statusIcon} ${statusLabel}</span>`;

    // Estatísticas - Calcular a partir do histórico real (mais confiável que o campo do banco)
    const historicoArray = historico || [];
    const totalEnviosReal = historicoArray.length;
    
    // Calcular primeiro e último envio a partir do histórico
    let primeiroEnvioReal = null;
    let ultimoEnvioReal = null;
    if (historicoArray.length > 0) {
      const timestamps = historicoArray
        .map(h => h.timestamp_envio || h.created_at)
        .filter(t => t)
        .map(t => new Date(t))
        .sort((a, b) => a - b); // Ordenar do mais antigo para o mais recente
      
      if (timestamps.length > 0) {
        primeiroEnvioReal = timestamps[0];
        ultimoEnvioReal = timestamps[timestamps.length - 1];
      }
    }
    
    // Usar histórico real se disponível, senão usar campo do banco como fallback
    const totalEnviosExibir = totalEnviosReal > 0 ? totalEnviosReal : (cliente.total_envios || 0);
    const primeiroEnvioExibir = primeiroEnvioReal || cliente.primeiro_envio;
    const ultimoEnvioExibir = ultimoEnvioReal || cliente.ultimo_envio;
    
    document.getElementById("statTotalEnvios").textContent = totalEnviosExibir;
    document.getElementById("statPrimeiroEnvio").textContent =
      primeiroEnvioExibir ? formatarData(primeiroEnvioExibir) : "-";
    document.getElementById("statUltimoEnvio").textContent =
      ultimoEnvioExibir ? formatarData(ultimoEnvioExibir) : "-";
    
    // Calcular campanhas diferentes do histórico
    const campanhasUnicas = new Map();
    (historico || []).forEach((h) => {
      if (h.campanha_id) {
        const campanhaId = h.campanha_id;
        // Pode ser objeto ou null
        const campanhaData = h.instacar_campanhas;
        let campanhaNome = "Campanha sem nome";
        if (campanhaData && campanhaData.nome) {
          campanhaNome = campanhaData.nome;
        } else if (campanhaId) {
          // Se não tem nome, usar ID truncado
          campanhaNome = `Campanha ${campanhaId.substring(0, 8)}...`;
        }
        
        if (!campanhasUnicas.has(campanhaId)) {
          campanhasUnicas.set(campanhaId, {
            nome: campanhaNome,
            primeiroEnvio: h.timestamp_envio,
            ultimoEnvio: h.timestamp_envio,
            totalEnvios: 0
          });
        } else {
          // Atualizar último envio se for mais recente
          const campanha = campanhasUnicas.get(campanhaId);
          if (new Date(h.timestamp_envio) > new Date(campanha.ultimoEnvio)) {
            campanha.ultimoEnvio = h.timestamp_envio;
          }
        }
        campanhasUnicas.get(campanhaId).totalEnvios++;
      }
    });
    
    document.getElementById("statCampanhasEnviadas").textContent = campanhasUnicas.size;
    
    // Renderizar lista resumida de campanhas
    const listaCampanhasEl = document.getElementById("statCampanhasListaContent");
    if (listaCampanhasEl) {
      if (campanhasUnicas.size === 0) {
        listaCampanhasEl.innerHTML = '<em>Nenhuma campanha ainda</em>';
      } else {
        const campanhasArray = Array.from(campanhasUnicas.entries())
          .sort((a, b) => new Date(b[1].ultimoEnvio) - new Date(a[1].ultimoEnvio))
          .slice(0, 5); // Mostrar apenas as 5 mais recentes
        
        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        campanhasArray.forEach(([id, info]) => {
          const dataUltimoEnvio = formatarData(info.ultimoEnvio);
          html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: hsl(var(--muted) / 0.2); border-radius: var(--radius-md);">
              <span style="font-weight: 500; font-size: 0.8125rem;">${info.nome}</span>
              <div style="display: flex; gap: 0.75rem; align-items: center; font-size: 0.75rem;">
                <span style="color: hsl(var(--muted-foreground));">${info.totalEnvios} envio${info.totalEnvios > 1 ? 's' : ''}</span>
                <span style="color: hsl(var(--muted-foreground));" title="Último envio: ${dataUltimoEnvio}">${dataUltimoEnvio}</span>
              </div>
            </div>
          `;
        });
        if (campanhasUnicas.size > 5) {
          html += `<div style="text-align: center; margin-top: 0.25rem; font-size: 0.75rem; color: hsl(var(--muted-foreground));">+${campanhasUnicas.size - 5} campanha${campanhasUnicas.size - 5 > 1 ? 's' : ''} (ver todas no Histórico)</div>`;
        }
        html += '</div>';
        listaCampanhasEl.innerHTML = html;
      }
    }

    // Datas
    document.getElementById("fieldCreatedAt").textContent = formatarData(
      cliente.created_at
    );
    document.getElementById("fieldUpdatedAt").textContent = formatarData(
      cliente.updated_at
    );

    // Renderizar veículos
    renderizarVeiculos(cliente.veiculos || []);

    // Renderizar observações
    renderizarObservacoes(cliente.observacoes_internas || []);

    // Renderizar histórico
    renderizarHistoricoEnvios(historico || []);
    
    // Atualizar estatísticas iniciais
    atualizarEstatisticasHistorico(historico || []);
    
    // Carregar campanhas para o filtro
    carregarCampanhasParaFiltro();

    // Configurar botões de ação baseado no status ativo
    const btnDesativar = document.getElementById("btnDesativarCliente");
    const btnExcluir = document.getElementById("btnExcluirCliente");
    if (cliente.ativo === false) {
      if (btnDesativar) {
        btnDesativar.textContent = "✅ Reativar Cliente";
        btnDesativar.onclick = () =>
          reativarCliente(document.getElementById("clienteId").value);
      }
    } else {
      if (btnDesativar) {
        btnDesativar.textContent = "🚫 Desativar Cliente";
        btnDesativar.onclick = () =>
          desativarCliente(document.getElementById("clienteId").value);
      }
    }

    // Garantir modo visualização inicial
    const modalContent = document.getElementById("modalClienteContent");
    modalContent.classList.remove("modo-edicao");
    modalContent.classList.add("modo-visualizacao");
    const btnEditar = document.getElementById("btnEditarCliente");
    const btnSalvar = document.getElementById("btnSalvarCliente");
    const btnCancelar = document.getElementById("btnCancelarEdicao");
    if (btnEditar) btnEditar.style.display = "flex";
    if (btnSalvar) btnSalvar.style.display = "none";
    if (btnCancelar) btnCancelar.style.display = "none";
    if (btnSalvar) btnSalvar.textContent = "💾 Salvar";
    
    // Garantir que campos de visualização estão visíveis e inputs ocultos
    // O CSS já cuida disso, mas garantimos aqui também para evitar problemas
    document.querySelectorAll('#modalClienteContent .modo-visualizacao').forEach(el => {
      if (el.id && (el.id.includes('Value') || el.id.includes('StatusWhatsapp'))) {
        el.style.display = '';
      }
    });
    document.querySelectorAll('#modalClienteContent .modo-edicao').forEach(el => {
      if (el.classList.contains('form-input') || el.classList.contains('form-checkbox') || el.classList.contains('form-label')) {
        el.style.display = '';
      }
    });
    document.getElementById("btnSalvarCliente").onclick = salvarEdicaoCliente;
    document.getElementById("btnCancelarEdicao").style.display = "none";

    // Mostrar botões de ação
    document.getElementById("btnDesativarCliente").style.display = "block";
    document.getElementById("btnExcluirCliente").style.display = "block";
  }

  /**
   * Renderiza lista de veículos
   * @param {Array} veiculos - Array de veículos
   */
  function renderizarVeiculos(veiculos) {
    const container = document.getElementById("veiculosList");
    if (!container) return;

    if (!veiculos || veiculos.length === 0) {
      container.innerHTML =
        '<p style="color: #666; text-align: center; padding: 20px;">Nenhum veículo cadastrado.</p>';
      return;
    }

    // Função auxiliar para buscar campo case-insensitive
    const getField = (obj, ...possibleKeys) => {
      for (const key of possibleKeys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "") {
          return obj[key];
        }
        // Tentar case-insensitive
        const lowerKey = key.toLowerCase();
        for (const objKey in obj) {
          if (
            objKey.toLowerCase() === lowerKey &&
            obj[objKey] !== undefined &&
            obj[objKey] !== null &&
            obj[objKey] !== ""
          ) {
            return obj[objKey];
          }
        }
      }
      return null;
    };

    let html = "";
    veiculos.forEach((veiculo, index) => {
      // Buscar campos com diferentes variações possíveis
      const veiculoDescricao =
        getField(veiculo, "veiculo", "Veiculo", "VEICULO") || null;
      const placa = getField(veiculo, "placa", "Placa", "PLACA") || null;
      const dtVenda =
        getField(veiculo, "dtVenda", "dt_venda", "dataVenda", "data_venda") ||
        null;
      const vendedor =
        getField(veiculo, "vendedor", "Vendedor", "VENDEDOR") || null;
      const planilhaOrigem =
        getField(veiculo, "planilhaOrigem", "planilha_origem", "fonte_dados") ||
        null;

      // Campos individuais (caso existam separados)
      const marca = getField(veiculo, "marca", "Marca", "MARCA") || null;
      const modelo = getField(veiculo, "modelo", "Modelo", "MODELO") || null;
      const ano =
        getField(
          veiculo,
          "ano",
          "Ano",
          "ANO",
          "ano_fabricacao",
          "AnoFabricacao"
        ) || null;

      // Construir descrição do veículo
      const infoPartes = [];

      // Se existe campo "veiculo" com descrição completa, usar ele
      if (veiculoDescricao) {
        infoPartes.push(`<strong>${veiculoDescricao}</strong>`);
      } else if (marca || modelo) {
        // Caso contrário, montar a partir dos campos individuais
        const partes = [];
        if (marca) partes.push(marca);
        if (modelo) partes.push(modelo);
        if (partes.length > 0) {
          infoPartes.push(`<strong>${partes.join(" ")}</strong>`);
        }
        if (ano) infoPartes.push(ano);
      }

      // Adicionar placa se existir
      if (placa) {
        infoPartes.push(`Placa: ${placa}`);
      }

      // Adicionar informações adicionais
      const infoAdicional = [];
      if (dtVenda) {
        infoAdicional.push(`Vendido em: ${dtVenda}`);
      }
      if (vendedor) {
        infoAdicional.push(`Vendedor: ${vendedor}`);
      }

      const descricaoPrincipal =
        infoPartes.length > 0
          ? infoPartes.join(" - ")
          : "Veículo sem informações";

      const descricaoCompleta =
        infoAdicional.length > 0
          ? `${descricaoPrincipal}<br><small style="color: #666;">${infoAdicional.join(
              " | "
            )}</small>`
          : descricaoPrincipal;

      const clienteId = document.getElementById("clienteId")?.value || "";

      html += `
        <div class="veiculo-item">
          <div class="veiculo-info">
            ${descricaoCompleta}
          </div>
          <div class="veiculo-actions">
            <button class="btn-secondary" onclick="removerVeiculoCliente('${clienteId}', ${index})" style="padding: 5px 10px; font-size: 12px;">🗑️ Remover</button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Renderiza lista de observações
   * @param {Array} observacoes - Array de observações
   */
  function renderizarObservacoes(observacoes) {
    const container = document.getElementById("observacoesList");
    if (!container) return;

    if (!observacoes || observacoes.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma observação registrada.</p>';
      return;
    }

    // Ordenar por timestamp (mais recente primeiro)
    const observacoesOrdenadas = [...observacoes].sort((a, b) => {
      const dateA = new Date(a.timestamp || a.created_at || 0);
      const dateB = new Date(b.timestamp || b.created_at || 0);
      return dateB - dateA;
    });

    let html = "";
    observacoesOrdenadas.forEach((obs) => {
      const texto = obs.texto || obs.observacao || "-";
      const autor = obs.autor || "Sistema";
      const timestamp =
        obs.timestamp || obs.created_at || new Date().toISOString();
      const dataFormatada = formatarData(timestamp);

      html += `
        <div class="observacao-item">
          <div class="observacao-texto">${texto}</div>
          <div class="observacao-meta">
            <span>Por: ${autor}</span>
            <span>${dataFormatada}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  /**
   * Renderiza histórico de envios
   * @param {Array} historico - Array de histórico de envios
   */
  function renderizarHistoricoEnvios(historico) {
    const tbody = document.getElementById("historicoEnviosBody");
    if (!tbody) {
      console.error("❌ Elemento historicoEnviosBody não encontrado!");
      return;
    }

    logger.debug(
      "DEBUG_HISTORICO",
      "=== DEBUG: Renderizar Histórico Envios ==="
    );
    logger.debug("DEBUG_HISTORICO", "Histórico recebido:", {
      isArray: Array.isArray(historico),
      length: historico?.length || 0,
      type: typeof historico,
      value: historico,
    });

    if (!historico || historico.length === 0) {
      logger.warn("⚠️ Nenhum histórico encontrado para renderizar");
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">Nenhum histórico de envio encontrado.</td></tr>';
      return;
    }

    logger.debug(
      "DEBUG_HISTORICO",
      `✅ Renderizando ${historico.length} registros de histórico`
    );

    let html = "";
    historico.forEach((item) => {
      const status = item.status_envio || "enviado";
      const statusBadge =
        status === "enviado"
          ? '<span class="badge badge-valid">✅ Enviado</span>'
          : status === "erro"
          ? '<span class="badge badge-invalid">❌ Erro</span>'
          : '<span class="badge badge-unknown">🚫 Bloqueado</span>';

      const tipoEnvio = item.tipo_envio || "normal";
      const tipoBadge =
        tipoEnvio === "teste"
          ? '<span class="badge" style="background: #fef3c7; color: #92400e;">🧪 Teste</span>'
          : tipoEnvio === "debug"
          ? '<span class="badge" style="background: #dbeafe; color: #1e40af;">🔍 Debug</span>'
          : '<span class="badge" style="background: #f3f4f6; color: #374151;">📱 Normal</span>';

      const campanhaNome = item.instacar_campanhas?.nome || "-";
      const campanhaId = item.campanha_id;
      const campanhaLink = campanhaId
        ? `<a href="#" onclick="event.preventDefault(); verDetalhesCampanha('${campanhaId}'); return false;" style="color: #3b82f6; text-decoration: underline; cursor: pointer;" title="Ver detalhes da campanha">${campanhaNome}</a>`
        : campanhaNome;

      const mensagem = item.mensagem_enviada || "-";
      const mensagemPreview =
        mensagem.length > 50 ? mensagem.substring(0, 50) + "..." : mensagem;
      const dataHora = formatarData(item.timestamp_envio || item.created_at);

      html += `
        <tr>
          <td>${dataHora}</td>
          <td>${statusBadge}</td>
          <td>${tipoBadge}</td>
          <td>${campanhaLink}</td>
          <td title="${mensagem.replace(
            /"/g,
            "&quot;"
          )}">${mensagemPreview}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  /**
   * Função principal para ver detalhes do cliente
   * @param {string} clienteId - ID do cliente
   */
  async function verDetalhesCliente(clienteId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return false;
    }

    // Aguardar elementos do modal estarem disponíveis (pode levar um tempo se o DOM ainda estiver carregando)
    let tentativas = 0;
    const maxTentativas = 20; // 2 segundos
    
    const aguardarElementos = async () => {
      const modal = document.getElementById("modalCliente");
      const loading = document.getElementById("modalClienteLoading");
      const content = document.getElementById("modalClienteContent");
      const title = document.getElementById("modalClienteTitle");
      
      if (modal && loading && content && title) {
        return { modal, loading, content, title };
      }
      
      if (tentativas < maxTentativas) {
        tentativas++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return aguardarElementos();
      }
      
      // Se chegou aqui, os elementos não foram encontrados
      const elementosFaltando = [];
      if (!modal) elementosFaltando.push("modalCliente");
      if (!loading) elementosFaltando.push("modalClienteLoading");
      if (!content) elementosFaltando.push("modalClienteContent");
      if (!title) elementosFaltando.push("modalClienteTitle");
      
      console.error("Elementos do modal não encontrados após aguardar:", elementosFaltando);
      console.error("DOM atual:", {
        modalExists: !!modal,
        loadingExists: !!loading,
        contentExists: !!content,
        titleExists: !!title,
        documentReady: document.readyState,
        bodyChildren: document.body ? document.body.children.length : 0
      });
      
      mostrarAlerta(`Erro: Modal não encontrado. Elementos faltando: ${elementosFaltando.join(", ")}. Verifique se a página está totalmente carregada.`, "error");
      return null;
    };
    
    const elementos = await aguardarElementos();
    if (!elementos) {
      return false;
    }
    
    const { modal, loading, content, title } = elementos;

    // Abrir modal e mostrar loading
    modal.classList.add("active");
    loading.style.display = "block";
    content.style.display = "none";
    title.textContent = "Detalhes do Cliente";

    try {
      const dados = await carregarDadosClienteCompleto(clienteId);
      if (dados) {
        renderizarModalCliente(dados);
        // Retornar true para indicar sucesso
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao carregar detalhes do cliente:", error);
      mostrarAlerta(`Erro ao carregar detalhes: ${error.message}`, "error");
      loading.innerHTML = `<p style="color: red;">Erro ao carregar: ${error.message}</p>`;
      return false;
    }
  }

  /**
   * Troca de tab no modal
   * @param {string} tabName - Nome da tab ('dados', 'observacoes', 'historico')
   */
  function trocarTabCliente(tabName) {
    // Ocultar todas as tabs
    document.querySelectorAll(".modal-tab-content").forEach((tab) => {
      tab.classList.remove("active");
      tab.style.display = "none";
    });
    document.querySelectorAll(".modal-tab").forEach((tab) => {
      tab.classList.remove("active");
      // Remover estilo inline de active
      tab.style.color = "";
      tab.style.borderBottomColor = "";
      tab.style.background = "";
    });

    // Mostrar tab selecionada
    const tabContent = document.getElementById(
      `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`
    );
    const tabButton = Array.from(document.querySelectorAll(".modal-tab")).find(
      (btn) =>
        btn.textContent.includes(
          tabName === "dados"
            ? "Dados"
            : tabName === "observacoes"
            ? "Observações"
            : "Histórico"
        )
    );

    if (tabContent) {
      tabContent.classList.add("active");
      tabContent.style.display = "block";
    }
    if (tabButton) {
      tabButton.classList.add("active");
      tabButton.style.color = "hsl(var(--primary))";
      tabButton.style.borderBottomColor = "hsl(var(--primary))";
      tabButton.style.background = "hsl(var(--muted) / 0.3)";
    }
    
    // Se for a aba Histórico, garantir que o histórico está renderizado
    if (tabName === "historico") {
      // Aguardar um pouco para garantir que o DOM está pronto
      setTimeout(() => {
        // Se já temos histórico carregado, renderizar
        if (window.historicoCompleto && window.historicoCompleto.length > 0) {
          // Limpar filtros para mostrar tudo
          const filtroCampanha = document.getElementById("filtroCampanhaHistorico");
          const filtroStatus = document.getElementById("filtroStatusHistorico");
          const filtroDataInicio = document.getElementById("filtroDataInicioHistorico");
          const filtroDataFim = document.getElementById("filtroDataFimHistorico");
          const filtroBusca = document.getElementById("filtroBuscaTextoHistorico");
          
          if (filtroCampanha) filtroCampanha.value = "";
          if (filtroStatus) filtroStatus.value = "";
          if (filtroDataInicio) filtroDataInicio.value = "";
          if (filtroDataFim) filtroDataFim.value = "";
          if (filtroBusca) filtroBusca.value = "";
          
          // Resetar paginação
          window.paginaAtualHistorico = 1;
          
          // Renderizar primeira página do histórico completo (sem filtros)
          const inicio = (window.paginaAtualHistorico - 1) * window.registrosPorPagina;
          const fim = inicio + window.registrosPorPagina;
          const historicoPagina = window.historicoCompleto.slice(inicio, fim);
          
          renderizarHistoricoEnvios(historicoPagina);
          atualizarEstatisticasHistorico(window.historicoCompleto);
          
          // Atualizar paginação
          const totalPaginas = Math.ceil(window.historicoCompleto.length / window.registrosPorPagina);
          atualizarPaginacaoHistorico(totalPaginas, window.paginaAtualHistorico);
        } else {
          // Se não tem histórico carregado, tentar buscar novamente
          const clienteId = document.getElementById("clienteId")?.value;
          if (clienteId) {
            // Recarregar dados do cliente para obter histórico
            verDetalhesCliente(clienteId).catch(console.error);
          } else {
            // Se não tem clienteId, mostrar mensagem
            const tbody = document.getElementById("historicoEnviosBody");
            if (tbody) {
              tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">Nenhum histórico de envio encontrado.</td></tr>';
            }
          }
        }
      }, 100);
    }
  }

  /**
   * Alterna entre modo visualização e edição
   */
  function alternarModoEdicao() {
    const modalContent = document.getElementById("modalClienteContent");
    if (!modalContent) {
      console.error("Modal de cliente não encontrado. Elemento modalClienteContent não existe.");
      mostrarAlerta("Erro: Modal não encontrado. Tente novamente.", "error");
      return;
    }
    
    const isEdicao = modalContent.classList.contains("modo-edicao");

    if (isEdicao) {
      // Voltar para visualização
      modalContent.classList.remove("modo-edicao");
      modalContent.classList.add("modo-visualizacao");
      
      const btnEditar = document.getElementById("btnEditarCliente");
      const btnSalvar = document.getElementById("btnSalvarCliente");
      const btnCancelar = document.getElementById("btnCancelarEdicao");
      
      if (btnEditar) btnEditar.style.display = "flex";
      if (btnSalvar) btnSalvar.style.display = "none";
      if (btnCancelar) btnCancelar.style.display = "none";
      
      // O CSS já cuida da exibição/ocultação baseado nas classes do modalContent
      // Apenas garantimos que os estilos inline não sobrescrevam
      document.querySelectorAll('#modalClienteContent .modo-visualizacao').forEach(el => {
        if (el.id && (el.id.includes('Value') || el.id.includes('StatusWhatsapp'))) {
          el.style.display = '';
        }
      });
      document.querySelectorAll('#modalClienteContent .modo-edicao').forEach(el => {
        if (el.classList.contains('form-input') || el.classList.contains('form-checkbox')) {
          el.style.display = '';
        }
        if (el.classList.contains('form-label') && el.closest('.form-group')?.querySelector('#fieldBloqueadoEnviosInput')) {
          el.style.display = '';
        }
      });
      
      // Remover validação em tempo real
      const telefoneInput = document.getElementById("fieldTelefoneInput");
      if (telefoneInput && typeof validarTelefoneTempoReal === 'function') {
        telefoneInput.removeEventListener("input", validarTelefoneTempoReal);
        telefoneInput.removeEventListener("blur", validarTelefoneTempoReal);
      }
      
      // Ocultar mensagem de validação
      const validacaoTelefone = document.getElementById("fieldTelefoneValidacao");
      if (validacaoTelefone) {
        validacaoTelefone.style.display = "none";
      }
    } else {
      // Entrar em modo edição
      modalContent.classList.remove("modo-visualizacao");
      modalContent.classList.add("modo-edicao");
      
      const btnEditar = document.getElementById("btnEditarCliente");
      const btnSalvar = document.getElementById("btnSalvarCliente");
      const btnCancelar = document.getElementById("btnCancelarEdicao");
      
      if (btnEditar) btnEditar.style.display = "none";
      if (btnSalvar) btnSalvar.style.display = "flex";
      if (btnCancelar) btnCancelar.style.display = "flex";
      
      // O CSS já cuida da exibição/ocultação baseado nas classes do modalContent
      // Apenas garantimos que os estilos inline não sobrescrevam
      document.querySelectorAll('#modalClienteContent .modo-visualizacao').forEach(el => {
        if (el.id && (el.id.includes('Value') || el.id.includes('StatusWhatsapp'))) {
          el.style.display = '';
        }
      });
      document.querySelectorAll('#modalClienteContent .modo-edicao').forEach(el => {
        if (el.classList.contains('form-input') || el.classList.contains('form-checkbox')) {
          el.style.display = '';
        }
        if (el.classList.contains('form-label') && el.closest('.form-group')?.querySelector('#fieldBloqueadoEnviosInput')) {
          el.style.display = '';
        }
      });
      
      // Configurar validação em tempo real do telefone
      const telefoneInput = document.getElementById("fieldTelefoneInput");
      if (telefoneInput && typeof validarTelefoneTempoReal === 'function') {
        // Remover listeners anteriores para evitar duplicação
        telefoneInput.removeEventListener("input", validarTelefoneTempoReal);
        telefoneInput.removeEventListener("blur", validarTelefoneTempoReal);
        // Adicionar novos listeners
        telefoneInput.addEventListener("input", validarTelefoneTempoReal);
        telefoneInput.addEventListener("blur", validarTelefoneTempoReal);
        // Validar imediatamente se já houver valor
        validarTelefoneTempoReal();
      }
    }
  }

  /**
   * Cancela edição e volta para visualização
   */
  function cancelarEdicao() {
    // Recarregar dados do cliente para restaurar valores originais
    const clienteId = document.getElementById("clienteId").value;
    if (clienteId) {
      verDetalhesCliente(clienteId);
    } else {
      alternarModoEdicao();
    }
  }

  /**
   * Salva edições do cliente
   */
  async function salvarEdicaoCliente() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const clienteId = document.getElementById("clienteId").value;
    if (!clienteId) {
      mostrarAlerta("ID do cliente não encontrado", "error");
      return;
    }

    // Coletar dados do formulário
    const nome = document.getElementById("fieldNomeInput").value.trim();
    const telefone = document.getElementById("fieldTelefoneInput").value.trim();
    const email = document.getElementById("fieldEmailInput").value.trim();

    // Validações
    if (!nome) {
      mostrarAlerta("Nome do cliente é obrigatório", "error");
      return;
    }

    if (!telefone) {
      mostrarAlerta("Telefone é obrigatório", "error");
      return;
    }

    // Normalizar telefone
    const telefoneNormalizado = normalizarTelefone(telefone);
    // Validar: fixo (12 dígitos) ou celular (13 dígitos)
    if (telefoneNormalizado.length < 12 || telefoneNormalizado.length > 13) {
      mostrarAlerta(
        "Telefone inválido. Deve conter DDD + número (fixo: 8 dígitos, celular: 9 dígitos). Ex: 11999999999 (celular) ou 1112345678 (fixo)",
        "error"
      );
      return;
    }

    // Validar email se preenchido
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarAlerta("Email inválido", "error");
      return;
    }

    try {
      // Verificar se telefone já existe em outro cliente
      const { data: clienteExistente, error: errorConsulta } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("id")
        .eq("telefone", telefoneNormalizado)
        .neq("id", clienteId)
        .maybeSingle();

      if (errorConsulta) {
        console.error("Erro ao verificar telefone existente:", errorConsulta);
        // Continuar mesmo com erro na verificação
      }

      if (clienteExistente) {
        mostrarAlerta(
          "Este telefone já está cadastrado para outro cliente",
          "error"
        );
        return;
      }

      // Atualizar no Supabase
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          nome_cliente: nome,
          telefone: telefoneNormalizado,
          email: email || null,
          bloqueado_envios: bloqueadoEnvios,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao atualizar cliente: ${error.message}`);
      }

      mostrarAlerta("Cliente atualizado com sucesso!", "success");

      // Recarregar dados e voltar para visualização
      const dados = await carregarDadosClienteCompleto(clienteId);
      if (dados) {
        renderizarModalCliente(dados);
      }

      // Recarregar lista de clientes
      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      mostrarAlerta(`Erro ao salvar: ${error.message}`, "error");
    }
  }

  /**
   * Adiciona observação ao cliente
   */
  async function adicionarObservacaoCliente() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const clienteId = document.getElementById("clienteId").value;
    const textoObservacao = document
      .getElementById("novaObservacaoTexto")
      .value.trim();

    if (!clienteId) {
      mostrarAlerta("ID do cliente não encontrado", "error");
      return;
    }

    if (!textoObservacao) {
      mostrarAlerta("Digite uma observação", "error");
      return;
    }

    try {
      // Buscar observações atuais
      const { data: cliente, error: errorBuscar } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("observacoes_internas")
        .eq("id", clienteId)
        .single();

      if (errorBuscar) {
        throw new Error(`Erro ao buscar cliente: ${errorBuscar.message}`);
      }

      // Criar nova observação
      const novaObservacao = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        texto: textoObservacao,
        autor: "Sistema", // Pode ser expandido para pegar usuário logado
        timestamp: new Date().toISOString(),
      };

      // Adicionar ao array
      const observacoesAtuais = cliente.observacoes_internas || [];
      const novasObservacoes = [...observacoesAtuais, novaObservacao];

      // Atualizar no Supabase
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          observacoes_internas: novasObservacoes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao adicionar observação: ${error.message}`);
      }

      // Limpar campo e recarregar observações
      document.getElementById("novaObservacaoTexto").value = "";
      renderizarObservacoes(novasObservacoes);
      mostrarAlerta("Observação adicionada com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
      mostrarAlerta(`Erro ao adicionar observação: ${error.message}`, "error");
    }
  }

  /**
   * Adiciona veículo ao cliente
   */
  async function adicionarVeiculoCliente() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const clienteId = document.getElementById("clienteId").value;
    const marca = document.getElementById("veiculoMarca").value.trim();
    const modelo = document.getElementById("veiculoModelo").value.trim();
    const ano = document.getElementById("veiculoAno").value.trim();
    const placa = document.getElementById("veiculoPlaca").value.trim();

    if (!clienteId) {
      mostrarAlerta("ID do cliente não encontrado", "error");
      return;
    }

    if (!marca || !modelo) {
      mostrarAlerta("Marca e modelo são obrigatórios", "error");
      return;
    }

    try {
      // Buscar veículos atuais
      const { data: cliente, error: errorBuscar } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("veiculos")
        .eq("id", clienteId)
        .single();

      if (errorBuscar) {
        throw new Error(`Erro ao buscar cliente: ${errorBuscar.message}`);
      }

      // Criar novo veículo
      const novoVeiculo = {
        marca,
        modelo,
        ano: ano || null,
        placa: placa || null,
      };

      // Adicionar ao array
      const veiculosAtuais = cliente.veiculos || [];
      const novosVeiculos = [...veiculosAtuais, novoVeiculo];

      // Atualizar no Supabase
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          veiculos: novosVeiculos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao adicionar veículo: ${error.message}`);
      }

      // Limpar formulário e recarregar veículos
      document.getElementById("veiculoMarca").value = "";
      document.getElementById("veiculoModelo").value = "";
      document.getElementById("veiculoAno").value = "";
      document.getElementById("veiculoPlaca").value = "";
      document.getElementById("veiculoForm").style.display = "none";
      document.getElementById("btnMostrarFormVeiculo").style.display = "block";

      renderizarVeiculos(novosVeiculos);
      mostrarAlerta("Veículo adicionado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao adicionar veículo:", error);
      mostrarAlerta(`Erro ao adicionar veículo: ${error.message}`, "error");
    }
  }

  /**
   * Remove veículo do cliente
   * @param {string} clienteId - ID do cliente
   * @param {number} indice - Índice do veículo no array
   */
  async function removerVeiculoCliente(clienteId, indice) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    if (!confirm("Tem certeza que deseja remover este veículo?")) {
      return;
    }

    try {
      // Buscar veículos atuais
      const { data: cliente, error: errorBuscar } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("veiculos")
        .eq("id", clienteId)
        .single();

      if (errorBuscar) {
        throw new Error(`Erro ao buscar cliente: ${errorBuscar.message}`);
      }

      // Remover veículo do array
      const veiculosAtuais = cliente.veiculos || [];
      const novosVeiculos = veiculosAtuais.filter((_, i) => i !== indice);

      // Atualizar no Supabase
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          veiculos: novosVeiculos,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao remover veículo: ${error.message}`);
      }

      renderizarVeiculos(novosVeiculos);
      mostrarAlerta("Veículo removido com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao remover veículo:", error);
      mostrarAlerta(`Erro ao remover veículo: ${error.message}`, "error");
    }
  }

  /**
   * Mostra formulário para adicionar veículo
   */
  function mostrarFormVeiculo() {
    document.getElementById("veiculoForm").style.display = "block";
    document.getElementById("btnMostrarFormVeiculo").style.display = "none";
  }

  /**
   * Cancela adição de veículo
   */
  function cancelarAdicionarVeiculo() {
    document.getElementById("veiculoForm").style.display = "none";
    document.getElementById("btnMostrarFormVeiculo").style.display = "block";
    document.getElementById("veiculoMarca").value = "";
    document.getElementById("veiculoModelo").value = "";
    document.getElementById("veiculoAno").value = "";
    document.getElementById("veiculoPlaca").value = "";
  }

  /**
   * Desativa cliente (soft delete)
   * @param {string} clienteId - ID do cliente
   */
  /**
   * Alterna bloqueio de envios para um cliente
   * @param {string} clienteId - ID do cliente
   * @param {boolean} bloquear - true para bloquear, false para desbloquear
   */
  async function alternarBloqueioCliente(clienteId, bloquear) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    if (
      !confirm(
        bloquear
          ? "Tem certeza que deseja bloquear este cliente? Ele não receberá mais mensagens de campanhas."
          : "Tem certeza que deseja desbloquear este cliente? Ele voltará a receber mensagens de campanhas."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          bloqueado_envios: bloquear,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(
          `Erro ao ${bloquear ? "bloquear" : "desbloquear"} cliente: ${
            error.message
          }`
        );
      }

      mostrarAlerta(
        `Cliente ${bloquear ? "bloqueado" : "desbloqueado"} com sucesso!`,
        "success"
      );

      // Recarregar lista de clientes
      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error("Erro ao alternar bloqueio:", error);
      mostrarAlerta(`Erro: ${error.message}`, "error");
    }
  }

  async function desativarCliente(clienteId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    if (
      !confirm(
        "Tem certeza que deseja desativar este cliente? Ele não aparecerá mais nas listagens."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao desativar cliente: ${error.message}`);
      }

      mostrarAlerta("Cliente desativado com sucesso!", "success");
      fecharModalCliente();
      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error("Erro ao desativar cliente:", error);
      mostrarAlerta(`Erro ao desativar: ${error.message}`, "error");
    }
  }

  /**
   * Reativa cliente
   * @param {string} clienteId - ID do cliente
   */
  async function reativarCliente(clienteId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao reativar cliente: ${error.message}`);
      }

      mostrarAlerta("Cliente reativado com sucesso!", "success");

      // Recarregar dados
      const dados = await carregarDadosClienteCompleto(clienteId);
      if (dados) {
        renderizarModalCliente(dados);
      }

      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error("Erro ao reativar cliente:", error);
      mostrarAlerta(`Erro ao reativar: ${error.message}`, "error");
    }
  }

  /**
   * Exclui cliente (hard delete)
   * @param {string} clienteId - ID do cliente
   */
  async function excluirCliente(clienteId) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Dupla confirmação
    const confirmacao1 = confirm(
      "ATENÇÃO: Esta ação é irreversível!\n\nTem certeza que deseja EXCLUIR permanentemente este cliente?"
    );
    if (!confirmacao1) return;

    const confirmacao2 = confirm(
      "Última confirmação: Todos os dados do cliente serão PERMANENTEMENTE apagados, incluindo histórico de envios.\n\nDeseja realmente continuar?"
    );
    if (!confirmacao2) return;

    try {
      // Verificar se tem histórico
      const { data: historico } = await supabaseClient
        .from("instacar_historico_envios")
        .select("id")
        .eq("cliente_id", clienteId)
        .limit(1);

      if (historico && historico.length > 0) {
        const confirmacao3 = confirm(
          "Este cliente possui histórico de envios que também será excluído.\n\nContinuar mesmo assim?"
        );
        if (!confirmacao3) return;
      }

      // Excluir do Supabase (CASCADE vai excluir histórico automaticamente)
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .delete()
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao excluir cliente: ${error.message}`);
      }

      mostrarAlerta("Cliente excluído permanentemente!", "success");
      fecharModalCliente();
      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      mostrarAlerta(`Erro ao excluir: ${error.message}`, "error");
    }
  }

  /**
   * Adiciona novo cliente
   */
  async function adicionarNovoCliente() {
    const modal = document.getElementById("modalCliente");
    const loading = document.getElementById("modalClienteLoading");
    const content = document.getElementById("modalClienteContent");
    const title = document.getElementById("modalClienteTitle");

    if (!modal || !loading || !content || !title) {
      mostrarAlerta("Erro: Modal não encontrado", "error");
      return;
    }

    // Abrir modal em modo criação
    modal.classList.add("active");
    loading.style.display = "none";
    content.style.display = "block";
    title.textContent = "Novo Cliente";

    // Limpar campos
    document.getElementById("clienteId").value = "";
    document.getElementById("fieldNomeValue").textContent = "";
    document.getElementById("fieldNomeInput").value = "";
    document.getElementById("fieldTelefoneValue").textContent = "";
    document.getElementById("fieldTelefoneInput").value = "";
    document.getElementById("fieldEmailValue").textContent = "";
    document.getElementById("fieldEmailInput").value = "";
    
    // Limpar validação de telefone
    const validacaoTelefone = document.getElementById("fieldTelefoneValidacao");
    if (validacaoTelefone) {
      validacaoTelefone.style.display = "none";
      validacaoTelefone.className = "validation-message";
      validacaoTelefone.textContent = "";
    }
    
    // Configurar validação em tempo real do telefone
    const telefoneInput = document.getElementById("fieldTelefoneInput");
    if (telefoneInput) {
      // Remover listeners anteriores para evitar duplicação
      telefoneInput.removeEventListener("input", validarTelefoneTempoReal);
      telefoneInput.removeEventListener("blur", validarTelefoneTempoReal);
      // Adicionar novos listeners
      telefoneInput.addEventListener("input", validarTelefoneTempoReal);
      telefoneInput.addEventListener("blur", validarTelefoneTempoReal);
    }
    document.getElementById("fieldStatusWhatsappValue").innerHTML =
      '<span class="badge badge-unknown">⚪ Não verificado</span>';
    document.getElementById("statTotalEnvios").textContent = "0";
    document.getElementById("statPrimeiroEnvio").textContent = "-";
    document.getElementById("statUltimoEnvio").textContent = "-";
    document.getElementById("fieldCreatedAt").textContent = "-";
    document.getElementById("fieldUpdatedAt").textContent = "-";

    // Limpar listas
    document.getElementById("veiculosList").innerHTML =
      '<p style="color: #666; text-align: center; padding: 20px;">Nenhum veículo cadastrado.</p>';
    document.getElementById("observacoesList").innerHTML =
      '<p style="text-align: center; color: #666; padding: 20px;">Nenhuma observação registrada.</p>';
    document.getElementById("historicoEnviosBody").innerHTML =
      '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Nenhum histórico de envio encontrado.</td></tr>';

    // Ocultar botões de ação destrutivos
    document.getElementById("btnDesativarCliente").style.display = "none";
    document.getElementById("btnExcluirCliente").style.display = "none";

    // Entrar em modo edição imediatamente
    const modalContent = document.getElementById("modalClienteContent");
    modalContent.classList.remove("modo-visualizacao");
    modalContent.classList.add("modo-edicao");
    document.getElementById("btnEditarCliente").style.display = "none";
    document.getElementById("btnSalvarCliente").style.display = "block";
    document.getElementById("btnSalvarCliente").textContent =
      "💾 Criar Cliente";
    document.getElementById("btnSalvarCliente").onclick = criarNovoCliente;
    document.getElementById("btnCancelarEdicao").style.display = "block";

    // Ir para tab de dados
    trocarTabCliente("dados");
  }

  /**
   * Cria novo cliente
   */
  async function criarNovoCliente() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Coletar dados do formulário
    const nome = document.getElementById("fieldNomeInput").value.trim();
    const telefone = document.getElementById("fieldTelefoneInput").value.trim();
    const email = document.getElementById("fieldEmailInput").value.trim();

    // Validações
    if (!nome) {
      mostrarAlerta("Nome do cliente é obrigatório", "error");
      return;
    }

    if (!telefone) {
      mostrarAlerta("Telefone é obrigatório", "error");
      return;
    }

    // Normalizar telefone
    const telefoneNormalizado = normalizarTelefone(telefone);
    // Validar: fixo (12 dígitos) ou celular (13 dígitos)
    if (telefoneNormalizado.length < 12 || telefoneNormalizado.length > 13) {
      mostrarAlerta(
        "Telefone inválido. Deve conter DDD + número (fixo: 8 dígitos, celular: 9 dígitos). Ex: 11999999999 (celular) ou 1112345678 (fixo)",
        "error"
      );
      return;
    }

    // Validar email se preenchido
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarAlerta("Email inválido", "error");
      return;
    }

    try {
      // Verificar se telefone já existe
      const { data: clienteExistente, error: errorConsulta } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("id")
        .eq("telefone", telefoneNormalizado)
        .maybeSingle();

      if (errorConsulta) {
        console.error("Erro ao verificar telefone existente:", errorConsulta);
        // Continuar mesmo com erro na verificação
      }

      if (clienteExistente) {
        mostrarAlerta(
          "Este telefone já está cadastrado. Use a opção 'Ver' para editar o cliente existente.",
          "error"
        );
        return;
      }

      // Criar novo cliente
      const { data: novoCliente, error } = await supabaseClient
        .from("instacar_clientes_envios")
        .insert({
          nome_cliente: nome,
          telefone: telefoneNormalizado,
          email: email || null,
          veiculos: [],
          observacoes_internas: [],
          ativo: true,
          total_envios: 0,
          status_whatsapp: "unknown",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar cliente: ${error.message}`);
      }

      mostrarAlerta("Cliente criado com sucesso!", "success");

      // Recarregar lista
      carregarListaClientes(paginaAtualClientes || 1);

      // Fechar modal e abrir novamente em modo visualização
      fecharModalCliente();
      setTimeout(() => {
        verDetalhesCliente(novoCliente.id);
      }, 300);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      mostrarAlerta(`Erro ao criar: ${error.message}`, "error");
    }
  }

  /**
   * Fecha modal do cliente
   */
  function fecharModalCliente() {
    const modal = document.getElementById("modalCliente");
    if (modal) {
      modal.classList.remove("active");
    }

    // Limpar formulários
    document.getElementById("novaObservacaoTexto").value = "";
    document.getElementById("veiculoForm").style.display = "none";
    document.getElementById("btnMostrarFormVeiculo").style.display = "block";

    // Resetar estado
    const modalContent = document.getElementById("modalClienteContent");
    if (modalContent) {
      modalContent.classList.remove("modo-edicao");
      modalContent.classList.add("modo-visualizacao");
    }
  }

  /**
   * Verifica WhatsApp do cliente a partir do modal
   */
  async function verificarWhatsAppDoModal() {
    const clienteId = document.getElementById("clienteId").value;
    const telefone =
      document.getElementById("fieldTelefoneInput").value ||
      document.getElementById("fieldTelefoneValue").textContent;

    if (!clienteId || !telefone) {
      mostrarAlerta("Dados do cliente não encontrados", "error");
      return;
    }

    // Extrair apenas números do telefone
    const telefoneNumeros = telefone.replace(/\D/g, "");
    const telefoneNormalizado = telefoneNumeros.startsWith("55")
      ? telefoneNumeros
      : "55" + telefoneNumeros;

    await verificarWhatsAppIndividual(clienteId, telefoneNormalizado);

    // Recarregar dados do cliente após verificação
    setTimeout(async () => {
      try {
        const dados = await carregarDadosClienteCompleto(clienteId);
        if (dados) {
          renderizarModalCliente(dados);
        }
      } catch (error) {
        console.error("Erro ao recarregar dados:", error);
      }
    }, 2000);
  }

  /**
   * Filtra histórico de envios
   */
  function filtrarHistorico() {
    // Esta função pode ser expandida para filtrar o histórico já carregado
    // Por enquanto, apenas recarrega os dados
    const clienteId = document.getElementById("clienteId").value;
    if (clienteId) {
      verDetalhesCliente(clienteId);
    }
  }

  // ============================================
  // SISTEMA DE TOOLTIPS E AJUDA
  // ============================================

  /**
   * Configuração de tooltips para todos os campos
   */
  const tooltipsConfig = {
    // Formulário de Campanha
    nome: {
      titulo: "Nome da Campanha",
      resumo: "Nome identificador da campanha",
      detalhes: `
        <p>Escolha um nome descritivo e único para identificar esta campanha.</p>
        <h5>Exemplos:</h5>
        <ul>
          <li><strong>Natal 2025</strong> - Campanha de fim de ano</li>
          <li><strong>Black Friday 2025</strong> - Promoção especial</li>
          <li><strong>Dia das Mães</strong> - Campanha sazonal</li>
        </ul>
        <p><strong>Dica:</strong> Use nomes que facilitem a identificação rápida da campanha na lista.</p>
      `,
    },
    descricao: {
      titulo: "Descrição",
      resumo: "Campo opcional para notas internas",
      detalhes: `
        <p>Use este campo para adicionar informações internas sobre a campanha.</p>
        <p>Esta descrição não será enviada aos clientes, apenas para referência interna da equipe.</p>
      `,
    },
    periodo_ano: {
      titulo: "Período do Ano",
      resumo: "Selecione a época/ocasião da campanha",
      detalhes: `
        <p>Selecione o período ou ocasião relacionada à campanha.</p>
        <h5>Quando usar cada opção:</h5>
        <ul>
          <li><strong>Meses do ano:</strong> Para campanhas mensais regulares</li>
          <li><strong>Black Friday:</strong> Promoções de novembro</li>
          <li><strong>Dia das Mães/Pais:</strong> Campanhas sazonais específicas</li>
          <li><strong>Natal/Ano Novo:</strong> Campanhas de fim de ano</li>
        </ul>
      `,
    },
    status: {
      titulo: "Status da Campanha",
      resumo: "Estado atual da campanha",
      detalhes: `
        <h5>Status disponíveis:</h5>
        <ul>
          <li><strong>Ativa:</strong> Campanha está sendo processada e enviando mensagens</li>
          <li><strong>Pausada:</strong> Campanha temporariamente pausada (pode ser reativada)</li>
          <li><strong>Concluída:</strong> Campanha finalizada (não processa mais envios)</li>
          <li><strong>Cancelada:</strong> Campanha cancelada (não será processada)</li>
        </ul>
      `,
    },
    data_inicio: {
      titulo: "Data de Início",
      resumo: "Data em que a campanha começa a ser processada",
      detalhes: `
        <p>Define a data a partir da qual a campanha pode começar a enviar mensagens.</p>
        <p><strong>Importante:</strong> A campanha só será processada após esta data, mesmo que esteja com status "Ativa".</p>
      `,
    },
    data_fim: {
      titulo: "Data de Fim",
      resumo: "Data em que a campanha para de ser processada",
      detalhes: `
        <p>Define a data limite para processamento da campanha.</p>
        <p>Após esta data, a campanha não será mais processada, mesmo que esteja "Ativa".</p>
        <p><strong>Dica:</strong> Deixe vazio se a campanha não tiver data de término definida.</p>
      `,
    },
    limite_envios_dia: {
      titulo: "Limite de Envios por Dia",
      resumo: "Máximo de mensagens enviadas por dia",
      detalhes: `
        <p>Define o número máximo de mensagens que podem ser enviadas por dia nesta campanha.</p>
        <h5>Recomendações:</h5>
        <ul>
          <li><strong>Período de Warm-up (primeiros 7 dias):</strong> 50 mensagens/dia</li>
          <li><strong>Produção:</strong> 200 mensagens/dia (padrão)</li>
        </ul>
        <p><strong>Importante:</strong> Este limite é compartilhado entre todas as campanhas ativas. O sistema respeita o limite global de 200/dia.</p>
      `,
    },
    intervalo_minimo_dias: {
      titulo: "Intervalo Mínimo (dias)",
      resumo: "Tempo mínimo entre envios para o mesmo cliente",
      detalhes: `
        <p>Define quantos dias devem passar antes de enviar outra mensagem para o mesmo cliente nesta campanha.</p>
        <p><strong>Exemplo:</strong> Se configurado como 30 dias, um cliente só receberá uma nova mensagem desta campanha após 30 dias da última.</p>
        <p><strong>Padrão:</strong> 30 dias (recomendado para evitar spam)</p>
      `,
    },
    intervalo_envios_segundos: {
      titulo: "Intervalo Entre Envios (segundos)",
      resumo: "Tempo de espera entre cada mensagem enviada",
      detalhes: `
        <p>Define o intervalo de tempo entre o envio de cada mensagem.</p>
        <h5>Configurações:</h5>
        <ul>
          <li><strong>Vazio (padrão):</strong> Intervalo aleatório entre 130-150 segundos</li>
          <li><strong>Valor fixo:</strong> Use um valor entre 1-300 segundos para controle preciso</li>
        </ul>
        <p><strong>Recomendação:</strong> Deixe vazio para usar o padrão aleatorizado, que ajuda a evitar bloqueios do WhatsApp.</p>
      `,
    },
    prioridade: {
      titulo: "Prioridade",
      resumo:
        "Ordem de processamento quando cliente é elegível para múltiplas campanhas",
      detalhes: `
        <p>Define a prioridade desta campanha quando um cliente é elegível para receber mensagens de múltiplas campanhas.</p>
        <p><strong>Escala:</strong> 1 (maior prioridade) a 10 (menor prioridade)</p>
        <p><strong>Exemplo:</strong> Se um cliente pode receber mensagens de 3 campanhas diferentes, a campanha com prioridade 1 será processada primeiro.</p>
        <p><strong>Padrão:</strong> 5</p>
      `,
    },
    whatsapp_api_id: {
      titulo: "Instância API WhatsApp",
      resumo: "Selecione qual instância de API WhatsApp usar",
      detalhes: `
        <p>Escolha qual instância de API WhatsApp (Uazapi, Z-API, Evolution, etc.) será usada para enviar as mensagens desta campanha.</p>
        <p><strong>Como configurar:</strong> Vá em "⚙️ Gerenciar Configurações" para adicionar novas instâncias.</p>
        <p><strong>Importante:</strong> A instância selecionada deve estar ativa e configurada corretamente.</p>
      `,
    },
    prompt_ia: {
      titulo: "Prompt Personalizado para IA",
      resumo: "Instruções específicas para a IA gerar mensagens",
      detalhes: `
        <p>Este campo contém as instruções que serão enviadas para a IA (GPT-4) gerar as mensagens personalizadas.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 15px 0; border-radius: 4px;">
          <strong>💡 Modo "Apenas Prompt Personalizado":</strong>
          <p style="margin: 8px 0 0 0;">Se você <strong>desmarcar todas</strong> as configurações de IA (Usar Veículos, Usar Configurações Globais, Sessões de Contexto) e preencher este prompt, o sistema enviará <strong>apenas o prompt</strong> com o mínimo de contexto (nome do cliente). Isso economiza tokens e dá controle total sobre o que a IA recebe.</p>
        </div>
        
        <h5>Dicas para escrever bons prompts:</h5>
        <ul>
          <li>Seja específico sobre o tom e estilo da mensagem</li>
          <li>Mencione informações que devem ser incluídas (nome do cliente, veículo, etc.)</li>
          <li>Defina o objetivo da campanha claramente</li>
          <li>Inclua exemplos de mensagens desejadas, se possível</li>
        </ul>
        
        <h5>Variáveis disponíveis:</h5>
        <ul>
          <li><code>{{nome_cliente}}</code> - Nome do cliente</li>
          <li><code>{{telefone}}</code> - Telefone do cliente</li>
          <li><code>{{data_hoje}}</code> - Data atual formatada</li>
          <li><code>{{periodo_ano}}</code> - Período/ano da campanha</li>
          <li><code>{{veiculos.length}}</code> - Quantidade de veículos</li>
        </ul>
        
        <h5>Exemplo:</h5>
        <pre><code>Gere uma mensagem calorosa de Natal para o cliente {{nome_cliente}}. 
Mencione que temos oportunidades especiais de fim de ano. 
Use tom amigável e profissional. 
Máximo de 3 parágrafos.</code></pre>
      `,
    },
    template_mensagem: {
      titulo: "Template de Mensagem",
      resumo: "Template base opcional para a mensagem",
      detalhes: `
        <p>Template opcional que serve como base para a mensagem gerada pela IA.</p>
        <p><strong>Quando usar:</strong></p>
        <ul>
          <li>Quando você quer garantir que certas informações sempre apareçam</li>
          <li>Para manter consistência no formato das mensagens</li>
          <li>Para incluir informações fixas (contato, endereço, etc.)</li>
        </ul>
        <p><strong>Dica:</strong> Use variáveis como [NOME], [VEICULO] que serão substituídas pela IA.</p>
      `,
    },
    usar_veiculos: {
      titulo: "Incluir Informações de Veículos",
      resumo: "Se a IA deve ter acesso aos dados de veículos do cliente",
      detalhes: `
        <p>Quando marcado, a IA terá acesso aos dados de veículos do cliente para personalizar a mensagem.</p>
        <h5>Quando marcar:</h5>
        <ul>
          <li>Campanhas relacionadas a veículos específicos</li>
          <li>Ofertas de seguro, revisão, etc.</li>
        </ul>
        <h5>Quando desmarcar:</h5>
        <ul>
          <li>Campanhas genéricas (Natal, Ano Novo)</li>
          <li>Mensagens que não mencionam veículos</li>
          <li><strong>Modo "Apenas Prompt":</strong> Se desmarcar junto com outras configurações, o sistema enviará apenas o prompt personalizado</li>
        </ul>
      `,
    },
    usar_vendedor: {
      titulo: "Incluir Nome do Vendedor",
      resumo: "Se a IA deve mencionar o vendedor do veículo",
      detalhes: `
        <p>Quando marcado, a IA poderá mencionar o nome do vendedor do veículo mais recente do cliente.</p>
        <p><strong>Útil para:</strong></p>
        <ul>
          <li>Campanhas de relacionamento</li>
          <li>Mensagens personalizadas com referência ao vendedor</li>
        </ul>
        <p><strong>Nota:</strong> Só funciona se o cliente tiver veículos cadastrados com vendedor.</p>
      `,
    },
    tamanho_lote: {
      titulo: "Tamanho do Lote",
      resumo: "Número de clientes processados por execução",
      detalhes: `
        <p>Define quantos clientes serão processados a cada execução da campanha.</p>
        <h5>Recomendações:</h5>
        <ul>
          <li><strong>Padrão:</strong> 50 clientes por lote</li>
          <li><strong>Mínimo:</strong> 10 clientes</li>
          <li><strong>Máximo:</strong> 500 clientes</li>
        </ul>
        <p><strong>Impacto:</strong> Lotes maiores processam mais rápido, mas podem sobrecarregar o sistema. Lotes menores são mais seguros.</p>
      `,
    },
    processar_finais_semana: {
      titulo: "Processar Finais de Semana",
      resumo: "Se a campanha deve processar também sábados e domingos",
      detalhes: `
        <p>Quando marcado, a campanha será processada também nos finais de semana.</p>
        <h5>Recomendações:</h5>
        <ul>
          <li><strong>Desmarcado (padrão):</strong> Processa apenas dias úteis (segunda a sexta)</li>
          <li><strong>Marcado:</strong> Processa todos os dias, incluindo sábados e domingos</li>
        </ul>
        <p><strong>Atenção:</strong> Enviar mensagens em finais de semana pode aumentar o risco de bloqueio do WhatsApp.</p>
      `,
    },
    horario_inicio: {
      titulo: "Horário de Início",
      resumo: "Horário em que a campanha começa a processar",
      detalhes: `
        <p>Define o horário de início da janela de processamento diário.</p>
        <p><strong>Formato:</strong> HH:MM (ex: 09:00)</p>
        <p><strong>Padrão:</strong> 09:00</p>
        <p>A campanha só processará clientes dentro da janela entre horário de início e fim.</p>
      `,
    },
    horario_fim: {
      titulo: "Horário de Fim",
      resumo: "Horário em que a campanha para de processar",
      detalhes: `
        <p>Define o horário de fim da janela de processamento diário.</p>
        <p><strong>Formato:</strong> HH:MM (ex: 18:00)</p>
        <p><strong>Padrão:</strong> 18:00</p>
        <p>A campanha só processará clientes dentro da janela entre horário de início e fim.</p>
      `,
    },
    // Formulário de Instância Uazapi
    instanciaUazapiNome: {
      titulo: "Nome da Instância",
      resumo:
        "Nome identificador único (será normalizado para minúsculas com hífens e prefixo Instacar_codigo_ será adicionado)",
      detalhes: `
        <p>Escolha um nome descritivo para identificar esta instância de API WhatsApp.</p>
        <p><strong>⚠️ IMPORTANTE:</strong></p>
        <ul>
          <li><strong>Digite apenas o nome</strong> (sem o prefixo "Instacar_"). O prefixo será adicionado automaticamente pelo sistema</li>
          <li>O nome será <strong>normalizado automaticamente</strong> para minúsculas (espaços viram underscores, acentos removidos, hífens e underscores existentes são preservados)</li>
          <li>O prefixo "Instacar_codigo_" será adicionado automaticamente (código de 6 caracteres gerado automaticamente)</li>
          <li><strong>Não digite o prefixo manualmente</strong> - ele será removido e um novo será aplicado</li>
        </ul>
        <h5>Exemplos de Normalização:</h5>
        <ul>
          <li>Digite: <code>"Uazapi Principal"</code> → Será salvo como: <code>"Instacar_a3k9m2_uazapi-principal"</code></li>
          <li>Digite: <code>"Z-API Backup"</code> → Será salvo como: <code>"Instacar_x7p4q1_z-api-backup"</code></li>
          <li>Digite: <code>"Evolution Teste"</code> → Será salvo como: <code>"Instacar_b8n5r3_evolution-teste"</code></li>
          <li>Digite: <code>"Instância_01"</code> → Será salvo como: <code>"Instacar_c2t6v9_instancia-01"</code></li>
        </ul>
        <p><strong>Formato final:</strong> <code>Instacar_{codigo-6-chars}_{nome-normalizado}</code></p>
        <p>O código de 6 caracteres (letras minúsculas e números) é gerado automaticamente para garantir unicidade. Caracteres especiais serão removidos durante a normalização.</p>
      `,
    },
    instanciaUazapiTipoApi: {
      titulo: "Tipo de API",
      resumo: "Selecione o tipo de API WhatsApp",
      detalhes: `
        <h5>Tipos disponíveis:</h5>
        <ul>
          <li><strong>Uazapi:</strong> API Uazapi padrão</li>
          <li><strong>Z-API:</strong> Z-API WhatsApp</li>
          <li><strong>Evolution API:</strong> Evolution API</li>
          <li><strong>WhatsApp Oficial:</strong> API oficial da Meta</li>
          <li><strong>Outro:</strong> Outro tipo de API compatível</li>
        </ul>
      `,
    },
    instanciaUazapiBaseUrl: {
      titulo: "URL Base da Instância",
      resumo: "URL base da sua instância de API",
      detalhes: `
        <p>URL completa da sua instância de API WhatsApp.</p>
        <h5>Exemplos:</h5>
        <ul>
          <li><code>https://fourtakeoff.uazapi.com</code></li>
          <li><code>https://api.z-api.io</code></li>
          <li><code>https://evolution-api.example.com</code></li>
        </ul>
        <p><strong>Importante:</strong> Use HTTPS e não inclua barra no final.</p>
      `,
    },
    instanciaUazapiAdminToken: {
      titulo: "Admin Token",
      resumo:
        "Token de administrador (opcional - apenas para criar novas instâncias na Uazapi)",
      detalhes: `
        <p>Token de administrador necessário para <strong>criar</strong> novas instâncias na Uazapi via API.</p>
        <p><strong>⚠️ IMPORTANTE - Quando usar Admin Token:</strong></p>
        <ul>
          <li>✅ <strong>Apenas para criar</strong> nova instância na Uazapi via interface</li>
          <li>❌ <strong>Não precisa</strong> para editar instâncias existentes (usa Instance Token)</li>
          <li>❌ <strong>Não precisa</strong> para deletar instâncias (usa Instance Token)</li>
          <li>❌ <strong>Não precisa</strong> para operações regulares (conectar, enviar mensagens, etc.)</li>
        </ul>
        <p><strong>Detalhes técnicos:</strong></p>
        <ul>
          <li><strong>Admin Token</strong> é usado apenas para criar instâncias (POST /instance com header "admintoken")</li>
          <li>Este campo é <strong>opcional</strong> - necessário apenas se você está criando uma nova instância na Uazapi</li>
          <li>Se você já tem uma instância criada, deixe este campo vazio e use apenas o Instance Token</li>
          <li>Após criar a instância, o Instance Token será gerado automaticamente pela Uazapi</li>
        </ul>
        <p><strong>🔒 Segurança:</strong></p>
        <ul>
          <li>O Admin Token <strong>NÃO é salvo</strong> em nenhuma tabela do banco de dados</li>
          <li>É usado apenas temporariamente na memória do navegador para criar a instância</li>
          <li>Após criar a instância, o Admin Token é descartado e nunca mais usado</li>
          <li>O Instance Token gerado é o que fica salvo no banco de dados</li>
          <li><strong>Recomendação:</strong> Mantenha o Admin Token seguro e não compartilhe. Use apenas quando necessário para criar novas instâncias.</li>
        </ul>
        <p><strong>Resumo:</strong> Admin Token só é necessário na primeira vez, ao criar a instância. Depois disso, use apenas o Instance Token. O Admin Token nunca é salvo no banco de dados.</p>
      `,
    },
    instanciaUazapiToken: {
      titulo: "Instance Token",
      resumo: "Token de autenticação da instância (obrigatório)",
      detalhes: `
        <p>Token de autenticação necessário para acessar a API e realizar operações na instância.</p>
        <p><strong>⚠️ IMPORTANTE:</strong></p>
        <ul>
          <li>Use o <strong>Instance Token</strong>, não o Admin Token</li>
          <li>Endpoints regulares usam header "token" com Instance Token</li>
          <li>Mantenha este token seguro e não compartilhe</li>
        </ul>
        <p><strong>Quando usar:</strong></p>
        <ul>
          <li>✅ Conectar/desconectar instância</li>
          <li>✅ Enviar mensagens</li>
          <li>✅ Verificar status</li>
          <li>✅ <strong>Deletar instância</strong> (DELETE /instance com header "token")</li>
          <li>❌ Não usar para criar instâncias (use Admin Token)</li>
        </ul>
        <p><strong>Se você está criando uma nova instância:</strong></p>
        <ul>
          <li>Se forneceu o Admin Token acima, o Instance Token será gerado automaticamente pela Uazapi</li>
          <li>Se não forneceu o Admin Token, você precisa fornecer um Instance Token de uma instância existente</li>
        </ul>
        <p><strong>Onde encontrar:</strong> No painel de administração da sua instância de API.</p>
      `,
    },
    instanciaUazapiConfigExtra: {
      titulo: "Configuração Extra (JSON)",
      resumo: "Configurações específicas da API em formato JSON",
      detalhes: `
        <p>Configurações adicionais específicas do tipo de API selecionado.</p>
        <h5>Exemplos por tipo:</h5>
        <div class="tooltip-exemplo-item">
          <strong>Evolution API:</strong>
          <code>{"instance_id": "xxx"}</code>
        </div>
        <div class="tooltip-exemplo-item">
          <strong>WhatsApp Oficial:</strong>
          <code>{"phone_id": "xxx", "business_account_id": "yyy"}</code>
        </div>
        <p><strong>Nota:</strong> Deixe vazio se não necessário para o tipo de API selecionado.</p>
      `,
    },
  };

  /**
   * Cria um ícone de ajuda com tooltip
   * @param {string} campoId - ID do campo
   * @param {string} customResumo - Resumo customizado (opcional)
   * @returns {HTMLElement} - Elemento do ícone
   */
  function criarTooltipHelpIcon(campoId, customResumo = null) {
    const config = tooltipsConfig[campoId];
    if (!config) {
      console.warn(`Tooltip não configurado para campo: ${campoId}`);
      return null;
    }

    const icon = document.createElement("span");
    icon.className = "help-icon";
    icon.innerHTML = "?"; // Usar innerHTML para evitar problemas com textContent
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", `Ajuda sobre ${config.titulo}`);
    icon.setAttribute("tabindex", "0");
    icon.style.position = "relative"; // Para que o tooltip seja posicionado corretamente

    const resumo = customResumo || config.resumo;

    // Tooltip hover (rápido) - criar mas não adicionar ainda
    const tooltipHover = document.createElement("div");
    tooltipHover.className = "tooltip-hover";
    tooltipHover.textContent = resumo;
    // Adicionar ao body em vez do ícone para evitar problemas de posicionamento
    document.body.appendChild(tooltipHover);
    
    // Armazenar referência no ícone para poder remover depois
    icon._tooltipHover = tooltipHover;

    // Event listeners
    let hoverTimeout;
    let clickTimeout;

    icon.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        posicionarTooltipHover(icon, tooltipHover);
        tooltipHover.classList.add("show");
      }, 300);
    });

    icon.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimeout);
      tooltipHover.classList.remove("show");
      // Resetar posição para próxima exibição
      tooltipHover.style.top = "";
      tooltipHover.style.left = "";
      tooltipHover.style.visibility = "";
      tooltipHover.style.display = "";
    });
    
    // Limpar tooltip quando o ícone for removido
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            if (node === icon && icon._tooltipHover) {
              icon._tooltipHover.remove();
            }
          });
        }
      });
    });
    
    // Observar quando o ícone for removido do DOM
    if (icon.parentNode) {
      observer.observe(icon.parentNode, { childList: true });
    }

    icon.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Fechar tooltip hover se estiver aberto
      tooltipHover.classList.remove("show");
      // Mostrar popover completo
      mostrarTooltipPopover(config, icon);
    });

    icon.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        mostrarTooltipPopover(config, icon);
      }
    });

    return icon;
  }

  /**
   * Posiciona tooltip hover para não sair da tela
   */
  function posicionarTooltipHover(icon, tooltip) {
    // Primeiro, garantir que o tooltip está visível para calcular dimensões
    tooltip.style.display = "block";
    tooltip.style.visibility = "hidden";
    tooltip.style.opacity = "0";
    
    const rect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Posição padrão: abaixo do ícone, centralizado
    let top = rect.bottom + 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // Ajustar se sair da tela à direita
    if (left + tooltipRect.width > viewportWidth - 10) {
      left = viewportWidth - tooltipRect.width - 10;
    }

    // Ajustar se sair da tela à esquerda
    if (left < 10) {
      left = 10;
    }

    // Se não couber abaixo, colocar acima
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = rect.top - tooltipRect.height - 8;
      tooltip.style.setProperty("--arrow-position", "bottom");
    } else {
      tooltip.style.setProperty("--arrow-position", "top");
    }

    // Aplicar posição (position: fixed usa coordenadas do viewport)
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = "visible";
  }

  /**
   * Mostra popover com detalhes completos
   */
  function mostrarTooltipPopover(config, triggerElement) {
    let popover = document.getElementById("tooltipPopover");
    let overlay = document.getElementById("tooltipOverlay");
    let title = document.getElementById("tooltipPopoverTitle");
    let content = document.getElementById("tooltipPopoverContent");

    // Criar elementos se não existirem
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "tooltip-overlay";
      overlay.id = "tooltipOverlay";
      overlay.onclick = fecharTooltipPopover;
      document.body.appendChild(overlay);
    }

    if (!popover) {
      popover = document.createElement("div");
      popover.className = "tooltip-popover";
      popover.id = "tooltipPopover";
      
      const header = document.createElement("div");
      header.className = "tooltip-popover-header";
      
      title = document.createElement("h4");
      title.id = "tooltipPopoverTitle";
      
      const closeBtn = document.createElement("button");
      closeBtn.className = "tooltip-popover-close";
      closeBtn.onclick = fecharTooltipPopover;
      closeBtn.innerHTML = "&times;";
      
      header.appendChild(title);
      header.appendChild(closeBtn);
      
      content = document.createElement("div");
      content.className = "tooltip-popover-content";
      content.id = "tooltipPopoverContent";
      
      popover.appendChild(header);
      popover.appendChild(content);
      document.body.appendChild(popover);
    } else {
      // Se popover existe, buscar elementos filhos
      if (!title) title = document.getElementById("tooltipPopoverTitle");
      if (!content) content = document.getElementById("tooltipPopoverContent");
    }

    if (!popover || !overlay || !title || !content) {
      console.error("Elementos do popover não encontrados ou não puderam ser criados", {
        popover: !!popover,
        overlay: !!overlay,
        title: !!title,
        content: !!content
      });
      return;
    }

    title.textContent = config.titulo;
    content.innerHTML = config.detalhes;

    // Primeiro, mostrar o popover invisível para calcular dimensões corretas
    popover.style.display = "block";
    popover.style.visibility = "hidden";
    popover.style.opacity = "0";

    // Posicionar popover próximo ao elemento trigger
    // getBoundingClientRect() retorna coordenadas relativas ao viewport
    const rect = triggerElement.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Para position: fixed, não precisamos considerar scroll
    // Posição padrão: abaixo do ícone, centralizado horizontalmente
    let top = rect.bottom + 10;
    let left = rect.left + (rect.width / 2) - (popoverRect.width / 2);

    // Ajustar se sair da tela à direita
    if (left + popoverRect.width > viewportWidth - 20) {
      left = viewportWidth - popoverRect.width - 20;
    }
    
    // Ajustar se sair da tela à esquerda
    if (left < 20) {
      left = 20;
    }
    
    // Ajustar se sair da tela abaixo
    if (top + popoverRect.height > viewportHeight - 20) {
      // Tentar posicionar acima do ícone
      top = rect.top - popoverRect.height - 10;
      
      // Se ainda não couber acima, posicionar no topo da tela
      if (top < 20) {
        top = 20;
      }
    }
    
    // Ajustar se sair da tela acima
    if (top < 20) {
      top = 20;
    }

    // Aplicar posição (position: fixed usa coordenadas do viewport)
    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;
    popover.style.visibility = "visible";
    popover.style.opacity = "1";

    // Mostrar
    overlay.classList.add("show");
    popover.classList.add("show");

    // Focar no botão de fechar para acessibilidade
    setTimeout(() => {
      const closeBtn = popover.querySelector(".tooltip-popover-close");
      if (closeBtn) closeBtn.focus();
    }, 100);
  }

  /**
   * Fecha popover de tooltip
   */
  function fecharTooltipPopover() {
    const popover = document.getElementById("tooltipPopover");
    const overlay = document.getElementById("tooltipOverlay");

    if (popover) {
      popover.classList.remove("show");
      // Resetar estilos inline para próxima abertura
      popover.style.display = "";
      popover.style.visibility = "";
      popover.style.opacity = "";
      popover.style.top = "";
      popover.style.left = "";
    }
    if (overlay) overlay.classList.remove("show");
  }

  /**
   * Adiciona tooltip a um label
   */
  function adicionarTooltipAoLabel(labelElement, campoId) {
    if (!labelElement || !campoId) return;

    // Verificar se já tem tooltip
    if (labelElement.querySelector(".help-icon")) return;

    const icon = criarTooltipHelpIcon(campoId);
    if (icon) {
      labelElement.classList.add("with-help");
      labelElement.appendChild(icon);
    }
  }

  // Fechar popover ao pressionar ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      fecharTooltipPopover();
    }
  });

  // Fechar popover ao clicar no overlay
  const overlay = document.getElementById("tooltipOverlay");
  if (overlay) {
    overlay.addEventListener("click", fecharTooltipPopover);
  }

  /**
   * Abre modal de ajuda
   */
  function abrirModalAjuda() {
    const modal = document.getElementById("modalAjuda");
    if (modal) {
      modal.classList.add("active");
      // Ir para primeira tab
      trocarTabAjuda("visao-geral");
    }
  }

  /**
   * Fecha modal de ajuda
   */
  function fecharModalAjuda() {
    const modal = document.getElementById("modalAjuda");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Troca tab do modal de ajuda
   */
  function trocarTabAjuda(tabId) {
    // Mapeamento de IDs para IDs reais dos elementos
    const mapeamento = {
      "visao-geral": { content: "ajudaVisaoGeral", tab: "tabVisaoGeral" },
      campos: { content: "ajudaCampos", tab: "tabCampos" },
      funcionalidades: {
        content: "ajudaFuncionalidades",
        tab: "tabFuncionalidades",
      },
      troubleshooting: {
        content: "ajudaTroubleshooting",
        tab: "tabTroubleshooting",
      },
    };

    const config = mapeamento[tabId];
    if (!config) {
      console.warn(`Tab não encontrada: ${tabId}`);
      return;
    }

    // Esconder todos os conteúdos
    const contents = document.querySelectorAll(
      "#modalAjuda .modal-tab-content"
    );
    contents.forEach((content) => {
      content.classList.remove("active");
    });

    // Remover active de todas as tabs
    const tabs = document.querySelectorAll("#modalAjuda .modal-tab");
    tabs.forEach((tab) => {
      tab.classList.remove("active");
    });

    // Mostrar conteúdo selecionado
    const content = document.getElementById(config.content);
    if (content) {
      content.classList.add("active");
    }

    // Ativar tab selecionada
    const tab = document.getElementById(config.tab);
    if (tab) {
      tab.classList.add("active");
    }
  }

  // Expor funções globalmente
  window.verDetalhesCliente = verDetalhesCliente;
  window.trocarTabCliente = trocarTabCliente;
  window.alternarModoEdicao = alternarModoEdicao;
  window.cancelarEdicao = cancelarEdicao;
  window.salvarEdicaoCliente = salvarEdicaoCliente;
  window.adicionarObservacaoCliente = adicionarObservacaoCliente;
  window.adicionarVeiculoCliente = adicionarVeiculoCliente;
  window.removerVeiculoCliente = removerVeiculoCliente;
  window.mostrarFormVeiculo = mostrarFormVeiculo;
  window.cancelarAdicionarVeiculo = cancelarAdicionarVeiculo;
  /**
   * Abre modal de cliente para edição
   * @param {string} clienteId - ID do cliente
   */
  async function editarCliente(clienteId) {
    try {
      // Verificar se os elementos do modal existem antes de chamar verDetalhesCliente
      const modal = document.getElementById("modalCliente");
      if (!modal) {
        console.error("Modal não encontrado antes de chamar verDetalhesCliente");
        mostrarAlerta("Erro: Modal não encontrado. A página pode não estar totalmente carregada.", "error");
        return;
      }
      
      const sucesso = await verDetalhesCliente(clienteId);
      
      if (!sucesso) {
        mostrarAlerta("Erro: Não foi possível carregar os dados do cliente.", "error");
        return;
      }
      
      // Aguardar o modal estar pronto antes de alternar para modo de edição
      // Verificar se o modal está aberto, loading está escondido e content está visível
      let tentativas = 0;
      const maxTentativas = 30; // 3 segundos no total (30 * 100ms)
      
      const aguardarModalPronto = () => {
        const modal = document.getElementById("modalCliente");
        const modalContent = document.getElementById("modalClienteContent");
        const loading = document.getElementById("modalClienteLoading");
        
        // Verificar se todos os elementos existem
        if (!modal || !modalContent || !loading) {
          if (tentativas < maxTentativas) {
            tentativas++;
            setTimeout(aguardarModalPronto, 100);
          } else {
            console.error("Timeout: Elementos do modal não encontrados");
            mostrarAlerta("Erro: Modal não encontrado. Tente novamente.", "error");
          }
          return;
        }
        
        // Verificar se o modal está ativo, loading está escondido e content está visível
        const modalAtivo = modal.classList.contains("active");
        const loadingEscondido = loading.style.display === "none" || loading.style.display === "";
        const computedContentDisplay = window.getComputedStyle(modalContent).display;
        const contentVisivel = modalContent.style.display === "block" || 
                              (modalContent.style.display === "" && computedContentDisplay !== "none");
        
        if (modalAtivo && loadingEscondido && contentVisivel) {
          // Modal está pronto, alternar para modo de edição
          if (typeof alternarModoEdicao === 'function') {
            alternarModoEdicao();
          }
        } else if (tentativas < maxTentativas) {
          tentativas++;
          setTimeout(aguardarModalPronto, 100);
        } else {
          console.error("Timeout aguardando modal estar pronto", {
            modalAtivo,
            loadingEscondido,
            contentVisivel,
            loadingDisplay: loading.style.display,
            contentDisplay: modalContent.style.display,
            computedContentDisplay: computedContentDisplay
          });
          mostrarAlerta("Erro: Não foi possível abrir o modal de edição. Tente novamente.", "error");
        }
      };
      
      // Iniciar verificação após um pequeno delay para dar tempo do DOM atualizar
      setTimeout(aguardarModalPronto, 150);
    } catch (error) {
      console.error("Erro ao abrir modal de edição:", error);
      mostrarAlerta(`Erro ao abrir modal de edição: ${error.message}`, "error");
    }
  }

  /**
   * Alterna bloqueio de envios do cliente
   * @param {string} clienteId - ID do cliente
   * @param {boolean} bloqueadoAtual - Estado atual do bloqueio
   */
  async function toggleBloqueioCliente(clienteId, bloqueadoAtual) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    const novoEstado = !bloqueadoAtual;
    const acao = novoEstado ? "bloquear" : "desbloquear";
    
    if (!confirm(`Tem certeza que deseja ${acao} este cliente?`)) {
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_clientes_envios")
        .update({
          bloqueado_envios: novoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clienteId);

      if (error) {
        throw new Error(`Erro ao ${acao} cliente: ${error.message}`);
      }

      mostrarAlerta(`Cliente ${novoEstado ? "bloqueado" : "desbloqueado"} com sucesso!`, "success");
      carregarListaClientes(paginaAtualClientes || 1);
    } catch (error) {
      console.error(`Erro ao ${acao} cliente:`, error);
      mostrarAlerta(`Erro ao ${acao}: ${error.message}`, "error");
    }
  }

  window.desativarCliente = desativarCliente;
  window.excluirCliente = excluirCliente;
  window.editarCliente = editarCliente;
  window.toggleBloqueioCliente = toggleBloqueioCliente;
  window.abrirModalNovoCliente = adicionarNovoCliente; // Alias para manter compatibilidade
  window.adicionarNovoCliente = adicionarNovoCliente;
  window.fecharModalCliente = fecharModalCliente;
  window.verificarWhatsAppDoModal = verificarWhatsAppDoModal;
  window.filtrarHistorico = filtrarHistorico;
  window.limparFiltrosHistorico = limparFiltrosHistorico;
  
  // Funções de filtros de clientes (já definidas acima, apenas expor globalmente)
  // window.abrirModalFiltrosClientes já está definida acima
  // window.fecharModalFiltrosClientes já está definida acima
  // window.aplicarFiltrosClientes já está definida acima
  // window.limparFiltrosClientes já está definida acima
  window.mudarPaginaHistorico = mudarPaginaHistorico;
  window.exportarHistorico = exportarHistorico;
  window.fecharTooltipPopover = fecharTooltipPopover;
  window.criarTooltipHelpIcon = criarTooltipHelpIcon;
  window.adicionarTooltipAoLabel = adicionarTooltipAoLabel;
  window.abrirModalAjuda = abrirModalAjuda;
  window.fecharModalAjuda = fecharModalAjuda;
  window.trocarTabAjuda = trocarTabAjuda;

  // Adicionar listeners de upload e envio na inicialização
  const originalInicializarApp = inicializarApp;
  inicializarApp = function () {
    originalInicializarApp();
    inicializarUploadListeners();
    inicializarFormularioEnvio();
    inicializarFormularioInstanciaUazapi();
  };

  /**
   * Inicializa formulário de instância Uazapi
   */
  function inicializarFormularioInstanciaUazapi() {
    const form = document.getElementById("formInstanciaUazapi");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await salvarInstanciaUazapi();
    });

    // Adicionar listeners para atualizar status do Instance Token dinamicamente
    const adminTokenInput = document.getElementById(
      "instanciaUazapiAdminToken"
    );
    const tipoApiSelect = document.getElementById("instanciaUazapiTipoApi");

    if (adminTokenInput) {
      adminTokenInput.addEventListener("input", atualizarStatusInstanceToken);
      adminTokenInput.addEventListener("change", atualizarStatusInstanceToken);
    }

    if (tipoApiSelect) {
      tipoApiSelect.addEventListener("change", atualizarStatusInstanceToken);
    }
  }

  // ============================================================================
  // Gerenciamento de Configurações da Empresa
  // ============================================================================

  async function carregarConfiguracoesEmpresa() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_configuracoes_empresa")
        .select("*")
        .eq("ativo", true)
        .order("categoria", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) throw error;

      const container = document.getElementById("listaConfiguracoesEmpresa");
      if (!container) return;

      if (!data || data.length === 0) {
        container.innerHTML = "<p>Nenhuma configuração cadastrada.</p>";
        return;
      }

      // Agrupar por categoria
      const porCategoria = {};
      data.forEach((config) => {
        if (!porCategoria[config.categoria]) {
          porCategoria[config.categoria] = [];
        }
        porCategoria[config.categoria].push(config);
      });

      let html = "";
      Object.keys(porCategoria)
        .sort()
        .forEach((categoria) => {
          html += `<div style="margin-bottom: 20px"><h3 style="color: #333; margin-bottom: 10px">${categoria}</h3>`;
          porCategoria[categoria].forEach((config) => {
            html += `
            <div style="border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 10px; background: ${
              config.ativo ? "#fff" : "#f9f9f9"
            }">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px">
                <div style="flex: 1">
                  <strong>${config.titulo}</strong>
                  ${
                    !config.ativo
                      ? '<span style="color: #999; font-size: 12px; margin-left: 10px">(Inativo)</span>'
                      : ""
                  }
                </div>
                <div style="display: flex; gap: 5px">
                  <button onclick="editarConfiguracaoEmpresa('${
                    config.id
                  }')" class="btn-small" style="padding: 4px 8px; font-size: 12px">✏️ Editar</button>
                  <button onclick="toggleAtivoConfiguracao('${
                    config.id
                  }', ${!config.ativo})" class="btn-small" style="padding: 4px 8px; font-size: 12px">
                    ${config.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
                  </button>
                </div>
              </div>
              <p style="margin: 4px 0; color: #666; font-size: 13px">Chave: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px">${
                config.chave
              }</code></p>
              ${
                config.descricao
                  ? `<p style="margin: 4px 0; color: #666; font-size: 13px">${config.descricao}</p>`
                  : ""
              }
              <div style="margin-top: 8px; padding: 8px; background: #f9f9f9; border-radius: 4px; font-size: 13px; color: #555">${config.conteudo.substring(
                0,
                200
              )}${config.conteudo.length > 200 ? "..." : ""}</div>
            </div>
          `;
          });
          html += `</div>`;
        });

      container.innerHTML = html;
    } catch (error) {
      mostrarAlerta(
        "Erro ao carregar configurações: " + error.message,
        "error"
      );
      console.error(error);
    }
  }

  async function salvarConfiguracaoEmpresa(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    const dados = {
      chave: document.getElementById("configEmpresaChave").value.trim(),
      categoria: document.getElementById("configEmpresaCategoria").value,
      titulo: document.getElementById("configEmpresaTitulo").value.trim(),
      conteudo: document.getElementById("configEmpresaConteudo").value.trim(),
      descricao: document.getElementById("configEmpresaDescricao").value.trim(),
      ordem: parseInt(document.getElementById("configEmpresaOrdem").value) || 0,
      ativo: document.getElementById("configEmpresaAtivo").checked,
    };

    if (!dados.chave || !dados.categoria || !dados.titulo || !dados.conteudo) {
      mostrarAlerta("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      let result;
      if (id) {
        result = await supabaseClient
          .from("instacar_configuracoes_empresa")
          .update(dados)
          .eq("id", id);
      } else {
        result = await supabaseClient
          .from("instacar_configuracoes_empresa")
          .insert([dados]);
      }

      if (result.error) throw result.error;

      mostrarAlerta(
        `Configuração ${id ? "atualizada" : "criada"} com sucesso!`,
        "success"
      );
      fecharModalFormConfiguracaoEmpresa();

      // Se estava no modal de listagem, recarregar
      const modalListagem = document.getElementById("modalConfiguracaoEmpresa");
      if (modalListagem && modalListagem.classList.contains("active")) {
        await carregarConfiguracoesEmpresa();
      }
    } catch (error) {
      mostrarAlerta("Erro ao salvar configuração: " + error.message, "error");
      console.error(error);
    }
  }

  async function editarConfiguracaoEmpresa(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_configuracoes_empresa")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        mostrarAlerta("Configuração não encontrada", "error");
        return;
      }

      document.getElementById("configEmpresaId").value = data.id;
      document.getElementById("configEmpresaChave").value = data.chave || "";
      document.getElementById("configEmpresaCategoria").value =
        data.categoria || "politicas";
      document.getElementById("configEmpresaTitulo").value = data.titulo || "";
      document.getElementById("configEmpresaConteudo").value =
        data.conteudo || "";
      document.getElementById("configEmpresaDescricao").value =
        data.descricao || "";
      document.getElementById("configEmpresaOrdem").value = data.ordem || 0;
      document.getElementById("configEmpresaAtivo").checked =
        data.ativo !== false;

      abrirModalFormConfiguracaoEmpresa();
    } catch (error) {
      mostrarAlerta("Erro ao carregar configuração: " + error.message, "error");
      console.error(error);
    }
  }

  async function abrirModalConfiguracaoEmpresa() {
    const modal = document.getElementById("modalConfiguracaoEmpresa");
    if (modal) {
      modal.classList.add("active");
      await carregarConfiguracoesEmpresa();
    }
  }

  function fecharModalConfiguracaoEmpresa() {
    const modal = document.getElementById("modalConfiguracaoEmpresa");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  function abrirModalFormConfiguracaoEmpresa() {
    const modal = document.getElementById("modalFormConfiguracaoEmpresa");
    if (modal) {
      // Limpar campos se for nova configuração
      if (!document.getElementById("configEmpresaId").value) {
        document.getElementById("formConfiguracaoEmpresa").reset();
        document.getElementById("configEmpresaId").value = "";
      }
      modal.classList.add("active");
      document.getElementById("modalFormConfiguracaoEmpresaTitle").textContent =
        document.getElementById("configEmpresaId").value
          ? "Editar Configuração"
          : "Nova Configuração";
    }
  }

  function fecharModalFormConfiguracaoEmpresa() {
    const modal = document.getElementById("modalFormConfiguracaoEmpresa");
    if (modal) {
      modal.classList.remove("active");
      document.getElementById("formConfiguracaoEmpresa").reset();
      document.getElementById("configEmpresaId").value = "";
    }
  }

  async function toggleAtivoConfiguracao(id, novoEstado) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_configuracoes_empresa")
        .update({ ativo: novoEstado })
        .eq("id", id);

      if (error) throw error;

      mostrarAlerta(
        `Configuração ${novoEstado ? "ativada" : "desativada"} com sucesso!`,
        "success"
      );
      carregarConfiguracoesEmpresa();
    } catch (error) {
      mostrarAlerta("Erro ao alterar status: " + error.message, "error");
      console.error(error);
    }
  }

  // ============================================================================
  // Gerenciamento de Sessões de Contexto IA
  // ============================================================================

  async function carregarSessoesContexto() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_sessoes_contexto_ia")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;

      const container = document.getElementById("listaSessoesContexto");
      if (!container) return;

      if (!data || data.length === 0) {
        container.innerHTML = "<p>Nenhuma sessão cadastrada.</p>";
        return;
      }

      let html = "";
      data.forEach((sessao) => {
        html += `
          <div style="border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 10px; background: ${
            sessao.ativo ? "#fff" : "#f9f9f9"
          }">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px">
              <div style="flex: 1">
                <strong>${sessao.nome}</strong>
                ${
                  !sessao.ativo
                    ? '<span style="color: #999; font-size: 12px; margin-left: 10px">(Inativo)</span>'
                    : ""
                }
                ${
                  sessao.habilitado_por_padrao
                    ? '<span style="color: #28a745; font-size: 12px; margin-left: 10px">(Padrão)</span>'
                    : ""
                }
              </div>
              <div style="display: flex; gap: 5px">
                <button onclick="editarSessaoContexto('${
                  sessao.id
                }')" class="btn-small" style="padding: 4px 8px; font-size: 12px">✏️ Editar</button>
                <button onclick="toggleAtivoSessao('${
                  sessao.id
                }', ${!sessao.ativo})" class="btn-small" style="padding: 4px 8px; font-size: 12px">
                  ${sessao.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
                </button>
              </div>
            </div>
            <p style="margin: 4px 0; color: #666; font-size: 13px">Slug: <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px">${
              sessao.slug
            }</code></p>
            ${
              sessao.descricao
                ? `<p style="margin: 4px 0; color: #666; font-size: 13px">${sessao.descricao}</p>`
                : ""
            }
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (error) {
      mostrarAlerta("Erro ao carregar sessões: " + error.message, "error");
      console.error(error);
    }
  }

  async function salvarSessaoContexto(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    const dados = {
      nome: document.getElementById("sessaoNome").value.trim(),
      slug: document.getElementById("sessaoSlug").value.trim(),
      categoria: document.getElementById("sessaoCategoria").value.trim(),
      conteudo_template: document
        .getElementById("sessaoConteudoTemplate")
        .value.trim(),
      exemplo_preenchido: document
        .getElementById("sessaoExemploPreenchido")
        .value.trim(),
      descricao: document.getElementById("sessaoDescricao").value.trim(),
      habilitado_por_padrao: document.getElementById(
        "sessaoHabilitadoPorPadrao"
      ).checked,
      ordem: parseInt(document.getElementById("sessaoOrdem").value) || 0,
      ativo: document.getElementById("sessaoAtivo").checked,
    };

    if (!dados.nome || !dados.slug || !dados.conteudo_template) {
      mostrarAlerta("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      let result;
      if (id) {
        result = await supabaseClient
          .from("instacar_sessoes_contexto_ia")
          .update(dados)
          .eq("id", id);
      } else {
        result = await supabaseClient
          .from("instacar_sessoes_contexto_ia")
          .insert([dados]);
      }

      if (result.error) throw result.error;

      mostrarAlerta(
        `Sessão ${id ? "atualizada" : "criada"} com sucesso!`,
        "success"
      );
      fecharModalSessaoContexto();
      await carregarSessoesContexto();

      // Se estava no modal de listagem, recarregar
      const modalListagem = document.getElementById("modalSessaoContexto");
      if (modalListagem && modalListagem.classList.contains("active")) {
        await carregarSessoesContexto();
      }
    } catch (error) {
      mostrarAlerta("Erro ao salvar sessão: " + error.message, "error");
      console.error(error);
    }
  }

  async function editarSessaoContexto(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_sessoes_contexto_ia")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        mostrarAlerta("Sessão não encontrada", "error");
        return;
      }

      document.getElementById("sessaoId").value = data.id;
      document.getElementById("sessaoNome").value = data.nome || "";
      document.getElementById("sessaoSlug").value = data.slug || "";
      document.getElementById("sessaoCategoria").value = data.categoria || "";
      document.getElementById("sessaoConteudoTemplate").value =
        data.conteudo_template || "";
      document.getElementById("sessaoExemploPreenchido").value =
        data.exemplo_preenchido || "";
      document.getElementById("sessaoDescricao").value = data.descricao || "";
      document.getElementById("sessaoHabilitadoPorPadrao").checked =
        data.habilitado_por_padrao === true;
      document.getElementById("sessaoOrdem").value = data.ordem || 0;
      document.getElementById("sessaoAtivo").checked = data.ativo !== false;

      abrirModalFormSessaoContexto();
    } catch (error) {
      mostrarAlerta("Erro ao carregar sessão: " + error.message, "error");
      console.error(error);
    }
  }

  async function abrirModalSessaoContexto() {
    const modal = document.getElementById("modalSessaoContexto");
    if (modal) {
      modal.classList.add("active");
      await carregarSessoesContexto();
    }
  }

  function fecharModalSessaoContexto() {
    const modal = document.getElementById("modalSessaoContexto");
    const modalForm = document.getElementById("modalFormSessaoContexto");
    if (modal) {
      modal.classList.remove("active");
    }
    if (modalForm) {
      modalForm.classList.remove("active");
      document.getElementById("formSessaoContexto").reset();
      document.getElementById("sessaoId").value = "";
    }
  }

  function abrirModalFormSessaoContexto() {
    const modal = document.getElementById("modalFormSessaoContexto");
    if (modal) {
      // Limpar campos se for nova sessão
      if (!document.getElementById("sessaoId").value) {
        document.getElementById("formSessaoContexto").reset();
        document.getElementById("sessaoId").value = "";
      }
      modal.classList.add("active");
      document.getElementById("modalFormSessaoContextoTitle").textContent =
        document.getElementById("sessaoId").value
          ? "Editar Sessão"
          : "Nova Sessão";
    }
  }

  async function toggleAtivoSessao(id, novoEstado) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_sessoes_contexto_ia")
        .update({ ativo: novoEstado })
        .eq("id", id);

      if (error) throw error;

      mostrarAlerta(
        `Sessão ${novoEstado ? "ativada" : "desativada"} com sucesso!`,
        "success"
      );
      carregarSessoesContexto();
    } catch (error) {
      mostrarAlerta("Erro ao alterar status: " + error.message, "error");
      console.error(error);
    }
  }

  // ============================================================================
  // Gerenciamento de Templates de Prompt
  // ============================================================================

  async function carregarTemplatesPrompt() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_templates_prompt")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;

      const container = document.getElementById("listaTemplatesPrompt");
      if (!container) return;

      if (!data || data.length === 0) {
        container.innerHTML = "<p>Nenhum template cadastrado.</p>";
        return;
      }

      let html = "";
      data.forEach((template) => {
        html += `
          <div style="border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 10px; background: ${
            template.ativo ? "#fff" : "#f9f9f9"
          }">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px">
              <div style="flex: 1">
                <strong>${template.nome}</strong>
                ${
                  !template.ativo
                    ? '<span style="color: #999; font-size: 12px; margin-left: 10px">(Inativo)</span>'
                    : ""
                }
                <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px">${
                  template.categoria
                }</span>
              </div>
              <div style="display: flex; gap: 5px">
                <button onclick="editarTemplatePrompt('${
                  template.id
                }')" class="btn-small" style="padding: 4px 8px; font-size: 12px">✏️ Editar</button>
                <button onclick="toggleAtivoTemplate('${
                  template.id
                }', ${!template.ativo})" class="btn-small" style="padding: 4px 8px; font-size: 12px">
                  ${template.ativo ? "⏸️ Desativar" : "▶️ Ativar"}
                </button>
              </div>
            </div>
            ${
              template.descricao
                ? `<p style="margin: 4px 0; color: #666; font-size: 13px">${template.descricao}</p>`
                : ""
            }
          </div>
        `;
      });

      container.innerHTML = html;
    } catch (error) {
      mostrarAlerta("Erro ao carregar templates: " + error.message, "error");
      console.error(error);
    }
  }

  async function salvarTemplatePrompt(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    const sessoesHabilitadas = Array.from(
      document.querySelectorAll("#templateSessoesHabilitadas input:checked")
    ).map((cb) => cb.value);

    const configuracoesHabilitadas = Array.from(
      document.querySelectorAll(
        "#templateConfiguracoesHabilitadas input:checked"
      )
    ).map((cb) => cb.value);

    const dados = {
      nome: document.getElementById("templateNome").value.trim(),
      descricao: document.getElementById("templateDescricao").value.trim(),
      prompt_completo: document
        .getElementById("templatePromptCompleto")
        .value.trim(),
      sessoes_habilitadas: sessoesHabilitadas,
      configuracoes_empresa_habilitadas: configuracoesHabilitadas,
      categoria: document.getElementById("templateCategoria").value,
      exemplo_uso: document.getElementById("templateExemploUso").value.trim(),
      ativo: document.getElementById("templateAtivo").checked,
    };

    if (!dados.nome || !dados.prompt_completo || !dados.categoria) {
      mostrarAlerta("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      let result;
      if (id) {
        result = await supabaseClient
          .from("instacar_templates_prompt")
          .update(dados)
          .eq("id", id);
      } else {
        result = await supabaseClient
          .from("instacar_templates_prompt")
          .insert([dados]);
      }

      if (result.error) throw result.error;

      mostrarAlerta(
        `Template ${id ? "atualizado" : "criado"} com sucesso!`,
        "success"
      );
      fecharModalTemplatePrompt();
      await carregarTemplatesPrompt();

      // Se estava no modal de listagem, recarregar
      const modalListagem = document.getElementById("modalTemplatePrompt");
      if (modalListagem && modalListagem.classList.contains("active")) {
        await carregarTemplatesPrompt();
      }
    } catch (error) {
      mostrarAlerta("Erro ao salvar template: " + error.message, "error");
      console.error(error);
    }
  }

  async function editarTemplatePrompt(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_templates_prompt")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) {
        mostrarAlerta("Template não encontrado", "error");
        return;
      }

      document.getElementById("templateId").value = data.id;
      document.getElementById("templateNome").value = data.nome || "";
      document.getElementById("templateDescricao").value = data.descricao || "";
      document.getElementById("templatePromptCompleto").value =
        data.prompt_completo || "";
      document.getElementById("templateCategoria").value =
        data.categoria || "custom";
      document.getElementById("templateExemploUso").value =
        data.exemplo_uso || "";
      document.getElementById("templateAtivo").checked = data.ativo !== false;

      // Abrir modal e depois marcar checkboxes (aguardar carregamento)
      await abrirModalFormTemplatePrompt();

      // Aguardar um pouco para garantir que checkboxes foram carregados
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Marcar sessões habilitadas
      const sessoesHabilitadas = data.sessoes_habilitadas || [];
      document
        .querySelectorAll("#templateSessoesHabilitadas input")
        .forEach((cb) => {
          cb.checked = sessoesHabilitadas.includes(cb.value);
        });

      // Marcar configurações habilitadas
      const configsHabilitadas = data.configuracoes_empresa_habilitadas || [];
      document
        .querySelectorAll("#templateConfiguracoesHabilitadas input")
        .forEach((cb) => {
          cb.checked = configsHabilitadas.includes(cb.value);
        });
    } catch (error) {
      mostrarAlerta("Erro ao carregar template: " + error.message, "error");
      console.error(error);
    }
  }

  async function abrirModalTemplatePrompt() {
    const modal = document.getElementById("modalTemplatePrompt");
    if (modal) {
      modal.classList.add("active");
      await carregarTemplatesPrompt();
    }
  }

  function fecharModalTemplatePrompt() {
    const modal = document.getElementById("modalTemplatePrompt");
    const modalForm = document.getElementById("modalFormTemplatePrompt");
    if (modal) {
      modal.classList.remove("active");
    }
    if (modalForm) {
      modalForm.classList.remove("active");
      document.getElementById("formTemplatePrompt").reset();
      document.getElementById("templateId").value = "";
    }
  }

  async function abrirModalFormTemplatePrompt() {
    const modal = document.getElementById("modalFormTemplatePrompt");
    if (modal) {
      // Limpar campos se for novo template
      if (!document.getElementById("templateId").value) {
        document.getElementById("formTemplatePrompt").reset();
        document.getElementById("templateId").value = "";
      }
      modal.classList.add("active");
      document.getElementById("modalFormTemplatePromptTitle").textContent =
        document.getElementById("templateId").value
          ? "Editar Template"
          : "Novo Template";

      // Carregar sessões e configurações para checkboxes
      await carregarSessoesParaTemplate();
      await carregarConfiguracoesParaTemplate();
    }
  }

  async function carregarSessoesParaTemplate() {
    if (!supabaseClient) return;
    try {
      const { data: sessoes } = await supabaseClient
        .from("instacar_sessoes_contexto_ia")
        .select("id, nome, slug")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      const container = document.getElementById("templateSessoesHabilitadas");
      if (container && sessoes) {
        if (sessoes.length === 0) {
          container.innerHTML =
            "<p style='color: #666; font-size: 14px'>Nenhuma sessão disponível.</p>";
        } else {
          let html = "";
          sessoes.forEach((sessao) => {
            html += `
              <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer">
                <input type="checkbox" value="${sessao.slug}" style="width: auto; margin-right: 8px" />
                <span>${sessao.nome} <small style="color: #999">(${sessao.slug})</small></span>
              </label>
            `;
          });
          container.innerHTML = html;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar sessões para template:", error);
    }
  }

  async function carregarConfiguracoesParaTemplate() {
    if (!supabaseClient) return;
    try {
      const { data: configuracoes } = await supabaseClient
        .from("instacar_configuracoes_empresa")
        .select("chave, titulo, categoria")
        .eq("ativo", true)
        .order("categoria", { ascending: true })
        .order("titulo", { ascending: true });

      const container = document.getElementById(
        "templateConfiguracoesHabilitadas"
      );
      if (container && configuracoes) {
        if (configuracoes.length === 0) {
          container.innerHTML =
            "<p style='color: #666; font-size: 14px'>Nenhuma configuração disponível.</p>";
        } else {
          let html = "";
          configuracoes.forEach((config) => {
            html += `
              <label style="display: flex; align-items: center; margin-bottom: 8px; cursor: pointer">
                <input type="checkbox" value="${config.chave}" style="width: auto; margin-right: 8px" />
                <span>${config.titulo} <small style="color: #999">(${config.chave})</small></span>
              </label>
            `;
          });
          container.innerHTML = html;
        }
      }
    } catch (error) {
      console.error("Erro ao carregar configurações para template:", error);
    }
  }

  async function toggleAtivoTemplate(id, novoEstado) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { error } = await supabaseClient
        .from("instacar_templates_prompt")
        .update({ ativo: novoEstado })
        .eq("id", id);

      if (error) throw error;

      mostrarAlerta(
        `Template ${novoEstado ? "ativado" : "desativado"} com sucesso!`,
        "success"
      );
      carregarTemplatesPrompt();
    } catch (error) {
      mostrarAlerta("Erro ao alterar status: " + error.message, "error");
      console.error(error);
    }
  }

  // ============================================================================
  // Funções para Configuração de Dias da Semana e Intervalo de Almoço
  // ============================================================================

  /**
   * Alterna visibilidade dos campos de intervalo de almoço
   */
  function toggleCamposAlmoco() {
    const checkbox = document.getElementById("pausar_almoco");
    const camposDiv = document.getElementById("campos_almoco");
    if (checkbox && camposDiv) {
      camposDiv.style.display = checkbox.checked ? "block" : "none";
      atualizarEstimativas();
    }
  }

  /**
   * Alterna entre configuração padrão e individual de dias da semana
   */
  function toggleConfiguracaoDiasSemana() {
    const modoPadrao = document.getElementById("modo_configuracao_padrao");
    const modoIndividual = document.getElementById("modo_configuracao_individual");
    const divPadrao = document.getElementById("configuracao_padrao_dias");
    const divIndividual = document.getElementById("configuracao_individual_dias");

    if (modoPadrao && modoIndividual && divPadrao && divIndividual) {
      if (modoPadrao.checked) {
        divPadrao.style.display = "block";
        divIndividual.style.display = "none";
      } else {
        divPadrao.style.display = "none";
        divIndividual.style.display = "block";
        if (!document.getElementById("tabela_dias_semana").innerHTML.trim()) {
          inicializarTabelaDiasSemana();
        }
      }
      atualizarEstimativas();
    }
  }

  /**
   * Inicializa a tabela de configuração de dias da semana
   */
  function inicializarTabelaDiasSemana() {
    const tbody = document.getElementById("tabela_dias_semana");
    if (!tbody) return;

    const dias = [
      { nome: "Segunda", chave: "segunda" },
      { nome: "Terça", chave: "terca" },
      { nome: "Quarta", chave: "quarta" },
      { nome: "Quinta", chave: "quinta" },
      { nome: "Sexta", chave: "sexta" },
      { nome: "Sábado", chave: "sabado" },
      { nome: "Domingo", chave: "domingo" },
    ];

    const horarioInicio = document.getElementById("horario_inicio")?.value || "09:00";
    const horarioFim = document.getElementById("horario_fim")?.value || "18:00";
    const processarFinaisSemana = document.getElementById("processar_finais_semana")?.checked || false;

    tbody.innerHTML = dias
      .map((dia) => {
        const ehFimSemana = dia.chave === "sabado" || dia.chave === "domingo";
        const habilitado = !ehFimSemana || processarFinaisSemana;
        const horarioInicioDia = habilitado ? horarioInicio : "";
        const horarioFimDia = habilitado ? horarioFim : "";

        return `
          <tr>
            <td style="padding: 8px; font-weight: 600">${dia.nome}</td>
            <td style="padding: 8px; text-align: center">
              <input
                type="checkbox"
                id="dia_${dia.chave}_habilitado"
                ${habilitado ? "checked" : ""}
                onchange="atualizarEstimativas()"
                style="width: auto"
              />
            </td>
            <td style="padding: 8px">
              <input
                type="time"
                id="dia_${dia.chave}_inicio"
                value="${horarioInicioDia}"
                ${!habilitado ? "disabled" : ""}
                onchange="atualizarEstimativas()"
                style="width: 100%"
              />
            </td>
            <td style="padding: 8px">
              <input
                type="time"
                id="dia_${dia.chave}_fim"
                value="${horarioFimDia}"
                ${!habilitado ? "disabled" : ""}
                onchange="atualizarEstimativas()"
                style="width: 100%"
              />
            </td>
          </tr>
        `;
      })
      .join("");

    // Adicionar listeners para habilitar/desabilitar campos de horário
    dias.forEach((dia) => {
      const checkbox = document.getElementById(`dia_${dia.chave}_habilitado`);
      const inputInicio = document.getElementById(`dia_${dia.chave}_inicio`);
      const inputFim = document.getElementById(`dia_${dia.chave}_fim`);

      if (checkbox && inputInicio && inputFim) {
        checkbox.addEventListener("change", function () {
          inputInicio.disabled = !this.checked;
          inputFim.disabled = !this.checked;
          if (!this.checked) {
            inputInicio.value = "";
            inputFim.value = "";
          } else {
            // Aplicar horário padrão se estiver vazio
            if (!inputInicio.value) {
              inputInicio.value = horarioInicio;
            }
            if (!inputFim.value) {
              inputFim.value = horarioFim;
            }
          }
          atualizarEstimativas();
        });
      }
    });
  }

  /**
   * Aplica horário padrão a todos os dias habilitados
   */
  function aplicarHorarioPadrao() {
    const horarioInicio = document.getElementById("horario_inicio")?.value || "09:00";
    const horarioFim = document.getElementById("horario_fim")?.value || "18:00";

    const dias = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];

    dias.forEach((dia) => {
      const checkbox = document.getElementById(`dia_${dia}_habilitado`);
      const inputInicio = document.getElementById(`dia_${dia}_inicio`);
      const inputFim = document.getElementById(`dia_${dia}_fim`);

      if (checkbox && checkbox.checked && inputInicio && inputFim) {
        inputInicio.value = horarioInicio;
        inputFim.value = horarioFim;
      }
    });

    atualizarEstimativas();
    mostrarAlerta("Horário padrão aplicado a todos os dias habilitados", "success");
  }

  /**
   * Salva configuração de dias da semana em formato JSONB
   */
  function salvarConfiguracaoDiasSemana() {
    const modoIndividual = document.getElementById("modo_configuracao_individual")?.checked;
    
    if (!modoIndividual) {
      return null; // Usar configuração padrão
    }

    const dias = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const configuracao = {};

    dias.forEach((dia) => {
      const checkbox = document.getElementById(`dia_${dia}_habilitado`);
      const inputInicio = document.getElementById(`dia_${dia}_inicio`);
      const inputFim = document.getElementById(`dia_${dia}_fim`);

      if (checkbox && inputInicio && inputFim) {
        const habilitado = checkbox.checked;
        configuracao[dia] = {
          habilitado: habilitado,
          horario_inicio: habilitado && inputInicio.value ? normalizarHora(inputInicio.value) : null,
          horario_fim: habilitado && inputFim.value ? normalizarHora(inputFim.value) : null,
        };
      }
    });

    return configuracao;
  }

  /**
   * Carrega configuração de dias da semana do banco de dados
   */
  function carregarConfiguracaoDiasSemana(configuracaoDiasSemana, horarioInicio, horarioFim, processarFinaisSemana) {
    if (!configuracaoDiasSemana) {
      // Usar configuração padrão
      document.getElementById("modo_configuracao_padrao").checked = true;
      toggleConfiguracaoDiasSemana();
      return;
    }

    // Usar configuração individual
    document.getElementById("modo_configuracao_individual").checked = true;
    toggleConfiguracaoDiasSemana();

    // Preencher tabela com valores do banco
    Object.keys(configuracaoDiasSemana).forEach((dia) => {
      const config = configuracaoDiasSemana[dia];
      const checkbox = document.getElementById(`dia_${dia}_habilitado`);
      const inputInicio = document.getElementById(`dia_${dia}_inicio`);
      const inputFim = document.getElementById(`dia_${dia}_fim`);

      if (checkbox && inputInicio && inputFim) {
        checkbox.checked = config.habilitado || false;
        inputInicio.value = config.horario_inicio || "";
        inputFim.value = config.horario_fim || "";
        inputInicio.disabled = !checkbox.checked;
        inputFim.disabled = !checkbox.checked;
      }
    });
  }

  // Expor funções globalmente
  window.toggleCamposAlmoco = toggleCamposAlmoco;
  window.toggleConfiguracaoDiasSemana = toggleConfiguracaoDiasSemana;
  window.aplicarHorarioPadrao = aplicarHorarioPadrao;

  // Expor funções globalmente
  window.carregarConfiguracoesEmpresa = carregarConfiguracoesEmpresa;
  window.salvarConfiguracaoEmpresa = salvarConfiguracaoEmpresa;
  window.editarConfiguracaoEmpresa = editarConfiguracaoEmpresa;
  window.abrirModalConfiguracaoEmpresa = abrirModalConfiguracaoEmpresa;
  window.fecharModalConfiguracaoEmpresa = fecharModalConfiguracaoEmpresa;
  window.abrirModalFormConfiguracaoEmpresa = abrirModalFormConfiguracaoEmpresa;
  window.fecharModalFormConfiguracaoEmpresa =
    fecharModalFormConfiguracaoEmpresa;
  window.toggleAtivoConfiguracao = toggleAtivoConfiguracao;
  window.carregarSessoesContexto = carregarSessoesContexto;
  window.salvarSessaoContexto = salvarSessaoContexto;
  window.editarSessaoContexto = editarSessaoContexto;
  window.abrirModalSessaoContexto = abrirModalSessaoContexto;
  window.fecharModalSessaoContexto = fecharModalSessaoContexto;
  window.abrirModalFormSessaoContexto = abrirModalFormSessaoContexto;
  window.toggleAtivoSessao = toggleAtivoSessao;
  window.carregarTemplatesPrompt = carregarTemplatesPrompt;
  window.salvarTemplatePrompt = salvarTemplatePrompt;
  window.editarTemplatePrompt = editarTemplatePrompt;
  window.abrirModalTemplatePrompt = abrirModalTemplatePrompt;
  window.fecharModalTemplatePrompt = fecharModalTemplatePrompt;
  window.abrirModalFormTemplatePrompt = abrirModalFormTemplatePrompt;
  window.toggleAtivoTemplate = toggleAtivoTemplate;

  // ============================================================================
  // Funções de Carregamento de Páginas (Sistema de Rotas)
  // ============================================================================
  
  /**
   * Carrega a página do Dashboard
   */
  window.loadPageDashboard = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    // Ocultar conteúdo legacy se existir
    const legacyContent = document.getElementById("legacyContent");
    if (legacyContent) {
      legacyContent.style.display = "none";
    }
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      
      <div class="p-6" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 stats-grid" style="gap: 1rem; display: grid;">
          <div class="card-elevated hover-lift" style="padding: 1rem;" id="totalClientes">
            <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.75rem;">
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.025em;">Total de Clientes</p>
                <p class="metric-value" style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-family-display); color: hsl(var(--foreground)); line-height: 1.2; margin: 0 0 0.25rem 0;">-</p>
                <p class="metric-description" style="font-size: 0.75rem; font-weight: 400; color: hsl(var(--muted-foreground)); margin: 0;">Base de contatos</p>
              </div>
              <div style="padding: 0.625rem; border-radius: 0.5rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.5rem; height: 2.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
            </div>
          </div>
          <div class="card-elevated hover-lift" style="padding: 1rem;" id="mensagensEnviadas">
            <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.75rem;">
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.025em;">Mensagens Enviadas</p>
                <p class="metric-value" style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-family-display); color: hsl(var(--foreground)); line-height: 1.2; margin: 0 0 0.25rem 0;">-</p>
                <p class="metric-description" style="font-size: 0.75rem; font-weight: 400; color: hsl(var(--muted-foreground)); margin: 0;">Total histórico</p>
              </div>
              <div style="padding: 0.625rem; border-radius: 0.5rem; background: hsl(var(--success) / 0.1); color: hsl(var(--success)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.5rem; height: 2.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
              </div>
            </div>
          </div>
          <div class="card-elevated hover-lift" style="padding: 1rem;" id="taxaEntrega">
            <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.75rem;">
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.025em;">Taxa de Entrega</p>
                <p class="metric-value" style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-family-display); color: hsl(var(--success)); line-height: 1.2; margin: 0 0 0.25rem 0;">-</p>
                <p class="metric-description" style="font-size: 0.75rem; font-weight: 400; color: hsl(var(--success)); margin: 0;">Mensagens com sucesso</p>
              </div>
              <div style="padding: 0.625rem; border-radius: 0.5rem; background: hsl(var(--info) / 0.1); color: hsl(var(--info)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.5rem; height: 2.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
            </div>
          </div>
          <div class="card-elevated hover-lift" style="padding: 1rem;" id="campanhasAtivas">
            <div style="display: flex; align-items: start; justify-content: space-between; gap: 0.75rem;">
              <div style="flex: 1; min-width: 0;">
                <p style="font-size: 0.75rem; font-weight: 500; color: hsl(var(--muted-foreground)); margin: 0 0 0.5rem 0; text-transform: uppercase; letter-spacing: 0.025em;">Campanhas Ativas</p>
                <p class="metric-value" style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-family-display); color: hsl(var(--foreground)); line-height: 1.2; margin: 0 0 0.25rem 0;">-</p>
                <p class="metric-description" style="font-size: 0.75rem; font-weight: 400; color: hsl(var(--muted-foreground)); margin: 0;">-</p>
              </div>
              <div style="padding: 0.625rem; border-radius: 0.5rem; background: hsl(var(--accent) / 0.1); color: hsl(var(--accent)); display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 2.5rem; height: 2.5rem;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Main Content -->
        <div class="dashboard-main-grid" style="display: grid; gap: 1.5rem;">
          <div class="campanhas-section">
            <div class="card-elevated" style="padding: 1.5rem;">
              <h3 style="font-family: var(--font-family-display); font-weight: 600; font-size: 1.125rem; color: hsl(var(--foreground)); margin: 0 0 1.25rem 0;">Campanhas em Andamento</h3>
              <div id="campanhasContainer" style="display: flex; flex-direction: column; gap: 0;">
                <div class="loading" style="padding: 2rem;"><p>Carregando campanhas...</p></div>
              </div>
            </div>
          </div>
          <div class="atividade-section">
            <div class="card-elevated" style="padding: 1.5rem;">
              <h3 style="font-family: var(--font-family-display); font-weight: 600; font-size: 1.125rem; color: hsl(var(--foreground)); margin: 0 0 1rem 0;">Atividade Recente</h3>
              <div id="atividadeRecente" style="max-height: 400px; overflow-y: auto;">
                <div class="loading" style="padding: 2rem;"><p>Carregando...</p></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Quick Actions -->
        <div class="grid grid-cols-1 md:grid-cols-3" style="gap: 1rem; margin-top: 1.5rem;">
          <button onclick="abrirModalNovaCampanha()" class="card-elevated card-interactive group" style="padding: 1.25rem; text-align: left; border: none; background: none; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 1rem;">
            <div class="quick-action-icon" style="padding: 0.875rem; border-radius: 0.625rem; background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 3rem; height: 3rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-weight: 600; font-size: 1rem; color: hsl(var(--foreground)); margin: 0 0 0.25rem 0;">Nova Campanha</h4>
              <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.4;">Criar disparo em massa</p>
            </div>
          </button>
          
          <button onclick="navegarPara('/clientes')" class="card-elevated card-interactive group" style="padding: 1.25rem; text-align: left; border: none; background: none; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 1rem;">
            <div class="quick-action-icon" style="padding: 0.875rem; border-radius: 0.625rem; background: hsl(var(--success) / 0.1); color: hsl(var(--success)); transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 3rem; height: 3rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-weight: 600; font-size: 1rem; color: hsl(var(--foreground)); margin: 0 0 0.25rem 0;">Gerenciar Clientes</h4>
              <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.4;">Base de contatos</p>
            </div>
          </button>
          
          <button onclick="navegarPara('/templates')" class="card-elevated card-interactive group" style="padding: 1.25rem; text-align: left; border: none; background: none; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 1rem;">
            <div class="quick-action-icon" style="padding: 0.875rem; border-radius: 0.625rem; background: hsl(var(--accent) / 0.1); color: hsl(var(--accent)); transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 3rem; height: 3rem;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 style="font-weight: 600; font-size: 1rem; color: hsl(var(--foreground)); margin: 0 0 0.25rem 0;">Templates</h4>
              <p style="font-size: 0.8125rem; color: hsl(var(--muted-foreground)); margin: 0; line-height: 1.4;">Modelos de mensagem</p>
            </div>
          </button>
        </div>
      </div>
    `;
    
    // Carregar dados após renderizar o HTML
    setTimeout(() => {
      // Aguardar Supabase estar disponível
      const tentarCarregar = () => {
        if (window.supabaseClient || supabaseClient) {
          if (typeof window.carregarMetricas === "function") {
            window.carregarMetricas();
          }
          if (typeof window.carregarAtividadeRecente === "function") {
            window.carregarAtividadeRecente();
          }
          if (typeof window.carregarCampanhas === "function") {
            window.carregarCampanhas();
          } else if (typeof carregarCampanhas === "function") {
            carregarCampanhas();
          }
        } else {
          // Tentar novamente após 1 segundo
          setTimeout(tentarCarregar, 1000);
        }
      };
      tentarCarregar();
    }, 100);
  };

  /**
   * Carrega a página de Campanhas
   */
  window.loadPageCampanhas = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    // Ocultar conteúdo legacy se existir
    const legacyContent = document.getElementById("legacyContent");
    if (legacyContent) {
      legacyContent.style.display = "none";
    }
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      
      <div class="p-6" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Actions Bar -->
        <div class="card-elevated" style="padding: 1.5rem;">
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; flex-direction: row; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <div style="position: relative; flex: 1; min-width: 200px; max-width: 28rem;">
                <svg style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); pointer-events: none;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input type="text" id="buscaCampanhas" class="form-input" placeholder="Buscar campanhas..." 
                       style="padding-left: 2.5rem; width: 100%;" 
                       onkeyup="if(typeof window.filtrarCampanhas === 'function') window.filtrarCampanhas(this.value)" />
              </div>
              <button onclick="abrirModalNovaCampanha()" class="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Nova Campanha
              </button>
            </div>
          </div>
        </div>

        <!-- Campaigns Grid -->
        <div id="campanhasContainer" style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
          <div class="card-elevated" style="padding: 2rem; text-align: center;">
            <p style="color: hsl(var(--muted-foreground)); margin: 0;">Carregando campanhas...</p>
          </div>
        </div>
      </div>
    `;
    
    // Criar filtros avançados se disponível
    if (window.filtersSystem) {
      window.filtersSystem.criarFiltrosCampanhas("filtrosCampanhasContainer", (tipo, filtros) => {
        // Aplicar filtros e recarregar
        if (typeof carregarCampanhas === "function") {
          carregarCampanhas();
        }
      });
    }
    
    // Recarregar campanhas
    setTimeout(() => {
      const tentarCarregar = () => {
        if (window.supabaseClient || supabaseClient) {
          if (typeof window.carregarCampanhas === "function") {
            window.carregarCampanhas();
          } else if (typeof carregarCampanhas === "function") {
            carregarCampanhas();
          }
        } else {
          setTimeout(tentarCarregar, 500);
        }
      };
      tentarCarregar();
    }, 100);
  };

  /**
   * Carrega a página de Clientes
   */
  window.loadPageClientes = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      
      <!-- Header -->
      <header style="position: sticky; top: 0; z-index: 30; background: hsl(var(--background) / 0.8); backdrop-filter: blur(12px); border-bottom: 1px solid hsl(var(--border));">
        <div style="display: flex; align-items: center; justify-content: space-between; height: 4rem; padding: 0 1.5rem;">
          <div>
            <h1 style="font-family: var(--font-family-display, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif); font-size: 1.25rem; font-weight: 700; color: hsl(var(--foreground)); margin: 0;">Clientes</h1>
            <p style="font-size: 0.875rem; color: hsl(var(--muted-foreground)); margin: 0;">Gerencie sua base de contatos</p>
          </div>
        </div>
      </header>
      
      <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Actions Bar -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; flex-direction: row; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div style="display: flex; gap: 0.75rem; flex: 1;">
              <div style="position: relative; flex: 1; max-width: 28rem;">
                <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); display: flex; align-items: center; pointer-events: none;">
                  ${getIconSVG('search', 18)}
                </span>
                <input type="text" id="buscaClientes" class="form-input" placeholder="Buscar por nome, telefone ou email..." 
                       style="padding-left: 2.5rem;" onkeyup="if(event.key==='Enter' || this.value.length >= 3 || this.value.length === 0) window.carregarListaClientes()" />
              </div>
              <button onclick="abrirModalFiltrosClientes()" class="btn btn-outline" style="display: flex; align-items: center; gap: 0.5rem;">
                ${getIconSVG('filter', 18)}
                Filtros
              </button>
            </div>
            <div style="display: flex; gap: 0.75rem;">
              <button onclick="navegarPara('/')" class="btn btn-outline" style="display: flex; align-items: center; gap: 0.5rem;">
                ${getIconSVG('upload', 18)}
                Importar
              </button>
              <button onclick="abrirModalNovoCliente()" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
                ${getIconSVG('plus', 18)}
                Novo Cliente
              </button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="card-elevated" style="overflow: visible;">
          <table class="data-table" style="overflow: visible;">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Contato</th>
                <th>Veículos</th>
                <th>WhatsApp</th>
                <th>Envios</th>
                <th>Status</th>
                <th>Último Envio</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="clientesContainer">
              <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                  <div class="loading">
                    <p>Carregando clientes...</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div id="paginacaoClientes" style="display: flex; align-items: center; justify-content: space-between;"></div>
      </div>
    `;
    
    // Criar filtros avançados se disponível
    if (window.filtersSystem) {
      window.filtersSystem.criarFiltrosClientes("filtrosClientesContainer", (tipo, filtros) => {
        // Aplicar filtros e recarregar
        window.carregarListaClientes();
      });
    }
    
    // Recarregar clientes
    setTimeout(() => {
      const tentarCarregar = () => {
        if (window.supabaseClient || supabaseClient) {
          if (typeof window.carregarListaClientes === "function") {
            window.carregarListaClientes();
          } else if (typeof carregarListaClientes === "function") {
            carregarListaClientes();
          }
        } else {
          setTimeout(tentarCarregar, 500);
        }
      };
      tentarCarregar();
    }, 100);
  };

  /**
   * Abre modal de filtros para a lista de clientes
   */
  window.abrirModalFiltrosClientes = function() {
    // Obter valores atuais dos filtros (se existirem)
    const buscaAtual = document.getElementById("buscaClientes")?.value || "";
    const statusAtual = document.getElementById("filtroStatusWhatsapp")?.value || "";
    const ordenacaoCampoAtual = document.getElementById("ordenacaoCampo")?.value || "nome_cliente";
    const ordenacaoDirecaoAtual = document.getElementById("ordenacaoDirecao")?.value || "asc";
    const itensPorPaginaAtual = document.getElementById("itensPorPagina")?.value || "25";
    const bloqueadoAtual = document.getElementById("filtroBloqueado")?.value || "";
    const veiculosAtual = document.getElementById("filtroVeiculos")?.value || "";

    // Criar modal HTML
    const modalHtml = `
      <div id="modalFiltrosClientes" class="modal active">
        <div class="modal-content" style="max-width: 600px; width: 95%;">
          <div class="modal-header">
            <h2 class="modal-title">🔍 Filtros e Ordenação</h2>
            <button class="close" onclick="fecharModalFiltrosClientes()">&times;</button>
          </div>
          <form id="formFiltrosClientes" onsubmit="event.preventDefault(); aplicarFiltrosClientes();">
            <!-- Busca -->
            <div class="form-group">
              <label class="form-label">Buscar</label>
              <input 
                type="text" 
                id="filtroBuscaClientes" 
                class="form-input" 
                placeholder="Nome, telefone ou email..."
                value="${buscaAtual}"
              />
            </div>

            <!-- Filtro Status WhatsApp -->
            <div class="form-group">
              <label class="form-label">Status WhatsApp</label>
              <select id="filtroStatusWhatsappModal" class="form-select">
                <option value="">Todos os status</option>
                <option value="valid" ${statusAtual === "valid" ? "selected" : ""}>✅ WhatsApp Válido</option>
                <option value="invalid" ${statusAtual === "invalid" ? "selected" : ""}>❌ WhatsApp Inválido</option>
                <option value="unknown" ${statusAtual === "unknown" ? "selected" : ""}>❓ Não Verificado</option>
              </select>
            </div>

            <!-- Filtro Bloqueio -->
            <div class="form-group">
              <label class="form-label">Status de Bloqueio</label>
              <select id="filtroBloqueadoModal" class="form-select">
                <option value="">Todos</option>
                <option value="false" ${bloqueadoAtual === "false" ? "selected" : ""}>✅ Permitir Envios</option>
                <option value="true" ${bloqueadoAtual === "true" ? "selected" : ""}>🚫 Bloqueado</option>
              </select>
            </div>

            <!-- Filtro Veículos -->
            <div class="form-group">
              <label class="form-label">Quantidade de Veículos</label>
              <select id="filtroVeiculosModal" class="form-select">
                <option value="">Todos</option>
                <option value="0" ${veiculosAtual === "0" ? "selected" : ""}>0 veículos</option>
                <option value="1" ${veiculosAtual === "1" ? "selected" : ""}>1 veículo</option>
                <option value="2" ${veiculosAtual === "2" ? "selected" : ""}>2 veículos</option>
                <option value="3" ${veiculosAtual === "3" ? "selected" : ""}>3 veículos</option>
                <option value="4+" ${veiculosAtual === "4+" ? "selected" : ""}>4 ou mais veículos</option>
              </select>
            </div>

            <!-- Ordenação -->
            <div class="form-section">
              <h3>Ordenação</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Ordenar por</label>
                  <select id="ordenacaoCampoModal" class="form-select">
                    <option value="nome_cliente" ${ordenacaoCampoAtual === "nome_cliente" ? "selected" : ""}>Nome (A-Z)</option>
                    <option value="ultimo_envio" ${ordenacaoCampoAtual === "ultimo_envio" ? "selected" : ""}>Último Envio</option>
                    <option value="num_veiculos" ${ordenacaoCampoAtual === "num_veiculos" ? "selected" : ""}>Número de Veículos</option>
                    <option value="status_whatsapp" ${ordenacaoCampoAtual === "status_whatsapp" ? "selected" : ""}>Status WhatsApp</option>
                    <option value="bloqueado_envios" ${ordenacaoCampoAtual === "bloqueado_envios" ? "selected" : ""}>Status Bloqueio</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Direção</label>
                  <select id="ordenacaoDirecaoModal" class="form-select">
                    <option value="asc" ${ordenacaoDirecaoAtual === "asc" ? "selected" : ""}>Crescente ↑</option>
                    <option value="desc" ${ordenacaoDirecaoAtual === "desc" ? "selected" : ""}>Decrescente ↓</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Itens por página -->
            <div class="form-group">
              <label class="form-label">Itens por página</label>
              <select id="itensPorPaginaModal" class="form-select">
                <option value="10" ${itensPorPaginaAtual === "10" ? "selected" : ""}>10</option>
                <option value="25" ${itensPorPaginaAtual === "25" ? "selected" : ""}>25</option>
                <option value="50" ${itensPorPaginaAtual === "50" ? "selected" : ""}>50</option>
                <option value="100" ${itensPorPaginaAtual === "100" ? "selected" : ""}>100</option>
              </select>
            </div>

            <!-- Ações -->
            <div class="form-actions">
              <button type="button" onclick="limparFiltrosClientes()" class="btn btn-outline">
                Limpar Filtros
              </button>
              <button type="submit" class="btn btn-primary">
                Aplicar Filtros
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Remover modal anterior se existir
    const modalAnterior = document.getElementById("modalFiltrosClientes");
    if (modalAnterior) {
      modalAnterior.remove();
    }

    // Adicionar modal ao DOM
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Fechar ao clicar fora do modal
    const modal = document.getElementById("modalFiltrosClientes");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          fecharModalFiltrosClientes();
        }
      });
    }
  };

  /**
   * Fecha o modal de filtros
   */
  window.fecharModalFiltrosClientes = function() {
    const modal = document.getElementById("modalFiltrosClientes");
    if (modal) {
      modal.remove();
    }
  };

  /**
   * Aplica os filtros selecionados
   */
  window.aplicarFiltrosClientes = function() {
    // Obter valores do modal
    const busca = document.getElementById("filtroBuscaClientes")?.value || "";
    const status = document.getElementById("filtroStatusWhatsappModal")?.value || "";
    const bloqueado = document.getElementById("filtroBloqueadoModal")?.value || "";
    const veiculos = document.getElementById("filtroVeiculosModal")?.value || "";
    const ordenacaoCampo = document.getElementById("ordenacaoCampoModal")?.value || "nome_cliente";
    const ordenacaoDirecao = document.getElementById("ordenacaoDirecaoModal")?.value || "asc";
    const itensPorPagina = document.getElementById("itensPorPaginaModal")?.value || "25";

    // Aplicar valores aos campos da página (se existirem)
    const buscaInput = document.getElementById("buscaClientes");
    if (buscaInput) buscaInput.value = busca;

    // Criar ou atualizar campos ocultos para armazenar filtros
    let filtroStatusInput = document.getElementById("filtroStatusWhatsapp");
    if (!filtroStatusInput) {
      filtroStatusInput = document.createElement("input");
      filtroStatusInput.type = "hidden";
      filtroStatusInput.id = "filtroStatusWhatsapp";
      document.body.appendChild(filtroStatusInput);
    }
    filtroStatusInput.value = status;

    let filtroBloqueadoInput = document.getElementById("filtroBloqueado");
    if (!filtroBloqueadoInput) {
      filtroBloqueadoInput = document.createElement("input");
      filtroBloqueadoInput.type = "hidden";
      filtroBloqueadoInput.id = "filtroBloqueado";
      document.body.appendChild(filtroBloqueadoInput);
    }
    filtroBloqueadoInput.value = bloqueado;

    let filtroVeiculosInput = document.getElementById("filtroVeiculos");
    if (!filtroVeiculosInput) {
      filtroVeiculosInput = document.createElement("input");
      filtroVeiculosInput.type = "hidden";
      filtroVeiculosInput.id = "filtroVeiculos";
      document.body.appendChild(filtroVeiculosInput);
    }
    filtroVeiculosInput.value = veiculos;

    let ordenacaoCampoInput = document.getElementById("ordenacaoCampo");
    if (!ordenacaoCampoInput) {
      ordenacaoCampoInput = document.createElement("input");
      ordenacaoCampoInput.type = "hidden";
      ordenacaoCampoInput.id = "ordenacaoCampo";
      document.body.appendChild(ordenacaoCampoInput);
    }
    ordenacaoCampoInput.value = ordenacaoCampo;

    let ordenacaoDirecaoInput = document.getElementById("ordenacaoDirecao");
    if (!ordenacaoDirecaoInput) {
      ordenacaoDirecaoInput = document.createElement("input");
      ordenacaoDirecaoInput.type = "hidden";
      ordenacaoDirecaoInput.id = "ordenacaoDirecao";
      document.body.appendChild(ordenacaoDirecaoInput);
    }
    ordenacaoDirecaoInput.value = ordenacaoDirecao;

    let itensPorPaginaSelect = document.getElementById("itensPorPagina");
    if (!itensPorPaginaSelect) {
      itensPorPaginaSelect = document.createElement("select");
      itensPorPaginaSelect.id = "itensPorPagina";
      itensPorPaginaSelect.style.display = "none";
      document.body.appendChild(itensPorPaginaSelect);
    }
    itensPorPaginaSelect.value = itensPorPagina;

    // Fechar modal
    window.fecharModalFiltrosClientes();

    // Resetar para página 1 e recarregar
    if (typeof window.paginaAtualClientes !== "undefined") {
      window.paginaAtualClientes = 1;
    }
    if (typeof window.carregarListaClientes === "function") {
      window.carregarListaClientes(1);
    } else if (typeof carregarListaClientes === "function") {
      carregarListaClientes(1);
    }
  };

  /**
   * Limpa todos os filtros
   */
  window.limparFiltrosClientes = function() {
    // Limpar campos do modal
    const buscaInput = document.getElementById("filtroBuscaClientes");
    if (buscaInput) buscaInput.value = "";

    const statusSelect = document.getElementById("filtroStatusWhatsappModal");
    if (statusSelect) statusSelect.value = "";

    const bloqueadoSelect = document.getElementById("filtroBloqueadoModal");
    if (bloqueadoSelect) bloqueadoSelect.value = "";

    const veiculosSelect = document.getElementById("filtroVeiculosModal");
    if (veiculosSelect) veiculosSelect.value = "";

    const ordenacaoCampoSelect = document.getElementById("ordenacaoCampoModal");
    if (ordenacaoCampoSelect) ordenacaoCampoSelect.value = "nome_cliente";

    const ordenacaoDirecaoSelect = document.getElementById("ordenacaoDirecaoModal");
    if (ordenacaoDirecaoSelect) ordenacaoDirecaoSelect.value = "asc";

    const itensPorPaginaSelect = document.getElementById("itensPorPaginaModal");
    if (itensPorPaginaSelect) itensPorPaginaSelect.value = "25";
  };

  /**
   * Carrega a página de Templates
   */
  window.loadPageTemplates = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      
      <div style="padding: 1.5rem; space-y: 1.5rem;">
        <!-- Actions Bar -->
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="display: flex; flex-direction: row; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
            <div style="position: relative; flex: 1; max-width: 28rem;">
              <span style="position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); font-size: 18px;">🔍</span>
              <input type="text" id="buscaTemplates" class="form-input" placeholder="Buscar templates..." 
                     style="padding-left: 2.5rem;" onkeyup="if(typeof window.filtrarTemplates === 'function') window.filtrarTemplates(this.value)" />
            </div>
            <button onclick="abrirModalFormTemplatePrompt()" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem;">
              <span>+</span> Novo Template
            </button>
          </div>
        </div>

        <!-- Templates Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style="gap: 1rem;">
          <div id="listaTemplatesPrompt" class="loading" style="grid-column: span 3;">
            <p>Carregando templates...</p>
          </div>
        </div>
      </div>
    `;
    
    // Recarregar templates
    setTimeout(() => {
      if (typeof carregarTemplatesPrompt === "function") {
        carregarTemplatesPrompt();
      } else if (supabaseClient) {
        setTimeout(() => {
          if (typeof window.carregarTemplatesPrompt === "function") {
            window.carregarTemplatesPrompt();
          }
        }, 500);
      }
    }, 100);
  };

  /**
   * Carrega a página de Agendamentos
   */
  window.loadPageAgendamentos = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Agendamentos</h2>
        </div>
        <div class="card-body">
          <p>Funcionalidade de agendamentos em desenvolvimento...</p>
        </div>
      </div>
    `;
  };

  /**
   * Carrega a página de Histórico
   */
  window.loadPageHistorico = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Histórico de Envios</h2>
          <button onclick="abrirModalRelatorios()" class="btn btn-primary">📊 Gerar Relatório</button>
        </div>
        <div class="card-body">
          <div style="margin-bottom: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
            <div class="card" style="padding: 15px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6;" id="totalRegistros">-</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Total Registros</div>
            </div>
            <div class="card" style="padding: 15px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;" id="totalEnviados">-</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Enviados</div>
            </div>
            <div class="card" style="padding: 15px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: #ef4444;" id="totalErros">-</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Erros</div>
            </div>
            <div class="card" style="padding: 15px; text-align: center;">
              <div style="font-size: 1.5rem; font-weight: 700; color: #f59e0b;" id="totalBloqueados">-</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">Bloqueados</div>
            </div>
          </div>
          <div style="margin-bottom: 15px;">
            <input type="text" id="buscaHistorico" class="form-input" placeholder="Buscar por cliente, telefone ou campanha..." 
                   style="max-width: 400px;" onkeyup="if(event.key==='Enter' || this.value.length >= 3 || this.value.length === 0) window.carregarHistoricoEnvios ? window.carregarHistoricoEnvios() : null" />
          </div>
          <div id="historicoContainer" class="loading">
            <p>Carregando histórico...</p>
          </div>
          <div id="paginacaoHistorico"></div>
        </div>
      </div>
    `;
    
    // Filtros avançados podem ser adicionados depois se necessário
    // Por enquanto, a busca básica já está disponível
    
    // Carregar histórico
    setTimeout(() => {
      const tentarCarregar = () => {
        if (window.supabaseClient || supabaseClient) {
          if (typeof window.carregarHistoricoEnvios === "function") {
            window.carregarHistoricoEnvios();
          } else {
            carregarHistoricoBasico();
          }
        } else {
          setTimeout(tentarCarregar, 500);
        }
      };
      tentarCarregar();
    }, 100);
  };
  
  /**
   * Carrega histórico básico (fallback)
   */
  async function carregarHistoricoBasico() {
    const supabase = window.supabaseClient || supabaseClient;
    if (!supabase) {
      const container = document.getElementById("historicoContainer");
      if (container) {
        container.innerHTML = '<p style="text-align: center; color: #666">Conectando ao Supabase...</p>';
      }
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("instacar_historico_envios")
        .select("*, instacar_clientes_envios(nome_cliente, telefone), instacar_campanhas(nome)")
        .order("timestamp_envio", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const container = document.getElementById("historicoContainer");
      if (!container) return;
      
      if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666">Nenhum histórico encontrado</p>';
        return;
      }
      
      // Atualizar estatísticas
      const total = data.length;
      const enviados = data.filter(e => e.status_envio === "enviado").length;
      const erros = data.filter(e => e.status_envio === "erro").length;
      const bloqueados = data.filter(e => e.status_envio === "bloqueado").length;
      
      const totalEl = document.getElementById("totalRegistros");
      const enviadosEl = document.getElementById("totalEnviados");
      const errosEl = document.getElementById("totalErros");
      const bloqueadosEl = document.getElementById("totalBloqueados");
      
      if (totalEl) totalEl.textContent = total;
      if (enviadosEl) enviadosEl.textContent = enviados;
      if (errosEl) errosEl.textContent = erros;
      if (bloqueadosEl) bloqueadosEl.textContent = bloqueados;
      
      // Renderizar tabela
      container.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Campanha</th>
              <th>Mensagem</th>
              <th>Status</th>
              <th>Data/Hora</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(item => {
              const statusBadge = {
                enviado: '<span class="badge badge-success">Enviado</span>',
                erro: '<span class="badge badge-error">Erro</span>',
                bloqueado: '<span class="badge badge-warning">Bloqueado</span>',
                pendente: '<span class="badge badge-info">Pendente</span>'
              }[item.status_envio] || '<span class="badge">-</span>';
              
              const dataFormatada = formatarTimestampSP(item.timestamp_envio);
              const mensagem = (item.mensagem_texto || "").substring(0, 50) + "...";
              
              return `
                <tr>
                  <td>${item.instacar_clientes_envios?.nome_cliente || "N/A"}</td>
                  <td>${item.instacar_clientes_envios?.telefone || "N/A"}</td>
                  <td>${item.instacar_campanhas?.nome || "N/A"}</td>
                  <td title="${item.mensagem_texto || ""}">${mensagem}</td>
                  <td>${statusBadge}</td>
                  <td>${dataFormatada}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      const container = document.getElementById("historicoContainer");
      if (container) {
        container.innerHTML = `<p style="text-align: center; color: #ef4444;">Erro ao carregar histórico: ${error.message}</p>`;
      }
    }
  }

  /**
   * Carrega a página de Instâncias
   */
  window.loadPageInstancias = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Instâncias WhatsApp</h2>
          <button onclick="abrirModalNovaInstanciaUazapi()" class="btn btn-primary">+ Nova Instância</button>
        </div>
        <div class="card-body">
          <div id="instanciasUazapiList" class="loading">
            <p>Carregando instâncias...</p>
          </div>
        </div>
      </div>
    `;
    
    // Recarregar instâncias
    setTimeout(() => {
      const tentarCarregar = () => {
        if (window.supabaseClient || supabaseClient) {
          // Usar renderizarInstanciasUazapi que já renderiza na interface
          if (typeof window.renderizarInstanciasUazapi === "function") {
            window.renderizarInstanciasUazapi();
          } else if (typeof renderizarInstanciasUazapi === "function") {
            renderizarInstanciasUazapi();
          }
        } else {
          setTimeout(tentarCarregar, 500);
        }
      };
      tentarCarregar();
    }, 100);
  };

  /**
   * Carrega a página de Configurações
   */
  window.loadPageConfiguracoes = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Configurações</h2>
        </div>
        <div class="card-body">
          <button onclick="abrirModalConfiguracoes()" class="btn btn-primary">Gerenciar Configurações</button>
        </div>
      </div>
    `;
  };

  /**
   * Carrega a página de Perfil
   */
  window.loadPagePerfil = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    const userEmail = document.getElementById("userEmail")?.textContent || "usuário";
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Perfil do Usuário</h2>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" value="${userEmail}" readonly />
          </div>
          <div class="form-group">
            <label class="form-label">Preferências de Notificação</label>
            <div style="margin-top: 10px;">
              <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <input type="checkbox" checked />
                <span>Notificar quando campanha for concluída</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <input type="checkbox" checked />
                <span>Alertar sobre falhas de entrega</span>
              </label>
              <label style="display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" checked />
                <span>Notificar quando WhatsApp desconectar</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Carrega a página de Relatórios
   */
  window.loadPageRelatorios = function() {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) return;
    
    contentArea.innerHTML = `
      <div id="alertContainer"></div>
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Relatórios</h2>
          <button onclick="abrirModalRelatorios()" class="btn btn-primary">Gerar Relatório</button>
        </div>
        <div class="card-body">
          <p>Gere relatórios detalhados de campanhas, envios, clientes e erros.</p>
          <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 15px;">Tipos de Relatórios Disponíveis:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 10px; border-left: 4px solid #3b82f6; margin-bottom: 10px; background: #f8fafc;">
                <strong>Campanhas:</strong> Lista todas as campanhas com filtros de data
              </li>
              <li style="padding: 10px; border-left: 4px solid #10b981; margin-bottom: 10px; background: #f8fafc;">
                <strong>Envios:</strong> Histórico completo de envios com filtros de status e data
              </li>
              <li style="padding: 10px; border-left: 4px solid #f59e0b; margin-bottom: 10px; background: #f8fafc;">
                <strong>Clientes:</strong> Base completa de clientes com estatísticas
              </li>
              <li style="padding: 10px; border-left: 4px solid #ef4444; margin-bottom: 10px; background: #f8fafc;">
                <strong>Erros:</strong> Registro de erros críticos do sistema
              </li>
            </ul>
          </div>
          <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 15px;">Formatos de Exportação:</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <span class="badge badge-info">CSV</span>
              <span class="badge badge-info">Excel (XLSX)</span>
              <span class="badge badge-info">PDF</span>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  // Verificar se DOM já está pronto ou aguardar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarApp);
  } else {
    // DOM já está pronto, executar imediatamente
    inicializarApp();
  }
})();
