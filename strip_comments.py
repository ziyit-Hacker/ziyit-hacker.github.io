# -*- coding: utf-8 -*-
"""
strip_comments.py —— 批量去掉 HTML / CSS / JS 文件中的注释（Python 实现）

特性
----
* JS/CSS：按“词法”扫描，能正确跳过字符串、正则字面量、模板字符串（含 `${}` 嵌套），
  不会把 "http://x"、'<div class="a/b">'、`a//b` 之类的内容误当注释删除。
* HTML：识别 <!-- --> 注释，以及 <script>/<style> 内部代码、<textarea>/<template>
  等原始文本区域，只在真正的代码位置删注释。
* 只删“确凿的注释”：
  - 未闭合的 <!-- 、/* （没有对应结束符）一律【不删】，剩余内容原样保留，
    宁可漏删也绝不误删代码/正文；
  - 条件注释、模板指令等“功能性注释”（如 <!--[if ...]>、<!-- ko ... -->、
    <!-- {{...}} -->）默认【保留】，确认要删再加 --strip-functional；
* 默认【只预览】统计，加 --write 才真正改写；--backup 会在改写前生成 .bak。
* 数据型 <script>（application/ld+json、application/json 等非 JS 类型）整段原样保留，
  不做 JS 注释解析，也不会把正文里的 //、http:// 误当注释。
* 编码：按 UTF-8（含/不含 BOM）处理；遇到无法按 UTF-8 解码的文件回退 GB18030，
  写回时保持原编码习惯（有 BOM 保留 BOM）。

用法示例
--------
python strip_comments.py .                              # 预览当前目录全部 html/js/css
python strip_comments.py Human_verification --write     # 实际去掉该目录注释
python strip_comments.py a.html b.js --dry-run          # 只看 a.html / b.js 会删多少
python strip_comments.py --ext html js . --write        # 只处理 html/js
python strip_comments.py . --delete-backups             # 删除范围内所有 .bak 备份
python strip_comments.py --selftest                     # 跑内置自检（不碰任何文件）
"""

import argparse
import os
import re
import sys

# ----------------------------- 通用工具 -----------------------------

_WS = set(" \t\r\n\v\f\u00a0\u2028\u2029")

# JS 正则判定：位于这些“关键字结束处”后仍可紧跟正则字面量（如 return /re/）
_REGEX_AFTER_KEYWORD = frozenset((
    "return", "typeof", "instanceof", "in", "of", "new", "delete",
    "void", "throw", "case", "do", "else", "yield", "await",
))

# HTML 中属于“原始文本/RCDATA”、不解析注释、需整段保密的元素
_RAW_TAGS = frozenset(("textarea", "title", "xmp", "noembed", "noframes", "template", "iframe", "plaintext"))

# “功能性注释”前缀：条件注释、Knockout 虚拟元素、模板指令等。
# 这些注释往往承载逻辑/数据，默认保留；只有 --strip-functional 才删除。
_FUNCTIONAL_PREFIXES = (
    "[if", "<![endif]", "ko ", "/ko", "{{", "{%", "<!", "[endif]",
)


def _is_functional_comment(inner):
    """判断 <!-- ... --> 内部文本是否像“功能性注释”（而非纯说明注释）。"""
    s = (inner or "").lstrip()
    if not s:
        return False
    low = s.lower()
    return low.startswith(_FUNCTIONAL_PREFIXES)


def _looks_tag_start(src, i, name):
    """src 从 i 开始是否为 <name 开标签（name 小写），边界为空白/>。"""
    end = i + 1 + len(name)
    if src[i:i + 1] != "<" or src[i + 1:end].lower() != name:
        return False
    if end >= len(src):
        return True
    nxt = src[end]
    return nxt in " \t\r\n\v\f>" or nxt == "/"


def _read_tag(src, i):
    """从 '<' 读到一个完整的开标签结束 '>'，考虑属性引号内的 '>'。返回结束后下标。"""
    j = i + 1
    n = len(src)
    while j < n:
        c = src[j]
        if c in "\"'":
            q = c
            j += 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            continue
        if c == ">":
            return j + 1
        j += 1
    return n


def _close_tag_idx(src, name):
    """从 src 中找 </name 出现位置（不区分大小写），供原始文本标签使用。"""
    low = ("</" + name).lower()
    pos = src.lower().find(low)
    return pos


# ----------------------------- JS 注释去除 -----------------------------

def strip_js(src):
    """去除 JS 注释（保留其它全部字符与换行；注释原位替换为空格/换行以免单词粘连）。"""
    if not src:
        return src, 0, 0
    n = len(src)
    out = []
    # 模板/插值栈：元素为 'T'（模板字面量文本段）或 ('I', depth)
    stack = []
    regex_ok = True  # 为 True 时 '/' 应被当作正则字面量起始
    removed_chars = 0
    removed_blocks = 0
    i = 0

    while i < n:
        c = src[i]
        top = stack[-1] if stack else None

        # ---------- 模板字面量的“文本”段 ----------
        if top == "T":
            if c == "\\" and i + 1 < n:
                out.append(src[i:i + 2])
                i += 2
                continue
            if c == "`":
                out.append("`")
                i += 1
                stack.pop()
                regex_ok = False
                continue
            if c == "$" and i + 1 < n and src[i + 1] == "{":
                out.append("${")
                i += 2
                stack.append(["I", 0])
                continue
            out.append(c)
            i += 1
            continue

        # ---------- 模板插值表达式段（代码） ----------
        if top and top[0] == "I":
            if c == "{":
                out.append(c)
                i += 1
                top[1] += 1
                continue
            if c == "}":
                if top[1] == 0:
                    out.append(c)
                    i += 1
                    stack.pop()
                    regex_ok = False
                    continue
                out.append(c)
                i += 1
                top[1] -= 1
                continue

        # ---------- 普通代码：注释优先 ----------
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = i + 2
            while j < n and src[j] not in "\r\n":
                j += 1
            removed_chars += (j - i)
            removed_blocks += 1
            out.append(" ")          # 行注释原位置留空格，换行符保留
            i = j
            continue

        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = i + 2
            has_nl = False
            closed = False
            while j + 1 < n:
                if src[j] in "\r\n":
                    has_nl = True
                if src[j] == "*" and src[j + 1] == "/":
                    closed = True
                    break
                j += 1
            if not closed:
                # 未闭合 /* —— 不视为注释，剩余内容原样保留，宁可漏删不可误删代码
                out.append(src[i:])
                break
            end = j + 2
            removed_chars += (end - i)
            removed_blocks += 1
            out.append("\n" if has_nl else " ")
            i = end
            continue

        # ---------- 字符串 ----------
        if c in "\"'":
            q = c
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            i = j
            regex_ok = False
            continue

        # ---------- 模板字面量起始 ----------
        if c == "`":
            out.append("`")
            i += 1
            stack.append("T")
            continue

        # ---------- 正则 / 除法 ----------
        if c == "/":
            if regex_ok:
                j = i + 1
                in_cls = False
                closed = False
                while j < n:
                    ch = src[j]
                    if ch == "\\":
                        j += 2
                        continue
                    if ch == "[":
                        in_cls = True
                    elif ch == "]":
                        in_cls = False
                    elif ch == "/" and not in_cls:
                        j += 1
                        closed = True
                        break
                    elif ch in "\r\n" and not in_cls:
                        break       # 换行前仍未闭合 → 按除法处理，避免吞代码
                    j += 1
                if closed:
                    out.append(src[i:j])
                    i = j
                    regex_ok = False
                    continue
            out.append("/")
            i += 1
            regex_ok = True
            continue

        # ---------- 标识符（含关键字判定） ----------
        if c.isalpha() or c in "_$" or ord(c) > 127:
            j = i + 1
            while j < n and (src[j].isalnum() or src[j] in "_$" or ord(src[j]) > 127):
                j += 1
            word = src[i:j]
            out.append(word)
            regex_ok = word not in _REGEX_AFTER_KEYWORD
            i = j
            continue

        # ---------- 数字 ----------
        if c.isdigit():
            j = i + 1
            while j < n and (src[j].isalnum() or src[j] in "._"):
                j += 1
            out.append(src[i:j])
            i = j
            regex_ok = False
            continue

        # ---------- 其它字符 ----------
        if c == ")" or c == "]":
            regex_ok = False
        elif c == "}" or c in "{[(" or c in "+-*/%&|^~!?:;,=<>":
            regex_ok = True
        elif c in _WS:
            pass                 # 空白不改变判定
        else:
            # 其他无法归类的符号（# 等）
            regex_ok = False
        out.append(c)
        i += 1

    return "".join(out), removed_chars, removed_blocks


# ----------------------------- CSS 注释去除 -----------------------------

def strip_css(src):
    """去除 CSS /* */ 注释（识别引号内的 url() 等字符串）。"""
    if not src:
        return src, 0, 0
    n = len(src)
    out = []
    removed_chars = 0
    removed_blocks = 0
    i = 0
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = i + 2
            has_nl = False
            closed = False
            while j + 1 < n:
                if src[j] in "\r\n":
                    has_nl = True
                if src[j] == "*" and src[j + 1] == "/":
                    closed = True
                    break
                j += 1
            if not closed:
                # 未闭合 /* —— 不视为注释，剩余内容原样保留，宁可漏删不可误删
                out.append(src[i:])
                break
            end = j + 2
            removed_chars += (end - i)
            removed_blocks += 1
            out.append("\n" if has_nl else " ")
            i = end
            continue
        if c in "\"'":
            q = c
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            i = j
            continue
        out.append(c)
        i += 1
    return "".join(out), removed_chars, removed_blocks


# ----------------------------- HTML 注释去除 -----------------------------

def _find_script_close(body):
    """在 JS 代码体中找真正闭合的 </script 位置（跳过字符串/注释/模板），返回相对下标。"""
    n = len(body)
    stack = []
    i = 0
    while i < n:
        c = body[i]
        top = stack[-1] if stack else None
        if top == "T":
            if c == "\\" and i + 1 < n:
                i += 2
                continue
            if c == "`":
                i += 1
                stack.pop()
                continue
            if c == "$" and i + 1 < n and body[i + 1] == "{":
                i += 2
                stack.append(["I", 0])
                continue
            i += 1
            continue
        if top and top[0] == "I":
            if c == "{":
                top[1] += 1
                i += 1
                continue
            if c == "}":
                if top[1] == 0:
                    stack.pop()
                else:
                    top[1] -= 1
                i += 1
                continue
        # 注释
        if c == "/" and i + 1 < n and body[i + 1] == "/":
            j = i + 2
            while j < n and body[j] not in "\r\n":
                j += 1
            i = j
            continue
        if c == "/" and i + 1 < n and body[i + 1] == "*":
            j = body.find("*/", i + 2)
            i = n if j == -1 else j + 2
            continue
        # 字符串
        if c in "\"'":
            q = c
            j = i + 1
            while j < n:
                if body[j] == "\\":
                    j += 2
                    continue
                if body[j] == q:
                    j += 1
                    break
                j += 1
            i = j
            continue
        # 模板
        if c == "`":
            i += 1
            stack.append("T")
            continue
        # 代码态检测闭合标签
        if c == "<" and body[i:i + 8].lower() == "</script":
            return i
        i += 1
    return -1


# 属于“可执行 JS”的 <script type> 取值（大小写不敏感）
_JS_SCRIPT_TYPES = frozenset((
    "", "module", "text/javascript", "application/javascript",
    "application/ecmascript", "text/ecmascript", "text/jsx", "importmap",
))


def _script_is_js(open_tag):
    """判断 <script ...> 开标签是否是可执行 JS。
    无 type 或 JS 类型 → True（按 JS 去注释）；
    application/ld+json、application/json 等数据型 → False（整段保留）。"""
    m = re.search(r"""\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))""",
                  open_tag, re.IGNORECASE)
    if not m:
        return True
    raw = (m.group(1) or m.group(2) or m.group(3) or "").strip().lower()
    if not raw or raw in _JS_SCRIPT_TYPES:
        return True
    if raw.endswith("javascript") or raw.endswith("ecmascript"):
        return True
    return False


def strip_html(src, keep_functional=True):
    """去除 HTML 注释，并对 <script>/<style> 内部做 JS/CSS 去注释。
    keep_functional=True（默认）：保留条件注释等“功能性注释”。"""
    if not src:
        return src, 0, 0, 0
    n = len(src)
    out = []
    removed_chars = 0
    removed_blocks = 0
    i = 0
    while i < n:
        if src.startswith("<!--", i):
            j = src.find("-->", i + 4)
            if j == -1:
                # 未闭合 <!--：不视为注释，剩余内容原样保留，宁可漏删不可误删正文
                out.append(src[i:])
                break
            if keep_functional and _is_functional_comment(src[i + 4:j]):
                # 条件注释/模板指令等承载逻辑的注释：默认保留
                out.append(src[i:j + 3])
                i = j + 3
                continue
            removed_chars += (j + 3 - i)
            removed_blocks += 1
            i = j + 3
            continue

        tag = None
        for name in ("script", "style"):
            if _looks_tag_start(src, i, name):
                tag = name
                break
        if tag:
            open_end = _read_tag(src, i)          # 开标签之后的下标
            open_tag = src[i:open_end]
            body_start = open_end
            is_js = True
            if tag == "script":
                is_js = _script_is_js(open_tag)
                if is_js:
                    # JS：词法扫描找真正闭合的 </script（跳过字符串/注释/模板）
                    rel = _find_script_close(src[body_start:])
                    if rel == -1:
                        # 字符串未闭合等情形下漏判 → 回退到字面 </script
                        rel = src[body_start:].lower().find("</script")
                    if rel == -1:
                        # 通篇没有闭合标签：剩余内容原样保留，绝不按代码整段截断
                        out.append(src[i:])
                        break
                else:
                    # 数据型脚本（ld+json/json…）：整段原样，不做任何 JS 解析
                    rel = src[body_start:].lower().find("</script")
                    if rel == -1:
                        out.append(src[i:])
                        break
            else:
                # style 内为纯 CSS，只需避开字符串；找 </style 即可
                rel = src[body_start:].lower().find("</style")
                if rel == -1:
                    # 找不到闭合：剩余全部按 CSS 去注释，避免死循环
                    stripped, rc, rb = strip_css(src[body_start:])
                    out.append(src[i:body_start])
                    out.append(stripped)
                    removed_chars += rc
                    removed_blocks += rb
                    i = n
                    continue
            close_at = body_start + rel
            # 把 </... > 结束标签完整拷到 '>'（容忍结尾属性）
            close_end = close_at
            g = src.find(">", close_at)
            if g != -1:
                close_end = g + 1
            else:
                close_end = n
            body = src[body_start:close_at]
            closing = src[close_at:close_end]
            if tag == "script":
                if is_js:
                    stripped, rc, rb = strip_js(body)
                else:
                    stripped, rc, rb = body, 0, 0   # 数据型脚本原样保留
            else:
                stripped, rc, rb = strip_css(body)
            removed_chars += rc
            removed_blocks += rb
            out.append(src[i:body_start])
            out.append(stripped)
            out.append(closing)
            i = close_end
            continue

        # 原始文本标签：整段保密（textarea/template/…，内含的 <!-- 不应删）
        raw_name = None
        for name in _RAW_TAGS:
            if _looks_tag_start(src, i, name):
                raw_name = name
                break
        if raw_name:
            open_end = _read_tag(src, i)
            ci = _close_tag_idx(src[open_end:], raw_name)
            if ci == -1:
                out.append(src[i:])
                i = n
                continue
            close_at = open_end + ci
            g = src.find(">", close_at)
            close_end = n if g == -1 else g + 1
            out.append(src[i:close_end])
            i = close_end
            continue

        out.append(src[i])
        i += 1

    return "".join(out), removed_chars, removed_blocks, removed_blocks


# ----------------------------- 文件读写与入口 -----------------------------

_EXT_JS = frozenset(("js", "mjs", "cjs"))
_EXT_CSS = frozenset(("css",))
_EXT_HTML = frozenset(("html", "htm", "xhtml"))


def _decode(raw):
    bom = raw.startswith(b"\xef\xbb\xbf")
    if bom:
        return raw[3:].decode("utf-8", errors="replace"), True
    try:
        return raw.decode("utf-8"), False
    except UnicodeDecodeError:
        return raw.decode("gb18030", errors="replace"), False


def _encode(text, had_bom):
    data = text.encode("utf-8", errors="replace")
    if had_bom:
        data = b"\xef\xbb\xbf" + data
    return data


def strip_file(path, ext, keep_functional=True):
    with open(path, "rb") as f:
        raw = f.read()
    text, bom = _decode(raw)
    if ext in _EXT_JS:
        new_text, rc, rb = strip_js(text)
        block_count = rb
    elif ext in _EXT_CSS:
        new_text, rc, rb = strip_css(text)
        block_count = rb
    else:
        new_text, rc, rb, block_count = strip_html(text, keep_functional=keep_functional)
    if not new_text and text:
        new_text = text  # 防止空结果误删整文件
    return text, new_text, rc, block_count


def delete_backups(paths, exclude_dirs):
    """删除路径范围内所有 .bak 备份文件（--backup 的生成物），返回已删列表。"""
    deleted = []
    for p in paths:
        if os.path.isfile(p):
            if p.lower().endswith(".bak"):
                try:
                    os.remove(p)
                    deleted.append(p)
                except OSError as exc:
                    print("删除失败:", p, exc)
            continue
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for fn in files:
                if not fn.lower().endswith(".bak"):
                    continue
                full = os.path.join(root, fn)
                try:
                    os.remove(full)
                    deleted.append(full)
                except OSError as exc:
                    print("删除失败:", full, exc)
    return deleted


def collect_files(paths, exts, exclude_dirs, skip_min):
    """收集待处理文件（backrooms 目录同样处理，不做特殊跳过）。"""
    found = []
    exts = {e.lower().lstrip(".") for e in exts}
    for p in paths:
        if os.path.isfile(p):
            ext = os.path.splitext(p)[1].lstrip(".").lower()
            if ext in exts:
                found.append(p)
            continue
        for root, dirs, files in os.walk(p):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for fn in files:
                ext = os.path.splitext(fn)[1].lstrip(".").lower()
                if ext not in exts:
                    continue
                if skip_min and fn.lower().endswith(".min." + ext):
                    continue
                found.append(os.path.join(root, fn))
    return sorted(found)


def _selftest():
    """小自检：确保去注释不会误删字符串/正则/模板里的内容。"""
    cases = [
        # (输入, 应当保留的关键子串)
        ('var u = "http://a.com"; // 注释', "http://a.com"),
        ('var x = "// 不是注释"; // 是注释', '"// 不是注释"'),
        ("a.replace(/a\\/b/g, '-'); // 注释", "/a\\/b/g"),
        ("const s = `a // 字面\n b ${x + 1} c`;", "`a // 字面\n b ${x + 1} c`"),
        ("const s = `<div>${'</div>'}</div>`; // x", "'</div>'"),
        ("return/*c*/1;", "return 1;"),
        ("x = a/* multi\n line */b;", "a\nb"),
        ("var re = /ab+c/gi; // 注释", "/ab+c/gi"),
        ("total = price / 2; // 注释", "price / 2"),
        ("f(/*x*/1)", "f( 1)"),
        ("var x = 1;/* only comment */", "var x = 1; "),
    ]
    fails = 0
    for code, keep in cases:
        got, rc, rb = strip_js(code)
        if keep not in got:
            fails += 1
            print("FAIL:", repr(code))
            print("   keep 期待包含:", repr(keep))
            print("   got  :", repr(got))
    html_cases = [
        ("a<!-- 注释 -->b", "ab"),
        ("<script>x = '<!-- 不是注释'; // t</script>", "'<!-- 不是注释'"),
        ("<textarea><!-- 保留 --></textarea>", "<!-- 保留 -->"),
        ("<style>/* c */ .a { color: red; }</style>", ".a { color: red; }"),
        # 功能性注释默认保留
        ("<div><!--[if IE]>x<![endif]--></div>", "<!--[if IE]>x<![endif]-->"),
        ("<ul><!-- ko foreach: items --><li>a</li><!-- /ko --></ul>", "<!-- ko foreach: items -->"),
        # 未闭合 <!-- 一律不删（防误删正文）
        ("body <!-- 未闭合注释尾巴", "<!-- 未闭合注释尾巴"),
        ("a<!-- x -->b<!-- 未闭合尾巴", "<!-- 未闭合尾巴"),
    ]
    for code, keep in html_cases:
        got, rc, rb, _ = strip_html(code)
        if keep not in got:
            fails += 1
            print("FAIL-HTML:", repr(code), "=>", repr(got))
    # 回归：https://、http:// 及正文里的 // 绝不能当注释删掉
    reg_cases = [
        # 纯正文里的 URL
        ('<p>官网 https://a.com/b 见 http://c.cn/d</p>',
         ["https://a.com/b", "http://c.cn/d"]),
        # 数据型 script（ld+json）整段保留，其后正文不受影响
        ('<script type="application/ld+json">\n{"@context": "https://schema.org", "u": "http://x.cn/y"}\n</script>\n<p>正文 https://a.com/z</p>',
         ["https://schema.org", "http://x.cn/y", "https://a.com/z"]),
        # 真正的 JS 脚本：字符串内 URL 保留、行注释被删、脚本后正文不受影响
        ('<script>\nvar s = "https://a.com/b"; // 行注释\nvar t = "http://x.cn";\n</script>\n<p>https://keep.com/t</p>',
         ["https://a.com/b", "http://x.cn", "https://keep.com/t"]),
        # JS 字符串中的 </script> 已转义，不应影响后续正文
        ('<script>var s = "<\\/script>"; // t\n</script>\n<p>https://end.com/x</p>',
         ["https://end.com/x"]),
        # 数据型脚本缺闭合标签：剩余原文保留，绝不当 JS 截断
        ('<script type="application/json">{"u":"http://x.cn"}\n<p>正文 https://a.com/b',
         ["http://x.cn", "https://a.com/b"]),
    ]
    for code, keeps in reg_cases:
        got, rc, rb, _ = strip_html(code)
        for k in keeps:
            if k not in got:
                fails += 1
                print("FAIL-REG:", repr(code), "=> 缺", repr(k), "got=", repr(got))
    # 未闭合 /* 的 JS/CSS 一律不删
    for fn in (strip_js, strip_css):
        code = 'x = 1; /* 未闭合尾巴'
        got, rc, rb = fn(code)
        if "/* 未闭合尾巴" not in got:
            fails += 1
            print("FAIL-UNCLOSED:", fn.__name__, "=>", repr(got))
    # collect_files：backrooms 目录默认同样处理（不跳过）
    try:
        import tempfile
        import shutil
        tmp = tempfile.mkdtemp(prefix="sc_test_")
        os.makedirs(os.path.join(tmp, "backrooms", "levels"))
        os.makedirs(os.path.join(tmp, "site"))
        open(os.path.join(tmp, "backrooms", "levels", "a.html"), "w", encoding="utf-8").write("x")
        open(os.path.join(tmp, "site", "b.html"), "w", encoding="utf-8").write("y")
        got = collect_files([tmp], ["html"], {"node_modules"}, False)
        rels = [os.path.relpath(p, tmp) for p in got]

        def _parts(r):
            return r.split(os.sep)

        if not any("backrooms" in _parts(r) for r in rels) or not any(_parts(r)[-2:] == ["site", "b.html"] for r in rels):
            fails += 1
            print("FAIL-COLLECT:", rels)
        shutil.rmtree(tmp, ignore_errors=True)
    except Exception as exc:
        fails += 1
        print("FAIL-COLLECT-EXC:", exc)
    if fails:
        print("自检未通过：%d 项" % fails)
        return 1
    print("自检通过（%d 项 JS + %d 项 HTML）" % (len(cases), len(html_cases)))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="去除 HTML/JS/CSS 注释（默认仅预览）")
    ap.add_argument("paths", nargs="*", help="文件或目录，可多个；空则用 .")
    ap.add_argument("--ext", nargs="*", default=["html", "htm", "js", "mjs", "cjs", "css"],
                    help="要处理的扩展名")
    ap.add_argument("--write", action="store_true", help="真正写回文件（默认只预览）")
    ap.add_argument("--backup", action="store_true", help="写回前生成 .bak")
    ap.add_argument("--skip-min", action="store_true", help="跳过 *.min.js 等已压缩文件")
    ap.add_argument("--exclude-dir", nargs="*", default=["node_modules", ".git", "__pycache__", ".venv"],
                    help="遍历时跳过的目录名")
    ap.add_argument("--strip-functional", action="store_true",
                    help="同时删除条件注释等“功能性注释”（默认保留）")
    ap.add_argument("--selftest", action="store_true", help="运行内置自检后退出")
    ap.add_argument("--delete-backups", action="store_true",
                    help="删除路径范围内所有 .bak 备份后退出（不做清理）")
    args = ap.parse_args(argv)

    if args.selftest:
        return _selftest()

    paths = args.paths or ["."]
    if args.delete_backups:
        deleted = delete_backups(paths, set(args.exclude_dir))
        for d in deleted:
            print("[删除备份]", d)
        print("共删除 %d 个 .bak 备份文件。" % len(deleted))
        return 0

    files = collect_files(paths, args.ext, set(args.exclude_dir), args.skip_min)
    if not files:
        print("没有找到可处理的文件。")
        return 1

    total_rm = 0
    changed = 0
    for path in files:
        keep_functional = not args.strip_functional
        text, new_text, rc, _ = strip_file(path, os.path.splitext(path)[1].lstrip(".").lower(),
                                           keep_functional=keep_functional)
        if not text or not new_text:
            print("跳过(读取失败/为空):", path)
            continue
        if new_text == text or rc == 0:
            continue
        changed += 1
        total_rm += rc
        saved = len(text.encode("utf-8", errors="replace")) - len(new_text.encode("utf-8", errors="replace"))
        print(("[写] " if args.write else "[预览] ") + path +
              "  删注释≈%d字符 省%d字节" % (rc, saved))
        if args.write:
            if args.backup:
                bak = path + ".bak"
                with open(bak, "wb") as f:
                    f.write(text.encode("utf-8", errors="replace"))
            with open(path, "wb") as f:
                f.write(_encode(new_text, text.startswith("\ufeff")))

    print("\n共扫描 %d 个文件，%d 个含注释，累计删除注释约 %d 字符。" % (len(files), changed, total_rm))
    if not args.write:
        print("本次仅预览。确认无误后请加 --write 真正改写（建议先 --backup）。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
