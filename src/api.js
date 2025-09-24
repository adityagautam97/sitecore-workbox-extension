// API service
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.API = (function() {
  'use strict';

  const { CONFIG } = window.SitecoreHelper.Config;
  const { decryptString } = window.SitecoreHelper.Utils;

  async function getApiKey() {
    return new Promise((res) => {
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
  }

  async function fetchPaths(ids) {
    const apiKey = (await getApiKey())?.trim();
    if (!apiKey) return {};

    const query = `query { ${ids
      .map(
        (id, i) =>
          `item${i}: item(path: "${id}", language: "en") { ${CONFIG.graphQLFields} }`
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
  }

  return {
    getApiKey,
    fetchPaths
  };
})();