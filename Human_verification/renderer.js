 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { CONFIG } from "./config.js";
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
         
        Object.defineProperty(this, "previewing", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "previewRafId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "previewStartTime", {
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
         
        Object.defineProperty(this, "targetParticleCount", {
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
        Object.defineProperty(this, "startCenter", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        this.canvas = canvas;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx)
            throw new Error("Canvas 2D 不可用");
        this.ctx = ctx;
        const boxArea = (2 * params.targetHalf) ** 2;
        this.targetParticleCount = Math.max(64, Math.floor(boxArea * CONFIG.particleDensity));
         
    }
    

    paintFullNoise(data) {
        paintFullNoisePure({ w: this.canvas.width, h: this.canvas.height, data });
    }
    
    // 从簇层视频首帧求「光点起始位置」（非黑像素质心）：预览闪烁方块据此定位。
    _captureStartCenter() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const v = this.video;
        if (!v || v.readyState < 2 || !v.videoWidth)
            return [w / 2, h / 2];
        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const octx = off.getContext("2d", { alpha: false });
        octx.drawImage(v, 0, 0, w, h);
        const d = octx.getImageData(0, 0, w, h).data;
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (d[(y * w + x) * 4] >= 8) {
                    sx += x;
                    sy += y;
                    n++;
                }
            }
        }
        return n ? [sx / n, sy / n] : [w / 2, h / 2];
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
            catch (e) { /* 分片 MP4 无索引时忽略 */ }
            const p = v.play();
            if (p && p.catch)
                p.catch(() => { });
        }
        const loop = () => {
            if (!this.running)
                return;
            const fallback = (performance.now() - this.startTime) / 1000 / this.params.duration;
            const t = Math.max(0, Math.min(v && v.duration ? v.currentTime / this.params.duration : fallback, 1));
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
    
    startPreview() {
        if (this.previewing)
            return;
        this.previewing = true;
        this.previewStartTime = performance.now();
        if (!this.startCenter)
            this.startCenter = this._captureStartCenter();
        const center = this.startCenter;
        const half = this.params.targetHalf;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const loop = () => {
            if (!this.previewing)
                return;
            const elapsed = (performance.now() - this.previewStartTime) / 1000;
             
            // 起始方块的"闪烁"只走【密度】，不再走【整块亮度】：
            //   - 每个像素取与全屏噪声同分布的随机灰度（0~255），再用 lighten（取较亮者）
            //     叠到噪声上 —— 合成方式与簇层 video 完全一致；
            //   - 旧实现给整块刷同一个灰度值（实心纯色方块），一眼就能和随机噪点区分开，
            //     等于白送一个"亮度阈值即可锁定方块"的指纹，故废弃。
            const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.75 * elapsed));
            const img = this.ctx.createImageData(w, h);
            const data = img.data;
             
            this.paintFullNoise(data);
             
             
            const left = center[0] - half;
            const top = center[1] - half;
            const size = 2 * half;
            for (let i = 0; i < this.targetParticleCount; i++) {
                if (Math.random() > pulse)
                    continue;
                const px = (left + Math.random() * size) | 0;
                const py = (top + Math.random() * size) | 0;
                if (px < 0 || px >= w || py < 0 || py >= h)
                    continue;
                const rv = (Math.random() * 256) | 0;
                const idx = (py * w + px) * 4;
                const v = rv > data[idx] ? rv : data[idx];
                data[idx] = v;
                data[idx + 1] = v;
                data[idx + 2] = v;
                data[idx + 3] = 255;
            }
            this.ctx.putImageData(img, 0, 0);
            this.previewRafId = requestAnimationFrame(loop);
        };
        this.previewRafId = requestAnimationFrame(loop);
    }
     
    stopPreview() {
        this.previewing = false;
        cancelAnimationFrame(this.previewRafId);
    }
     
    renderFrame(t) {
        const { ctx } = this;
         
         
        const w = this.canvas.width;
        const h = this.canvas.height;
         
        const img = ctx.createImageData(w, h);
        const data = img.data;
         
         
        this.paintFullNoise(data);
         
         
         
        ctx.putImageData(img, 0, 0);
        // 簇层视频为黑底 + 簇：黑处保留实时噪声，簇像素取较亮者（lighten）。
        const v = this.video;
        if (v && v.readyState >= 2 && v.videoWidth) {
            ctx.globalCompositeOperation = "lighten";
            ctx.drawImage(v, 0, 0, w, h);
            ctx.globalCompositeOperation = "source-over";
        }
    }
     
    drawStaticNoise() {
        const { ctx, canvas } = this;
        const w = canvas.width;
        const h = canvas.height;
        const img = ctx.createImageData(w, h);
        this.paintFullNoise(img.data);
        ctx.putImageData(img, 0, 0);
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
