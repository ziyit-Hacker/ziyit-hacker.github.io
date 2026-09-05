// phantom.ts
// Phantom 人机验证 SDK 公共入口。
//
// 接入形态仿 Cloudflare Turnstile / reCAPTCHA v2：
//   - 表单内只留一个紧凑复选框长条（phantom-bar）：复选框 + 文案 + logo + 版权
//   - 点击复选框 -> 弹出居中模态（phantom-modal），主体（画布 + 按住按钮）在模态内
//   - 验证成功 -> 模态消失，紧凑框变为"已验证"态（lime 绿 ✓）
//   - 验证失败 -> 模态内自动重试（体验连贯）
//   - 关闭模态 / reset() -> 紧凑框回 idle，下次点击重新验证
//
// 流程（验证引擎不变，手册 三）：
//   1) 点击复选框 -> 弹模态 -> 协商会话密钥 -> 解密路径参数 -> 启动动态显影
//   2) 用户按住"激活"按钮 -> 肉眼跟随移动方块 -> tracker 采集轨迹
//   3) 松开 -> 立即加密轨迹 -> 提交 /verify -> 通过回调回传 { passed, score, challengeId, sessionId }
//
// 关键语义修正（P0 新协议）：
//   - 后端不再签发/下发可信 token。验证凭证 = 本轮的 { challengeId, sessionId }，
//     sessionId 由 /challenge 响应签发并存入本轮内存，接入方把两者随业务请求
//     （如注册）一起提交，由后端 GETDEL 一次性消费 + 会话一致性校验。
//   - /consume-token 已废弃，SDK 不再调用它。
//
// Canvas 生命周期安全点（tracker 监听器绑在 window 上，仅 stop() 移除）：
//   - 模态关闭前必须调 session.destroy()（含 tracker.stop()），防全局监听泄漏
//   - tracker.start() 仅读一次 getBoundingClientRect() 并缓存，必须画布已布局后调用
//     （实际触发时机是用户按住按钮时，模态早已打开 -> 安全）
import { CONFIG, isMobileViewport } from "./config.js";
import { requestChallenge, submitVerify, } from "./api.js";
import { decrypt, deriveSessionKey, encrypt, generateClientKeyPair, importServerPublic, } from "./crypto.js";
import { installAntidebug } from "./antidebug.js";
import { PhantomRenderer } from "./renderer.js";
import { TrajectoryTracker } from "./tracker.js";
import { injectStyles } from "./styles.js";
// prng.min.js 为 prng.js 经 terser 混淆（后端服务器已混淆）的产物；源文件已移除
import { deriveBezierPath } from "./prng.min.js";
const VERSION = "0.1.0";
/** 预热脉冲时长（毫秒）：按住后先显影方块这段时间，方便用户熟悉方块位置。
 *  时长来自 CONFIG.previewSeconds（由 VITE_PREVIEW_SECONDS 注入，可调）。 */
const PREVIEW_MS = CONFIG.previewSeconds * 1000;
/* ============================================================
   内联 SVG 图标（随 currentColor 自适应主题，无外部资源依赖）
   - LOGO_SVG：使用 https://ziyit-hacker.github.io/assets/logo.ico 图片替代原有幽灵图标
   - CHECK_SVG：验证通过对勾
   - CLOSE_SVG：模态关闭 ×
   - ALERT_SVG：失败感叹号
   ============================================================ */
const LOGO_SVG = '<img src="https://ziyit-hacker.github.io/assets/logo.ico" alt="Logo" style="width:22px;height:22px;display:block;border-radius:4px;" />';
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 12.5l4.5 4.5L19 7"/>' +
    "</svg>";
const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 6 6 18M6 6l12 12"/>' +
    "</svg>";
const ALERT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 8v5M12 16.5v.5"/>' +
    "</svg>";
/** 把字符串或 HTMLElement 解析为容器元素。 */
function resolveContainer(el) {
    const node = typeof el === "string" ? document.querySelector(el) : el;
    if (!(node instanceof HTMLElement)) {
        throw new Error(`Phantom.mount: 容器未找到 (${el})`);
    }
    return node;
}
/** 内部状态机：封装一次"拉题->渲染->采集->提交"的生命周期。 */
class WidgetSession {
    constructor(canvas, apiBase, status, overlay, hint, activateBtn, onResult, onError, onRetry) {
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: canvas
        });
        Object.defineProperty(this, "apiBase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: apiBase
        });
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: status
        });
        Object.defineProperty(this, "overlay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: overlay
        });
        Object.defineProperty(this, "hint", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: hint
        });
        Object.defineProperty(this, "activateBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: activateBtn
        });
        Object.defineProperty(this, "onResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: onResult
        });
        Object.defineProperty(this, "onError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: onError
        });
        Object.defineProperty(this, "onRetry", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: onRetry
        });
        Object.defineProperty(this, "renderer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "tracker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "sessionKey", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "challengeId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        /** 本轮验证的后端会话标识。由 /challenge 响应签发并在 start() 拉题时写入，
         *  贯穿到 /verify 与宿主业务提交（同轮一致），失败重试（新 session）时随新题刷新。 */
        Object.defineProperty(this, "sessionId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        Object.defineProperty(this, "collecting", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "finished", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** 预热脉冲态：按住后先在起点原地显影方块 2 秒，方便用户熟悉方块位置。 */
        Object.defineProperty(this, "previewing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "previewTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** 本题路径时长（秒），来自后端解密参数，用于按钮充能进度条对齐渲染结束时刻。 */
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
        /** 失败->重试 的延迟计时器，destroy/reset 时清理。 */
        Object.defineProperty(this, "retryTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** 本题对应的端类型（pc/mobile），在 start() 里按视口确定后下发给后端，
         * 让后端据此选择 canvas_w/h 与 target_half。 */
        Object.defineProperty(this, "device", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "pc"
        });
        Object.defineProperty(this, "_unbind", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => { }
        });
    }
    /** 更新阶段提示框：设置阶段标识（控制状态点样式）与文案（空串则隐藏点）。 */
    setHint(stage, text) {
        this.hint.setAttribute("data-stage", stage);
        this.hint.textContent = text;
    }
    async start() {
        // 画布尺寸按视口 PC/Mobile 区分（docs/issue3.md 2/4）。
        // 必须与后端按同一 device 选出的 PHANTOM_CANVAS_*_PC/MOBILE 一致，
        // 否则后端 DTW 归一化用的 canvas_w/h 会与前端渲染尺寸错位（见下方 device 传参）。
        const mobile = isMobileViewport();
        this.device = mobile ? "mobile" : "pc";
        this.canvas.width = mobile ? CONFIG.canvasWidthMobile : CONFIG.canvasWidthPC;
        this.canvas.height = mobile ? CONFIG.canvasHeightMobile : CONFIG.canvasHeightPC;
        this.status.textContent = "正在准备验证题…";
        // 加载态：遮罩隐藏，避免遮挡空白 canvas；阶段提示框清空
        this.overlay.classList.add("phantom-hidden");
        this.setHint("loading", "");
        this.activateBtn.disabled = true;
        try {
            // 1) 协商会话密钥 + 取题；保存后端签发的新 sessionId（本轮绑定）
            const { privateKey, publicJwk } = await generateClientKeyPair();
            const challenge = await requestChallenge(this.apiBase, publicJwk, this.device);
            if (challenge && challenge.sessionId)
                this.sessionId = challenge.sessionId;
            const serverPub = await importServerPublic(challenge.serverPublicJwk);
            this.sessionKey = await deriveSessionKey(privateKey, serverPub, challenge.salt);
            this.challengeId = challenge.challengeId;
            // 2) 解密路径参数（issue #7：只含 pathSeed + 布局，不含控制点）
            const paramsJson = await decrypt(this.sessionKey, challenge.encryptedParams.iv, challenge.encryptedParams.ciphertext);
            const raw = JSON.parse(new TextDecoder().decode(paramsJson));
            // 控制点【本地派生】：后端用同一 pathSeed + 同一算法推出相同控制点做评分。
            // 网络上只有不可解读的种子；hook decrypt 只能看到种子而非 [x,y] 几何点表。
            const controlPoints = deriveBezierPath(raw.pathSeed, raw.canvas.w, raw.canvas.h);
            const params = {
                controlPoints,
                duration: raw.duration,
                fps: raw.fps,
                targetHalf: raw.targetHalf,
            };
            this.duration = params.duration;
            this.renderer = new PhantomRenderer(this.canvas, params);
            this.tracker = new TrajectoryTracker(this.canvas);
            // 题目就绪：先画一帧静态噪点，等用户按住按钮再开始动态显影。
            // 进度条充能时长与后端下发的路径时长对齐（充能结束 约等于 渲染结束）。
            this.activateBtn.style.setProperty("--ph-charge-duration", `${this.duration}s`);
            this.status.textContent = "";
            this.setHint("ready", "按住下方按钮");
            this.activateBtn.disabled = false;
            this.renderer.drawStaticNoise();
            // 题目就绪：显示玩法遮罩，用户按下即隐藏（见 bindInteraction.onDown）
            this.overlay.classList.remove("phantom-hidden");
            this.bindInteraction();
        }
        catch (e) {
            this.onError(e);
            const code = (e && e.status) || 0;
            if (code === 429) {
                // 拉题阶段被频控（IP 封禁）：提示稍后再试；冷却后转手动重试，避免连环触发限流
                this.status.textContent = "尝试次数过多，请稍后再试";
                this.scheduleRetry(60000);
            }
            else {
                this.status.textContent = `初始化失败: ${e.message}`;
            }
        }
    }
    bindInteraction() {
        // 按下即取消原生默认行为，防止浏览器发起「文本选择 / 图片拖拽」手势——
        // 这是用户反馈的「按住按钮拖动变成选择文字」的根因之一。
        // 仅在主键（左键 / 触摸笔 / 手指）时阻止，避免误伤右键菜单等辅助交互。
        const onDown = (e) => {
            if (e.button !== 0)
                return;
            e.preventDefault();
            if (this.collecting || this.previewing || this.finished)
                return;
            // 预热态：按住瞬间先在起点原地显影方块 2 秒，方便用户熟悉方块位置。
            // 此阶段只做脉冲呼吸显影，不采集、不出发路径、不进入充能态。
            this.previewing = true;
            this.overlay.classList.add("phantom-hidden");
            this.setHint("preview", "手指/鼠标拖动到闪烁的方块等待");
            this.renderer?.startPreview();
            this.previewTimer = window.setTimeout(beginCollect, PREVIEW_MS);
        };
        // 2 秒预热结束：方块从起点出发，同步启动轨迹采集 + 按钮充能态。
        // renderer.start() 与 tracker.start() 严格同步 -> 采集起点对齐 t=0，
        // 后端 DTW/评分与改前完全一致。
        const beginCollect = () => {
            if (!this.previewing || this.finished)
                return;
            this.previewing = false;
            this.collecting = true;
            this.status.textContent = "";
            this.setHint("collect", "按住跟随方块移动");
            this.renderer?.stopPreview();
            // onTick：路径走到 t=1（方块停在终点）只触发一次 -> 切换"松手"提示。
            this.renderer?.start((_center, t) => {
                if (t >= 1)
                    this.setHint("stopped", "请松手");
            });
            this.tracker?.start();
            // 充能进度条此时才开始（动画时长仍对齐 --ph-charge-duration = duration）
            this.activateBtn.classList.add("phantom-holding");
        };
        const onUp = () => {
            if (this.finished)
                return;
            // 预热中松手：取消预热、回到就绪态，不提交。
            if (this.previewing) {
                window.clearTimeout(this.previewTimer);
                this.previewing = false;
                this.renderer?.stopPreview();
                this.renderer?.drawStaticNoise();
                this.status.textContent = "";
                this.setHint("ready", "按住下方按钮并马上拖动到方块");
                return;
            }
            if (!this.collecting)
                return;
            this.collecting = false;
            // 松手即停：进度条定格，渲染退化为纯噪点；提示框清空（结果交给按钮表达）
            this.activateBtn.classList.remove("phantom-holding");
            this.renderer?.pause();
            this.setHint("done", "");
            const samples = this.tracker?.stop() ?? [];
            void this.verifyAndFinish(samples);
        };
        this.activateBtn.addEventListener("pointerdown", onDown);
        window.addEventListener("pointerup", onUp);
        // 选择/拖拽兜底拦截：CSS user-select 失效（老 WebKit、宿主页样式污染）时，
        // 任何 selectstart / dragstart（冒泡到 document）一律阻止，彻底杜绝「拖成选择文字」。
        // 用 capture 阶段拦截，避免被中间 stopPropagation 吞掉。
        const onSelectStart = (e) => e.preventDefault();
        document.addEventListener("selectstart", onSelectStart, { capture: true });
        document.addEventListener("dragstart", onSelectStart, { capture: true });
        // 保存以便 destroy 解绑
        this._unbind = () => {
            this.activateBtn.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            document.removeEventListener("selectstart", onSelectStart, { capture: true });
            document.removeEventListener("dragstart", onSelectStart, { capture: true });
        };
    }
    async verifyAndFinish(samples) {
        if (!this.sessionKey)
            return;
        // 采样点时间戳用 performance.now()（单调高精度，仅相对时差参与 DSP 重采样），
        // 但防重放时效字段 lastPointT_ms 必须与后端 epoch 对齐——后端拿
        // time.time()*1000 与之比对，传 performance.now() 会被误判 timeout_drift、
        // 导致真实轨迹恒得 0.0 分。故此处用 Date.now()（epoch 毫秒）。
        const payload = {
            points: samples,
            lastPointT_ms: Date.now(),
        };
        const plaintext = new TextEncoder().encode(JSON.stringify(payload));
        const { iv, ciphertext } = await encrypt(this.sessionKey, plaintext);
        try {
            // 提交本轮 sessionId：后端做“与 /challenge 同轮会话”一致性校验
            const result = await submitVerify(this.apiBase, this.challengeId, this.sessionId, iv, ciphertext);
            this.renderer?.stop();
            this.finished = true;
            this.status.textContent = "";
            // 通过时把本轮的 challengeId + sessionId 一并回传宿主：
            // 后端不再下发可信 token，业务提交（如注册）直接用这组凭证。
            result.challengeId = this.challengeId;
            result.sessionId = this.sessionId;
            if (result.passed) {
                // 成功：按钮 lime 绿微放大，文字显示"验证通过"
                this.activateBtn.classList.add("phantom-success");
                this.activateBtn.textContent = "验证通过";
            }
            else {
                // 失败：按钮警示红 + 震动，闪现 1s 后转"点击刷新重试"
                this.activateBtn.classList.add("phantom-fail");
                this.activateBtn.textContent = "验证失败";
                this.scheduleRetry();
            }
            this.onResult(result);
        }
        catch (e) {
            this.renderer?.stop();
            this.finished = true;
            const code = (e && e.status) || 0;
            this.activateBtn.classList.add("phantom-fail");
            if (code === 429) {
                // 尝试过多 / IP 频控封禁：提示稍后再试；暂停自动重试，防触发进一步限流
                this.status.textContent = "尝试次数过多，请稍后再试";
                this.activateBtn.textContent = "尝试次数过多";
                this.scheduleRetry(60000);
            }
            else if (code === 410) {
                // 尝试次数耗尽 / challenge 过期：提示后自动重新拉题（新 challengeId + 新 sessionId）
                this.status.textContent = "验证已失效，请重新滑动";
                this.activateBtn.textContent = "验证已失效";
                this.scheduleRetry(800, "auto-restart");
            }
            else {
                // 其它失败（网络 / 解密失败 / 客户端绑定不一致）：闪现后转手动重试（重新拉题）
                this.status.textContent = "提交失败";
                this.activateBtn.textContent = "验证失败";
                this.scheduleRetry();
            }
            this.onError(e);
        }
    }
    /** 延迟后恢复：mode 缺省 = 转“点击刷新重试”按钮（手动拉新题）；
     *  mode="auto-restart" = 到时自动触发重试（410 失效场景，SDK 主动拉取新一轮挑战）。 */
    scheduleRetry(delayMs, mode) {
        window.clearTimeout(this.retryTimer);
        this.retryTimer = window.setTimeout(() => {
            if (mode === "auto-restart") {
                this.turnIntoRetryButton();
                this.activateBtn.click(); // 立即触发：新 challengeId + 新 sessionId
            }
            else {
                this.turnIntoRetryButton();
            }
        }, delayMs || 1000);
    }
    /** 把"按住跟随方块"按钮变成"点击刷新重试"按钮（点击->重新拉题）。 */
    turnIntoRetryButton() {
        this._unbind();
        this._unbind = () => { };
        // 清除所有结果态 class，复位到可点击的重试样式
        this.activateBtn.classList.remove("phantom-holding", "phantom-success", "phantom-fail");
        this.activateBtn.classList.add("phantom-retry");
        this.activateBtn.textContent = "点击刷新重试";
        this.activateBtn.disabled = false;
        const onClick = () => {
            this.activateBtn.removeEventListener("click", onClick);
            this.onRetry();
        };
        this.activateBtn.addEventListener("click", onClick);
        // 合并到 _unbind 以便 destroy/reset 清理
        this._unbind = () => {
            this.activateBtn.removeEventListener("click", onClick);
            this.activateBtn.classList.remove("phantom-retry");
        };
    }
    destroy() {
        this._unbind();
        window.clearTimeout(this.retryTimer);
        window.clearTimeout(this.previewTimer);
        this.previewing = false;
        this.renderer?.stopPreview();
        this.renderer?.stop();
        this.tracker?.stop();
    }
}
/**
 * 在指定容器挂载一个 Phantom 人机验证 widget。
 *
 * 接入形态仿 Turnstile/reCAPTCHA：容器内只渲染一个紧凑复选框长条，点击后弹出
 * 居中模态进行验证，成功后模态消失、紧凑框变为已验证态。
 * @returns handle，可用于 destroy() / reset()
 */
export function mount(el, opts) {
    injectStyles();
    // 反调试：默认仅在生产构建安装，可由 opts.antidebug 覆盖
    if (opts.antidebug ?? true) {
        installAntidebug(true);
    }
    const container = resolveContainer(el);
    // 清空容器，避免重复 mount 残留
    container.innerHTML = "";
    const root = document.createElement("div");
    root.className = "phantom-widget";
    root.setAttribute("data-theme", opts.theme ?? "dark");
    // ---------- 紧凑复选框长条（常驻表单内） ----------
    const bar = document.createElement("div");
    bar.className = "phantom-bar";
    bar.setAttribute("data-state", "idle");
    bar.setAttribute("role", "checkbox");
    bar.setAttribute("aria-checked", "false");
    bar.tabIndex = 0;
    bar.title = "点击进行人机验证";
    const check = document.createElement("span");
    check.className = "phantom-check";
    // 复选框图标（对勾 / 感叹号）按状态切换，初始为空
    check.innerHTML = "";
    const barText = document.createElement("span");
    barText.className = "phantom-bar-text";
    barText.textContent = "我不是机器人";
    const brand = document.createElement("span");
    brand.className = "phantom-bar-brand";
    const barLogo = document.createElement("span");
    barLogo.className = "phantom-bar-logo";
    barLogo.innerHTML = LOGO_SVG;
    const copyright = document.createElement("span");
    copyright.className = "phantom-bar-copyright";
    copyright.innerHTML =
        'ZIYIT STUDIO/<a href="https://ziyit-hacker.github.io/" target="_blank" rel="noopener">ZIYIT人机验证</a>';
    brand.appendChild(barLogo);
    brand.appendChild(copyright);
    bar.appendChild(check);
    bar.appendChild(barText);
    bar.appendChild(brand);
    root.appendChild(bar);
    container.appendChild(root);
    // ---------- 模态状态管理 ----------
    // modal 为 null 表示当前未弹出；非 null 时持有模态 DOM + 当前 WidgetSession。
    let modal = null;
    /** 更新紧凑框状态（idle/verifying/verified/error），同步复选框图标与 ARIA。 */
    const setBarState = (state) => {
        bar.setAttribute("data-state", state);
        bar.setAttribute("aria-checked", state === "verified" ? "true" : "false");
        if (state === "verified") {
            check.innerHTML = CHECK_SVG;
            barText.textContent = "已验证";
        }
        else if (state === "error") {
            check.innerHTML = ALERT_SVG;
            barText.textContent = "验证失败，点击重试";
        }
        else if (state === "verifying") {
            check.innerHTML = "";
            barText.textContent = "验证中…";
        }
        else {
            // idle
            check.innerHTML = "";
            barText.textContent = "我不是机器人";
        }
    };
    /** 构建模态主体 DOM（header + hint + canvas + overlay + activate + status）。 */
    const buildModalBody = (modalCard) => {
        // 模态头部：logo + 标题 + 关闭按钮
        const head = document.createElement("div");
        head.className = "phantom-modal-head";
        const headLogo = document.createElement("span");
        headLogo.className = "phantom-modal-logo";
        headLogo.innerHTML = LOGO_SVG;
        const title = document.createElement("span");
        title.className = "phantom-modal-title";
        title.textContent = "ZIYIT 人机验证系统";
        const closeBtn = document.createElement("button");
        closeBtn.className = "phantom-modal-close";
        closeBtn.type = "button";
        closeBtn.title = "关闭";
        closeBtn.setAttribute("aria-label", "关闭验证");
        closeBtn.innerHTML = CLOSE_SVG;
        closeBtn.addEventListener("click", () => closeModal(false));
        head.appendChild(headLogo);
        head.appendChild(title);
        head.appendChild(closeBtn);
        // 主体
        const body = document.createElement("div");
        body.className = "phantom-modal-body";
        // 阶段提示框
        const hint = document.createElement("div");
        hint.className = "phantom-hint";
        hint.setAttribute("data-stage", "loading");
        // canvas + 玩法遮罩一起放进相对定位的 wrap，遮罩 absolute 覆盖在画布上
        const stageWrap = document.createElement("div");
        stageWrap.className = "phantom-stage-wrap";
        const canvas = document.createElement("canvas");
        canvas.className = "phantom-stage";
        const overlay = document.createElement("div");
        overlay.className = "phantom-overlay phantom-hidden";
        const overlayText = document.createElement("div");
        overlayText.className = "phantom-overlay-text";
        overlayText.innerHTML = "按住下方按钮<br>马上拖动到闪烁方块处<br>方块出发后跟随移动<br>方块停止则松手";
        overlay.appendChild(overlayText);
        stageWrap.appendChild(canvas);
        stageWrap.appendChild(overlay);
        // 按住按钮
        const activateBtn = document.createElement("button");
        activateBtn.className = "phantom-activate";
        activateBtn.type = "button";
        activateBtn.textContent = "按住并跟随方块";
        activateBtn.disabled = true;
        const progress = document.createElement("span");
        progress.className = "phantom-progress";
        activateBtn.appendChild(progress);
        const status = document.createElement("div");
        status.className = "phantom-status";
        status.textContent = "正在准备验证题…";
        body.appendChild(hint);
        body.appendChild(stageWrap);
        body.appendChild(activateBtn);
        body.appendChild(status);
        modalCard.appendChild(head);
        modalCard.appendChild(body);
        return { hint, canvas, overlay, activateBtn, status, progress };
    };
    const dispatch = (r) => {
        if (r.passed)
            opts.onSuccess?.(r);
        else
            opts.onFail?.(r);
    };
    /** 打开模态：创建 DOM -> 构建并启动 session -> 紧凑框切 verifying。 */
    const openModal = () => {
        if (modal)
            return; // 已打开，忽略重复点击
        const node = document.createElement("div");
        node.className = "phantom-modal";
        node.setAttribute("data-theme", opts.theme ?? "dark");
        node.setAttribute("role", "dialog");
        node.setAttribute("aria-modal", "true");
        node.setAttribute("aria-label", "Phantom 人机验证");
        const modalCard = document.createElement("div");
        modalCard.className = "phantom-modal-card";
        node.appendChild(modalCard);
        const { hint, canvas, overlay, activateBtn, status, progress } = buildModalBody(modalCard);
        // 点遮罩（node 本身）关闭；点卡片内部不关闭（阻止冒泡）
        node.addEventListener("click", (e) => {
            if (e.target === node)
                closeModal(false);
        });
        modalCard.addEventListener("click", (e) => e.stopPropagation());
        document.body.appendChild(node);
        // 重试按钮点击后：把按钮复位为"按住并跟随方块"，再开新一轮 session。
        // 注意：新 session.start() 就绪后会自行显示遮罩，这里无需手动管理遮罩显示。
        const resetSession = () => {
            activateBtn.classList.remove("phantom-holding", "phantom-success", "phantom-fail", "phantom-retry");
            activateBtn.textContent = "按住并跟随方块";
            activateBtn.appendChild(progress);
            activateBtn.disabled = true;
            status.textContent = "正在准备验证题…";
            session = new WidgetSession(canvas, opts.apiBase, status, overlay, hint, activateBtn, 
            // 验证成功 -> onResult(dispatch) 触发 onSuccess，同时 onVerified 关闭模态
            (r) => {
                dispatch(r);
                if (r.passed)
                    onVerified();
            }, (e) => opts.onError?.(e), resetSession);
            void session.start();
        };
        let session = new WidgetSession(canvas, opts.apiBase, status, overlay, hint, activateBtn, (r) => {
            dispatch(r);
            if (r.passed)
                onVerified();
        }, (e) => opts.onError?.(e), resetSession);
        modal = { node, session, closing: false };
        setBarState("verifying");
        void session.start();
    };
    /** 关闭模态。
     *  @param verified true=验证成功关闭（紧凑框切 verified 态）；
     *                  false=主动关闭/失败关闭（紧凑框回 idle 或 error）。
     *  必须先 session.destroy()（清 tracker 的 window 监听 + renderer + 定时器）再移除 DOM。 */
    const closeModal = (verified) => {
        if (!modal || modal.closing)
            return;
        modal.closing = true;
        modal.session.destroy();
        // 播放关闭动画后移除 DOM
        const node = modal.node;
        const finalize = () => {
            node.remove();
        };
        node.classList.add("phantom-leaving");
        // 动画时长 150ms（与 CSS 一致）；用 setTimeout 兜底移除
        window.setTimeout(finalize, 160);
        modal = null;
        setBarState(verified ? "verified" : "idle");
    };
    /** 验证成功时由 session 回调触发：关闭模态（verified=true）。
     *  注意：需等一小会儿让用户看到按钮"验证通过"反馈再关闭模态。 */
    const onVerified = () => {
        window.setTimeout(() => closeModal(true), 700);
    };
    // ---------- 紧凑框交互绑定 ----------
    const onBarClick = () => {
        if (bar.getAttribute("data-state") === "verified")
            return; // 已验证不再弹出
        if (bar.getAttribute("data-state") === "verifying")
            return; // 正在验证
        openModal();
    };
    bar.addEventListener("click", onBarClick);
    // 键盘可达性：Enter / Space 触发
    bar.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onBarClick();
        }
    });
    return {
        destroy() {
            // 关闭模态（如在）—— 直接 destroy session + 移除 DOM，不走关闭动画
            if (modal) {
                modal.session.destroy();
                modal.node.remove();
                modal = null;
            }
            bar.removeEventListener("click", onBarClick);
            root.remove();
        },
        reset() {
            // 关闭模态（如在，不切 verified），紧凑框回到 idle，下次点击重新验证。
            // 宿主在“凭证过期/403 未通过”时调用 reset() 重新武装 widget，必须保留此语义。
            closeModal(false);
            setBarState("idle");
        },
        open() {
            // 程序化触发验证（供宿主“提交/注册”按钮在表单已填好、尚未验证时直接弹出滑块）。
            // 已验证或验证进行中时不重复弹出。
            const st = bar.getAttribute("data-state");
            if (st === "verified" || st === "verifying")
                return;
            openModal();
        },
    };
}
export const Phantom = { mount, version: VERSION };
/** 仅在浏览器环境且未占用 window.Phantom 时挂到全局，便于 script-tag 接入。 */
if (typeof window !== "undefined") {
    const w = window;
    if (!w.Phantom)
        w.Phantom = Phantom;
}
export default Phantom;
