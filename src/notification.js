// Notification service
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Notification = (function() {
  'use strict';

  function createNotificationPopup(data) {
    console.log("Creating notification popup with data:", data);

    let targetDocument = document;
    let targetBody = document.body;

    if (window.parent && window.parent !== window) {
      try {
        if (window.parent.document && window.parent.document.body) {
          targetDocument = window.parent.document;
          targetBody = window.parent.document.body;
          console.log("Using parent document for notification");
        }
      } catch (e) {
        console.log("Cannot access parent document, using current document");
      }
    }

    const existing = targetDocument.getElementById("sitecore-workflow-notification");
    if (existing) {
      existing.remove();
      console.log("Removed existing notification");
    }

    if (!targetDocument.getElementById("sitecore-notification-styles")) {
      const styles = targetDocument.createElement("style");
      styles.id = "sitecore-notification-styles";
      styles.textContent = `
        #sitecore-workflow-notification {
          position: fixed !important;
          top: 20px !important;
          right: 20px !important;
          background: #fff !important;
          border: 2px solid #4CAF50 !important;
          border-radius: 8px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
          padding: 20px !important;
          max-width: 400px !important;
          min-width: 300px !important;
          z-index: 2147483647 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
          display: block !important;
          font-size: 14px !important;
          line-height: 1.4 !important;
          color: #333 !important;
          animation: slideInRight 0.3s ease-out !important;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%) !important;
            opacity: 0 !important;
          }
          to {
            transform: translateX(0) !important;
            opacity: 1 !important;
          }
        }
        #sitecore-workflow-notification .notification-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          margin-bottom: 15px !important;
          font-weight: bold !important;
          color: #2e7d32 !important;
          font-size: 16px !important;
        }
        #sitecore-workflow-notification .notification-close {
          background: #f5f5f5 !important;
          border: 1px solid #ddd !important;
          border-radius: 50% !important;
          font-size: 18px !important;
          cursor: pointer !important;
          color: #666 !important;
          padding: 4px !important;
          width: 24px !important;
          height: 24px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s ease !important;
        }
        #sitecore-workflow-notification .notification-close:hover {
          background: #e0e0e0 !important;
          color: #333 !important;
        }
        #sitecore-workflow-notification .notification-body {
          font-size: 14px !important;
          color: #555 !important;
          line-height: 1.5 !important;
        }
        #sitecore-workflow-notification.notification-success {
          border-color: #4CAF50 !important;
        }
        #sitecore-workflow-notification.notification-error {
          border-color: #f44336 !important;
        }
        #sitecore-workflow-notification .update-summary {
          margin-top: 12px !important;
          padding: 12px !important;
          background: #f8f9fa !important;
          border: 1px solid #e9ecef !important;
          border-radius: 6px !important;
          font-size: 13px !important;
        }
        #sitecore-workflow-notification .update-item {
          display: flex !important;
          justify-content: space-between !important;
          margin: 4px 0 !important;
          padding: 2px 0 !important;
        }
        #sitecore-workflow-notification .update-success {
          color: #2e7d32 !important;
          font-weight: bold !important;
        }
        #sitecore-workflow-notification .update-failed {
          color: #d32f2f !important;
          font-weight: bold !important;
        }
      `;
      targetDocument.head.appendChild(styles);
      console.log(
        "Added notification styles to",
        targetDocument === document ? "current document" : "parent document"
      );
    }

    const popup = targetDocument.createElement("div");
    popup.id = "sitecore-workflow-notification";
    popup.className = `notification-${data.type || "info"}`;

    const successCount = data.updateResults?.filter((r) => r.success).length || 0;
    const failedCount = data.updateResults?.filter((r) => !r.success && !r.skipped).length || 0;
    const skippedCount = data.updateResults?.filter((r) => r.skipped).length || 0;

    popup.innerHTML = `
      <div class="notification-header">
        <span>${data.title || "Notification"}</span>
        <button class="notification-close" title="Close">×</button>
      </div>
      <div class="notification-body">
        <div><strong>${data.message || "No message"}</strong></div>
        ${
          data.updateResults && data.updateResults.length > 0
            ? `
          <div class="update-summary">
            <div class="update-item">
              <span>✅ Successful Updates:</span>
              <span class="update-success">${successCount}</span>
            </div>
            <div class="update-item">
              <span>❌ Failed Updates:</span>
              <span class="update-failed">${failedCount}</span>
            </div>
            ${
              skippedCount > 0
                ? `
            <div class="update-item">
              <span>⏭️ Skipped Items:</span>
              <span>${skippedCount}</span>
            </div>`
                : ""
            }
          </div>`
            : ""
        }
      </div>
    `;

    const closeBtn = popup.querySelector(".notification-close");
    closeBtn.addEventListener("click", () => {
      popup.remove();
    });

    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 20000);

    targetBody.appendChild(popup);
    console.log("Notification popup created and added to DOM");
  }

  return {
    createNotificationPopup
  };
})();