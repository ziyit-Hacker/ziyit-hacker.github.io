/**
 * ZIYIT 统一按钮加载态（v1）
 * ------------------------------------------------------------
 * 规范见 design/DESIGN.md §4.1 / §4.16，交互用例见 design/ui-test.html §4.16。
 *
 * 1. 任意按钮被点击后立即拦截重复点击；操作耗时 ≥100ms 才展示加载态（转圈 + 文案）并禁用；
 * 2. 该次点击触发的 fetch / XMLHttpRequest 全部结束（成功或失败）后立即恢复；
 * 3. 完成时间 <100ms 的操作（同步、校验拦截、瞬时接口）不出现加载态，避免闪烁；
 * 4. 兜底：单个按钮加载超过 120s 强制恢复并在控制台告警，避免永久卡死。
 *
 * 页面底部引入本脚本即可，无需逐个按钮改造。特殊场景可用：
 *   ZIYIT_BTN.wrap(button, promise, "文案")   // 手动指定异步任务
 *   ZIYIT_BTN.hold(button, "文案")            // 手动开始，返回 { done() }
 *   ZIYIT_BTN.release(button)                 // 结束该按钮的加载态
 *   <button data-btn-loading="off">           // 退出统一管理
 *   <button data-loading-text="保存中…">       // 自定义加载文案
 */
(function (global) {
    "use strict";

    if (global.ZIYIT_BTN) return;

    var DOC = global.document;
    var DEFAULT_TEXT = "处理中…";
    var ATTACH_WINDOW = 3000;   // 点击后 3s 内发起的请求归因到该次点击
    var MAX_LOADING = 120000;   // 单个按钮最长加载时间（兜底）
    var SHOW_DELAY = 100;       // 完成时间 <100ms 的操作不展示加载态，避免闪烁

    var sessions = [];

    function now() { return Date.now(); }

    function isLoading(el) {
        return !!el && (!!findSession(el) || el.getAttribute("data-ziyit-loading") === "1");
    }

    function findSession(el) {
        for (var i = sessions.length - 1; i >= 0; i--) {
            if (sessions[i].el === el && !sessions[i].closed) return sessions[i];
        }
        return null;
    }

    function isSubmitControl(el) {
        if (!el || !el.form) return false;
        var tag = el.tagName;
        var type = (el.getAttribute("type") || "").toLowerCase();
        if (tag === "BUTTON") return !type || type === "submit";
        if (tag === "INPUT") return type === "submit" || type === "image";
        return false;
    }

    function findButton(target) {
        if (!target || target.nodeType !== 1 || !target.closest) return null;
        return target.closest(
            'button, input[type="submit"], input[type="button"], input[type="reset"], ' +
            'input[type="image"], [role="button"], [data-btn-loading]'
        );
    }

    // ---------- 加载态渲染 ----------

    function applyLoading(el, text, s) {
        s.prevAriaBusy = el.getAttribute("aria-busy");
        s.prevAriaDisabled = el.getAttribute("aria-disabled");

        if (el.tagName === "INPUT") {
            s.originalValue = el.value;
            s.loadingValue = text;
            el.value = text;
        } else {
            s.originalHTML = el.innerHTML;
            s.originalMinWidth = el.style.minWidth;
            var rect = el.getBoundingClientRect();
            if (rect && rect.width) el.style.minWidth = Math.ceil(rect.width) + "px";

            var hasText = (el.textContent || "").replace(/\s+/g, "") !== "";
            el.innerHTML = "";
            var spinner = DOC.createElement("span");
            spinner.className = "btn-loading-spinner";
            spinner.setAttribute("aria-hidden", "true");
            el.appendChild(spinner);
            // 纯图标按钮（无文字、有 aria-label）只显示转圈，避免布局突变
            if (hasText || !el.getAttribute("aria-label")) {
                var label = DOC.createElement("span");
                label.className = "btn-loading-text";
                label.textContent = text;
                el.appendChild(label);
            }
            s.loadingHTML = el.innerHTML;
        }

        el.classList.add("btn-loading");
        el.setAttribute("data-ziyit-loading", "1");
        el.setAttribute("aria-busy", "true");
        el.setAttribute("aria-disabled", "true");
    }

    // 加载期禁用按钮，并监听页面自身的 disabled 写入。
    // 延迟到点击处理结束后的 0ms 执行，避免：1) 表单 submit 默认行为被中断；
    // 2) 页面处理器同步读取 this.disabled 时被误判。
    function setLoadingDisabled(s) {
        var el = s.el;
        if (!el || s.trapInstalled) return;
        var proto = Object.getPrototypeOf(el);
        var desc = proto && Object.getOwnPropertyDescriptor(proto, "disabled");
        if (!desc || typeof desc.get !== "function" || typeof desc.set !== "function") return;

        try {
            s.disabledDesc = desc;
            s.wasDisabled = desc.get.call(el);
            // 页面在点击处理阶段已主动禁用（倒计时 / 翻译中等），视为页面意图
            if (s.wasDisabled) s.pageTouchedDisabled = true;

            Object.defineProperty(el, "disabled", {
                configurable: true,
                enumerable: false,
                get: function () { return desc.get.call(el); },
                set: function (v) {
                    if (!s.ourWrite) s.pageTouchedDisabled = true;
                    desc.set.call(el, v);
                }
            });
            s.trapInstalled = true;
            s.ourWrite = true;
            el.disabled = true;
            s.ourWrite = false;
        } catch (e) {}
    }

    function restore(el, s, reason) {
        el.classList.remove("btn-loading");
        el.removeAttribute("data-ziyit-loading");

        if (s.prevAriaBusy === null) el.removeAttribute("aria-busy");
        else el.setAttribute("aria-busy", s.prevAriaBusy);

        if (s.prevAriaDisabled === null) el.removeAttribute("aria-disabled");
        else el.setAttribute("aria-disabled", s.prevAriaDisabled);

        // 解除加载期禁用：页面若在加载期间自行改过 disabled（倒计时、成功后锁定等），
        // 尊重页面意图，不强行恢复为可点击。
        if (s.trapInstalled) {
            try {
                if (!s.pageTouchedDisabled) {
                    s.ourWrite = true;
                    el.disabled = s.wasDisabled;
                    s.ourWrite = false;
                }
                delete el.disabled;
            } catch (e) {
                try { delete el.disabled; } catch (e2) {}
            }
            s.trapInstalled = false;
        }

        if (el.tagName === "INPUT") {
            // 页面在加载期间自行改过文案（如倒计时）时不覆盖
            if (el.value === s.loadingValue) el.value = s.originalValue;
        } else {
            // 页面在加载期间自行改过内容时不覆盖，只恢复布局宽度
            if (el.innerHTML === s.loadingHTML) el.innerHTML = s.originalHTML;
            el.style.minWidth = s.originalMinWidth;
        }

        el.dispatchEvent(new CustomEvent("ziyit:loading-end", {
            bubbles: true,
            detail: { reason: reason || "done" }
        }));
    }

    function finish(s, reason) {
        if (!s || s.closed) return;
        s.closed = true;
        if (s.settleTimer) { clearTimeout(s.settleTimer); s.settleTimer = null; }
        if (s.deadline) { clearTimeout(s.deadline); s.deadline = null; }
        if (s.checkTimer) { clearTimeout(s.checkTimer); s.checkTimer = null; }
        if (s.showTimer) { clearTimeout(s.showTimer); s.showTimer = null; }

        var idx = sessions.indexOf(s);
        if (idx > -1) sessions.splice(idx, 1);

        // 操作在 SHOW_DELAY 内结束：从未渲染加载态，直接静默收尾（不闪一下）；
        // 已渲染的则立即恢复，符合“操作结束立即恢复可用”。
        if (!s.shown) return;
        restore(s.el, s, reason);
    }

    function scheduleFinish(s) {
        if (s.closed || s.settleTimer) return;
        // 延后一个任务再恢复：给「同一处理后链式发起的下一个请求」留出挂接窗口，
        // 同时 0ms 定时器在视觉上仍是即时恢复。
        s.settleTimer = setTimeout(function () {
            s.settleTimer = null;
            if (!s.closed && s.pending === 0) finish(s, "done");
        }, 0);
    }

    function maybeFinish(s) {
        if (!s || s.closed || s.manual || !s.taskChecked) return;
        if (s.pending > 0) return;
        scheduleFinish(s);
    }

    function startSession(el, options) {
        options = options || {};
        if (!el || el.nodeType !== 1) return null;
        if (el.disabled) return null;
        if (el.getAttribute("data-btn-loading") === "off") return null;
        var running = findSession(el);
        if (running) return running;

        var text = options.text || el.getAttribute("data-loading-text") || DEFAULT_TEXT;
        var s = {
            el: el,
            created: now(),
            startedAt: now(),
            pending: 0,
            hadRequest: false,
            closed: false,
            shown: false,
            manual: !!options.manual,
            taskChecked: !!options.manual,
            isSubmit: isSubmitControl(el),
            wasDisabled: false,
            trapInstalled: false,
            pageTouchedDisabled: false,
            ourWrite: false,
            disabledDesc: null,
            settleTimer: null,
            checkTimer: null,
            showTimer: null,
            deadline: null
        };

        sessions.push(s);

        // 完成时间 < SHOW_DELAY 的操作不进入加载态，避免瞬间任务导致闪烁；
        // 期间仍靠会话本身拦截重复点击。
        s.showTimer = setTimeout(function () {
            s.showTimer = null;
            showLoading(s, text);
        }, SHOW_DELAY);

        // 提交按钮需等表单 default action（submit 事件）执行完再判定；
        // 其余按钮在冒泡阶段即可恢复，此处 0ms 定时器只作为 stopPropagation 的兜底。
        s.checkTimer = setTimeout(function () {
            s.checkTimer = null;
            s.taskChecked = true;
            maybeFinish(s);
        }, 0);

        s.deadline = setTimeout(function () {
            if (s.closed) return;
            if (global.console && console.warn) {
                console.warn("[ZIYIT_BTN] 按钮加载超过 " + (MAX_LOADING / 1000) + "s，已强制恢复：", el);
            }
            finish(s, "timeout");
        }, MAX_LOADING);

        return s;
    }

    // 真正把按钮渲染为加载态：此时已确认操作超过 SHOW_DELAY，不会被瞬间任务抹掉
    function showLoading(s, text) {
        if (!s || s.closed || s.shown) return;
        s.shown = true;
        applyLoading(s.el, text, s);
        setLoadingDisabled(s);
        s.el.dispatchEvent(new CustomEvent("ziyit:loading-start", { bubbles: true }));
    }

    // ---------- 请求跟踪 ----------

    function trackStart() {
        var t = now();
        var picked = null;
        for (var i = sessions.length - 1; i >= 0; i--) {
            var s = sessions[i];
            if (s.closed) continue;
            if (t - s.created > ATTACH_WINDOW) continue;
            picked = s; // 归因到最近一次点击，避免多点并发互相牵连
            break;
        }
        if (picked) {
            picked.pending++;
            picked.hadRequest = true;
        }
        return picked;
    }

    function trackEnd(s) {
        if (!s || s.closed) return;
        if (s.pending > 0) s.pending--;
        maybeFinish(s);
    }

    function isEventStream(res) {
        try {
            var ct = res && res.headers && res.headers.get ? res.headers.get("content-type") : "";
            return String(ct || "").toLowerCase().indexOf("text/event-stream") !== -1;
        } catch (e) {
            return false;
        }
    }

    // 流式响应（SSE）在响应头返回后仍未结束，拷贝一份流读取到结束再恢复按钮；
    // 页面持有的原响应不受影响。
    function watchStream(res, s) {
        if (!s) return;
        var clone;
        try {
            if (!res.body || typeof res.clone !== "function") throw new Error("no stream");
            clone = res.clone();
        } catch (e) {
            trackEnd(s);
            return;
        }
        try {
            var reader = clone.body.getReader();
            (function pump() {
                reader.read().then(function (r) {
                    if (r.done) trackEnd(s);
                    else pump();
                }, function () {
                    trackEnd(s);
                });
            })();
        } catch (e) {
            trackEnd(s);
        }
    }

    function patchFetch() {
        var native = global.fetch;
        if (typeof native !== "function" || native.__ziyitPatched) return;

        var wrapped = function () {
            var s = trackStart();
            var p;
            try {
                p = native.apply(this, arguments);
            } catch (err) {
                trackEnd(s);
                throw err;
            }
            return p.then(function (res) {
                if (isEventStream(res)) watchStream(res, s);
                else trackEnd(s);
                return res;
            }, function (err) {
                trackEnd(s);
                throw err;
            });
        };
        wrapped.__ziyitPatched = true;
        try {
            global.fetch = wrapped;
        } catch (e) {}
    }

    function patchXHR() {
        var proto = global.XMLHttpRequest && global.XMLHttpRequest.prototype;
        if (!proto || proto.__ziyitPatched) return;

        var nativeSend = proto.send;
        proto.send = function () {
            var s = trackStart();
            var xhr = this;
            var done = false;
            function end() {
                if (done) return;
                done = true;
                trackEnd(s);
            }
            try {
                xhr.addEventListener("loadend", end);
            } catch (e) {}
            try {
                return nativeSend.apply(this, arguments);
            } catch (err) {
                end();
                throw err;
            }
        };
        proto.__ziyitPatched = true;
    }

    // ---------- 事件监听 ----------

    function onClickCapture(e) {
        if (typeof e.button === "number" && e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var el = findButton(e.target);
        if (!el) return;

        if (isLoading(el)) {
            // 加载中：阻止重复提交（含键盘回车与程序化 click）
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
        }
        if (el.disabled || el.getAttribute("data-btn-loading") === "off") return;

        var s = startSession(el);
        if (s) {
            try { e.__ziyitSession = s; } catch (err) {}
        }
    }

    function onClickBubble(e) {
        var s = e.__ziyitSession;
        if (!s) return;
        // 页面处理器已通过 ZIYIT_BTN.wrap / hold 接管该次点击，由页面决定结束时机
        if (s.manual) return;
        // 提交按钮要等 submit 事件执行完，交给 0ms 定时器判定
        if (s.isSubmit) return;
        s.taskChecked = true;
        if (s.pending === 0) {
            // 同步操作：业务已在本任务内完成，加载态只保留最短可见时间
            finish(s, "sync");
        } else {
            maybeFinish(s);
        }
    }

    DOC.addEventListener("click", onClickCapture, true);
    global.addEventListener("click", onClickBubble, false);

    // ---------- 对外 API ----------

    function hold(el, text) {
        var s = findSession(el);
        if (s) {
            s.manual = true;
            s.taskChecked = true;
            return { done: function () { finish(s); }, session: s };
        }
        s = startSession(el, { text: text, manual: true });
        return {
            done: function () { if (s) finish(s); },
            session: s
        };
    }

    function wrap(el, promise, text) {
        var s = findSession(el);
        if (s) {
            s.manual = true;
            s.taskChecked = true;
        } else {
            s = startSession(el, { text: text, manual: true });
        }
        if (!s) return promise;
        Promise.resolve(promise).then(function () {
            finish(s);
        }, function () {
            finish(s);
        });
        return promise;
    }

    function release(el) {
        var s = findSession(el);
        if (s) finish(s);
    }

    patchFetch();
    patchXHR();

    global.ZIYIT_BTN = {
        begin: function (el, text) { return startSession(el, { text: text, manual: true }); },
        hold: hold,
        wrap: wrap,
        release: release,
        isLoading: isLoading,
        // 便于自动化用例观察/清理
        _sessions: sessions
    };
})(window);
