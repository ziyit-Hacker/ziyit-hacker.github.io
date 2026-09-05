// 官方 Demo 页入口：用 Phantom.mount() 驱动 frontend/index.html。
//
// 这里展示【浏览器侧】的最简用法：mount + onSuccess/onFail 回调拿到验证凭证。
// P0 新协议：后端不再签发 token，验证凭证 = 本轮的 { challengeId, sessionId }，
// 由接入方把两者随业务请求一并提交后端（后端 GETDEL 一次性消费）。
import { mount } from "./phantom.js";
const apiBase = "https://willian-unheady-rawly.ngrok-free.dev";
const THEME_KEY = "theme";
const CYCLE = ["light", "dark", "system"];
const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
function storedTheme() {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" || v === "system" ? v : "system";
}
/** theme mode 实际渲染出来的明暗（widget 只认 dark/light）。 */
function resolvedTheme(mode) {
    return mode === "system" ? (prefersDark() ? "dark" : "light") : mode;
}
function applyTheme(mode) {
    const dark = resolvedTheme(mode) === "dark";
    document.documentElement.classList.toggle("dark", dark);
}
/* ---------- ThemeToggle 图标（内联 SVG，跟页面风格统一） ---------- */
const ICONS = {
    light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`,
    dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`,
    system: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
};
function renderToggleIcon(mode) {
    const btn = document.getElementById("theme-toggle");
    if (!btn)
        return;
    btn.innerHTML = ICONS[mode];
    const next = CYCLE[(CYCLE.indexOf(mode) + 1) % CYCLE.length];
    btn.title = `主题：${mode}（点击切换到 ${next}）`;
}
/* ---------- widget 挂载（带 handle，便于主题切换时重建） ---------- */
let handle = null;
function mountWidget(mode) {
    handle?.destroy();
    handle = mount("#app", {
        apiBase,
        theme: resolvedTheme(mode),
        onSuccess: (r) => {
            console.log("验证通过，score =", (r.score || 0).toFixed(2), "challengeId =", r.challengeId);
            // P0：后端不再下发 token；接入方请保存本轮的 challengeId + sessionId，
            // 随业务请求（如注册）一并提交后端消费。这里仅在 window 上留档供宿主页读取。
            window.__phantomVerified = true;
            window.__phantomChallengeId = r.challengeId;
            window.__phantomSessionId = r.sessionId;
            window.dispatchEvent(new CustomEvent('phantom:verified', { detail: { challengeId: r.challengeId, sessionId: r.sessionId } }));
        },
        onFail: (r) => {
            console.log("验证未通过，detail =", r.detail);
        },
        onError: (e) => {
            console.error("Phantom 异常:", e);
        },
    });
}
/* ---------- 初始化 + 绑定切换 ---------- */
function initTheme() {
    const mode = storedTheme();
    applyTheme(mode);
    renderToggleIcon(mode);
    const btn = document.getElementById("theme-toggle");
    btn?.addEventListener("click", () => {
        const cur = storedTheme();
        const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length];
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
        renderToggleIcon(next);
        mountWidget(next); // 让 widget 跟随新主题
    });
    // system 模式下，跟随操作系统明暗变化
    window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", () => {
        if (storedTheme() === "system") {
            applyTheme("system");
            mountWidget("system");
        }
    });
}
/* ---------- 启动 ---------- */
initTheme();
mountWidget(storedTheme());
