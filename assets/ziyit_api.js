(function () {
    var DEFAULT_BASE = 'https://willian-unheady-rawly.ngrok-free.dev';

     
    var BASE_COOKIE = 'ziyit_api_base_ok';
    var BASE_COOKIE_DAYS = 7;

     
    var SCRIPT_SRC = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';

    var loadedBases = [];
    var resolvedBase = '';
    var readyBasePromise = null;

    function backendTxtUrl() {
        try {
            if (SCRIPT_SRC) return new URL('../backend.txt', SCRIPT_SRC).href;
        } catch (e) {}
        return 'backend.txt';
    }

     
    function parseBases(txt) {
        var out = [];
        String(txt || '').split(/\r?\n/).forEach(function (line) {
            var u = line.trim();
            if (!u || u.charAt(0) === '#') return;
            var m = u.match(/https?:\/\/[^\s]+/i);
            if (!m) return;
            u = m[0].replace(/\/+$/, '');
            if (out.indexOf(u) === -1) out.push(u);
        });
        return out;
    }

    function loadBackendBases() {
        return new Promise(function (resolve) {
            var done = false;
            function finish() { if (!done) { done = true; resolve(loadedBases); } }
            try {
                fetch(backendTxtUrl(), { cache: 'no-store', headers: { 'ngrok-skip-browser-warning': '1' } })
                    .then(function (res) { return res.ok ? res.text() : ''; })
                    .then(function (txt) { loadedBases = parseBases(txt); finish(); })
                    .catch(finish);
            } catch (e) {
                finish();
            }
            setTimeout(finish, 4000);
        });
    }

    function backendReady() {
        if (!readyBasePromise) {
            var cached = cachedBase();
            if (cached) {
                 
                resolvedBase = cached;
                readyBasePromise = loadBackendBases().then(function () { return cached; });
            } else {
                readyBasePromise = loadBackendBases().then(function () {
                    var bases = getBases();
                    var i = 0;
                    function next() {
                        if (i >= bases.length) return bases[0] || DEFAULT_BASE;
                        var b = bases[i++];
                        return probeBase(b).then(function (ok) { return ok ? b : next(); });
                    }
                    return next();
                }).then(function (b) {
                    if (b) rememberBase(b);
                    return b;
                });
            }
        }
        return readyBasePromise;
    }

    function probeBase(base, timeoutMs) {
        return new Promise(function (resolve) {
            var done = false;
            var timer = setTimeout(function () { if (!done) { done = true; resolve(false); } }, timeoutMs || 3000);
            try {
                fetch(base + '/', { method: 'GET', mode: 'no-cors', cache: 'no-store' })
                    .then(function () { if (!done) { done = true; clearTimeout(timer); resolve(true); } })
                    .catch(function () { if (!done) { done = true; clearTimeout(timer); resolve(false); } });
            } catch (e) {
                if (!done) { done = true; clearTimeout(timer); resolve(false); }
            }
        });
    }

    function getBases() {
        var list = [];
        try {
            var custom = localStorage.getItem('ziyit_api_base');
            if (custom) list.push(String(custom).replace(/\/+$/, ''));
        } catch (e) {}
        var cookie = getBaseCookie();
        if (cookie && list.indexOf(cookie) === -1) list.push(cookie);
        for (var i = 0; i < loadedBases.length; i++) {
            if (list.indexOf(loadedBases[i]) === -1) list.push(loadedBases[i]);
        }
        if (list.indexOf(DEFAULT_BASE) === -1) list.push(DEFAULT_BASE);
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
        clearBaseCookie();
    }

    function currentBase() {
        if (resolvedBase) return resolvedBase;
        var bases = getBases();
        return bases[0] || DEFAULT_BASE;
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
        var timer = setTimeout(function () { ctrl.abort(); }, REQUEST_TIMEOUT_MS);
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
        if (!isBackendUrl(url)) return Promise.resolve(url);
        return fetch(url, { headers: { 'ngrok-skip-browser-warning': '1' } }).then(function (res) {
            if (!res.ok) throw new Error('图片加载失败(' + res.status + ')');
            return res.blob();
        }).then(function (blob) {
            return URL.createObjectURL(blob);
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

     
    function submitMod(payload) {
        return post('/mods/submit', payload);
    }

    function sendVerifyEmail() {
        return post('/email/send-verify', {});
    }

    function downloadMod(modId) {
        var token = getToken();
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

     
    function adminPromoteUser(userId, type) {
        return post('/admin/users/' + userId + '/promote', { type: type });
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
        var base = currentBase();
        function doSync(retried) {
            return fetchWithTimeout(base + '/guide/auth/sync', {
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
        var base = currentBase();
        return fetchWithTimeout(base + '/guide/chat', {
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
        var base = currentBase();
        return fetch(base + '/guide/chat/stream', {
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
        var base = currentBase();
        return fetchWithTimeout(base + path, options).then(function (res) {
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
        var base = currentBase();
        return fetchWithTimeout(base + '/auth/user-type', {
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
        var base = currentBase();
        var token = getToken();
        return fetchWithTimeout(base + backroomsPrefix(type) + '/' + encodeURIComponent(id), {
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

     
    function backroomsDownloadStandard() {
        var base = currentBase();
        return fetchWithTimeout(base + '/backrooms/normal-levels/slyq.md')
            .then(function (r) {
                if (!r.ok) { var e = new Error('下载失败 ' + r.status); e.status = r.status; throw e; }
                return r.blob();
            })
            .then(function (blob) {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = '层级审核标准.md';
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(a.href);
            });
    }

     
    function backroomsBase() {
        return currentBase();
    }

     
     
    function backroomsOpenLevel(id) {
        return backendReady().then(function () {
            var base = currentBase();
            var token = getToken();
            return fetchWithTimeout(base + '/backrooms/levels/' + encodeURIComponent(id), {
                headers: {
                    'ngrok-skip-browser-warning': '1',
                    'Authorization': token ? 'Bearer ' + token : ''
                }
            });
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

    window.ZIYIT_API = {
        BASE: DEFAULT_BASE,
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
        submitMod: submitMod,
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
        backroomsBase: backroomsBase,
        backroomsOpenLevel: backroomsOpenLevel,
        backroomsPrefix: backroomsPrefix,
        backroomsTypeList: backroomsTypeList,
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
