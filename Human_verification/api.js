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

 
 
