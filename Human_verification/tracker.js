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
        // 灌进来的坐标没有对应的事件。
        // ⚠ 两个坑（v0.3.8 首版踩过，真人一直被误判"没按下"）：
        //   1) 拖拽是【先按住按钮】再拖进画布，而起手提示段结束才开始采集
        //      （tracker.start() 在提示段之后），此时 pointerdown 早已发生过——
        //      所以按压必须由 phantom 在 onDown/onUp 里【显式通知】本类，
        //      不能在 start() 里才去挂 pointerdown 监听。
        //   2) 进/出画布按【几何位置】统计，不监听 canvas 的 pointerenter：触摸时
        //      浏览器把指针隐式捕获在按钮上，canvas 级监听根本收不到。
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
        Object.defineProperty(this, "pressed", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        // 提交时冻结的 beh 快照：/verify 是异步的，若用户在等结果时又点了别处，
        // 计数会被新一轮按压重置，这里保证上报的是"本次拖拽结束时"的那一份。
        Object.defineProperty(this, "behSnapshot", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
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
                    this.pressed = false;
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
                    this.pressed = false;
                }
            }
        });
    }
    // ---- v0.3.8 按压留证：由 phantom 在 onDown/onUp 里显式调用 ----
    // 不在本类里挂 window 的 pointerdown：那次按下发生在 start() 之前，监听不上；
    // 挂 pointerup 又会被 stop() 先解绑（onUp 里先调了 stop()），同样漏计。
    notePress(ev) {
        // 注意：按下发生在 start() 之前，beh 可能还没创建，这里要能自建
        // （老浏览器没有 PointerEvent 就直接不采集，后端按"未上报"中性处理）。
        if (!this.beh) {
            if (typeof window === "undefined" || !window.PointerEvent)
                return;
            this.beh = {
                enterCount: 0, leaveCount: 0, downCount: 0, upCount: 0,
                cancelCount: 0, moveCount: 0, maxPointers: 0, blurCount: 0,
                coalesced: 0, pointerType: "",
            };
            this.insideCanvas = false;
        }
        // 新的一轮按压：从这一刻起重新计数，使 beh 覆盖"按下→抬起"完整周期。
        // 若用户是按着不放（提示段被中止后重新按住），pressed 已为 true 就不再归零。
        if (!this.pressed) {
            this.beh.enterCount = 0;
            this.beh.leaveCount = 0;
            this.beh.downCount = 0;
            this.beh.upCount = 0;
            this.beh.cancelCount = 0;
            this.beh.moveCount = 0;
            this.beh.coalesced = 0;
            this.beh.blurCount = 0;
            this.insideCanvas = false;
        }
        this.pressed = true;
        this.beh.downCount++;
        this.beh.maxPointers = Math.max(this.beh.maxPointers, 1);
        if (ev && ev.pointerType)
            this.beh.pointerType = ev.pointerType;
    }
    noteRelease() {
        if (!this.beh || !this.pressed)
            return;
        this.beh.upCount++;
        this.pressed = false;
    }
    noteCancel() {
        if (!this.beh || !this.pressed)
            return;
        this.beh.cancelCount++;
        this.pressed = false;
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
        // ⚠ 不要在这里重置 beh：按下发生在 start() 之前（起手提示段播完才开始
        // 采集），notePress() 已经把计数归零并记下了那次按压，此处无条件重置
        // 会把它抹掉（v0.3.8 首版真人被误判"没按下"的根因）。只在还没创建时兜底。
        // 只在支持 PointerEvent 的环境下留证：老浏览器收不到 pointerdown，
        // 上报出去会变成"无按压"的假证据，反而误伤真人。
        if (!this.beh && typeof window !== "undefined" && window.PointerEvent) {
            this.beh = {
                enterCount: 0, leaveCount: 0, downCount: 0, upCount: 0,
                cancelCount: 0, moveCount: 0, maxPointers: 0, blurCount: 0,
                coalesced: 0, pointerType: "",
            };
            this.insideCanvas = false;
        }
        this.bind();
    }
    // 供提交负载使用：未采集（老浏览器 / 未 start）返回 null，后端按中性处理。
    // 优先返回 stop() 时冻结的快照——/verify 是异步的，等结果期间的新点击
    // 会重置计数，不能把那一轮算进来。
    getBehavior() {
        const snap = this.behSnapshot || this.beh;
        return snap ? { ...snap } : null;
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
        // 按压/抬起不在这里挂：按下发生在 start() 之前，且 onUp 里先调了 stop()
        // 会把监听解掉——一律改由 phantom 显式调用 notePress/noteRelease。
        window.addEventListener("blur", this.onBlurWin);
         
        window.addEventListener("touchstart", this.onTouchStart, { passive: false });
        window.addEventListener("touchmove", this.onTouchMove, { passive: false });
        window.addEventListener("touchend", this.onTouchEnd, { passive: false });
        window.addEventListener("touchcancel", this.onTouchCancel, { passive: false });
    }
    stop() {
        this.active = false;
        // stop() 是在 onUp（松手）里被调用的：若那会儿还没记到抬起，这里补记一次
        // ——松手就是本次停止采集的原因。
        if (this.beh && this.pressed && !this.beh.upCount && !this.beh.cancelCount) {
            this.beh.upCount++;
            this.pressed = false;
        }
        // 冻结快照：此后就算用户乱点导致计数重置，上报的仍是本次拖拽的那一份。
        this.behSnapshot = this.beh ? { ...this.beh } : null;
        window.removeEventListener("pointermove", this.onMove);
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
