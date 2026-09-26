/**
 * Passkey（WebAuthn）前端工具 —— 只依赖浏览器原生 API，不引任何第三方库。
 * 契约见「网站功能与结构说明.md」61.3 / 61.7。三个必须记住的坑：
 *   1. challenge / id / rawId / user.id 是 base64url 字符串：喂浏览器前转 ArrayBuffer，回传时再转回来
 *      （最容易漏的是 user.id —— 展开 {...publicKey} 会把字符串原样带进去，浏览器直接抛错）；
 *   2. 注册时不要自己拼 authenticatorData，把 navigator.credentials.create() 的 response 原样回传
 *      （后端从 attestationObject 里自己解 CBOR）；
 *   3. 必须 HTTPS 且「页面域名 == RP ID」（官网是 ziyit-hacker.github.io），
 *      本地 file:// 或后端 ngrok 页面上用不了 —— 浏览器层面直接拒绝。
 */
(function () {
    'use strict';

    /* ============ 1. base64url <-> ArrayBuffer ============ */

    function b64urlToBuf(value) {
        var s = String(value).replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';                        // 补回 padding
        var bin = atob(s);
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes.buffer;
    }

    function bufToB64url(buf) {
        var bytes = new Uint8Array(buf);
        var bin = '';
        for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    /* ============ 2. 环境自检 ============ */

    // 必须 HTTPS + 浏览器支持 WebAuthn，否则干脆不给用户显示「绑定 Passkey」按钮
    function passkeySupported() {
        return window.isSecureContext === true
            && typeof window.PublicKeyCredential !== 'undefined'
            && !!navigator.credentials;
    }

    // 不支持时给出具体原因（用于把按钮置灰并写清为什么），支持时返回空串
    function passkeyUnsupportedReason() {
        if (window.isSecureContext !== true) {
            return '当前页面不是 HTTPS，Passkey 只能在 https://ziyit-hacker.github.io/ 下使用';
        }
        if (typeof window.PublicKeyCredential === 'undefined' || !navigator.credentials) {
            return '当前浏览器不支持 Passkey，请升级浏览器或改用 Chrome / Edge / Safari';
        }
        return '';
    }

    /* ============ 3. 把后端下发的 publicKey 转成浏览器要的格式 ============ */

    function toCreationOptions(publicKey) {           // 注册用
        var pk = Object.assign({}, publicKey);
        pk.challenge = b64urlToBuf(publicKey.challenge);                       // ← 必转
        // user.id 同样是 base64url：展开会把字符串原样带进去，浏览器读 publicKey.user
        // 时直接抛错，请求根本没发出去 —— 所以这里必须再单独转一次
        if (publicKey.user) {
            pk.user = Object.assign({}, publicKey.user, { id: b64urlToBuf(publicKey.user.id) });
        }
        pk.excludeCredentials = (publicKey.excludeCredentials || []).map(function (c) {
            return { type: c.type, id: b64urlToBuf(c.id), transports: c.transports };
        });
        return { publicKey: pk };
    }

    function toRequestOptions(publicKey) {            // 登录用
        var pk = Object.assign({}, publicKey);
        pk.challenge = b64urlToBuf(publicKey.challenge);                       // ← 必转
        pk.allowCredentials = (publicKey.allowCredentials || []).map(function (c) {
            return { type: c.type, id: b64urlToBuf(c.id), transports: c.transports };
        });
        return { publicKey: pk };
    }

    /* ============ 4. 把浏览器回包转成后端要的 JSON ============ */

    function serializeCredential(cred) {
        var r = cred.response || {};
        var out = { id: cred.id, type: cred.type, rawId: bufToB64url(cred.rawId), response: {} };
        if (typeof r.clientDataJSON !== 'undefined') out.response.clientDataJSON = bufToB64url(r.clientDataJSON);
        if (typeof r.attestationObject !== 'undefined') out.response.attestationObject = bufToB64url(r.attestationObject);
        if (typeof r.authenticatorData !== 'undefined') out.response.authenticatorData = bufToB64url(r.authenticatorData);
        if (typeof r.signature !== 'undefined') out.response.signature = bufToB64url(r.signature);
        if (r.userHandle) out.response.userHandle = bufToB64url(r.userHandle);
        // 设备类型提示（internal=本机 / hybrid=手机扫码 / usb=安全密钥），后端用来自动起名
        if (typeof r.getTransports === 'function') {
            try { out.response.transports = r.getTransports(); } catch (e) { /* 忽略 */ }
        }
        return out;
    }

    /* ============ 5. 统一的错误提示 ============ */

    function passkeyErrorMessage(err) {
        if (!err) return 'Passkey 操作失败，请重试';
        if (err.name === 'NotAllowedError') return '已取消，或操作超时（也可以检查设备是否已设置指纹 / Windows Hello）';
        if (err.name === 'InvalidStateError') return '这个 Passkey 已经绑定过了';
        if (err.name === 'SecurityError') return '当前页面域名不允许使用 Passkey，请从官网 https://ziyit-hacker.github.io/ 打开';
        if (err.name === 'NotSupportedError') return '当前浏览器或设备不支持 Passkey';
        return err.message || 'Passkey 操作失败，请重试';
    }

    /* ============ 6. 两个流程 ============ */

    /**
     * 绑定 Passkey（在「账号安全」页里用）。
     * @param {string} [name] 可选备注名，不填由后端按设备类型自动起名
     * @returns {Promise<object>} enable 回包；若带 accessToken 说明是「被强制绑定」，
     *          此时登录流程已算完，可直接当登录成功处理。
     */
    function bindPasskey(name) {
        return window.ZIYIT_API.passkeySetup().then(function (setup) {
            // ② 弹 Windows Hello / 指纹，让用户完成验证
            return navigator.credentials.create(toCreationOptions(setup.publicKey)).then(function (cred) {
                // ③ 原样回传，后端自己解 CBOR 取 authenticatorData
                return window.ZIYIT_API.passkeyEnable({
                    ticketId: setup.ticketId,
                    credential: serializeCredential(cred),
                    name: name || undefined
                });
            });
        });
    }

    /**
     * Passkey 登录（当第一因子 / 第二因子都走这一套）。
     * @param {object} opts { username } 或 { mfaToken }，二选一
     * @returns {Promise<object>} 与 /auth/login 完全同构：
     *          accessToken / mfaRequired + mfaToken / enrollRequired + enrollToken
     */
    function loginWithPasskey(opts) {
        // 账号不存在 / 没绑过 Passkey 时后端直接 400（两种情况的文案一致，防枚举），
        // 所以这里不会拿到空列表、也就不会去弹 navigator.credentials.get()
        return window.ZIYIT_API.passkeyLoginStart(opts).then(function (start) {
            // ② 弹设备验证
            return navigator.credentials.get(toRequestOptions(start.publicKey)).then(function (cred) {
                // ③ 验签；失败一律 401（后端不区分原因，防探测）
                return window.ZIYIT_API.passkeyLoginFinish({
                    challengeId: start.challengeId,
                    credential: serializeCredential(cred),
                    remember: !!(opts && opts.remember)   // 「保持登录」：让后端随回包下发永久凭证
                });
            });
        });
    }

    window.b64urlToBuf = b64urlToBuf;
    window.bufToB64url = bufToB64url;
    window.passkeySupported = passkeySupported;
    window.passkeyUnsupportedReason = passkeyUnsupportedReason;
    window.toCreationOptions = toCreationOptions;
    window.toRequestOptions = toRequestOptions;
    window.serializeCredential = serializeCredential;
    window.passkeyErrorMessage = passkeyErrorMessage;
    window.bindPasskey = bindPasskey;
    window.loginWithPasskey = loginWithPasskey;
})();
