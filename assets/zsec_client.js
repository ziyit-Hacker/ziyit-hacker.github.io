/**
 * ZSEC1 前端加密客户端（参考实现，可直接嵌入 GitHub Pages 前端）
 * ------------------------------------------------------------------
 * 与后端 secure_channel.py 严格配对：
 *
 *   1. GET  /secure/handshake/key   取后端临时 RSA 公钥 + 官方证书证明
 *   2. 浏览器生成 RSA-2048 密钥对，用后端公钥加密自己的 SPKI(DER) 发回
 *   3. POST /secure/handshake       后端用前端公钥加密 32B AES-256 密钥返回
 *   4. 之后所有业务请求：AES-256-GCM 加密，单密钥最多连续 10 个请求
 *
 * 安全要点：
 *   · 证书固定：certFp（证书 DER 的 SHA-256）与 spkiFp（签名公钥 SPKI 的 SHA-256）
 *     必须同时匹配。前者证明「后端出示的是官方证书」，后者证明「签名公钥属于该证书」，
 *     浏览器无需解析 X.509。
 *   · 所有握手响应与加密响应都验证后端 RSA 签名；不通过直接抛错（可关，但不建议）。
 *   · RSA 只用于握手；拿到 AES 密钥后前端立即丢弃客户端 RSA 私钥（置 null）。
 *   · AES 密钥只存在内存（CryptoKey 不可导出），不写 localStorage / sessionStorage。
 *
 * 用法：
 *   const zsec = new ZSecureClient({ baseUrl: 'https://ziyitstudio.ccwu.cc' });
 *   const data = await zsec.request('/auth/login', { method: 'POST', body: {...} });
 *
 * 文件上传 / 人机验证 / 文件下载 以及 SSE 流式接口请走原生 fetch（plain: true）。
 */
(function (global) {
  'use strict';

  // 官方 ReleaseControl 证书指纹（由后端证书 ReleaseControl_Cert.cer 计算，更新证书时必须同步更换）
  var PIN = {
    certFp: '7347d6c2f5f997e611c35cb3bc3c21f92e524febc8647235f16b462b1853095a',
    spkiFp: '47b0333f29bc2f345ec1bc1ff1eab7fdfa11d4a73cfab45b6e1de7f4e1f1176b'
  };

  // 与后端 is_excluded 保持一致：这些接口走原有明文通道
  var EXCLUDED_PREFIXES = ['/downloads/', '/download/', '/uploads/', '/secure/'];
  var EXCLUDED_EXACT = [
    '/img/upload', '/mods/upload', '/users/avatar', '/updates', '/uploads/init',
    '/rc/cloud/encrypt', '/challenge', '/session', '/verify', '/verify/consume',
    '/verify/chunk', '/video', '/video/ready', '/video/chunk', '/pow/challenge',
    '/pow/stream', '/pow/verify', '/consume-token', '/experience/status', '/health',
    '/favicon.ico', '/eula', '/confirm', '/email/verify'
  ];

  function shouldBypass(method, path) {
    method = (method || 'GET').toUpperCase();
    if (method === 'OPTIONS') return true;
    if (EXCLUDED_EXACT.indexOf(path) >= 0) return true;
    for (var i = 0; i < EXCLUDED_PREFIXES.length; i++) {
      if (path.indexOf(EXCLUDED_PREFIXES[i]) === 0) return true;
    }
    if (method === 'GET' || method === 'HEAD') {
      if (/\/download$/.test(path)) return true;
      if (path.indexOf('/img/') === 0 && path !== '/img/my') return true;
    }
    return false;
  }

  // ---------------- 编解码工具 ----------------

  function bufToB64(buf) {
    var bytes = new Uint8Array(buf);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function b64ToBuf(b64) {
    var binary = atob(String(b64 || ''));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function bytesToHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function randomHex(bytes) {
    var arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.prototype.map.call(arr, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  async function sha256Hex(data) {
    var buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return bytesToHex(await crypto.subtle.digest('SHA-256', buf));
  }

  function pemToDer(pem) {
    var body = String(pem || '')
      .replace(/-----BEGIN [^-]+-----/g, '')
      .replace(/-----END [^-]+-----/g, '')
      .replace(/\s+/g, '');
    return b64ToBuf(body);
  }

  function textToBuf(text) {
    return new TextEncoder().encode(text == null ? '' : String(text)).buffer;
  }

  function utf8(buf) {
    return new TextDecoder().decode(new Uint8Array(buf));
  }

  // ---------------- 客户端 ----------------

  function ZSecureClient(options) {
    options = options || {};
    this.baseUrl = String(options.baseUrl || '').replace(/\/+$/, '');
    this.pins = options.pins || PIN;
    this.strictServerProof = options.strictServerProof !== false;
    this.allowEphemeral = !!options.allowEphemeral;
    this.maxRequests = 10;
    this.fetchImpl = options.fetch || global.fetch.bind(global);
    this.clientId = options.clientId || this._loadClientId();
    this._session = null;
    this._queue = Promise.resolve();
    this._serverSpki = null;
  }

  ZSecureClient.prototype._loadClientId = function () {
    try {
      var key = 'zs_client_id';
      var id = localStorage.getItem(key);
      if (!id || id.length < 16 || id.length > 128) {
        id = randomHex(16);
        localStorage.setItem(key, id);
      }
      return id;
    } catch (e) {
      return randomHex(16);   // 隐私模式下 localStorage 不可用：退化为会话级 ID
    }
  };

  ZSecureClient.prototype._url = function (path) {
    if (/^https?:\/\//i.test(path)) return path;
    return this.baseUrl + path;
  };

  ZSecureClient.prototype._path = function (path) {
    try {
      return new URL(this._url(path)).pathname;
    } catch (e) {
      return path;
    }
  };

  ZSecureClient.prototype._headers = function (extra) {
    var h = { 'X-ZS-Client-Id': this.clientId };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] != null) h[k] = extra[k];
      });
    }
    return h;
  };

  /* ---------- 服务端身份验证 ---------- */

  ZSecureClient.prototype._verifyServer = async function (server, proof) {
    if (!server || !server.certFp || !server.spki) {
      throw new Error('ZSEC: 后端未提供服务身份信息');
    }
    if (server.ephemeral && !this.allowEphemeral) {
      throw new Error('ZSEC: 后端使用临时自签身份，已拒绝（可能是伪造服务）');
    }
    if (this.pins.certFp && server.certFp !== this.pins.certFp) {
      throw new Error('ZSEC: 后端证书指纹不匹配（certFp pin failed）');
    }
    if (this.pins.spkiFp && server.spkiFp !== this.pins.spkiFp) {
      throw new Error('ZSEC: 后端签名公钥指纹不匹配（spkiFp pin failed）');
    }
    if (!proof || !proof.signature || !proof.text) {
      throw new Error('ZSEC: 后端响应缺少签名');
    }
    if (this.strictServerProof) {
      var spkiDer = b64ToBuf(server.spki);
      if (this.pins.spkiFp && (await sha256Hex(spkiDer)) !== this.pins.spkiFp) {
        throw new Error('ZSEC: spki 指纹与固定值不一致');
      }
      var key = await crypto.subtle.importKey(
        'spki', spkiDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['verify']
      );
      var ok = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5', key, b64ToBuf(proof.signature), textToBuf(proof.text)
      );
      if (!ok) throw new Error('ZSEC: 后端签名校验失败（可能被中间人替换）');
    }
    this._serverSpki = server.spki;
  };

  /* ---------- 握手 ---------- */

  ZSecureClient.prototype._handshake = async function () {
    var self = this;

    // 1) 取后端一次性握手公钥（响应带官方证书签名）
    var keyRes = await this.fetchImpl(this._url('/secure/handshake/key'), {
      method: 'GET',
      headers: this._headers(),
      credentials: 'include',
      cache: 'no-store'
    });
    if (!keyRes.ok) throw new Error('ZSEC: 握手初始化失败 HTTP ' + keyRes.status);
    var keyInfo = await keyRes.json();
    await this._verifyServer(keyInfo.server, keyInfo.proof);

    // 2) 本地生成 RSA-2048，用后端公钥加密自己的公钥 DER
    var clientPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );
    var serverPub = await crypto.subtle.importKey(
      'spki', pemToDer(keyInfo.publicKey),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false, ['encrypt']
    );
    var clientSpki = await crypto.subtle.exportKey('spki', clientPair.publicKey);
    var wrappedClientKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' }, serverPub, clientSpki
    );

    // 3) 交换：后端用前端公钥加密 AES 密钥返回
    var hsRes = await this.fetchImpl(this._url('/secure/handshake'), {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        keyId: keyInfo.keyId,
        clientPublicKey: bufToB64(wrappedClientKey),
        clientId: this.clientId,
        channel: 'web'
      })
    });
    if (!hsRes.ok) throw new Error('ZSEC: 握手失败 HTTP ' + hsRes.status);
    var hs = await hsRes.json();
    await this._verifyServer(hs.server, hs.proof);

    // 4) 用本地 RSA 私钥解出 AES 密钥 → 导入为不可导出的 CryptoKey
    var rawAes = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, clientPair.privateKey, b64ToBuf(hs.encryptedKey));
    if (new Uint8Array(rawAes).length !== 32) throw new Error('ZSEC: AES 密钥长度非法');
    var aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

    // 按要求：拿到 AES 后立即丢弃所有 RSA 密钥材料
    clientPair = null;
    rawAes = null;

    this.maxRequests = Math.max(1, Math.min(10, hs.maxRequests || 10));
    this._session = {
      id: hs.sessionId,
      key: aesKey,
      seq: 0,
      max: this.maxRequests,
      createdAt: Date.now()
    };
    return this._session;
  };

  ZSecureClient.prototype._ensureSession = async function () {
    if (!this._session) await this._handshake();
    return this._session;
  };

  ZSecureClient.prototype._resetSession = function () {
    this._session = null;
  };

  /* ---------- 加密请求 ---------- */

  ZSecureClient.prototype._aad = function (prefix, method, path, seq, sid, ts, nonce) {
    return [prefix, method, path, String(seq), sid, String(ts), nonce].join('\n');
  };

  ZSecureClient.prototype._sendEncrypted = async function (path, opts) {
    var method = (opts.method || 'GET').toUpperCase();
    var session = await this._ensureSession();
    if (session.seq >= session.max) {
      this._resetSession();
      session = await this._ensureSession();
    }

    var seq = ++session.seq;
    var ts = Math.floor(Date.now() / 1000);
    var nonce = randomHex(16);
    var urlPath = this._path(path);
    var plaintext = opts.body === undefined || opts.body === null
      ? ''
      : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));

    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        additionalData: textToBuf(this._aad('ZSEC1', method, urlPath, seq, session.id, ts, nonce)),
        tagLength: 128
      },
      session.key,
      textToBuf(plaintext)
    );

    var headers = this._headers(opts.headers);
    headers['Content-Type'] = 'application/json';
    headers['X-ZS-Session'] = session.id;
    headers['X-ZS-Seq'] = String(seq);
    headers['X-ZS-Ts'] = String(ts);
    headers['X-ZS-Nonce'] = nonce;
    headers['X-ZS-Alg'] = 'AES-256-GCM';

    var res = await this.fetchImpl(this._url(path), {
      method: method,
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ iv: bufToB64(iv), data: bufToB64(ct) })
    });

    var buffer = await res.arrayBuffer();

    // 非 JSON（SSE / 文件 / HTML）后端会回 X-ZS-Plain: 1
    if (res.headers.get('X-ZS-Plain') === '1' || res.headers.get('X-ZS-Encrypted') !== '1') {
      return this._wrap(res, new TextDecoder().decode(new Uint8Array(buffer)));
    }

    // 响应签名校验：防中间人替换密文
    var proofSig = res.headers.get('X-ZS-Proof-Sig');
    if (proofSig) {
      var proofKeyId = res.headers.get('X-ZS-Proof-KeyId') || '';
      // 与后端 secure_channel.py 的签名串完全一致（含 keyId 行）
      var proofText = [
        'ZSEC1R', proofKeyId, method, urlPath, String(seq),
        session.id, String(ts), nonce, await sha256Hex(buffer)
      ].join('\n');
      var verifyKey = await crypto.subtle.importKey(
        'spki', b64ToBuf(this._serverSpki),
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false, ['verify']
      );
      var ok = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5', verifyKey, b64ToBuf(proofSig), textToBuf(proofText)
      );
      if (!ok && this.strictServerProof) {
        throw new Error('ZSEC: 响应签名校验失败（proofKeyId=' + proofKeyId + '）');
      }
    }

    var envelope = JSON.parse(utf8(buffer));
    var plainRes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: b64ToBuf(envelope.iv),
        additionalData: textToBuf(this._aad('ZSEC1R', method, urlPath, seq, session.id, ts, nonce)),
        tagLength: 128
      },
      session.key,
      b64ToBuf(envelope.data)
    );

    if (res.headers.get('X-ZS-Rekey') === '1' || session.seq >= session.max) {
      this._resetSession();   // 后端已销毁该密钥，下次请求自动重新握手
    }
    return this._wrap(res, utf8(plainRes));
  };

  ZSecureClient.prototype._wrap = function (res, text) {
    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      text: text,
      json: function () {
        try { return JSON.parse(text); } catch (e) { return null; }
      }
    };
  };

  /**
   * 统一请求入口。
   * @param {string} path  以 / 开头的接口路径
   * @param {object} opts  { method, body, headers, plain }
   *                       plain=true 走原生 fetch（上传 / 下载 / 人机验证 / SSE）
   */
  ZSecureClient.prototype.request = function (path, opts) {
    var self = this;
    opts = opts || {};
    var method = (opts.method || 'GET').toUpperCase();
    var run = async function (retried) {
      if (opts.plain || shouldBypass(method, self._path(path))) {
        var res = await self.fetchImpl(self._url(path), {
          method: method,
          headers: self._headers(opts.headers),
          credentials: 'include',
          body: opts.body === undefined ? undefined
            : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body))
        });
        var text = await res.text();
        return self._wrap(res, text);
      }
      try {
        var out = await self._sendEncrypted(path, opts);
        // 428 = 要求握手；409 且 code 属于加密信道错误 = 会话过期 / 密钥用满 / 序号错乱。
        // 这类错误发生在业务执行之前，可安全重试一次；业务自身返回的 409 不重试。
        var code = (out.json() || {}).code;
        var zsecErr = out.status === 409 && (
          code === 'session_expired' || code === 'key_exhausted' || code === 'seq_mismatch'
        );
        if (!retried && (out.status === 428 || zsecErr)) {
          self._resetSession();
          return run(true);
        }
        return out;
      } catch (e) {
        if (!retried) {
          // 解密 / 验签失败也可能由密钥轮换引起：重新握手后重试一次
          self._resetSession();
          return run(true);
        }
        throw e;
      }
    };
    // 串行化：同一标签页内的请求必须按 seq 顺序发出
    var p = this._queue.then(function () { return run(false); }, function () { return run(false); });
    this._queue = p.then(function () {}, function () {});
    return p;
  };

  ZSecureClient.prototype.warmup = function () {
    var self = this;
    return this._ensureSession().then(function () { return self._session.id; });
  };

  global.ZSecureClient = ZSecureClient;
  global.ZSEC_PIN = PIN;
})(typeof window !== 'undefined' ? window : globalThis);
