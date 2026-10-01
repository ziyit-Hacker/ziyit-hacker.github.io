const TICKET_HEADER = "x-phantom-ticket";

const DEFAULT_BASE = "https://willian-unheady-rawly.ngrok-free.dev";
const BASE_COOKIE = "ziyit_api_base_ok";
const BASE_COOKIE_DAYS = 7;

let loadedBases = [];
let resolvedBase = "";
let backendPromise = null;

function backendTxtUrl() {
    try {
        return new URL("../backend.txt", import.meta.url).href;
    } catch (e) {
        return "backend.txt";
    }
}

function readCookie(name) {
    try {
        const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
        return m ? decodeURIComponent(m[1]) : "";
    } catch (e) {
        return "";
    }
}

function writeCookie(name, value, days) {
    try {
        const d = new Date();
        d.setTime(d.getTime() + days * 86400000);
        document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + d.toUTCString() + "; path=/";
    } catch (e) { }
}

function clearCookie(name) {
    try { document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; } catch (e) { }
}

function customBase() {
    try {
        const c = localStorage.getItem("ziyit_api_base");
        if (c) return String(c).replace(/\/+$/, "");
    } catch (e) { }
    return "";
}

function baseCookie() {
    const v = readCookie(BASE_COOKIE).replace(/\/+$/, "");
    return /^https?:\/\//i.test(v) ? v : "";
}

function cachedBase() {
    return customBase() || baseCookie();
}

function rememberBase(base) {
    if (!base) return;
     
     
     
     
    if (base === resolvedBase) return;
    resolvedBase = base;
    ticket = { token: "", expiresAt: 0 };
    if (base === customBase()) return;
    writeCookie(BASE_COOKIE, base, BASE_COOKIE_DAYS);
}

function invalidateBase() {
    resolvedBase = "";
    backendPromise = null;
    clearCookie(BASE_COOKIE);
}

function baseCandidates(primary) {
    const list = [];
    const add = (u) => {
        if (!u) return;
        const v = String(u).replace(/\/+$/, "");
        if (list.indexOf(v) === -1) list.push(v);
    };
    add(primary);
    add(baseCookie());
    loadedBases.forEach(add);
    add(DEFAULT_BASE);
    return list;
}

function parseBases(txt) {
    const out = [];
    String(txt || "").split(/\r?\n/).forEach((line) => {
        const m = line.trim().match(/https?:\/\/[^\s]+/i);
        if (!m) return;
        const u = m[0].replace(/\/+$/, "");
        if (!out.includes(u)) out.push(u);
    });
    return out;
}

function probeBase(base, timeoutMs = 3000) {
    return new Promise((resolve) => {
        let done = false;
        const timer = setTimeout(() => {
            if (!done) { done = true; resolve(false); }
        }, timeoutMs);
        try {
            fetch(base + "/", { method: "GET", mode: "no-cors", cache: "no-store" })
                .then(() => { if (!done) { done = true; clearTimeout(timer); resolve(true); } })
                .catch(() => { if (!done) { done = true; clearTimeout(timer); resolve(false); } });
        } catch (e) {
            if (!done) { done = true; clearTimeout(timer); resolve(false); }
        }
    });
}

async function pickBase(bases) {
    for (const b of bases) {
        if (await probeBase(b)) return b;
    }
    return bases[0] || DEFAULT_BASE;
}

export function backendReady() {
    if (!backendPromise) {
        const cached = cachedBase();
        if (cached) {
             
            resolvedBase = cached;
            backendPromise = fetch(backendTxtUrl(), { cache: "no-store", headers: { "ngrok-skip-browser-warning": "1" } })
                .then((res) => (res.ok ? res.text() : ""))
                .then((txt) => parseBases(txt))
                .catch(() => [])
                .then((bases) => {
                    loadedBases = bases.slice();
                    if (!loadedBases.includes(DEFAULT_BASE)) loadedBases.push(DEFAULT_BASE);
                    return cached;
                });
        } else {
            backendPromise = fetch(backendTxtUrl(), { cache: "no-store", headers: { "ngrok-skip-browser-warning": "1" } })
                .then((res) => (res.ok ? res.text() : ""))
                .then((txt) => parseBases(txt))
                .catch(() => [])
                .then(async (bases) => {
                    loadedBases = bases.slice();
                    if (!loadedBases.includes(DEFAULT_BASE)) loadedBases.push(DEFAULT_BASE);
                    const picked = await pickBase(loadedBases);
                    rememberBase(picked);
                    return picked;
                });
        }
    }
    return backendPromise;
}

export function apiBase() {
    const custom = customBase();
    if (custom) return custom;
    return resolvedBase || baseCookie() || loadedBases[0] || DEFAULT_BASE;
}

let ticket = { token: "", expiresAt: 0 };
let ticketPromise = null;

function explicitApiKey() {
    try {
        return window.PHANTOM_API_KEY || localStorage.getItem("phantom_api_key") || "";
    } catch (e) {
        return "";
    }
}

async function readError(res) {
    let detail = "";
    let body = null;
    try {
        const data = await res.json();
        body = data;
        detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
    } catch (e) {
        detail = await res.text().catch(() => "");
    }
    const err = new Error(`${res.status} ${res.statusText} ${detail}`.trim());
    err.status = res.status;
    err.detail = detail;
    err.body = body;
    return err;
}

async function fetchTicket(base) {
     
     
    const res = await fetch(`${base}/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
    if (!res.ok) {
        throw await readError(res);
    }
    const data = await res.json();
    if (!data || !data.ticket) {
        throw new Error("session 响应缺少 ticket");
    }
     
    const ttl = Number(data.expiresIn) > 0 ? Number(data.expiresIn) : 300;
    ticket = { token: data.ticket, expiresAt: Date.now() + Math.max(ttl - 10, 5) * 1000 };
    return ticket.token;
}

async function currentTicket(base) {
    if (ticket.token && Date.now() < ticket.expiresAt) {
        return ticket.token;
    }
    if (!ticketPromise) {
        ticketPromise = fetchTicket(base).finally(() => {
            ticketPromise = null;
        });
    }
    return ticketPromise;
}

async function authHeaders(base) {
    const key = explicitApiKey();
    if (key) {
        return { "api-key": key };
    }
    return { [TICKET_HEADER]: await currentTicket(base) };
}

 
 
let expChannel = null;

export function setExperienceChannel(cfg) {
    if (!cfg) {
        expChannel = null;
        return;
    }
    const headerName = String(cfg.headerName || "").trim();
    const key = String(cfg.key || "").trim();
    const token = String(cfg.token || "").trim();
    expChannel = (headerName && key) ? { headerName, key, token } : null;
}

function expHeaders() {
    if (!expChannel) return null;
    const h = { [expChannel.headerName]: expChannel.key };
    if (expChannel.token) h["Authorization"] = "Bearer " + expChannel.token;
    return h;
}

async function postToBase(base, path, body, exp) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
             
             
            credentials: "include",
            headers: { "Content-Type": "application/json", ...(exp || (await authHeaders(base))) },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            return res.json();
        }
         
        if (res.status === 401 && !exp && !explicitApiKey() && attempt === 0) {
            ticket = { token: "", expiresAt: 0 };
            continue;
        }
        throw await readError(res);
    }
    throw new Error("请求失败：票据重取后仍未通过");
}

async function postJson(apiBaseArg, path, body) {
    const exp = expHeaders();
    const list = baseCandidates(apiBaseArg);
    let lastErr = null;
    for (let i = 0; i < list.length; i++) {
        try {
            const data = await postToBase(list[i], path, body, exp);
            rememberBase(list[i]);
            return data;
        } catch (err) {
            lastErr = err;
             
            if (err && err.status) throw err;
            if (i + 1 >= list.length) {
                 
                invalidateBase();
                throw err;
            }
        }
    }
    throw lastErr;
}

export function requestChallenge(apiBase, clientPublicJwk, device) {
    const body = { clientPublicJwk };
    if (device) body.device = device;
    return postJson(apiBase, "/challenge", body);
}

export function submitVerify(apiBase, challengeId, sessionId, iv, ciphertext) {
    return postJson(apiBase, "/verify", {
        challengeId,
        sessionId,
        iv,
        ciphertext,
    });
}

 
 
export function submitStreamChunk(apiBase, challengeId, sessionId, iv, ciphertext) {
    return postJson(apiBase, "/verify/chunk", {
        challengeId,
        sessionId,
        iv,
        ciphertext,
    });
}

 
 
export function videoReady(apiBase, challengeId, sessionId) {
    return postJson(apiBase, "/video/ready", { challengeId, sessionId });
}

 
 
export function videoChunk(apiBase, challengeId, index, sessionId) {
    return postJson(apiBase, "/video/chunk", { challengeId, index, sessionId });
}

 
 
 
export function requestPowChallenge(apiBase, a11y = false) {
    return postJson(apiBase, "/pow/challenge", { a11y: !!a11y });
}

 
 
 
 
export function verifyPow(apiBase, challengeId, solution, sessionId) {
    const body = { challengeId, solution };
    if (sessionId) body.sessionId = sessionId;
    return postJson(apiBase, "/pow/verify", body);
}

 
 
 
 
 
 
 
 
 
 
 
 
export function consumeVerify(apiBase, receipts) {
    const list = (Array.isArray(receipts) ? receipts : [receipts]).filter(Boolean);
    const body = list.length > 1 ? { receipts: list } : { receipt: list[0] };
    return postJson(apiBase, "/verify/consume", body);
}
