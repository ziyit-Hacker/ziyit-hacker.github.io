(function() {
    let btnLocked = false;
    let countTimer = null;
    function el(id) {
        return document.getElementById(id);
    }
    function hideTip(id) {
        const n = el(id);
        if (n) n.style.display = "none";
    }
    function showTip(id, msg) {
        const n = el(id);
        if (!n) return;
        if (msg != null) n.textContent = msg;
        n.style.display = "block";
    }
    function lockButton(seconds, msg) {
        const btn = el("registerBtn");
        btnLocked = true;
        if (btn) btn.disabled = true;
        showTip("dupTip", msg);
        if (countTimer) clearInterval(countTimer);
        let remain = seconds;
        countTimer = setInterval(function() {
            remain -= 1;
            if (remain <= 0) {
                clearInterval(countTimer);
                countTimer = null;
                btnLocked = false;
                if (btn) btn.disabled = false;
                hideTip("dupTip");
            } else {
                const d = el("dupTip");
                if (d) d.textContent = msg + "（" + remain + " 秒后可重试）";
            }
        }, 1e3);
    }
    function resetCaptcha() {
        const st = window.__phantom;
        if (!st) return;
        st.challengeId = "";
        st.sessionId = "";
        if (typeof st.reset === "function") st.reset();
        hideTip("captchaHint");
    }
    window.__phantomSubmit = async function() {
        if (btnLocked) return;
        const btn = el("registerBtn");
        const dupTip = el("dupTip");
        const captchaTip = el("captchaTip");
        const st = window.__phantom;
        const username = el("username").value.trim();
        const email = el("email").value.trim();
        const password = el("password").value;
        // 统一校验：失焦/输入已实时提示，这里只做提交前的最终拦截
        if (window.ZIYIT_FV &&
            !window.ZIYIT_FV.validateAll(["username", "email", "password", "confirmPassword"])) {
            return false;
        }
        if (!st || !st.challengeId || !st.sessionId) {
            if (captchaTip) captchaTip.style.display = "block";
            if (st) {
                st.pendingSubmit = true;
                if (typeof st.open === "function") st.open();
            }
            return false;
        }
        hideTip("captchaTip");
        hideTip("captchaHint");
        if (btn) btn.disabled = true;
        if (dupTip) {
            dupTip.style.display = "block";
            dupTip.textContent = "正在注册，请稍候…";
        }
        try {
            await ZIYIT_API.register(username, email, password, st.challengeId, st.sessionId);
            const form = document.querySelector("form");
            const verifyTip = el("verifyTip");
            if (verifyTip) verifyTip.style.display = "block";
            if (form) {
                form.querySelectorAll("input, button").forEach(function(f) {
                    f.disabled = true;
                });
            }
            if (dupTip) dupTip.style.display = "none";
            return true;
        } catch (error) {
            console.error("注册错误:", error);
            const status = error && error.status;
            const data = error && error.data;
            const raw = String(data && data.detail || error.detail || error.message || "");
            if (status === 429) {
                if (/email/i.test(raw)) {
                    lockButton(30, "操作过于频繁，请更换邮箱后重试");
                } else {
                    lockButton(60, "操作过于频繁，请稍后再试");
                }
                return false;
            }
            if (btn) btn.disabled = false;
            if (dupTip) dupTip.style.display = "none";
            if (status === 400) {
                if (/Username already exists/i.test(raw)) {
                    showTip("usernameError", "该用户名已被注册");
                    resetCaptcha();
                    if (captchaTip) captchaTip.style.display = "block";
                    alert("该用户名已被注册，请更换用户名后重新完成滑块验证");
                    return false;
                }
                if (/Email already exists/i.test(raw)) {
                    resetCaptcha();
                    if (captchaTip) captchaTip.style.display = "block";
                    alert("该邮箱已被注册，请更换邮箱后重新完成滑块验证");
                    return false;
                }
                alert("注册失败: " + (raw || "请求失败 400"));
                return false;
            }
            if (status === 403) {
                resetCaptcha();
                if (captchaTip) captchaTip.style.display = "block";
                st.pendingSubmit = true;
                alert("人机验证未通过或已失效，请重新完成一次验证后再提交。\n(403: " + (raw || "verification required") + ")");
                if (typeof st.open === "function") st.open();
                return false;
            }
            if (status === 410) {
                resetCaptcha();
                if (captchaTip) captchaTip.style.display = "block";
                alert("验证已失效，请重新滑动");
                return false;
            }
            if (status === 422) {
                alert("邮箱格式不正确，请检查后重试");
                return false;
            }
            if (status >= 500) {
                alert("注册失败: 服务器开小差了，请稍后再试");
                return false;
            }
            alert("注册失败: " + (raw || "请求失败 " + (status || "未知错误")));
            return false;
        }
    };
    window.addEventListener("DOMContentLoaded", function() {
        // 统一表单校验（注册 / 修改邮箱 / 修改密码同一套规则与交互）
        if (window.ZIYIT_FV) {
            const FV = window.ZIYIT_FV;
            FV.attach("username", FV.presets.username());
            FV.attach("email", FV.presets.email());
            FV.attach("password", FV.presets.password());
            FV.attach("confirmPassword", FV.presets.confirmPassword("password"));
        }
        const form = document.querySelector("form");
        if (form) {
            form.addEventListener("submit", function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                if (btnLocked) {
                    return false;
                }
                if (typeof window.__phantomSubmit === "function") {
                    window.__phantomSubmit();
                }
                return false;
            });
        }
    });
})();