 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { paintFullNoise as paintFullNoisePure } from "./particles.js";

 
 
 
 
 
 
 
 
// v0.3.47：后端已把整屏（噪点底噪 + 簇）渲染好，前端只负责【原样播放】这一整幅画面，
// 不再本地画噪点、也不再做"亮度阈值覆盖"合成（原 CLUSTER_THRESHOLD 常量随之移除）。

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
        // 视频还没解码出首帧：先铺黑，避免露出上一帧残留。
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
    }
     
    drawStaticNoise() {
        const { ctx, canvas } = this;
        const w = canvas.width;
        const h = canvas.height;
        if (!this._img || this._img.width !== w || this._img.height !== h) {
            this._img = ctx.createImageData(w, h);
        }
        this.paintFullNoise(this._img.data);
        ctx.putImageData(this._img, 0, 0);
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
