/**
 * 前端 XSS 防护规范 + 参考实现
 * --------------------------------
 * 核心原则：**不可信数据永远只当文本，不当 HTML**。
 *
 * 1. 默认写法：`el.textContent = data` / `el.setAttribute(...)` / `dataset`
 *    —— 绝对禁止 `innerHTML = 用户数据`，包括模板字符串拼接。
 * 2. 必须渲染富文本时：先 `sanitizeHtml()`（白名单）再赋给 innerHTML，
 *    或使用 DOMPurify（推荐 `DOMPurify.sanitize(html, {USE_PROFILES:{html:true}})`）。
 * 3. URL：只用 `safeUrl()` 过滤后的值赋给 href/src；禁止 javascript:/data:text/html。
 * 4. 事件：用 addEventListener 绑定，禁止把字符串拼进 onclick/onerror 等属性。
 * 5. 后端返回的 JSON 字段（昵称、评论、工单、聊天内容）一律视为不可信，
 *    即使后端已清洗，前端仍要按文本渲染（双保险）。
 * 6. 模板引擎 / Markdown：marked 等必须先转义再解析，或解析后统一过 DOMPurify。
 * 7. 不要在页面里使用 `eval` / `new Function` / `document.write`。
 * 8. 富文本粘贴框：监听 paste 事件，只取 `text/plain`。
 */
(function (global) {
  'use strict';

  var ALLOWED_TAGS = {
    B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, DEL: 1, P: 1, BR: 1, HR: 1,
    UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, CODE: 1, PRE: 1, SPAN: 1, DIV: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, A: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TR: 1, TH: 1, TD: 1
  };
  var ALLOWED_ATTRS = { A: ['href', 'title', 'target', 'rel'] };
  var DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|data)\s*:/i;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** 安全设置纯文本（推荐所有动态内容都用它） */
  function setText(el, value) {
    if (!el) return el;
    el.textContent = value == null ? '' : String(value);
    return el;
  }

  /** URL 白名单：只允许 http/https/mailto 与站内相对路径 */
  function safeUrl(url) {
    var u = String(url == null ? '' : url).trim();
    if (!u) return '';
    if (DANGEROUS_PROTOCOL.test(u)) return '';
    if (/^(https?:|mailto:)/i.test(u) || u.charAt(0) === '/' ||
        u.charAt(0) === '#' || u.charAt(0) === '?') {
      return u;
    }
    return '';
  }

  function setSafeHref(el, url) {
    if (!el) return el;
    var safe = safeUrl(url);
    if (safe) {
      el.setAttribute('href', safe);
      el.setAttribute('rel', 'noopener noreferrer');
    } else {
      el.removeAttribute('href');
    }
    return el;
  }

  /** 白名单清洗 HTML 片段（无法加载 DOMPurify 时的兜底） */
  function sanitizeHtml(html) {
    var doc = new DOMParser().parseFromString('<div>' + String(html == null ? '' : html) + '</div>', 'text/html');
    var root = doc.body.firstChild;
    if (!root) return '';
    var walk = function (node) {
      var child = node.firstChild;
      while (child) {
        var next = child.nextSibling;
        if (child.nodeType === 3) {
          // 文本节点保留
        } else if (child.nodeType === 1) {
          var tag = child.tagName;
          if (!ALLOWED_TAGS[tag]) {
            // 危险 / 未知标签：script/style 整段丢弃，其它标签脱壳保留文本
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' ||
                tag === 'OBJECT' || tag === 'EMBED' || tag === 'TEMPLATE') {
              node.removeChild(child);
            } else {
              while (child.firstChild) node.insertBefore(child.firstChild, child);
              node.removeChild(child);
            }
            child = next;
            continue;
          }
          var allowed = ALLOWED_ATTRS[tag] || [];
          Array.prototype.slice.call(child.attributes).forEach(function (attr) {
            var name = attr.name.toLowerCase();
            if (allowed.indexOf(name) < 0) {
              child.removeAttribute(attr.name);
              return;
            }
            if (name === 'href' && !safeUrl(attr.value)) child.removeAttribute('href');
            if (name === 'target') child.setAttribute('target', '_blank');
            if (name === 'rel') child.setAttribute('rel', 'noopener noreferrer');
          });
          if (tag === 'A' && child.getAttribute('href')) {
            child.setAttribute('rel', 'noopener noreferrer');
          }
          walk(child);
        } else {
          node.removeChild(child);
        }
        child = next;
      }
    };
    walk(root);
    return root.innerHTML;
  }

  /** 必须渲染富文本时使用：清洗后再赋值 */
  function setRichHtml(el, html) {
    if (!el) return el;
    el.innerHTML = sanitizeHtml(html);
    return el;
  }

  /** 从 Event 里安全取纯文本（粘贴 / 拖拽） */
  function clipboardText(evt) {
    try {
      return (evt.clipboardData || global.clipboardData).getData('text/plain') || '';
    } catch (e) {
      return '';
    }
  }

  global.XssGuard = {
    escapeHtml: escapeHtml,
    setText: setText,
    setRichHtml: setRichHtml,
    setSafeHref: setSafeHref,
    safeUrl: safeUrl,
    sanitizeHtml: sanitizeHtml,
    clipboardText: clipboardText
  };
})(typeof window !== 'undefined' ? window : globalThis);
