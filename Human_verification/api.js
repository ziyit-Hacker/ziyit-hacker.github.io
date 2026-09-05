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

export function requestChallenge(apiBase, clientPublicJwk, device) {
    const body = { clientPublicJwk };
    if (device) body.device = device;
    // 会话绑定由后端完成：/challenge 签发 sessionId（随响应返回），SDK 保存后
    // 在 /verify 与后续业务提交（如注册）中携带同一 sessionId 即可通过一致性校验。
    return postJson(apiBase, "/challenge", body);
}

export function submitVerify(apiBase, challengeId, sessionId, iv, ciphertext) {
    return postJson(apiBase, "/verify", {
        challengeId,
        sessionId, // 与 /challenge 同轮签发的会话标识，后端校验一致性
        iv,
        ciphertext,
    });
}

// 注：/consume-token 已废弃——后端不再签发 token，验证凭证改为
// “verified 的 challengeId + sessionId”由业务流程（如注册）一次性消费。
