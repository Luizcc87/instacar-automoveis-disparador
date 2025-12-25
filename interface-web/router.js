// Sistema de Rotas Simples
(function () {
  "use strict";

  // Estado da aplicação
  let currentPage = "dashboard";
  const routes = {
    "/": "dashboard",
    "/dashboard": "dashboard",
    "/campanhas": "campanhas",
    "/clientes": "clientes",
    "/templates": "templates",
    "/agendamentos": "agendamentos",
    "/historico": "historico",
    "/instancias": "instancias",
    "/configuracoes": "configuracoes",
    "/perfil": "perfil",
    "/relatorios": "relatorios"
  };

  // Títulos das páginas
  const pageTitles = {
    dashboard: { title: "Dashboard", subtitle: "Visão geral do sistema de disparos" },
    campanhas: { title: "Campanhas", subtitle: "Gerencie suas campanhas de disparo" },
    clientes: { title: "Clientes", subtitle: "Gerencie sua base de contatos" },
    templates: { title: "Templates", subtitle: "Modelos de mensagens para disparo" },
    agendamentos: { title: "Agendamentos", subtitle: "Campanhas programadas para envio" },
    historico: { title: "Histórico", subtitle: "Registro de todos os envios" },
    instancias: { title: "Instâncias WhatsApp", subtitle: "Gerencie suas conexões de API" },
    configuracoes: { title: "Configurações", subtitle: "Ajuste as preferências do sistema" },
    perfil: { title: "Perfil", subtitle: "Suas informações e preferências" },
    relatorios: { title: "Relatórios", subtitle: "Relatórios e exportação de dados" }
  };

  /**
   * Navega para uma página
   */
  function navigateTo(path) {
    const page = routes[path] || routes["/"];
    
    // Atualizar URL sem recarregar
    if (window.history && window.history.pushState) {
      window.history.pushState({ page }, "", `#${path}`);
    } else {
      window.location.hash = path;
    }

    // Atualizar página atual
    currentPage = page;
    updateActiveNav();
    updatePageTitle(page);
    showPageContent(page);
  }

  /**
   * Atualiza o título e subtítulo da página
   */
  function updatePageTitle(page) {
    const titleEl = document.getElementById("pageTitle");
    const subtitleEl = document.getElementById("pageSubtitle");
    
    if (titleEl && subtitleEl && pageTitles[page]) {
      titleEl.textContent = pageTitles[page].title;
      subtitleEl.textContent = pageTitles[page].subtitle;
    }
  }

  /**
   * Atualiza o item de navegação ativo
   */
  function updateActiveNav() {
    const navItems = document.querySelectorAll(".sidebar-nav-item");
    navItems.forEach(item => {
      const page = item.getAttribute("data-page");
      if (page === currentPage) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * Mostra o conteúdo da página
   */
  function showPageContent(page) {
    const contentArea = document.getElementById("contentArea");
    if (!contentArea) {
      console.error("Router: contentArea não encontrado!");
      return;
    }

    // Ocultar conteúdo legacy se existir
    const legacyContent = document.getElementById("legacyContent");
    if (legacyContent) {
      legacyContent.style.display = "none";
    }

    // Se a função de carregar página específica existir, chama ela
    const pageFunctionName = `loadPage${page.charAt(0).toUpperCase() + page.slice(1)}`;
    if (typeof window[pageFunctionName] === "function") {
      try {
        window[pageFunctionName]();
      } catch (error) {
        console.error(`Erro ao carregar página ${page}:`, error);
        contentArea.innerHTML = `
          <div class="card">
            <div class="card-body">
              <p style="color: red;">Erro ao carregar página ${page}: ${error.message}</p>
            </div>
          </div>
        `;
      }
    } else {
      // Fallback: mostrar mensagem
      console.warn(`Router: Função ${pageFunctionName} não encontrada`);
      contentArea.innerHTML = `
        <div class="card">
          <div class="card-body">
            <p>Página ${page} em desenvolvimento...</p>
          </div>
        </div>
      `;
    }
  }

  /**
   * Inicializa o roteador
   */
  function initRouter() {
    // Configurar links da sidebar
    const navItems = document.querySelectorAll(".sidebar-nav-item");
    navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");
        if (href) {
          navigateTo(href.replace("#", ""));
        }
      });
    });

    // Detectar mudanças no hash
    window.addEventListener("hashchange", () => {
      const path = window.location.hash.slice(1) || "/";
      navigateTo(path);
    });

    // Navegar para a página inicial
    const initialPath = window.location.hash.slice(1) || "/";
    navigateTo(initialPath);
  }

  // Expor função global para navegação
  window.navegarPara = navigateTo;

  // Inicializar quando o DOM estiver pronto
  // Aguardar um pouco para garantir que app.js carregou as funções de página
  function initRouterDelayed() {
    // Verificar se loadPageDashboard está disponível, se não, aguardar mais
    if (typeof window.loadPageDashboard === "function") {
      initRouter();
    } else {
      // Tentar até 10 vezes (1 segundo total)
      if (typeof window.routerRetryCount === "undefined") {
        window.routerRetryCount = 0;
      }
      window.routerRetryCount++;
      if (window.routerRetryCount < 10) {
        setTimeout(initRouterDelayed, 100);
      } else {
        console.error("Router: loadPageDashboard não encontrado após 1 segundo. Inicializando mesmo assim.");
        initRouter();
      }
    }
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(initRouterDelayed, 100);
    });
  } else {
    setTimeout(initRouterDelayed, 100);
  }

  // Função de logout
  window.logout = function() {
    if (confirm("Tem certeza que deseja sair?")) {
      // Limpar dados de sessão se houver
      // Redirecionar para login ou recarregar
      window.location.reload();
    }
  };

  // Toggle sidebar (mobile e desktop)
  window.toggleSidebar = function() {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    
    if (sidebar && mainContent) {
      // Em mobile, usar mobile-open
      if (window.innerWidth <= 768) {
        sidebar.classList.toggle("mobile-open");
      } else {
        // Em desktop, usar collapsed
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
        
        // Salvar preferência
        const isCollapsed = sidebar.classList.contains("collapsed");
        localStorage.setItem("sidebarCollapsed", isCollapsed);
      }
    }
  };
  
  // Restaurar estado da sidebar ao carregar (desktop)
  function restaurarEstadoSidebar() {
    const sidebar = document.getElementById("sidebar");
    const mainContent = document.getElementById("mainContent");
    const savedState = localStorage.getItem("sidebarCollapsed");
    
    if (sidebar && mainContent && savedState === "true" && window.innerWidth > 768) {
      sidebar.classList.add("collapsed");
      mainContent.classList.add("sidebar-collapsed");
    }
  }
  
  // Restaurar ao carregar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restaurarEstadoSidebar);
  } else {
    restaurarEstadoSidebar();
  }

  // Fechar sidebar ao clicar fora (mobile)
  document.addEventListener("click", (e) => {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.querySelector(".mobile-menu-toggle");
    
    if (sidebar && window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !toggle?.contains(e.target)) {
        sidebar.classList.remove("mobile-open");
      }
    }
  });
})();

