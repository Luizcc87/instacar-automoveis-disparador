// Sistema de Notificações
(function () {
  "use strict";

  let notifications = [];
  let notificationCount = 0;

  /**
   * Mostra uma notificação toast
   */
  function showToast(message, type = "info", duration = 5000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Estilos do toast
    Object.assign(toast.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "16px 20px",
      borderRadius: "8px",
      backgroundColor: getToastColor(type),
      color: "white",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
      zIndex: "10000",
      minWidth: "300px",
      maxWidth: "500px",
      animation: "slideInRight 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    });

    // Ícone baseado no tipo
    const icon = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️"
    }[type] || "ℹ️";

    toast.innerHTML = `
      <span style="font-size: 20px;">${icon}</span>
      <span style="flex: 1;">${message}</span>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
    `;

    document.body.appendChild(toast);

    // Remover automaticamente
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.animation = "slideOutRight 0.3s ease";
        setTimeout(() => toast.remove(), 300);
      }
    }, duration);

    // Adicionar animações CSS se não existirem
    if (!document.getElementById("toast-animations")) {
      const style = document.createElement("style");
      style.id = "toast-animations";
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Retorna a cor do toast baseado no tipo
   */
  function getToastColor(type) {
    const colors = {
      success: "#10b981",
      error: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6"
    };
    return colors[type] || colors.info;
  }

  /**
   * Adiciona uma notificação à lista
   */
  function addNotification(title, message, type = "info", link = null) {
    const notification = {
      id: Date.now() + Math.random(),
      title,
      message,
      type,
      link,
      timestamp: new Date(),
      read: false
    };

    notifications.unshift(notification);
    notificationCount++;
    updateNotificationBadge();
    saveNotifications();

    // Mostrar toast também
    showToast(title, type);
  }

  /**
   * Marca notificação como lida
   */
  function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      notificationCount--;
      updateNotificationBadge();
      saveNotifications();
    }
  }

  /**
   * Marca todas como lidas
   */
  function markAllAsRead() {
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        notificationCount--;
      }
    });
    notificationCount = 0;
    updateNotificationBadge();
    saveNotifications();
  }

  /**
   * Remove uma notificação
   */
  function removeNotification(id) {
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
      if (!notifications[index].read) {
        notificationCount--;
      }
      notifications.splice(index, 1);
      updateNotificationBadge();
      saveNotifications();
    }
  }

  /**
   * Atualiza o badge de notificações
   */
  function updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge");
    if (badge) {
      if (notificationCount > 0) {
        badge.style.display = "block";
        badge.textContent = notificationCount > 9 ? "9+" : notificationCount;
      } else {
        badge.style.display = "none";
      }
    }
  }

  /**
   * Salva notificações no localStorage
   */
  function saveNotifications() {
    try {
      localStorage.setItem("instacar_notifications", JSON.stringify(notifications));
      localStorage.setItem("instacar_notification_count", notificationCount.toString());
    } catch (e) {
      console.error("Erro ao salvar notificações:", e);
    }
  }

  /**
   * Carrega notificações do localStorage
   */
  function loadNotifications() {
    try {
      const saved = localStorage.getItem("instacar_notifications");
      if (saved) {
        notifications = JSON.parse(saved).map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
      }
      const count = localStorage.getItem("instacar_notification_count");
      if (count) {
        notificationCount = parseInt(count, 10);
      } else {
        // Recalcular se não tiver salvo
        notificationCount = notifications.filter(n => !n.read).length;
      }
      updateNotificationBadge();
    } catch (e) {
      console.error("Erro ao carregar notificações:", e);
    }
  }

  /**
   * Abre o modal de notificações
   */
  function abrirModalNotificacoes() {
    const modal = document.getElementById("modalNotificacoes");
    if (!modal) {
      criarModalNotificacoes();
    } else {
      modal.classList.add("active");
      renderizarNotificacoes();
    }
  }

  /**
   * Fecha o modal de notificações
   */
  function fecharModalNotificacoes() {
    const modal = document.getElementById("modalNotificacoes");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * Cria o modal de notificações
   */
  function criarModalNotificacoes() {
    const modal = document.createElement("div");
    modal.id = "modalNotificacoes";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h2 class="modal-title">Notificações</h2>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="window.notificationSystem.markAllAsRead()" class="btn btn-sm btn-secondary">Marcar todas como lidas</button>
            <button class="modal-close" onclick="window.notificationSystem.fecharModalNotificacoes()">&times;</button>
          </div>
        </div>
        <div class="modal-body" id="notificacoesList" style="max-height: 500px; overflow-y: auto;">
          <div class="loading"><p>Carregando notificações...</p></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    renderizarNotificacoes();
  }

  /**
   * Renderiza a lista de notificações
   */
  function renderizarNotificacoes() {
    const container = document.getElementById("notificacoesList");
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔔</div>
          <div class="empty-state-title">Nenhuma notificação</div>
          <div class="empty-state-text">Você está em dia!</div>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications.map(notif => {
      const icon = {
        success: "✅",
        error: "❌",
        warning: "⚠️",
        info: "ℹ️"
      }[notif.type] || "ℹ️";

      const timeAgo = getTimeAgo(notif.timestamp);
      const readClass = notif.read ? "" : "unread";

      return `
        <div class="notification-item ${readClass}" style="padding: 16px; border-bottom: 1px solid #e2e8f0; cursor: pointer; transition: background 0.2s;" 
             onclick="window.notificationSystem.markAsRead(${notif.id}); ${notif.link ? `window.location.href='${notif.link}'` : ''}">
          <div style="display: flex; gap: 12px;">
            <span style="font-size: 24px;">${icon}</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #0f172a; margin-bottom: 4px;">${notif.title}</div>
              <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">${notif.message}</div>
              <div style="font-size: 12px; color: #94a3b8;">${timeAgo}</div>
            </div>
            ${!notif.read ? '<div style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-top: 8px;"></div>' : ''}
            <button onclick="event.stopPropagation(); window.notificationSystem.removeNotification(${notif.id})" 
                    style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px;">&times;</button>
          </div>
        </div>
      `;
    }).join("");

    // Adicionar estilo para não lidas
    if (!document.getElementById("notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        .notification-item.unread {
          background: #f8fafc;
        }
        .notification-item:hover {
          background: #f1f5f9;
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Calcula tempo relativo
   */
  function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
    return "Agora";
  }

  /**
   * Inicializa o sistema de notificações
   */
  function inicializar() {
    loadNotifications();
    updateNotificationBadge();

    // Escutar eventos do Supabase (se disponível)
    if (window.supabaseClient) {
      // Exemplo: escutar mudanças em campanhas
      // Isso pode ser expandido conforme necessário
    }
  }

  // Expor API pública
  window.notificationSystem = {
    showToast,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    abrirModalNotificacoes,
    fecharModalNotificacoes,
    getNotifications: () => notifications,
    getCount: () => notificationCount
  };

  // Expor função global para compatibilidade
  window.abrirModalNotificacoes = abrirModalNotificacoes;

  // Inicializar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }

  // Exemplo: Adicionar notificação quando campanha for concluída
  // Isso pode ser integrado com o app.js quando necessário
  window.addEventListener("campanhaConcluida", (e) => {
    addNotification(
      "Campanha Concluída",
      `A campanha "${e.detail.nome}" foi concluída com sucesso.`,
      "success",
      "#/campanhas"
    );
  });
})();

