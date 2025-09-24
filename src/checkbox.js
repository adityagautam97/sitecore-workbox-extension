// Checkbox service
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Checkbox = (function() {
  'use strict';

  const { getApiKey } = window.SitecoreHelper.API;
  const { getDynamicActiveNodeIds } = window.SitecoreHelper.Utils;

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
              tmpl 
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

  return {
    addDynamicCheckboxesToTreeNodes,
    handleDynamicCheckboxButton
  };
})();