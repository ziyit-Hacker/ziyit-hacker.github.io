 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { paintFullNoise as paintFullNoisePure } from "./particles.js";

 
 
 
 
 
 
 
 
const CLUSTER_THRESHOLD = 8;

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
         
        Object.defineProperty(this, "videoFrameCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "videoFrameCtx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
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
        this._lastVideoTime = -1;
        this._videoPixels = null;
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
     
     
     
     
    _videoFramePixels(v, w, h) {
        if (!this.videoFrameCanvas) {
            this.videoFrameCanvas = document.createElement("canvas");
            this.videoFrameCanvas.width = w;
            this.videoFrameCanvas.height = h;
            this.videoFrameCtx = this.videoFrameCanvas.getContext("2d", {
                alpha: false,
                willReadFrequently: true
            });
        }
        const octx = this.videoFrameCtx;
        if (!octx)
            return null;
        if (this._videoPixels && this._lastVideoTime === v.currentTime)
            return this._videoPixels;
        octx.drawImage(v, 0, 0, w, h);
        const px = octx.getImageData(0, 0, w, h).data;
        this._lastVideoTime = v.currentTime;
        this._videoPixels = px;
        return px;
    }
     
    renderFrame(t) {
        const { ctx } = this;
        const w = this.canvas.width;
        const h = this.canvas.height;
        let img = this._img;
        if (!img || img.width !== w || img.height !== h) {
            img = ctx.createImageData(w, h);
            this._img = img;
            this._lastVideoTime = -1;
            this._videoPixels = null;
        }
        const data = img.data;
        this.paintFullNoise(data);
        const v = this.video;
        if (v && v.readyState >= 2 && v.videoWidth) {
            const vd = this._videoFramePixels(v, w, h);
            if (vd) {
                const len = data.length;
                for (let i = 0; i < len; i += 4) {
                    const vv = vd[i];
                    if (vv > CLUSTER_THRESHOLD) {
                        data[i] = vv;
                        data[i + 1] = vd[i + 1];
                        data[i + 2] = vd[i + 2];
                    }
                }
            }
        }
        ctx.putImageData(img, 0, 0);
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
