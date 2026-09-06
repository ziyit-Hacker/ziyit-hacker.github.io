 
 
 
 
 



export function isMobileViewport() {
    if (typeof window === "undefined") return false;
    const coarse = typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches;
    const narrow = Math.min(window.innerWidth, window.innerHeight) <= 480;
    return coarse || narrow;
}

export const CONFIG = {
     
    apiBase: "https://willian-unheady-rawly.ngrok-free.dev",

     
    canvasWidthPC: 480,
    canvasHeightPC: 480,
    canvasWidthMobile: 360,
    canvasHeightMobile: 360,

     
    get canvasWidth() {
        return this.canvasWidthPC;
    },
    get canvasHeight() {
        return this.canvasHeightPC;
    },

     
    particleDensity: 0.6,
    particleDropRate: 0.05,
    particleTargetGain: 0,
    particleBrightness: 0.55,
    particleBrightnessVar: 0.45,

     
    previewSeconds: 2,
};