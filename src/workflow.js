// Workflow service
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Workflow = (function() {
  'use strict';

  const { WORKFLOW_STATES } = window.SitecoreHelper.Config;
  const { getApiKey } = window.SitecoreHelper.API;

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

          if (
            !currentWorkflow ||
            (currentStateId &&
              currentStateId.replace(/[{}]/g, "").toUpperCase() ===
                WORKFLOW_STATES.APPROVED.id.replace(/[{}]/g, "").toUpperCase())
          ) {
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

      if (!mutations) return skippedItems;

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

  return {
    getNextWorkflowState,
    queryWorkflowStates,
    updateWorkflowStates
  };
})();