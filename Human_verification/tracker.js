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
        // v0.3.8 多维行为特征：这些计数只为"留证"，不参与画线。
        // 判定要点：真人必定先进画布、必有按压、move 事件数与采样点同源；纯脚本
        // 灌进来的坐标没有对应的事件。为避免误伤，enter/leave 按【几何位置】统计
        // 而不是监听 canvas 的 pointerenter——拖拽是从按钮上按下再拖进画布的，
        // 且触摸时浏览器会把指针隐式捕获在按钮上，canvas 级监听根本收不到事件。
        Object.defineProperty(this, "beh", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "insideCanvas", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "activePointers", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "onPointerDownWin", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.beh)
                    return;
                this.beh.downCount++;
                if (e.pointerType)
                    this.beh.pointerType = e.pointerType;
                this.activePointers.add(e.pointerId);
                this.beh.maxPointers = Math.max(this.beh.maxPointers, this.activePointers.size);
            }
        });
        Object.defineProperty(this, "onPointerUpWin", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.beh)
                    return;
                this.beh.upCount++;
                this.activePointers.delete(e.pointerId);
            }
        });
        Object.defineProperty(this, "onPointerCancelWin", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.beh)
                    return;
                this.beh.cancelCount++;
                this.activePointers.delete(e.pointerId);
            }
        });
        Object.defineProperty(this, "onBlurWin", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                if (!this.active || !this.beh)
                    return;
                this.beh.blurCount++;
            }
        });
        Object.defineProperty(this, "onMove", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active || !this.rect)
                    return;
                 
                 
                if (this.beh) {
                    this.beh.moveCount++;
                    if (e.pointerType)
                        this.beh.pointerType = e.pointerType;
                    // getCoalescedEvents()：真实设备在两次 rAF 之间会有多个中间点被
                    // 合并投递；CPU 合成事件没有这一层。不支持该 API 的老浏览器计 0，
                    // 后端对"合并事件为 0"只给半分，不会一棍子打死。
                    try {
                        const cl = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
                        if (cl && cl.length > 1)
                            this.beh.coalesced += cl.length - 1;
                    }
                    catch (_) { /* 某些浏览器在非可信事件上会抛，忽略 */ }
                    this._noteRegion(e.clientX, e.clientY);
                }
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
                if (this.beh) {
                    this.beh.downCount++;
                    this.beh.pointerType = "touch";
                    this.beh.maxPointers = Math.max(this.beh.maxPointers, e.touches.length);
                    this._noteRegion(touch.clientX, touch.clientY);
                }
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
                if (this.beh) {
                    this.beh.moveCount++;
                    this.beh.pointerType = "touch";
                    this.beh.maxPointers = Math.max(this.beh.maxPointers, e.touches.length);
                    this._noteRegion(touch.clientX, touch.clientY);
                }
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
                if (this.beh) {
                    this.beh.upCount++;
                    this.activePointers.clear();
                }
            }
        });
        Object.defineProperty(this, "onTouchCancel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (e) => {
                if (!this.active)
                    return;
                if (e.cancelable)
                    e.preventDefault();
                this.touchActive = false;
                if (this.beh) {
                    this.beh.cancelCount++;
                    this.activePointers.clear();
                }
            }
        });
    }
    // v0.3.8：按【几何位置】统计指针进出画布的切换次数（不依赖 DOM 的
    // pointerenter/leave，见构造函数里的说明）。
    _noteRegion(clientX, clientY) {
        if (!this.rect || !Number.isFinite(clientX) || !Number.isFinite(clientY))
            return;
        const r = this.rect;
        const inside = clientX >= r.left && clientX <= r.right
            && clientY >= r.top && clientY <= r.bottom;
        if (inside === this.insideCanvas)
            return;
        this.insideCanvas = inside;
        if (inside)
            this.beh.enterCount++;
        else
            this.beh.leaveCount++;
    }
    start() {
        this.active = true;
        this.samples = [];
        this.touchActive = false;
        this.rect = this.canvas.getBoundingClientRect();
        this.insideCanvas = false;
        this.activePointers = new Set();
        // 只在支持 PointerEvent 的环境下留证：老浏览器收不到 pointerdown/up，
        // 上报出去会变成"无按压"的假证据，反而误伤真人。此时整块 beh 不发
        // （后端按"未上报"中性处理，与旧版行为一致）。
        this.beh = (typeof window !== "undefined" && window.PointerEvent) ? {
            enterCount: 0, leaveCount: 0, downCount: 0, upCount: 0,
            cancelCount: 0, moveCount: 0, maxPointers: 0, blurCount: 0,
            coalesced: 0, pointerType: "",
        } : null;
        this.bind();
    }
    // 供提交负载使用：未采集（老浏览器 / 未 start）返回 null，后端按中性处理。
    getBehavior() {
        return this.beh ? { ...this.beh } : null;
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
        // v0.3.8 行为留证：按压/取消/失焦一律记在 window 上——拖拽起始于按钮
        // （不是画布），且触摸时指针被隐式捕获在按钮上，画布级监听收不到。
        window.addEventListener("pointerdown", this.onPointerDownWin, { passive: true });
        window.addEventListener("pointerup", this.onPointerUpWin, { passive: true });
        window.addEventListener("pointercancel", this.onPointerCancelWin, { passive: true });
        window.addEventListener("blur", this.onBlurWin);
         
        window.addEventListener("touchstart", this.onTouchStart, { passive: false });
        window.addEventListener("touchmove", this.onTouchMove, { passive: false });
        window.addEventListener("touchend", this.onTouchEnd, { passive: false });
        window.addEventListener("touchcancel", this.onTouchCancel, { passive: false });
    }
    stop() {
        this.active = false;
        window.removeEventListener("pointermove", this.onMove);
        window.removeEventListener("pointerdown", this.onPointerDownWin);
        window.removeEventListener("pointerup", this.onPointerUpWin);
        window.removeEventListener("pointercancel", this.onPointerCancelWin);
        window.removeEventListener("blur", this.onBlurWin);
        window.removeEventListener("touchstart", this.onTouchStart);
        window.removeEventListener("touchmove", this.onTouchMove);
        window.removeEventListener("touchend", this.onTouchEnd);
        window.removeEventListener("touchcancel", this.onTouchCancel);
         
         
         
         
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
