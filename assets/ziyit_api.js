(function () {
    // 后端地址不写死：localStorage 覆盖 → cookie 里上次可用的地址 → <repo>/backend.txt 候选列表
    // （每行一条，顺序即优先级）。当前地址连不上或 5xx 时自动换下一条；全试完仍失败就清缓存，
    // 下一次请求重新拉 backend.txt 重新判断。
    var BASE_COOKIE = 'ziyit_api_base_ok';
    var BASE_COOKIE_DAYS = 7;

    // 取脚本自身 URL，用来定位 <repo>/backend.txt（与页面所在层级无关）。
    var SCRIPT_SRC = '';
    try { SCRIPT_SRC = (document.currentScript && document.currentScript.src) || ''; } catch (e) {}

     
    var resolvedBase = '';
    var readyBasePromise = null;
    var fileBases = [];

    function backendReady() {
        if (readyBasePromise) return readyBasePromise;
        readyBasePromise = loadFileBases().then(function () {
            resolvedBase = cachedBase() || fileBases[0] || '';
            if (resolvedBase) rememberBase(resolvedBase);
            return resolvedBase;
        });
        return readyBasePromise;
    }

    // <repo>/backend.txt：每行一条后端地址，顺序即优先级；地址表由仓库维护，前台不写死任何域名。
    function backendTxtUrl() {
        if (SCRIPT_SRC) {
            try { return new URL('../backend.txt', SCRIPT_SRC).href; } catch (e) {}
        }
        return 'backend.txt';
    }

    function parseFileBases(txt) {
        var out = [];
        String(txt || '').split(/\r?\n/).forEach(function (line) {
            var m = line.trim().match(/https?:\/\/[^\s]+/i);
            if (!m) return;
            var u = m[0].replace(/\/+$/, '');
            if (out.indexOf(u) === -1) out.push(u);
        });
        return out;
    }

    function loadFileBases() {
        return fetch(backendTxtUrl(), { cache: 'no-store', headers: { 'ngrok-skip-browser-warning': '1' } })
            .then(function (res) { return res.ok ? res.text() : ''; })
            .catch(function () { return ''; })
            .then(function (txt) { fileBases = parseFileBases(txt); return fileBases; });
    }

    function getBases() {
        var list = [];
        try {
            var custom = localStorage.getItem('ziyit_api_base');
            if (custom) list.push(String(custom).replace(/\/+$/, ''));
        } catch (e) {}
        var cookie = getBaseCookie();
        if (cookie && list.indexOf(cookie) === -1) list.push(cookie);
        fileBases.forEach(function (b) { if (list.indexOf(b) === -1) list.push(b); });
        return list;
    }

     
    function getBaseCookie() {
        try {
            var v = getCookie(BASE_COOKIE);
            if (!v) return '';
            v = String(v).replace(/\/+$/, '');
            return /^https?:\/\//i.test(v) ? v : '';
        } catch (e) {
            return '';
        }
    }

    function setBaseCookie(base) {
        if (!base) return;
        try { setCookie(BASE_COOKIE, base, BASE_COOKIE_DAYS); } catch (e) {}
    }

    function clearBaseCookie() {
        try { document.cookie = BASE_COOKIE + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; } catch (e) {}
    }

     
    function customBase() {
        try {
            var c = localStorage.getItem('ziyit_api_base');
            if (c) return String(c).replace(/\/+$/, '');
        } catch (e) {}
        return '';
    }

    function cachedBase() {
        return customBase() || getBaseCookie();
    }

     
    function rememberBase(base) {
        if (!base) return;
        resolvedBase = base;
        if (base === customBase()) return;     
        setBaseCookie(base);
    }

     
    function invalidateBase() {
        resolvedBase = '';
        readyBasePromise = null;
        fileBases = [];
        clearBaseCookie();
    }

    function currentBase() {
        if (resolvedBase) return resolvedBase;
        var bases = getBases();
        return bases[0] || '';
    }

    function orderedBases() {
        var bases = getBases();
        var work = currentBase();
        if (work && bases.indexOf(work) !== 0) {
            bases = [work].concat(bases.filter(function (b) { return b !== work; }));
        }
        return bases;
    }

    var REQUEST_TIMEOUT_MS = 20000;

    function fetchWithTimeout(url, options) {
        if (typeof AbortController === 'undefined') return fetch(url, options);
        var ctrl = new AbortController();
        // 上传 .rcm 这类大请求体要走更久，允许调用方用 __timeoutMs 覆盖默认 20 秒
        var timeoutMs = (options && options.__timeoutMs) || REQUEST_TIMEOUT_MS;
        var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs);
        var opts = {};
        for (var k in options) opts[k] = options[k];
        opts.signal = ctrl.signal;
        return fetch(url, opts).then(function (res) {
            clearTimeout(timer);
            return res;
        }, function (err) {
            clearTimeout(timer);
            throw err;
        });
    }

    // 绕开 request() 的直连接口（客服 / 申诉 / 用户类型 / backrooms 下载等）统一走这里取址：
    // 先等 backendReady() 定好地址，否则会拿缓存里的旧地址硬连，表现就是“连接失败”。
    function fetchApi(path, options) {
        return backendReady().then(function () {
            return fetchWithTimeout(currentBase() + path, options);
        }).catch(function (err) {
            // 连不上（不是后端回的错）：清掉缓存地址按 cookie / 兜底重新解析一次
            if (err && err.status) throw err;
            invalidateBase();
            return backendReady().then(function () {
                return fetchWithTimeout(currentBase() + path, options);
            });
        });
    }

    // 同上，但用裸 fetch（流式 SSE 不能套 20 秒整体超时）。
    function fetchApiRaw(path, options) {
        return backendReady().then(function () {
            return fetch(currentBase() + path, options);
        });
    }

     
    function errorText(detail) {
        if (typeof detail === 'string') return detail;
        if (detail && typeof detail === 'object') {
            if (typeof detail.message === 'string' && detail.message) return detail.message;
            if (typeof detail.msg === 'string' && detail.msg) return detail.msg;
            if (typeof detail.error === 'string' && detail.error) return detail.error;
            try { return JSON.stringify(detail); } catch (e) { return String(detail); }
        }
        return detail == null ? '' : String(detail);
    }

    function getCookie(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }

    function setCookie(name, value, days) {
        var expires = '';
        if (days) {
            var d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            expires = '; expires=' + d.toUTCString();
        }
        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
    }

     
     
     
     
     
    var REMEMBER_COOKIE = 'ziyit_remember';
    var REMEMBER_KEY = 'ziyit_remember_token';

    function getRememberToken() {
        return getCookie(REMEMBER_COOKIE) || localStorage.getItem(REMEMBER_KEY) || '';
    }

    function setRememberToken(token) {
        if (!token) return;
        setCookie(REMEMBER_COOKIE, token, 3650);    
        localStorage.setItem(REMEMBER_KEY, token);
         
         
         
        setCookie('authToken', token, 3650);
        localStorage.setItem('authToken', token);
    }

    function clearRememberToken() {
        document.cookie = REMEMBER_COOKIE + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        localStorage.removeItem(REMEMBER_KEY);
         
        clearLegacyTokenKeys();
    }

    function getToken() {
        return getRememberToken() || getCookie('authToken') || localStorage.getItem('authToken') || '';
    }

    function setToken(token, remember) {
         
         
        if (getRememberToken()) return;
        var days = remember ? 60 : null;
        if (days) {
            setCookie('authToken', token, days);
        } else {
            setCookie('authToken', token, null);
        }
        localStorage.setItem('authToken', token);
    }

     
    function clearLegacyTokenKeys() {
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/ziyit/;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/ziyit;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        localStorage.removeItem('authToken');
    }

    function clearToken() {
        clearRememberToken();
        clearCredentials();
    }

    function setCredentials(username, md5, remember) {
        var days = remember ? 60 : null;
        setCookie('ziyit_cred', encodeURIComponent(username + '|' + md5), days);
    }

    function getCredentials() {
        var raw = getCookie('ziyit_cred');
        if (!raw) return null;
        try {
            var s = decodeURIComponent(raw);
            var idx = s.indexOf('|');
            if (idx < 0) return null;
            return { username: s.slice(0, idx), password: s.slice(idx + 1) };
        } catch (e) {
            return null;
        }
    }

    function clearCredentials() {
        document.cookie = 'ziyit_cred=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

     
     
     
     
     
    function isBackendUrl(url) {
        var u = String(url || '');
        if (!u) return false;
        if (u.charAt(0) === '/') return true;
        var bases = getBases();
        for (var i = 0; i < bases.length; i++) {
            if (u.indexOf(bases[i]) === 0) return true;
        }
        return false;
    }

     
    function imageBlobUrl(url) {
        if (!url) return Promise.resolve('');
        // 后端地址表是动态的（backend.txt），先等它就绪再判断，避免把后端图片当外链直连
        return backendReady().then(function () {
            if (!isBackendUrl(url)) return url;
            return fetch(url, { headers: { 'ngrok-skip-browser-warning': '1' } }).then(function (res) {
                if (!res.ok) throw new Error('图片加载失败(' + res.status + ')');
                return res.blob();
            }).then(function (blob) {
                return URL.createObjectURL(blob);
            });
        });
    }

     
    function applyImage(el, url, fallback) {
        if (!el) return Promise.reject(new Error('缺少图片元素'));
        function set(u) {
            if (el.dataset && el.dataset.ziyitBlob) {
                try { URL.revokeObjectURL(el.dataset.ziyitBlob); } catch (e) { }
                el.dataset.ziyitBlob = '';
            }
            if (u && u.indexOf('blob:') === 0 && el.dataset) el.dataset.ziyitBlob = u;
            el.src = u || fallback || '';
        }
        return imageBlobUrl(url).then(set, function (err) {
            set('');
            throw err;
        });
    }

     
     
     
     
    var enrollToken = null;
    function setEnrollToken(t) { enrollToken = t || null; }

    var reloginPromise = null;
    function loginWithCredentials() {
        var cred = getCredentials();
        if (!cred) return Promise.reject(new Error('no credentials'));
        if (reloginPromise) return reloginPromise;
         
         
        reloginPromise = post('/auth/login', {
            username: cred.username,
            password: cred.password,
            remember: true
        }).then(function (data) {
             
             
            if (data && data.mfaRequired) throw new Error('mfa required');
            var token = data && (data.accessToken || data.access_token || data.token);
            if (!token) throw new Error('login failed');
            var rememberToken = data.rememberToken || data.remember_token || '';
            if (rememberToken) setRememberToken(rememberToken);
            setToken(token, true);
            return token;
        }).finally(function () {
            reloginPromise = null;
        });
        return reloginPromise;
    }

     
     
    var unauthorizedFired = false;
    function handleUnauthorized() {
        if (unauthorizedFired) return;
        unauthorizedFired = true;
         
         
        try {
            console.warn('[ziyit_api] 触发未授权(401)：Cookie凭据存在=', !!getCredentials(),
                '，authToken存在=', !!getToken(), '，时间=', new Date().toISOString());
        } catch (e) {}
        if (typeof window !== 'undefined' && window.ZIYIT_ON_UNAUTHORIZED) {
            try {
                window.ZIYIT_ON_UNAUTHORIZED();
            } catch (e) {}
        }
    }

    function request(path, options, baseIndex, retried, withMeta) {
        return backendReady().then(function () {
            return doRequest(path, options, baseIndex, retried, withMeta);
        });
    }

    function doRequest(path, options, baseIndex, retried, withMeta) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers['ngrok-skip-browser-warning'] = '1';
        var token = enrollToken || getToken();
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
        var bases = orderedBases();
        if (!bases.length) {
            invalidateBase();
            throw new Error('未配置后端地址：backend.txt 为空或不可读');
        }
        var start = baseIndex || 0;
        if (start >= bases.length) start = 0;

        return attempt(start);

        function attempt(i) {
            return fetchWithTimeout(bases[i] + path, options).then(function (res) {
                return res.json().catch(function () { return null; }).then(function (data) {
                    if (!res.ok) {
                        var err = new Error(errorText(data && data.detail) || ('请求失败 ' + res.status));
                        err.status = res.status;
                        err.data = data;
                        throw err;
                    }
                     
                    return withMeta ? { data: data, date: res.headers.get('date') } : data;
                });
            }).catch(function (err) {
                if (err && err.status) {
                    var isLoginPath = path.indexOf('/auth/login') === 0;
                     
                     
                    var isAuthRejected = /invalid or expired token|user not found|user deleted|invalid authorization header|missing authorization header|authorization required/i.test(String(err.message || ''));
                     
                     
                     
                    var sentToken = String((options.headers && options.headers['Authorization']) || '').replace(/^Bearer\s+/i, '');
                    var rememberNow = getRememberToken();
                    if (err.status === 401 && isAuthRejected && !retried && !enrollToken && !isLoginPath
                        && rememberNow && sentToken === rememberNow) {
                         
                         
                        clearToken();
                        handleUnauthorized();
                        throw err;
                    }
                    if (err.status === 401 && isAuthRejected && !retried && !isLoginPath && !rememberNow && getCredentials() && !enrollToken) {
                        return loginWithCredentials().then(function () {
                            return request(path, options, 0, true, withMeta);
                        }, function (loginErr) {
                             
                            if (loginErr && loginErr.status === 429) throw loginErr;
                             
                            clearToken();
                            handleUnauthorized();
                            throw err;
                        });
                    }
                    if (err.status === 401 && isAuthRejected && !retried && !getCredentials() && !getRememberToken()) {
                         
                        clearToken();
                        handleUnauthorized();
                    }
                    if (err.status >= 500 && i + 1 < bases.length) return switchTo(i);
                    throw err;
                }
                 
                if (i + 1 < bases.length) return switchTo(i);
                 
                 
                invalidateBase();
                 
                var netRetries = (options.__netRetries || 0) + 1;
                options.__netRetries = netRetries;
                if (netRetries <= 2) {
                    return new Promise(function (resolve) { setTimeout(resolve, 300); }).then(function () {
                        return request(path, options, 0, retried, withMeta);
                    });
                }
                throw err;
            });
        }

        function switchTo(i) {
            return attempt(i + 1).then(function (res) {
                rememberBase(bases[i + 1]);
                return res;
            });
        }
    }

    function post(path, body) {
        return request(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    function put(path, body) {
        return request(path, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

     
    function login(username, md5Password, remember) {
        return post('/auth/login', { username: username, password: md5Password, remember: !!remember });
    }

    function register(username, email, md5Password, challengeId, sessionId) {
        var body = { username: username, email: email, password: md5Password };
         
        if (challengeId) body.challengeId = challengeId;
        if (sessionId) body.sessionId = sessionId;
        return post('/auth/register', body);
    }

    function me() {
        return request('/auth/me').then(function (user) {
            if (user && !user.lastLoginTime && user.loginHistory && user.loginHistory.length) {
                user.lastLoginTime = user.loginHistory[user.loginHistory.length - 1].time;
            }
            return user;
        });
    }

    function updateUsername(newUsername) {
        return put('/users/username', { username: newUsername });
    }

    function updateProfile(profile) {
        return put('/users/profile', profile);
    }

    function updatePassword(oldMd5, newMd5) {
        return put('/users/password', { old_password: oldMd5, new_password: newMd5 });
    }

    function updateEmail(newEmail) {
        return put('/users/email', { email: newEmail });
    }

     
     
     
    function updateAvatar(avatarId) {
        return put('/users/avatar', { avatar: avatarId || '' });
    }

    function getMods() {
        return request('/mods');
    }

    function getDlc() {
        return request('/dlc');
    }

     
    function myDlc() {
        return request('/dlc/mine');
    }

    function getFreeMods() {
        return request('/mods/free');
    }

    function pointsBalance() {
        return request('/points/balance');
    }

    function pointsLedger(limit, offset) {
        var l = parseInt(limit, 10);
        var o = parseInt(offset, 10);
        if (isNaN(l) || l <= 0) l = 20;
        if (isNaN(o) || o < 0) o = 0;
        l = Math.min(l, 100);
        return request('/points/ledger?limit=' + l + '&offset=' + o);
    }

    function pointsPurchase(units) {
        var u = parseInt(units, 10);
        if (isNaN(u) || u < 1) u = 1;
        u = Math.min(u, 1000);
        return post('/points/purchase', { units: u });
    }

    // 当前点单价目表（公开接口）：管理员在后台改价后立刻生效，前端不缓存、不硬编码价格。
    function pointsPricing() {
        return request('/points/pricing');
    }

     
    function submitMod(payload) {
        return post('/mods/submit', payload);
    }

    // 我上传的 MOD 列表 + 上传配额：{mods:[...], quota:{limit,used,remaining,unlimited,reason}}
    function myMods() {
        return request('/mods/mine');
    }

    // 直接把 .rcm 传到后端（multipart）——不再需要先把文件传到网盘/对象存储再贴链接。
    // 不设 Content-Type，交给浏览器自动带上 multipart boundary；体积大，单独放宽超时。
    function uploadMod(formData) {
        return request('/mods/upload', {
            method: 'POST',
            body: formData,
            __timeoutMs: 300000
        });
    }

    function sendVerifyEmail() {
        return post('/email/send-verify', {});
    }

    function downloadMod(modId) {
        var token = getToken();
        // 地址表是动态的（backend.txt），先等就绪再取候选，避免地址表还没加载就被判成连不上
        return backendReady().then(function () {
            var bases = getBases();
            var i = 0;
            function attempt() {
                if (i >= bases.length) return Promise.reject(new Error('connection failed'));
                var base = bases[i++];
                return fetch(base + '/mods/' + modId + '/download', {
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'ngrok-skip-browser-warning': '1'
                    }
                }).catch(function () {
                    return attempt();
                });
            }
            return attempt();
        });
    }

    function requestDeletion() {
        return post('/users/deletion', {});
    }

    function cancelDeletion() {
        return post('/users/cancel-deletion', {});
    }

    function logout() {
         
        var remember = getRememberToken();
        if (!getToken()) return Promise.resolve();
        return post('/auth/logout', { rememberToken: remember }).catch(function () { }).then(function () {
            clearToken();
        });
    }

    function getIpLocation(userId, ip) {
        return request('/auth/ip-info?userId=' + encodeURIComponent(userId) + '&ip=' + encodeURIComponent(ip));
    }

     
    function formatIpLocation(d) {
        if (d == null) return '未知';
        if (typeof d === 'string') return d || '未知';
         
        var raw = d.raw && typeof d.raw === 'object' ? d.raw : null;
        var full = d.location || d.address || d.formatted_address || d.detail || d.full_location
            || d.addr || d.org || (raw && (raw.addr || raw.org || raw.address || raw.location));
        if (typeof full === 'string') return full || '未知';
        if (full && typeof full === 'object') return formatIpLocation(full);
         
        var wrap = d.data || d.result || raw;
        if (wrap && typeof wrap === 'object' && !wrap.province && !wrap.region && !wrap.city && !wrap.country && !wrap.pro) {
            var inner = formatIpLocation(wrap);
            if (inner !== '未知') return inner;
        }
        var pick = function () {
            for (var i = 0; i < arguments.length; i++) {
                var v = arguments[i];
                if (v != null && v !== '') return String(v);
            }
            return '';
        };
        var country = pick(d.country, d.country_name, d.countryName, d.nation);
        var province = pick(d.province, d.province_name, d.provinceName, d.region, d.region_name, d.regionName, d.state, d.state_name, d.stateName, wrap && wrap.pro);
        var city = pick(d.city, d.city_name, d.cityName, wrap && wrap.city);
        var district = pick(d.district, d.district_name, d.districtName, d.area, d.area_name, d.areaName, d.county);
        var parts = [];
        var cn = ['中国', '中华人民共和国', 'china', 'cn'];
        var isCn = cn.indexOf(String(country).toLowerCase()) >= 0 || cn.indexOf(country) >= 0;
        if (country && !isCn) parts.push(country);
        [province, city, district].forEach(function (v) {
            if (v && parts.indexOf(v) < 0) parts.push(v);
        });
        if (parts.length) return parts.join(' ');
        return '未知';
    }

    function getIpStatus(ip) {
        return request('/ip/' + encodeURIComponent(ip) + '/status');
    }

    function banIp(ip, reason) {
        var body = reason ? { ip: ip, reason: reason } : { ip: ip };
        return post('/users/ip/ban', body);
    }

    function unbanIp(ip) {
        return post('/users/ip/unban', { ip: ip });
    }

    function deleteLoginHistory(index) {
        return request('/users/login-history/' + index, { method: 'DELETE' });
    }

     
    function adminBanIp(ip, reason, durationMinutes) {
        var body = { ip: ip };
        if (reason) body.reason = reason;
        if (durationMinutes) body.durationMinutes = durationMinutes;
        return post('/admin/ip/ban', body);
    }

    function adminUnbanIp(ip) {
        return post('/admin/ip/unban', { ip: ip });
    }

    function adminListIpBans() {
        return request('/admin/ip/bans');
    }

     
    function adminGetUserDlc(userId) {
        return request('/admin/users/' + userId + '/dlc');
    }

     
    function adminGrantDlc(userId, modId, expireAt) {
        var body = expireAt ? { modId: modId, expireAt: expireAt } : { modId: modId };
        return post('/admin/users/' + userId + '/dlc', body);
    }

     
    function adminRevokeDlc(userId, modId) {
        return request('/admin/users/' + userId + '/dlc/' + modId, { method: 'DELETE' });
    }

     

     
    function adminMe() {
        return request('/admin/me');
    }

     
    function adminListAdmins() {
        return request('/admin/admins');
    }

     
    function adminAddAdmin(userId, level) {
        return post('/admin/admins', { userId: userId, level: level });
    }

     
    function adminUpdateAdmin(userId, level) {
        return put('/admin/admins/' + userId, { level: level });
    }

     
    function adminRemoveAdmin(userId) {
        return request('/admin/admins/' + userId, { method: 'DELETE' });
    }

     
    // days 仅对 type='vip' 有效：0 / 缺省 = 永久，正整数 = 从当前到期时间往后叠加天数
    // （后端 AdminPromoteRequest.days，合法区间 0-36500）。
    function adminPromoteUser(userId, type, days) {
        const body = { type: type };
        if (type === 'vip') body.days = Number.isFinite(days) ? days : 0;
        return post('/admin/users/' + userId + '/promote', body);
    }

     
    function adminListBackroomsMembers() {
        return request('/admin/backrooms/members');
    }

     
    function adminUpdateBackroomsMember(userId, permission) {
        return put('/admin/backrooms/members', { userId: userId, permission: permission });
    }

     
    function adminListOnline() {
        return request('/admin/online');
    }

     

     
    function adminChatSend(toUserId, content) {
        return post('/admin/chat/send', { toUserId: toUserId, content: content });
    }

     
    function adminChatInbox() {
        return request('/admin/chat/inbox');
    }

     
    function adminChatBroadcast(content) {
        return post('/admin/chat/broadcast', { content: content });
    }

     

     
     
     
     
     
    function guideAuthSync(token) {
        var tk = token || getToken();
        function doSync(retried) {
            return fetchApi('/guide/auth/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': '1',
                    'Authorization': tk ? 'Bearer ' + tk : ''
                },
                body: JSON.stringify({ token: tk })
            }).then(function (res) {
                return res.json().catch(function () { return null; }).then(function (data) {
                    if (!res.ok) {
                        var err = new Error(errorText(data && data.detail) || ('请求失败 ' + res.status));
                        err.status = res.status;
                        err.data = data;
                        throw err;
                    }
                    return data;
                });
            }).catch(function (err) {
                if (err && err.status === 401 && !retried && getCredentials()) {
                    return loginWithCredentials().then(function (newToken) {
                        tk = newToken;
                        return doSync(true);
                    }, function (loginErr) {
                         
                        throw loginErr || err;
                    });
                }
                throw err;
            });
        }
        return doSync(false);
    }

     
    function guideChat(message) {
        var token = getToken();
        return fetchApi('/guide/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '1',
                'Authorization': token ? 'Bearer ' + token : ''
            },
            body: JSON.stringify({ message: message })
        }).then(function (res) {
            return res.json().catch(function () { return null; }).then(function (data) {
                if (!res.ok) {
                    var err = new Error((data && data.detail) || ('请求失败 ' + res.status));
                    err.status = res.status;
                    err.data = data;
                    err.retryAfter = parseInt(res.headers.get('retry-after') || '0', 10) || 0;
                    throw err;
                }
                return data;
            });
        });
    }

     
     
     
     
     
     
    function guideChatStream(message, onEvent) {
        var token = getToken();
        return fetchApiRaw('/guide/chat/stream', {
            method: 'POST',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                'ngrok-skip-browser-warning': '1',
                'Authorization': token ? 'Bearer ' + token : ''
            },
            body: JSON.stringify({ message: message })
        }).then(function (res) {
            if (!res.ok) {
                 
                 
                return res.json().catch(function () { return null; }).then(function (data) {
                    var err = new Error(errorText(data && data.detail) || ('请求失败 ' + res.status));
                    err.status = res.status;
                    err.data = data;
                    err.retryAfter = parseInt(res.headers.get('retry-after') || '0', 10) || 0;
                    throw err;
                });
            }
            if (!res.body || typeof res.body.getReader !== 'function') {
                var noStream = new Error('当前环境不支持流式读取');
                noStream.noStream = true;
                throw noStream;
            }
            var reader = res.body.getReader();
            var decoder = new TextDecoder('utf-8');
            var buf = '';

            function parseFrame(frame) {
                var payload = '';
                frame.split('\n').forEach(function (line) {
                    var l = line.replace(/\r$/, '');
                    if (l.indexOf('data:') === 0) payload += l.slice(5).trim();
                });
                if (!payload) return;
                var ev;
                try { ev = JSON.parse(payload); } catch (e) { return; }
                if (onEvent) onEvent(ev);
            }

            function drain() {
                var frames = buf.split(/\r?\n\r?\n/);
                buf = frames.pop();       
                frames.forEach(parseFrame);
            }

            function pump() {
                return reader.read().then(function (r) {
                    if (r.done) {
                        buf += decoder.decode();
                        if (buf.trim()) parseFrame(buf);
                        return;
                    }
                    buf += decoder.decode(r.value, { stream: true });
                    drain();
                    return pump();
                });
            }

            return pump();
        });
    }

     
    function guideSession() {
        return request('/guide/session');
    }

     
    function guideStatus() {
        return request('/guide/status');
    }

     
    function guideHumanInbox() {
        return request('/guide/human/inbox');
    }

     
    function guideHumanAccept(sessionId) {
        return post('/guide/human/accept', { sessionId: sessionId });
    }

     
    function guideHumanReply(sessionId, content) {
        return post('/guide/human/reply', { sessionId: sessionId, content: content });
    }

     
    function guideHumanSession(sessionId) {
        return request('/guide/human/session/' + encodeURIComponent(sessionId));
    }

     
    function guideHumanAgents() {
        return request('/guide/human/agents');
    }

     
    function guideHumanAgentAdd(userId) {
        return post('/guide/human/agents', { userId: userId });
    }

     
    function guideHumanAgentRemove(userId) {
        return request('/guide/human/agents/' + encodeURIComponent(userId), { method: 'DELETE' });
    }

     
     
    function guideSessionClose(sessionId) {
        var body = {};
        if (sessionId) body.sessionId = sessionId;
        return post('/guide/session/close', body);
    }

     
    function guideHumanClose(sessionId) {
        return post('/guide/human/close', { sessionId: sessionId });
    }

     
    function guideHumanOfflineResolve(token) {
        return post('/guide/human/offline-resolve', { token: token });
    }

     
     
    function authFetch(path, token, options) {
        options = options || {};
        options.headers = options.headers || {};
        options.headers['Content-Type'] = 'application/json';
        options.headers['ngrok-skip-browser-warning'] = '1';
        if (token) options.headers['Authorization'] = 'Bearer ' + token;
        return fetchApi(path, options).then(function (res) {
            return res.json().catch(function () { return null; }).then(function (data) {
                if (!res.ok) {
                    var err = new Error(errorText(data && data.detail) || ('请求失败 ' + res.status));
                    err.status = res.status;
                    err.data = data;
                    throw err;
                }
                return data;
            });
        });
    }

     
    function appealLogin(username, passwordB64) {
        return authFetch('/guide/appeal', null, {
            method: 'POST',
            body: JSON.stringify({ username: username, password: passwordB64 })
        });
    }

     
    function appealSession(token) {
        return authFetch('/guide/appeal/session', token, { method: 'GET' });
    }

     
    function appealReply(token, content) {
        return authFetch('/guide/appeal/reply', token, {
            method: 'POST',
            body: JSON.stringify({ content: content })
        });
    }

     
     
     
    function userType() {
        var token = getToken();
        return fetchApi('/auth/user-type', {
            headers: {
                'ngrok-skip-browser-warning': '1',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        }).then(function (res) {
            if (!res.ok) {
                var err = new Error('请求失败 ' + res.status);
                err.status = res.status;
                throw err;
            }
            return res.text().then(function (t) {
                t = (t || '').trim();
                if (t.charAt(0) === '{' || t.charAt(0) === '[') {
                    try {
                        var obj = JSON.parse(t);
                        if (obj && typeof obj === 'object') {
                            var v = obj.userType || obj.user_type || obj.type || obj.permission || obj.role;
                            if (v) return String(v).trim();
                        }
                    } catch (e) {}
                }
                return t;
            });
        });
    }

    function saveUserInfo(user) {}

    function currentUser() {
        return me();
    }

    function currentUsername() {
        return currentUser().then(function (user) {
            if (user && user.username) return user.username;
            var token = getToken();
            if (token) {
                var parts = token.split('-');
                if (parts.length >= 2 && (parts[0] === 'ZC' || parts[0] === 'UR')) {
                    return parts[1];
                }
            }
            return '';
        }).catch(function () { return ''; });
    }

    function isVip(user) {
        if (!user) return false;
        if (user.is_vip === true || user.is_vip === 1 || user.is_vip === '1' || user.is_vip === 'true') return true;
        var role = String(user.role || user.user_type || user.type || '').toLowerCase();
        return role === 'zc' || role === 'admin' || role === 'vip' || role === 'vip用户' || role === 'isztg' || role === 'ztg';
    }

     
     
     

     
    function loginEmailStart(body) {
        return post('/auth/login/email/start', body || {});
    }

     
    function loginFactor(body) {
        return post('/auth/login/factor', body || {});
    }

     
    function passkeyLoginStart(body) {
        return post('/auth/login/passkey/start', body || {});
    }

     
    function passkeyLoginFinish(body) {
        return post('/auth/login/passkey/finish', body || {});
    }

     
    function securityOverview() {
        return request('/auth/security');
    }

     
    function securityPolicy(body) {
        return post('/auth/security/policy', body || {});
    }

     
    function totpSetup() {
        return post('/auth/security/totp/setup', {});
    }

    function totpEnable(code) {
        return post('/auth/security/totp/enable', { code: code });
    }

     
    function totpDisable(body) {
        return post('/auth/security/totp/disable', body || {});
    }

     
    function regenerateRecoveryCodes(body) {
        return post('/auth/security/recovery-codes', body || {});
    }

     
    function passkeySetup() {
        return post('/auth/security/passkey/setup', {});
    }

     
    function passkeyEnable(body) {
        return post('/auth/security/passkey/enable', body || {});
    }

     
    function passkeyDelete(body) {
        return post('/auth/security/passkey/delete', body || {});
    }

     
    function rcFiles() {
        return request('/rc/files');
    }

     
    function rcRevealRecoveryKey(fileId, md5Password) {
        return post('/rc/files/' + encodeURIComponent(fileId) + '/recovery-key', { password: md5Password });
    }

     
    function rcDeleteFile(fileId) {
        return request('/rc/files/' + encodeURIComponent(fileId), { method: 'DELETE' });
    }

     
    function rcMyKeys() {
        return request('/rc/keys/mine');
    }

     
    function afdianSelfCheck() {
        return post('/afdian/self-check', {});
    }

     

     
     
     
    function rcSerialIssue(label) {
        return post('/rc/serial', { label: label == null ? '' : String(label) });
    }

     
    function rcSerialMine() {
        return request('/rc/serial/mine');
    }

     
    function rcSerialRevoke(serialId) {
        return request('/rc/serial/mine/' + encodeURIComponent(serialId), { method: 'DELETE' });
    }

     
    function rcTokensMine() {
        return request('/rc/tokens/mine');
    }

     
    function rcTokenRevoke(tokenId) {
        return request('/rc/tokens/mine/' + encodeURIComponent(tokenId), { method: 'DELETE' });
    }

    // ---- RCU 更新管理（管理员后台，Lv.3+）----
    function rcuList() {
        return request('/updates');
    }
    function rcuRevokedList() {
        return request('/updates/revoked');
    }
    // 发布 RCU 包：multipart/form-data。切勿手写 Content-Type，交给浏览器带 boundary。
    function rcuPublish(formData) {
        return request('/updates', { method: 'POST', body: formData });
    }
    function rcuRevokeAdd(payload) {
        return post('/updates/revoked', payload);
    }
    function rcuRevokeRemove(version) {
        return request('/updates/revoked/' + encodeURIComponent(version), { method: 'DELETE' });
    }
    // 带管理员凭据下载 .7z：浏览器直开链接带不上 Authorization，只能走 fetch + blob。
    function rcuDownload(version) {
        var token = getToken();
        return fetchApi('/updates/' + encodeURIComponent(version) + '/download', {
            headers: {
                'ngrok-skip-browser-warning': '1',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        }).then(function (res) {
            if (!res.ok) {
                var e = new Error('下载失败 ' + res.status);
                e.status = res.status;
                throw e;
            }
            return res.blob();
        }).then(function (blob) {
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = version + '.7z';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
    }

     
     
     
    function pentestApply(reason) {
        return post('/pentest/apply', { reason: reason == null ? '' : String(reason) });
    }

     
    function pentestMy() {
        return request('/pentest/my');
    }

     
    function pentestUpdateMyTask(taskId, opts) {
        var o = opts || {};
        var body = {};
        if (o.status != null) body.status = o.status;
        if (o.note != null) body.note = String(o.note);
        return request('/pentest/my/tasks/' + encodeURIComponent(taskId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

     
    function pentestRevoke(reason) {
        return post('/pentest/revoke', { reason: reason == null ? '' : String(reason) });
    }

     
    function pentestReset() {
        return post('/pentest/reset', {});
    }

     
    function adminPentest() {
        return request('/admin/pentest');
    }

    function adminPentestAssign(applicantUserId, reason, note) {
        return post('/admin/pentest/assign', {
            applicantUserId: Number(applicantUserId),
            reason: reason == null ? '' : String(reason),
            note: note == null ? '' : String(note)
        });
    }

     
    function adminPentestApprove(applicationId, note) {
        return post('/admin/pentest/applications/' + encodeURIComponent(applicationId) + '/approve', {
            note: note == null ? '' : String(note)
        });
    }

    function adminPentestReject(applicationId, note) {
        return post('/admin/pentest/applications/' + encodeURIComponent(applicationId) + '/reject', {
            note: note == null ? '' : String(note)
        });
    }

     
    function adminPentestReset(code) {
        return post('/admin/pentest/' + encodeURIComponent(code) + '/reset', {});
    }

    function adminPentestRevoke(code, reason) {
        return post('/admin/pentest/' + encodeURIComponent(code) + '/revoke', {
            reason: reason == null ? '' : String(reason)
        });
    }

    function adminPentestTaskAdd(code, title, detail) {
        return post('/admin/pentest/' + encodeURIComponent(code) + '/tasks', {
            title: String(title == null ? '' : title),
            detail: detail == null ? '' : String(detail)
        });
    }

     
    function adminPentestTaskUpdate(code, taskId, opts) {
        var o = opts || {};
        var body = {};
        if (o.status != null) body.status = o.status;
        if (o.note != null) body.note = String(o.note);
        return request('/admin/pentest/' + encodeURIComponent(code) + '/tasks/' + encodeURIComponent(taskId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    function adminPentestTaskDelete(code, taskId) {
        return request('/admin/pentest/' + encodeURIComponent(code) + '/tasks/' + encodeURIComponent(taskId), {
            method: 'DELETE'
        });
    }

     
     
     
    function rcBugs() {
        return request('/rc/bugs');
    }

     
    function rcSubmitBug(payload) {
        return post('/rc/bugs', payload);
    }

     
    function adminRcBugs() {
        return request('/admin/rc/bugs');
    }

     
     
     
     
    function adminRcBugStatus(bugId, opts) {
        var o = opts || {};
        var body = {};
        ['status', 'note', 'appearedVersion', 'fixedVersion'].forEach(function (k) {
            var v = o[k];
            if (v != null && String(v).trim() !== '') body[k] = String(v).trim();
        });
        return request('/admin/rc/bugs/' + bugId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

     
     
    function adminAfdianPurchases() {
        return request('/admin/afdian/purchases');
    }

     
     
    function adminAfdianReconcile(opts) {
        var o = opts || {};
        var body = {};
        if (o.outTradeNo != null && String(o.outTradeNo).trim() !== '') body.outTradeNo = String(o.outTradeNo).trim();
        if (o.pages != null && String(o.pages).trim() !== '') body.pages = Number(o.pages);
        return post('/admin/afdian/reconcile', body);
    }

     
     
     
    var BACKROOMS_PREFIX = {
        level: '/backrooms/levels',
        entity: '/backrooms/entities',
        object: '/backrooms/objects',
        phenomenon: '/backrooms/phenomena'
    };

    function backroomsPrefix(type) {
        return BACKROOMS_PREFIX[type] || BACKROOMS_PREFIX.level;
    }

    function backroomsList() {
        return request('/backrooms/levels');
    }

    function backroomsView(id) {
        return request('/backrooms/levels/' + encodeURIComponent(id));
    }

     
     
    function backroomsTypeList(type) {
        return request(backroomsPrefix(type));
    }

     
    var VISITOR_KEY = 'ziyit_visitor_id';

    function getVisitorId() {
        try {
            var v = localStorage.getItem(VISITOR_KEY);
            if (!v || !/^[0-9A-Za-z_-]{8,64}$/.test(v)) {
                v = '';
                if (window.crypto && crypto.getRandomValues) {
                    var a = new Uint8Array(8);
                    crypto.getRandomValues(a);
                    for (var i = 0; i < a.length; i++) v += ('0' + a[i].toString(16)).slice(-2);
                }
                if (!v) v = (Date.now().toString(36) + Math.random().toString(36).slice(2)).slice(0, 24);
                localStorage.setItem(VISITOR_KEY, v);
            }
            return v;
        } catch (e) { return ''; }
    }

     
    function backroomsTypeHot(type, limit) {
        var q = limit ? ('?limit=' + encodeURIComponent(limit)) : '';
        return request('/backrooms/hot/' + encodeURIComponent(type) + q);
    }

     
    function backroomsHotRender(opts) {
        var o = opts || {};
        var type = o.type || 'level';
        var el = (typeof o.container === 'string') ? document.getElementById(o.container) : o.container;
        if (!el) return;
        var onOpen = o.onOpen || function (id) {
            if (window.ZIYIT_API && ZIYIT_API.backroomsTypeOpen) ZIYIT_API.backroomsTypeOpen(type, id);
        };
        function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
        function col(title, list, showVisitors) {
            var body = (list && list.length) ? list.map(function (it) {
                var n = showVisitors
                    ? ((Number(it.visitors) || 0) + ' 人 / ' + (Number(it.views) || 0) + ' 次')
                    : ((Number(it.views) || 0) + ' 次');
                return '<li><a href="javascript:void(0)" data-hot-open="' + esc(it.id) + '">' + esc(it.id) + '</a>'
                    + (it.name ? ' - “' + esc(it.name) + '”' : '')
                    + '<span class="br-hot-num">' + n + '</span></li>';
            }).join('') : '<li class="br-hot-empty">暂无数据</li>';
            return '<div class="br-hot-col"><h5>' + title + '</h5><ol>' + body + '</ol></div>';
        }
        function shell(inner) {
            return '<h4><span>访问量榜单<span class="import"><span style="white-space: pre-wrap;">&#32;</span></span></span></h4>'
                + '<div class="br-hot-lists">' + inner + '</div>';
        }
        el.innerHTML = shell('<div class="br-hot-col"><h5>加载中…</h5></div>');
        el.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a[data-hot-open]') : null;
            if (!a) return;
            e.preventDefault();
            onOpen(a.getAttribute('data-hot-open'));
        });
        return backroomsTypeHot(type, 3).then(function (d) {
            d = d || {};
            el.innerHTML = shell(col('访问人数 Top 3', d.byVisitors, true)
                + col('访问次数 Top 3', d.byViews, false)
                + col('综合 Top 3', d.byOverall, true));
        }).catch(function () {
            el.innerHTML = shell('<div class="br-hot-col"><h5>加载失败</h5></div>');
        });
    }

     
    function backroomsTypeMeta(type, id) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(id) + '/meta');
    }

     
    function backroomsTypeView(type, id) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(id));
    }

     
     
    function backroomsTypeSubmit(type, docId, name, file) {
        var fd = new FormData();
        fd.append(type === 'level' ? 'levelId' : 'docId', docId);
        fd.append('name', name);
        fd.append('file', file);
        return request(backroomsPrefix(type), { method: 'POST', body: fd });
    }

    function backroomsTypeUpdate(type, docId, name, file) {
        var fd = new FormData();
        if (name) fd.append('name', name);
        fd.append('file', file);
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId), { method: 'PUT', body: fd });
    }

    function backroomsTypeDelete(type, docId) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId), { method: 'DELETE' });
    }

     
    function backroomsTypeRewrite(type, docId) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId) + '/rewrite', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
    }

     
    function backroomsTypeAdminDelete(type, docId) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId) + '/admin', { method: 'DELETE' });
    }

     
    function backroomsTypeOpen(type, id) {
        var token = getToken();
        return fetchApi(backroomsPrefix(type) + '/' + encodeURIComponent(id), {
            headers: {
                'ngrok-skip-browser-warning': '1',
                'X-Ziyit-Visitor': getVisitorId(),
                'Authorization': token ? 'Bearer ' + token : ''
            }
        }).then(function (res) {
            if (!res.ok) {
                var err = new Error('请求失败 ' + res.status);
                err.status = res.status;
                throw err;
            }
            return res.text();
        }).then(function (html) {
            var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        });
    }

     
    function backroomsSubmit(levelId, name, file) {
        var fd = new FormData();
        fd.append('levelId', levelId);
        fd.append('name', name);
        fd.append('file', file);
        return request('/backrooms/levels', { method: 'POST', body: fd });  
    }

     
    function backroomsUpdate(levelId, name, file) {
        var fd = new FormData();
        if (name) fd.append('name', name);
        fd.append('file', file);
        return request('/backrooms/levels/' + encodeURIComponent(levelId), { method: 'PUT', body: fd });
    }

    function backroomsDelete(levelId) {
        return request('/backrooms/levels/' + encodeURIComponent(levelId), { method: 'DELETE' });
    }

    function backroomsAdminDelete(levelId) {
        return request('/backrooms/levels/' + encodeURIComponent(levelId) + '/admin', { method: 'DELETE' });
    }

    function backroomsRewrite(levelId) {
        return request('/backrooms/levels/' + encodeURIComponent(levelId) + '/rewrite', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
    }

    function backroomsAiReview(levelId, action, reply, submitAdvanced) {
        return post('/backrooms/review/ai', {
            levelId: levelId,
            action: action,
            reply: reply || '',
            submitAdvanced: !!submitAdvanced
        });
    }

    function backroomsAdvancedReview(levelId, action, reason) {
        return post('/backrooms/review/advanced', {
            levelId: levelId,
            action: action,
            reason: reason || ''
        });
    }

     
     
     
    var BACKROOMS_STANDARD = {
        level: { rel: 'normal-levels/slyq.md', name: '层级审核标准.md' },
        entity: { rel: 'entities/slyq.md', name: '实体审核标准.md' },
        object: { rel: 'objects/slyq.md', name: '物品审核标准.md' },
        phenomenon: { rel: 'normal-levels/slyq.md', name: '现象审核标准.md' }
    };

    function backroomsStandardConfig(type) {
        return BACKROOMS_STANDARD[type] || BACKROOMS_STANDARD.level;
    }

     
     
     
    function backroomsStandardUrl(type) {
        var cfg = backroomsStandardConfig(type);
        try { return new URL(cfg.rel, document.baseURI).href; } catch (e) { return cfg.rel; }
    }

     
     
    function backroomsLoadStandard(type) {
        return fetch(backroomsStandardUrl(type), { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) { var e = new Error('标准文件不存在 ' + r.status); e.status = r.status; throw e; }
                return r.text();
            });
    }

     
    function backroomsDownloadStandard(type) {
        var cfg = backroomsStandardConfig(type);
        return backroomsLoadStandard(type).then(function (text) {
            var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = cfg.name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
        });
    }

     
    function backroomsBase() {
        return currentBase();
    }

     
     
    function backroomsOpenLevel(id) {
        var token = getToken();
        return fetchApi('/backrooms/levels/' + encodeURIComponent(id), {
            headers: {
                'ngrok-skip-browser-warning': '1',
                'Authorization': token ? 'Bearer ' + token : ''
            }
        }).then(function (res) {
            if (!res.ok) {
                var err = new Error('请求失败 ' + res.status);
                err.status = res.status;
                throw err;
            }
            return res.text();
        }).then(function (html) {
            var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        });
    }

     
     
     
    var HEARTBEAT_MS = 60000;
    var heartbeatTimer = null;

    function startHeartbeat() {
        if (heartbeatTimer || typeof setInterval === 'undefined') return;
        heartbeatTimer = setInterval(function () {
            if (document.hidden) return;           
            if (enrollToken) return;               
            if (!getToken()) return;
            request('/auth/me').catch(function () { });
        }, HEARTBEAT_MS);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startHeartbeat);
        } else {
            startHeartbeat();
        }
    }

    // ------------------------------------------------------------
    // 定价视图渲染（v0.3.39）
    // 把服务端 pricing 视图渲染成「概况（大约一次验证多少点）+ 分步详情」。
    // 所有单价一律来自入参（/points/pricing 或 /api-key/mine 的 pricing 字段），
    // 这里不写任何单价常量。
    // ------------------------------------------------------------
    function _prEsc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _prFmt(n) {
        if (n == null || n === '') return '-';
        var v = Number(n);
        if (isNaN(v)) return _prEsc(n);
        if (Math.abs(v - Math.round(v)) < 1e-9) return String(Math.round(v));
        return String(Math.round(v * 100) / 100);
    }

    function _prTier(k) {
        if (k === 'phantom') return '纯 Phantom';
        if (k === 'pow') return '纯 PoW';
        return 'Phantom + PoW';
    }

    function _prRow(label, path, note, price) {
        return '<div style="display:flex;align-items:baseline;gap:10px;padding:7px 0;border-bottom:1px dashed var(--ziyit-border);font-size:13px;">' +
            '<span style="flex:1;min-width:0;color:var(--ziyit-text-primary);">' + _prEsc(label) +
            (path ? ' <span style="font-size:12px;color:var(--ziyit-text-secondary);font-family:Consolas,monospace;">' + _prEsc(path) + '</span>' : '') +
            (note ? ' <span style="color:var(--ziyit-text-secondary);">（' + _prEsc(note) + '）</span>' : '') +
            '</span>' +
            '<span style="white-space:nowrap;color:var(--ziyit-primary);font-weight:600;">' + _prFmt(price) + ' 点</span>' +
            '</div>';
    }

    function pricingHtml(pricing) {
        if (!pricing) return '';
        var perReq = pricing.mode === 'per_request';
        var prices = (pricing.verifyPlan && pricing.verifyPlan.prices) || pricing.per_verification || {};
        var tiers = ['phantom', 'pow', 'both'].map(function (k) {
            return { label: _prTier(k), v: prices[k] };
        }).filter(function (t) { return t.v != null && t.v !== '' && !isNaN(Number(t.v)); });

        var estLine = '—';
        var tierLine = '';
        if (tiers.length) {
            var vals = tiers.map(function (t) { return Number(t.v); });
            var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
            estLine = (lo === hi ? _prFmt(lo) : (_prFmt(lo) + ' ~ ' + _prFmt(hi))) + ' 点';
            tierLine = tiers.map(function (t) { return _prEsc(t.label) + ' ' + _prFmt(t.v) + ' 点'; }).join(' ｜ ');
        }

        var vip = pricing.vip || {};
        var vipLine = '';
        if (vip.mode === 'free') vipLine = 'VIP 用户免费';
        else if (vip.mode === 'discount') vipLine = 'VIP 用户按 ' + _prFmt(Number(vip.discount) * 10) + ' 折收取';

        var rows = '';
        var pr = pricing.per_request || {};
        if (perReq) {
            if (pr.all_requests) {
                rows += _prRow('所有请求（统一价）', '', '', pr.all_price);
            } else {
                var labels = pricing.endpointLabels || {};
                var eps = pr.endpoints || {};
                Object.keys(labels).forEach(function (p) {
                    var it = eps[p];
                    if (it && it.charge) rows += _prRow(labels[p], p, '', it.price);
                });
            }
            var vr = pr.verify || {};
            var vlabels = pricing.verifyEndpointLabels || {};
            var vname = (vlabels['/verify'] || '/verify') + ' / ' + (vlabels['/pow/verify'] || '/pow/verify');
            if (vr.mode === 'flat') {
                rows += _prRow(vname, '', '固定价', vr.flat);
            } else {
                var c = vr.complexity || {};
                rows += _prRow(vname, '', '纯 Phantom', c.phantom);
                rows += _prRow(vname, '', '纯 PoW', c.pow);
                rows += _prRow(vname, '', 'Phantom + PoW', c.both);
            }
        } else {
            rows = '<div style="padding:7px 0;font-size:13px;color:var(--ziyit-text-secondary);line-height:1.8;">' +
                '当前为「按单次验证」口径：整条验证链路只按上面三档中的<b>一档</b>收取，不逐步计费。</div>';
        }

        // 澄镜防注入检测走的是同一份点数，价目卡里一并列出，别让它看起来像另一套计费
        var inj = pricing.injection || {};
        var injLine = '';
        if (inj.tokensPerPoint != null || inj.pointsPerKeyword != null) {
            var seg = [];
            if (inj.tokensPerPoint != null) seg.push(_prFmt(inj.tokensPerPoint) + ' Token = 1 点');
            if (inj.pointsPerKeyword != null) seg.push('命中关键词 ' + _prFmt(inj.pointsPerKeyword) + ' 点 / 个');
            injLine = '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--ziyit-border);' +
                'font-size:13px;color:var(--ziyit-text-secondary);line-height:1.8;">' +
                '澄镜防注入检测（<b>扣同一份点数</b>）：' + _prEsc(seg.join('，')) + '。' +
                '流水记为「防注入检测消耗」，余额与充值见本页。</div>';
        }

        return '<div style="border:1px solid var(--ziyit-border);border-radius:10px;padding:16px;background:var(--ziyit-bg);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
            '<span style="font-size:15px;font-weight:600;color:var(--ziyit-text-primary);">当前定价</span>' +
            '<span style="font-size:12px;padding:2px 10px;border-radius:10px;background:var(--ziyit-primary);color:#ffffff;">' +
            (perReq ? '按请求计费' : '按单次验证') + '</span></div>' +
            '<div style="margin-top:10px;font-size:14px;color:var(--ziyit-text-primary);">大约一次人机验证：' +
            '<b style="color:var(--ziyit-primary);font-size:16px;">' + estLine + '</b></div>' +
            (tierLine ? '<div style="margin-top:6px;font-size:13px;color:var(--ziyit-text-secondary);">' + tierLine + '</div>' : '') +
            (vipLine ? '<div style="margin-top:6px;font-size:13px;color:var(--ziyit-text-secondary);">' + _prEsc(vipLine) + '</div>' : '') +
            '<details style="margin-top:10px;">' +
            '<summary style="cursor:pointer;font-size:13px;color:var(--ziyit-primary);">价格详情（每个步骤多少点）</summary>' +
            '<div style="margin-top:8px;">' + rows + '</div></details>' + injLine +
            '<div style="margin-top:10px;font-size:12px;color:var(--ziyit-text-secondary);">价格由管理员在后台配置，此处仅展示当前口径；实际扣点按真实发生的动作结算。</div>' +
            '</div>';
    }

    // ------------------------------------------------------------
    // 澄镜防注入检测 API（防注入检测 v0.3.56）
    // 检测走 api-key 头（与人机验证同一把密钥、同一套门禁），其余按登录 JWT 走。
    // 这里不发 Authorization：检测的计费归属由 api-key 决定，不带登录票据更干净。
    // ------------------------------------------------------------
    function injectionDetect(text, apiKey) {
        return fetchApi('/injection/detect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': '1',
                'api-key': String(apiKey == null ? '' : apiKey)
            },
            body: JSON.stringify({ text: String(text == null ? '' : text) })
        }).then(function (res) {
            return res.json().catch(function () { return null; }).then(function (data) {
                if (!res.ok) {
                    var detail = data && data.detail;
                    var err = new Error(errorText(detail) || ('请求失败 ' + res.status));
                    err.status = res.status;
                    err.data = data;
                    err.detail = detail;
                    err.reason = (detail && typeof detail === 'object') ? detail.reason : '';
                    throw err;
                }
                return data;
            });
        });
    }

    // 公开：可用模型版本 / 当前定价（产品页与体验页都从这里取，前端不硬编码价格）
    function injectionModels() {
        return request('/injection/models');
    }

    function injectionPricing() {
        return request('/injection/pricing');
    }

    // 我的用量（登录用户；只统计自己名下的调用）
    function injectionUsage(opts) {
        var o = opts || {};
        var qs = [];
        if (o.limit != null) qs.push('limit=' + encodeURIComponent(o.limit));
        if (o.start) qs.push('start=' + encodeURIComponent(o.start));
        if (o.end) qs.push('end=' + encodeURIComponent(o.end));
        return request('/injection/usage' + (qs.length ? '?' + qs.join('&') : ''));
    }

    // 管理端：报表与定价（Lv.3+）
    function adminInjectionReport(opts) {
        var o = opts || {};
        var qs = [];
        if (o.limit != null) qs.push('limit=' + encodeURIComponent(o.limit));
        if (o.start) qs.push('start=' + encodeURIComponent(o.start));
        if (o.end) qs.push('end=' + encodeURIComponent(o.end));
        if (o.userId != null && o.userId !== '') qs.push('user_id=' + encodeURIComponent(o.userId));
        if (o.source) qs.push('source=' + encodeURIComponent(o.source));
        return request('/admin/injection/report' + (qs.length ? '?' + qs.join('&') : ''));
    }

    function adminInjectionPricing() {
        return request('/admin/injection/pricing');
    }

    // 可只传要改的字段（与 /admin/pricing 的整份 PUT 不同）
    function adminInjectionSavePricing(body) {
        return put('/admin/injection/pricing', body || {});
    }

    // 管理端：澄镜模型版本（Lv.3+）。GET 读当前/可选/推理服务状态；PUT 切换并触发推理服务重载
    function adminInjectionModel() {
        return request('/admin/injection/model');
    }

    function adminInjectionSetModel(version) {
        return put('/admin/injection/model', { version: version || '' });
    }

    // 客服后台：本站（在线客服内部，source=cs）的注入检测消耗，Lv.1+ 可读
    function guideInjectionUsage(opts) {
        var o = opts || {};
        var qs = [];
        if (o.limit != null) qs.push('limit=' + encodeURIComponent(o.limit));
        if (o.start) qs.push('start=' + encodeURIComponent(o.start));
        if (o.end) qs.push('end=' + encodeURIComponent(o.end));
        return request('/guide/injection/usage' + (qs.length ? '?' + qs.join('&') : ''));
    }

    // ===== 知识库可见等级管理（仅 Lv.4 站长，且邮箱已验证）=====
    // 条目总表：level（精确等级 0-4）/ q（按 key 模糊）
    function knowledgeEntries(opts) {
        var o = opts || {};
        var qs = [];
        if (o.level != null && o.level !== '') qs.push('level=' + encodeURIComponent(o.level));
        if (o.q) qs.push('q=' + encodeURIComponent(o.q));
        return request('/admin/knowledge/entries' + (qs.length ? '?' + qs.join('&') : ''));
    }
    // 单条详情：含 text（生效文）与 docText（文档原文）
    function knowledgeEntry(key) {
        return request('/admin/knowledge/entry?key=' + encodeURIComponent(key));
    }
    // 原始文档全文（只读）
    function knowledgeDoc() {
        return request('/admin/knowledge/doc');
    }
    // 档位预览：level 过滤后的可见全文；带 q 时返回真正注入给 AI 的 matched（字符串）
    function knowledgePreview(level, q) {
        var qs = ['level=' + encodeURIComponent(level == null ? 0 : level)];
        if (q) qs.push('q=' + encodeURIComponent(q));
        return request('/admin/knowledge/preview?' + qs.join('&'));
    }
    // 关键词搜索：命中标题/正文，返回 matchedIn 与 snippet
    function knowledgeSearch(q, level) {
        var qs = ['q=' + encodeURIComponent(q)];
        if (level != null && level !== '') qs.push('level=' + encodeURIComponent(level));
        return request('/admin/knowledge/search?' + qs.join('&'));
    }
    // 新增 / 修改（只传要改的字段；title/body 传空串 = 还原原文）
    function knowledgeUpsert(body) {
        return put('/admin/knowledge/entry', body || {});
    }
    // 删除（仅限 added:true 的条目）
    function knowledgeDelete(key) {
        return request('/admin/knowledge/entry?key=' + encodeURIComponent(key), { method: 'DELETE' });
    }
    // 恢复公开：{keys:[...]} 或 {all:true}
    function knowledgeReset(body) {
        return post('/admin/knowledge/reset', body || {});
    }

    window.ZIYIT_API = {
        BASE: '',
        backendReady: backendReady,
        base: currentBase,
        getBases: getBases,
        getToken: getToken,
        setToken: setToken,
        clearToken: clearToken,
        getRememberToken: getRememberToken,
        setRememberToken: setRememberToken,
        clearRememberToken: clearRememberToken,
        setCredentials: setCredentials,
        getCredentials: getCredentials,
        clearCredentials: clearCredentials,
        isBackendUrl: isBackendUrl,
        imageBlobUrl: imageBlobUrl,
        applyImage: applyImage,
        request: request,
        login: login,
        register: register,
        me: me,
        currentUser: currentUser,
        currentUsername: currentUsername,
        saveUserInfo: saveUserInfo,
        updateUsername: updateUsername,
        updateProfile: updateProfile,
        updatePassword: updatePassword,
        updateEmail: updateEmail,
        updateAvatar: updateAvatar,
        getMods: getMods,
        getDlc: getDlc,
        myDlc: myDlc,
        getFreeMods: getFreeMods,
        pointsBalance: pointsBalance,
        pointsLedger: pointsLedger,
        pointsPurchase: pointsPurchase,
        pointsPricing: pointsPricing,
        pricingHtml: pricingHtml,
        injectionDetect: injectionDetect,
        injectionModels: injectionModels,
        injectionPricing: injectionPricing,
        injectionUsage: injectionUsage,
        adminInjectionReport: adminInjectionReport,
        adminInjectionPricing: adminInjectionPricing,
        adminInjectionSavePricing: adminInjectionSavePricing,
        adminInjectionModel: adminInjectionModel,
        adminInjectionSetModel: adminInjectionSetModel,
        guideInjectionUsage: guideInjectionUsage,
        knowledgeEntries: knowledgeEntries,
        knowledgeEntry: knowledgeEntry,
        knowledgeDoc: knowledgeDoc,
        knowledgePreview: knowledgePreview,
        knowledgeSearch: knowledgeSearch,
        knowledgeUpsert: knowledgeUpsert,
        knowledgeDelete: knowledgeDelete,
        knowledgeReset: knowledgeReset,
        submitMod: submitMod,
        myMods: myMods,
        uploadMod: uploadMod,
        sendVerifyEmail: sendVerifyEmail,
        downloadMod: downloadMod,
        requestDeletion: requestDeletion,
        cancelDeletion: cancelDeletion,
        logout: logout,
        getIpLocation: getIpLocation,
        formatIpLocation: formatIpLocation,
        getIpStatus: getIpStatus,
        banIp: banIp,
        unbanIp: unbanIp,
        deleteLoginHistory: deleteLoginHistory,
        adminBanIp: adminBanIp,
        adminUnbanIp: adminUnbanIp,
        adminListIpBans: adminListIpBans,
        adminGetUserDlc: adminGetUserDlc,
        adminGrantDlc: adminGrantDlc,
        adminRevokeDlc: adminRevokeDlc,
        adminMe: adminMe,
        adminListAdmins: adminListAdmins,
        adminAddAdmin: adminAddAdmin,
        adminUpdateAdmin: adminUpdateAdmin,
        adminRemoveAdmin: adminRemoveAdmin,
        adminPromoteUser: adminPromoteUser,
        adminListBackroomsMembers: adminListBackroomsMembers,
        adminUpdateBackroomsMember: adminUpdateBackroomsMember,
        adminListOnline: adminListOnline,
        adminChatSend: adminChatSend,
        adminChatInbox: adminChatInbox,
        adminChatBroadcast: adminChatBroadcast,
        guideAuthSync: guideAuthSync,
        guideChat: guideChat,
        guideChatStream: guideChatStream,
        guideSession: guideSession,
        guideStatus: guideStatus,
        guideHumanInbox: guideHumanInbox,
        guideHumanAccept: guideHumanAccept,
        guideHumanReply: guideHumanReply,
        guideHumanSession: guideHumanSession,
        guideHumanAgents: guideHumanAgents,
        guideHumanAgentAdd: guideHumanAgentAdd,
        guideHumanAgentRemove: guideHumanAgentRemove,
        guideSessionClose: guideSessionClose,
        guideHumanClose: guideHumanClose,
        guideHumanOfflineResolve: guideHumanOfflineResolve,
        appealLogin: appealLogin,
        appealSession: appealSession,
        appealReply: appealReply,
        userType: userType,
        isVip: isVip,
        rcFiles: rcFiles,
        rcRevealRecoveryKey: rcRevealRecoveryKey,
        rcDeleteFile: rcDeleteFile,
        rcMyKeys: rcMyKeys,
        afdianSelfCheck: afdianSelfCheck,
        rcSerialIssue: rcSerialIssue,
        rcSerialMine: rcSerialMine,
        rcSerialRevoke: rcSerialRevoke,
        rcTokensMine: rcTokensMine,
        rcTokenRevoke: rcTokenRevoke,
        rcuList: rcuList,
        rcuRevokedList: rcuRevokedList,
        rcuPublish: rcuPublish,
        rcuRevokeAdd: rcuRevokeAdd,
        rcuRevokeRemove: rcuRevokeRemove,
        rcuDownload: rcuDownload,
        pentestApply: pentestApply,
        pentestMy: pentestMy,
        pentestUpdateMyTask: pentestUpdateMyTask,
        pentestRevoke: pentestRevoke,
        pentestReset: pentestReset,
        adminPentest: adminPentest,
        adminPentestAssign: adminPentestAssign,
        adminPentestApprove: adminPentestApprove,
        adminPentestReject: adminPentestReject,
        adminPentestReset: adminPentestReset,
        adminPentestRevoke: adminPentestRevoke,
        adminPentestTaskAdd: adminPentestTaskAdd,
        adminPentestTaskUpdate: adminPentestTaskUpdate,
        adminPentestTaskDelete: adminPentestTaskDelete,
        loginEmailStart: loginEmailStart,
        loginFactor: loginFactor,
        passkeyLoginStart: passkeyLoginStart,
        passkeyLoginFinish: passkeyLoginFinish,
        securityOverview: securityOverview,
        securityPolicy: securityPolicy,
        totpSetup: totpSetup,
        totpEnable: totpEnable,
        totpDisable: totpDisable,
        regenerateRecoveryCodes: regenerateRecoveryCodes,
        passkeySetup: passkeySetup,
        passkeyEnable: passkeyEnable,
        passkeyDelete: passkeyDelete,
        setEnrollToken: setEnrollToken,
        rcBugs: rcBugs,
        rcSubmitBug: rcSubmitBug,
        adminRcBugs: adminRcBugs,
        adminRcBugStatus: adminRcBugStatus,
        adminAfdianPurchases: adminAfdianPurchases,
        adminAfdianReconcile: adminAfdianReconcile,
        backroomsList: backroomsList,
        backroomsView: backroomsView,
        backroomsSubmit: backroomsSubmit,
        backroomsUpdate: backroomsUpdate,
        backroomsDelete: backroomsDelete,
        backroomsAdminDelete: backroomsAdminDelete,
        backroomsRewrite: backroomsRewrite,
        backroomsAiReview: backroomsAiReview,
        backroomsAdvancedReview: backroomsAdvancedReview,
        backroomsDownloadStandard: backroomsDownloadStandard,
        backroomsLoadStandard: backroomsLoadStandard,
        backroomsStandardUrl: backroomsStandardUrl,
        backroomsBase: backroomsBase,
        backroomsOpenLevel: backroomsOpenLevel,
        backroomsPrefix: backroomsPrefix,
        backroomsTypeList: backroomsTypeList,
        backroomsTypeHot: backroomsTypeHot,
        backroomsHotRender: backroomsHotRender,
        backroomsTypeMeta: backroomsTypeMeta,
        backroomsTypeView: backroomsTypeView,
        backroomsTypeOpen: backroomsTypeOpen,
        backroomsTypeSubmit: backroomsTypeSubmit,
        backroomsTypeUpdate: backroomsTypeUpdate,
        backroomsTypeDelete: backroomsTypeDelete,
        backroomsTypeRewrite: backroomsTypeRewrite,
        backroomsTypeAdminDelete: backroomsTypeAdminDelete
    };
})();
