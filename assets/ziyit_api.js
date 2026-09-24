(function () {
    var DEFAULT_BASE = 'https://willian-unheady-rawly.ngrok-free.dev';
     
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

    function getBases() {
        var list = [];
        try {
            var custom = localStorage.getItem('ziyit_api_base');
            if (custom) list.push(custom);
        } catch (e) {}
        list.push(DEFAULT_BASE);
        return list;
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

    function getToken() {
        return getCookie('authToken') || localStorage.getItem('authToken') || '';
    }

    function setToken(token, remember) {
        var days = remember ? 60 : null;
        if (days) {
            setCookie('authToken', token, days);
        } else {
            setCookie('authToken', token, null);
        }
        localStorage.setItem('authToken', token);
    }

    function clearToken() {
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/ziyit/;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/ziyit;';
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
        localStorage.removeItem('authToken');
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

     
     
    var reloginPromise = null;
    function loginWithCredentials() {
        var cred = getCredentials();
        if (!cred) return Promise.reject(new Error('no credentials'));
        if (reloginPromise) return reloginPromise;
        reloginPromise = post('/auth/login', { username: cred.username, password: cred.password }).then(function (data) {
            var token = data.accessToken || data.access_token || data.token;
            if (!token) throw new Error('login failed');
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
        options = options || {};
        options.headers = options.headers || {};
        options.headers['ngrok-skip-browser-warning'] = '1';
        var token = getToken();
        if (token) {
            options.headers['Authorization'] = 'Bearer ' + token;
        }
        var bases = getBases();
        var index = baseIndex || 0;
        var base = bases[index];
        if (!base) base = DEFAULT_BASE;
        return fetchWithTimeout(base + path, options).then(function (res) {
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
                if (err.status === 401 && !retried && path.indexOf('/auth/login') !== 0 && getCredentials()) {
                    return loginWithCredentials().then(function () {
                        return request(path, options, 0, true, withMeta);
                    }, function (loginErr) {
                         
                        if (loginErr && loginErr.status === 429) throw loginErr;
                         
                        clearToken();
                        handleUnauthorized();
                        throw err;
                    });
                }
                if (err.status === 401 && !retried && !getCredentials()) {
                     
                    clearToken();
                    handleUnauthorized();
                }
                throw err;
            }
             
            if (index + 1 < bases.length) return request(path, options, index + 1, retried, withMeta);
             
            var netRetries = (options.__netRetries || 0) + 1;
            options.__netRetries = netRetries;
            if (netRetries <= 2) {
                return new Promise(function (resolve) { setTimeout(resolve, 300); }).then(function () {
                    return request(path, options, index, retried, withMeta);
                });
            }
            throw err;
        });
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

    function login(username, md5Password) {
        return post('/auth/login', { username: username, password: md5Password });
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

    // 头像：请求体 { avatar: "<图片ID>" }，传空串表示清除。
    // 图片 ID 必须是【当前用户自己上传过】的图片（64 位 hex），否则 403。
    // 回包带 avatar 与 avatarUrl；设置后所有文档上的头像会立刻同步。
    function updateAvatar(avatarId) {
        return put('/users/avatar', { avatar: avatarId || '' });
    }

    function getMods() {
        return request('/mods');
    }

    function getDlc() {
        return request('/dlc');
    }

    // 当前登录用户已拥有的 DLC（扩展包）清单 —— 服务端只认登录身份，不接受用户ID参数
    function myDlc() {
        return request('/dlc/mine');
    }

    function getFreeMods() {
        return request('/mods/free');
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
        var token = getToken();
        if (token) {
            return post('/auth/logout', {}).catch(function () {});
        }
        return Promise.resolve();
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
        var bases = getBases();
        var base = bases[0] || DEFAULT_BASE;
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
        var bases = getBases();
        var base = bases[0] || DEFAULT_BASE;
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

    // 流式对话：POST /guide/chat/stream（SSE）。
    // EventSource 只发 GET 且无法携带 Authorization 头，所以这里用 fetch + ReadableStream 手工读帧，
    // 每帧形如 `data: {json}\n\n`。onEvent 依次收到六类事件：
    //   status 进度提示（同时是心跳） / delta 增量片段 / reset 丢弃本轮已显示
    //   final  清洗后的完整正文（覆盖显示） / done 收尾元数据 / error 失败说明
    // 返回的 Promise 在流结束或失败时 settle（不 resolve 事件本身）。
    function guideChatStream(message, onEvent) {
        var token = getToken();
        var base = getBases()[0] || DEFAULT_BASE;
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
                // 还没开始推流就失败（如 401/403/429）：按普通错误抛出，
                // 调用方看到 404/405 说明该后端没有流式路由，可降级到非流式接口
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
                buf = frames.pop();      // 末段可能被切断，留到下一块再拼
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
        var base = getBases()[0] || DEFAULT_BASE;
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
        var bases = getBases();
        var base = bases[0] || DEFAULT_BASE;
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

    // ---- RC 文件加密：恢复密钥托管 / 云加密用量 ----
    function rcFiles() {
        return request('/rc/files');
    }

    // 查看某个文件的恢复密钥（需二次验证登录密码，md5Password 为 MD5 的 Base64）
    function rcRevealRecoveryKey(fileId, md5Password) {
        return post('/rc/files/' + encodeURIComponent(fileId) + '/recovery-key', { password: md5Password });
    }

    // 删除某条托管记录（同时销毁服务端保存的恢复密钥）
    function rcDeleteFile(fileId) {
        return request('/rc/files/' + encodeURIComponent(fileId), { method: 'DELETE' });
    }

    // RC 许可证密钥：查询当前登录用户名下密钥（含明文）
    function rcMyKeys() {
        return request('/rc/keys/mine');
    }

    // 爱发电自助查单：服务端主动拉最近订单，补发 VIP / RC 密钥 / DLC 扩展包
    function afdianSelfCheck() {
        return post('/afdian/self-check', {});
    }

    // ---- RC BUG 反馈 ----
    // 公开已知 BUG 列表：含提交者、状态枚举（statuses 按 statusCounts 计数）
    // 与 Markdown 正文；正文渲染前必须再过一次白名单净化
    function rcBugs() {
        return request('/rc/bugs');
    }

    // 提交反馈：需登录凭据，提交者由服务端从 Bearer token 解析，客户端不能自称身份
    function rcSubmitBug(payload) {
        return post('/rc/bugs', payload);
    }

    // 管理员视图：在公开字段基础上多带联系方式（contact）
    function adminRcBugs() {
        return request('/admin/rc/bugs');
    }

    // 管理员改状态：可选值取 /rc/bugs 回包的 statuses，不要在前端写死
    function adminRcBugStatus(bugId, status, note) {
        var body = { status: status };
        if (note) body.note = note;
        return request('/admin/rc/bugs/' + bugId, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    }

    // ---- Backrooms 文档系统：四类同构，接口前缀即类型 ----
    // 层级 levels / 实体 entities / 物品 objects / 现象 phenomena，全部走同一套路径规则，
    // 因此这里按 type 拼前缀，避免每类各写一份。既有层级专用函数保留以兼容旧页面。
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

    // 列表：层级回包同时带 levels 与 items（内容相同），其余三类只有 items；
    // 另带 total / type / typeLabel，分类名一律取回包值，前端不写死。
    function backroomsTypeList(type) {
        return request(backroomsPrefix(type));
    }

    // 元数据：多带 fileName / aiReview / advancedReview；不可见返回 404
    function backroomsTypeMeta(type, id) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(id) + '/meta');
    }

    // 正文（HTML）：非 approved 的稿件仅作者本人与管理员可见，且页面会被注入状态提示条
    function backroomsTypeView(type, id) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(id));
    }

    // 提交 / 修改：接口前缀即类型，表单不传 type。
    // ID 字段名：层级仍为 levelId（兼容既有前端），其余三类为 docId。
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

    // 管理员重写：下架 + 保留原文件 + 列表带 rew 标记（Lv.2+）
    function backroomsTypeRewrite(type, docId) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId) + '/rewrite', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
    }

    // 管理员删除：连同 versions/ 下的历史备份一并删除（Lv.2+）
    function backroomsTypeAdminDelete(type, docId) {
        return request(backroomsPrefix(type) + '/' + encodeURIComponent(docId) + '/admin', { method: 'DELETE' });
    }

    // 取正文并新窗口打开（内容为后端返回的完整 HTML，按原文渲染）
    function backroomsTypeOpen(type, id) {
        var base = (localStorage.getItem('ziyit_api_base') || DEFAULT_BASE).replace(/\/$/, '');
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
        var base = (localStorage.getItem('ziyit_api_base') || DEFAULT_BASE).replace(/\/$/, '');
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
        return (localStorage.getItem('ziyit_api_base') || DEFAULT_BASE).replace(/\/$/, '');
    }

     
     
    function backroomsOpenLevel(id) {
        var bases = getBases();
        var base = bases[0] || DEFAULT_BASE;
        var token = getToken();
        return fetchWithTimeout(base + '/backrooms/levels/' + encodeURIComponent(id), {
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

    window.ZIYIT_API = {
        BASE: DEFAULT_BASE,
        getBases: getBases,
        getToken: getToken,
        setToken: setToken,
        clearToken: clearToken,
        setCredentials: setCredentials,
        getCredentials: getCredentials,
        clearCredentials: clearCredentials,
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
        rcBugs: rcBugs,
        rcSubmitBug: rcSubmitBug,
        adminRcBugs: adminRcBugs,
        adminRcBugStatus: adminRcBugStatus,
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
