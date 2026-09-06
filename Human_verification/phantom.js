 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { CONFIG, isMobileViewport } from "./config.js";
import { requestChallenge, submitVerify, } from "./api.js";
import { decrypt, deriveSessionKey, encrypt, generateClientKeyPair, importServerPublic, } from "./crypto.js";
import { installAntidebug } from "./antidebug.js";
import { PhantomRenderer } from "./renderer.js";
import { TrajectoryTracker } from "./tracker.js";
import { injectStyles } from "./styles.js";

import { collectEnvEvidence } from "./env.js";
 
import { deriveBezierPath } from "./prng.min.js";
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
            this.renderer?.startPreview();
            this.previewTimer = window.setTimeout(beginCollect, PREVIEW_MS);
        };
         
         
         
        const beginCollect = () => {
            if (!this.previewing || this.finished)
                return;
            this.previewing = false;
            this.collecting = true;
            this.status.textContent = "";
            this.setHint("collect", "按住跟随方块移动");
            this.renderer?.stopPreview();
             
            this.renderer?.start((_center, t) => {
                if (t >= 1)
                    this.setHint("stopped", "请松手");
            });
            this.tracker?.start();
             
            this.activateBtn.classList.add("phantom-holding");
        };
        const onUp = () => {
            if (this.finished)
                return;
             
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
             
            this.activateBtn.classList.remove("phantom-holding");
            this.renderer?.pause();
            this.setHint("done", "");
            const samples = this.tracker?.stop() ?? [];
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
        this.previewing = false;
        this.renderer?.stopPreview();
        this.renderer?.stop();
        this.tracker?.stop();
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
