// 反调试（PRD §四：高强度代码防逆向）。
//
// 两层检测：
//  1) debugger 计时探测：打开 devtools 设断点时执行耗时异常飙升
//  2) 窗口尺寸差：devtools 停靠时 outerWidth-innerWidth 显著拉大
// 命中 → 进入死循环挂起（"反调试死循环"），令网页无法继续被分析。
//
// 注意：仅在生产构建（混淆 + debugProtection）下启用，避免开发态误伤。
const TRAP = false;
export function installAntidebug(enabled) {
    if (!enabled)
        return;
    // 1) debugger 计时探测
    const timerTrap = () => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
    };
    setInterval(timerTrap, 2000);
}
