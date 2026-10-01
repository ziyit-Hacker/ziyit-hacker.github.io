import { CONFIG, isMobileViewport } from "./config.js";
import { requestChallenge, requestPowChallenge, submitVerify, submitStreamChunk, verifyPow, videoChunk, videoReady, } from "./api.js";
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
 
 
 
 
 
const POW_WORKER_URL = new URL("./pow-worker.js", import.meta.url);

 
 
 
class PowTask {
    constructor() {
        this.worker = null;
        this.blobUrl = "";
        this.cancelled = false;
        this._reject = null;
    }
    async _spawn() {
        try {
            return new Worker(POW_WORKER_URL);
        }
        catch (e) {   }
        const res = await fetch(POW_WORKER_URL);
        if (!res.ok) {
            throw new Error(`pow worker fetch ${res.status}`);
        }
        const src = await res.text();
        this.blobUrl = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
        return new Worker(this.blobUrl);
    }
    async run(nonce, difficulty, onProgress) {
        const worker = await this._spawn();
        if (this.cancelled) {
            try { worker.terminate(); } catch (e) {   }
            throw new Error("pow cancelled");
        }
        this.worker = worker;
        return new Promise((resolve, reject) => {
            this._reject = reject;
            worker.addEventListener("message", (ev) => {
                const msg = ev && ev.data;
                if (!msg || this.cancelled) {
                    return;
                }
                if (msg.type === "progress") {
                    onProgress?.(msg);
                    return;
                }
                this._reject = null;
                this._dispose();
                if (msg.type === "solved") {
                    resolve({ solution: String(msg.solution), hashes: msg.hashes, solveMs: msg.solveMs });
                }
                else {
                    reject(new Error(msg.message || "pow solve failed"));
                }
            });
            worker.addEventListener("error", (e) => {
                this._reject = null;
                this._dispose();
                reject(new Error((e && e.message) || "pow worker error"));
            });
            worker.postMessage({ type: "solve", nonce, difficulty });
        });
    }
    _dispose() {
        if (this.worker) {
            try { this.worker.terminate(); } catch (e) {   }
            this.worker = null;
        }
        if (this.blobUrl) {
            try { URL.revokeObjectURL(this.blobUrl); } catch (e) {   }
            this.blobUrl = "";
        }
    }
    cancel() {
        this.cancelled = true;
        this._dispose();
        const reject = this._reject;
        this._reject = null;
        reject?.(new Error("pow cancelled"));
    }
}

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
         
        Object.defineProperty(this, "videoStream", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "mediaSource", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "sourceBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
         
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
            value: 50
        });
        this._readyAt = 0;
        this._autoRestarts = 0;
        this._autoRestarting = false;
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
         
        Object.defineProperty(this, "_streamAborted", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "_pullDone", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "_markFirstChunk", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
         
        Object.defineProperty(this, "_sessionClosed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
         
        Object.defineProperty(this, "_appendQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "_appending", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
         
         
        this.requiredMethods = [];
        this.powRequired = false;
         
        this._powTask = null;
        this._powAbort = null;
         
        this._a11ySwitched = false;
        this._powAltUnavailable = false;
        this._powChallengeId = "";
        this._powSessionId = "";
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
            if (this._a11ySwitched)
                return;
             
             
             
            const methods = (challenge && Array.isArray(challenge.requiredMethods)) ? challenge.requiredMethods : [];
            this.requiredMethods = methods;
            this.powRequired = methods.indexOf("pow") !== -1;
            const serverPub = await importServerPublic(challenge.serverPublicJwk);
            this.sessionKey = await deriveSessionKey(privateKey, serverPub, challenge.salt);
            this.challengeId = challenge.challengeId;
             
            const paramsJson = await decrypt(this.sessionKey, challenge.encryptedParams.iv, challenge.encryptedParams.ciphertext);
            const raw = JSON.parse(new TextDecoder().decode(paramsJson));
             
             
            const streamCfg = raw.stream || {};
            this.streamEnabled = !!streamCfg.enabled;
             
             
            this.streamIntervalMs = Number(streamCfg.intervalMs) > 0 ? Number(streamCfg.intervalMs) : 50;
            const videoEl = await this._prepareVideo(challenge);
             
            if (this._sessionClosed || this._a11ySwitched)
                return;
             
             
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
            if (e && e.code === "PLAYBACK_UNSUPPORTED") {
                 
                 
                this.status.textContent = "当前浏览器无法播放验证视频。请使用最新版 Chrome / Edge / Firefox / Safari 后重试。";
                this.setHint("blocked", "");
                this.turnIntoRetryButton();
            }
            else if (code === 429) {
                // 后端失败频控（PHANTOM_BLOCK_S 默认 60s）：文案与冷却时长对齐。
                this.status.textContent = "尝试次数过多，请约 1 分钟后重试";
                this.scheduleRetry(60000);
            }
            else if (code === 401) {
                 
                 
                this.status.textContent = "会话已刷新，正在重新取题…";
                this.scheduleRetry(800, "auto-restart");
            }
            else if (code === 403) {
                const cls = this._classify403(e);
                this.status.textContent = cls.text;
                if (cls.kind === "env" || cls.kind === "points") {
                    this.turnIntoRetryButton();
                }
                else {
                    this.scheduleRetry(800, "auto-restart");
                }
            }
            else if (code === 410) {
                 
                this.status.textContent = "验证已过期，正在重新取题…";
                this.scheduleRetry(800, "auto-restart");
            }
            else if (e && e.code === "VIDEO_TIMEOUT") {
                // v0.3.48：视频分包迟迟不到（慢链路 / 闸门抖动）→ 自动重新取题，而不是
                // 留一个"按了没反应"的画布让用户干等。
                this.status.textContent = "验证题加载超时，正在重新取题…";
                this.scheduleRetry(800, "auto-restart");
            }
            else {
                this.status.textContent = `初始化失败: ${e.message}`;
            }
        }
    }
    bindInteraction() {
        if (this._a11ySwitched)
            return;
         
         
         
        const onDown = (e) => {
            if (e.button !== 0)
                return;
            e.preventDefault();
            if (this.collecting || this.previewing || this.finished)
                return;
             
             
            this.tracker?.notePress(e);
             
            this.previewing = true;
            this.overlay.classList.add("phantom-hidden");
            this.setHint("preview", "手指/鼠标拖动到闪烁的方块等待");
             
             
            this.renderer?.start((_center, t) => {
                if (t >= 1)
                    this.setHint("stopped", "请松手");
            });
            armPreviewSwitch();
        };
         
         
         
         
        const beginCollect = () => {
            if (!this.previewing || this.finished)
                return;
            this.previewing = false;
            this.collecting = true;
            this.status.textContent = "";
            this.setHint("collect", "按住跟随方块移动");
            this.tracker?.start();
             
            this._startStream();
             
            this.activateBtn.classList.add("phantom-holding");
        };
         
         
         
        // v0.3.48：预览段 → 跟随段的切换改由【视频真实播放位置】驱动，不再用墙钟定时器。
        // 视频是"按下之后"才起播的：起播被慢链路拖慢时，墙钟会在起手提示段还没放完就切进
        // "跟随"，用户按着拖动看到的仍是提示段的整块方波闪烁（像在反复放预览），根本无法
        // 对齐方块。改用 v.currentTime 判定：播放到 previewSeconds 才进入跟随段；同时保留
        // 兜底超时（视频卡住 / 无视频元素时仍能进入跟随），不会一直按着没反应。
        const armPreviewSwitch = () => {
            window.clearTimeout(this.previewTimer);
            const startedAt = performance.now();
            const maxWaitMs = Math.max(8000, this.previewMs + 8000);
            // 先确认"视频确实从起手提示段开始播"（currentTime 落在 previewSeconds 之内），
            // 再等它越过 previewSeconds —— 否则可能读到上一次播放残留的 currentTime 而直接
            // 跳进跟随段。start() 已把 currentTime 归零，这里只是兜住 seek 尚未生效的瞬间。
            let fromStart = false;
            const fire = () => {
                this.previewTimer = 0;
                beginCollect();
            };
            const tick = () => {
                if (!this.previewing || this.finished)
                    return;
                const now = performance.now();
                const v = this.videoEl;
                if (!v) {
                    if (now - startedAt >= this.previewMs) {
                        fire();
                        return;
                    }
                }
                else {
                    const playedMs = v.currentTime * 1000;
                    if (!fromStart) {
                        if (playedMs < this.previewMs)
                            fromStart = true;
                    }
                    else if (playedMs >= this.previewMs) {
                        fire();
                        return;
                    }
                }
                if (now - startedAt >= maxWaitMs) {
                    fire();
                    return;
                }
                this.previewTimer = window.setTimeout(tick, 50);
            };
            this.previewTimer = window.setTimeout(tick, 50);
        };
        const onUp = async () => {
            if (this.finished)
                return;
             
             
            this.tracker?.noteRelease();
             
            if (this.previewing) {
                window.clearTimeout(this.previewTimer);
                this.previewing = false;
                 
                 
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
     
     
     
     
    async _prepareVideo(challenge) {
        const vs = challenge && challenge.videoStream;
        if (!vs || !vs.chunkCount) {
            throw new Error("挑战缺少分包视频信息");
        }
        this.videoStream = vs;
        const mime = vs.mime || challenge.videoMime || "video/mp4";
         
        const type = vs.codec ? `${mime}; codecs="${vs.codec}"` : mime;
         
         
        const ready = await videoReady(this.apiBase, this.challengeId, this.sessionId);
        this._readyAt = performance.now();
        if (!ready || ready.ready !== true) {
            throw new Error("视频尚未就绪，请重试");
        }
         
         
        let mseOk = false;
        try {
            mseOk = typeof MediaSource !== "undefined" && !!MediaSource.isTypeSupported(type);
        }
        catch (e) {
            mseOk = false;
        }
        if (!mseOk) {
            return await this._prepareVideoFallback(mime, ready);
        }
        const ms = new MediaSource();
        const url = URL.createObjectURL(ms);
        const v = document.createElement("video");
        v.src = url;
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("playsinline", "");
        v.preload = "auto";
         
         
        v.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
        this.canvas.parentElement?.appendChild(v);
        this.videoEl = v;
        this.videoUrl = url;
        this.mediaSource = ms;
        try {
            await new Promise((resolve, reject) => {
                if (ms.readyState === "open")
                    return resolve();
                ms.addEventListener("sourceopen", () => resolve(), { once: true });
                window.setTimeout(() => reject(new Error("MediaSource 打开超时")), 5000);
            });
             
            this.sourceBuffer = ms.addSourceBuffer(type);
        }
        catch (e) {
             
            v.remove();
            URL.revokeObjectURL(url);
            this.videoEl = null;
            this.videoUrl = "";
            this.mediaSource = null;
            this.sourceBuffer = null;
            return await this._prepareVideoFallback(mime, ready);
        }
         
         
        this._streamAborted = false;
        let markFirst, failFirst;
        const firstChunk = new Promise((resolve, reject) => {
            markFirst = resolve;
            failFirst = reject;
        });
         
        this._markFirstChunk = (err) => {
            const fn = err ? failFirst : markFirst;
            this._markFirstChunk = null;
            fn?.(err);
        };
        firstChunk.catch(() => { });
        this._pullDone = this._pullChunks(ready).catch((e) => {
            this._markFirstChunk?.(e);
            if (this._streamAborted)
                return;
             
            this.status.textContent = "视频流中断，请重新验证";
            this.onError(e);
        });
         
        await Promise.race([
            firstChunk,
            new Promise((resolve) => window.setTimeout(resolve, 5000)),
        ]);
         
        await new Promise((resolve) => {
            if (v.readyState >= 1)
                return resolve();
            const done = () => resolve();
            v.addEventListener("loadedmetadata", done, { once: true });
            v.addEventListener("durationchange", done, { once: true });
            v.addEventListener("error", done, { once: true });
            window.setTimeout(done, 5000);
        });
         
        await this._waitBuffered(ready);
        await this._waitPlayable(v);
        return v;
    }
     
    // v0.3.48：放行"按住验证"按钮前，最后确认一次视频【真有可播画面】。旧实现的两处等待
    // （首包 5s、缓冲 8s）都带超时兜底，超时后照样返回 → 用户按下后对着黑屏干等首帧
    // 到达，误以为验证坏了。这里分三种情况：
    //   - readyState ≥ 2 且已知尺寸 → 已就绪，放行；
    //   - 只有元数据但【确有缓冲】→ 放行（部分浏览器在 play() 前停在 readyState=1，
    //     数据在就一定会解码，不能误判成"流没来"而弹重试）；
    //   - 连缓冲都没有 → 再等 extraMs；仍没有则抛 VIDEO_TIMEOUT，交给上层自动重取题。
    _waitPlayable(v, extraMs = 6000) {
        return new Promise((resolve, reject) => {
            const started = performance.now();
            const hasBuffered = () => {
                const sb = this.sourceBuffer;
                try {
                    return !!sb && sb.buffered.length > 0
                        && sb.buffered.end(sb.buffered.length - 1) > 0;
                }
                catch (e) {
                    return false;
                }
            };
            const tick = () => {
                if (this._streamAborted || this._sessionClosed)
                    return resolve();
                if ((v.readyState >= 2 && v.videoWidth) || hasBuffered())
                    return resolve();
                if (performance.now() - started >= extraMs) {
                    const err = new Error("验证视频加载超时");
                    err.status = 0;
                    err.code = "VIDEO_TIMEOUT";
                    return reject(err);
                }
                window.setTimeout(tick, 80);
            };
            tick();
        });
    }
     
     
    _waitBuffered(ready) {
        const sb = this.sourceBuffer;
        if (!sb || this._streamAborted)
            return Promise.resolve();
        const totalMs = Number((ready && ready.durationMs) || (this.videoStream && this.videoStream.durationMs) || 0);
        const want = Number(ready && ready.minPrefetch);
        const target = Number.isFinite(want) && want > 0
            ? Math.min(want, totalMs > 0 ? totalMs / 1000 : want)
            : (totalMs > 0 ? Math.min(3, totalMs / 1000) : 3);
        return new Promise((resolve) => {
            const started = performance.now();
            const tick = () => {
                if (this._streamAborted)
                    return resolve();
                let buffered = 0;
                try {
                    if (sb.buffered.length)
                        buffered = sb.buffered.end(sb.buffered.length - 1);
                }
                catch (e) {   }
                if (buffered >= target)
                    return resolve();
                if (performance.now() - started >= 8000)
                    return resolve();
                window.setTimeout(tick, 60);
            };
            tick();
        });
    }
     
     
    _backoff(attempt, isConflict) {
        const base = isConflict ? 300 : 200;
        const ms = Math.min(base * Math.pow(2, Math.max(0, attempt - 1)), 2000);
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }
     
     
     
     
     
    async _prepareVideoFallback(mime, ready) {
        this._streamAborted = false;
        this.status.textContent = "正在下载验证题…";
        const total = Number(ready.chunkCount || this.videoStream?.chunkCount || 0);
        const limit = total > 0 ? total : Number.MAX_SAFE_INTEGER;
        const parts = [];
        const win = this._chunkWindow(ready);
        const waitFor = this._chunkGate(ready);
        let index = 0;
        let retried = 0;
        while (index < limit) {
            if (this._streamAborted)
                throw new Error("视频下载已中止");
            await waitFor(index);
             
             
            const batch = [];
            for (let i = index; i < Math.min(limit, index + win); i++) {
                batch.push(videoChunk(this.apiBase, this.challengeId, i, this.sessionId));
            }
            let list;
            try {
                list = await Promise.all(batch);
            }
            catch (e) {
                 
                 
                if (retried < 6) {
                    retried++;
                    await this._backoff(retried, e && e.status === 409);
                    continue;
                }
                throw e;
            }
            retried = 0;
            let done = false;
            for (const chunk of list) {
                parts.push(this._decodeChunk(chunk.data));
                if (chunk.final) {
                    done = true;
                    break;
                }
            }
            index += list.length;
            if (done)
                break;
        }
        const size = parts.reduce((n, p) => n + p.length, 0);
        if (!size)
            throw this._playbackUnsupported("视频分包为空");
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const p of parts) {
            bytes.set(p, offset);
            offset += p.length;
        }
        let url = "";
        let v = null;
        try {
            const blob = new Blob([bytes], { type: mime });
            url = URL.createObjectURL(blob);
            v = document.createElement("video");
            v.src = url;
            v.muted = true;
            v.playsInline = true;
            v.setAttribute("playsinline", "");
            v.preload = "auto";
             
            v.style.cssText = "position:absolute;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;";
            this.canvas.parentElement?.appendChild(v);
            this.videoEl = v;
            this.videoUrl = url;
            this.mediaSource = null;
            this.sourceBuffer = null;
             
            await new Promise((resolve, reject) => {
                if (v.readyState >= 1)
                    return resolve();
                const done = () => resolve();
                v.addEventListener("loadedmetadata", done, { once: true });
                v.addEventListener("durationchange", done, { once: true });
                v.addEventListener("error", () => reject(this._playbackUnsupported("视频无法解码")), { once: true });
                window.setTimeout(done, 8000);
            });
            if (!v.videoWidth || !v.duration)
                throw this._playbackUnsupported("视频元数据不可用");
        }
        catch (e) {
            if (v)
                v.remove();
            if (url)
                URL.revokeObjectURL(url);
            this.videoEl = null;
            this.videoUrl = "";
            throw e.code === "PLAYBACK_UNSUPPORTED" ? e : this._playbackUnsupported(e && e.message);
        }
        this.status.textContent = "";
        return v;
    }
    _playbackUnsupported(message) {
        const err = new Error(message || "当前浏览器无法播放该视频编码");
        err.status = 0;
        err.code = "PLAYBACK_UNSUPPORTED";
        return err;
    }
     
     
     
     
     
     
    _chunkWindow(ready) {
        const w = Number(ready && ready.window);
        return Number.isFinite(w) && w >= 1 ? Math.floor(w) : 1;
    }
     
    _chunkGate(ready) {
        const chunkMs = Number(ready && ready.chunkDurationMs)
            || (Number(ready && ready.durationMs) / Math.max(1, Number(ready && ready.chunkCount))) || 33;
        const leadMs = Math.max(0, Number((ready && ready.minPrefetch) ?? 3) * 1000);
        const readyAt = this._readyAt || performance.now();
        return (idx) => {
            const due = readyAt + idx * chunkMs - leadMs;
            const ms = due - performance.now();
            return ms > 0 ? new Promise((resolve) => window.setTimeout(resolve, ms)) : Promise.resolve();
        };
    }
    async _pullChunks(ready) {
        const total = Number(ready.chunkCount || this.videoStream?.chunkCount || 0);
        const limit = total > 0 ? total : Number.MAX_SAFE_INTEGER;
        const win = this._chunkWindow(ready);
        const waitFor = this._chunkGate(ready);
        let index = 0;
        let retried = 0;
        let first = true;
        const appendErrors = [];
        while (index < limit) {
            if (this._streamAborted)
                return;
            if (appendErrors.length)
                throw appendErrors[0];
            await waitFor(index);
             
             
            const batch = [];
            for (let i = index; i < Math.min(limit, index + win); i++) {
                batch.push(videoChunk(this.apiBase, this.challengeId, i, this.sessionId));
            }
            let list;
            try {
                list = await Promise.all(batch);
            }
            catch (e) {
                 
                 
                if (retried < 6) {
                    retried++;
                    await this._backoff(retried, e && e.status === 409);
                    continue;
                }
                throw e;
            }
            retried = 0;
            for (const chunk of list) {
                if (this._streamAborted)
                    return;
                const appended = this._enqueueAppend(this._decodeChunk(chunk.data));
                appended.catch((e) => appendErrors.push(e));
                if (first) {
                    first = false;
                     
                    appended.then(() => this._markFirstChunk?.(), (e) => this._markFirstChunk?.(e));
                }
                if (chunk.final) {
                     
                    await appended.catch(() => { });
                    if (appendErrors.length)
                        throw appendErrors[0];
                    const ms = this.mediaSource;
                    if (ms && ms.readyState === "open") {
                        try {
                            ms.endOfStream();
                        }
                        catch (e) {   }
                    }
                    return;
                }
            }
            index += list.length;
        }
    }
     
     
     
     
    _enqueueAppend(bytes) {
        return new Promise((resolve, reject) => {
            this._appendQueue.push({ bytes, resolve, reject });
            this._pumpAppend();
        });
    }
    _pumpAppend() {
        if (this._appending)
            return;
        const sb = this.sourceBuffer;
        const item = this._appendQueue.shift();
        if (!sb || !item)
            return;
        this._appending = true;
        const onEnd = () => {
            sb.removeEventListener("updateend", onEnd);
            this._appending = false;
            item.resolve();
            this._pumpAppend();
        };
        sb.addEventListener("updateend", onEnd);
        try {
            sb.appendBuffer(item.bytes);
        }
        catch (e) {
            sb.removeEventListener("updateend", onEnd);
            this._appending = false;
            item.reject(e);
            this._pumpAppend();
        }
    }
    _decodeChunk(base64) {
        const bin = atob(base64 || "");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
    }
     
     
     
     
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
             
             
             
             
            if (this.powRequired && result.receipt) {
                const powReceipt = await this._runPowPhase();
                if (!powReceipt) {
                     
                    this.renderer?.stop();
                    this.status.textContent = "安全校验未完成，请重试";
                    this.activateBtn.classList.add("phantom-fail");
                    this.activateBtn.textContent = "验证未完成";
                    this.scheduleRetry();
                    return;
                }
                result.receipts = [result.receipt, powReceipt];
            }
             
             
             
             
            if (result.passed === null || result.passed === undefined) {
                this.status.textContent = result.receipt ? "验证完成，正在确认结果…" : "正在确认验证结果…";
            }
             
            const confirmed = (await this.onResult(result)) !== false;
            this.status.textContent = "";
            if (confirmed) {
                 
                this.activateBtn.classList.add("phantom-success");
                this.activateBtn.textContent = "验证通过";
            }
            else {
                 
                this.activateBtn.classList.add("phantom-fail");
                this.activateBtn.textContent = "验证失败";
                this.scheduleRetry();
            }
        }
        catch (e) {
            this.renderer?.stop();
            this.finished = true;
            const code = (e && e.status) || 0;
            this.activateBtn.classList.add("phantom-fail");
            if (code === 429) {
                // 后端失败频控（PHANTOM_BLOCK_S 默认 60s）：文案与冷却时长对齐。
                this.status.textContent = "尝试次数过多，请约 1 分钟后重试";
                this.activateBtn.textContent = "尝试次数过多";
                this.scheduleRetry(60000);
            }
            else if (code === 410) {
                 
                this.status.textContent = "验证已失效，请重新滑动";
                this.activateBtn.textContent = "验证已失效";
                this.scheduleRetry(800, "auto-restart");
            }
            else if (code === 401) {
                 
                 
                this.status.textContent = "会话已刷新，正在重新验证…";
                this.activateBtn.textContent = "正在重试";
                this.scheduleRetry(800, "auto-restart");
            }
            else if (code === 403) {
                const cls = this._classify403(e);
                this.status.textContent = cls.text;
                this.activateBtn.textContent = cls.kind === "points"
                    ? "点数不足"
                    : (cls.kind === "env" ? "环境校验未通过" : "正在重新取题");
                if (cls.kind === "env" || cls.kind === "points") {
                    this.turnIntoRetryButton();
                }
                else {
                    this.scheduleRetry(800, "auto-restart");
                }
            }
            else {
                 
                this.status.textContent = "提交失败";
                this.activateBtn.textContent = "验证失败";
                this.scheduleRetry();
            }
            this.onError(e);
        }
    }
    

     
     
     
     
     
     
     
     
    async _runPowPhase(a11y = false) {
        const btn = this.activateBtn;
        const label = document.createElement("span");
        label.textContent = "按住完成安全校验";
        const bar = document.createElement("span");
        bar.className = "phantom-progress";
        btn.textContent = "";
        btn.appendChild(label);
        btn.appendChild(bar);
         
        btn.style.setProperty("--ph-charge-duration", "8s");
        btn.disabled = false;
        this.renderer?.drawStaticNoise();
        this.setHint("ready", "按住下方按钮完成安全校验");

        let challenge = null;
        this._powAltUnavailable = false;
        const load = async () => {
            try {
                challenge = await requestPowChallenge(this.apiBase, a11y);
            }
            catch (e) {
                challenge = null;
            }
            if (challenge) {
                this._powChallengeId = challenge.challengeId || "";
                this._powSessionId = challenge.sessionId || "";
            }
            return !!challenge;
        };

        try {
            if (!(await load())) {
                this.status.textContent = "安全校验暂不可用，请稍后重试";
                this.setHint("blocked", "");
                return null;
            }
            if (a11y && Array.isArray(challenge.requiredMethods)
                && challenge.requiredMethods.indexOf("phantom") !== -1) {
                this._powAltUnavailable = true;
                this.setHint("blocked", "");
                return null;
            }
            for (;;) {
                if (this._sessionClosed)
                    return null;
                const attempt = await this._awaitPowAttempt(challenge);
                if (this._sessionClosed || attempt.failed)
                    return null;
                if (attempt.released) {
                     
                    if (!(await load())) {
                        this.status.textContent = "安全校验暂不可用，请稍后重试";
                        this.setHint("blocked", "");
                        return null;
                    }
                    this.status.textContent = "已放弃，请重新按住";
                    continue;
                }
                try {
                     
                     
                    const res = await verifyPow(this.apiBase, challenge.challengeId, attempt.solution, challenge.sessionId);
                    if (res && res.receipt) {
                        btn.classList.remove("phantom-holding");
                        this.status.textContent = "";
                        return res.receipt;
                    }
                }
                catch (e) {
                     
                     
                }
                if (!(await load())) {
                    this.status.textContent = "安全校验暂不可用，请稍后重试";
                    this.setHint("blocked", "");
                    return null;
                }
                btn.classList.remove("phantom-holding");
                this.setHint("ready", "按住下方按钮完成安全校验");
                this.status.textContent = "校验未通过，请再试一次";
            }
        }
        finally {
            const abort = this._powAbort;
            this._powAbort = null;
            abort?.();
            this._powTask?.cancel();
            this._powTask = null;
        }
    }
     
     
    _awaitPowAttempt(challenge) {
        const btn = this.activateBtn;
        return new Promise((resolve) => {
            const task = new PowTask();
            this._powTask = task;
            let solving = false;
            let settled = false;
            let fails = 0;
            const finish = (out) => {
                if (settled)
                    return;
                settled = true;
                this._powAbort = null;
                btn.removeEventListener("pointerdown", onDown);
                window.removeEventListener("pointerup", onUp);
                resolve(out);
            };
             
            this._powAbort = () => finish({ failed: true });
            const onDown = (e) => {
                if (e.button !== 0 || solving || btn.disabled)
                    return;
                e.preventDefault();
                solving = true;
                btn.classList.add("phantom-holding");
                this.status.textContent = "正在校验…";
                task.run(challenge.nonce, challenge.difficulty).then((out) => {
                    if (!solving)
                        return;    
                    solving = false;
                    finish({ solution: out.solution });
                }).catch(() => {
                    if (!solving)
                        return;
                    solving = false;
                    btn.classList.remove("phantom-holding");
                     
                    if (++fails >= 2) {
                        finish({ failed: true });
                        return;
                    }
                    this.status.textContent = "校验失败，请重新按住";
                });
            };
            const onUp = () => {
                if (!solving)
                    return;
                solving = false;
                btn.classList.remove("phantom-holding");
                task.cancel();
                finish({ released: true });
            };
            btn.addEventListener("pointerdown", onDown);
            window.addEventListener("pointerup", onUp);
        });
    }

    async switchToPow() {
        if (this._a11ySwitched || this.finished || this._sessionClosed)
            return false;
        this._a11ySwitched = true;
        this._unbind?.();
        this._unbind = () => { };
        this.renderer?.pause();
        this.overlay.classList.add("phantom-hidden");
        this.activateBtn.classList.remove("phantom-holding");
        this.setHint("ready", "");
        let receipt = null;
        try {
            receipt = await this._runPowPhase(true);
        }
        catch (e) {
            receipt = null;
        }
        if (this._sessionClosed)
            return true;
        if (!receipt) {
            this.status.textContent = this._powAltUnavailable
                ? "当前验证暂不支持无障碍替代方式"
                : "安全校验未完成，请重试";
            this.turnIntoRetryButton();
            this._a11ySwitched = false;
            return false;
        }
        const result = {
            receipt,
            receipts: [receipt],
            challengeId: this._powChallengeId || this.challengeId,
            sessionId: this._powSessionId || this.sessionId,
        };
        const confirmed = (await this.onResult(result)) !== false;
        this.status.textContent = "";
        if (confirmed) {
            this.activateBtn.classList.add("phantom-success");
            this.activateBtn.textContent = "验证通过";
        }
        else {
            this.activateBtn.classList.add("phantom-fail");
            this.activateBtn.textContent = "验证失败";
        }
        return true;
    }

    _classify403(e) {
        let d = e && e.body ? e.body.detail : undefined;
        if (d == null && e)
            d = e.detail;
        if (typeof d === "string") {
            const s = d.trim();
            if (s.charAt(0) === "{" || s.charAt(0) === "[") {
                try {
                    d = JSON.parse(s);
                }
                catch (err) {
                    d = s;
                }
            }
        }
        if (d && typeof d === "object") {
            const points = Number(d.points);
            const need = Number(d.minRequired);
            if (Number.isFinite(points) || Number.isFinite(need)) {
                const fmt = (n) => Number.isFinite(n) ? String(Math.round(n * 100) / 100) : "?";
                return { kind: "points", text: `点数不足（当前 ${fmt(points)} / 需要 ${fmt(need)} 点）` };
            }
            d = String(d.reason || d.detail || d.error || "");
        }
        const s = String(d == null ? "" : d);
        if (/binding\s*mismatch/i.test(s))
            return { kind: "binding", text: "网络环境变化，正在重新验证…" };
        if (/environment/i.test(s))
            return { kind: "env", text: "浏览器环境校验未通过，请更换浏览器后重试" };
        if (/insufficient|点数不足|quota|balance/i.test(s))
            return { kind: "points", text: "点数不足，请先补充点数后重试" };
        return { kind: "unknown", text: "环境校验未通过，正在重新取题…" };
    }
    scheduleRetry(delayMs, mode) {
        window.clearTimeout(this.retryTimer);
        const auto = mode === "auto-restart";
        if (auto) {
            this._autoRestarts = (this._autoRestarts || 0) + 1;
            if (this._autoRestarts > 3) {
                this.turnIntoRetryButton();
                this.status.textContent = "验证暂时不可用，请点击刷新重试";
                return;
            }
        }
        this.retryTimer = window.setTimeout(() => {
            if (auto) {
                this._autoRestarting = true;
                this.turnIntoRetryButton();
                this.activateBtn.click();  
                this._autoRestarting = false;
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
            if (!this._autoRestarting)
                this._autoRestarts = 0;
            this.onRetry();
        };
        this.activateBtn.addEventListener("click", onClick);
         
        this._unbind = () => {
            this.activateBtn.removeEventListener("click", onClick);
            this.activateBtn.classList.remove("phantom-retry");
        };
    }
    destroy() {
        this._sessionClosed = true;
        this._unbind();
         
         
        const powAbort = this._powAbort;
        this._powAbort = null;
        powAbort?.();
        this._powTask?.cancel();
        this._powTask = null;
        window.clearTimeout(this.retryTimer);
        window.clearTimeout(this.previewTimer);
        window.clearInterval(this.streamTimer);
        this.streamTimer = 0;
         
        this._streamAborted = true;
        this._markFirstChunk?.();
        this._markFirstChunk = null;
        this._pullDone = null;
         
        const pending = this._appendQueue.splice(0, this._appendQueue.length);
        this._appending = false;
        pending.forEach((it) => it.reject(new Error("session destroyed")));
        this.renderer?.stop();
        this.tracker?.stop();
         
        if (this.mediaSource && this.sourceBuffer) {
            try {
                if (this.mediaSource.readyState === "open") {
                    this.mediaSource.removeSourceBuffer(this.sourceBuffer);
                }
            }
            catch (e) {   }
        }
        this.sourceBuffer = null;
        if (this.mediaSource && this.mediaSource.readyState === "open") {
            try {
                this.mediaSource.endOfStream();
            }
            catch (e) {   }
        }
        this.mediaSource = null;
        this.videoStream = null;
         
        if (this.videoEl) {
            try {
                this.videoEl.pause();
            }
            catch (e) {   }
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
         
         
        const a11y = document.createElement("div");
        a11y.className = "phantom-a11y-help";
        a11y.style.cssText = "margin-top:10px;font-size:12px;line-height:1.6;text-align:center;opacity:.75;";
        a11y.appendChild(document.createTextNode("无障碍用户（低视力 / 色觉障碍 / 运动障碍）无法完成本验证？"));
        a11y.appendChild(document.createTextNode(" "));
        const a11yBtn = document.createElement("button");
        a11yBtn.type = "button";
        a11yBtn.className = "phantom-a11y-switch";
        a11yBtn.style.cssText = "border:0;background:transparent;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;";
        a11yBtn.textContent = "换一种方式验证";
        a11y.appendChild(a11yBtn);
        body.appendChild(a11y);
        modalCard.appendChild(head);
        modalCard.appendChild(body);
        return { hint, canvas, overlay, activateBtn, status, progress, a11yBtn };
    };
     
     
     
     
     
     
     
     
    const dispatch = async (r) => {
        if (r.passed === false || (!r.receipt && r.passed !== true)) {
            opts.onFail?.(r);
            return false;
        }
        return (await opts.onSuccess?.(r)) !== false;
    };
    const handleResult = async (r) => {
        const ok = await dispatch(r);
        if (ok)
            onVerified();
        return ok;
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
        const { hint, canvas, overlay, activateBtn, status, progress, a11yBtn } = buildModalBody(modalCard);
         
        node.addEventListener("click", (e) => {
            if (e.target === node)
                closeModal(false);
        });
        modalCard.addEventListener("click", (e) => e.stopPropagation());
        document.body.appendChild(node);
         
         
        const resetSession = () => {
            // v0.3.48：重建会话前必须先销毁旧会话。旧实现直接 new WidgetSession 覆盖变量，
            // 旧会话的 _pullChunks 拉流循环 / streamTimer / 那个 1px <video> 元素都会滞留
            // （持续占后端取片额度、DOM 元素越堆越多），自动重取题时会不断累积。
            try {
                session?.destroy();
            }
            catch (e) {   }
            activateBtn.classList.remove("phantom-holding", "phantom-success", "phantom-fail", "phantom-retry");
            activateBtn.textContent = "按住并跟随方块";
            activateBtn.appendChild(progress);
            activateBtn.disabled = true;
            status.textContent = "正在准备验证题…";
            session = new WidgetSession(canvas, opts.apiBase, status, overlay, hint, activateBtn, 
             
            handleResult, (e) => opts.onError?.(e), resetSession);
            // 同步 modal.session 指向新会话：closeModal 用的是 modal.session，若不同步，
            // 关闭弹窗时销毁的仍是旧会话，而当前会话的拉流 / 定时器会继续跑下去。
            if (modal)
                modal.session = session;
            void session.start();
        };
        let session = new WidgetSession(canvas, opts.apiBase, status, overlay, hint, activateBtn, handleResult, (e) => opts.onError?.(e), resetSession);
        a11yBtn.addEventListener("click", () => {
            if (a11yBtn.disabled)
                return;
            a11yBtn.disabled = true;
            void session.switchToPow().then((handled) => {
                if (!handled)
                    a11yBtn.disabled = false;
            }, () => {
                a11yBtn.disabled = false;
            });
        });
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
