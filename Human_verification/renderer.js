import { paintFullNoise as paintFullNoisePure } from "./particles.js";
export class PhantomRenderer {
    constructor(canvas, params) {
        Object.defineProperty(this, "params", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: params
        });
        Object.defineProperty(this, "ctx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "rafId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "running", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "startTime", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
         
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
         
        Object.defineProperty(this, "video", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: params.video || null
        });
        this.canvas = canvas;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx)
            throw new Error("Canvas 2D 不可用");
        this.ctx = ctx;
         
        this._img = null;
        this._noiseCanvas = null;
        this._noiseCtx = null;
    }
    

    paintFullNoise(data) {
        paintFullNoisePure({ w: this.canvas.width, h: this.canvas.height, data });
    }
    
     
     
     
     
     
     
    start(onTick) {
        if (this.running)
            return;
        this.running = true;
        this.startTime = performance.now();
        const v = this.video;
        if (v) {
            try {
                v.currentTime = 0;
            }
            catch (e) {   }
            const p = v.play();
            if (p && p.catch)
                p.catch(() => { });
        }
        const dur = this.params.duration || 1;
        const preview = this.params.previewSeconds || 0;
        const loop = () => {
            if (!this.running)
                return;
             
            const elapsed = v && v.duration
                ? v.currentTime
                : (performance.now() - this.startTime) / 1000;
            const t = Math.max(0, Math.min((elapsed - preview) / dur, 1));
            this.renderFrame(t);
            onTick?.(null, t);
            if (t >= 1) {
                this.running = false;
                if (v)
                    v.pause();
                return;
            }
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }
     
    renderFrame(t) {
        const { ctx } = this;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const v = this.video;
        if (v && v.readyState >= 2 && v.videoWidth) {
            // v0.3.47：后端已把整屏画面（噪点底噪 + 簇）渲染好，前端原样播放这一帧即可。
            // 必须用【最近邻】放大（imageSmoothingEnabled=false）：双线性插值会把簇像素
            // 糊到相邻像素上、形成一块可见的模糊斑块，单帧零信号当场失效。
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(v, 0, 0, w, h);
            return;
        }
        // v0.3.48：视频帧还没就绪（慢链路首帧未到 / 播放中偶发掉帧）时铺【本地整屏噪点】，
        // 不再铺纯黑。旧做法（前端自画噪点）任何时刻都有画面；改成"整屏后端出"后若铺黑，
        // 用户会在"按下 → 首帧到达"这段里对着黑屏干等，误以为验证坏了。
        this._paintLocalNoise();
    }
     
    // v0.3.48：本地噪点的生成栅格与后端渲染的视频【同分辨率】（VIDEO_RENDER_SCALE 缩放后
    // 的尺寸），再最近邻放大到画布 —— 两种画面颗粒度一致，切换时不再有肉眼可见的
    // "换分辨率"跳变。取不到视频尺寸（无视频 / PoW 阶段）时退回画布原生分辨率。
    _noiseGrid() {
        const v = this.video;
        const gw = v && v.videoWidth ? v.videoWidth : this.canvas.width;
        const gh = v && v.videoHeight ? v.videoHeight : this.canvas.height;
        return [gw, gh];
    }
    _paintLocalNoise() {
        const { ctx, canvas } = this;
        const [gw, gh] = this._noiseGrid();
        if (!this._img || this._img.width !== gw || this._img.height !== gh) {
            this._img = ctx.createImageData(gw, gh);
        }
        if (!this._noiseCanvas || this._noiseCanvas.width !== gw || this._noiseCanvas.height !== gh) {
            const nc = document.createElement("canvas");
            nc.width = gw;
            nc.height = gh;
            this._noiseCanvas = nc;
            this._noiseCtx = nc.getContext("2d");
        }
        this.paintFullNoise(this._img.data);
        this._noiseCtx.putImageData(this._img, 0, 0);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this._noiseCanvas, 0, 0, canvas.width, canvas.height);
    }
    drawStaticNoise() {
        this._paintLocalNoise();
    }
     
    pause() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
        this.video?.pause();
        this.drawStaticNoise();
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
        this.video?.pause();
    }
}
