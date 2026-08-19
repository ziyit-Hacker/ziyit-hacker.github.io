window.addEventListener('DOMContentLoaded', async () => {
    // 确认密码输入变化时隐藏不一致提示
    const confirmPwd = document.getElementById('confirmPassword');
    const confirmErr = document.getElementById('confirmPasswordError');
    if (confirmPwd && confirmErr) {
        confirmPwd.addEventListener('input', function () {
            confirmErr.style.display = 'none';
        });
    }

    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            e.stopPropagation();

            if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            const btn = document.getElementById('registerBtn');
            const dupTip = document.getElementById('dupTip');

            // 人机验证未通过时提示，不进入提交流程
            if (typeof captchaVerified === 'undefined' || !captchaVerified) {
                const tip = document.getElementById('captchaTip');
                if (tip) tip.style.display = 'block';
                return false;
            }

            // 防止重复点击提交
            if (btn && btn.disabled) return false;
            if (btn) btn.disabled = true;
            if (dupTip) dupTip.style.display = 'block';

            try {
                const success = await checkLogin();
                if (success) {
                    // 注册成功：停留本页，显示邮箱验证提示并锁定表单
                    const verifyTip = document.getElementById('verifyTip');
                    if (verifyTip) verifyTip.style.display = 'block';
                    form.querySelectorAll('input, button').forEach(function(f) {
                        f.disabled = true;
                    });
                    if (btn) btn.disabled = true;
                } else {
                    // 校验未通过：恢复按钮，允许重新提交
                    if (btn) btn.disabled = false;
                    if (dupTip) dupTip.style.display = 'none';
                }
            } catch (error) {
                console.error('注册错误:', error);
                alert('注册失败: ' + error.message);
                if (btn) btn.disabled = false;
                if (dupTip) dupTip.style.display = 'none';
            }

            return false;
        });
    }
});

async function checkLogin() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 人机验证检查
    if (typeof captchaVerified === 'undefined' || !captchaVerified) {
        const tip = document.getElementById('captchaTip');
        if (tip) tip.style.display = 'block';
        return false;
    }

    if (!username.trim()) {
        alert('用户名不能为空！');
        return false;
    }

    if (!password.trim()) {
        alert('密码不能为空！');
        return false;
    }

    if (!email.trim() || email.indexOf('@') === -1) {
        alert('请输入有效的邮箱地址！');
        return false;
    }

    // 严格邮箱格式校验（防呆：基本格式 + 域名合法字符）
    const emailRe = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRe.test(email.trim())) {
        alert('邮箱格式不正确，请检查后重试！');
        return false;
    }

    // 密码确认校验
    const confirmPassword = document.getElementById('confirmPassword');
    if (confirmPassword && confirmPassword.value !== password) {
        const errTip = document.getElementById('confirmPasswordError');
        if (errTip) errTip.style.display = 'block';
        confirmPassword.focus();
        return false;
    }

    const CryptoJS = window.CryptoJS;
    const md5Password = CryptoJS.MD5(password).toString(CryptoJS.enc.Base64);

    try {
        await ZIYIT_API.register(username.trim(), email.trim(), md5Password);
        return true;
    } catch (error) {
        console.error('注册错误:', error);
        if (error.status === 409 || (error.data && error.data.detail && String(error.data.detail).indexOf('已存在') !== -1)) {
            document.getElementById('usernameError').style.display = 'block';
            return false;
        }
        if (error.status) {
            // 后端业务错误：错误消息可能为英文，尝试给出中文提示
            var detail = String(error.data && error.data.detail || error.message || '');
            var cnMsg = null;
            if (/Too many registrations from this IP/i.test(detail)) {
                cnMsg = '当前网络注册过于频繁，请稍等一段时间再试（同一网络出口 IP 注册有限额）';
            } else if (error.status === 429) {
                cnMsg = '操作过于频繁，请稍后再试';
            } else if (error.status >= 500) {
                cnMsg = '服务器开小差了，请稍后再试';
            }
            alert('注册失败: ' + (cnMsg || detail || ('请求失败 ' + error.status)));
        } else {
            // 网络层错误（无状态码）：后端不可达/超时
            alert('注册失败: 无法连接服务器，请检查网络后重试');
        }
        return false;
    }
}
