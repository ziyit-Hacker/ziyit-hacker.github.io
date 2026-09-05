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
/* ---------- 403 API Key 语义失败提示 ----------
   后端 /challenge /verify 在密钥不可用时返回 403 + 语义 detail：
     API key origin not allowed / API key disabled /
     API key limit exceeded or invalid(月度) / API key daily limit exceeded or invalid(今日)
   这里识别后给出明确提示与跳转入口，不再静默无限重试（失败重试不扣额度）。 */
const KEY_MANAGE_URL =
    (typeof window !== "undefined" && window.__phantomManageUrl) ||
    "https://ziyit-hacker.github.io/user/api-key.html";

function detectKeyDenied(e) {
    if (!e || e.status !== 403)
        return null;
    const raw = String(e.detail || e.message || "");
    // 注意判定顺序：daily 的 detail 也含 "limit exceeded or invalid" 片段，必须先判 daily
    let reason = null;
    if (/daily limit exceeded/i.test(raw)) reason = "daily";
    else if (/limit exceeded or invalid/i.test(raw)) reason = "monthly";
    else if (/\bdisabled\b/i.test(raw)) reason = "disabled";
    else if (/origin not allowed/i.test(raw)) reason = "origin";
    if (!reason)
        return null;
    const tips = {
        monthly: "该密钥本月可用次数已用完（或密钥无效）。请在「我的密钥」查看剩余额度，超额将在下个自然月自动重置。",
        daily: "该密钥今日可用次数已达上限（次日自动重置）。如需立即恢复，可在「我的密钥」中把今日额度设为不限。",
        disabled: "该密钥已被停用，无法发起验证。请到「我的密钥」中重新启用后再试。",
        origin: "当前网站域名不在该密钥的“允许来源”白名单中。密钥所有者可在「我的密钥」中添加当前来源：https://" + (location.host || location.hostname || "")
    }[reason];
    return { reason, tips };
}

let keyDeniedNode = null;
function removeKeyDeniedPanel() {
    if (keyDeniedNode) {
        keyDeniedNode.remove();
        keyDeniedNode = null;
    }
}
function isDarkPage() {
    const root = document.documentElement;
    if (root.classList.contains("dark") || root.getAttribute("data-theme") === "dark")
        return true;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function showKeyDeniedPanel(tips) {
    removeKeyDeniedPanel();
    const dark = isDarkPage();
    const palette = dark
        ? { bg: "#1e2430", fg: "#e8eaed", sub: "#9aa0a6", border: "#3a4250", btn: "#0078d4", btnHover: "#0a7ee9" }
        : { bg: "#ffffff", fg: "#1f2328", sub: "#6b7280", border: "#e5e7eb", btn: "#0078d4", btnHover: "#0a7ee9" };
    const node = document.createElement("div");
    node.className = "phantom-key-denied";
    node.setAttribute("role", "alert");
    node.style.cssText =
        "position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;" +
        "justify-content:center;padding:64px 16px;z-index:2147483000;";
    const card = document.createElement("div");
    card.style.cssText =
        "background:" + palette.bg + ";color:" + palette.fg + ";border:1px solid " + palette.border +
        ";border-radius:12px;max-width:460px;width:100%;padding:22px;box-shadow:0 10px 40px rgba(0,0,0,.25);";
    card.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#a4262c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>' +
        '<b style="font-size:16px;">人机验证密钥不可用</b></div>' +
        '<p style="font-size:13px;line-height:1.7;color:' + palette.sub + ';margin:0 0 6px;">' + tips + "</p>" +
        '<p style="font-size:12px;line-height:1.7;color:' + palette.sub + ';margin:0 0 16px;">验证只有通过才会计费，失败重试不会扣减额度；请先处理密钥状态后再重试。</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;align-items:center;">' +
        '<button type="button" data-act="close" style="border:1px solid ' + palette.border + ";background:transparent;color:" + palette.fg + ';padding:8px 16px;border-radius:6px;font-size:14px;cursor:pointer;">关闭</button>' +
        '<a href="' + KEY_MANAGE_URL + '" target="_blank" rel="noopener" style="background:' + palette.btn + ';color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">前往「我的密钥」管理</a>' +
        "</div>";
    node.appendChild(card);
    card.querySelector('[data-act="close"]').addEventListener("click", removeKeyDeniedPanel);
    node.addEventListener("click", (ev) => {
        if (ev.target === node)
            removeKeyDeniedPanel();
    });
    document.body.appendChild(node);
    keyDeniedNode = node;
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
            const kd = detectKeyDenied(e);
            if (kd) {
                // 密钥被停用/超额/来源被拒：给出明确提示与跳转入口，
                // 并复位 widget 回到待验证态，不再静默无限重试
                showKeyDeniedPanel(kd.tips);
                try { handle?.reset(); } catch (err) {}
                return;
            }
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
