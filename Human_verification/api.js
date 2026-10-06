const TICKET_HEADER = "x-phantom-ticket";

// 后端地址只从 cookie（ziyit_api_base_ok）读，其次 localStorage 覆盖，最后才用这条兜底；
// 不再读 backend.txt 去探测“哪一条才是后端”。
const DEFAULT_BASE = "https://ziyitstudio.ccwu.cc";
const BASE_COOKIE = "ziyit_api_base_ok";
const BASE_COOKIE_DAYS = 7;

let resolvedBase = "";
let backendPromise = null;

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
    sessionCaps = { ...PERMISSIVE_CAPS };
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
    add(DEFAULT_BASE);
    return list;
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
    for (let i = 0; i < bases.length; i++) {
        // 已经是最后一条（兜底地址）：no-cors 探测连 530 / 404 错误页也算“通”，探了没意义
        if (i === bases.length - 1) return bases[i];
        if (await probeBase(bases[i])) return bases[i];
    }
    return DEFAULT_BASE;
}

export function backendReady() {
    if (!backendPromise) {
        const cached = cachedBase();
        if (cached) {
            resolvedBase = cached;
            backendPromise = Promise.resolve(cached);
        } else {
            backendPromise = pickBase(baseCandidates("")).then((picked) => {
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
    return resolvedBase || baseCookie() || DEFAULT_BASE;
}

let ticket = { token: "", expiresAt: 0 };
let ticketPromise = null;

// POST /session 回传的「该密钥能力」：allowedMethods 允许的验证方式集合、
// defaultMethod 默认走哪一套、canSwitch 能否换一种方式。老后端没有这几个字段时
// 按"两套都允许、默认 phantom"处理，保持升级前的行为。
const PERMISSIVE_CAPS = { allowedMethods: ["phantom", "pow"], defaultMethod: "phantom", canSwitch: true };
let sessionCaps = { ...PERMISSIVE_CAPS };

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

// v0.3.55：领题端点与密钥允许的验证方式冲突时，后端**硬拒**（不再静默回落成密钥默认
// 方式），回 403 "requested verification method not allowed for this key"。
// api-key / 体验页通道在领题前拿不到密钥白名单，只能据这条 403 改道到另一个领题接口。
export function isMethodNotAllowed(e) {
    if (!e || e.status !== 403)
        return false;
    return String(e.detail || e.message || "").indexOf("not allowed for this key") !== -1;
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
    // v0.3.55：后端同时回「允许的验证方式 / 默认方式 / 能否切换」。只在白名单里取值，
    // 缺字段（老后端）或取值非法时按"两套都允许、默认 phantom"回落，与升级前一致。
    const allowed = Array.isArray(data.allowedMethods)
        ? data.allowedMethods.filter((m) => m === "phantom" || m === "pow")
        : [];
    const allowedMethods = allowed.length ? allowed : PERMISSIVE_CAPS.allowedMethods;
    const defaultMethod = allowedMethods.indexOf(data.defaultMethod) !== -1
        ? data.defaultMethod
        : allowedMethods[0];
    const canSwitch = typeof data.canSwitch === "boolean"
        ? data.canSwitch
        : allowedMethods.length > 1;
    sessionCaps = { allowedMethods, defaultMethod, canSwitch };
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

// 取「该密钥的验证能力」。票据通道下顺便把 /session 拉一次（结果会被 /challenge
// 复用同一张票据，不会多打一次接口）；显式密钥 / 体验页通道不走票据，拿不到密钥
// 配置，保持"两套都可试"的旧行为。
export async function sessionInfo() {
    if (!explicitApiKey() && !expChannel) {
        const base = await backendReady();
        try {
            await currentTicket(base);
        } catch (e) {
            // 拿不到就按宽松默认处理；随后 /challenge 失败会走正常的错误提示。
        }
    }
    return { ...sessionCaps };
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
            sessionCaps = { ...PERMISSIVE_CAPS };
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

// preferredMethod（可选）："phantom" / "pow"。只在密钥允许的集合内改选，双验证场景
// 后端一律忽略、非法值静默回落，因此这里只在取值合法时才带上，其余交给后端默认。
export function requestChallenge(apiBase, clientPublicJwk, device, preferredMethod) {
    const body = { clientPublicJwk };
    if (device) body.device = device;
    if (preferredMethod === "phantom" || preferredMethod === "pow") body.preferredMethod = preferredMethod;
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

 
 


 
 


// 整段标准 MP4 二进制直下：GET /video 取回整段 MP4 原始字节，省掉 base64 的 33% 膨胀。
// 鉴权为 api-key 或票据头 + sessionId 会话绑定，故必须走这里——返回 ArrayBuffer，
// 上层直接 new Blob 交给 <video>。
// 路径优先用后端下发的 challenge.videoUrl；缺省时回落到 /video?challengeId=…。
// 错误沿用 readError 的语义（403/404/410 带 status 抛出），供上层按现有分支显式提示。
export async function videoBinary(apiBase, challengeId, sessionId, videoUrl) {
    const exp = expHeaders();
    const path = videoPath(videoUrl, challengeId, sessionId);
    if (/^https?:\/\//i.test(path)) {
        // 后端给了绝对地址：直接拉，不再走 base 探测。
        return await getBinary("", path, exp);
    }
    const list = baseCandidates(apiBase);
    let lastErr = null;
    for (let i = 0; i < list.length; i++) {
        try {
            const buf = await getBinary(list[i], path, exp);
            rememberBase(list[i]);
            return buf;
        }
        catch (err) {
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

function videoPath(videoUrl, challengeId, sessionId) {
    const u = String(videoUrl || "").trim();
    if (u) {
        const path = u.charAt(0) === "/" || /^https?:\/\//i.test(u) ? u : "/" + u;
        // v0.3.57：/video 的会话绑定按 query 里的 sessionId 硬校验，缺了它一律 403。
        // 后端下发的 videoUrl 可能只带 challengeId，前端这里兜底补上（已有则不重复拼）。
        if (sessionId && !/[?&]sessionId=/.test(path)) {
            return path + (path.indexOf("?") === -1 ? "?" : "&")
                + "sessionId=" + encodeURIComponent(sessionId);
        }
        return path;
    }
    const q = "challengeId=" + encodeURIComponent(challengeId || "")
        + (sessionId ? "&sessionId=" + encodeURIComponent(sessionId) : "");
    return "/video?" + q;
}

async function getBinary(base, path, exp) {
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`${base}${path}`, {
            method: "GET",
            credentials: "include",
            headers: { ...(exp || (await authHeaders(base))) },
        });
        if (res.ok) {
            return res.arrayBuffer();
        }
        // 401：票据过期，清掉重取一次（与 postToBase 同策略）。
        if (res.status === 401 && !exp && !explicitApiKey() && attempt === 0) {
            ticket = { token: "", expiresAt: 0 };
            sessionCaps = { ...PERMISSIVE_CAPS };
            continue;
        }
        throw await readError(res);
    }
    throw new Error("请求失败：票据重取后仍未通过");
}

 
 
 
// v0.3.53 起后端已移除 a11y 自助降级字段，改用 preferredMethod（"phantom" / "pow"）；
// 语义与 /challenge 一致：双验证忽略、非法值静默回落。
export function requestPowChallenge(apiBase, preferredMethod) {
    const body = {};
    if (preferredMethod === "phantom" || preferredMethod === "pow") body.preferredMethod = preferredMethod;
    return postJson(apiBase, "/pow/challenge", body);
}

 
 
 
 
export function verifyPow(apiBase, challengeId, solution, sessionId) {
    const body = { challengeId, solution };
    if (sessionId) body.sessionId = sessionId;
    return postJson(apiBase, "/pow/verify", body);
}

 
 
 
export function submitPowStream(apiBase, challengeId, sessionId, seq, hashes, solveMs) {
    const body = { challengeId, seq, hashes, solveMs };
    if (sessionId) body.sessionId = sessionId;
    return postJson(apiBase, "/pow/stream", body);
}

 
 
 
 
 
 
 
 
 
 
 
 
export function consumeVerify(apiBase, receipts) {
    const list = (Array.isArray(receipts) ? receipts : [receipts]).filter(Boolean);
    const body = list.length > 1 ? { receipts: list } : { receipt: list[0] };
    return postJson(apiBase, "/verify/consume", body);
}
