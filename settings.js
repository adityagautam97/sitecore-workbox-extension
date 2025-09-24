// Settings script - modular version without ES6 imports
document.addEventListener("DOMContentLoaded", function () {
  'use strict';

  const ENCRYPTION_KEY = "FhxImvR3U4uIZUSR";

  // Encryption functions
  function encryptString(str) {
    if (!str) return "";
    return CryptoJS.AES.encrypt(str, ENCRYPTION_KEY).toString();
  }

  function decryptString(encryptedStr) {
    if (!encryptedStr) return "";
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedStr, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error("Decryption error:", e);
      return "";
    }
  }

  const saveSettingsBtn = document.getElementById("save-settings");
  const resetSettingsBtn = document.getElementById("reset-keys");
  const addDynamicCheckboxesBtn = document.getElementById("add-dynamic-checkboxes");
  const queryWorkflowBtn = document.getElementById("query-workflow-states");

  // Load saved settings
  loadSettings();

  // Save settings
  saveSettingsBtn.addEventListener("click", async function () {
    try {
      const settings = {
        dev: {
          apiKey: encryptString(
            document.getElementById("dev-api-key").value.trim()
          ),
          domain: document.getElementById("dev-domain").value.trim(),
        },
        qa: {
          apiKey: encryptString(
            document.getElementById("qa-api-key").value.trim()
          ),
          domain: document.getElementById("qa-domain").value.trim(),
        },
        prod: {
          apiKey: encryptString(
            document.getElementById("prod-api-key").value.trim()
          ),
          domain: document.getElementById("prod-domain").value.trim(),
        },
      };

      // Save to chrome.storage.local
      await chrome.storage.local.set({ environments: settings });
      showStatus("Settings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving settings:", error);
      showStatus("Error saving settings", "error");
    }
  });

  // Reset settings
  resetSettingsBtn.addEventListener("click", async function () {
    try {
      // Clear all input fields
      document.getElementById("dev-api-key").value = "";
      document.getElementById("dev-domain").value = "";
      document.getElementById("qa-api-key").value = "";
      document.getElementById("qa-domain").value = "";
      document.getElementById("prod-api-key").value = "";
      document.getElementById("prod-domain").value = "";

      // Clear storage
      await chrome.storage.local.remove("environments");
      showStatus("Settings reset successfully!", "success");
    } catch (error) {
      console.error("Error resetting settings:", error);
      showStatus("Error resetting settings", "error");
    }
  });

  // Load settings from storage
  function loadSettings() {
    chrome.storage.local.get(["environments"], function (data) {
      const envs = data.environments || {};

      if (envs.dev) {
        document.getElementById("dev-api-key").value = envs.dev.apiKey
          ? decryptString(envs.dev.apiKey)
          : "";
        document.getElementById("dev-domain").value = envs.dev.domain || "";
      }
      if (envs.qa) {
        document.getElementById("qa-api-key").value = envs.qa.apiKey
          ? decryptString(envs.qa.apiKey)
          : "";
        document.getElementById("qa-domain").value = envs.qa.domain || "";
      }
      if (envs.prod) {
        document.getElementById("prod-api-key").value = envs.prod.apiKey
          ? decryptString(envs.prod.apiKey)
          : "";
        document.getElementById("prod-domain").value = envs.prod.domain || "";
      }
    });
  }

  // Add dynamic checkboxes functionality
  addDynamicCheckboxesBtn.addEventListener("click", async function () {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showStatus("No active tab found", "error");
        return;
      }

      // Send message to content script to add dynamic checkboxes
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "addDynamicCheckboxes",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus("Error: Make sure you are on a Sitecore page", "error");
            return;
          }

          if (response && response.success) {
            showStatus(
              `Added checkboxes to ${response.count} active nodes`,
              "success"
            );
          } else if(response && response.error){
            showStatus(response?.message || "No active nodes found", "error");
          } else {
            showStatus(response?.message || "Finding active nodes");
          }
        }
      );
    } catch (error) {
      console.error("Error adding dynamic checkboxes:", error);
      showStatus("Error adding dynamic checkboxes", "error");
    }
  });

  // Query workflow states functionality
  queryWorkflowBtn.addEventListener("click", async function () {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        showStatus("No active tab found", "error");
        return;
      }

      // Send message to content script to get checked items and query workflow states
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: "queryWorkflowStates",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            showStatus("Error: Make sure you are on a Sitecore page", "error");
            return;
          }

          if (response && response.success) {
            showStatus(
              `Queried workflow states for ${response.count} checked items.`,
              "success"
            );

            // Send notification to content script to show popup
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "showNotification",
                data: {
                  type: "success",
                  title: "Workflow Update Complete",
                  message: `Successfully processed ${response.count} items`,
                  updateResults: response.updateResults,
                },
              },
              (notificationResponse) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error sending notification:",
                    chrome.runtime.lastError
                  );
                } else {
                  console.log(
                    "Notification sent successfully:",
                    notificationResponse
                  );
                }
              }
            );
          } else if(response && response.error){
            showStatus(response?.message || "No checked items found", "error");
          } else {
            showStatus(response?.message || "Finding checked items");
          }
        }
      );
    } catch (error) {
      console.error("Error querying workflow states:", error);
      showStatus("Error querying workflow states", "error");
    }
  });

  // Show status message
  function showStatus(message, type) {
    // Create status element if it doesn't exist
    let statusEl = document.getElementById("status-message");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "status-message";
      statusEl.className = "status";
      document.querySelector(".popup-container").appendChild(statusEl);
    }

    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = "block";

    // Hide after 3 seconds
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);
  }
});