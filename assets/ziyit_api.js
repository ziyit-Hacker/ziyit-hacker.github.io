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

    function getMods() {
        return request('/mods');
    }

    function getDlc() {
        return request('/dlc');
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

     
    function backroomsList() {
        return request('/backrooms/levels');
    }

    function backroomsView(id) {
        return request('/backrooms/levels/' + encodeURIComponent(id));
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
