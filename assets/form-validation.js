/**
 * ZIYIT 统一表单校验（v1）
 * ------------------------------------------------------------
 * 规范（三个模块完全一致）：
 * 1. blur：非空时失焦立即执行完整校验，失败在输入框下方显示红色错误文案；
 *    空值不提示，必填错误留到提交时（validateAll）才显示；
 * 2. input：若当前已有错误，每次输入即时复检，一旦合规立刻移除错误；
 * 3. 密码：输入框下方固定展示灰色规则清单，逐项实时点亮为绿色；
 * 4. 提交：validateAll() 统一校验（空值在此刻提示必填）并聚焦第一个非法项。
 * 说明见 design/DESIGN.md §4.15，交互用例见 design/ui-test.html。
 */
(function (global) {
    "use strict";

    var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

    // 密码规则：列表展示与校验共用同一份定义，避免文案/逻辑漂移
    var PWD_RULES = [
        { id: "length", label: "长度为 6–16 个字符", message: "密码长度需为 6–16 个字符", test: function (v) { return v.length >= 6 && v.length <= 16; } },
        { id: "letter", label: "至少包含 1 个字母", message: "密码需至少包含 1 个字母", test: function (v) { return /[A-Za-z]/.test(v); } },
        { id: "digit", label: "至少包含 1 个数字", message: "密码需至少包含 1 个数字", test: function (v) { return /[0-9]/.test(v); } }
    ];

    function resolveEl(target) {
        if (!target) return null;
        return typeof target === "string" ? document.getElementById(target) : target;
    }

    function ensureError(input, options) {
        var given = resolveEl(options.errorEl);
        if (given) return given;
        var id = input.id ? input.id + "Error" : "";
        var found = id ? document.getElementById(id) : null;
        if (found) return found;
        var div = document.createElement("div");
        div.className = "fv-error";
        if (id) div.id = id;
        div.setAttribute("role", "alert");
        div.setAttribute("aria-live", "polite");
        input.insertAdjacentElement("afterend", div);
        return div;
    }

    function ensureRules(input, errorEl) {
        var ul = document.createElement("ul");
        ul.className = "fv-rules";
        ul.setAttribute("aria-live", "polite");
        PWD_RULES.forEach(function (rule) {
            var li = document.createElement("li");
            li.setAttribute("data-rule", rule.id);
            li.textContent = rule.label;
            ul.appendChild(li);
        });
        var anchor = errorEl && errorEl.parentNode === input.parentNode ? errorEl : input;
        anchor.insertAdjacentElement("afterend", ul);
        return ul;
    }

    function setError(input, errorEl, msg) {
        if (!errorEl) return;
        if (msg) {
            errorEl.textContent = msg;
            errorEl.style.display = "block";
            input.classList.add("fv-invalid");
            input.setAttribute("aria-invalid", "true");
        } else {
            errorEl.textContent = "";
            errorEl.style.display = "none";
            input.classList.remove("fv-invalid");
            input.removeAttribute("aria-invalid");
        }
    }

    function paintRules(ul, value) {
        if (!ul) return;
        var items = ul.querySelectorAll("li[data-rule]");
        for (var i = 0; i < items.length; i++) {
            var rule = null;
            for (var j = 0; j < PWD_RULES.length; j++) {
                if (PWD_RULES[j].id === items[i].getAttribute("data-rule")) rule = PWD_RULES[j];
            }
            if (rule) items[i].classList.toggle("is-ok", !!value && rule.test(value));
        }
    }

    function attach(target, options) {
        var input = resolveEl(target);
        if (!input) return null;
        // 避免重复接入导致错误节点/规则清单被插入多次
        if (input.__fv) return input.__fv;
        options = options || {};
        var errorEl = ensureError(input, options);
        var rulesList = options.strength ? ensureRules(input, errorEl) : null;
        var trim = options.trim !== false;

        function rawValue() {
            return input.value == null ? "" : String(input.value);
        }
        function value() {
            var v = rawValue();
            return trim ? v.trim() : v;
        }
        function firstMessage(forceRequired) {
            var v = value();
            // 空值在失焦/输入阶段不提示，只有提交时（forceRequired）才提示必填
            if (!v) return forceRequired && options.required ? (options.requiredMessage || "此项不能为空") : "";
            var rules = options.rules || [];
            for (var i = 0; i < rules.length; i++) {
                var rule = rules[i];
                if (!rule || typeof rule.test !== "function") continue;
                var msg = rule.test(v, api);
                if (msg) return msg;
            }
            return "";
        }
        function validate(forceRequired) {
            var msg = firstMessage(!!forceRequired);
            setError(input, errorEl, msg);
            paintRules(rulesList, value());
            return !msg;
        }
        function clear() {
            setError(input, errorEl, "");
        }

        var api = {
            input: input,
            errorEl: errorEl,
            rulesList: rulesList,
            validate: validate,
            clear: clear
        };

        // 1) 失焦：完整校验（空值不提示，必填错误留到提交时）
        input.addEventListener("blur", function () {
            validate(false);
        });
        // 2) 输入：密码规则实时点亮；已有错误时即时复检并清除
        input.addEventListener("input", function () {
            paintRules(rulesList, value());
            if (input.classList.contains("fv-invalid")) validate(false);
        });
        input.__fv = api;
        paintRules(rulesList, "");
        return api;
    }

    function validateAll(inputs) {
        var firstInvalid = null;
        (inputs || []).forEach(function (target) {
            var input = resolveEl(target);
            if (!input || !input.__fv) return;
            if (!input.__fv.validate(true) && !firstInvalid) firstInvalid = input;
        });
        if (firstInvalid && typeof firstInvalid.focus === "function") firstInvalid.focus();
        return !firstInvalid;
    }

    function passwordRules() {
        return PWD_RULES.map(function (rule) {
            return { test: function (v) { return rule.test(v) ? "" : rule.message; } };
        });
    }

    function matchRule(getOtherValue, message) {
        return {
            test: function (v) {
                var other = getOtherValue();
                other = other == null ? "" : String(other);
                return v === other ? "" : message;
            }
        };
    }

    // 三个模块共用同一套预设，禁止在页面里各写一份
    var presets = {
        username: function () {
            return {
                required: true,
                requiredMessage: "请输入昵称",
                rules: [{
                    test: function (v) { return v.length <= 15 ? "" : "用户名不能超过 15 个字符"; }
                }]
            };
        },
        email: function () {
            return {
                required: true,
                requiredMessage: "请输入邮箱地址",
                rules: [{
                    test: function (v) { return EMAIL_RE.test(v) ? "" : "邮箱格式不正确，请检查后重试"; }
                }]
            };
        },
        password: function () {
            return {
                required: true,
                requiredMessage: "请输入密码",
                strength: true,
                rules: passwordRules()
            };
        },
        confirmPassword: function (otherId) {
            return {
                required: true,
                requiredMessage: "请再次输入密码",
                strength: true,
                rules: passwordRules().concat([
                    matchRule(function () {
                        var other = document.getElementById(otherId);
                        return other ? other.value : "";
                    }, "两次输入的密码不一致")
                ])
            };
        },
        oldPassword: function () {
            return {
                required: true,
                requiredMessage: "请输入原密码"
            };
        }
    };

    global.ZIYIT_FV = {
        EMAIL_RE: EMAIL_RE,
        PWD_RULES: PWD_RULES,
        presets: presets,
        attach: attach,
        validateAll: validateAll,
        passwordRules: passwordRules,
        matchRule: matchRule
    };
})(window);
