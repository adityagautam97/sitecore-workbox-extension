// Main content script - modular version without ES6 imports
(function () {
  "use strict";

  // Wait for all modules to be loaded
  function waitForModules(callback) {
    const checkModules = () => {
      if (
        window.SitecoreHelper &&
        window.SitecoreHelper.Config &&
        window.SitecoreHelper.Utils &&
        window.SitecoreHelper.API &&
        window.SitecoreHelper.Workflow &&
        window.SitecoreHelper.Checkbox &&
        window.SitecoreHelper.Notification &&
        window.SitecoreHelper.Workbox
      ) {
        callback();
      } else {
        setTimeout(checkModules, 50);
      }
    };
    checkModules();
  }

  waitForModules(() => {
    const { autoInit } = window.SitecoreHelper.Workbox;
    const { handleDynamicCheckboxButton } = window.SitecoreHelper.Checkbox;
    const { queryWorkflowStates, updateWorkflowStates } =
      window.SitecoreHelper.Workflow;
    const { getCheckedItems, clearAllCheckboxes } = window.SitecoreHelper.Utils;
    const { createNotificationPopup } = window.SitecoreHelper.Notification;

    let initialized = false;

    // Handle workflow operations
    async function handleWorkflowQuery() {
      const checkedIds = getCheckedItems();
      if (checkedIds.length === 0) {
        return {
          success: false,
          count: 0,
        };
      }

      try {
        const workflowData = await queryWorkflowStates(checkedIds);
        const updateResults = await updateWorkflowStates(workflowData);

        // Clear all checkboxes after successful workflow update
        const clearedCount = clearAllCheckboxes();

        const result = {
          success: true,
          count: checkedIds.length,
          workflowData: workflowData,
          updateResults: updateResults,
          clearedCheckboxes: clearedCount,
        };

        // Show notification with workflow update results
        const successCount = updateResults.filter((r) => r.success).length;
        const failedCount = updateResults.filter(
          (r) => !r.success && !r.skipped
        ).length;
        const skippedCount = updateResults.filter((r) => r.skipped).length;

        createNotificationPopup({
          type: successCount > 0 ? "success" : "error",
          title: "Workflow Update Complete",
          message: `Processed ${checkedIds.length} items. ${successCount} successful, ${failedCount} failed, ${skippedCount} skipped.`,
          updateResults: updateResults,
          skippedCount: skippedCount,
        });

        return result;
      } catch (error) {
        const result = {
          success: false,
          message: "Error querying workflow states",
          count: 0,
        };

        // Show notification for error
        createNotificationPopup({
          type: "error",
          title: "Workflow Update Error",
          message:
            "Error occurred while processing workflow states. Please try again.",
        });

        return result;
      }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        if (!initialized) {
          autoInit();
          initialized = true;
        }
      });
    } else {
      autoInit();
      initialized = true;
    }

    // Message listener for popup communication
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Content script received message:", request);

      switch (request.action) {
        case "addDynamicCheckboxes":
          handleDynamicCheckboxButton()
            .then(sendResponse)
            .catch((error) => {
              console.error("Error in addDynamicCheckboxes:", error);
              sendResponse({ success: false, message: error.message });
            });
          return true; // Keep message channel open for async response

        case "queryWorkflowStates":
          handleWorkflowQuery()
            .then(sendResponse)
            .catch((error) => {
              console.error("Error in queryWorkflowStates:", error);
              sendResponse({ success: false, message: error.message });
            });
          return true; // Keep message channel open for async response

        case "showNotification":
          try {
            createNotificationPopup(request.data);
            sendResponse({ success: true });
          } catch (error) {
            console.error("Error showing notification:", error);
            sendResponse({ success: false, message: error.message });
          }
          break;

        default:
          console.log("Unknown action:", request.action);
          sendResponse({ success: false, message: "Unknown action" });
      }
    });

    console.log(
      "Sitecore XM Cloud Helper content script loaded (modular version)"
    );
  });
})();
