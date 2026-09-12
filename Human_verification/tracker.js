export class TrajectoryTracker {
    constructor(canvas) {
        Object.defineProperty(this, "canvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: canvas
        });
        Object.defineProperty(this, "samples", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "active", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "rect", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
         
        Object.defineProperty(this, "touchActive", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "onMove", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.rect)
                    return;
                 
                 
                if (this.touchActive)
                    return;
                const [x, y] = this.mapToCanvas(e.clientX, e.clientY);
                this.samples.push([x, y, performance.now()]);
            }
        });
        Object.defineProperty(this, "onTouchStart", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active)
                    return;
                 
                this.touchActive = true;
                if (e.cancelable)
                    e.preventDefault();
                const touch = e.touches[0];
                if (!touch || !this.rect)
                    return;
                const [x, y] = this.mapToCanvas(touch.clientX, touch.clientY);
                this.samples.push([x, y, performance.now()]);
            }
        });
        Object.defineProperty(this, "onTouchMove", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.rect)
                    return;
                 
                 
                if (e.cancelable)
                    e.preventDefault();
                const touch = e.touches[0];
                if (!touch)
                    return;
                const [x, y] = this.mapToCanvas(touch.clientX, touch.clientY);
                this.samples.push([x, y, performance.now()]);
            }
        });
        Object.defineProperty(this, "onTouchEnd", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active)
                    return;
                if (e.cancelable)
                    e.preventDefault();
                 
                this.touchActive = false;
            }
        });
    }
    start() {
        this.active = true;
        this.samples = [];
        this.touchActive = false;
        this.rect = this.canvas.getBoundingClientRect();
        this.bind();
    }
    

    mapToCanvas(clientX, clientY) {
        if (!this.rect)
            return [clientX, clientY];
        const scaleX = this.canvas.width / this.rect.width;
        const scaleY = this.canvas.height / this.rect.height;
        const x = (clientX - this.rect.left) * scaleX;
        const y = (clientY - this.rect.top) * scaleY;
        const cx = Math.max(0, Math.min(this.canvas.width - 1, Math.round(x)));
        const cy = Math.max(0, Math.min(this.canvas.height - 1, Math.round(y)));
        return [cx, cy];
    }
    bind() {
         
        window.addEventListener("pointermove", this.onMove, { passive: true });
         
        window.addEventListener("touchstart", this.onTouchStart, { passive: false });
        window.addEventListener("touchmove", this.onTouchMove, { passive: false });
        window.addEventListener("touchend", this.onTouchEnd, { passive: false });
        window.addEventListener("touchcancel", this.onTouchEnd, { passive: false });
    }
    stop() {
        this.active = false;
        window.removeEventListener("pointermove", this.onMove);
        window.removeEventListener("touchstart", this.onTouchStart);
        window.removeEventListener("touchmove", this.onTouchMove);
        window.removeEventListener("touchend", this.onTouchEnd);
        window.removeEventListener("touchcancel", this.onTouchEnd);
         
         
         
         
        const W = this.canvas.width;
        const H = this.canvas.height;
        const cleaned = this.samples.filter(([x, y, t]) => Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(t) &&
            x >= 0 && y >= 0 && x < W && y < H);
         
        return cleaned;
    }
    // v0.3.3 实时流：取回【自 index 起】新增的采样点（只含 x/y，报给后端做同源比对）。
    // 只读不删——完整轨迹仍由 stop() 一次性交出，这里仅是"增量切片"。
    takeSince(index) {
        const from = Math.max(0, index | 0);
        const out = [];
        for (let i = from; i < this.samples.length; i++) {
            const s = this.samples[i];
            out.push([s[0], s[1]]);
        }
        return out;
    }
    get lastPointT() {
        return this.samples.length
            ? this.samples[this.samples.length - 1][2]
            : 0;
    }
}
