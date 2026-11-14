(function () {
  'use strict';

  var SELF = document.currentScript ? document.currentScript.src : '';
  var ROOT = '/';
  try { ROOT = new URL('../', SELF || location.href).href; } catch (e) {}

  var TIERS = [
    ['1', '违法 / 极端内容', '涉政、涉恐、涉黄违法等，最高优先级'],
    ['2', '系统级攻击', '注入、恶意脚本、钓鱼链接、漏洞利用'],
    ['3', '社区规则', '辱骂引战、广告刷屏、侵权、泄露隐私'],
    ['4', '低优先级', '错别字、排版问题、轻微不适']
  ];
  var CATS = ['违法/极端', '色情低俗', '暴力血腥', '仇恨歧视', '广告刷屏', '诈骗/钓鱼', '侵犯隐私', '其它'];

  var CSS = [
    '.zr-mask{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45);backdrop-filter:blur(2px)}',
    '.zr-mask[hidden]{display:none}',
    '.zr-box{width:100%;max-width:460px;max-height:90vh;overflow:auto;background:var(--ziyit-bg-card,#fff);color:var(--ziyit-text,#222);border:1px solid var(--ziyit-border,#ddd);border-radius:12px;box-shadow:0 18px 50px rgba(0,0,0,.28);padding:18px 20px;font:14px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}',
    '.zr-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px}',
    '.zr-head h3{margin:0;font-size:17px}',
    '.zr-x{border:0;background:transparent;color:var(--ziyit-text-secondary,#666);font-size:22px;line-height:1;cursor:pointer;padding:0 4px}',
    '.zr-sub{margin:0 0 14px;color:var(--ziyit-text-secondary,#666);font-size:12px;word-break:break-all}',
    '.zr-field{margin-bottom:12px}',
    '.zr-field label{display:block;margin-bottom:5px;font-size:12px;color:var(--ziyit-text-secondary,#666)}',
    '.zr-field select,.zr-field textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--ziyit-border,#ccc);border-radius:8px;background:var(--ziyit-bg,#fafafa);color:var(--ziyit-text,#222);font:13px/1.5 inherit;resize:vertical}',
    '.zr-field select:focus,.zr-field textarea:focus{outline:2px solid var(--ziyit-primary,#3b82f6);outline-offset:1px}',
    '.zr-hint{display:block;margin-top:4px;font-size:11px;color:var(--ziyit-text-secondary,#888)}',
    '.zr-status{min-height:18px;margin:2px 0 10px;font-size:12px;color:var(--ziyit-text-secondary,#666)}',
    '.zr-status.err{color:#d33}',
    '.zr-status a{color:var(--ziyit-primary,#3b82f6)}',
    '.zr-actions{display:flex;justify-content:flex-end;gap:10px}',
    '.zr-btn{border:1px solid var(--ziyit-border,#ccc);background:transparent;color:var(--ziyit-text,#222);border-radius:8px;padding:7px 16px;font-size:13px;cursor:pointer}',
    '.zr-btn.primary{background:var(--ziyit-primary,#3b82f6);border-color:transparent;color:#fff}',
    '.zr-btn:disabled{opacity:.55;cursor:not-allowed}'
  ].join('');

  var el = {};
  var cur = null;
  var busy = false;

  function h(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function build() {
    if (el.mask) return;
    var style = document.createElement('style');
    style.id = 'ziyit-report-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    var tierOpts = TIERS.map(function (t) {
      return '<option value="' + t[0] + '">' + h(t[1]) + '</option>';
    }).join('');
    var catOpts = CATS.map(function (c) {
      return '<option value="' + h(c) + '">' + h(c) + '</option>';
    }).join('');

    var box = document.createElement('div');
    box.className = 'zr-mask';
    box.id = 'ziyit-report-mask';
    box.hidden = true;
    box.innerHTML =
      '<div class="zr-box" role="dialog" aria-modal="true" aria-labelledby="zr-title">' +
        '<div class="zr-head"><h3 id="zr-title">举报内容</h3><button type="button" class="zr-x" data-zr-close aria-label="关闭">×</button></div>' +
        '<p class="zr-sub" id="zr-target"></p>' +
        '<div class="zr-field"><label for="zr-tier">严重程度</label><select id="zr-tier">' + tierOpts + '</select><span class="zr-hint" id="zr-tier-hint"></span></div>' +
        '<div class="zr-field"><label for="zr-cat">问题类型</label><select id="zr-cat">' + catOpts + '</select></div>' +
        '<div class="zr-field"><label for="zr-detail">补充说明（可选，最多 500 字）</label><textarea id="zr-detail" maxlength="500" rows="4" placeholder="请描述具体问题，便于管理员核实"></textarea></div>' +
        '<p class="zr-status" id="zr-status"></p>' +
        '<div class="zr-actions"><button type="button" class="zr-btn" data-zr-close>取消</button><button type="button" class="zr-btn primary" id="zr-submit">提交举报</button></div>' +
      '</div>';
    document.body.appendChild(box);

    el.mask = box;
    el.target = box.querySelector('#zr-target');
    el.tier = box.querySelector('#zr-tier');
    el.hint = box.querySelector('#zr-tier-hint');
    el.cat = box.querySelector('#zr-cat');
    el.detail = box.querySelector('#zr-detail');
    el.status = box.querySelector('#zr-status');
    el.submit = box.querySelector('#zr-submit');

    function syncHint() {
      var hit = null;
      for (var i = 0; i < TIERS.length; i++) if (TIERS[i][0] === el.tier.value) hit = TIERS[i];
      el.hint.textContent = hit ? hit[2] : '';
    }
    el.tier.addEventListener('change', syncHint);
    syncHint();

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.hasAttribute('data-zr-close')) close();
    });
    el.submit.addEventListener('click', submit);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !box.hidden) close();
    });
  }

  function setStatus(msg, isErr) {
    el.status.className = 'zr-status' + (isErr ? ' err' : '');
    el.status.innerHTML = msg || '';
  }

  function close() {
    if (!el.mask) return;
    el.mask.hidden = true;
    busy = false;
    el.submit.disabled = false;
    el.submit.textContent = '提交举报';
    cur = null;
  }

  function typeLabel(t) {
    if (t === 'chat_message') return '聊天墙消息';
    if (t === 'level') return '层级';
    if (t === 'user') return '用户';
    return t;
  }

  function open(opts) {
    opts = opts || {};
    if (!opts.targetType || !opts.targetId) return;
    build();
    cur = opts;
    busy = false;
    el.submit.disabled = false;
    el.submit.textContent = '提交举报';
    el.detail.value = '';
    el.tier.value = opts.tier ? String(opts.tier) : '3';
    el.tier.dispatchEvent(new Event('change'));
    el.cat.value = '其它';
    el.mask.hidden = false;

    var target = '目标：' + typeLabel(opts.targetType) + ' ' + String(opts.targetId);
    if (opts.label) target += '（' + opts.label + '）';
    el.target.textContent = target;

    var token = '';
    try { token = ZIYIT_API.getToken ? ZIYIT_API.getToken() : ''; } catch (e) {}
    if (!token) {
      setStatus('请先<a href="' + ROOT + 'user/">登录</a>后再举报。', true);
      el.submit.disabled = true;
      return;
    }
    setStatus('正在查询该内容的举报记录…');
    ZIYIT_API.request('/report/target?targetType=' + encodeURIComponent(opts.targetType) + '&targetId=' + encodeURIComponent(opts.targetId)).then(function (d) {
      var n = d && Number(d.count) || 0;
      setStatus(n > 0 ? ('该内容已被举报 ' + n + ' 次，管理员会优先处理。') : '');
    }).catch(function () { setStatus(''); });
  }

  function submit() {
    if (busy || !cur) return;
    busy = true;
    el.submit.disabled = true;
    el.submit.textContent = '提交中…';
    var payload = {
      targetType: cur.targetType,
      targetId: String(cur.targetId),
      tier: Number(el.tier.value) || 3,
      category: el.cat.value || null,
      detail: (el.detail.value || '').trim() || null
    };
    if (cur.targetUserId != null && cur.targetUserId !== '') payload.targetUserId = Number(cur.targetUserId);

    ZIYIT_API.request('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function () {
      setStatus('举报已提交，感谢反馈。');
      el.submit.textContent = '已提交';
      setTimeout(close, 900);
    }).catch(function (err) {
      busy = false;
      el.submit.disabled = false;
      el.submit.textContent = '提交举报';
      var status = err && err.status;
      var msg = (err && err.message) || '提交失败，请稍后再试';
      if (status === 401) msg = '请先<a href="' + ROOT + 'user/">登录</a>后再举报。';
      else if (status === 409) msg = '你已经举报过这条内容了，无需重复提交。';
      else if (status === 429) msg = '举报过于频繁，请' + (err.retryAfter ? err.retryAfter + ' 秒' : '稍后') + '后再试。';
      else if (status === 403) msg = '当前账号暂时无法举报。';
      setStatus(msg, true);
    });
  }

  window.ZIYIT_REPORT = { open: open, close: close };
})();
