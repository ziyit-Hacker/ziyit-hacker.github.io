 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { CONFIG } from "./config.js";
import { makeCluster, paintFullNoise as paintFullNoisePure, stampCluster as stampClusterPure, } from "./particles.js";
 
function bezierAt(cp, t) {
    const u = 1 - t;
    const x = u * u * u * cp[0][0] +
        3 * u * u * t * cp[1][0] +
        3 * u * t * t * cp[2][0] +
        t * t * t * cp[3][0];
    const y = u * u * u * cp[0][1] +
        3 * u * u * t * cp[1][1] +
        3 * u * t * t * cp[2][1] +
        t * t * t * cp[3][1];
    return [x, y];
}
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
        

        Object.defineProperty(this, "particles", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.canvas = canvas;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx)
            throw new Error("Canvas 2D 不可用");
        this.ctx = ctx;
        const boxArea = (2 * params.targetHalf) ** 2;
        this.targetParticleCount = Math.max(64, Math.floor(boxArea * CONFIG.particleDensity));
         
        this.particles = makeCluster(this.targetParticleCount, params.targetHalf);
    }
    

    paintFullNoise(data) {
        paintFullNoisePure({ w: this.canvas.width, h: this.canvas.height, data });
    }
     
    start(onTick) {
        if (this.running)
            return;
        this.running = true;
        this.startTime = performance.now();
        const loop = (now) => {
            if (!this.running)
                return;
            const elapsed = (now - this.startTime) / 1000;
            const t = Math.min(elapsed / this.params.duration, 1);
            this.renderFrame(t);
            const center = bezierAt(this.params.controlPoints, t);
            onTick?.(center, t);
            if (t >= 1) {
                this.running = false;
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
        const center = bezierAt(this.params.controlPoints, 0);
        const half = this.params.targetHalf;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const loop = () => {
            if (!this.previewing)
                return;
            const elapsed = (performance.now() - this.previewStartTime) / 1000;
             
            const brightnessScale = 0.55 + 0.45 * Math.sin(2 * Math.PI * 0.75 * elapsed);
            const img = this.ctx.createImageData(w, h);
            const data = img.data;
             
            this.paintFullNoise(data);
             
             
            const left = center[0] - half;
            const top = center[1] - half;
            const size = 2 * half;
            for (let i = 0; i < this.targetParticleCount; i++) {
                if (Math.random() < CONFIG.particleDropRate)
                    continue;
                const px = (left + Math.random() * size) | 0;
                const py = (top + Math.random() * size) | 0;
                if (px < 0 || px >= w || py < 0 || py >= h)
                    continue;
                const v = Math.min(255, (Math.max(0.1, brightnessScale) * 255) | 0);
                const idx = (py * w + px) * 4;
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
         
         
         
        const center = bezierAt(this.params.controlPoints, t);
        stampClusterPure({ w, h, data }, this.particles, center, CONFIG.particleTargetGain, CONFIG.particleDropRate);
        ctx.putImageData(img, 0, 0);
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
        this.drawStaticNoise();
    }
    stop() {
        this.running = false;
        cancelAnimationFrame(this.rafId);
    }
}
