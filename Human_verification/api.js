function getApiKey() {
    const key = window.PHANTOM_API_KEY || localStorage.getItem('phantom_api_key');
    if (!key) {
        throw new Error('请设置 window.PHANTOM_API_KEY');
    }
    return key;
}

async function postJson(apiBase, path, body) {
    const base = apiBase.replace(/\/+$/, "");
    const apiKey = getApiKey();
    const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        // 保留状态码与后端 detail（detail 可能是字符串/对象/数组），供调用方区分处理
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
        throw err;
    }
    return res.json();
}

export function requestChallenge(apiBase, clientPublicJwk, device, clientKey) {
    const body = { clientPublicJwk };
    if (device) body.device = device;
    // P0 会话绑定：每轮挑战携带本轮随机 clientKey（32 hex），后端存其指纹，
    // /verify 与后续注册提交须携带同一 clientKey 才会放行。
    if (clientKey) body.clientKey = clientKey;
    return postJson(apiBase, "/challenge", body);
}

export function submitVerify(apiBase, challengeId, iv, ciphertext, clientKey) {
    const body = { challengeId, iv, ciphertext };
    // P0：与 /challenge 同轮 clientKey 一并提交，后端做指纹一致校验
    if (clientKey) body.clientKey = clientKey;
    return postJson(apiBase, "/verify", body);
}

// 注：/consume-token 已废弃——P0 起后端不再签发 token，验证凭证改为
// “verified 的 challengeId + clientKey”由业务流程（如注册）一次性消费。
