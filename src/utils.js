// Utility functions
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Utils = (function() {
  'use strict';

  const { CONFIG } = window.SitecoreHelper.Config;

  // Encryption utilities
  function encryptString(str) {
    if (!str) return "";
    return CryptoJS.AES.encrypt(str, CONFIG.encryptionKey).toString();
  }

  function decryptString(encryptedStr) {
    if (!encryptedStr) return "";
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedStr, CONFIG.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return "";
    }
  }

  // Cache utilities
  function getCache() {
    try {
      const cache = JSON.parse(localStorage.getItem(CONFIG.cacheKey) || "{}");
      if (typeof Object.values(cache.items || {})[0] === "string") {
        cache.items = Object.fromEntries(
          Object.entries(cache.items).map(([k, v]) => [k, { itemPath: v }])
        );
        saveCache(cache);
      }
      return { items: cache.items || {}, timestamp: cache.timestamp || 0 };
    } catch {
      return { items: {}, timestamp: 0 };
    }
  }

  function saveCache(data) {
    try {
      localStorage.setItem(
        CONFIG.cacheKey,
        JSON.stringify({
          items: data.items,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // Silent fail for cache errors
    }
  }

  function validCache(data) {
    return Date.now() - data.timestamp < CONFIG.cacheTTL;
  }

  // DOM utilities
  function getIframeDoc(iframe) {
    try {
      return iframe.contentDocument || iframe.contentWindow.document;
    } catch (e) {
      return null;
    }
  }

  function isWorkboxPresent(doc = document) {
    if (doc.querySelector(CONFIG.workboxWrapperSelector)) return true;
    const iframe = doc.querySelector(CONFIG.workboxIframeSelector);
    const iframeDoc = iframe && getIframeDoc(iframe);
    return iframeDoc && !!iframeDoc.querySelector(CONFIG.workboxWrapperSelector);
  }

  function getDynamicActiveNodeIds() {
    const iframeSelectors = [
      'iframe[src*="shell"]',
      'iframe[src*="content"]',
      'iframe[name*="shell"]',
      'iframe[name*="content"]',
    ];

    let innerDoc = null;
    for (const selector of iframeSelectors) {
      const iframe = document.querySelector(selector);
      if (iframe) {
        try {
          innerDoc = iframe.contentWindow?.document;
          if (innerDoc) break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!innerDoc) {
      console.log("Could not find content tree iframe document");
      return [];
    }

    const nodeSelectors = [
      ".scContentTreeNodeNormal",
      ".scContentTreeNode",
      "[id^='Tree_Node_']",
    ];

    let activeNodes = [];
    for (const selector of nodeSelectors) {
      activeNodes = innerDoc.querySelectorAll(selector);
      if (activeNodes.length > 0) break;
    }

    console.log(`Found ${activeNodes.length} tree nodes`);

    return [...activeNodes]
      .map((node) =>
        node.id?.startsWith("Tree_Node_")
          ? node.id.replace("Tree_Node_", "")
          : null
      )
      .filter(Boolean);
  }

  function getCheckedItems() {
    const iframeSelectors = [
      'iframe[src*="shell"]',
      'iframe[src*="content"]',
      'iframe[name*="shell"]',
      'iframe[name*="content"]',
    ];

    let innerDoc = null;
    for (const selector of iframeSelectors) {
      const iframe = document.querySelector(selector);
      if (iframe) {
        try {
          innerDoc = iframe.contentWindow?.document;
          if (innerDoc) break;
        } catch (e) {
          continue;
        }
      }
    }

    if (!innerDoc) {
      console.log("Could not find content tree iframe document for checked items");
      return [];
    }

    const checkedBoxes = innerDoc.querySelectorAll(".tree-node-checkbox:checked");
    console.log(`Found ${checkedBoxes.length} checked items`);

    return [...checkedBoxes]
      .map((checkbox) => checkbox.getAttribute("data-node-id"))
      .filter(Boolean);
  }

  function clearAllCheckboxes() {
    const innerDoc = document.querySelector('iframe[src*="shell"]')
      ?.contentWindow?.document;
    if (!innerDoc) {
      console.log("Could not find shell iframe document to clear checkboxes");
      return 0;
    }

    const allCheckboxes = innerDoc.querySelectorAll(".tree-node-checkbox");
    let clearedCount = 0;

    allCheckboxes.forEach((checkbox) => {
      if (checkbox.checked) {
        checkbox.checked = false;
        checkbox.setAttribute("data-checked", "false");
        checkbox.setAttribute("data-covered", "false");
        clearedCount++;
      }
    });

    console.log(`Cleared ${clearedCount} checkboxes`);
    return clearedCount;
  }

  return {
    encryptString,
    decryptString,
    getCache,
    saveCache,
    validCache,
    getIframeDoc,
    isWorkboxPresent,
    getDynamicActiveNodeIds,
    getCheckedItems,
    clearAllCheckboxes
  };
})();