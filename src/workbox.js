// Workbox service
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Workbox = (function() {
  'use strict';

  const { CONFIG } = window.SitecoreHelper.Config;
  const { getCache, saveCache, validCache, getIframeDoc, isWorkboxPresent } = window.SitecoreHelper.Utils;
  const { fetchPaths } = window.SitecoreHelper.API;

  async function processItems(doc = document) {
    const items = doc.querySelectorAll(
      `${CONFIG.workboxSelector}:not([${CONFIG.processedAttr}])`
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
      if (el.querySelector(`.${CONFIG.pathSpanClass}`)) return;

      const pathDiv = Object.assign(doc.createElement("div"), {
        className: CONFIG.pathSpanClass,
      });
      pathDiv.style = "color:#000;font-size:12px;margin-top:4px";
      pathDiv.innerHTML = `<span style="font-weight:600">${CONFIG.pathLabel}</span><span>Loading...</span>`;

      cont?.parentNode?.insertBefore(pathDiv, cont.nextSibling);
      el.setAttribute(CONFIG.processedAttr, "true");

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
  }

  function observeDOM(doc = document) {
    const container = doc.querySelector(CONFIG.workboxWrapperSelector) || doc.body;
    const obs = new MutationObserver(() => {
      clearTimeout(window.workboxProcessingTimeout);
      window.workboxProcessingTimeout = setTimeout(
        () => processItems(doc),
        300
      );
    });
    obs.observe(container, CONFIG.observerConfig);
  }

  function initHelper() {
    if (window.sitecoreHelperInitialized) return;
    if (!validCache(getCache())) localStorage.removeItem(CONFIG.cacheKey);
    processItems();
    observeDOM();

    const iframe = document.querySelector(CONFIG.workboxIframeSelector);
    const doc = iframe && getIframeDoc(iframe);
    if (doc && isWorkboxPresent(doc)) {
      processItems(doc);
      observeDOM(doc);
    }
    window.sitecoreHelperInitialized = true;
  }

  function autoInit() {
    if (isWorkboxPresent()) return initHelper();

    let checks = 0;
    const interval = setInterval(() => {
      if (isWorkboxPresent()) {
        clearInterval(interval);
        initHelper();
      } else if (++checks >= CONFIG.maxChecks) {
        clearInterval(interval);
      }
    }, CONFIG.checkInterval);

    new MutationObserver(() => {
      if (!window.sitecoreHelperInitialized && isWorkboxPresent()) initHelper();
    }).observe(document.body, CONFIG.observerConfig);
  }

  return {
    processItems,
    observeDOM,
    initHelper,
    autoInit
  };
})();