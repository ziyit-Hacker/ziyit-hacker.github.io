# -*- coding: utf-8 -*-
"""
站内搜索清单生成器
递归扫描站点目录下所有 .html 文件，自动生成 assets/site-index.js（SITE_PAGES 数组）。
运行方式：python build_site_index.py
生成文件被 search.html 引用，请勿手动编辑生成结果。
"""
import os

# 站点根目录（本文件所在目录的上一级，脚本位于站点根目录时即其自身所在目录）
ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "assets", "site-index.js")

# 需要跳过的目录（构建产物、版本库等，不进入站内索引）
EXCLUDE_DIRS = {".git", ".vscode", "node_modules", "__pycache__", "dist", "build"}


def collect_html(root):
    """递归收集 root 下所有 .html 文件的站点相对路径（正斜杠分隔）。"""
    pages = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fn in filenames:
            if fn.endswith(".html"):
                rel = os.path.relpath(os.path.join(dirpath, fn), root)
                pages.append(rel.replace("\\", "/"))
    pages.sort()
    return pages


def main():
    pages = collect_html(ROOT)
    if not pages:
        raise SystemExit("未找到任何 .html 文件，请检查目录：" + ROOT)

    lines = [
        "/* 站内搜索页面清单：由 build_site_index.py 自动生成，请勿手动编辑 */",
        "var SITE_PAGES = [",
        ",\n".join("    %r" % p for p in pages),
        "];",
    ]
    content = "\n".join(lines) + "\n"

    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)

    print("已生成 %s，共 %d 个页面" % (OUT, len(pages)))


if __name__ == "__main__":
    main()
