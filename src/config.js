// Configuration and constants
window.SitecoreHelper = window.SitecoreHelper || {};

window.SitecoreHelper.Config = (function() {
  'use strict';

  const CONFIG = {
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

  return {
    CONFIG: CONFIG,
    WORKFLOW_STATES: WORKFLOW_STATES
  };
})();