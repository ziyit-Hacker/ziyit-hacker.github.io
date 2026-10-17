// ZIYIT 人机验证依赖多镜像加载器
// 单个镜像失败（连接被重置 / 超时 / CORS / 404 / 返回内容不是合法模块）会立刻换下一个；
// 一轮全部失败后等待片刻再整体重试，所有轮次都失败才抛错。

const ATTEMPT_TIMEOUT_MS = 6000;
const ROUNDS = 2;

// import() 本身没有超时：某些镜像可能一直挂着不动，这里用 Promise.race 限制单次等待时间。
function importWithTimeout(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            reject(new Error('timeout after ' + timeoutMs + 'ms: ' + url));
        }, timeoutMs);
        import(url).then(
            (mod) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(mod);
            },
            (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

export async function loadNoble(label, urls, opts) {
    const validate = (opts && opts.validate) || (() => true);
    let lastError = null;

    for (let round = 1; round <= ROUNDS; round++) {
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            try {
                const mod = await importWithTimeout(url, ATTEMPT_TIMEOUT_MS);
                if (!validate(mod)) {
                    throw new Error('模块导出不完整：' + url);
                }
                return mod;
            } catch (err) {
                lastError = err;
                try {
                    console.warn('[noble] 镜像不可用，换下一个：' + url, err && err.message);
                } catch (e) { }
            }
        }
        if (round < ROUNDS) {
            await new Promise((r) => setTimeout(r, 500 * round));
        }
    }

    const error = new Error('[noble] ' + label + ' 加载失败：' + urls.length
        + ' 个镜像 × ' + ROUNDS + ' 轮均不可用');
    error.cause = lastError;
    throw error;
}
