/* ============================================================
   ZIYIT 主题切换（DESIGN.md §4.14）
   悬浮按钮循环切换：浅色 → 深色 → 跟随系统 → 浅色
   偏好以 cookie（ziyit-theme）持久化，有效期 1 年
   ============================================================ */
(function () {
    'use strict';

    var MEDIA = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function resolveTheme(pref) {
        return (pref === 'dark' || (pref === 'auto' && MEDIA && MEDIA.matches)) ? 'dark' : 'light';
    }

    function setCookie(name, value, days) {
        var d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/';
    }

    function applyTheme(pref) {
        var root = document.documentElement;
        root.setAttribute('data-theme', resolveTheme(pref));
        root.setAttribute('data-theme-pref', pref);
        updateBtn(pref, root.getAttribute('data-theme'));
    }

    function setTheme(pref) {
        setCookie('ziyit-theme', pref, 365);
        applyTheme(pref);
    }

    var LABELS = { light: '浅色', dark: '深色', auto: '跟随系统' };
    var ICONS = {
        light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
        dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
    };

    function updateBtn(pref, resolved) {
        var b = document.getElementById('ziyit-theme-toggle');
        if (!b) return;
        b.innerHTML = ICONS[pref] || ICONS.auto;
        var label = LABELS[pref] || '跟随系统';
        b.title = '主题：' + label + '（点击切换）';
        b.setAttribute('aria-label', '切换主题，当前' + label);
    }

    function buildBtn() {
        if (document.getElementById('ziyit-theme-toggle')) return;
        var b = document.createElement('button');
        b.id = 'ziyit-theme-toggle';
        b.type = 'button';
        b.addEventListener('click', function () {
            var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
            var next = pref === 'light' ? 'dark' : (pref === 'dark' ? 'auto' : 'light');
            setTheme(next);
        });
        document.body.appendChild(b);
        updateBtn(
            document.documentElement.getAttribute('data-theme-pref') || 'auto',
            document.documentElement.getAttribute('data-theme') || 'light'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildBtn);
    } else {
        buildBtn();
    }

    /* 跟随系统：系统主题变化时自动响应（仅 auto 偏好） */
    if (MEDIA) {
        MEDIA.addEventListener('change', function () {
            var pref = document.documentElement.getAttribute('data-theme-pref') || 'auto';
            if (pref === 'auto') applyTheme(pref);
        });
    }
})();

/* ============================================================
   导航栏：移动端汉堡菜单折叠（DESIGN.md §4.6）
   点击 ☰ 展开/收起 .site-nav-menu，默认收起
   ============================================================ */
(function () {
    'use strict';
    var toggle = document.querySelector('.site-nav-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
        var menu = document.querySelector('.site-nav-menu');
        if (menu) menu.classList.toggle('open');
    });
})();

/* ============================================================
   Toast 通知（DESIGN.md §4.9）：全站替代原生 alert
   通过覆盖 window.alert 实现，页面现有 alert(...) 调用自动生效
   样式随主题 token 变化；无 token 环境回退为深底白字
   ============================================================ */
(function () {
    'use strict';
    var CSS = '.ziyit-toast-wrap{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483001;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;max-width:90vw}.ziyit-toast{pointer-events:auto;background:var(--ziyit-bg-card,#1f2229);color:var(--ziyit-text-primary,#fff);border:1px solid var(--ziyit-border,#3a3f48);border-left:4px solid var(--ziyit-primary,#0078d4);padding:10px 18px;border-radius:8px;font-size:14px;line-height:1.5;box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;transform:translateY(-8px);transition:opacity .25s,transform .25s;max-width:60vw}.ziyit-toast.show{opacity:1;transform:translateY(0)}.ziyit-toast.hide{opacity:0;transform:translateY(-8px)}.ziyit-toast.success{border-left-color:var(--ziyit-success,#28a745)}.ziyit-toast.error{border-left-color:var(--ziyit-danger,#f25767)}.ziyit-toast.warning{border-left-color:var(--ziyit-warning,#f3a707)}';
    var style = document.createElement('style');
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);

    var wrap = null;
    function getWrap() {
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'ziyit-toast-wrap';
            document.body.appendChild(wrap);
        }
        return wrap;
    }
    function showToast(msg, type) {
        if (typeof msg === 'string' && msg.length > 200) msg = msg.slice(0, 200) + '…';
        var el = document.createElement('div');
        el.className = 'ziyit-toast ' + (type || 'info');
        el.textContent = msg == null ? '' : String(msg);
        getWrap().appendChild(el);
        requestAnimationFrame(function () { el.classList.add('show'); });
        setTimeout(function () {
            el.classList.remove('show');
            el.classList.add('hide');
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
        }, 3200);
    }
    function typeForText(s) {
        if (/失败|错误|不能|无法|禁止|无效|超时|请(先|重试|勿|选择)/.test(s)) return 'error';
        if (/成功|完成|已保存|已复制|已开启|已关闭|欢迎/.test(s)) return 'success';
        if (/注意|警告|提醒/.test(s)) return 'warning';
        return 'info';
    }
    window.alert = function (msg) { showToast(msg, typeForText(String(msg == null ? '' : msg))); };
    if (document.body) getWrap(); else document.addEventListener('DOMContentLoaded', getWrap);
})();

/* ============================================================
   站内搜索定位（search.html 站内搜索联动）
   URL 携带 ?zq=关键词 时：高亮正文首个匹配位置并平滑滚动到该处
   仅正文命中时 search.html 会附加该参数；纯标题命中不附加
   ============================================================ */
(function () {
    function getZq() {
        var m = /[?&]zq=([^&]*)/.exec(window.location.search);
        return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    }
    var kw = getZq();
    if (!kw) return;

    function locate() {
        var low = kw.toLowerCase();
        // 找到正文中首个包含关键词的文本节点
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: function (n) {
                var p = n.parentNode;
                if (!p || p.nodeType !== 1) return NodeFilter.FILTER_REJECT;
                var tag = p.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
                    return NodeFilter.FILTER_REJECT;
                }
                return n.nodeValue.toLowerCase().indexOf(low) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        var node = null;
        while (walker.nextNode()) { node = walker.currentNode; break; }
        if (!node) return;

        var idx = node.nodeValue.toLowerCase().indexOf(low);
        if (idx < 0) return;
        var range = document.createRange();
        range.setStart(node, idx);
        range.setEnd(node, idx + kw.length);
        var mark = document.createElement('mark');
        mark.style.background = 'var(--ziyit-warning, #f3a707)';
        mark.style.color = '#000';
        mark.style.padding = '0 2px';
        mark.style.borderRadius = '3px';
        try { range.surroundContents(mark); } catch (e) { }
        // 平滑滚动到内容出现位置，并短暂描边提示
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () {
            mark.style.outline = '2px solid var(--ziyit-warning, #f3a707)';
        }, 600);
        // 清理 URL 上的定位参数，避免刷新后重复定位
        try {
            history.replaceState(null, '', window.location.pathname + window.location.hash);
        } catch (e) { }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(locate, 60); });
    } else {
        setTimeout(locate, 60);
    }
})();

/* ============================================================
   在线客服：管理员全局新会话通知（watcher）动态加载
   所有页面自动生效；脚本内部自行判断管理员身份，非管理员零副作用。
   通过 currentScript 定位同目录下的 guide_agent_watcher.js
   ============================================================ */
(function () {
    'use strict';
    if (window.ZIYIT_GUIDE_WATCHER_LOADED) return;
    window.ZIYIT_GUIDE_WATCHER_LOADED = true;
    var cur = document.currentScript;
    if (!cur || !cur.src) return;
    var s = document.createElement('script');
    s.src = cur.src.replace(/ziyit-theme\.js[^/]*$/i, 'guide_agent_watcher.js');
    s.async = true;
    s.defer = true;
    (document.head || document.documentElement).appendChild(s);
})();

/* ============================================================
   在线客服：全站显眼浮动入口按钮（用户端）
   右下角胶囊按钮（🎧 在线客服），点击进入 guide.html
   后台 admin.html / 客服对话页 guide.html 自身不显示
   ============================================================ */
(function () {
    'use strict';
    if (window.ZIYIT_GUIDE_FAB_LOADED) return;
    if (/admin\.html/i.test(location.pathname)) return;
    if (/guide\.html/i.test(location.pathname)) return;
    window.ZIYIT_GUIDE_FAB_LOADED = true;

    // 当前页面相对根目录的深度，推导 guide.html 相对路径（兼容子路径部署）
    var p = location.pathname;
    var dir = p.substring(0, p.lastIndexOf('/') + 1);
    var up = (dir.match(/\//g) || []).length - 1;
    var prefix = '';
    for (var i = 0; i < up; i++) prefix += '../';
    var href = prefix + 'guide.html';

    var style = document.createElement('style');
    style.textContent =
        '#ziyit-guide-fab{position:fixed;right:18px;bottom:72px;z-index:2147482999;'
        + 'display:flex;align-items:center;gap:8px;height:46px;padding:0 18px;box-sizing:border-box;'
        + 'background:linear-gradient(135deg,var(--ziyit-primary,#0078d4),#005a9e);'
        + 'color:#fff;text-decoration:none;font-size:14px;font-weight:600;'
        + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
        + 'border-radius:23px;box-shadow:0 6px 20px rgba(0,0,0,.28);'
        + 'animation:ziyit-fab-pulse 2.4s ease-out infinite;transition:transform .2s;cursor:pointer;}'
        + '#ziyit-guide-fab:hover{transform:scale(1.06);}'
        + '#ziyit-guide-fab .ziyit-fab-ic{font-size:18px;line-height:1;}'
        + '@keyframes ziyit-fab-pulse{0%{box-shadow:0 0 0 0 rgba(0,120,212,.45);}'
        + '70%{box-shadow:0 0 0 14px rgba(0,120,212,0);}100%{box-shadow:0 0 0 0 rgba(0,120,212,0);}}';
    (document.head || document.documentElement).appendChild(style);

    var fab = document.createElement('a');
    fab.id = 'ziyit-guide-fab';
    fab.href = href;
    fab.title = '在线客服';
    fab.innerHTML = '<span class="ziyit-fab-ic">🎧</span><span>在线客服</span>';
    if (document.body) {
        document.body.appendChild(fab);
    } else {
        document.addEventListener('DOMContentLoaded', function () {
            (document.body || document.documentElement).appendChild(fab);
        });
    }
})();
