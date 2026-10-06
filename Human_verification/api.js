const TICKET_HEADER = "x-phantom-ticket";

// 后端地址不写死，解析顺序：localStorage 覆盖 → cookie（ziyit_api_base_ok，上次可用的地址）
// → <repo>/backend.txt 候选列表（每行一条，顺序即优先级）。
// cookie 里的地址不可用时继续试 backend.txt 的地址集，全都不可用才算真正不可用；
// 全试完仍失败会 invalidateBase() 清缓存，下一次请求重新拉 backend.txt 重新判断。
const BASE_COOKIE = "ziyit_api_base_ok";
const BASE_COOKIE_DAYS = 7;

let resolvedBase = "";
let backendPromise = null;
let loadedBases = [];

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
    loadedBases = [];
    clearCookie(BASE_COOKIE);
}

// <repo>/backend.txt：每行一条后端地址，顺序即优先级；地址表由仓库维护，前台不写死任何域名。
function backendTxtUrl() {
    try {
        return new URL("../backend.txt", import.meta.url).href;
    }
    catch (e) {
        return "backend.txt";
    }
}

function parseBases(txt) {
    const out = [];
    String(txt || "").split(/\r?\n/).forEach((line) => {
        const m = line.trim().match(/https?:\/\/[^\s]+/i);
        if (!m) return;
        const u = m[0].replace(/\/+$/, "");
        if (out.indexOf(u) === -1) out.push(u);
    });
    return out;
}

function loadBases() {
    return fetch(backendTxtUrl(), {
        cache: "no-store",
        headers: { "ngrok-skip-browser-warning": "1" },
    }).then((res) => (res.ok ? res.text() : "")).catch(() => "").then((txt) => {
        loadedBases = parseBases(txt);
        return loadedBases;
    });
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
    return list;
}

// “地址不可用”（而不是后端明确回错）：网络层失败，或网关类 5xx（隧道/网关挂了）。
function isBaseDown(err) {
    if (!err || !err.status) return true;
    return err.status === 502 || err.status === 503 || err.status === 504 || err.status === 530;
}

function probeBase(base, timeoutMs = 3000) {
    return new Promise((resolve) => {
        const ctrl = new AbortController();
        let done = false;
        const finish = (ok) => {
            if (done) return;
            done = true;
            // 超时必须真的把请求掐掉：否则连不上的地址会一直占着浏览器对该域名的
            // 并发连接名额（同域上限 6 条），后续正式请求会被排到它们后面，看起来就是
            // "整个验证都卡住不动"。
            if (!ok) {
                try { ctrl.abort(); } catch (e) { }
            }
            resolve(ok);
        };
        const timer = setTimeout(() => finish(false), timeoutMs);
        try {
            fetch(base + "/", { method: "GET", mode: "no-cors", cache: "no-store", signal: ctrl.signal })
                .then(() => { clearTimeout(timer); finish(true); })
                .catch(() => { clearTimeout(timer); finish(false); });
        } catch (e) {
            clearTimeout(timer);
            finish(false);
        }
    });
}

// 逐条探测，返回第一个连得上的；全都连不上返回 ""（不再回落到任何写死地址）。
async function pickBase(bases) {
    for (let i = 0; i < bases.length; i++) {
        if (await probeBase(bases[i])) return bases[i];
    }
    return "";
}

export function backendReady() {
    if (!backendPromise) {
        const cached = cachedBase();
        backendPromise = loadBases().then((bases) => {
            // 先试 cookie 里上次可用的地址；它不可用再顺延到 backend.txt 的地址集。
            if (cached) {
                return pickBase([cached].concat(bases)).then((ok) => {
                    if (ok) {
                        rememberBase(ok);   // 记住真正连得上的那条（cookie 失效时可能是候选表里的下一条）
                        return ok;
                    }
                    // 全部不可用：清掉 cookie 里的失效地址，交由上层给出明确错误
                    resolvedBase = "";
                    clearCookie(BASE_COOKIE);
                    return "";
                });
            }
            return pickBase(bases).then((picked) => {
                if (picked) rememberBase(picked);
                return picked;
            });
        });
    }
    return backendPromise;
}

export function apiBase() {
    const custom = customBase();
    if (custom) return custom;
    return resolvedBase || baseCookie() || loadedBases[0] || "";
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
     
     
    const { res, done } = await fetchWithDeadline(`${base}/session`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    }, { timeoutMessage: "会话建立超时，请检查网络后重试" });
    let data = null;
    try {
        if (!res.ok) {
            throw await readError(res);
        }
        data = await res.json();
    }
    catch (e) {
        if (isAbortError(e))
            throw timeoutError("会话建立超时，请检查网络后重试");
        throw e;
    }
    finally {
        done();
    }
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
        const { res, done } = await fetchWithDeadline(`${base}${path}`, {
            method: "POST",
             
             
            credentials: "include",
            headers: { "Content-Type": "application/json", ...(exp || (await authHeaders(base))) },
            body: JSON.stringify(body),
        });
        try {
            if (res.ok) {
                return await res.json();
            }
            // 401：票据过期，清掉重取一次（与 getBinary 同策略）。
            if (res.status === 401 && !exp && !explicitApiKey() && attempt === 0) {
                ticket = { token: "", expiresAt: 0 };
                sessionCaps = { ...PERMISSIVE_CAPS };
                continue;
            }
            throw await readError(res);
        }
        catch (e) {
            // 计时器到点会 abort 掉正在读的 body：统一成可重试的超时提示。
            if (isAbortError(e))
                throw timeoutError("请求超时，请检查网络后重试");
            throw e;
        }
        finally {
            done();
        }
    }
    throw new Error("请求失败：票据重取后仍未通过");
}

async function postJson(apiBaseArg, path, body) {
    const exp = expHeaders();
    const list = baseCandidates(apiBaseArg);
    if (!list.length) {
        invalidateBase();
        throw new Error("未配置后端地址：backend.txt 为空或不可读");
    }
    let lastErr = null;
    for (let i = 0; i < list.length; i++) {
        try {
            const data = await postToBase(list[i], path, body, exp);
            rememberBase(list[i]);
            return data;
        } catch (err) {
            lastErr = err;
             
            if (!isBaseDown(err)) throw err;
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
// opts（可选）：{ signal：外部取消（用户中途换 PoW / 关闭弹窗）、onProgress(loaded,total) }
export async function videoBinary(apiBase, challengeId, sessionId, videoUrl, opts) {
    const exp = expHeaders();
    const path = videoPath(videoUrl, challengeId, sessionId);
    if (/^https?:\/\//i.test(path)) {
        // 后端给了绝对地址：直接拉，不再走 base 探测。
        return await getBinary("", path, exp, opts);
    }
    const list = baseCandidates(apiBase);
    if (!list.length) {
        invalidateBase();
        throw new Error("未配置后端地址：backend.txt 为空或不可读");
    }
    let lastErr = null;
    for (let i = 0; i < list.length; i++) {
        try {
            const buf = await getBinary(list[i], path, exp, opts);
            rememberBase(list[i]);
            return buf;
        }
        catch (err) {
            lastErr = err;
            // 用户主动取消：不是"地址不可用"，直接退出，别去试下一个候选地址。
            if (isAbortError(err)) throw err;
            if (!isBaseDown(err)) throw err;
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

// ---- 请求上限：任何请求都不许「永远等下去」 ----
// fetch 本身没有超时。公网入口半死不活时（TCP 连得上、一个字节都不回）调用方会永远停在
// loading —— 现场实测：隧道对 57B 的 JSON 都能 20 秒不回，验证视频（3.9MB 无损噪点）
// 更是永远下不完，弹窗就一直卡在「正在下载验证题…」。
// 这里只管「不许无限等」，不做性能约束：
//   · timeoutMs —— 等【响应头】的总上限（连头都不回 = 链路废了，直接换下一个候选地址）；
//   · idleMs    —— 读 body 时【两次收到字节之间】的上限（字节还在流就一直是活的，
//                  正常但慢的下载不会被误杀）。
// 超时统一抛 code="TIMEOUT"，由上层显示可点的重试。
const DEFAULT_TIMEOUT_MS = 60000;
const VIDEO_HEADER_TIMEOUT_MS = 45000;
const VIDEO_IDLE_TIMEOUT_MS = 30000;

function timeoutError(message, code) {
    const err = new Error(message);
    err.code = code || "TIMEOUT";
    return err;
}

function isAbortError(err) {
    return !!err && (err.name === "AbortError" || err.code === "ABORTED");
}

// 返回 { res, ctrl, done }：done() 必须在本条请求彻底用完（body 读完 / 读出错）之后调用，
// 用来撤掉计时器与外部 signal 的监听。
async function fetchWithDeadline(url, init, opts) {
    const o = opts || {};
    const totalMs = Number(o.timeoutMs) > 0 ? Number(o.timeoutMs) : DEFAULT_TIMEOUT_MS;
    const ctrl = new AbortController();
    const outer = o.signal;
    const relay = () => {
        try {
            ctrl.abort();
        }
        catch (e) { }
    };
    if (outer) {
        if (outer.aborted)
            relay();
        else
            outer.addEventListener("abort", relay, { once: true });
    }
    let timedOut = false;
    const timer = window.setTimeout(() => {
        timedOut = true;
        relay();
    }, totalMs);
    const done = () => {
        window.clearTimeout(timer);
        if (outer)
            outer.removeEventListener("abort", relay);
    };
    try {
        const res = await fetch(url, { ...(init || {}), signal: ctrl.signal });
        return { res, ctrl, done };
    }
    catch (e) {
        done();
        if (timedOut)
            throw timeoutError(o.timeoutMessage || "请求超时，请检查网络后重试");
        throw e;
    }
}

// 读响应体：带上面那个 idle 看门狗与进度回调。返回 ArrayBuffer。
async function readBodyWithWatchdog(res, opts) {
    const o = opts || {};
    const ctrl = o.ctrl;
    const idleMs = Number(o.idleMs) > 0 ? Number(o.idleMs) : VIDEO_IDLE_TIMEOUT_MS;
    const total = Number(res.headers.get("content-length")) || 0;
    if (!res.body || typeof res.body.getReader !== "function") {
        return await res.arrayBuffer();
    }
    let timedOut = false;
    let timer = 0;
    const arm = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
            timedOut = true;
            try {
                ctrl.abort();
            }
            catch (e) { }
        }, idleMs);
    };
    arm();
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    try {
        for (;;) {
            const step = await reader.read();
            if (step.done)
                break;
            if (step.value && step.value.length) {
                chunks.push(step.value);
                loaded += step.value.length;
                arm();
                try {
                    o.onProgress?.(loaded, total);
                }
                catch (e) { }
            }
        }
    }
    catch (e) {
        if (timedOut)
            throw timeoutError(o.timeoutMessage || "下载中断（网络太慢），请重试", o.timeoutCode);
        throw e;
    }
    finally {
        window.clearTimeout(timer);
        try {
            reader.releaseLock();
        }
        catch (e) { }
    }
    const out = new Uint8Array(loaded);
    let off = 0;
    for (let i = 0; i < chunks.length; i++) {
        out.set(chunks[i], off);
        off += chunks[i].length;
    }
    return out.buffer;
}

// opts：{ signal（外部取消）、onProgress(loaded,total)、headerTimeoutMs、idleMs }
async function getBinary(base, path, exp, opts) {
    const o = opts || {};
    for (let attempt = 0; attempt < 2; attempt++) {
        const { res, ctrl, done } = await fetchWithDeadline(`${base}${path}`, {
            method: "GET",
            credentials: "include",
            headers: { ...(exp || (await authHeaders(base))) },
        }, {
            timeoutMs: Number(o.headerTimeoutMs) > 0 ? Number(o.headerTimeoutMs) : VIDEO_HEADER_TIMEOUT_MS,
            signal: o.signal,
            timeoutMessage: "验证题下载超时，请点击刷新重试",
            timeoutCode: "VIDEO_TIMEOUT",
        });
        try {
            if (res.ok) {
                return await readBodyWithWatchdog(res, {
                    ctrl,
                    idleMs: o.idleMs,
                    onProgress: o.onProgress,
                    timeoutMessage: "验证题下载中断（网络太慢），请点击刷新重试",
                    timeoutCode: "VIDEO_TIMEOUT",
                });
            }
            // 401：票据过期，清掉重取一次（与 postToBase 同策略）。
            if (res.status === 401 && !exp && !explicitApiKey() && attempt === 0) {
                ticket = { token: "", expiresAt: 0 };
                sessionCaps = { ...PERMISSIVE_CAPS };
                continue;
            }
            throw await readError(res);
        }
        finally {
            done();
        }
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
