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

// v0.3.3 实时流：从视频开始播放起，把新采样点按周期上报（明文 { seq, points:[[x,y]] }）。
// 响应不含任何评分/进度；失败由调用方忽略（丢一批不影响验证继续）。
export function submitStreamChunk(apiBase, challengeId, sessionId, iv, ciphertext) {
    return postJson(apiBase, "/verify/chunk", {
        challengeId,
        sessionId,
        iv,
        ciphertext,
    });
}

 
 
