(function () {
    var DEFAULT_BASE = 'https://willian-unheady-rawly.ngrok-free.dev';
    // 请求超时：防止后端无响应时按钮永久卡在"XX中"状态
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

    // 把后端错误 detail 规范为可读文本（可能是字符串、对象或数组，避免显示 [object Object]）
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

    // 串行化自动重登：并发 401（页面加载时轮询/接口同时失效）只发一次 /auth/login，
    // 其余请求复用同一个结果，避免并发登录触发后端 IP 限流（429）导致全部重登失败
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

    // 未授权（401）回调：token 失效且无凭据可重登时触发，页面可据此跳转登录页
    // 防重复：同一页面只触发一次，避免轮询在 token 清除后每 3~5 秒反复弹"登录已过期"
    var unauthorizedFired = false;
    function handleUnauthorized() {
        if (unauthorizedFired) return;
        unauthorizedFired = true;
        // 诊断信息（控制台可见，便于排查为何未自动重登）：
        // 无凭据=没勾"记住我"或 Cookie 丢失，无法自动重登；有凭据=重登请求失败（可能限流）
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
                // withMeta 时附带 HTTP 响应头（如 Date）供调用方读取服务器时间
                return withMeta ? { data: data, date: res.headers.get('date') } : data;
            });
        }).catch(function (err) {
            if (err && err.status) {
                if (err.status === 401 && !retried && path.indexOf('/auth/login') !== 0 && getCredentials()) {
                    return loginWithCredentials().then(function () {
                        return request(path, options, 0, true, withMeta);
                    }, function (loginErr) {
                        // 自动重登被限流（429）：Token 本身可能仍有效，不清除，直接透传 429
                        if (loginErr && loginErr.status === 429) throw loginErr;
                        // 凭据已失效（如密码被修改）：清理无效凭据与 token，避免误判登录态
                        clearToken();
                        handleUnauthorized();
                        throw err;
                    });
                }
                if (err.status === 401 && !retried && !getCredentials()) {
                    // 无凭据且 token 无效：清除残留的无效 token（旧 Cookie）
                    clearToken();
                    handleUnauthorized();
                }
                throw err;
            }
            // 网络错误（无状态码）：优先切换下一个备选地址
            if (index + 1 < bases.length) return request(path, options, index + 1, retried, withMeta);
            // 已是最后一个地址：网络抖动时对同一地址再重试两次
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

    function register(username, email, md5Password) {
        return post('/auth/register', { username: username, email: email, password: md5Password });
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

    function getMods() {
        return request('/mods');
    }

    function getDlc() {
        return request('/dlc');
    }

    function getFreeMods() {
        return request('/mods/free');
    }

    // MOD 作者自助提交 MOD（作者由后端根据 Token 识别）
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

    function getIpLocation(ip) {
        return request('/ip/' + encodeURIComponent(ip) + '/location');
    }

    // 将后端返回的归属地数据解析为「国家 省 市 区」完整文本（兼容各种字段命名）
    function formatIpLocation(d) {
        if (d == null) return '未知';
        if (typeof d === 'string') return d || '未知';
        // 完整地址类字段，可能是字符串或对象（优先 addr/org 等后端聚合好的完整文本）
        var raw = d.raw && typeof d.raw === 'object' ? d.raw : null;
        var full = d.location || d.address || d.formatted_address || d.detail || d.full_location
            || d.addr || d.org || (raw && (raw.addr || raw.org || raw.address || raw.location));
        if (typeof full === 'string') return full || '未知';
        if (full && typeof full === 'object') return formatIpLocation(full);
        // 嵌套包装
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

    // durationMinutes 可选：传分钟数 = 定时封禁；不传/0 = 永久封禁
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

    // 查看用户拥有的 DLC（releaseControlData.mods 详情）
    function adminGetUserDlc(userId) {
        return request('/admin/users/' + userId + '/dlc');
    }

    // 授予 DLC，expireAt 可选（ISO 字符串，不传=永久）
    function adminGrantDlc(userId, modId, expireAt) {
        var body = expireAt ? { modId: modId, expireAt: expireAt } : { modId: modId };
        return post('/admin/users/' + userId + '/dlc', body);
    }

    // 撤销 DLC
    function adminRevokeDlc(userId, modId) {
        return request('/admin/users/' + userId + '/dlc/' + modId, { method: 'DELETE' });
    }

    // ==================== 管理员权限体系（后端 admin_list.json + 分级） ====================

    // 当前管理员信息：等级 level(1-4)/类型/人机验证额度
    function adminMe() {
        return request('/admin/me');
    }

    // 管理员列表（后端按等级过滤可见性：各等级仅见自己等级及以下）
    function adminListAdmins() {
        return request('/admin/admins');
    }

    // 添加管理员（仅 4级）：userId + level(1-3)，鉴权走 JWT，无需密码
    function adminAddAdmin(userId, level) {
        return post('/admin/admins', { userId: userId, level: level });
    }

    // 升级/降级管理员（仅 4级）：userId + level，鉴权走 JWT，无需密码
    function adminUpdateAdmin(userId, level) {
        return put('/admin/admins/' + userId, { level: level });
    }

    // 撤销管理员（仅 4级）：userId，鉴权走 JWT，无需密码
    function adminRemoveAdmin(userId) {
        return request('/admin/admins/' + userId, { method: 'DELETE' });
    }

    // 升级用户为管理员(type=admin)或 VIP(type=vip)（仅 4级）
    function adminPromoteUser(userId, type) {
        return post('/admin/users/' + userId + '/promote', { type: type });
    }

    // 后室成员列表（2级+）：{ Username[], Permission[], Email[] }
    function adminListBackroomsMembers() {
        return request('/admin/backrooms/members');
    }

    // 编辑后室成员类型（3级+）：userId + permission("Admin"/"Member")，Adminstrator 不可改
    function adminUpdateBackroomsMember(userId, permission) {
        return put('/admin/backrooms/members', { userId: userId, permission: permission });
    }

    // 在线用户列表（1级+）
    function adminListOnline() {
        return request('/admin/online');
    }

    // ==================== 管理员私聊 & 全局消息 ====================

    // 私聊发送（任意管理员；仅可发给可见范围内管理员，每IP每分钟10条，超限返回429）
    function adminChatSend(toUserId, content) {
        return post('/admin/chat/send', { toUserId: toUserId, content: content });
    }

    // 私聊收件箱（读后即删，返回所有未读消息；广播消息带 broadcast:true）
    function adminChatInbox() {
        return request('/admin/chat/inbox');
    }

    // 全局消息广播（2级→1级、3级→1,2级、4级→1,2,3级；1级无权限返回403）
    function adminChatBroadcast(content) {
        return post('/admin/chat/broadcast', { content: content });
    }

    // ==================== 在线客服 /guide ====================

    // 登录态同步。注意：不能带 credentials:'include' —— 后端 CORS 未开启
    // Access-Control-Allow-Credentials（Allow-Origin 为 *），带了会被浏览器拦截报
    // "Failed to fetch"（服务器日志只有 OPTIONS 200、看不到真实 POST）。
    // 后端 /guide/human/* 等接口认证读取 Authorization: Bearer 头，不依赖此 Cookie。
    // 401 时自动读取 Cookie 凭据调 /auth/login 刷新 Token 并重试一次（与其他页面一致）。
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
                        // 透传真实失败原因：429=登录限流，其余=凭据无效（抛原始 401）
                        throw loginErr || err;
                    });
                }
                throw err;
            });
        }
        return doSync(false);
    }

    // 发送消息（核心：AI 回答或转人工；429 时 err.retryAfter 携带 Retry-After 秒数）
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

    // 会话详情（含消息列表；人工同步用，waiting_human/human 状态下前端每 2 秒轮询）
    function guideSession() {
        return request('/guide/session');
    }

    // 限流状态（每秒轮询：remaining / resetIn / limit）
    function guideStatus() {
        return request('/guide/status');
    }

    // 客服：转人工收件箱（读后即删，需轮询）
    function guideHumanInbox() {
        return request('/guide/human/inbox');
    }

    // 客服：接受会话
    function guideHumanAccept(sessionId) {
        return post('/guide/human/accept', { sessionId: sessionId });
    }

    // 客服：回复会话
    function guideHumanReply(sessionId, content) {
        return post('/guide/human/reply', { sessionId: sessionId, content: content });
    }

    // 客服：指定会话详情
    function guideHumanSession(sessionId) {
        return request('/guide/human/session/' + encodeURIComponent(sessionId));
    }

    // 客服：客服管理员名单（仅超级管理员可用；返回 {agents:[{userId,username,online,addedAt}],total}）
    function guideHumanAgents() {
        return request('/guide/human/agents');
    }

    // 客服：添加客服管理员（仅超级管理员 Token 可用；400=非管理员/已在名单，404=用户不存在）
    function guideHumanAgentAdd(userId) {
        return post('/guide/human/agents', { userId: userId });
    }

    // 客服：移除客服管理员（仅超级管理员 Token 可用；404=不在名单）
    function guideHumanAgentRemove(userId) {
        return request('/guide/human/agents/' + encodeURIComponent(userId), { method: 'DELETE' });
    }

    // 用户：结束自己的对话（不传 sessionId 时后端默认结束当前活动会话）
    // 403=无权结束该会话，404=当前没有进行中的会话，400=会话已结束
    function guideSessionClose(sessionId) {
        var body = {};
        if (sessionId) body.sessionId = sessionId;
        return post('/guide/session/close', body);
    }

    // 客服：结束已接管的人工会话（仅被分配客服/超管；403=无权，404=会话不存在，400=会话已结束）
    function guideHumanClose(sessionId) {
        return post('/guide/human/close', { sessionId: sessionId });
    }

    // 客服：提交离线确认令牌（URL 携带 guide_resolve 参数时由后台调用，成功后离线次数清零）
    function guideHumanOfflineResolve(token) {
        return post('/guide/human/offline-resolve', { token: token });
    }

    // ==================== 封禁申诉 /guide/appeal ====================
    // 带自定义 Token 的请求（申诉使用 appealToken，非登录态，Authorization: Bearer <token>）
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

    // 获取申诉令牌：被封禁账号用 用户名 + base64(md5(密码)) 换取 appealToken
    function appealLogin(username, passwordB64) {
        return authFetch('/guide/appeal', null, {
            method: 'POST',
            body: JSON.stringify({ username: username, password: passwordB64 })
        });
    }

    // 申诉会话轮询（带 appealToken），返回 { sessionId, status, banInfo, messages: [...] }
    function appealSession(token) {
        return authFetch('/guide/appeal/session', token, { method: 'GET' });
    }

    // 发送申诉消息（带 appealToken）
    function appealReply(token, content) {
        return authFetch('/guide/appeal/reply', token, {
            method: 'POST',
            body: JSON.stringify({ content: content })
        });
    }

    // 登录用户 JWT 查询自身在 user.json 的类型。
    // 兼容两种返回格式：JSON（如 {"userType":"超级管理员",...}）取 userType 字段；
    // 纯文本中文（如"管理员"）直接使用。
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

    // ==================== Backrooms 层级管理系统 ====================
    function backroomsList() {
        return request('/backrooms/levels');
    }

    function backroomsView(id) {
        return request('/backrooms/levels/' + encodeURIComponent(id));
    }

    // 提交层级：levelId(Level-xxx 必填) + name(层级名称 必填) + HTML 文件
    function backroomsSubmit(levelId, name, file) {
        var fd = new FormData();
        fd.append('levelId', levelId);
        fd.append('name', name);
        fd.append('file', file);
        return request('/backrooms/levels', { method: 'POST', body: fd }); // 浏览器自动带 multipart 边界
    }

    // 更新层级：可选 name（传了则更新名称，不传保留原名）
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

    // 下载审核标准（保存为"层级审核标准.md"）
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

    // 后端层级访问基础地址（查看稿件 / 列表跳转用）
    function backroomsBase() {
        return (localStorage.getItem('ziyit_api_base') || DEFAULT_BASE).replace(/\/$/, '');
    }

    // 打开层级：带 Token 拉取 HTML 后以 Blob 临时地址在新标签打开。
    // 避免直接跳转后端域名造成的 Cookie 隔离（无法登录/评分）；Blob 基于当前前端域名，登录态与评分绑定均可用。
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
        getMods: getMods,
        getDlc: getDlc,
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
        backroomsOpenLevel: backroomsOpenLevel
    };
})();
