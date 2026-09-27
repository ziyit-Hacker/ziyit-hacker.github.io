 
 
 
 
 
 
 
const TICKET_HEADER = "x-phantom-ticket";

const DEFAULT_BASE = "https://willian-unheady-rawly.ngrok-free.dev";

let resolvedBase = "";
let backendPromise = null;

function backendTxtUrl() {
    try {
        return new URL("../backend.txt", import.meta.url).href;
    } catch (e) {
        return "backend.txt";
    }
}

export function backendReady() {
    if (!backendPromise) {
        backendPromise = fetch(backendTxtUrl(), { cache: "no-store", headers: { "ngrok-skip-browser-warning": "1" } })
            .then((res) => (res.ok ? res.text() : ""))
            .then((txt) => {
                const url = String(txt || "").trim().split(/\s+/)[0].replace(/\/+$/, "");
                if (/^https?:\/\//i.test(url)) resolvedBase = url;
                return apiBase();
            })
            .catch(() => apiBase());
    }
    return backendPromise;
}

export function apiBase() {
    try {
        const c = localStorage.getItem("ziyit_api_base");
        if (c) return String(c).replace(/\/+$/, "");
    } catch (e) { }
    return resolvedBase || DEFAULT_BASE;
}

let ticket = { token: "", expiresAt: 0 };

function explicitApiKey() {
    try {
        return window.PHANTOM_API_KEY || localStorage.getItem("phantom_api_key") || "";
    } catch (e) {
        return "";
    }
}

async function readError(res) {
    let detail = "";
    try {
        const data = await res.json();
        detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail ?? data);
    } catch (e) {
        detail = await res.text().catch(() => "");
    }
    const err = new Error(`${res.status} ${res.statusText} ${detail}`.trim());
    err.status = res.status;
    err.detail = detail;
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
    return fetchTicket(base);
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

async function postJson(apiBase, path, body) {
    const base = apiBase.replace(/\/+$/, "");
    const exp = expHeaders();
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
