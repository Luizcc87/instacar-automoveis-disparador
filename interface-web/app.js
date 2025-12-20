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

      // Criar nova instância apenas se necessário
      supabaseClient = supabaseLib.createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });

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
          const config = carregarConfiguracoesDoLocalStorage();
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
      const config = carregarConfiguracoesDoLocalStorage();
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

    // Tentar carregar do localStorage primeiro
    const savedConfig = carregarConfiguracoesDoLocalStorage();

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
    const adminTokenInput = document.getElementById("instanciaUazapiAdminToken");
    if (adminTokenInput) adminTokenInput.value = "";
    const configExtraInput = document.getElementById(
      "instanciaUazapiConfigExtra"
    );
    if (configExtraInput) configExtraInput.value = "";

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
        const adminTokenInput = document.getElementById("instanciaUazapiAdminToken");
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
      } catch (error) {
        mostrarAlerta("Erro ao carregar instância: " + error.message, "error");
        return;
      }
    } else {
      // Nova instância
      title.textContent = "Nova Instância Uazapi";
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
   * Normaliza o nome da instância para minúsculas e kebab-case (palavras separadas por hífen)
   * @param {string} nome - Nome original da instância
   * @returns {string} - Nome normalizado em minúsculas com palavras separadas por hífen
   */
  function normalizarNomeInstancia(nome) {
    if (!nome || !nome.trim()) {
      return nome;
    }

    return nome
      .trim()
      .toLowerCase()
      // Substituir espaços, underscores e múltiplos hífens por um único hífen
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      // Remover caracteres especiais, mantendo apenas letras, números e hífens
      .replace(/[^a-z0-9-]/g, "")
      // Remover hífens no início e fim
      .replace(/^-+|-+$/g, "");
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

    // Normalizar nome para minúsculas e kebab-case
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
        uuidCurto += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
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
      const response = await fetch(`${baseUrl}/instance`, {
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
          errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // Retornar o Instance Token gerado
      return {
        success: true,
        instanceToken: data.token,
        instanceId: data.instance?.id,
        instance: data.instance,
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
  async function atualizarNomeInstanciaUazapi(baseUrl, instanceToken, novoNome) {
    try {
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
        throw new Error(
          errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`
        );
      }

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
          errorData.error || `Erro HTTP ${response.status}: ${response.statusText}`
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
    let nomeOriginal = document.getElementById("instanciaUazapiNome").value.trim();
    
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
    const adminToken = document.getElementById("instanciaUazapiAdminToken")?.value.trim() || "";
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
        mostrarAlerta("Instance Token é obrigatório para edição ou APIs que não sejam Uazapi!", "error");
        return;
      }
    } else if (tipoApi === "uazapi" && !id && !adminToken && !token) {
      mostrarAlerta("Para criar uma nova instância Uazapi, forneça o Admin Token ou o Instance Token de uma instância existente!", "error");
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
        // Se é instância Uazapi e o nome mudou, atualizar na Uazapi também
        if (instanciaExistente && instanciaExistente.tipo_api === "uazapi" && 
            instanciaExistente.base_url && instanciaExistente.token) {
          try {
            // Enviar nome completo com prefixo para a Uazapi (para identificar instâncias da Instacar no servidor)
            await atualizarNomeInstanciaUazapi(
              instanciaExistente.base_url,
              instanciaExistente.token,
              nome
            );
            console.log("Nome atualizado na Uazapi com sucesso");
          } catch (error) {
            // Se der erro ao atualizar na Uazapi, avisar mas continuar salvando no Supabase
            console.warn("Erro ao atualizar nome na Uazapi:", error);
            mostrarAlerta(
              `Aviso: Nome atualizado no banco de dados, mas houve erro ao atualizar na Uazapi: ${error.message}. ` +
              `O nome na Uazapi pode estar desatualizado.`,
              "warning"
            );
          }
        }
        
        const { data, error } = await supabaseClient
          .from("instacar_whatsapp_apis")
          .update(dados)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        result = data;
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
        mostrarAlerta("Erro ao buscar instância: " + (errorBuscar?.message || "Não encontrada"), "error");
        return;
      }

      // Se é instância Uazapi, deletar na Uazapi primeiro usando Instance Token
      if (instancia.tipo_api === "uazapi" && instancia.token && instancia.base_url) {
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
      selectCampanha.innerHTML =
        '<option value="">Selecione uma instância...</option>';

      if (ativas.length === 0) {
        selectCampanha.innerHTML =
          '<option value="">Nenhuma instância ativa configurada</option>';
        selectCampanha.disabled = true;
      } else {
        selectCampanha.disabled = false;
        ativas.forEach((instancia) => {
          const option = document.createElement("option");
          option.value = instancia.id;
          const tipoApiLabel = instancia.tipo_api
            ? `[${instancia.tipo_api.toUpperCase()}]`
            : "";
          option.textContent = `${tipoApiLabel} ${instancia.nome} (${instancia.base_url})`;
          selectCampanha.appendChild(option);
        });
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
      const config = carregarConfiguracoesDoLocalStorage();
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
      const config = carregarConfiguracoesDoLocalStorage();
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
      const config = carregarConfiguracoesDoLocalStorage();
      if (config && config.uazapiBaseUrl && config.uazapiToken) {
        return {
          baseUrl: config.uazapiBaseUrl,
          token: config.uazapiToken,
        };
      }
      return null;
    }
  }

  // Carregar configurações do localStorage (apenas N8N, Uazapi agora vem do Supabase)
  function carregarConfiguracoesDoLocalStorage() {
    const webhook = localStorage.getItem("n8nWebhookUrl");
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
  function salvarConfiguracoes() {
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

    // Salvar no localStorage (apenas N8N)
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
  function carregarConfiguracoesNoModal() {
    const config = carregarConfiguracoesDoLocalStorage();
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
  function exportarConfiguracoes() {
    const config = carregarConfiguracoesDoLocalStorage();
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
  function importarConfiguracoes() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
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

          // Salvar no localStorage (apenas N8N, Uazapi agora é gerenciado via instâncias no Supabase)
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
  function limparConfiguracoes() {
    if (
      !confirm(
        "Tem certeza que deseja limpar as configurações salvas? (N8N Webhook)\n\nNota: Instâncias Uazapi são gerenciadas no Supabase e não serão removidas."
      )
    ) {
      return;
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

    container.innerHTML = "<p>Carregando campanhas...</p>";

    try {
      const { data, error } = await supabaseClient
        .from("instacar_campanhas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data.length === 0) {
        container.innerHTML =
          "<p>Nenhuma campanha encontrada. Crie uma nova campanha!</p>";
        return;
      }

      container.innerHTML = "";
      const wrapper = document.createElement("div");
      wrapper.className =
        modoVisualizacaoCampanhas === "grid"
          ? "campanhas-grid"
          : "campanhas-list";

      data.forEach((campanha) => {
        const card = criarCardCampanha(campanha, modoVisualizacaoCampanhas);
        wrapper.appendChild(card);
      });

      container.appendChild(wrapper);

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
      container.innerHTML = `<p style="color: red;">Erro ao carregar campanhas: ${error.message}</p>`;
      console.error(error);
    }
  }

  // Criar card de campanha
  function criarCardCampanha(campanha, modo = "grid") {
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
      ? new Date(campanha.data_inicio).toLocaleDateString("pt-BR")
      : null;
    const dataFim = campanha.data_fim
      ? new Date(campanha.data_fim).toLocaleDateString("pt-BR")
      : null;
    const podeDisparar = campanha.ativo && campanha.status === "ativa";

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
          }')" class="btn-success" style="padding: 6px 12px; font-size: 12px; background: #28a745; color: white; border-color: #28a745" ${
        !podeDisparar ? "disabled" : ""
      }>
            🚀 Disparar
          </button>
          <button onclick="verExecucoes('${
            campanha.id
          }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
            📋 Histórico
          </button>
          <button onclick="abrirDashboardCampanha('${
            campanha.id
          }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
            📊 Dashboard
          </button>
        </div>
      `;
    } else {
      // Visualização em blocos (grid - layout original)
      card.innerHTML = `
        <h3>${campanha.nome || "Sem nome"}</h3>
        <span class="periodo">${periodo}</span>
        <span class="status ${statusClass}">${status}</span>
        <p class="descricao">${descricao}</p>
        <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
          <div>Limite/dia: ${limiteDia}</div>
          <div>Intervalo mínimo: ${intervaloMinimo} dias</div>
          <div>⏱️ Tempo entre envios: ${tempoEnvios}</div>
          <div>📊 Prioridade: ${prioridade}/10</div>
          ${dataInicio ? `<div>Início: ${dataInicio}</div>` : ""}
          ${dataFim ? `<div>Fim: ${dataFim}</div>` : ""}
        </div>
        <div class="actions">
          <button onclick="editarCampanha('${campanha.id}')">Editar</button>
          <button onclick="toggleAtivo('${
            campanha.id
          }', ${!campanha.ativo})" class="${
        campanha.ativo ? "btn-danger" : "btn-success"
      }">
            ${campanha.ativo ? "Desativar" : "Ativar"}
          </button>
          <button onclick="dispararCampanha('${
            campanha.id
          }')" class="btn-success" ${!podeDisparar ? "disabled" : ""}>
            Disparar
          </button>
          <button onclick="verExecucoes('${
            campanha.id
          }')" class="btn-secondary">Histórico</button>
          <button onclick="abrirDashboardCampanha('${
            campanha.id
          }')" class="btn-secondary">📊 Dashboard</button>
        </div>
      `;
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
      agendamento_cron: "agendamento_cron",
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

  /**
   * Carrega clientes elegíveis para seleção na campanha
   * Apenas clientes com WhatsApp validado (status_whatsapp = 'valid')
   */
  async function carregarClientesParaSelecao() {
    if (!supabaseClient) return;

    try {
      // Buscar apenas clientes com WhatsApp validado
      // Filtros: ativo, não bloqueado, WhatsApp válido
      const { data: clientes, error } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("id, nome_cliente, telefone, status_whatsapp")
        .eq("ativo", true)
        .eq("bloqueado_envios", false)
        .eq("status_whatsapp", "valid")
        .order("nome_cliente");

      if (error) throw error;

      clientesElegiveis = clientes || [];
      renderizarListaClientesSelecao();
      atualizarContadorSelecao();
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
      document.getElementById("listaClientesSelecao").innerHTML =
        '<p style="color: red; text-align: center; padding: 20px">Erro ao carregar clientes</p>';
    }
  }

  /**
   * Renderiza lista de clientes para seleção
   */
  function renderizarListaClientesSelecao() {
    const container = document.getElementById("listaClientesSelecao");
    if (!container) return;

    const busca = document.getElementById("buscaClientesSelecao")?.value.toLowerCase() || "";
    const clientesFiltrados = clientesElegiveis.filter(
      (c) =>
        !busca ||
        (c.nome_cliente || "").toLowerCase().includes(busca) ||
        (c.telefone || "").includes(busca)
    );

    if (clientesFiltrados.length === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: #666; padding: 20px">Nenhum cliente encontrado</p>';
      return;
    }

    let html = "";
    clientesFiltrados.forEach((cliente) => {
      const isSelected = clientesSelecionados.has(cliente.id);
      // Todos os clientes aqui já são 'valid', mas mantemos o badge para consistência
      const statusBadge = '<span style="color: #4caf50; font-size: 10px;">✅ Válido</span>';
      
      html += `
        <label style="display: flex; align-items: flex-start; padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; gap: 8px">
          <input
            type="checkbox"
            data-cliente-id="${cliente.id}"
            ${isSelected ? "checked" : ""}
            onchange="toggleClienteSelecao('${cliente.id}')"
            style="margin-top: 2px; flex-shrink: 0; width: 18px; height: 18px; cursor: pointer"
          />
          <span style="flex: 1; min-width: 0">
            <div style="font-weight: 600; margin-bottom: 4px; word-break: break-word">${cliente.nome_cliente || "-"}</div>
            <div style="color: #666; font-size: 13px; margin-bottom: 2px">${cliente.telefone}</div>
            <div>${statusBadge}</div>
          </span>
        </label>
      `;
    });

    container.innerHTML = html;
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
   * Atualiza contador de clientes selecionados
   */
  function atualizarContadorSelecao() {
    const contador = document.getElementById("contadorClientesSelecionados");
    if (contador) {
      const total = clientesSelecionados.size;
      const totalElegiveis = clientesElegiveis.length;
      contador.textContent = `${total} de ${totalElegiveis} clientes selecionados`;
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
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_campanhas_clientes")
        .select("cliente_id")
        .eq("campanha_id", campanhaId);

      if (error) throw error;

      clientesSelecionados = new Set((data || []).map((r) => r.cliente_id));
      renderizarListaClientesSelecao();
      atualizarContadorSelecao();
    } catch (error) {
      console.error("Erro ao carregar clientes selecionados:", error);
      clientesSelecionados.clear();
    }
  }

  /**
   * Salva seleção de clientes para uma campanha
   */
  async function salvarSelecaoClientesCampanha(campanhaId) {
    if (!supabaseClient || !campanhaId) return;

    try {
      // Deletar seleção atual
      await supabaseClient
        .from("instacar_campanhas_clientes")
        .delete()
        .eq("campanha_id", campanhaId);

      // Se há clientes selecionados, inserir novos
      if (clientesSelecionados.size > 0) {
        const registros = Array.from(clientesSelecionados).map((clienteId) => ({
          campanha_id: campanhaId,
          cliente_id: clienteId,
        }));

        const { error } = await supabaseClient
          .from("instacar_campanhas_clientes")
          .insert(registros);

        if (error) throw error;
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

    document.getElementById("modalTitle").textContent = "Nova Campanha";
    document.getElementById("formCampanha").reset();
    document.getElementById("campanhaId").value = "";
    document.getElementById("whatsapp_api_id").value = "";

    // Limpar seleção de clientes
    clientesSelecionados.clear();
    document.getElementById("buscaClientesSelecao").value = "";

    // Carregar instâncias para o select
    await carregarInstanciasParaSelect();

    // Carregar clientes para seleção
    await carregarClientesParaSelecao();

    document.getElementById("modalCampanha").classList.add("active");

    // Adicionar tooltips após um pequeno delay para garantir que o DOM está pronto
    setTimeout(() => {
      adicionarTooltipsFormularioCampanha();
    }, 100);
  }

  // Editar campanha
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

      document.getElementById("modalTitle").textContent = "Editar Campanha";
      document.getElementById("campanhaId").value = data.id;
      document.getElementById("nome").value = data.nome || "";
      document.getElementById("descricao").value = data.descricao || "";
      document.getElementById("periodo_ano").value = data.periodo_ano || "";
      document.getElementById("status").value = data.status || "ativa";
      document.getElementById("data_inicio").value = data.data_inicio || "";
      document.getElementById("data_fim").value = data.data_fim || "";
      document.getElementById("limite_envios_dia").value =
        data.limite_envios_dia || 200;
      document.getElementById("intervalo_minimo_dias").value =
        data.intervalo_minimo_dias || 30;
      document.getElementById("intervalo_envios_segundos").value =
        data.intervalo_envios_segundos || "";
      document.getElementById("prioridade").value = data.prioridade || 5;
      document.getElementById("agendamento_cron").value =
        data.agendamento_cron || "";
      document.getElementById("prompt_ia").value = data.prompt_ia || "";
      document.getElementById("template_mensagem").value =
        data.template_mensagem || "";

      // Novos campos: Flags de IA
      document.getElementById("usar_veiculos").checked =
        data.usar_veiculos !== false;
      document.getElementById("usar_vendedor").checked =
        data.usar_vendedor === true;

      // Novos campos: Lotes e Horário
      document.getElementById("tamanho_lote").value = data.tamanho_lote || 50;
      document.getElementById("horario_inicio").value =
        data.horario_inicio || "09:00";
      document.getElementById("horario_fim").value =
        data.horario_fim || "18:00";
      document.getElementById("processar_finais_semana").checked =
        data.processar_finais_semana === true;

      // Carregar instâncias e selecionar a correta
      await carregarInstanciasParaSelect();
      if (data.whatsapp_api_id) {
        document.getElementById("whatsapp_api_id").value = data.whatsapp_api_id;
      }

      // Limpar busca e carregar clientes para seleção
      document.getElementById("buscaClientesSelecao").value = "";
      await carregarClientesParaSelecao();
      await carregarClientesSelecionadosCampanha(data.id);

      // Atualizar estimativas após carregar dados
      setTimeout(atualizarEstimativas, 100);

      document.getElementById("modalCampanha").classList.add("active");

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

  // Salvar campanha
  function inicializarFormulario() {
    const form = document.getElementById("formCampanha");
    if (!form) return;

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
        intervalo_envios_segundos: intervaloEnviosInput
          ? parseInt(intervaloEnviosInput)
          : null,
        prioridade: prioridadeInput ? parseInt(prioridadeInput) : 5,
        agendamento_cron:
          document.getElementById("agendamento_cron").value || null,
        prompt_ia: document.getElementById("prompt_ia").value,
        template_mensagem:
          document.getElementById("template_mensagem").value || null,
        whatsapp_api_id:
          document.getElementById("whatsapp_api_id").value || null,
        usar_veiculos: document.getElementById("usar_veiculos").checked,
        usar_vendedor: document.getElementById("usar_vendedor").checked,
        tamanho_lote:
          parseInt(document.getElementById("tamanho_lote").value) || 50,
        horario_inicio:
          document.getElementById("horario_inicio").value || "09:00:00",
        horario_fim: document.getElementById("horario_fim").value || "18:00:00",
        processar_finais_semana: document.getElementById(
          "processar_finais_semana"
        ).checked,
        ativo: true,
      };

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
        if (id) {
          result = await supabaseClient
            .from("instacar_campanhas")
            .update(dados)
            .eq("id", id);
        } else {
          result = await supabaseClient
            .from("instacar_campanhas")
            .insert([dados]);
        }

        if (result.error) throw result.error;

        // Obter ID da campanha (novo ou existente)
        let campanhaIdFinal = id;
        if (!campanhaIdFinal && result.data && result.data.length > 0) {
          campanhaIdFinal = result.data[0].id;
        }

        // Salvar seleção de clientes
        if (campanhaIdFinal) {
          await salvarSelecaoClientesCampanha(campanhaIdFinal);
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
      const hoje = new Date();
      if (campanha.data_inicio && new Date(campanha.data_inicio) > hoje) {
        mostrarAlerta(
          `Campanha inicia em ${new Date(
            campanha.data_inicio
          ).toLocaleDateString("pt-BR")}`,
          "error"
        );
        return;
      }
      if (campanha.data_fim && new Date(campanha.data_fim) < hoje) {
        mostrarAlerta(
          `Campanha encerrou em ${new Date(
            campanha.data_fim
          ).toLocaleDateString("pt-BR")}`,
          "error"
        );
        return;
      }

      // 4. VERIFICAR EXECUÇÃO DUPLICADA HOJE
      const hojeStr = hoje.toISOString().split("T")[0];
      const { data: execucoes } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("id")
        .eq("campanha_id", id)
        .eq("data_execucao", hojeStr);

      if (execucoes && execucoes.length > 0) {
        if (!confirm("Campanha já executada hoje. Executar novamente?")) {
          return;
        }
      }

      // 5. CONFIRMAR DISPARO
      if (
        !confirm(
          `Disparar "${campanha.nome}"?\n\nLimite: ${campanha.limite_envios_dia}/dia`
        )
      ) {
        return;
      }

      // 6. OBTER WEBHOOK URL
      let webhookUrl =
        localStorage.getItem("n8nWebhookUrl") ||
        window.INSTACAR_CONFIG?.n8nWebhookUrl ||
        null;

      if (!webhookUrl) {
        mostrarAlerta(
          "Webhook N8N não configurado. Configure em Configurações.",
          "error"
        );
        return;
      }

      // 7. CHAMAR WEBHOOK
      mostrarAlerta("Disparando campanha...", "success");

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campanha_id: id,
          trigger_tipo: "manual",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      mostrarAlerta(`Campanha "${campanha.nome}" disparada!`, "success");
      setTimeout(() => carregarCampanhas(), 2000);
    } catch (error) {
      mostrarAlerta("Erro ao disparar: " + error.message, "error");
      console.error(error);
    }
  }

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
        mostrarAlerta("Erro ao carregar campanha", "error");
        return;
      }

      const { data: execucoes, error: errorExecucoes } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("*")
        .eq("campanha_id", campanhaId)
        .order("data_execucao", { ascending: false })
        .limit(20);

      if (errorExecucoes) throw errorExecucoes;

      const totalEnviados = execucoes.reduce(
        (sum, e) => sum + (e.total_enviado || 0),
        0
      );
      const totalErros = execucoes.reduce(
        (sum, e) => sum + (e.total_erros || 0),
        0
      );
      const totalDuplicados = execucoes.reduce(
        (sum, e) => sum + (e.total_duplicados || 0),
        0
      );
      const totalSemWhatsapp = execucoes.reduce(
        (sum, e) => sum + (e.total_sem_whatsapp || 0),
        0
      );
      const totalGeral =
        totalEnviados + totalErros + totalDuplicados + totalSemWhatsapp;
      const taxaSucesso =
        totalGeral > 0 ? ((totalEnviados / totalGeral) * 100).toFixed(2) : 0;

      // Buscar clientes selecionados
      const { data: clientesSelecionados, error: errorClientes } = await supabaseClient
        .from("instacar_campanhas_clientes")
        .select(`
          cliente_id,
          instacar_clientes_envios (
            id,
            nome_cliente,
            telefone
          )
        `)
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
                  ${usaSelecaoEspecifica 
                    ? `<span style="color: #667eea;">Seleção Específica (${totalClientesSelecionados} clientes)</span>` 
                    : '<span style="color: #4caf50;">Todos os Clientes Elegíveis</span>'}
                </p>
                ${usaSelecaoEspecifica ? `
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                    Esta campanha enviará apenas para os clientes selecionados abaixo.
                  </p>
                  <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px; background: white;">
                    ${clientesSelecionados.slice(0, 50).map((cc) => {
                      const cliente = cc.instacar_clientes_envios;
                      return cliente 
                        ? `<div style="padding: 5px 0; border-bottom: 1px solid #eee;">
                            <strong>${cliente.nome_cliente || "-"}</strong>
                            <br><small style="color: #666;">${cliente.telefone}</small>
                          </div>`
                        : "";
                    }).join("")}
                    ${totalClientesSelecionados > 50 ? `<p style="text-align: center; color: #666; margin-top: 10px;">... e mais ${totalClientesSelecionados - 50} clientes</p>` : ""}
                  </div>
                  <button onclick="editarCampanha('${campanhaId}')" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px;">
                    ✏️ Editar Seleção de Clientes
                  </button>
                ` : `
                  <p style="margin: 0; color: #666; font-size: 14px;">
                    Esta campanha enviará para todos os clientes elegíveis (ativo, WhatsApp válido, não bloqueado).
                    Para limitar a clientes específicos, edite a campanha e selecione os clientes desejados.
                  </p>
                  <button onclick="editarCampanha('${campanhaId}')" class="btn-secondary" style="margin-top: 10px; padding: 8px 16px;">
                    ✏️ Editar Campanha e Selecionar Clientes
                  </button>
                `}
              </div>

              <h3 style="margin-top: 30px; margin-bottom: 15px;">Histórico de Execuções</h3>
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #f5f5f5;">
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Data</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Status</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Enviados</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Erros</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Trigger</th>
                      <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Início</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      execucoes && execucoes.length > 0
                        ? execucoes
                            .map(
                              (exec) => `
                      <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #eee;">${new Date(
                          exec.data_execucao
                        ).toLocaleDateString("pt-BR")}</td>
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
                            ? new Date(exec.horario_inicio).toLocaleString(
                                "pt-BR"
                              )
                            : "N/A"
                        }</td>
                      </tr>
                    `
                            )
                            .join("")
                        : '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #666;">Nenhuma execução encontrada</td></tr>'
                    }
                  </tbody>
                </table>
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
  }

  // Ver execuções da campanha
  async function verExecucoes(id) {
    if (!supabaseClient) {
      mostrarAlerta("Conecte-se ao Supabase primeiro", "error");
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from("instacar_campanhas_execucoes")
        .select("*")
        .eq("campanha_id", id)
        .order("data_execucao", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data.length === 0) {
        alert("Nenhuma execução encontrada para esta campanha.");
        return;
      }

      let mensagem = "Últimas execuções:\n\n";
      data.forEach((exec) => {
        mensagem += `Data: ${new Date(exec.data_execucao).toLocaleDateString(
          "pt-BR"
        )}\n`;
        mensagem += `Enviados: ${exec.total_enviado || 0}\n`;
        mensagem += `Erros: ${exec.total_erros || 0}\n`;
        mensagem += `Status: ${exec.status_execucao}\n`;
        mensagem += `Trigger: ${exec.trigger_tipo}\n`;
        mensagem += "---\n";
      });

      alert(mensagem);
    } catch (error) {
      mostrarAlerta("Erro ao carregar execuções: " + error.message, "error");
      console.error(error);
    }
  }

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
  window.fecharModal = fecharModal;
  window.editarCampanha = editarCampanha;
  window.selecionarTodosClientes = selecionarTodosClientes;
  window.desmarcarTodosClientes = desmarcarTodosClientes;
  window.inverterSelecaoClientes = inverterSelecaoClientes;
  window.filtrarClientesSelecao = filtrarClientesSelecao;
  window.toggleClienteSelecao = toggleClienteSelecao;
  window.toggleAtivo = toggleAtivo;
  window.dispararCampanha = dispararCampanha;
  window.verExecucoes = verExecucoes;
  window.abrirDashboardCampanha = abrirDashboardCampanha;
  window.fecharModalDashboard = fecharModalDashboard;
  window.alternarVisualizacaoCampanhas = alternarVisualizacaoCampanhas;

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

  // Funções de conexão WhatsApp
  window.conectarInstanciaWhatsApp = conectarInstanciaWhatsApp;
  window.desconectarInstanciaWhatsApp = desconectarInstanciaWhatsApp;
  window.fecharModalQRCode = fecharModalQRCode;
  window.atualizarQRCode = atualizarQRCode;
  window.verificarStatusConexao = verificarStatusConexao;
  window.sincronizarStatusInstancia = sincronizarStatusInstancia;

  // Inicializar quando DOM estiver pronto
  function inicializarApp() {
    // Carregar configurações automaticamente (localStorage > config.js)
    const savedConfig = carregarConfiguracoesDoLocalStorage();

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

  // Calcular e exibir estimativas de tempo
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

    // Se intervalo não configurado, usar padrão (média de 140s)
    const intervaloMedio = intervaloInputValue
      ? parseInt(intervaloInputValue)
      : 140;

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

    estimativasDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
        <div>
          <strong style="color: #111827; font-weight: 600;">⏱️ Tempo Entre Envios:</strong><br>
          <span style="color: #2196F3;">${estimativas.tempoEntreEnvios}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">📅 Dias Necessários:</strong><br>
          <span style="color: #2196F3;">${estimativas.diasNecessarios} dias úteis</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">⏰ Tempo por Dia:</strong><br>
          <span style="color: #2196F3;">${estimativas.tempoPorDia}</span>
        </div>
        <div>
          <strong style="color: #111827; font-weight: 600;">🕐 Horário Estimado:</strong><br>
          <span style="color: #2196F3;">${estimativas.horarioInicio} - ${estimativas.horarioFimEstimado}</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
        <strong style="color: #111827; font-weight: 600;">⏳ Tempo Total Estimado:</strong><br>
        <span style="color: #4CAF50; font-size: 16px; font-weight: 600;">${estimativas.totalTempo}</span>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; background: #f0f7ff; padding: 10px; border-radius: 8px;">
        <strong style="color: #111827; font-weight: 600;">📦 Processamento em Lotes:</strong><br>
        <span style="color: #667eea; font-weight: 500;">${totalLotes} lotes de ${tamanhoLote} clientes = ${diasNecessariosLotes} dias úteis</span>
      </div>
    `;

    // Atualizar estimativa de lotes
    if (estimativasLoteDiv) {
      estimativasLoteDiv.textContent = `Com ${totalContatosEstimado} clientes: ${totalLotes} lotes de ${tamanhoLote} = ${diasNecessariosLotes} dias úteis (${lotesPorDia} lotes/dia)`;
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

    const resultados = [];
    let processados = 0;

    for (const lote of lotes) {
      try {
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
        const updates = resultadosLote.map((r) => ({
          telefone:
            r.query || r.jid?.split("@")[0] || lote[resultados.indexOf(r)],
          status_whatsapp: r.isInWhatsapp ? "valid" : "invalid",
        }));

        await supabaseClient
          .from("instacar_clientes_envios")
          .upsert(updates, { onConflict: "telefone" });

        processados += lote.length;

        // Delay entre lotes para evitar rate limiting
        if (lotes.indexOf(lote) < lotes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("Erro ao verificar WhatsApp:", error);
        mostrarAlerta(`Erro ao verificar lote: ${error.message}`, "error");
      }
    }

    mostrarAlerta(
      `Verificação concluída! ${processados} números processados.`,
      "success"
    );
    carregarListaClientes(paginaAtualClientes); // Atualizar lista mantendo página atual
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

    if (totalPaginas <= 1) {
      paginacaoContainer.innerHTML = `<p style="text-align: center; color: #666; margin: 0">Total: ${totalClientes} cliente(s)</p>`;
      return;
    }

    let html = `<div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center;">`;

    // Informações
    const inicio = (paginaAtualClientes - 1) * itensPorPaginaClientes + 1;
    const fim = Math.min(
      paginaAtualClientes * itensPorPaginaClientes,
      totalClientes
    );
    html += `<span style="color: #666; margin-right: 10px">Mostrando ${inicio}-${fim} de ${totalClientes} cliente(s)</span>`;

    // Botão Anterior
    html += `<button 
      onclick="carregarListaClientes(${paginaAtualClientes - 1})" 
      class="btn-secondary"
      style="padding: 6px 12px; font-size: 12px"
      ${paginaAtualClientes === 1 ? "disabled" : ""}
    >◀ Anterior</button>`;

    // Números de página
    const maxBotoes = 5;
    let inicioPaginas = Math.max(
      1,
      paginaAtualClientes - Math.floor(maxBotoes / 2)
    );
    let fimPaginas = Math.min(totalPaginas, inicioPaginas + maxBotoes - 1);

    if (fimPaginas - inicioPaginas < maxBotoes - 1) {
      inicioPaginas = Math.max(1, fimPaginas - maxBotoes + 1);
    }

    if (inicioPaginas > 1) {
      html += `<button onclick="carregarListaClientes(1)" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">1</button>`;
      if (inicioPaginas > 2) {
        html += `<span style="padding: 0 5px">...</span>`;
      }
    }

    for (let i = inicioPaginas; i <= fimPaginas; i++) {
      html += `<button 
        onclick="carregarListaClientes(${i})" 
        class="${i === paginaAtualClientes ? "btn-success" : "btn-secondary"}"
        style="padding: 6px 12px; font-size: 12px; min-width: 40px"
      >${i}</button>`;
    }

    if (fimPaginas < totalPaginas) {
      if (fimPaginas < totalPaginas - 1) {
        html += `<span style="padding: 0 5px">...</span>`;
      }
      html += `<button onclick="carregarListaClientes(${totalPaginas})" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">${totalPaginas}</button>`;
    }

    // Botão Próximo
    html += `<button 
      onclick="carregarListaClientes(${paginaAtualClientes + 1})" 
      class="btn-secondary"
      style="padding: 6px 12px; font-size: 12px"
      ${paginaAtualClientes === totalPaginas ? "disabled" : ""}
    >Próximo ▶</button>`;

    html += `</div>`;
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
        queryBase = queryBase.eq("status_whatsapp", filtroStatus);
      }

      if (busca) {
        queryBase = queryBase.or(
          `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%`
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
      let query = supabaseClient
        .from("instacar_clientes_envios")
        .select("*")
        .eq("ativo", true) // Filtrar apenas clientes ativos
        .order("created_at", { ascending: false })
        .range(offset, offset + itensPorPaginaClientes - 1);

      // Aplicar filtros na query de dados
      if (filtroStatus) {
        query = query.eq("status_whatsapp", filtroStatus);
      }

      if (busca) {
        query = query.or(
          `nome_cliente.ilike.%${busca}%,telefone.ilike.%${busca}%`
        );
      }

      // Executar query
      const { data: clientes, error } = await query;

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

      // Renderizar tabela
      let html = `
        <table class="clientes-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Status WhatsApp</th>
              <th>Bloqueado</th>
              <th>Veículos</th>
              <th>Última Campanha</th>
              <th>Total Envios</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
      `;

      for (const cliente of clientes) {
        // Mapear status para texto legível
        let statusTexto = cliente.status_whatsapp || "unknown";
        let statusLabel = "Não verificado";
        let statusIcon = "⚪";

        if (statusTexto === "valid") {
          statusLabel = "Válido";
          statusIcon = "✅";
        } else if (statusTexto === "invalid") {
          statusLabel = "Inválido";
          statusIcon = "❌";
        } else if (statusTexto === "unknown") {
          statusLabel = "Não verificado";
          statusIcon = "⚪";
        }

        const statusBadge = `<span class="badge badge-${statusTexto}" title="${statusLabel}">${statusIcon} ${statusLabel}</span>`;

        const veiculosCount = Array.isArray(cliente.veiculos)
          ? cliente.veiculos.length
          : 0;

        // Mostrar última campanha (simplificado - apenas indicar se existe)
        const ultimaCampanha = cliente.ultima_campanha_id
          ? cliente.ultima_campanha_data
            ? new Date(cliente.ultima_campanha_data).toLocaleDateString("pt-BR")
            : "Sim"
          : "Nenhuma";

        // Bloqueado Envios
        const bloqueadoEnvios = cliente.bloqueado_envios === true;
        const bloqueadoBadge = bloqueadoEnvios
          ? '<span class="badge badge-invalid" title="Cliente bloqueado - não receberá mensagens">🚫 Bloqueado</span>'
          : '<span class="badge badge-valid" title="Cliente permitido - receberá mensagens">✅ Permitido</span>';
        const toggleBloqueioBtn = bloqueadoEnvios
          ? '<button onclick="alternarBloqueioCliente(\'' + cliente.id + '\', false)" class="btn-success" style="padding: 4px 8px; font-size: 11px" title="Desbloquear envios">🔓</button>'
          : '<button onclick="alternarBloqueioCliente(\'' + cliente.id + '\', true)" class="btn-danger" style="padding: 4px 8px; font-size: 11px" title="Bloquear envios">🚫</button>';

        html += `
          <tr data-cliente-id="${cliente.id}">
            <td>${cliente.nome_cliente || "-"}</td>
            <td>${cliente.telefone}</td>
            <td data-status-whatsapp="${statusTexto}">${statusBadge}</td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${bloqueadoBadge}
                ${toggleBloqueioBtn}
              </div>
            </td>
            <td>${veiculosCount}</td>
            <td>${ultimaCampanha}</td>
            <td>${cliente.total_envios || 0}</td>
            <td>
              <div class="action-buttons">
                <button onclick="enviarMensagemIndividual('${cliente.id}', '${
          cliente.telefone
        }')" class="btn-success" style="padding: 6px 12px; font-size: 12px">
                  📤 Enviar
                </button>
                <button onclick="verificarWhatsAppIndividual('${
                  cliente.id
                }', '${
          cliente.telefone
        }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px" title="Verificar WhatsApp">
                  ✅ Verificar
                </button>
                <button onclick="verDetalhesCliente('${
                  cliente.id
                }')" class="btn-secondary" style="padding: 6px 12px; font-size: 12px">
                  👁️ Ver
                </button>
              </div>
            </td>
          </tr>
        `;
      }

      html += `
          </tbody>
        </table>
      `;

      container.innerHTML = html;

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
  }

  /**
   * Processa envio de mensagem individual
   */
  async function processarEnvioMensagemIndividual(event) {
    event.preventDefault();

    const clienteId = document.getElementById("enviarMensagemClienteId").value;
    const telefone = document.getElementById("enviarMensagemTelefone").value;
    const tipoEnvio = document.getElementById("tipoEnvio").value;

    if (!tipoEnvio) {
      mostrarAlerta("Selecione o tipo de envio!", "error");
      return;
    }

    const config = carregarConfiguracoesDoLocalStorage();
    if (!config.n8nWebhookUrl) {
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
      };

      if (tipoEnvio === "campanha") {
        const campanhaId = document.getElementById("campanhaSelecionada").value;
        if (!campanhaId) {
          mostrarAlerta("Selecione uma campanha!", "error");
          return;
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
   * Verifica WhatsApp para clientes selecionados
   */
  async function verificarWhatsAppSelecionados() {
    if (!supabaseClient) {
      mostrarAlerta("Conecte ao Supabase primeiro!", "error");
      return;
    }

    // Buscar clientes não verificados
    const { data: clientes, error } = await supabaseClient
      .from("instacar_clientes_envios")
      .select("telefone")
      .or("status_whatsapp.is.null,status_whatsapp.eq.unknown")
      .limit(100);

    if (error) {
      mostrarAlerta("Erro ao buscar clientes: " + error.message, "error");
      return;
    }

    if (!clientes || clientes.length === 0) {
      mostrarAlerta("Nenhum cliente não verificado encontrado!", "error");
      return;
    }

    const telefones = clientes.map((c) => c.telefone);
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
      const [resultClienteId, resultTelefone] = await Promise.all([
        // Query 1: Buscar por cliente_id
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
          .order("timestamp_envio", { ascending: false })
          .limit(50),
        // Query 2: Buscar por telefone (para capturar envios individuais)
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
          .order("timestamp_envio", { ascending: false })
          .limit(50),
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
      const historico = Array.from(historicoMap.values())
        .sort((a, b) => {
          const timestampA = new Date(a.timestamp_envio || a.created_at || 0);
          const timestampB = new Date(b.timestamp_envio || b.created_at || 0);
          return timestampB - timestampA; // Mais recente primeiro
        })
        .slice(0, 50); // Limitar a 50 registros

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

      return {
        cliente,
        historico: historico || [],
      };
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error);
      throw error;
    }
  }

  /**
   * Formata telefone para exibição
   * @param {string} telefone - Telefone no formato 55XXXXXXXXXXX
   * @returns {string} Telefone formatado
   */
  function formatarTelefone(telefone) {
    if (!telefone) return "-";
    // 5511999999999 -> (11) 99999-9999
    if (telefone.length === 13 && telefone.startsWith("55")) {
      const ddd = telefone.substring(2, 4);
      const parte1 = telefone.substring(4, 9);
      const parte2 = telefone.substring(9);
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
    // Se não começa com 55, adiciona
    if (!numeros.startsWith("55")) {
      numeros = "55" + numeros;
    }
    return numeros;
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
    document.getElementById("fieldBloqueadoEnviosInput").checked = bloqueadoEnvios;
    document.getElementById("fieldBloqueadoEnviosValue").textContent = bloqueadoEnvios
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

    // Estatísticas
    document.getElementById("statTotalEnvios").textContent =
      cliente.total_envios || 0;
    document.getElementById("statPrimeiroEnvio").textContent =
      cliente.primeiro_envio ? formatarData(cliente.primeiro_envio) : "-";
    document.getElementById("statUltimoEnvio").textContent =
      cliente.ultimo_envio ? formatarData(cliente.ultimo_envio) : "-";

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
    document.getElementById("btnEditarCliente").style.display = "block";
    document.getElementById("btnSalvarCliente").style.display = "none";
    document.getElementById("btnSalvarCliente").textContent = "💾 Salvar";
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
        '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">Nenhum histórico de envio encontrado.</td></tr>';
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

      const campanhaNome = item.instacar_campanhas?.nome || "-";
      const mensagem = item.mensagem_enviada || "-";
      const mensagemPreview =
        mensagem.length > 50 ? mensagem.substring(0, 50) + "..." : mensagem;
      const dataHora = formatarData(item.timestamp_envio || item.created_at);

      html += `
        <tr>
          <td>${dataHora}</td>
          <td>${statusBadge}</td>
          <td>${campanhaNome}</td>
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
      return;
    }

    const modal = document.getElementById("modalCliente");
    const loading = document.getElementById("modalClienteLoading");
    const content = document.getElementById("modalClienteContent");
    const title = document.getElementById("modalClienteTitle");

    if (!modal || !loading || !content || !title) {
      mostrarAlerta("Erro: Modal não encontrado", "error");
      return;
    }

    // Abrir modal e mostrar loading
    modal.classList.add("active");
    loading.style.display = "block";
    content.style.display = "none";
    title.textContent = "Detalhes do Cliente";

    try {
      const dados = await carregarDadosClienteCompleto(clienteId);
      if (dados) {
        renderizarModalCliente(dados);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do cliente:", error);
      mostrarAlerta(`Erro ao carregar detalhes: ${error.message}`, "error");
      loading.innerHTML = `<p style="color: red;">Erro ao carregar: ${error.message}</p>`;
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
    });
    document.querySelectorAll(".modal-tab").forEach((tab) => {
      tab.classList.remove("active");
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

    if (tabContent) tabContent.classList.add("active");
    if (tabButton) tabButton.classList.add("active");
  }

  /**
   * Alterna entre modo visualização e edição
   */
  function alternarModoEdicao() {
    const modalContent = document.getElementById("modalClienteContent");
    const isEdicao = modalContent.classList.contains("modo-edicao");

    if (isEdicao) {
      // Voltar para visualização
      modalContent.classList.remove("modo-edicao");
      modalContent.classList.add("modo-visualizacao");
      document.getElementById("btnEditarCliente").style.display = "block";
      document.getElementById("btnSalvarCliente").style.display = "none";
      document.getElementById("btnCancelarEdicao").style.display = "none";
    } else {
      // Entrar em modo edição
      modalContent.classList.remove("modo-visualizacao");
      modalContent.classList.add("modo-edicao");
      document.getElementById("btnEditarCliente").style.display = "none";
      document.getElementById("btnSalvarCliente").style.display = "block";
      document.getElementById("btnCancelarEdicao").style.display = "block";
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
    if (telefoneNormalizado.length < 13) {
      mostrarAlerta(
        "Telefone inválido. Deve conter DDD + número (ex: 11999999999)",
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
      const { data: clienteExistente } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("id")
        .eq("telefone", telefoneNormalizado)
        .neq("id", clienteId)
        .single();

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

    if (!confirm(
      bloquear
        ? "Tem certeza que deseja bloquear este cliente? Ele não receberá mais mensagens de campanhas."
        : "Tem certeza que deseja desbloquear este cliente? Ele voltará a receber mensagens de campanhas."
    )) {
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
        throw new Error(`Erro ao ${bloquear ? "bloquear" : "desbloquear"} cliente: ${error.message}`);
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
    if (telefoneNormalizado.length < 13) {
      mostrarAlerta(
        "Telefone inválido. Deve conter DDD + número (ex: 11999999999)",
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
      const { data: clienteExistente } = await supabaseClient
        .from("instacar_clientes_envios")
        .select("id")
        .eq("telefone", telefoneNormalizado)
        .single();

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
          <li><strong>Valor fixo:</strong> Use um valor entre 60-300 segundos para controle preciso</li>
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
    agendamento_cron: {
      titulo: "Agendamento Cron",
      resumo: "Formato: minuto hora dia mês dia-semana",
      detalhes: `
        <h4>Formato Cron</h4>
        <p>Use expressões cron para agendar execuções automáticas da campanha.</p>
        <p><strong>Formato:</strong> <code>minuto hora dia mês dia-semana</code></p>
        
        <h5>Campos:</h5>
        <ol>
          <li><strong>Minuto</strong> (0-59) - Minuto da hora</li>
          <li><strong>Hora</strong> (0-23) - Hora do dia</li>
          <li><strong>Dia do mês</strong> (1-31) - Dia do mês</li>
          <li><strong>Mês</strong> (1-12) - Mês do ano</li>
          <li><strong>Dia da semana</strong> (0-7, onde 0 e 7 = domingo) - Dia da semana</li>
        </ol>

        <h5>Caracteres especiais:</h5>
        <ul>
          <li><code>*</code> - Qualquer valor</li>
          <li><code>,</code> - Lista de valores (ex: 1,3,5)</li>
          <li><code>-</code> - Intervalo (ex: 1-5)</li>
          <li><code>/</code> - Incremento (ex: */2 = a cada 2)</li>
        </ul>

        <div class="tooltip-exemplos">
          <h5>Exemplos práticos:</h5>
          <div class="tooltip-exemplo-item">
            <code>0 9 * * 1-5</code>
            <div class="descricao">9h da manhã, apenas dias úteis (segunda a sexta)</div>
          </div>
          <div class="tooltip-exemplo-item">
            <code>0 9 1 1 *</code>
            <div class="descricao">1º de janeiro às 9h</div>
          </div>
          <div class="tooltip-exemplo-item">
            <code>0 */2 * * *</code>
            <div class="descricao">A cada 2 horas (0h, 2h, 4h, 6h...)</div>
          </div>
          <div class="tooltip-exemplo-item">
            <code>30 14 * * 0</code>
            <div class="descricao">Domingos às 14:30</div>
          </div>
          <div class="tooltip-exemplo-item">
            <code>0 9,14 * * 1-5</code>
            <div class="descricao">9h e 14h, dias úteis</div>
          </div>
        </div>

        <p><strong>Dica:</strong> Deixe vazio se não quiser agendamento automático (disparo apenas manual).</p>
      `,
    },
    prompt_ia: {
      titulo: "Prompt Personalizado para IA",
      resumo: "Instruções específicas para a IA gerar mensagens",
      detalhes: `
        <p>Este campo contém as instruções que serão enviadas para a IA (GPT-4) gerar as mensagens personalizadas.</p>
        <h5>Dicas para escrever bons prompts:</h5>
        <ul>
          <li>Seja específico sobre o tom e estilo da mensagem</li>
          <li>Mencione informações que devem ser incluídas (nome do cliente, veículo, etc.)</li>
          <li>Defina o objetivo da campanha claramente</li>
          <li>Inclua exemplos de mensagens desejadas, se possível</li>
        </ul>
        <h5>Exemplo:</h5>
        <pre><code>Gere uma mensagem calorosa de Natal para o cliente [NOME]. 
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
      resumo: "Nome identificador único (será normalizado para minúsculas com hífens e prefixo Instacar_codigo_ será adicionado)",
      detalhes: `
        <p>Escolha um nome descritivo para identificar esta instância de API WhatsApp.</p>
        <p><strong>⚠️ IMPORTANTE:</strong></p>
        <ul>
          <li><strong>Digite apenas o nome</strong> (sem o prefixo "Instacar_"). O prefixo será adicionado automaticamente pelo sistema</li>
          <li>O nome será <strong>normalizado automaticamente</strong> para minúsculas com palavras separadas por hífen (kebab-case)</li>
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
      resumo: "Token de administrador (opcional - apenas para criar novas instâncias na Uazapi)",
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
    icon.textContent = "?";
    icon.setAttribute("role", "button");
    icon.setAttribute("aria-label", `Ajuda sobre ${config.titulo}`);
    icon.setAttribute("tabindex", "0");

    const resumo = customResumo || config.resumo;

    // Tooltip hover (rápido)
    const tooltipHover = document.createElement("div");
    tooltipHover.className = "tooltip-hover";
    tooltipHover.textContent = resumo;
    icon.appendChild(tooltipHover);

    // Event listeners
    let hoverTimeout;
    let clickTimeout;

    icon.addEventListener("mouseenter", () => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        tooltipHover.classList.add("show");
        posicionarTooltipHover(icon, tooltipHover);
      }, 300);
    });

    icon.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimeout);
      tooltipHover.classList.remove("show");
    });

    icon.addEventListener("click", (e) => {
      e.stopPropagation();
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
    const rect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Posição padrão: abaixo do ícone
    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;

    // Ajustar se sair da tela à direita
    if (left + tooltipRect.width > viewportWidth) {
      left = viewportWidth - tooltipRect.width - 10;
    }

    // Ajustar se sair da tela à esquerda
    if (left < 10) {
      left = 10;
    }

    // Se não couber abaixo, colocar acima
    if (top + tooltipRect.height > viewportHeight) {
      top = rect.top - tooltipRect.height - 8;
      tooltip.style.setProperty("--arrow-position", "bottom");
    } else {
      tooltip.style.setProperty("--arrow-position", "top");
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  /**
   * Mostra popover com detalhes completos
   */
  function mostrarTooltipPopover(config, triggerElement) {
    const popover = document.getElementById("tooltipPopover");
    const overlay = document.getElementById("tooltipOverlay");
    const title = document.getElementById("tooltipPopoverTitle");
    const content = document.getElementById("tooltipPopoverContent");

    if (!popover || !overlay || !title || !content) {
      console.error("Elementos do popover não encontrados");
      return;
    }

    title.textContent = config.titulo;
    content.innerHTML = config.detalhes;

    // Posicionar popover próximo ao elemento trigger
    const rect = triggerElement.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 10;
    let left = rect.left + rect.width / 2 - popoverRect.width / 2;

    // Ajustar posicionamento
    if (left + popoverRect.width > viewportWidth) {
      left = viewportWidth - popoverRect.width - 20;
    }
    if (left < 20) {
      left = 20;
    }
    if (top + popoverRect.height > viewportHeight) {
      top = rect.top - popoverRect.height - 10;
    }
    if (top < 20) {
      top = 20;
    }

    popover.style.top = `${top}px`;
    popover.style.left = `${left}px`;

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

    if (popover) popover.classList.remove("show");
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
      cron: { content: "ajudaCron", tab: "tabCron" },
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
  window.desativarCliente = desativarCliente;
  window.excluirCliente = excluirCliente;
  window.adicionarNovoCliente = adicionarNovoCliente;
  window.fecharModalCliente = fecharModalCliente;
  window.verificarWhatsAppDoModal = verificarWhatsAppDoModal;
  window.filtrarHistorico = filtrarHistorico;
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
  }

  // Verificar se DOM já está pronto ou aguardar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarApp);
  } else {
    // DOM já está pronto, executar imediatamente
    inicializarApp();
  }
})();
