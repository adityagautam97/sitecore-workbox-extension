(function () {
  const cfg = {
    observerConfig: { childList: true, subtree: true },
    workboxSelector: ".scWorkBoxData",
    workboxWrapperSelector: ".scWorkboxContentContainer",
    workboxIframeSelector: 'iframe[src*="xmlcontrol=Workbox"]',
    pathSpanClass: "scWorkBoxItemPath",
    processedAttr: "data-path-processed",
    pathLabel: "Item Path: ",
    cacheKey: "workboxItemPaths",
    cacheTTL: 86400000,
    checkInterval: 1000,
    maxChecks: 10,
    graphQLFields: "path",
    encryptionKey: "FhxImvR3U4uIZUSR",
    nodeClass: "scContentTreeNodeNormal",
    idPrefix: "Tree_Node_",
  };

  const WORKFLOW_STATES = {
    DRAFT: {
      id: "{08BC4A4D-5F9E-42BB-8218-74DD24F61310}",
      displayName: "Draft",
      order: 0,
    },
    AWAITING_APPROVAL: {
      id: "{E1FA22C6-9226-4909-BA05-C0BF5CC850C8}",
      displayName: "Awaiting Approval",
      order: 1,
    },
    CONTENT_REVIEW: {
      id: "{65ED77CF-DDB0-48B7-92AD-8668415623EA}",
      displayName: "Content Review",
      order: 2,
    },
    APPROVED: {
      id: "{D7C975E2-4F04-4858-889E-6990C4D22DAB}",
      displayName: "Approved",
      order: 3,
    },
  };

  let initialized = false;

  const getIframeDoc = (iframe) => {
    try {
      return iframe.contentDocument || iframe.contentWindow.document;
    } catch (e) {
      return null;
    }
  };

  const isWorkboxPresent = (doc = document) => {
    if (doc.querySelector(cfg.workboxWrapperSelector)) return true;
    const iframe = doc.querySelector(cfg.workboxIframeSelector);
    const iframeDoc = iframe && getIframeDoc(iframe);
    return iframeDoc && !!iframeDoc.querySelector(cfg.workboxWrapperSelector);
  };

  const getCache = () => {
    try {
      const cache = JSON.parse(localStorage.getItem(cfg.cacheKey) || "{}");
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
  };

  const saveCache = (data) => {
    try {
      localStorage.setItem(
        cfg.cacheKey,
        JSON.stringify({
          items: data.items,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      // Silent fail for cache errors
    }
  };

  const validCache = (data) => Date.now() - data.timestamp < cfg.cacheTTL;

  const getApiKey = () =>
    new Promise((res) => {
      chrome.storage.local.get(["environments"], ({ environments }) => {
        const h = window.location.hostname.toLowerCase();
        const findKey = (env) => {
          if (!env) return null;
          const domainMatch =
            !env.domain ||
            h ===
              env.domain
                .replace(/^https?:\/\//, "")
                .replace(/\/.*/, "")
                .toLowerCase();
          return domainMatch && env.apiKey ? decryptString(env.apiKey) : null;
        };
        res(
          findKey(environments?.dev) ||
            findKey(environments?.qa) ||
            findKey(environments?.prod) ||
            null
        );
      });
    });

  const fetchPaths = async (ids) => {
    const apiKey = (await getApiKey())?.trim();
    if (!apiKey) return {};

    const query = `query { ${ids
      .map(
        (id, i) =>
          `item${i}: item(path: "${id}", language: "en") { ${cfg.graphQLFields} }`
      )
      .join("\n")} }`;

    try {
      const res = await fetch(
        `${
          location.origin
        }/sitecore/api/graph/edge?sc_apikey=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );
      const { data = {} } = await res.json();
      return Object.fromEntries(
        ids.map((id, i) => [
          id,
          { itemPath: data[`item${i}`]?.path || "Path not available" },
        ])
      );
    } catch {
      return {};
    }
  };

  const processItems = async (doc = document) => {
    const items = doc.querySelectorAll(
      `${cfg.workboxSelector}:not([${cfg.processedAttr}])`
    );
    if (!items.length) return;

    const cache = getCache();
    const useCache = validCache(cache);
    const uncached = [],
      updates = [];

    items.forEach((el) => {
      const cont = el.querySelector("div");
      const idMatch = cont?.getAttribute("onclick")?.match(/\{([A-F0-9-]+)\}/i);
      if (!idMatch) return;

      const id = `{${idMatch[1]}}`;
      if (el.querySelector(`.${cfg.pathSpanClass}`)) return;

      const pathDiv = Object.assign(doc.createElement("div"), {
        className: cfg.pathSpanClass,
      });
      pathDiv.style = "color:#000;font-size:12px;margin-top:4px";
      pathDiv.innerHTML = `<span style="font-weight:600">${cfg.pathLabel}</span><span>Loading...</span>`;

      cont?.parentNode?.insertBefore(pathDiv, cont.nextSibling);
      el.setAttribute(cfg.processedAttr, "true");

      if (useCache && cache.items[id]) {
        pathDiv.querySelector("span:last-child").textContent =
          cache.items[id].itemPath;
      } else {
        uncached.push(id);
        updates.push({ el, span: pathDiv.querySelector("span:last-child") });
      }
    });

    if (!uncached.length) return;
    const newPaths = await fetchPaths(uncached);
    const updatedCache = getCache();
    uncached.forEach((id, i) => {
      const path = newPaths[id]?.itemPath || "Path not available";
      updates[i].span.textContent = path;
      updatedCache.items[id] = { itemPath: path };
    });
    saveCache(updatedCache);
  };

  const observeDOM = (doc = document) => {
    const container = doc.querySelector(cfg.workboxWrapperSelector) || doc.body;
    const obs = new MutationObserver(() => {
      clearTimeout(window.workboxProcessingTimeout);
      window.workboxProcessingTimeout = setTimeout(
        () => processItems(doc),
        300
      );
    });
    obs.observe(container, cfg.observerConfig);
  };

  const initHelper = () => {
    if (initialized) return;
    if (!validCache(getCache())) localStorage.removeItem(cfg.cacheKey);
    processItems();
    observeDOM();

    const iframe = document.querySelector(cfg.workboxIframeSelector);
    const doc = iframe && getIframeDoc(iframe);
    if (doc && isWorkboxPresent(doc)) {
      processItems(doc);
      observeDOM(doc);
    }
    initialized = true;
  };

  const autoInit = () => {
    if (isWorkboxPresent()) return initHelper();

    let checks = 0;
    const interval = setInterval(() => {
      if (isWorkboxPresent()) {
        clearInterval(interval);
        initHelper();
      } else if (++checks >= cfg.maxChecks) {
        clearInterval(interval);
      }
    }, cfg.checkInterval);

    new MutationObserver(() => {
      if (!initialized && isWorkboxPresent()) initHelper();
    }).observe(document.body, cfg.observerConfig);
  };

  function decryptString(encryptedStr) {
    if (!encryptedStr) return "";
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedStr, cfg.encryptionKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return "";
    }
  }

  function getDynamicActiveNodeIds() {
    // Try multiple iframe selectors to find the content tree
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

    // Try multiple node selectors
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

  function addDynamicCheckboxesToTreeNodes(dynamicIds) {
    const innerDoc = document.querySelector('iframe[src*="shell"]')
      ?.contentWindow?.document;
    if (!innerDoc) return;

    dynamicIds.forEach((id) => {
      const treeNodeId = `Tree_Node_${id}`;
      const treeNode = innerDoc.getElementById(treeNodeId);

      if (treeNode && !treeNode.querySelector(".tree-node-checkbox")) {
        const checkbox = innerDoc.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "tree-node-checkbox";
        checkbox.id = `checkbox_${id}`;
        checkbox.setAttribute("data-node-id", id);
        checkbox.setAttribute("data-checked", "false");
        checkbox.setAttribute("data-covered", "false");

        checkbox.addEventListener("click", function (e) {
          e.stopPropagation();
          const isChecked = this.checked;
          this.setAttribute("data-checked", isChecked.toString());
          this.setAttribute("data-covered", isChecked.toString());
        });

        checkbox.addEventListener("change", function (e) {
          e.stopPropagation();
          const isChecked = this.checked;
          this.setAttribute("data-checked", isChecked.toString());
          this.setAttribute("data-covered", isChecked.toString());
        });

        checkbox.style.marginRight = "5px";
        checkbox.style.verticalAlign = "middle";
        treeNode.insertBefore(checkbox, treeNode.firstChild);
      }
    });
  }

  async function handleDynamicCheckboxButton() {
    const dynamicIds = getDynamicActiveNodeIds();
    if (dynamicIds.length === 0) {
      return {
        success: false,
        count: 0,
      };
    }

    try {
      const apiKey = (await getApiKey())?.trim();
      if (!apiKey) {
        return { success: false, message: "No API key configured", count: 0 };
      }

      const basePageTemplateId = "4C3E37FFEB0F4D9CB50764C8BED1D667";
      const BATCH = 20;
      const allPageIds = [];

      async function runBatch(batch) {
        const inner = batch
          .map(
            (id, idx) => `i${idx}: item(path: "${id}", language: "en") {
          id template { id baseTemplates { id } }
        }`
          )
          .join("\n");

        try {
          const res = await fetch(
            `${
              location.origin
            }/sitecore/api/graph/edge?sc_apikey=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({ query: `{ ${inner} }` }),
            }
          );

          const { data = {} } = await res.json();
          return batch.filter((_, idx) => {
            const tmpl = data[`i${idx}`]?.template;
            return (
              tmpl &&
              tmpl.baseTemplates?.some((bt) => bt.id === basePageTemplateId)
            );
          });
        } catch {
          return [];
        }
      }

      for (let i = 0; i < dynamicIds.length; i += BATCH) {
        const slice = dynamicIds.slice(i, i + BATCH);
        const pageIds = await runBatch(slice);
        allPageIds.push(...pageIds);
      }

      addDynamicCheckboxesToTreeNodes(allPageIds);
      return { success: true, count: allPageIds.length };
    } catch {
      return { success: false, message: "Error processing nodes", count: 0 };
    }
  }

  function getCheckedItems() {
    // Try multiple iframe selectors to find the content tree
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
      console.log(
        "Could not find content tree iframe document for checked items"
      );
      return [];
    }

    const checkedBoxes = innerDoc.querySelectorAll(
      ".tree-node-checkbox:checked"
    );

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

  function getNextWorkflowState(currentStateId) {
    if (!currentStateId) return null;

    const normalizedCurrentId = currentStateId
      .replace(/[{}]/g, "")
      .toUpperCase();
    const currentStateKey = Object.keys(WORKFLOW_STATES).find((key) => {
      const normalizedStateId = WORKFLOW_STATES[key].id
        .replace(/[{}]/g, "")
        .toUpperCase();
      return normalizedStateId === normalizedCurrentId;
    });

    if (!currentStateKey) return null;

    const currentOrder = WORKFLOW_STATES[currentStateKey].order;
    const nextStateKey = Object.keys(WORKFLOW_STATES).find(
      (key) => WORKFLOW_STATES[key].order === currentOrder + 1
    );
    return nextStateKey ? WORKFLOW_STATES[nextStateKey] : null;
  }

  async function queryWorkflowStates(itemIds) {
    const apiKey = (await getApiKey())?.trim();
    if (!apiKey || !itemIds?.length) return [];

    const workflowData = [];
    const BATCH = 10;

    async function runWorkflowBatch(batch) {
      const queries = batch
        .map((id, idx) => {
          const cleanId = id.replace(/[{}]/g, "");
          return `item${idx}: item(where: {itemId: "${cleanId}"}) 
              {
                workflow{
                  workflow{
                    displayName
                  }
                  workflowState{
                    stateId
                    displayName
                  }
                }
              }`;
        })
        .join("\n");

      try {
        const res = await fetch(
          `${
            location.origin
          }/sitecore/api/authoring/graphql/v1?sc_apikey=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ query: `query { ${queries} }` }),
          }
        );

        const { data = {} } = await res.json();
        return batch.map((id, idx) => {
          const item = data[`item${idx}`];
          const currentWorkflowState = item?.workflow?.workflowState;
          const currentWorkflow = item?.workflow?.workflow?.displayName;
          let nextWorkflowState = null;

          if (currentWorkflowState?.stateId) {
            nextWorkflowState = getNextWorkflowState(
              currentWorkflowState.stateId
            );
          }

          return {
            id: id,
            currentWorkflowState: currentWorkflowState || {
              displayName: "No workflow",
              stateId: null,
            },
            nextWorkflowState: nextWorkflowState || {
              displayName: "No next state",
              id: null,
            },
            currentWorkflow: currentWorkflow,
          };
        });
      } catch {
        return batch.map((id) => ({
          id: id,
          currentWorkflowState: { displayName: "Error", stateId: null },
          nextWorkflowState: { displayName: "Error", id: null },
        }));
      }
    }

    for (let i = 0; i < itemIds.length; i += BATCH) {
      const slice = itemIds.slice(i, i + BATCH);
      const batchResults = await runWorkflowBatch(slice);
      workflowData.push(...batchResults);
    }
    return workflowData;
  }

  async function updateWorkflowStates(workflowData) {
    const apiKey = (await getApiKey())?.trim();
    if (!apiKey || !workflowData?.length) return [];

    const updateResults = [];
    const BATCH = 5;

    async function runUpdateBatch(batch) {
      const validItems = [];
      const skippedItems = [];
      const mutations = batch
        .map((item, idx) => {
          const cleanId = item.id.replace(/[{}]/g, "");
          const currentStateId = item.currentWorkflowState?.stateId;
          const currentWorkflow = item.currentWorkflow;

          // Skip if already approved or has no workflow set
          if (
            !currentWorkflow ||
            (currentStateId &&
              currentStateId.replace(/[{}]/g, "").toUpperCase() ===
                WORKFLOW_STATES.APPROVED.id.replace(/[{}]/g, "").toUpperCase())
          ) {
            // Track skipped items
            skippedItems.push({
              id: item.id,
              success: false,
              skipped: true,
              reason: !currentWorkflow
                ? "No workflow assigned"
                : "Already approved",
              path: "Unknown",
              currentState: item.currentWorkflowState?.displayName || "Unknown",
            });
            return null;
          }

          let targetStateId;
          if (
            item.nextWorkflowState &&
            item.nextWorkflowState.id &&
            item.nextWorkflowState.id !== null
          ) {
            targetStateId = item.nextWorkflowState.id;
          } else {
            targetStateId = WORKFLOW_STATES.DRAFT.id;
          }

          validItems.push({ ...item, targetStateId, originalIndex: idx });

          return `update${validItems.length - 1}: updateItem(input: {
          itemId: "${cleanId}"
          fields: [{ name: "__Workflow state" value: "${targetStateId}" }]
        }) { item { path } }`;
        })
        .filter(Boolean)
        .join("\n");

      if (!mutations) return skippedItems; // Return skipped items if no mutations

      try {
        const res = await fetch(
          `${
            location.origin
          }/sitecore/api/authoring/graphql/v1?sc_apikey=${encodeURIComponent(
            apiKey
          )}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ query: `mutation { ${mutations} }` }),
          }
        );

        const { data = {} } = await res.json();
        const updateResults = validItems.map((item, idx) => {
          const updateResult = data[`update${idx}`];
          return {
            id: item.id,
            success: !!updateResult?.item,
            path: updateResult?.item?.path || "Unknown",
            targetStateId: item.targetStateId,
            targetStateName:
              item.nextWorkflowState?.displayName ||
              WORKFLOW_STATES.DRAFT.displayName,
            currentState: item.currentWorkflowState?.displayName || "Unknown",
          };
        });

        // Combine update results with skipped items
        return [...updateResults, ...skippedItems];
      } catch {
        const failedResults = validItems.map((item) => ({
          id: item.id,
          success: false,
          error: "Update failed",
          targetStateId: item.targetStateId,
          targetStateName:
            item.nextWorkflowState?.displayName ||
            WORKFLOW_STATES.DRAFT.displayName,
          currentState: item.currentWorkflowState?.displayName || "Unknown",
        }));

        // Combine failed results with skipped items
        return [...failedResults, ...skippedItems];
      }
    }

    for (let i = 0; i < workflowData.length; i += BATCH) {
      const slice = workflowData.slice(i, i + BATCH);
      const batchResults = await runUpdateBatch(slice);
      updateResults.push(...batchResults);
    }

    return updateResults;
  }

  async function handleWorkflowQuery() {
    const checkedIds = getCheckedItems();
    if (checkedIds.length === 0) {
      const result = {
        success: false,
        count: 0,
      };

      return result;
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

  // Notification system
  function createNotificationPopup(data) {
    console.log("Creating notification popup with data:", data);

    // Try to find the best document to append to (main document or iframe)
    let targetDocument = document;
    let targetBody = document.body;

    // Check if we're in an iframe and try to use the parent document
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

    // Remove existing notification if any
    const existing = targetDocument.getElementById(
      "sitecore-workflow-notification"
    );
    if (existing) {
      existing.remove();
      console.log("Removed existing notification");
    }

    // Add styles first if not already present
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
          font-size: 16px !important;
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

    const successCount =
      data.updateResults?.filter((r) => r.success).length || 0;
    const failedCount =
      data.updateResults?.filter((r) => !r.success && !r.skipped).length || 0;
    const skippedCount =
      data.updateResults?.filter((r) => r.skipped).length || 0;

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
              <span style="color: #ff9800; font-weight: bold;">${skippedCount}</span>
            </div>
            `
                : ""
            }
            <div class="update-item">
              <span><strong>Total Processed:</strong></span>
              <span><strong>${
                successCount + failedCount + skippedCount
              }</strong></span>
            </div>

          </div>
        `
            : ""
        }
      </div>
    `;

    // Add close button event listener
    const closeBtn = popup.querySelector(".notification-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup.remove();
        console.log("Notification closed by user");
      });
    }

    // Add click-to-close functionality
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.remove();
        console.log("Notification closed by clicking outside");
      }
    });

    targetBody.appendChild(popup);
    console.log(
      "Notification popup added to DOM in",
      targetDocument === document ? "current document" : "parent document"
    );

    // Auto-remove after 10 seconds
    const autoRemoveTimeout = setTimeout(() => {
      if (popup.parentElement) {
        popup.remove();
        console.log("Notification auto-removed after 10 seconds");
      }
    }, 10000);

    // Clear timeout if manually closed
    popup.addEventListener("remove", () => {
      clearTimeout(autoRemoveTimeout);
    });

    return popup;
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === "addDynamicCheckboxes") {
      handleDynamicCheckboxButton().then(sendResponse);
      return true;
    }

    if (request.action === "queryWorkflowStates") {
      handleWorkflowQuery().then(sendResponse);
      return true;
    }

    if (request.action === "showNotification") {
      try {
        console.log("Received showNotification request:", request.data);
        createNotificationPopup(request.data);
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error creating notification popup:", error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    if (request.action === "testNotification") {
      try {
        createNotificationPopup({
          type: "success",
          title: "Test Notification",
          message:
            "This is a test notification to verify the popup is working.",
          updateResults: [
            { success: true },
            { success: true },
            { success: false },
          ],
        });
        sendResponse({ success: true });
      } catch (error) {
        console.error("Error creating test notification:", error);
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }
  });

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", autoInit)
    : autoInit();
})();
