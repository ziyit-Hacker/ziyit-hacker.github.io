// 全局配置。视觉/渲染参数通过 Vite 构建时 env 注入（VITE_*），改值需重 build 前端镜像。
//
// 画布尺寸必须与后端 PHANTOM_CANVAS_* 保持一致（后端按它生成路径，前端按它渲染）。
// PC / 移动端分别配置（docs/issue3.md §2/§4）：手机窄屏 + 大拇指接触面需要更紧凑的
// 画布与更大的目标方块，故拆出 PC / Mobile 两套，由 isMobileViewport() 在挂载时选用。

/** 判定当前视口是否为移动端（触屏 + 窄屏）。
 *
 * 触屏 coarse pointer（手指/大拇指）或视口短边 ≤480px 任一命中即视为移动端，
 * 与 issue3.md §4 "大拇指接触面积 10–15mm" 场景对齐。 */
export function isMobileViewport() {
    if (typeof window === "undefined") return false;
    const coarse = typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
    const narrow = Math.min(window.innerWidth, window.innerHeight) <= 480;
    return coarse || narrow;
}

export const CONFIG = {
    // ===== 全部硬编码，不读取 import.meta.env =====
    apiBase: "https://willian-unheady-rawly.ngrok-free.dev",

    // 画布尺寸：PC / 移动端分别配置
    canvasWidthPC: 480,
    canvasHeightPC: 480,
    canvasWidthMobile: 360,
    canvasHeightMobile: 360,

    // 兼容旧引用的别名（= PC 默认）
    get canvasWidth() {
        return this.canvasWidthPC;
    },
    get canvasHeight() {
        return this.canvasHeightPC;
    },

    // 渲染参数（动态显影"雪花"簇）
    particleDensity: 0.6,
    particleDropRate: 0.05,
    particleTargetGain: 0,
    particleBrightness: 0.55,
    particleBrightnessVar: 0.45,

    // 预热脉冲时长（秒）
    previewSeconds: 2,
};