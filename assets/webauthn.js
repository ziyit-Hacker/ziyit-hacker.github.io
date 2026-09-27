

(function () {
    'use strict';

     

    function b64urlToBuf(value) {
        var s = String(value).replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';                         
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

     

     
    function passkeySupported() {
        return window.isSecureContext === true
            && typeof window.PublicKeyCredential !== 'undefined'
            && !!navigator.credentials;
    }

     
    function passkeyUnsupportedReason() {
        if (window.isSecureContext !== true) {
            return '当前页面不是 HTTPS，Passkey 只能在 https://ziyit-hacker.github.io/ 下使用';
        }
        if (typeof window.PublicKeyCredential === 'undefined' || !navigator.credentials) {
            return '当前浏览器不支持 Passkey，请升级浏览器或改用 Chrome / Edge / Safari';
        }
        return '';
    }

     

    function toCreationOptions(publicKey) {            
        var pk = Object.assign({}, publicKey);
        pk.challenge = b64urlToBuf(publicKey.challenge);                        
         
         
        if (publicKey.user) {
            pk.user = Object.assign({}, publicKey.user, { id: b64urlToBuf(publicKey.user.id) });
        }
        pk.excludeCredentials = (publicKey.excludeCredentials || []).map(function (c) {
            return { type: c.type, id: b64urlToBuf(c.id), transports: c.transports };
        });
        return { publicKey: pk };
    }

    function toRequestOptions(publicKey) {             
        var pk = Object.assign({}, publicKey);
        pk.challenge = b64urlToBuf(publicKey.challenge);                        
        pk.allowCredentials = (publicKey.allowCredentials || []).map(function (c) {
            return { type: c.type, id: b64urlToBuf(c.id), transports: c.transports };
        });
        return { publicKey: pk };
    }

     

    function serializeCredential(cred) {
        var r = cred.response || {};
        var out = { id: cred.id, type: cred.type, rawId: bufToB64url(cred.rawId), response: {} };
        if (typeof r.clientDataJSON !== 'undefined') out.response.clientDataJSON = bufToB64url(r.clientDataJSON);
        if (typeof r.attestationObject !== 'undefined') out.response.attestationObject = bufToB64url(r.attestationObject);
        if (typeof r.authenticatorData !== 'undefined') out.response.authenticatorData = bufToB64url(r.authenticatorData);
        if (typeof r.signature !== 'undefined') out.response.signature = bufToB64url(r.signature);
        if (r.userHandle) out.response.userHandle = bufToB64url(r.userHandle);
         
        if (typeof r.getTransports === 'function') {
            try { out.response.transports = r.getTransports(); } catch (e) {   }
        }
        return out;
    }

     

    function passkeyErrorMessage(err) {
        if (!err) return 'Passkey 操作失败，请重试';
        if (err.name === 'NotAllowedError') return '已取消，或操作超时（也可以检查设备是否已设置指纹 / Windows Hello）';
        if (err.name === 'InvalidStateError') return '这个 Passkey 已经绑定过了';
        if (err.name === 'SecurityError') return '当前页面域名不允许使用 Passkey，请从官网 https://ziyit-hacker.github.io/ 打开';
        if (err.name === 'NotSupportedError') return '当前浏览器或设备不支持 Passkey';
        return err.message || 'Passkey 操作失败，请重试';
    }

     

    

    function bindPasskey(name) {
        return window.ZIYIT_API.passkeySetup().then(function (setup) {
             
            return navigator.credentials.create(toCreationOptions(setup.publicKey)).then(function (cred) {
                 
                return window.ZIYIT_API.passkeyEnable({
                    ticketId: setup.ticketId,
                    credential: serializeCredential(cred),
                    name: name || undefined
                });
            });
        });
    }

    

    function loginWithPasskey(opts) {
         
         
        return window.ZIYIT_API.passkeyLoginStart(opts).then(function (start) {
             
            return navigator.credentials.get(toRequestOptions(start.publicKey)).then(function (cred) {
                 
                return window.ZIYIT_API.passkeyLoginFinish({
                    challengeId: start.challengeId,
                    credential: serializeCredential(cred),
                    remember: !!(opts && opts.remember)    
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
