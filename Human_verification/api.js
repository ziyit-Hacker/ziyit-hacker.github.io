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
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json();
}

export function requestChallenge(apiBase, clientPublicJwk, device) {
    return postJson(apiBase, "/challenge", device ? { clientPublicJwk, device } : { clientPublicJwk });
}

export function submitVerify(apiBase, challengeId, iv, ciphertext) {
    return postJson(apiBase, "/verify", { challengeId, iv, ciphertext });
}

export function consumeToken(apiBase, token) {
    return postJson(apiBase, "/consume-token", { token });
}