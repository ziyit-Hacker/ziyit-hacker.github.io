(function () {
    let btnLocked = false;
    let countTimer = null;

    function el(id) {
        return document.getElementById(id);
    }

    function hideTip(id) {
        const n = el(id);
        if (n) n.style.display = 'none';
    }

    function showTip(id, msg) {
        const n = el(id);
        if (!n) return;
        if (msg != null) n.textContent = msg;
        n.style.display = 'block';
    }

    // 冷却禁用注册按钮：期间不可提交，倒计时展示在 dupTip
    function lockButton(seconds, msg) {
        const btn = el('registerBtn');
        btnLocked = true;
        if (btn) btn.disabled = true;
        showTip('dupTip', msg);
        if (countTimer) clearInterval(countTimer);
        let remain = seconds;
        countTimer = setInterval(function () {
            remain -= 1;
            if (remain <= 0) {
                clearInterval(countTimer);
                countTimer = null;
                btnLocked = false;
                if (btn) btn.disabled = false;
                hideTip('dupTip');
            } else {
                const d = el('dupTip');
                if (d) d.textContent = msg + '（' + remain + ' 秒后可重试）';
            }
        }, 1000);
    }

    // 重置滑块：清空本地凭证，回到待验证态（保留表单字段）
    function resetCaptcha() {
        const st = window.__phantom;
        if (!st) return;
        st.verified = false;
        st.challengeId = '';
        st.sessionId = '';
        if (typeof st.reset === 'function') st.reset();
        hideTip('captchaHint');
    }

    // 核心注册提交（submit 触发；验证通过后由 onSuccess 自动回调）
    window.__phantomSubmit = async function () {
        if (btnLocked) return;
        const btn = el('registerBtn');
        const dupTip = el('dupTip');
        const captchaTip = el('captchaTip');
        const st = window.__phantom;

        // ===== 1) 本地字段校验（先校验后验证，见第 9 条）=====
        const username = el('username').value.trim();
        const email = el('email').value.trim();
        const password = el('password').value;
        const confirmPassword = el('confirmPassword').value;

        if (!username) { alert('用户名不能为空！'); return false; }
        if (!password) { alert('密码不能为空！'); return false; }
        if (!email) { alert('请输入有效的邮箱地址！'); return false; }
        const emailRe = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRe.test(email)) { alert('邮箱格式不正确，请检查后重试！'); return false; }
        if (!confirmPassword || confirmPassword !== password) {
            showTip('confirmPasswordError', null);
            return false;
        }
        hideTip('confirmPasswordError');

        // ===== 2) 未通过人机验证 → 挂起提交并弹出滑块 =====
        if (!st || !st.verified || !st.challengeId || !st.sessionId) {
            if (captchaTip) captchaTip.style.display = 'block';
            if (st) {
                st.pendingSubmit = true;
                if (typeof st.open === 'function') st.open();
            }
            return false;
        }

        // ===== 3) 提交（带本轮验证凭证）=====
        hideTip('captchaTip');
        hideTip('captchaHint');
        if (btn) btn.disabled = true;
        if (dupTip) { dupTip.style.display = 'block'; dupTip.textContent = '正在注册，请稍候…'; }

        const CryptoJS = window.CryptoJS;
        const md5Password = CryptoJS.MD5(password).toString(CryptoJS.enc.Base64);

        try {
            await ZIYIT_API.register(username, email, md5Password, st.challengeId, st.sessionId);
            // 注册成功：显示邮箱验证提示并锁定表单
            const form = document.querySelector('form');
            const verifyTip = el('verifyTip');
            if (verifyTip) verifyTip.style.display = 'block';
            if (form) {
                form.querySelectorAll('input, button').forEach(function (f) {
                    f.disabled = true;
                });
            }
            if (dupTip) dupTip.style.display = 'none';
            return true;
        } catch (error) {
            console.error('注册错误:', error);
            const status = error && error.status;
            const data = error && error.data;
            const raw = String(
                (data && data.detail) || error.detail || error.message || ''
            );
            // 后端 429 发生在 challenge 消费之前 → 凭证仍有效，冷却后可复用直接重试
            if (status === 429) {
                if (/email/i.test(raw)) {
                    // “Too many registration attempts for this email”：建议更换邮箱
                    lockButton(30, '操作过于频繁，请更换邮箱后重试');
                } else {
                    // 同 IP 注册过于频繁
                    lockButton(60, '操作过于频繁，请稍后再试');
                }
                return false;
            }
            // 恢复按钮（非冷却场景）
            if (btn) btn.disabled = false;
            if (dupTip) dupTip.style.display = 'none';

            if (status === 400) {
                if (/Username already exists/i.test(raw)) {
                    showTip('usernameError', '该用户名已被注册');
                    // 400 发生在 challenge 消费之后 → 必须重新验证
                    resetCaptcha();
                    if (captchaTip) captchaTip.style.display = 'block';
                    alert('该用户名已被注册，请更换用户名后重新完成滑块验证');
                    return false;
                }
                if (/Email already exists/i.test(raw)) {
                    resetCaptcha();
                    if (captchaTip) captchaTip.style.display = 'block';
                    alert('该邮箱已被注册，请更换邮箱后重新完成滑块验证');
                    return false;
                }
                alert('注册失败: ' + (raw || '请求失败 400'));
                return false;
            }
            if (status === 403) {
                // 验证未通过 / challengeId 过期或已被使用：立即自动重开验证，保留表单
                resetCaptcha();
                if (captchaTip) captchaTip.style.display = 'block';
                st.pendingSubmit = true;
                if (typeof st.open === 'function') st.open();
                return false;
            }
            if (status === 410) {
                // 尝试次数耗尽 / challenge 过期
                resetCaptcha();
                if (captchaTip) captchaTip.style.display = 'block';
                alert('验证已失效，请重新滑动');
                return false;
            }
            if (status === 422) {
                alert('邮箱格式不正确，请检查后重试');
                return false;
            }
            if (status >= 500) {
                alert('注册失败: 服务器开小差了，请稍后再试');
                return false;
            }
            alert('注册失败: ' + (raw || ('请求失败 ' + (status || '未知错误'))));
            return false;
        }
    };

    window.addEventListener('DOMContentLoaded', function () {
        const confirmPwd = el('confirmPassword');
        const confirmErr = el('confirmPasswordError');
        if (confirmPwd && confirmErr) {
            confirmPwd.addEventListener('input', function () {
                confirmErr.style.display = 'none';
            });
        }
        const usernameInput = el('username');
        const usernameError = el('usernameError');
        if (usernameInput && usernameError) {
            usernameInput.addEventListener('input', function () {
                usernameError.style.display = 'none';
            });
        }
        const form = document.querySelector('form');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.location.search) {
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                if (btnLocked) {
                    return false; // dupTip 已显示冷却倒计时
                }
                if (typeof window.__phantomSubmit === 'function') {
                    window.__phantomSubmit();
                }
                return false;
            });
        }
    });
})();
