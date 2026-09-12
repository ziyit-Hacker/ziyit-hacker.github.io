 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { CONFIG } from "./config.js";
import { paintFullNoise as paintFullNoisePure } from "./particles.js";
 
// 起始方块（预览阶段"闪烁的方块"）的两态参数：1.5Hz 方波，两态都铺满整块。
// 暗态纯黑 0 / 亮态纯白 255 —— 与噪声均值 127.5 上下各差一半，跨度过得比旧版
// （正弦扑动的 25~255）还大，方块像在原地"黑白翻转"，一眼就能看到。频率也从
// 0.75Hz 提到 1.5Hz：预览窗口只有 2 秒，旧设置整个窗口只闪一次半，容易整场漏掉。
// 这里【有意放弃了单帧零信号】：提示块是明示引导，用户按住后必须立刻看见它；
// 隐蔽性只对挑战阶段那个"移动方块"有意义（那边仍是原值覆盖，单帧与噪声同分布）。
// 起点本身也不是秘密 —— 视频首帧 K 条候选完全重合于该点，拿到视频就能算出它。
const FLASH_HZ = 1.5;
const FLASH_DUTY = 0.55;
const FLASH_DARK = 0;
const FLASH_BRIGHT = 255;
// 视频簇层为「黑底 + 簇」：只有亮度 > 此阈值的像素才算簇、才覆盖到噪声上。
// 取 8 与 _captureStartCenter 同一判据；H.264 会让黑底残留 1~3 级振铃，不能算簇。
const CLUSTER_THRESHOLD = 8;
// 静止诱饵块数量：在噪声层额外撒几块「与真方块单帧完全同构」的静止块（见 _buildDecoys）。
const DECOY_COUNT = 3;

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
        Object.defineProperty(this, "decoys", {
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
    // 视频还没解出首帧（readyState 不到 2）或首帧全黑时返回 null，【不谎报画布中心】
    // —— 位置错了用户会盯着一个永远不会出现方块的地方等，比"这一帧先不闪"更糟。
    // 预览循环会逐帧重试，视频一就绪就闪在真正的起点（K 条候选首帧完全重合处）。
    _captureStartCenter() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const v = this.video;
        if (!v || v.readyState < 2 || !v.videoWidth)
            return null;
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
        return n ? [sx / n, sy / n] : null;
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
        const half = this.params.targetHalf;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const size = 2 * half;
        let tries = 0;
        let fallback = null;
        const loop = () => {
            if (!this.previewing)
                return;
            // 起点逐帧解析：视频首帧还没解出来时这一帧不画方块（宁可晚闪几帧，也不能
            // 闪错地方）。取到的真起点才写缓存；连续 45 帧（约 0.75s）仍取不到时才用
            // 画布中心临时兜底 —— 且兜底值【不写缓存】，视频一就绪就自动纠正回真起点，
            // 不会被"错误的位置"永久记住。
            if (!this.startCenter) {
                this.startCenter = this._captureStartCenter();
                if (!this.startCenter && ++tries > 45)
                    fallback = fallback || [w / 2, h / 2];
            }
            const center = this.startCenter || fallback;
            const left = center ? center[0] - half : 0;
            const top = center ? center[1] - half : 0;
            const elapsed = (performance.now() - this.previewStartTime) / 1000;
            // 方波：亮半周期 / 暗半周期，两态泾渭分明（旧的 [0.35,1] 连续 pulse 只是
            // 缓慢呼吸，不够"闪"；现在是整块黑白翻转）。
            const on = (elapsed * FLASH_HZ) % 1 < FLASH_DUTY;
            const img = this.ctx.createImageData(w, h);
            const data = img.data;
             
            this.paintFullNoise(data);
             
            // 两态都铺满整块（不用稀疏粒子：旧写法只有约 45% 覆盖，亮态均值才 172、
            // 暗态还漏了一半噪声，明暗对比撑不起来）。整块纯黑 ↔ 整块纯白。
            if (center) {
                const value = on ? FLASH_BRIGHT : FLASH_DARK;
                const x0 = Math.max(0, left);
                const y0 = Math.max(0, top);
                const x1 = Math.min(w, left + size);
                const y1 = Math.min(h, top + size);
                for (let py = y0; py < y1; py++) {
                    let idx = (py * w + x0) * 4;
                    for (let px = x0; px < x1; px++) {
                        data[idx] = value;
                        data[idx + 1] = value;
                        data[idx + 2] = value;
                        data[idx + 3] = 255;
                        idx += 4;
                    }
                }
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
     
    // 取簇层视频「当前帧」的像素（离屏 canvas 复用，避免每帧新建）。
    // 视频与画布同为 480×480，drawImage 是 1:1 blit；willReadFrequently 让这块
    // 走软件光栅，省掉每帧 GPU→CPU 回读的同步开销。
    _videoFramePixels(w, h) {
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
        octx.drawImage(this.video, 0, 0, w, h);
        return octx.getImageData(0, 0, w, h).data;
    }
    
    // 生成静止诱饵块（每个 challenge 一次，此后位置与像素值固定不变）。
    // 与真方块（视频簇）在【单帧】内完全同构：同样大小的方框（±targetHalf）、同样
    // 数量的孤立随机像素（targetParticleCount 个）、灰度同为 1~255 均匀、位置同样
    // 在框内随机 —— 于是任何单帧、任何单帧阈值/形态学检测看到的都是 N+1 个一模一样
    // 的块，分不出哪个是真的。唯一差别在时域：真方块逐帧刚性平移，诱饵块一动不动。
    // 诱饵的像素值必须逐帧固定：若每帧重掷，机器只要判「逐帧取值稳定」就能把诱饵
    // 筛掉，等于白加。
    _buildDecoys() {
        if (this.decoys)
            return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const half = this.params.targetHalf;
        const size = 2 * half;
        const n = this.targetParticleCount;
        const list = [];
        for (let k = 0; k < DECOY_COUNT; k++) {
            // 随机落框，尽量彼此不重叠（真方块会移动，无法预先避让，靠绘制顺序兜底）
            let bx = 0;
            let by = 0;
            for (let tries = 0; tries < 24; tries++) {
                bx = Math.random() * Math.max(1, w - size);
                by = Math.random() * Math.max(1, h - size);
                if (list.every(d => Math.abs(d.bx - bx) >= size || Math.abs(d.by - by) >= size))
                    break;
            }
            const px = new Int32Array(n);
            const py = new Int32Array(n);
            const pv = new Uint8Array(n);
            for (let i = 0; i < n; i++) {
                px[i] = (bx + Math.random() * size) | 0;
                py[i] = (by + Math.random() * size) | 0;
                pv[i] = 1 + ((Math.random() * 255) | 0);
            }
            list.push({ bx, by, px, py, pv });
        }
        this.decoys = list;
    }

    // 把诱饵块【原值覆盖】到噪声上 —— 与真簇同一套合成方式（不能用 lighten：那会把
    // 诱饵区亮度整体抬高，单帧阈值一卡就把它和真方块区分开了）。
    // 必须在簇层覆盖【之前】调用：否则真簇经过此处时，像素会被诱饵的固定值抹掉。
    _drawDecoys(data) {
        this._buildDecoys();
        const w = this.canvas.width;
        const h = this.canvas.height;
        for (const d of this.decoys) {
            for (let i = 0; i < d.px.length; i++) {
                const x = d.px[i];
                const y = d.py[i];
                if (x < 0 || x >= w || y < 0 || y >= h)
                    continue;
                const idx = (y * w + x) * 4;
                const v = d.pv[i];
                data[idx] = v;
                data[idx + 1] = v;
                data[idx + 2] = v;
                data[idx + 3] = 255;
            }
        }
    }

    renderFrame(t) {
        const { ctx } = this;
         
         
        const w = this.canvas.width;
        const h = this.canvas.height;
         
        const img = ctx.createImageData(w, h);
        const data = img.data;
         
         
        this.paintFullNoise(data);
         
        // 静止诱饵块（单帧与真方块同构、时域上不动）：先画，随后簇层覆盖压在上面，
        // 保证真簇像素永远不被诱饵抹掉。
        this._drawDecoys(data);
         
        // 簇层视频为黑底 + 簇：把「非黑像素」（= 簇）的**原值**覆盖到噪声上，黑底保留
        // 实时噪声。为什么不用 lighten（取较亮者）：max(噪声, 簇值) 会把簇区的亮度分布
        // 整体抬高（均值 170 对背景 127.5），单帧截图用亮度阈值就能把方块框出来。
        // 改成原值覆盖后，簇区的像素分布与噪声**同分布**（都是 0~255 均匀），
        // 单帧截图零信号 —— 人眼能看见它，靠的是「簇像素逐帧保持不变、周围噪声逐帧重掷」
        // 这个时域差异加上方块在移动（视觉残留/运动感知那一类），而不是靠亮度。
        const v = this.video;
        if (v && v.readyState >= 2 && v.videoWidth) {
            const vd = this._videoFramePixels(w, h);
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
