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
                     
                     
                     
                    try {
                        const cl = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
                        if (cl && cl.length > 1)
                            this.beh.coalesced += cl.length - 1;
                    }
                    catch (_) {   }
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
     
     
     
    notePress(ev) {
         
         
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
         
         
        window.addEventListener("blur", this.onBlurWin);
         
        window.addEventListener("touchstart", this.onTouchStart, { passive: false });
        window.addEventListener("touchmove", this.onTouchMove, { passive: false });
        window.addEventListener("touchend", this.onTouchEnd, { passive: false });
        window.addEventListener("touchcancel", this.onTouchCancel, { passive: false });
    }
    stop() {
        this.active = false;
         
         
        if (this.beh && this.pressed && !this.beh.upCount && !this.beh.cancelCount) {
            this.beh.upCount++;
            this.pressed = false;
        }
         
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
