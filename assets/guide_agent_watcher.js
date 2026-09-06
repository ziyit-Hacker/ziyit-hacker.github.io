

(function () {
    'use strict';
    if (!window.ZIYIT_API) return;
     
    if (/admin\.html/i.test(location.pathname)) return;
    if (/guide\.html/i.test(location.pathname)) return;

    var POLL_MS = 10000;
    var DEFAULT_BASE = 'https://willian-unheady-rawly.ngrok-free.dev';
    var notifiedKey = 'ziyit_guide_notified';   
    var pendingKey = 'ziyit_guide_pending';     
    var notified = {};
    var guideTimer = null, chatTimer = null;
    var guideStopped = false, chatStopped = false;

    try {
        var saved = JSON.parse(localStorage.getItem(notifiedKey) || '[]');
        saved.forEach(function (sid) { if (sid) notified[sid] = true; });
    } catch (e) {}

    function saveNotified() {
        var arr = Object.keys(notified);
        if (arr.length > 100) arr = arr.slice(-100);
        try { localStorage.setItem(notifiedKey, JSON.stringify(arr)); } catch (e) {}
    }

    function addPending(m) {
        if (!m || !m.sessionId) return;
        try {
            var arr = JSON.parse(localStorage.getItem(pendingKey) || '[]');
            arr.push({
                sid: m.sessionId,
                user: m.fromUsername || '',
                userId: m.fromUserId,
                preview: (m.content || '').slice(0, 200),
                ts: m.ts || new Date().toISOString()
            });
            if (arr.length > 50) arr = arr.slice(-50);
            localStorage.setItem(pendingKey, JSON.stringify(arr));
        } catch (e) {}
    }

    function getToken() {
        try {
            if (window.ZIYIT_API && window.ZIYIT_API.getToken) return window.ZIYIT_API.getToken();
            return localStorage.getItem('authToken') || '';
        } catch (e) { return ''; }
    }

     
    function api(path, method, body) {
        var bases = [];
        try { if (window.ZIYIT_API && window.ZIYIT_API.getBases) bases = window.ZIYIT_API.getBases(); } catch (e) {}
        var base = (bases && bases.length && bases[0]) || DEFAULT_BASE;
        var token = getToken();
        var opts = {
            method: method || 'GET',
            headers: { 'ngrok-skip-browser-warning': '1' }
        };
        if (token) opts.headers['Authorization'] = 'Bearer ' + token;
        if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
        return fetch(base + path, opts).then(function (res) {
            return res.json().catch(function () { return null; }).then(function (data) {
                if (!res.ok) {
                    var err = new Error((data && data.detail) || ('请求失败 ' + res.status));
                    err.status = res.status;
                    err.data = data;
                    throw err;
                }
                return data;
            });
        });
    }

     
    function adminUrl() {
        var p = location.pathname;
        var dir = p.substring(0, p.lastIndexOf('/') + 1);
        var up = (dir.match(/\//g) || []).length - 1;
        var prefix = '';
        for (var i = 0; i < up; i++) prefix += '../';
        return prefix + 'music/admin.html';
    }

    function escHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

     
    var WRAP_CSS = 'position:fixed;right:16px;bottom:128px;z-index:2147483000;display:flex;flex-direction:column;'
        + 'gap:8px;width:320px;max-width:calc(100vw - 32px);';
    var CARD_CSS = 'position:relative;background:var(--ziyit-bg-card,#1f2229);color:var(--ziyit-text-primary,#f2f3f5);'
        + 'border:1px solid var(--ziyit-border,#3a3f48);border-left:4px solid var(--ziyit-warning,#f3a707);'
        + 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35);padding:12px 14px;font-size:13px;line-height:1.6;'
        + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-sizing:border-box;';

    function getWrap() {
        var w = document.getElementById('ziyit-admin-notify');
        if (!w) {
            w = document.createElement('div');
            w.id = 'ziyit-admin-notify';
            w.setAttribute('style', WRAP_CSS);
            document.body.appendChild(w);
        }
        return w;
    }

     
    function showNotify(opts) {
        var wrap = getWrap();
        var card = document.createElement('div');
        card.className = 'ziyit-notify-card';
        card.setAttribute('style', CARD_CSS + (opts.accent ? ('border-left-color:' + opts.accent + ';') : ''));
        var userHtml = opts.user ? '<div style="color:var(--ziyit-warning,#f3a707);margin-bottom:2px;">' + escHtml(opts.user) + '</div>' : '';
        var previewHtml = opts.preview ? '<div style="color:var(--ziyit-text-secondary,#bbb);margin-bottom:10px;max-height:60px;overflow:hidden;word-break:break-all;">' + escHtml(opts.preview) + '</div>' : '';
        var linkHtml = opts.href ? '<a href="' + opts.href + '" style="display:block;text-align:center;background:var(--ziyit-primary,#0078d4);color:#fff;text-decoration:none;padding:8px 0;border-radius:6px;font-weight:600;">' + (opts.hrefText || '前往处理 →') + '</a>' : '';
        card.innerHTML =
            '<div style="display:flex;justify-content:space-between;align-items:center;font-weight:600;margin-bottom:6px;">'
            + '<span>' + (opts.icon || '�') + ' ' + escHtml(opts.title) + '</span>'
            + '<button type="button" data-gn-close style="background:none;border:none;color:var(--ziyit-text-secondary,#999);'
            + 'font-size:15px;cursor:pointer;padding:0 4px;line-height:1;">✕</button></div>'
            + userHtml + previewHtml + linkHtml;
        var close = card.querySelector('[data-gn-close]');
        if (close) close.addEventListener('click', function () { card.remove(); });
        wrap.appendChild(card);
        while (wrap.children.length > 4) wrap.removeChild(wrap.firstChild);
    }

     
    function showGuideCard(m, total) {
        var user = (m && (m.fromUsername || ('用户#' + (m.fromUserId != null ? m.fromUserId : '?')))) || '用户';
        var preview = (m && m.content) || '';
        if (preview.length > 80) preview = preview.slice(0, 80) + '…';
        showNotify({
            icon: '🛎️',
            title: '新人工客服会话',
            user: '用户：' + user,
            preview: preview + (total > 1 ? '（还有 ' + (total - 1) + ' 个新会话）' : ''),
            href: adminUrl() + '#guide-console',
            hrefText: '前往后台处理 →'
        });
    }

     
    var CHAT_COOKIE_MAX = 40;
    var CHAT_COOKIE_BYTES = 3500;
    function chatGetCookie(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) {
            try { return JSON.parse(decodeURIComponent(parts.pop().split(';').shift())); } catch (e) { return []; }
        }
        return [];
    }
    function chatSetCookie(name, arr) {
        arr = arr.slice();
        while (arr.length > CHAT_COOKIE_MAX) arr.shift();
        var s = JSON.stringify(arr);
        while (s.length > CHAT_COOKIE_BYTES && arr.length) { arr.shift(); s = JSON.stringify(arr); }
        var exp = new Date(Date.now() + 30 * 24 * 3600 * 1000).toUTCString();
        document.cookie = name + '=' + encodeURIComponent(s) + '; expires=' + exp + '; path=/';
    }

     
    function notifyAdminMsg(m) {
        if (!m || !m.content) return;
        var isBcast = !!m.broadcast;
        var from = m.fromUsername || (isBcast ? '系统' : ('用户#' + (m.fromUserId != null ? m.fromUserId : '?')));
        var preview = String(m.content);
        if (preview.length > 80) preview = preview.slice(0, 80) + '…';
        showNotify({
            icon: isBcast ? '📢' : '💬',
            title: isBcast ? '全局消息' : '管理员私聊',
            user: isBcast ? '系统广播' : ('来自：' + from),
            preview: preview,
            accent: isBcast ? '#4caf50' : '#0078d4',
            href: adminUrl() + '#admin-chat',
            hrefText: '前往后台查看 →'
        });
         
        var saved = chatGetCookie('recv_msgs');
        saved.push(m);
        chatSetCookie('recv_msgs', saved);
    }

     
    function pollAdminChat() {
        if (chatStopped) return;
        api('/admin/chat/inbox').then(function (data) {
            var msgs = (data && data.messages) || [];
            msgs.forEach(function (m) {
                m.mine = false;
                notifyAdminMsg(m);
            });
        }).catch(function (err) {
             
            if (err && (err.status === 401 || err.status === 403)) chatStopped = true;
        });
    }

     
    function pollGuide() {
        if (guideStopped) return;
        api('/guide/human/inbox').then(function (data) {
            var list = (data && data.messages) || [];
            var fresh = [];
            list.forEach(function (m) {
                if (!m || !m.sessionId) return;
                if (notified[m.sessionId]) return;
                notified[m.sessionId] = true;
                saveNotified();
                addPending(m);
                fresh.push(m);
            });
            if (fresh.length) showGuideCard(fresh[fresh.length - 1], fresh.length);
        }).catch(function (err) {
             
            if (err && (err.status === 401 || err.status === 403)) guideStopped = true;
        });
    }

     
     
    function start() {
        if (!getToken()) return;
        api('/admin/me').then(function (me) {
            if (!me || me.level == null) return Promise.reject(new Error('not admin'));
             
            pollAdminChat();
            chatTimer = setInterval(pollAdminChat, POLL_MS);
             
            return api('/guide/auth/sync', 'POST', { token: getToken() }).catch(function () { return null; });
        }).then(function () {
             
            pollGuide();
            guideTimer = setInterval(pollGuide, POLL_MS);
        }).catch(function () {   });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 800); });
    } else {
        setTimeout(start, 800);
    }
})();
