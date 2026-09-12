// v0.3.7：公开前端不再持有任何长期 API 密钥。
// 第一方站点（GitHub Pages）先向 /session 领一张【短期票据】——服务端按 Origin 在
// 后端解析出归属密钥（密钥绝不下发），并把票据绑定到 Origin + IP + User-Agent；
// 后续 /challenge、/verify、/verify/chunk 一律带 x-phantom-ticket。票据过期/换 IP
// 会自动重取，因此页面里再没有任何可被反混淆后永久盗用的凭据。
// 第三方接入方仍可在自己页面设置 window.PHANTOM_API_KEY（或 localStorage 的
// phantom_api_key）走 api-key 头——它们的来源白名单由各自密钥配置。
const TICKET_HEADER = "x-phantom-ticket";

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
    // 提前 10 秒过期，避免边界上带着刚失效的票据发请求。
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

async function postJson(apiBase, path, body) {
    const base = apiBase.replace(/\/+$/, "");
    for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(`${base}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(await authHeaders(base)) },
            body: JSON.stringify(body),
        });
        if (res.ok) {
            return res.json();
        }
        // 401 = 票据过期/被吊销：清缓存后重取一次（其余状态码与 api-key 模式不重试）。
        if (res.status === 401 && !explicitApiKey() && attempt === 0) {
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

// v0.3.3 实时流：从开始采集起，把新采样点按周期上报（明文 { seq, points:[[x,y]] }）。
// 响应不含任何评分/进度；失败由调用方忽略（丢一批不影响验证继续）。
export function submitStreamChunk(apiBase, challengeId, sessionId, iv, ciphertext) {
    return postJson(apiBase, "/verify/chunk", {
        challengeId,
        sessionId,
        iv,
        ciphertext,
    });
}
