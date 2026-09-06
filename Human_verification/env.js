 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 

 
const UA_AUTO_RE = /headless|phantomjs|selenium|puppeteer|playwright|webdriver/i;

 
function detectCdpMarks() {
  try {
     
    const own = Object.getOwnPropertyNames(window);
    for (let i = 0; i < own.length; i++) {
      const k = own[i];
      if (k.indexOf("cdc_") === 0 || k.indexOf("$cdc_") === 0) return true;
    }
  } catch (e) {   }
  try {
    if (window.domAutomationController) return true;  
  } catch (e) {   }
  try {
     
    const de = document.documentElement;
    if (de && typeof de.getAttribute === "function" && de.getAttribute("webdriver") !== null) return true;
  } catch (e) {   }
  return false;
}



export function collectEnvEvidence() {
  const t0 = performance.now();
  const c = {
    webdriver: false,
    cdp: false,
    uaAuto: false,
    uaMismatch: false,
    pluginsEmpty: false,
    langEmpty: false,
    framed: false,
    depth: 0,
    hiddenFrame: false,
    hits: [],
    gated: false,
  };
  const hits = [];
  try {
    const nav = (typeof navigator !== "undefined") ? navigator : null;
    const ua = (nav && typeof nav.userAgent === "string") ? nav.userAgent : "";
    const uaLower = ua.toLowerCase();

     
    if (nav) {
      try { c.webdriver = nav.webdriver === true; } catch (e) {   }
    }
    if (c.webdriver) hits.push("webdriver");

     
    try { c.cdp = detectCdpMarks(); } catch (e) {   }
    if (c.cdp) hits.push("cdp");

     
    if (ua) {
      c.uaAuto = UA_AUTO_RE.test(ua);
      if (c.uaAuto) hits.push("uaAuto");
    }

     
    try {
      if (nav && nav.userAgentData && ua) {
        const brands = (nav.userAgentData.brands || []).map((b) => String(b.brand || ""));
        const uaL = uaLower;
        const uaHasChrome = uaL.indexOf("chrome") >= 0 && uaL.indexOf("edg/") < 0;
        const dataHasChrome = brands.some((b) => /chrome/i.test(b));
        const dataHasEdge = brands.some((b) => /microsoft edge|edg/i.test(b));
         
        const inconsistent = (uaHasChrome !== dataHasChrome) || (/edg\//i.test(ua) !== dataHasEdge);
        if (inconsistent) c.uaMismatch = true;
      }
    } catch (e) {   }
    if (c.uaMismatch) hits.push("uaMismatch");

     
    try {
      let w = window;
      let depth = 0;
      while (w.parent && w.parent !== w) {
        depth++;
        w = w.parent;
        if (depth > 20) break;  
      }
      c.depth = depth;
      c.framed = depth > 0;
    } catch (e) {
       
      c.depth = -1;
      c.framed = true;
    }
    if (c.framed) {
      try {
        const fe = window.frameElement;  
        if (fe) {
          const r = fe.getBoundingClientRect();
          const cs = window.getComputedStyle(fe);
          c.hiddenFrame = !!(
            (cs && (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0")) ||
            (!r || r.width < 20 || r.height < 20)
          );
          if (c.hiddenFrame) hits.push("hiddenFrame");
        }
      } catch (e) {   }
    }

     
    try {
      c.pluginsEmpty = !nav || !nav.plugins || nav.plugins.length === 0;
    } catch (e) { c.pluginsEmpty = true; }
    try {
      c.langEmpty = !nav || !nav.languages || nav.languages.length === 0;
    } catch (e) { c.langEmpty = true; }

     
    c.gated = !!(c.webdriver || c.cdp || c.uaAuto);
  } catch (err) {
     
    c.err = String((err && err.message) || err);
  }

  const t = Math.max(0, Math.round(performance.now() - t0));
  c.hits = hits;
  return {
    env: { v: 1, c, t },
    gated: c.gated,
    hits,
  };
}
