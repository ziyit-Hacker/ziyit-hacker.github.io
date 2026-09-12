 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
import { paintFullNoise as paintFullNoisePure } from "./particles.js";

// 视频簇层为「黑底 + 前景（簇 / 起手提示方块 / 静止诱饵块）」：只有亮度 > 此阈值的
// 像素才算前景、才【原值覆盖】到噪声上。取 8 是给 H.264 的黑底振铃留余量（编码器在
// 方块边缘会残留 1~3 级亮度，不能当成前景）。
//
// v0.3.5：起手提示段（起点处黑↔白翻转的方块）与静止诱饵块都由【后端渲染进视频】，
// 前端不再自己画预览方块、也不再撒诱饵——只做「实时噪声 + 视频前景原值覆盖」。
// 提示段的暗态刻意取近黑 24（> 本阈值）：若用纯黑 0 会被当成黑底而透出实时噪声，
// 暗态就彻底看不见了。
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
         
    }
    

    paintFullNoise(data) {
        paintFullNoisePure({ w: this.canvas.width, h: this.canvas.height, data });
    }
    
    // 从头播放视频（含 previewSeconds 秒起手提示段）并逐帧合成：实时噪声 + 视频前景
    // 原值覆盖。提示段的闪烁方块、跟随段的移动簇、整段的静止诱饵块全都在这条视频里，
    // 前端只负责把噪声垫在底下 —— 不再自己画方块、也不再从首帧反推起点。
    //
    // t 是【跟随段进度】(0~1)：视频时间先减去提示段时长再归一。提示段期间 t 恒为 0
    // （提示方块就画在起点，与跟随段首帧的簇位置重合），到底后由 onTick 收到 t=1。
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
        const dur = this.params.duration || 1;
        const preview = this.params.previewSeconds || 0;
        const loop = () => {
            if (!this.running)
                return;
            // 无视频（降级）时退化为纯墙钟计时，同样以提示段后的时刻为 0。
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
     
    renderFrame(t) {
        const { ctx } = this;
         
         
        const w = this.canvas.width;
        const h = this.canvas.height;
         
        const img = ctx.createImageData(w, h);
        const data = img.data;
         
         
        this.paintFullNoise(data);
         
        // 视频为「黑底 + 前景」（前景 = 提示段方块 / 跟随段簇 / 静止诱饵块，三者都是
        // 后端渲染的）：把「非黑像素」的**原值**覆盖到噪声上，黑底保留实时噪声。
        // 为什么不用 lighten（取较亮者）：max(噪声, 前景值) 会把前景区的亮度分布整体
        // 抬高（均值 170 对背景 127.5），单帧截图用亮度阈值就能把方块框出来。改成原值
        // 覆盖后，前景区的像素分布与噪声**同分布**（都是 0~255 均匀），单帧截图零信号
        // —— 人眼能看见移动簇，靠的是「该处像素逐帧保持不变、周围噪声逐帧重掷」这个
        // 时域差异加上方块在移动（视觉残留/运动感知那一类），而不是靠亮度。
        // （提示段的方块是明示引导，本就该被一眼看到，不参与这条"零信号"设定。）
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
