/* 后室页面 AI 入口（双模态：backrooms_terminal）
 *
 * 用法：在 backrooms/*.html 的 </body> 前引入
 *   <script src="../assets/backrooms_ai_entry.js"></script>
 *
 * 行为：右下角悬浮按钮 → 弹出 iframe 加载 ../guide.html?mode=backrooms_terminal&ref_doc=...
 *      ref_doc 取当前页面 slug（levels.html → levels；实体页取文件名），取不到则用页面标题
 */
(function () {
  'use strict';
  if (window.__BR_AI_ENTRY__) return;
  window.__BR_AI_ENTRY__ = 1;

  var CSS = [
    '.br-ai-fab{position:fixed;right:20px;bottom:24px;z-index:9998;display:flex;align-items:center;gap:8px;',
    '  padding:10px 16px;border-radius:999px;cursor:pointer;border:1px solid rgba(142,240,176,.5);',
    '  background:rgba(6,20,12,.92);color:#8ef0b0;font:13px/1.2 "Courier New",Consolas,monospace;',
    '  letter-spacing:1px;box-shadow:0 6px 24px rgba(0,0,0,.45);}',
    '.br-ai-fab:hover{background:rgba(10,34,20,.96);box-shadow:0 6px 28px rgba(0,255,120,.18);}',
    '.br-ai-fab::before{content:"●";color:#4ade80;animation:brAiBlink 1.4s infinite;}',
    '@keyframes brAiBlink{0%,100%{opacity:1}50%{opacity:.25}}',
    '.br-ai-mask{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);',
    '  display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;}',
    '.br-ai-box{width:min(680px,100%);height:min(80vh,760px);background:#04120a;border:1px solid rgba(142,240,176,.35);',
    '  border-radius:6px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(0,0,0,.6);}',
    '.br-ai-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;',
    '  font:12px/1.2 "Courier New",Consolas,monospace;letter-spacing:2px;color:#8ef0b0;',
    '  background:rgba(0,255,120,.06);border-bottom:1px solid rgba(142,240,176,.25);}',
    '.br-ai-close{background:transparent;border:1px solid rgba(142,240,176,.35);color:#8ef0b0;',
    '  font-size:16px;line-height:1;padding:2px 8px;border-radius:3px;cursor:pointer;}',
    '.br-ai-close:hover{background:rgba(255,80,80,.15);border-color:#f87171;color:#fca5a5;}',
    '.br-ai-frame{flex:1;width:100%;border:0;background:#04120a;}'
  ].join('\n');

  function injectStyle() {
    if (document.getElementById('br-ai-style')) return;
    var s = document.createElement('style');
    s.id = 'br-ai-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function pageSlug() {
    // 后端注入的文档标识优先（服务端渲染的文档页）
    if (window.__BR_DOC_ID__) return String(window.__BR_DOC_ID__).slice(0, 40);
    if (window.__BR_DOC_NAME__) return String(window.__BR_DOC_NAME__).slice(0, 40);
    var m = location.pathname.match(/\/backrooms\/([^\/]+?)(?:\.html)?$/i);
    var slug = m ? m[1] : '';
    if (!slug || slug === 'index') {
      slug = (document.title || '').replace(/\s*[-–—|｜].*$/, '').trim();
    }
    return (slug || 'list').slice(0, 40);
  }

  function guideUrl(slug) {
    var base = (window.__BR_AI_BASE__ || '').replace(/\/+$/, '');
    var path = '/guide.html?mode=backrooms_terminal&ref_doc=' + encodeURIComponent(slug);
    return base ? base + path : '../guide.html?mode=backrooms_terminal&ref_doc=' + encodeURIComponent(slug);
  }

  function isListPage() {
    var p = location.pathname.toLowerCase();
    return /(all-levels|levels|groups-list|entities\/index|index)\.html$/.test(p) || /\/backrooms\/?$/.test(p);
  }

  function openPanel() {
    if (document.querySelector('.br-ai-mask')) return;
    injectStyle();

    var mask = document.createElement('div');
    mask.className = 'br-ai-mask';
    mask.addEventListener('click', function (e) {
      if (e.target === mask) document.body.removeChild(mask);
    });

    var box = document.createElement('div');
    box.className = 'br-ai-box';

    var bar = document.createElement('div');
    bar.className = 'br-ai-bar';
    var label = document.createElement('span');
    label.textContent = 'M.E.G. 情报终端 · ' + pageSlug();
    var close = document.createElement('button');
    close.className = 'br-ai-close';
    close.type = 'button';
    close.textContent = '×';
    close.title = '关闭终端';
    close.addEventListener('click', function () { document.body.removeChild(mask); });

    var frame = document.createElement('iframe');
    frame.className = 'br-ai-frame';
    frame.setAttribute('allow', 'clipboard-write');
    frame.src = guideUrl(pageSlug());

    bar.appendChild(label);
    bar.appendChild(close);
    box.appendChild(bar);
    box.appendChild(frame);
    mask.appendChild(box);
    document.body.appendChild(mask);

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.querySelector('.br-ai-mask')) {
        var m = document.querySelector('.br-ai-mask');
        if (m && m.parentNode) m.parentNode.removeChild(m);
        document.removeEventListener('keydown', esc);
      }
    });
  }

  function mount() {
    injectStyle();
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'br-ai-fab';
    btn.textContent = isListPage() ? 'AI 解析当前列表' : '解析本档案';
    btn.title = '打开 M.E.G. 情报终端（后室专属 AI）';
    btn.addEventListener('click', openPanel);
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
