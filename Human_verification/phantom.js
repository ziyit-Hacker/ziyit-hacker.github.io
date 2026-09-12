import { CONFIG, isMobileViewport } from "./config.js";
import { requestChallenge, submitVerify, submitStreamChunk, } from "./api.js";
import { decrypt, deriveSessionKey, encrypt, generateClientKeyPair, importServerPublic, } from "./crypto.js";
import { installAntidebug } from "./antidebug.js";
import { PhantomRenderer } from "./renderer.js";
import { TrajectoryTracker } from "./tracker.js";
import { injectStyles } from "./styles.js";

import { collectEnvEvidence } from "./env.js";
const VERSION = "0.1.0";


const PREVIEW_MS = CONFIG.previewSeconds * 1000;


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
 
function resolveContainer(el) {
    const node = typeof el === "string" ? document.querySelector(el) : el;
    if (!(node instanceof HTMLElement)) {
        throw new Error(`Phantom.mount: 容器未找到 (${el})`);
    }
    return node;
}
 
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
        // 起手提示段时长（毫秒）：由 /challenge 的加密 params 下发（视频开头就是这段，
        // 前端按住即从 0 秒整段播、按同一时长切"提示 → 跟随"）。默认取本地 CONFIG 兜底。
        Object.defineProperty(this, "previewMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: PREVIEW_MS
        });
         
        Object.defineProperty(this, "duration", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 3
        });
         
        Object.defineProperty(this, "retryTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        

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
        Object.defineProperty(this, "videoEl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "videoUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ""
        });
        // v0.3.3 实时流：开关与节奏由 /challenge 的加密 params 下发（阈值在后端）。
        Object.defineProperty(this, "streamEnabled", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "streamIntervalMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 400
        });
        Object.defineProperty(this, "streamTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "streamSeq", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "streamCursor", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
    }
     
    setHint(stage, text) {
        this.hint.setAttribute("data-stage", stage);
        this.hint.textContent = text;
    }
    async start() {
         
         
         
        const mobile = isMobileViewport();
        this.device = mobile ? "mobile" : "pc";
        this.canvas.width = mobile ? CONFIG.canvasWidthMobile : CONFIG.canvasWidthPC;
        this.canvas.height = mobile ? CONFIG.canvasHeightMobile : CONFIG.canvasHeightPC;
        this.status.textContent = "正在准备验证题…";
         
        this.overlay.classList.add("phantom-hidden");
        this.setHint("loading", "");
        this.activateBtn.disabled = true;
        try {
             
            const { privateKey, publicJwk } = await generateClientKeyPair();
            const challenge = await requestChallenge(this.apiBase, publicJwk, this.device);
            if (challenge && challenge.sessionId)
                this.sessionId = challenge.sessionId;
            const serverPub = await importServerPublic(challenge.serverPublicJwk);
            this.sessionKey = await deriveSessionKey(privateKey, serverPub, challenge.salt);
            this.challengeId = challenge.challengeId;
             
            const paramsJson = await decrypt(this.sessionKey, challenge.encryptedParams.iv, challenge.encryptedParams.ciphertext);
            const raw = JSON.parse(new TextDecoder().decode(paramsJson));
             
             
            const streamCfg = raw.stream || {};
            this.streamEnabled = !!streamCfg.enabled;
            this.streamIntervalMs = Number(streamCfg.intervalMs) > 0 ? Number(streamCfg.intervalMs) : 400;
            const videoEl = await this._prepareVideo(challenge);
            // previewSeconds 由后端下发且与"视频里真实存在的提示段长度"同源，
            // 不用本地 CONFIG 硬编码，避免前后端漂移导致切割点落在提示段中间。
            const previewSeconds = Number(raw.previewSeconds) > 0
                ? Number(raw.previewSeconds)
                : CONFIG.previewSeconds;
            this.previewMs = previewSeconds * 1000;
            const params = {
                video: videoEl,
                duration: raw.duration,
                previewSeconds,
                fps: raw.fps,
                targetHalf: raw.targetHalf,
            };
            this.duration = params.duration;
            this.renderer = new PhantomRenderer(this.canvas, params);
            this.tracker = new TrajectoryTracker(this.canvas);
             
             
            this.activateBtn.style.setProperty("--ph-charge-duration", `${this.duration}s`);
            this.status.textContent = "";
            this.setHint("ready", "按住下方按钮");
            this.activateBtn.disabled = false;
            this.renderer.drawStaticNoise();
             
            this.overlay.classList.remove("phantom-hidden");
            this.bindInteraction();
        }
        catch (e) {
            this.onError(e);
            const code = (e && e.status) || 0;
            if (code === 429) {
                 
                this.status.textContent = "尝试次数过多，请稍后再试";
                this.scheduleRetry(60000);
            }
            else {
                this.status.textContent = `初始化失败: ${e.message}`;
            }
        }
    }
    bindInteraction() {
         
         
         
        const onDown = (e) => {
            if (e.button !== 0)
                return;
            e.preventDefault();
            if (this.collecting || this.previewing || this.finished)
                return;
             
             
            this.previewing = true;
            this.overlay.classList.add("phantom-hidden");
            this.setHint("preview", "手指/鼠标拖动到闪烁的方块等待");
            // v0.3.5：视频【自带头 previewMs 的起手提示段】，按住即从 0 秒整段播 ——
            // 闪烁方块、随后移动的簇、整段的静止诱饵块全在视频里，前端只负责垫噪声。
            this.renderer?.start((_center, t) => {
                if (t >= 1)
                    this.setHint("stopped", "请松手");
            });
            this.previewTimer = window.setTimeout(beginCollect, this.previewMs);
        };
         
         
         
        // 提示段结束：从这一刻起才真正开始记轨迹（视频仍在继续播跟随段）。
        const beginCollect = () => {
            if (!this.previewing || this.finished)
                return;
            this.previewing = false;
            this.collecting = true;
            this.status.textContent = "";
            this.setHint("collect", "按住跟随方块移动");
            this.tracker?.start();
            // v0.3.3：从开始采集（≈视频进入跟随段）起，按后端下发的节奏持续上报采样点。
            this._startStream();
             
            this.activateBtn.classList.add("phantom-holding");
        };
        const onUp = async () => {
            if (this.finished)
                return;
             
            if (this.previewing) {
                window.clearTimeout(this.previewTimer);
                this.previewing = false;
                // 提示段就松手：暂停视频（停在当前帧）并画回静态噪声，等用户重新按住——
                // 下次按下会从 0 秒重新播，起点提示重来一遍。
                this.renderer?.pause();
                this.status.textContent = "";
                this.setHint("ready", "按住下方按钮并马上拖动到方块");
                return;
            }
            if (!this.collecting)
                return;
            this.collecting = false;
             
            this.activateBtn.classList.remove("phantom-holding");
            this.renderer?.pause();
            this.setHint("done", "");
            // 先停采集（此后不再有新点），再补发最后一批流，最后才提交完整轨迹——
            // 保证流覆盖到轨迹末尾，且流批次一定先于 /verify 到达服务端。
            const samples = this.tracker?.stop() ?? [];
            await this._stopStream();
            void this.verifyAndFinish(samples);
        };
        this.activateBtn.addEventListener("pointerdown", onDown);
        window.addEventListener("pointerup", onUp);
         
         
         
        const onSelectStart = (e) => e.preventDefault();
        document.addEventListener("selectstart", onSelectStart, { capture: true });
        document.addEventListener("dragstart", onSelectStart, { capture: true });
         
        this._unbind = () => {
            this.activateBtn.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointerup", onUp);
            document.removeEventListener("selectstart", onSelectStart, { capture: true });
            document.removeEventListener("dragstart", onSelectStart, { capture: true });
        };
    }
    // v0.3.0：正确轨迹不再下发。后端把「光点沿控制点行进时的粒子簇」渲染成 MP4
    // （黑底 + 簇）内嵌在 /challenge 响应里，前端把它当簇层与实时噪声叠加。
    async _prepareVideo(challenge) {
        if (!challenge || !challenge.video) {
            throw new Error("挑战缺少验证视频");
        }
        const mime = challenge.videoMime || "video/mp4";
        const bin = atob(challenge.video);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.preload = "auto";
        // 挂进 DOM（透明且不接收事件）：部分移动端浏览器要求视频在文档内才允许
        // canvas.drawImage 取帧；关闭弹窗时随节点一并销毁。
        v.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
        this.canvas.parentElement?.appendChild(v);
        await new Promise((resolve) => {
            if (v.readyState >= 2)
                return resolve();
            const done = () => resolve();
            v.addEventListener("loadeddata", done, { once: true });
            v.addEventListener("error", done, { once: true });
            window.setTimeout(done, 3000);
        });
        this.videoEl = v;
        this.videoUrl = url;
        return v;
    }
    // ---- v0.3.3 实时流上报 ----
    // 目的：把"松手后一次性提交整段轨迹"改成"边画边报"。服务端只信每批次的【到达
    // 墙钟时刻】与"流内容确是最终轨迹的保序子序列"，因此离线抠帧→拟合→一次性回放
    // 的路径被堵死，对手必须真做实时 CV。批次内不含任何自报时间戳（不采信）。
    _startStream() {
        if (!this.streamEnabled || !this.sessionKey || !this.challengeId)
            return;
        this.streamSeq = 0;
        this.streamCursor = 0;
        window.clearInterval(this.streamTimer);
        this.streamTimer = window.setInterval(() => {
            void this._flushStream();
        }, this.streamIntervalMs);
    }
    async _flushStream() {
        if (!this.streamEnabled || !this.sessionKey || !this.challengeId)
            return;
        const points = this.tracker?.takeSince(this.streamCursor) ?? [];
        // 游标推进必须在 await 之前（同步完成），否则并发批次会重复取点。
        this.streamCursor += points.length;
        if (!points.length)
            return;
        const seq = ++this.streamSeq;
        try {
            const plaintext = new TextEncoder().encode(JSON.stringify({ seq, points }));
            const { iv, ciphertext } = await encrypt(this.sessionKey, plaintext);
            await submitStreamChunk(this.apiBase, this.challengeId, this.sessionId, iv, ciphertext);
        }
        catch (e) {
            // 实时流只作"留证"：丢一批不影响用户继续验证，静默忽略。
        }
    }
    async _stopStream() {
        window.clearInterval(this.streamTimer);
        this.streamTimer = 0;
        await this._flushStream();
    }
    async verifyAndFinish(samples) {
        if (!this.sessionKey)
            return;
         
         
        const envEvidence = collectEnvEvidence();
        if (envEvidence && envEvidence.gated) {
            this.finished = true;
            this.activateBtn.classList.remove("phantom-holding");
            this.activateBtn.disabled = true;
            this.status.textContent = "检测到自动化工具环境，已中止验证";
            this.setHint("blocked", "");
            const err = new Error("browser automation environment detected");
            err.status = 0;
            err.code = "ENV_AUTOMATION";
            err.detail = "automation environment detected";
            this.onError(err);
            return;
        }
         
         
         
         
        const payload = {
            points: samples,
            lastPointT_ms: Date.now(),
            env: (envEvidence && envEvidence.env) || undefined,
            // v0.3.8 多维行为特征：指针进出画布 / 失焦 / 按压起止 / 多点触控 /
            // 合并事件数。后端只做"硬矛盾否决 + 轻权重"，未上报（老浏览器）按中性处理。
            beh: this.tracker?.getBehavior() || undefined,
        };
        const plaintext = new TextEncoder().encode(JSON.stringify(payload));
        const { iv, ciphertext } = await encrypt(this.sessionKey, plaintext);
        try {
             
            const result = await submitVerify(this.apiBase, this.challengeId, this.sessionId, iv, ciphertext);
            this.renderer?.stop();
            this.finished = true;
            this.status.textContent = "";
             
             
            result.challengeId = this.challengeId;
            result.sessionId = this.sessionId;
            if (result.passed) {
                 
                this.activateBtn.classList.add("phantom-success");
                this.activateBtn.textContent = "验证通过";
            }
            else {
                 
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
                 
                this.status.textContent = "尝试次数过多，请稍后再试";
                this.activateBtn.textContent = "尝试次数过多";
                this.scheduleRetry(60000);
            }
            else if (code === 410) {
                 
                this.status.textContent = "验证已失效，请重新滑动";
                this.activateBtn.textContent = "验证已失效";
                this.scheduleRetry(800, "auto-restart");
            }
            else {
                 
                this.status.textContent = "提交失败";
                this.activateBtn.textContent = "验证失败";
                this.scheduleRetry();
            }
            this.onError(e);
        }
    }
    

    scheduleRetry(delayMs, mode) {
        window.clearTimeout(this.retryTimer);
        this.retryTimer = window.setTimeout(() => {
            if (mode === "auto-restart") {
                this.turnIntoRetryButton();
                this.activateBtn.click();  
            }
            else {
                this.turnIntoRetryButton();
            }
        }, delayMs || 1000);
    }
     
    turnIntoRetryButton() {
        this._unbind();
        this._unbind = () => { };
         
        this.activateBtn.classList.remove("phantom-holding", "phantom-success", "phantom-fail");
        this.activateBtn.classList.add("phantom-retry");
        this.activateBtn.textContent = "点击刷新重试";
        this.activateBtn.disabled = false;
        const onClick = () => {
            this.activateBtn.removeEventListener("click", onClick);
            this.onRetry();
        };
        this.activateBtn.addEventListener("click", onClick);
         
        this._unbind = () => {
            this.activateBtn.removeEventListener("click", onClick);
            this.activateBtn.classList.remove("phantom-retry");
        };
    }
    destroy() {
        this._unbind();
        window.clearTimeout(this.retryTimer);
        window.clearTimeout(this.previewTimer);
        window.clearInterval(this.streamTimer);
        this.streamTimer = 0;
        this.renderer?.stop();
        this.tracker?.stop();
        // 释放前端侧视频资源：暂停 + 脱离 DOM + 撤销 Blob URL，避免内存泄漏。
        if (this.videoEl) {
            try {
                this.videoEl.pause();
            }
            catch (e) { /* ignore */ }
            this.videoEl.removeAttribute("src");
            this.videoEl.remove();
            this.videoEl = null;
        }
        if (this.videoUrl) {
            URL.revokeObjectURL(this.videoUrl);
            this.videoUrl = "";
        }
    }
}


export function mount(el, opts) {
    injectStyles();
     
    if (opts.antidebug ?? true) {
        installAntidebug(true);
    }
    const container = resolveContainer(el);
     
    container.innerHTML = "";
    const root = document.createElement("div");
    root.className = "phantom-widget";
    root.setAttribute("data-theme", opts.theme ?? "dark");
     
    const bar = document.createElement("div");
    bar.className = "phantom-bar";
    bar.setAttribute("data-state", "idle");
    bar.setAttribute("role", "checkbox");
    bar.setAttribute("aria-checked", "false");
    bar.tabIndex = 0;
    bar.title = "点击进行人机验证";
    const check = document.createElement("span");
    check.className = "phantom-check";
     
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
     
     
    let modal = null;
     
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
             
            check.innerHTML = "";
            barText.textContent = "我不是机器人";
        }
    };
     
    const buildModalBody = (modalCard) => {
         
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
         
        const body = document.createElement("div");
        body.className = "phantom-modal-body";
         
        const hint = document.createElement("div");
        hint.className = "phantom-hint";
        hint.setAttribute("data-stage", "loading");
         
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
     
    const openModal = () => {
        if (modal)
            return;  
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
         
        node.addEventListener("click", (e) => {
            if (e.target === node)
                closeModal(false);
        });
        modalCard.addEventListener("click", (e) => e.stopPropagation());
        document.body.appendChild(node);
         
         
        const resetSession = () => {
            activateBtn.classList.remove("phantom-holding", "phantom-success", "phantom-fail", "phantom-retry");
            activateBtn.textContent = "按住并跟随方块";
            activateBtn.appendChild(progress);
            activateBtn.disabled = true;
            status.textContent = "正在准备验证题…";
            session = new WidgetSession(canvas, opts.apiBase, status, overlay, hint, activateBtn, 
             
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
    

    const closeModal = (verified) => {
        if (!modal || modal.closing)
            return;
        modal.closing = true;
        modal.session.destroy();
         
        const node = modal.node;
        const finalize = () => {
            node.remove();
        };
        node.classList.add("phantom-leaving");
         
        window.setTimeout(finalize, 160);
        modal = null;
        setBarState(verified ? "verified" : "idle");
    };
    

    const onVerified = () => {
        window.setTimeout(() => closeModal(true), 700);
    };
     
    const onBarClick = () => {
        if (bar.getAttribute("data-state") === "verified")
            return;  
        if (bar.getAttribute("data-state") === "verifying")
            return;  
        openModal();
    };
    bar.addEventListener("click", onBarClick);
     
    bar.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onBarClick();
        }
    });
    return {
        destroy() {
             
            if (modal) {
                modal.session.destroy();
                modal.node.remove();
                modal = null;
            }
            bar.removeEventListener("click", onBarClick);
            root.remove();
        },
        reset() {
             
             
            closeModal(false);
            setBarState("idle");
        },
        open() {
             
             
            const st = bar.getAttribute("data-state");
            if (st === "verified" || st === "verifying")
                return;
            openModal();
        },
    };
}
export const Phantom = { mount, version: VERSION };
 
if (typeof window !== "undefined") {
    const w = window;
    if (!w.Phantom)
        w.Phantom = Phantom;
}
export default Phantom;
