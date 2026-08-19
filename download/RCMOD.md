# Release Control MOD/DLC 系统开发者文档

**版本**: 26.8
**最后更新**: 2026-07-15

---

## 目录

1. [概述](#1. 概述)
2. [快速开始](#2. 快速开始)
3. [ModConfig.json 完整参考](#3. ModConfig.json 完整参考)
4. [MOD/DLC 加载流程](#4. MOD/DLC 加载流程)
5. [核心 API 引用](#5. 核心 API 引用)
6. [授权验证详解](#6. 授权验证详解)
7. [ZEP 2 编码规范](#7. ZEP 2 编码规范)
8. [禁止使用的类名和函数名](#8. 禁止使用的类名和函数名)
9. [Mixin 编写方案](#9. Mixin 编写方案)
10. [多语言支持](#10. 多语言支持)
11. [版本兼容性](#11. 版本兼容性)
12. [调试技巧](#12. 调试技巧)
13. [打包工具](#13. 打包工具)
14. [MOD 目录结构](#14. MOD 目录结构)
15. [管理界面](#15. 管理界面)
16. [发布流程](#16. 发布流程)
17. [安全考虑](#17. 安全考虑)
18. [最佳实践](#18. 最佳实践)
19. [高级功能](#19. 高级功能)
20. [故障排查指南](#20. 故障排查指南)
21. [与主程序交互](#21. 与主程序交互)
22. [测试与发布](#22. 测试与发布)
23. [常见问题（FAQ）](#23. 常见问题（FAQ）)
24. [进程上下文菜单扩展](#24. 进程上下文菜单扩展)
25. [进程作业管理](#25. 进程作业管理)
26. [进程暂停与恢复](#26. 进程暂停与恢复)
27. [进程延迟操作](#27. 进程延迟操作)
28. [进程深度分析](#28. 进程深度分析)
29. [实时性能监控](#29. 实时性能监控)
30. [网络连接查看器](#30. 网络连接查看器)
31. [内存清理工具](#31. 内存清理工具)
32. [PDF417 条形码支持](#32. PDF417 条形码支持)
33. [文件安全销毁工具](#33. 文件安全销毁工具)
34. [密码工具与字典生成器](#34. 密码工具与字典生成器)
35. [主题管理](#35. 主题管理)
36. [CLI 命令行工具](#36. CLI 命令行工具)
37. [附录 A：完整 API 速查表](#附录 A：完整 API 速查表)
38. [附录 B：错误代码参考](#附录 B：错误代码参考)
39. [附录 C：术语表](#附录 C：术语表)
40. [附录 D：完整示例 MOD](#附录 D：完整示例 MOD)
41. [附录 E：版本更新日志格式](#附录 E：版本更新日志格式)
42. [附录 F：贡献指南](#附录 F：贡献指南)
43. [附录 G：CoreToolkit 前置 DLC 开发接口](#附录 G：CoreToolkit 前置 DLC 开发接口)

---

## 1. 概述

Release Control 是一款专业的 Windows 进程管理工具，支持通过 **MOD** 和 **DLC** 扩展程序功能。本系统设计强调安全性、灵活性和易用性，开发者可以自由扩展功能，官方可发布付费 DLC。

| 类型| License 字段 | 来源| 付费 | 菜单位置 |
| ------- | -------------- | ----------------- | -------- | ---------- |
| **DLC** | `ZIYIT STUDIO` | ZIYIT STUDIO 官方 | 需要授权 | `DLC` 菜单 |
| **MOD** | 其他任何值 | 社区/第三方 | 免费 | `MOD` 菜单 |

`License` 字段仅用于区分官方与第三方，不参与付费验证。DLC 的授权完全由服务器数据决定。

### 1.1 系统架构

Release Control 采用模块化架构，核心功能与扩展功能分离：

```
┌─────────────────────────────────────────────────────────────┐
│ Release Control 主程序│
│┌───────────────────────────────────────────────────────┐│
││核心引擎（进程管理、许可证验证、日志系统、UI框架） ││
│└───────────────────────────────────────────────────────┘│
│ │ │
│┌──────────────┼──────────────┐│
│▼▼▼│
│┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
││MOD 扩展│ │DLC 扩展│ │系统工具 │ │
││(社区驱动)│ │(官方付费) │ │(内置功能) │ │
│└──────────────┘ └──────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计原则

1. **安全性优先**：所有 MOD/DLC 代码运行在沙箱环境中，危险函数被拦截或替换
2. **热加载机制**：程序启动时自动扫描并加载 `Mods/` 目录下的所有扩展包
3. **版本兼容性**：通过 `MinVersion`/`MaxVersion` 字段确保扩展与主程序版本匹配
4. **多语言支持**：内置 13+ 语言翻译框架，扩展可无缝集成
5. **授权分离**：DLC 授权完全由服务器数据决定，防止本地篡改

---

## 2. 快速开始

### 2.1 环境要求
- Windows 10 或更高版本（x64）
- 已安装 Release Control 主程序（`Taskmgr.exe`）
- 开发时可用任意文本编辑器，推荐 VS Code 或 PyCharm
- 建议掌握 Python 3.14 基础语法
- 了解 Tkinter 基础（如需开发 UI 功能）

### 2.2 创建第一个 MOD

1. **建立项目目录**
 ```
 MyFirstMod/
 ```

2. **手动编写 ModConfig.json**
 ```json
 {
 "Name": "MyFirstMod",
 "License": "MIT",
 "Version": "1.0.0",
 "Author": "Your Name",
 "Description": "示例 MOD",
 "MinVersion": "26.5",
 "MaxVersion": "26.9",
 "Dependencies": [],
 "import": [],
 "Path": {
 "MainCode": "main.py",
 "Code": [],
 "Lang": {}
 },
 "Menu": [
 {
 "label": "Hello",
 "command": "say_hello"
 }
 ]
 }
 ```

3. **编写 main.py**
 ```python
 def say_hello(app):
 app.log_message('Hello from MOD', 'info')
 from tkinter import messagebox
 messagebox.showinfo('MOD', 'Hello World!')
 ```

4. **打包**
 ```bash
 Taskmgr.exe --pack MyFirstMod --output MyFirstMod.rcm
 ```

5. **安装**
 - 将 `MyFirstMod.rcm` 放入程序根目录的 `Mods/` 文件夹（若不存在则创建）
 - 或者直接拖拽 `.rcm` 文件到主程序窗口
 - 重启程序，在 `MOD` 菜单下即可看到 `Hello` 项

### 2.3 使用 GUI 打包工具

```bash
Taskmgr.exe --pack-gui
```
或在主程序菜单 `工具` → `打包工具` 中打开。

**操作流程**：
1. 选择包含 MOD 源码的目录
2. 在 GUI 表单中填写所有配置字段
3. 通过图形界面添加依赖、导入、语言映射、菜单项
4. 点击"验证配置"检查完整性
5. 点击"打包"自动生成 `ModConfig.json` 并打包为 `.rcm`

**GUI 提供的输入控件**：
- 文本输入框：名称、版本、作者、描述、许可证、最低/最高版本
- 列表管理器：依赖、导入、额外代码文件
- 表格管理器：语言映射（语言代码 → 文件路径）
- 表格管理器：菜单项（标签 → 命令函数）
- 文件选择器：源码目录、主入口文件、语言文件

---

## 3. ModConfig.json 完整参考

### 3.1 两种生成方式

| 方式 | 说明 | 适用场景 |
| ---------------- | ------------------------------ | ---------------------------- |
| **手动编写** | 直接用文本编辑器创建 JSON 文件 | 熟悉 JSON 格式，需要精确控制 |
| **程序自动生成** | 通过 GUI 打包工具填写表单生成| 不熟悉 JSON，避免格式错误|

程序化创建示例（Python）：
```python
import json
config = {
"Name": "MyAutoMod",
"License": "MIT",
"Version": "1.0.0",
"Author": "Your Name",
"Description": "自动生成的 MOD",
"MinVersion": "26.5",
"MaxVersion": "26.9",
"Dependencies": [],
"import": ["json"],
"Path": {
"MainCode": "main.py",
"Code": ["utils.py"],
"Lang": {"zh_cn": "lang/zh_cn.json"}
},
"Menu": [{"label": "menu.example.action", "command": "example_command"}]
}
with open('ModConfig.json', 'w', encoding='utf-8') as f:
json.dump(config, f, ensure_ascii=False, indent=2)
```

### 3.2 顶层字段详解

| 字段 | 类型 | 必填 | 说明 |
| -------------- | ------ | ---- | ------------------------------------------------------------ |
| `Name` | string | 是 | 唯一标识符，不要求与文件名一致，用于内部识别和授权匹配。长度 1-64 字符，仅允许字母、数字、下划线 |
| `License`| string | 是 | `"ZIYIT STUDIO"` 为 DLC，其他值为 MOD。大小写敏感|
| `Version`| string | 是 | 语义化版本号，如 `1.2.3`。必须符合 SemVer 规范 |
| `Author` | string | 否 | 作者名称或昵称，建议不超过 32 字符 |
| `Description`| string | 否 | 功能描述，建议不超过 200 字符，可引用翻译键|
| `MinVersion` | string | 否 | 兼容的最低程序版本，如 `"26.5"`。为空则无下限|
| `MaxVersion` | string | 否 | 兼容的最高程序版本，如 `"26.9"`。为空则无上限|
| `Dependencies` | array| 否 | 依赖的其他 MOD/DLC 的 `Name` 列表，程序会按拓扑顺序加载|
| `import` | array| 否 | 允许导入的 Python 库白名单（如 `["psutil", "json"]`），未声明的库将被拒绝 |
| `Path` | object | 是 | 文件路径配置（见 3.3） |
| `Menu` | array| 是 | 菜单项列表（见 3.4） |

**字段校验规则**：
- `Name`：必须以字母或下划线开头，不能包含空格或特殊字符
- `Version`：必须符合 `MAJOR.MINOR.PATCH` 格式，如 `1.2.3`
- `License`：若为 `"ZIYIT STUDIO"`，程序会执行 DLC 授权验证；其他值视为 MOD
- `MinVersion` 和 `MaxVersion`：若同时指定，必须满足 `MinVersion <= MaxVersion`
- `Dependencies`：循环依赖会被检测并阻止加载
- `import`：仅允许标准库和已在主程序中使用的第三方库（如 `psutil`, `json`, `tkinter` 等）

### 3.3 Path 对象

| 字段 | 类型 | 必填 | 说明 |
| ---------- | ------ | ---- | ------------------------------------------------------------ |
| `MainCode` | string | 是 | 主入口文件（如 `main.py`），相对于解压根目录 |
| `Code` | array| 否 | 额外 Python 文件列表，这些文件会被添加到 `sys.path`，可在 `MainCode` 中导入 |
| `Lang` | object | 否 | 多语言文件映射，键为语言代码（如 `zh_cn`），值为相对路径（如 `lang/zh_cn.json`） |

**文件路径规则**：
- 所有路径使用正斜杠 `/` 或反斜杠 `\`，程序会自动转换
- 路径相对于解压根目录（MOD 根目录）
- 引用的所有文件必须在 `.rcm` 包内存在，否则打包时会报错

### 3.4 Menu 数组项

| 字段| 类型 | 必填 | 说明 |
| --------- | ------ | ---- | ------------------------------------------------------------ |
| `label` | string | 是 | 菜单显示文本（可直接写原文，或使用翻译键） |
| `command` | string | 是 | 在 `MainCode` 中定义的函数名，**该函数必须接受一个参数 `app`** |

**菜单项规则**：
- 至少包含一个菜单项，否则 MOD 不会显示
- 如果 `label` 以 `menu.` 开头，程序会自动调用 `app.get_text` 进行翻译
- `command` 指定的函数必须在 `MainCode` 中定义，否则会报 `Command not found`
- 多个 MOD/DLC 可定义相同 `label`，后加载的覆盖先加载的（DLC 优先于 MOD）

### 3.5 完整示例

```json
{
"Name": "AdvancedProcessManager",
"License": "ZIYIT STUDIO",
"Version": "1.0.0",
"Author": "ZIYIT STUDIO",
"Description": "高级进程管理功能",
"MinVersion": "26.5",
"MaxVersion": "26.9",
"Dependencies": ["NetworkMonitor"],
"import": ["psutil", "json", "tkinter"],
"Path": {
"MainCode": "main.py",
"Code": ["utils.py", "handlers.py"],
"Lang": {
"zh_cn": "lang/zh_cn.json",
"us_en": "lang/us_en.json",
"ja_jp": "lang/ja_jp.json"
}
},
"Menu": [
{
"label": "menu.mod.advanced_process.dialog",
"command": "open_advanced_process_dialog"
},
{
"label": "menu.mod.advanced_process.settings",
"command": "open_advanced_process_settings"
}
]
}
```

---

## 4. MOD/DLC 加载流程

程序启动时自动执行以下加载流程：

```
程序启动
│
▼
下载远程文件（缓存 24 小时）
├── 从 https://ziyit-hacker.github.io/Update/DLCL.txt 获取官方 DLC 列表
└── 从 https://ziyit-hacker.github.io/Update/DLC.txt 获取所有用户授权记录
│
▼
扫描 Mods/*.rcm 文件
│
▼
对每个 .rcm 文件：
│
├── 检查是否已解压
│ ├── 若 %APPDATA%\LocalLow\Release_control\Mods\[Name]\ 不存在 → 解压
│ ├── 若存在但 .rcm 修改时间新于解压目录 → 重新解压覆盖
│ └── 否则跳过
│
├── 读取 ModConfig.json
│
├── 版本兼容性检查（MinVersion / MaxVersion）
│ └── 不满足 → 跳过加载，记录日志
│
├── 依赖检查（Dependencies）
│ ├── 若依赖未加载 → 按拓扑排序等待
│ └── 若依赖缺失 → 跳过，记录日志
│
├── 类型判定
│ ├── License == "ZIYIT STUDIO" → 标记为 DLC
│ └── 否则 → 标记为 MOD
│
├── DLC 授权验证（仅当标记为 DLC 时）
│ ├── 检查当前 Name 是否存在于 DLCL.txt
│ │ └── 不存在 → 跳过加载（非官方 DLC）
│ ├── 从 DLC.txt 中查找当前 NRCL 用户名
│ │ └── 若用户不存在 → 跳过加载（无授权）
│ ├── 检查该用户的 ListAcquiredDLC 中是否包含当前 Name
│ │ └── 不包含 → 跳过加载（未购买）
│ └── 全部通过 → 允许加载
│
└── 加载执行
├── 将 Path.Code 和 Path.MainCode 目录加入 sys.path
├── 执行 Path.MainCode（使用 exec 或 import）
├── 注册 Menu 中定义的函数
├── 将菜单项挂载到对应的顶级菜单（DLC 或 MOD）
└── 加载语言文件并合并到全局翻译缓存
```

**时序说明**：
1. 程序启动时首先初始化许可证管理器，验证用户身份。
2. 然后创建主菜单（`create_widgets`），此时 `MOD` 和 `DLC` 顶级菜单已存在。
3. 接着初始化 `ModManager`，扫描并加载 MOD。
4. 每个 MOD 的加载过程包括解压、配置验证、依赖检查、授权验证和最终加载。
5. 加载完成后，菜单项会动态添加到对应的顶级菜单下。

### 4.1 加载顺序

1. 先加载所有 DLC（按 `DLCL.txt` 顺序）
2. 再加载所有 MOD（按 `Name` 字母序）
3. 依赖解析：若 A 依赖 B，B 必须在 A 之前加载

### 4.2 冲突处理

- 多个 MOD/DLC 定义相同的菜单项标签，后加载的覆盖先加载的，DLC 优先于 MOD
- 函数名冲突时后加载的覆盖前一个，建议使用前缀命名避免冲突

---

## 5. 核心 API 引用

以下列出程序向 MOD/DLC 暴露的所有可访问对象和方法。所有方法均通过 `app` 参数调用。

### 5.1 核心属性（只读）

#### `app.root`
- 类型：`tk.Tk`
- 说明：主窗口根对象，可用于创建子窗口、对话框等。
- 注意：不要调用 `app.root.mainloop()` 或 `app.root.destroy()`，这些由主程序管理。

#### `app.config`
- 类型：`configparser.ConfigParser`
- 说明：配置对象，可用于读写 `config.ini` 中的设置。
- 示例：`app.config.get('Settings', 'language')`

#### `app.selected_processes`
- 类型：`list[int]`
- 说明：当前用户选中的进程 PID 列表（只读副本）。

#### `app.all_process_data`
- 类型：`list[dict]`
- 说明：当前所有进程数据，每项包含以下字段：
- `pid`: int
- `name`: str（原始进程名）
- `display_name`: str（显示名称，可能已本地化）
- `status`: str
- `cpu_percent`: str（格式为 `"0.0"`）
- `memory_mb`: str（格式为 `"0.0"`）
- `create_time`: str（格式 `"YYYY-MM-DD HH:MM:SS"`）
- `is_selected`: str（`"☑"` 或 `"☐"`）

#### `app.user_level`
- 类型：`str`
- 说明：当前用户权限等级，可能值为：
- `"Tr"`：试用版（功能受限）
- `"Or"`：普通版
- `"Pr"`：专业版（全部功能可用）

#### `app.license_info`
- 类型：`dict`
- 说明：许可证信息，包含：
- `username`: str
- `product_key`: str
- `max_days`: int（-1 表示无限）
- `register_timestamp`: int（注册时间戳）
- `level`: str（同 `user_level`）

#### `app.current_language`
- 类型：`str`
- 说明：当前语言代码，如 `"zh_cn"`。

#### `app.version`
- 类型：`str`
- 说明：主程序版本号，如 `"26.7-snapshot-26W26B"`。

#### `app.running`
- 类型：`bool`
- 说明：程序是否正在运行（可用于后台循环判断）。

#### `app._mod_translations`
- 类型：`dict`
- 说明：已加载 MOD 的翻译数据（键为 MOD 名称，值为语言字典）。仅读取，不应修改。

#### `app.mod_manager`
- 类型：`ModManager`
- 说明：MOD 管理器实例，可调用其方法进行安装、卸载等操作。

#### `app._translation_cache`
- 类型：`dict`
- 说明：翻译缓存（键为翻译键，值为翻译结果）。仅读取，不应修改。

#### `app.lang_data`
- 类型：`dict`
- 说明：当前语言数据（从语言文件加载）。仅读取，不应修改。

#### `app.process_name_map`
- 类型：`dict`
- 说明：进程名称映射表（英文→中文），用于本地化进程显示。

#### `app.whitelist_manager`
- 类型：`WhitelistManager`
- 说明：白名单管理器实例，可调用其方法检查进程是否在白名单中。

#### `app.history_manager`
- 类型：`ProcessHistoryManager`
- 说明：进程历史记录管理器，可获取进程历史数据。

#### `app.license_manager`
- 类型：`EnhancedLicenseManager`
- 说明：许可证管理器实例，可进行许可证验证等操作。

#### `app.theme_manager`
- 类型：`ThemeManager`
- 说明：主题管理器实例，可获取或设置主题。

#### `app.log_buffer`
- 类型：`list`
- 说明：日志缓冲区（存储未写入文件的日志条目），用于调试。

#### `app.developer_mode`
- 类型：`bool`
- 说明：开发者模式是否开启。

#### `app.tray_icon`
- 类型：`pystray.Icon`
- 说明：系统托盘图标对象（若已创建）。

#### `app.minimize_to_tray`
- 类型：`bool`
- 说明：是否启用“关闭窗口时最小化到托盘”。

#### `app.startup_to_tray`
- 类型：`bool`
- 说明：启动时是否自动最小化到托盘。

#### `app.offline_mode`
- 类型：`bool`
- 说明：是否处于离线模式（网络不可用时启用）。

### 5.2 日志方法

#### `app.log_message(message, level='info', process_info=None)`
- **参数**：
- `message` (str)：日志内容
- `level` (str)：日志级别，可选 `'debug'`, `'info'`, `'warning'`, `'error'`, `'fuck'`（`fuck` 会立即退出程序）
- `process_info` (dict/list/tuple, optional)：进程信息，会自动附加到日志中
- **说明**：写入日志，自动添加时间戳和级别前缀。若为 `'fuck'` 级别，会强制刷新缓冲区并退出。
- **示例**：`app.log_message('User clicked button', 'info')`
- **注意**：`'fuck'` 级别仅用于致命错误，正常情况应使用 `'error'`。

#### `app.save_logs_to_file()`
- **参数**：无
- **说明**：立即将日志缓冲区内容写入文件。
- **示例**：`app.save_logs_to_file()`

#### `app._force_save_buffer()`
- **参数**：无
- **说明**：强制将日志缓冲区写入文件（内部方法，一般无需调用）。

#### `app._save_log_immediately(log_entry)`
- **参数**：
- `log_entry` (str)：单条日志内容
- **说明**：立即保存单条日志（用于"及时保存"模式）。

### 5.3 翻译方法

#### `app.get_text(key, default=None)`
- **参数**：
- `key` (str)：翻译键，如 `"dialog.title"`
- `default` (str, optional)：若找不到翻译时的默认值
- **返回值**：`str` – 翻译后的文本
- **说明**：根据当前语言返回翻译。若未找到，尝试从已加载的 MOD 翻译中查找，最后返回 `default` 或 `key` 本身。
- **示例**：`title = app.get_text('dialog.title', 'Dialog')`

#### `app.reload_language()`
- **参数**：无
- **说明**：重新加载当前语言文件，刷新翻译缓存。

#### `app.load_language_file()`
- **参数**：无
- **说明**：加载语言文件到 `lang_data`（内部方法）。

#### `app.language_display_names`
- 类型：`dict`
- 说明：语言代码到显示名称的映射（只读）。例如 `{'zh_cn': '中文 (简体)', 'us_en': 'English (United States)'}`

### 5.4 进程操作方法

#### `app.refresh_process_list()`
- **参数**：无
- **说明**：异步刷新进程列表，更新 `all_process_data` 和 UI。此方法线程安全，不会阻塞 UI。

#### `app._do_refresh_process_list()`
- **参数**：无
- **说明**：执行实际的进程列表刷新（内部方法，一般不直接调用）。

#### `app.kill_selected()`
- **参数**：无
- **说明**：结束当前选中的所有进程。会检查白名单并弹窗确认。

#### `app.kill_process_tree(pid, including_parent=True)`
- **参数**：
- `pid` (int)：要结束的进程 PID
- `including_parent` (bool)：是否结束父进程本身，默认为 `True`
- **返回值**：`bool` – 成功返回 `True`
- **说明**：结束进程树（包括所有子进程），若 `including_parent=True` 则结束父进程。

#### `app.kill_process_tree_selected()`
- **参数**：无
- **说明**：结束选中进程的进程树。

#### `app.find_process_by_name(process_name)`
- **参数**：
- `process_name` (str)：进程名称（支持部分匹配）
- **返回值**：`list[int]` – 匹配的 PID 列表
- **说明**：根据进程名称查找 PID，不区分大小写，支持部分匹配。

#### `app.get_process_display_name(proc_name)`
- **参数**：
- `proc_name` (str)：原始进程名
- **返回值**：`str` – 本地化后的显示名称
- **说明**：若进程名在翻译映射中，返回中文名，否则返回原名。

#### `app.get_selected_processes()`
- **参数**：无
- **返回值**：`list[int]` – 当前选中的 PID 列表
- **说明**：返回选中进程 PID 的副本。

#### `app.clear_selection()`
- **参数**：无
- **说明**：清除所有选中的进程。

#### `app._filter_process_data(process_data, search_keyword)`
- **参数**：
- `process_data` (list)：进程数据列表
- `search_keyword` (str)：搜索关键字
- **返回值**：`list` – 过滤后的进程数据
- **说明**：内部方法，根据关键字过滤进程（匹配名称和显示名）。

#### `app._update_process_tree(process_data)`
- **参数**：
- `process_data` (list)：进程数据列表
- **说明**：更新 UI 中的进程树视图。

#### `app._add_process_batch_to_tree(batch)`
- **参数**：
- `batch` (list)：一批进程数据
- **说明**：批量添加进程到树形视图（优化性能）。

#### `app.save_unlocalized_processes(unlocalized_processes)`
- **参数**：
- `unlocalized_processes` (set)：未本地化的进程名集合
- **说明**：将未本地化的进程名保存到 `exe.log`，供翻译贡献者参考。

### 5.5 进程监控方法

#### `app.open_monitor_manager()`
- **参数**：无
- **说明**：打开监控管理器对话框，用于添加/管理进程监控任务。

#### `app.open_whitelist()`
- **参数**：无
- **说明**：打开白名单设置对话框。

#### `app.check_locked_hosts()`
- **参数**：无
- **说明**：检查并锁定 hosts 文件（由后台线程定时调用）。

#### `app.play_sound_notification()`
- **参数**：无
- **说明**：播放系统声音通知（若设置中启用）。

### 5.6 系统方法

#### `app.save_config()`
- **参数**：无
- **说明**：将当前 `config` 内容写入 `config.ini` 文件。

#### `app.setup_config()`
- **参数**：无
- **说明**：初始化配置文件（若不存在则创建默认设置）。

#### `app.get_network_time()`
- **参数**：无
- **返回值**：`float` – 当前网络时间戳（秒），若不可用则返回本地时间
- **说明**：通过 NTP 服务器获取时间，带缓存。

#### `app.check_permission(feature)`
- **参数**：
- `feature` (str)：功能名称，如 `'kill_tree'`, `'monitor'`, `'developer'` 等
- **返回值**：`bool` – 是否具有权限
- **说明**：根据当前用户等级检查某项功能是否允许。

#### `app.apply_permission_controls()`
- **参数**：无
- **说明**：根据当前权限启用/禁用 UI 控件（如按钮、菜单项）。

#### `app._async_get_ntp_time(get_ntp_time_func)`
- **参数**：
- `get_ntp_time_func` (function)：获取 NTP 时间的函数
- **说明**：异步获取 NTP 时间（内部方法）。

#### `app.start_background_threads()`
- **参数**：无
- **说明**：启动后台线程（进程刷新、服务检查、许可证更新）。

#### `app._process_worker()`
- **参数**：无
- **说明**：后台进程刷新工作线程（内部）。

#### `app._service_worker()`
- **参数**：无
- **说明**：后台服务工作线程（内部）。

#### `app._update_license_worker()`
- **参数**：无
- **说明**：后台许可证更新工作线程（内部）。

#### `app.start_license_check_thread()`
- **参数**：无
- **说明**：启动许可证检查线程（每 5 分钟检查一次）。

#### `app.start_second_check()`
- **参数**：无
- **说明**：启动二次检查循环（每 10 秒检查许可证是否过期）。

#### `app.on_license_expiry()`
- **参数**：无
- **说明**：许可证过期回调，显示提示并可选重新激活。

#### `app.on_server_status_change(connected)`
- **参数**：
- `connected` (bool)：服务器是否连接
- **说明**：服务器状态变化回调。

#### `app.start_remaining_time_updater()`
- **参数**：无
- **说明**：启动剩余时间更新器（每秒更新许可证剩余时间显示）。

#### `app.get_remaining_time_string()`
- **参数**：无
- **返回值**：`str` – 剩余时间字符串，如 `"365d 00h 00m 00s"`
- **说明**：获取当前许可证剩余时间。

### 5.7 UI 方法

#### `app.show_messagebox(msg_type, title_key, message_key=None, *args)`
- **参数**：
- `msg_type` (str)：消息类型，可选 `'info'`, `'warning'`, `'error'`, `'question'`
- `title_key` (str)：标题翻译键
- `message_key` (str, optional)：消息翻译键，若为 `None` 则使用 `title_key`
- `*args`：格式化参数，用于 `message_key` 的 `.format()`
- **返回值**：若 `msg_type == 'question'` 返回 `bool`，否则返回 `None`
- **说明**：显示本地化的消息框。

#### `app.create_tooltip_button(parent, text, command, tooltip_text, action=None)`
- **参数**：
- `parent`：父容器
- `text` (str)：按钮文字
- `command`：点击回调函数
- `tooltip_text` (str)：工具提示文本
- `action` (str, optional)：快捷键动作名称，用于自动添加快捷键提示
- **返回值**：`ttk.Button` – 创建的按钮
- **说明**：创建带有悬停提示的按钮，若指定 `action` 则自动添加快捷键信息。

#### `app.get_button_shortcut_text(action)`
- **参数**：
- `action` (str)：动作名称，如 `'refresh'`, `'kill_selected'`
- **返回值**：`str` – 对应的快捷键字符串，如 `'F5'`
- **说明**：从配置中获取指定动作的快捷键。

#### `app.setup_global_hotkeys()`
- **参数**：无
- **说明**：设置全局快捷键绑定，根据 `config.ini` 中的 `Key` 节。

#### `app.parse_shortcut_to_tkinter(shortcut_str)`
- **参数**：
- `shortcut_str` (str)：快捷键字符串，如 `'Ctrl+F'`, `'F5'`
- **返回值**：`str` 或 `None` – Tkinter 可绑定的格式，如 `'<Control-f>'`
- **说明**：将快捷键字符串转换为 Tkinter 绑定格式。

#### `app.create_menu_bar()`
- **参数**：无
- **说明**：创建主菜单栏（包括文件、视图、操作、工具、帮助等菜单）。

#### `app.create_widgets()`
- **参数**：无
- **说明**：创建所有 UI 控件（搜索框、按钮、进程树等）。

#### `app.create_status_bar(parent)`
- **参数**：
- `parent`：父容器
- **说明**：创建状态栏（显示进程数、内存、CPU 等信息）。

#### `app.update_status_bar()`
- **参数**：无
- **说明**：更新状态栏信息（定时调用）。

#### `app.apply_theme()`
- **参数**：无
- **说明**：应用当前主题（浅色/深色/跟随系统）。

#### `app.apply_theme_to_window(window)`
- **参数**：
- `window`：目标窗口
- **说明**：将主题应用到指定窗口。

#### `app._apply_titlebar_theme(window)`
- **参数**：
- `window`：目标窗口
- **说明**：应用标题栏主题（Windows 10/11 特有）。

#### `app.setup_system_tray()`
- **参数**：无
- **说明**：创建系统托盘图标和菜单。

#### `app.show_window()`
- **参数**：无
- **说明**：从系统托盘恢复主窗口。

#### `app.hide_to_tray()`
- **参数**：无
- **说明**：最小化主窗口到系统托盘。

#### `app.focus_search()`
- **参数**：无
- **说明**：将焦点设置到搜索框。

#### `app.on_close()`
- **参数**：无
- **说明**：窗口关闭事件处理，根据设置最小化到托盘或退出。

#### `app.exit_program()`
- **参数**：无
- **说明**：安全退出程序（保存日志、清理资源）。

#### `app.restart()`
- **参数**：无
- **说明**：重启程序（保存日志，启动新实例后退出当前）。

### 5.8 MOD 管理方法

#### `app.setup_drag_drop()`
- **参数**：无
- **说明**：设置拖拽安装支持，允许用户将 `.rcm` 文件拖入窗口。

#### `app.on_drop(event)`
- **参数**：
- `event`：拖拽事件对象
- **说明**：处理拖拽事件，自动安装 `.rcm` 文件。

#### `app.open_mod_manager()`
- **参数**：无
- **说明**：打开 MOD 管理界面（显示已安装的 MOD 列表，支持卸载）。

#### `app.open_dlc_manager()`
- **参数**：无
- **说明**：打开 DLC 管理界面（显示已安装的 DLC 和授权状态，支持刷新授权和卸载）。

#### `app.open_pack_tool()`
- **参数**：无
- **说明**：打开打包工具 GUI。

### 5.9 搜索与历史方法

#### `app.on_search(event=None)`
- **参数**：
- `event`：事件对象（可选）
- **说明**：执行进程搜索，根据搜索框关键字过滤进程列表。

#### `app.load_search_history()`
- **参数**：无
- **说明**：从 `search.ini` 加载搜索历史。

#### `app.save_search_history()`
- **参数**：无
- **说明**：将搜索历史保存到 `search.ini`。

#### `app.show_search_history_window()`
- **参数**：无
- **说明**：显示搜索历史窗口（以 Treeview 展示历史记录）。

#### `app.update_search_history(keyword)`
- **参数**：
- `keyword` (str)：搜索关键词
- **说明**：更新搜索历史（去重、保留最近 10 条）。

#### `app.clear_search_history()`
- **参数**：无
- **说明**：清空搜索历史。

### 5.10 重要说明：如何在类中使用 `app`

由于命令函数会接收 `app`，如果你想在 MOD 中定义类并在类方法中使用 `app`，有两种标准做法：

**方式一：在类初始化时传入 `app`**
```python
class MyHelper:
def __init__(self, app):
self.app = app
def do_something(self):
self.app.log_message('Doing something', 'info')

def my_command(app):
helper = MyHelper(app)
helper.do_something()
```

**方式二：将 `app` 作为方法参数传递**
```python
class MyHelper:
def do_something(self, app):
app.log_message('Doing something', 'info')

def my_command(app):
helper = MyHelper()
helper.do_something(app)
```

程序本身不会自动为你的类传递 `app`，你必须显式传递。

### 5.11 新增实用 API（v26.8+）

以下 API 方法提供了更多进程、系统、配置和 UI 辅助功能，简化 MOD/DLC 开发。

#### 5.11.1 进程查询方法

##### `app.get_process_by_pid(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`dict | None` - 进程信息字典，包含 `pid`, `name`, `status`, `cpu_percent`, `memory_mb`, `create_time`, `exe`, `username`；进程不存在或无权访问时返回 `None`
- **示例**：
  ```python
  proc_info = app.get_process_by_pid(1234)
  if proc_info:
      print(proc_info['name'], proc_info['cpu_percent'])
  ```

##### `app.get_process_count()`
- **参数**：无
- **返回值**：`int` - 当前系统总进程数
- **示例**：`count = app.get_process_count()`

##### `app.is_process_alive(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`bool` - 进程是否存活
- **示例**：`if app.is_process_alive(pid):`

##### `app.safe_get_process_name(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`str` - 进程名称，失败时返回 `'Unknown'`
- **示例**：`name = app.safe_get_process_name(pid)`

##### `app.safe_get_process_cpu(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`float` - CPU 使用率百分比
- **示例**：`cpu = app.safe_get_process_cpu(pid)`

##### `app.safe_get_process_memory(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`float` - 内存占用（MB）
- **示例**：`mem_mb = app.safe_get_process_memory(pid)`

##### `app.safe_get_process_create_time(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`float` - 创建时间戳（秒）
- **示例**：`ct = app.safe_get_process_create_time(pid)`

##### `app.safe_get_process_status(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`str` - 进程状态，如 `'running'`, `'sleeping'`
- **示例**：`status = app.safe_get_process_status(pid)`

##### `app.safe_get_process_username(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`str` - 所属用户名
- **示例**：`user = app.safe_get_process_username(pid)`

##### `app.safe_get_process_children(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[int]` - 子进程 PID 列表
- **示例**：`children = app.safe_get_process_children(pid)`

##### `app.safe_get_process_parent(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`int` - 父进程 PID，若无父进程返回 0
- **示例**：`ppid = app.safe_get_process_parent(pid)`

#### 5.11.2 系统信息方法

##### `app.get_system_uptime()`
- **参数**：无
- **返回值**：`float` - 系统运行时间（秒）
- **示例**：`uptime = app.get_system_uptime()`

##### `app.get_cpu_count()`
- **参数**：无
- **返回值**：`int` - CPU 逻辑核心数
- **示例**：`cores = app.get_cpu_count()`

##### `app.get_total_memory()`
- **参数**：无
- **返回值**：`int` - 总物理内存（字节）
- **示例**：`total = app.get_total_memory()`

##### `app.get_available_memory()`
- **参数**：无
- **返回值**：`int` - 可用物理内存（字节）
- **示例**：`avail = app.get_available_memory()`

##### `app.get_platform()`
- **参数**：无
- **返回值**：`str` - 操作系统平台标识，如 `'win32'`
- **示例**：`platform = app.get_platform()`

##### `app.get_python_version()`
- **参数**：无
- **返回值**：`str` - Python 版本字符串
- **示例**：`py_ver = app.get_python_version()`

##### `app.get_system_health_data()`
- **参数**：无
- **返回值**：`dict` - 系统健康数据，包含 `cpu_percent`, `memory_percent`, `memory_used`, `memory_total`, `disk_percent`, `disk_used`, `disk_total`, `boot_time`, `process_count`
- **示例**：
  ```python
  health = app.get_system_health_data()
  print(f"CPU: {health['cpu_percent']}%")
  ```

##### `app.get_dashboard_data()`
- **参数**：无
- **返回值**：`dict` - 同 `get_system_health_data()` 的别名方法

##### `app.get_battery_status_data()`
- **参数**：无
- **返回值**：`dict` - 电池状态，包含 `percent`（电量百分比，-1 表示无电池）、`power_plugged`（是否接通电源）、`secsleft`（剩余秒数）
- **示例**：
  ```python
  battery = app.get_battery_status_data()
  if battery['percent'] >= 0:
      print(f"Battery: {battery['percent']}%")
  ```

##### `app.get_process_timeline_data()`
- **参数**：无
- **返回值**：`list[dict]` - 进程启动时间线列表，每项包含 `pid`, `name`, `start_time`（时间戳）
- **示例**：
  ```python
  timeline = app.get_process_timeline_data()
  for p in timeline[:10]:
      print(p['pid'], p['name'])
  ```

##### `app.get_process_ranking_data(sort_by='cpu')`
- **参数**：`sort_by` (str) - 排序方式，`'cpu'` 或 `'memory'`
- **返回值**：`list[dict]` - 前 100 个进程的资源排名，每项包含 `pid`, `name`, `cpu_percent`, `memory_bytes`
- **示例**：
  ```python
  ranking = app.get_process_ranking_data('memory')
  for p in ranking[:5]:
      print(p['name'], p['memory_bytes'] / 1024 / 1024, 'MB')
  ```

#### 5.11.3 配置相关方法

##### `app.get_config_path()`
- **参数**：无
- **返回值**：`str` - config.ini 的完整路径
- **示例**：`path = app.get_config_path()`

##### `app.get_mods_dir()`
- **参数**：无
- **返回值**：`str` - MOD 安装目录路径
- **示例**：`mod_dir = app.get_mods_dir()`

##### `app.get_cache_dir()`
- **参数**：无
- **返回值**：`str` - 缓存目录路径
- **示例**：`cache = app.get_cache_dir()`

##### `app.get_app_data_dir()`
- **参数**：无
- **返回值**：`str` - 应用数据目录路径
- **示例**：`data_dir = app.get_app_data_dir()`

##### `app.get_setting(section, key, default=None)`
- **参数**：`section` (str) - 配置节名，`key` (str) - 配置键名，`default` - 默认值
- **返回值**：`str | None` - 配置值
- **示例**：`value = app.get_setting('MyMod', 'interval', '5')`

##### `app.set_setting(section, key, value)`
- **参数**：`section` (str) - 配置节名，`key` (str) - 配置键名，`value` - 要写入的值
- **说明**：写入配置项并自动保存到 config.ini
- **示例**：`app.set_setting('MyMod', 'enabled', '1')`

##### `app.get_config()`
- **参数**：无
- **返回值**：`ConfigParser` - 配置对象（同 `app.config` 的便捷方法）

#### 5.11.4 工具与 UI 方法

##### `app.format_timestamp(ts)`
- **参数**：`ts` (float) - Unix 时间戳
- **返回值**：`str` - 格式化时间字符串 `'YYYY-MM-DD HH:MM:SS'`
- **示例**：`time_str = app.format_timestamp(ts)`

##### `app.open_url(url)`
- **参数**：`url` (str) - URL 地址
- **说明**：在默认浏览器中打开 URL
- **示例**：`app.open_url('https://example.com')`

##### `app.open_file(file_path)`
- **参数**：`file_path` (str) - 文件路径
- **说明**：使用系统默认程序打开文件
- **示例**：`app.open_file('C:\\path\\to\\file.txt')`

##### `app.open_folder(folder_path)`
- **参数**：`folder_path` (str) - 文件夹路径
- **说明**：在文件管理器中打开文件夹
- **示例**：`app.open_folder('C:\\MyFolder')`

##### `app.show_notification(title, message)`
- **参数**：`title` (str) - 通知标题，`message` (str) - 通知内容
- **说明**：显示系统托盘通知（需系统托盘图标已激活）
- **示例**：`app.show_notification('完成', '操作已成功执行')`

##### `app.show_input_dialog(title, prompt)`
- **参数**：`title` (str) - 对话框标题，`prompt` (str) - 提示文本
- **返回值**：`str | None` - 用户输入内容，取消则返回 `None`
- **示例**：`name = app.show_input_dialog('输入', '请输入名称:')`

##### `app.show_yes_no_dialog(title, message)`
- **参数**：`title` (str) - 对话框标题，`message` (str) - 消息内容
- **返回值**：`bool` - 用户是否选择"是"
- **示例**：`if app.show_yes_no_dialog('确认', '确定要执行吗？'):`

##### `app.clipboard_copy(text)`
- **参数**：`text` (str) - 要复制的文本
- **说明**：将文本复制到剪贴板
- **示例**：`app.clipboard_copy('Hello World')`

##### `app.clipboard_paste()`
- **参数**：无
- **返回值**：`str` - 剪贴板内容
- **示例**：`text = app.clipboard_paste()`

##### `app.create_toplevel(title, geometry=None)`
- **参数**：`title` (str) - 窗口标题，`geometry` (str, optional) - 窗口尺寸，如 `'400x300'`
- **返回值**：`tk.Toplevel | None` - 创建的子窗口对象
- **说明**：创建一个设置了图标和父窗口关系的子窗口
- **示例**：
  ```python
  win = app.create_toplevel('我的窗口', '500x400')
  if win:
      ttk.Label(win, text='Hello').pack()
  ```

##### `app.execute_shell_command(cmd_list, timeout=30)`
- **参数**：`cmd_list` (list[str]) - 命令列表（如 `['ping', '127.0.0.1']`），`timeout` (int) - 超时时间（秒）
- **返回值**：`dict` - 包含 `returncode`, `stdout`, `stderr`
- **说明**：执行 shell 命令并获取输出（不会显示控制台窗口）
- **示例**：
  ```python
  result = app.execute_shell_command(['ipconfig'])
  print(result['stdout'])
  ```

#### 5.11.5 主题与语言方法

##### `app.get_theme()`
- **参数**：无
- **返回值**：`str` - 当前主题名称，`'light'` 或 `'dark'`
- **示例**：`theme = app.get_theme()`

##### `app.on_theme_change(callback)`
- **参数**：`callback` (function) - 主题变更时的回调函数，接受 `app` 作为参数
- **说明**：注册主题变更回调，主题变化时自动通知
- **示例**：
  ```python
  def on_theme(app):
      print(f'Theme changed to {app.get_theme()}')
  app.on_theme_change(on_theme)
  ```

##### `app.get_language()`
- **参数**：无
- **返回值**：`str` - 当前语言代码，如 `'zh_cn'`
- **示例**：`lang = app.get_language()`

##### `app.get_all_languages()`
- **参数**：无
- **返回值**：`dict` - 语言代码到显示名称的映射
- **示例**：`langs = app.get_all_languages()`

##### `app.get_version_string()`
- **参数**：无
- **返回值**：`str` - 主程序完整版本号
- **示例**：`ver = app.get_version_string()`

#### 5.11.6 MOD 管理方法

##### `app.get_loaded_mods()`
- **参数**：无
- **返回值**：`list[str]` - 已加载的 MOD/DLC 名称列表
- **示例**：
  ```python
  for mod_name in app.get_loaded_mods():
      print(mod_name)
  ```

##### `app.get_mod_info(mod_name)`
- **参数**：`mod_name` (str) - MOD 名称
- **返回值**：`dict | None` - MOD 信息，包含 `name`, `version`, `author`, `description`, `is_dlc`
- **示例**：
  ```python
  info = app.get_mod_info('CoreToolkit')
  if info:
      print(info['version'])
  ```

##### `app.has_dlc(dlc_name)`
- **参数**：`dlc_name` (str) - DLC 名称
- **返回值**：`bool` - 当前用户是否已授权该 DLC
- **示例**：`if app.has_dlc('CoreToolkit'):`

##### `app.call_mod_function(mod_name, func_name, *args)`
- **参数**：`mod_name` (str) - MOD 名称，`func_name` (str) - 函数名，`*args` - 参数
- **返回值**：任意 - 被调用函数的返回值
- **说明**：跨 MOD 调用另一个 MOD/DLC 中定义的函数。需要目标 MOD 已加载且函数暴露在全局命名空间。
- **示例**：
  ```python
  result = app.call_mod_function('CoreToolkit', 'some_helper', arg1, arg2)
  ```

#### 5.11.7 事件系统方法

##### `app.register_callback(event_name, callback)`
- **参数**：`event_name` (str) - 事件名称（自定义），`callback` (function) - 回调函数，接受 `app` 作为第一个参数
- **说明**：注册一个事件回调，当事件触发时自动调用
- **示例**：
  ```python
  def on_my_event(app, *args):
      app.log_message('Event triggered', 'info')
  app.register_callback('my_event', on_my_event)
  ```

##### `app.unregister_callback(event_name, callback)`
- **参数**：`event_name` (str) - 事件名称，`callback` (function) - 要移除的回调
- **说明**：移除已注册的事件回调
- **示例**：`app.unregister_callback('my_event', on_my_event)`

##### `app.trigger_event(event_name, *args)`
- **参数**：`event_name` (str) - 事件名称，`*args` - 传递给回调的参数
- **说明**：触发一个事件，所有已注册的回调会被依次调用
- **示例**：`app.trigger_event('my_event', data)`

##### `app.add_timer(interval_ms, callback)`
- **参数**：`interval_ms` (int) - 间隔毫秒数，`callback` (function) - 定时回调函数，接受 `app` 作为参数
- **说明**：添加一个重复执行的定时器。回调会在指定间隔后被调用，并自动递归继续。
- **示例**：
  ```python
  def tick(app):
      print('tick')
  app.add_timer(1000, tick)  # 每秒执行一次
  ```

#### 5.11.8 其他方法

##### `app.is_developer_mode()`
- **参数**：无
- **返回值**：`bool` - 开发者模式是否已开启
- **示例**：`if app.is_developer_mode():`

##### `app.get_selected_count()`
- **参数**：无
- **返回值**：`int` - 当前选中的进程数量
- **示例**：`count = app.get_selected_count()`

##### `app.get_root()`
- **参数**：无
- **返回值**：`tk.Tk` - 主窗口根对象（同 `app.root` 的便捷方法）
- **示例**：`root = app.get_root()`

##### `app.restart_self()`
- **参数**：无
- **说明**：安全重启主程序（保存日志后启动新实例）
- **示例**：`app.restart_self()`

##### `app.exit_self()`
- **参数**：无
- **说明**：安全退出主程序（保存日志并清理资源）
- **示例**：`app.exit_self()`

#### 5.11.9 进程增强管理方法

##### `app.get_process_environment(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`dict` - 进程环境变量字典
- **示例**：`env = app.get_process_environment(1234)`

##### `app.get_process_threads(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[dict]` - 线程列表，每项包含 `id`, `user_time`, `system_time`
- **示例**：`threads = app.get_process_threads(1234)`

##### `app.get_process_connections(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[dict]` - 网络连接列表，包含 `fd`, `family`, `type`, `laddr`, `raddr`, `status`
- **示例**：`conns = app.get_process_connections(1234)`

##### `app.get_process_open_files(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[dict]` - 打开的文件列表，包含 `path`, `fd`
- **示例**：`files = app.get_process_open_files(1234)`

##### `app.get_process_memory_maps(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[dict]` - 内存映射列表，包含 `path`, `rss`, `private`, `shared`
- **示例**：`maps = app.get_process_memory_maps(1234)`

##### `app.get_process_io_counters(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`dict` - I/O 计数器，包含 `read_count`, `write_count`, `read_bytes`, `write_bytes`
- **示例**：`io = app.get_process_io_counters(1234)`

##### `app.get_process_cmdline(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`list[str]` - 进程命令行参数列表
- **示例**：`cmdline = app.get_process_cmdline(1234)`

##### `app.suspend_process(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`bool` - 是否成功
- **说明**：暂停指定进程
- **示例**：`app.suspend_process(1234)`

##### `app.resume_process(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`bool` - 是否成功
- **说明**：恢复已暂停的进程
- **示例**：`app.resume_process(1234)`

##### `app.kill_process_tree(pid, timeout=3)`
- **参数**：`pid` (int) - 进程 ID, `timeout` (int) - 等待子进程结束超时秒数
- **返回值**：`bool` - 是否成功
- **说明**：结束进程及其所有子进程
- **示例**：`app.kill_process_tree(1234, timeout=5)`

##### `app.get_process_by_name(name)`
- **参数**：`name` (str) - 进程名称（支持部分匹配）
- **返回值**：`list[dict]` - 匹配的进程列表，每项包含 `pid`, `name`, `status`
- **说明**：按名称查找进程，不区分大小写
- **示例**：`procs = app.get_process_by_name('notepad')`

##### `app.wait_process_exit(pid, timeout=10)`
- **参数**：`pid` (int) - 进程 ID, `timeout` (int) - 等待超时秒数
- **返回值**：`bool` - 进程是否已退出
- **示例**：`app.wait_process_exit(1234, timeout=30)`

##### `app.get_process_num_handles(pid)`
- **参数**：`pid` (int) - 进程 ID
- **返回值**：`int` - 进程打开的句柄数
- **示例**：`handles = app.get_process_num_handles(1234)`

#### 5.11.10 系统信息增强方法

##### `app.get_cpu_per_core()`
- **参数**：无
- **返回值**：`dict` - 每个 CPU 核心的使用率，键为 `core_0`, `core_1` 等
- **示例**：`cores = app.get_cpu_per_core()`

##### `app.get_cpu_frequency()`
- **参数**：无
- **返回值**：`dict` - CPU 频率信息，包含 `current`, `min`, `max`（MHz）
- **示例**：`freq = app.get_cpu_frequency()`

##### `app.get_disk_io_counters()`
- **参数**：无
- **返回值**：`dict` - 磁盘 I/O 统计，包含 `read_count`, `write_count`, `read_bytes`, `write_bytes`, `read_time`, `write_time`
- **示例**：`io = app.get_disk_io_counters()`

##### `app.get_network_connections()`
- **参数**：无
- **返回值**：`list[dict]` - 所有网络连接，每项包含 `fd`, `family`, `type`, `laddr`, `raddr`, `status`, `pid`
- **注意**：可能需要管理员权限
- **示例**：`conns = app.get_network_connections()`

##### `app.get_network_interfaces()`
- **参数**：无
- **返回值**：`dict` - 网络接口信息，包含接口名称、状态、速度、MTU、地址列表
- **示例**：`ifaces = app.get_network_interfaces()`

##### `app.get_system_swap()`
- **参数**：无
- **返回值**：`dict` - 交换分区信息，包含 `total`, `used`, `free`, `percent`, `sin`, `sout`
- **示例**：`swap = app.get_system_swap()`

##### `app.get_system_load()`
- **参数**：无
- **返回值**：`dict` - 系统负载，包含 `1min`, `5min`, `15min`（仅 Unix，Windows 返回 0）
- **示例**：`load = app.get_system_load()`

##### `app.get_system_users()`
- **参数**：无
- **返回值**：`list[dict]` - 当前登录用户列表，包含 `name`, `terminal`, `host`, `started`
- **示例**：`users = app.get_system_users()`

##### `app.get_disk_partitions()`
- **参数**：无
- **返回值**：`list[dict]` - 磁盘分区列表，包含 `device`, `mountpoint`, `fstype`, `opts`
- **示例**：`parts = app.get_disk_partitions()`

##### `app.get_system_sensors_temperatures()`
- **参数**：无
- **返回值**：`dict` - 传感器温度数据，分组为各传感器类型，每项包含 `label`, `current`, `high`, `critical`
- **示例**：`temps = app.get_system_sensors_temperatures()`

#### 5.11.11 配置与文件管理方法

##### `app.get_config_sections()`
- **参数**：无
- **返回值**：`list[str]` - 配置文件中所有节名列表
- **示例**：`sections = app.get_config_sections()`

##### `app.get_config_keys(section)`
- **参数**：`section` (str) - 配置节名
- **返回值**：`list[str]` - 指定节下的所有键名列表
- **示例**：`keys = app.get_config_keys('Settings')`

##### `app.save_config_backup(backup_path=None)`
- **参数**：`backup_path` (str, optional) - 备份路径，默认自动生成带时间戳的文件名
- **返回值**：`str | None` - 备份文件路径，失败返回 `None`
- **说明**：备份当前配置文件到指定路径
- **示例**：`path = app.save_config_backup()`

##### `app.get_log_content(max_lines=200)`
- **参数**：`max_lines` (int) - 最大行数，默认 200
- **返回值**：`list[str]` - 最新的日志行列表
- **示例**：`logs = app.get_log_content(100)`

##### `app.clear_app_log()`
- **参数**：无
- **返回值**：`bool` - 是否成功
- **说明**：清空所有应用日志文件
- **示例**：`app.clear_app_log()`

##### `app.get_cache_size()`
- **参数**：无
- **返回值**：`int` - 缓存目录总大小（字节）
- **示例**：`size = app.get_cache_size()`

##### `app.get_data_dir()`
- **参数**：无
- **返回值**：`str` - 应用数据目录路径
- **示例**：`data_dir = app.get_data_dir()`

##### `app.get_temp_dir()`
- **参数**：无
- **返回值**：`str` - 临时目录路径
- **示例**：`tmp = app.get_temp_dir()`

#### 5.11.12 窗口控制方法

##### `app.set_window_size(width, height)`
- **参数**：`width` (int) - 窗口宽度，`height` (int) - 窗口高度
- **返回值**：`bool` - 是否成功
- **示例**：`app.set_window_size(1200, 800)`

##### `app.set_window_minimized()`
- **参数**：无
- **返回值**：`bool` - 是否成功
- **说明**：最小化主窗口到任务栏
- **示例**：`app.set_window_minimized()`

##### `app.set_window_maximized()`
- **参数**：无
- **返回值**：`bool` - 是否成功
- **说明**：最大化主窗口
- **示例**：`app.set_window_maximized()`

##### `app.set_window_title_text(title_text)`
- **参数**：`title_text` (str) - 新窗口标题
- **返回值**：`bool` - 是否成功
- **示例**：`app.set_window_title_text('My Custom Title')`

##### `app.flash_window_taskbar()`
- **参数**：无
- **返回值**：`bool` - 是否成功
- **说明**：闪烁任务栏按钮并发送托盘通知
- **示例**：`app.flash_window_taskbar()`

##### `app.set_always_on_top_mode(enabled)`
- **参数**：`enabled` (bool) - 是否置顶
- **返回值**：`bool` - 是否成功
- **示例**：`app.set_always_on_top_mode(True)`

##### `app.center_window(window=None)`
- **参数**：`window` (optional) - 要居中的窗口，默认为主窗口
- **返回值**：`bool` - 是否成功
- **示例**：`app.center_window()`

##### `app.get_window_geometry()`
- **参数**：无
- **返回值**：`dict` - 窗口几何信息，包含 `width`, `height`, `x`, `y`
- **示例**：`geo = app.get_window_geometry()`

#### 5.11.13 MOD/DLC 增强管理方法

##### `app.enable_mod_by_name(mod_name)`
- **参数**：`mod_name` (str) - MOD 名称
- **返回值**：`bool` - 是否成功
- **示例**：`app.enable_mod_by_name('MyMod')`

##### `app.disable_mod_by_name(mod_name)`
- **参数**：`mod_name` (str) - MOD 名称
- **返回值**：`bool` - 是否成功
- **示例**：`app.disable_mod_by_name('MyMod')`

##### `app.get_mod_enabled(mod_name)`
- **参数**：`mod_name` (str) - MOD 名称
- **返回值**：`bool` - MOD 是否已加载
- **示例**：`if app.get_mod_enabled('MyMod'):`

##### `app.get_all_mod_names()`
- **参数**：无
- **返回值**：`list[str]` - 所有已加载 MOD/DLC 的名称列表
- **示例**：`mods = app.get_all_mod_names()`

##### `app.get_available_dlcs()`
- **参数**：无
- **返回值**：`list[str]` - 当前用户已授权的 DLC 名称列表
- **示例**：`dlcs = app.get_available_dlcs()`

##### `app.reload_all_mods()`
- **参数**：无
- **返回值**：`bool` - 是否成功
- **说明**：重新加载所有 MOD
- **示例**：`app.reload_all_mods()`

#### 5.11.14 网络与工具方法

##### `app.get_local_ip_address()`
- **参数**：无
- **返回值**：`str` - 本机局域网 IP 地址
- **示例**：`ip = app.get_local_ip_address()`

##### `app.ping_address(host, count=4)`
- **参数**：`host` (str) - 目标主机，`count` (int) - ping 次数
- **返回值**：`dict` - 包含 `returncode`, `stdout`
- **示例**：`result = app.ping_address('8.8.8.8')`

##### `app.check_port_open(host, port, timeout=3)`
- **参数**：`host` (str) - 主机地址，`port` (int) - 端口号，`timeout` (int) - 超时秒数
- **返回值**：`bool` - 端口是否开放
- **示例**：`if app.check_port_open('example.com', 80):`

##### `app.get_public_ip_address()`
- **参数**：无
- **返回值**：`str` - 公网 IP 地址，失败返回空字符串
- **示例**：`public_ip = app.get_public_ip_address()`

##### `app.download_url_to_file(url, dest_path, timeout=30)`
- **参数**：`url` (str) - 下载地址，`dest_path` (str) - 保存路径，`timeout` (int) - 超时秒数
- **返回值**：`bool` - 是否成功
- **示例**：`app.download_url_to_file('https://example.com/file.zip', 'C:\\file.zip')`

##### `app.hash_file_md5(file_path)`
- **参数**：`file_path` (str) - 文件路径
- **返回值**：`str` - MD5 哈希值（32 位十六进制），失败返回空字符串
- **示例**：`md5 = app.hash_file_md5('C:\\file.zip')`

##### `app.hash_file_sha256(file_path)`
- **参数**：`file_path` (str) - 文件路径
- **返回值**：`str` - SHA-256 哈希值（64 位十六进制），失败返回空字符串
- **示例**：`sha256 = app.hash_file_sha256('C:\\file.zip')`

##### `app.get_file_metadata(file_path)`
- **参数**：`file_path` (str) - 文件路径
- **返回值**：`dict` - 文件元数据，包含 `size`, `created`, `modified`, `accessed`, `is_file`, `is_dir`
- **示例**：`meta = app.get_file_metadata('C:\\file.txt')`

---

## 6. 授权验证详解

### 6.1 远程 DLC.txt 格式

每行一个用户记录，字段用 `\|/` 分隔：
```
[UserName]\|/[NumberDLC]\|/[ListAcquiredDLC]
```

- `UserName`：与 NRCL 用户名一致
- `NumberDLC`：已获取的 DLC 数量（用于快速校验）
- `ListAcquiredDLC`：逗号分隔的 DLC 名称列表

**示例**：
```
ZIYIT_User\|/3\|/AdvancedProcessManager,NetworkMonitor,PerformanceBooster
AnotherUser\|/1\|/NetworkMonitor
```

### 6.2 远程 DLCL.txt 格式

每行一个 DLC 名称：
```
AdvancedProcessManager
NetworkMonitor
PerformanceBooster
```

### 6.3 验证逻辑

对于每个标记为 DLC 的 Mod：
1. 检查其 `Name` 是否在 `DLCL.txt` 中，若不在则视为非官方包，跳过
2. 从 `DLC.txt` 中查找当前 NRCL 用户名
3. 若用户不存在或 `ListAcquiredDLC` 中不包含该 `Name`，则跳过加载
4. 否则通过验证，允许加载

### 6.4 缓存机制

- 程序启动时下载 `DLC.txt` 和 `DLCL.txt`，保存到本地缓存目录（`%APPDATA%\LocalLow\Release_control\Cache\`）
- 缓存有效期 24 小时，过期后重新下载
- 若网络不可用，使用本地缓存（若有）继续运行，并在日志中记录

### 6.5 故障排查

| 症状 | 可能原因 | 解决方法 |
| -------------- | ---------------------------- | ------------------------------------ |
| DLC 显示未授权 | 授权记录未添加或用户名不匹配 | 检查 `DLC.txt` 中的用户名和 DLC 名称 |
| 刷新授权无效 | 缓存未更新 | 删除 `Cache` 目录或重启程序|
| 授权验证失败 | `SEP` 分隔符错误 | 确保使用 `\|/` 分隔符|
| 服务器连接失败 | 网络问题或 URL 错误| 检查网络，确认 URL 可访问|

---

## 7. ZEP 2 编码规范

MOD/DLC 的 Python 代码必须完全遵守 **ZEP 2** 规范，否则程序加载时会记录警告。

### 7.1 强制规则摘要

| 规则| 说明 |
| ----------------- | ------------------------------------------------------------ |
| **无注释**| 禁止任何 `#` 行注释和文档字符串（`"""` 仅允许文件头部的 Shebang、编码声明、法律声明） |
| **连续空行**| 禁止 2 个及以上连续空行|
| **类名**| `PascalCase`（每个单词首字母大写） |
| **函数/方法名** | `snake_case`（全小写，下划线分隔） |
| **常量**| `UPPER_CASE_WITH_UNDERSCORES`|
| **私有属性/方法** | 单下划线前缀 `_` |
| **缩进**| 4 空格，禁止制表符 |
| **最大行长**| 90 字符（URL 等可放宽至 99） |
| **函数长度**| 不超过 500 行（不含空行和仅含 `pass` 的行）|
| **嵌套深度**| 不超过 5 层|
| **异常捕获**| 禁止裸 `except:`，必须捕获具体异常 |
| **导入**| 禁止通配符导入（`from module import *`），分组排序（标准库 → 第三方 → 本地） |
| **布尔比较**| 使用 `is`/`is not` 比较 `None`；直接使用表达式而非 `== True`/`== False` |
| **变量作用域**| 最小作用域原则，禁止不必要的 `global`|
| **类型转换**| 使用显式转换函数（`int()`, `str()`, `list()` 等）|
| **文件末尾空行**| 文件末尾必须存在 1 个换行符|

### 7.2 文件头部规定

每个 `.py` 文件必须以下列顺序开头（无额外空行）：
1. **Shebang**（仅可执行文件需要）：`#!/usr/bin/env python3.14`
2. **编码声明**：`# -*- coding: utf-8 -*-`
3. **许可证/法律声明**：多行字符串（使用 `"""`）

MOD 的 `main.py` 通常不需要 Shebang，可省略。

### 7.3 合规示例

```python
def example_function(app, param1, param2=None):
if param1 is None:
return False
result = param1 + (param2 or 0)
app.log_message(f'Result: {result}', 'debug')
return result
```

### 7.4 违规后果

程序加载 MOD 时会做语法检查，如果发现注释或连续空行等违规，会在日志中记录警告，但 **不会** 阻止加载。建议开发者使用 `flake8` 和 `black` 工具预先格式化。

---

## 8. 禁止使用的类名和函数名

### 8.0 总则：仅限使用公开 API，禁止引用或重定义内部符号

- MOD 代码 **只能** 调用本手册 **第 5 章"核心 API 引用"** 中明确列出的 `app` 属性和方法。
- 所有以单下划线 `_` 或双下划线 `__` 开头的 `app` 成员（如 `app._internal_method`）均属于内部实现细节，**严格禁止**在 MOD 中访问。
- 主程序中未在本手册公开的任何其他类、函数、全局对象、模块级常量，无论是否以 `_` 开头，均属于禁止调用或重定义的范围。
- MOD 代码中 **不得** 定义与下列内部符号同名的变量、函数或类，以避免命名冲突和潜在的安全风险。
- 违反上述规则可能导致 MOD 加载失败、程序异常、安全拦截或未来版本不兼容，开发者需自行承担后果。

以下为当前 Release Control 主程序（版本 26.7-snapshot-26W26B）中 **所有顶层内部符号** 的完整列表，它们属于禁止事项（非公开 API，不可引用或重定义）：

**内部类（共 70 个）**：
`UserExit`, `ModConfig`, `CloudTeachingKiller`, `WhitelistManager`, `ProcessHistoryManager`, `MonitorTask`, `MonitorManagerDialog`, `WhitelistDialog`, `ProcessHistoryChart`, `QRCodeTool`, `PasswordInputDialog`, `DecryptPasswordDialog`, `ConversationDialog`, `PublicKeyDialog`, `PeerPublicKeyDialog`, `EncryptedKeyDialog`, `WaitForKeyDialog`, `SecretMessageApp`, `AutoMessageSender`, `Enigma`, `HardwareFingerprint`, `EnhancedLicenseManager`, `LicenseDialog`, `PersonalLicenseDialog`, `PersonalLicenseValidator`, `LicenseInfoDialog`, `ReactivateDialog`, `LanguageSelectorDialog`, `SettingsDialog`, `DeveloperSettingsDialog`, `UpdateDialog`, `DownloadWindow`, `DeveloperAuthDialog`, `DeveloperModeDialog`, `AboutDialog`, `StartupManagerDialog`, `HostsManagerDialog`, `CryptoManager`, `PasswordToolWindow`, `ZipCracker`, `DictionaryGenerator`, `FileDestroyer`, `FileProgressWindow`, `NetworkConnectionsViewer`, `NetworkViewerPage`, `RealTimeProcessChart`, `RealTimeMonitorPage`, `MemoryCleaner`, `ProcessPriorityManager`, `ProcessAffinityManager`, `ProcessTranslationManager`, `ProcessContextMenu`, `ProcessJobManager`, `ProcessSuspendManager`, `ProcessDelayManager`, `ProcessAnalyzer`, `ProcessLimitDialog`, `ProcessDelayDialog`, `ProcessAnalysisDialog`, `ThemeManager`, `PackToolGUIStandalone`, `ModManagerDialog`, `DlcManagerDialog`, `UninstallWindow`, `ModManager`

**内部函数（共 14 个）**：
`set_window_icon`, `enable_dpi_awareness`, `get_version_list`, `get_hash_dict`, `get_download_url`, `format_size`, `handle_update_hash`, `handle_update_version`, `handle_update_version_link`, `handle_update_list`, `cli_pack`, `cli_unpack`, `cli_verify`, `cli_list_mods`, `cli_test_mod`, `main`, `get_text`

**内部常量（共 29 个）**：
`PROGRAM_DIR`, `START_TIME`, `NEW_SEPARATOR`, `SEP_STR`, `MODE_DIALOG`, `MODE_PASSWORD`, `MODS_INSTALL_DIR`, `MODS_SOURCE_DIR`, `CACHE_DIR`, `DLC_LIST_URL`, `DLC_AUTH_URL`, `CACHE_EXPIRY_SECONDS`, `DLC_LICENSE`, `SEP`, `VERSIONS`, `C_RED`, `C_GREEN`, `C_YELLOW`, `C_BLUE`, `C_MAGENTA`, `C_CYAN`, `C_BOLD`, `C_UNDERLINE`, `C_RESET`, `_lang_data`, `_translation_cache`

**注意**：此列表基于当前版本，主程序未来的更新可能会增加、修改或移除这些内部符号。MOD 开发者应始终只依赖本手册第 5 章公开的 `app` API，任何未在手册中出现的成员均不可使用。

### 8.1 代码执行类（Python 内置危险函数）

| 名称| 原因 |
| ------------------------- | ------------------ |
| `eval`| 可执行任意代码 |
| `exec`| 可执行任意代码 |
| `compile` | 可动态编译代码 |
| `__import__`| 可绕过导入白名单 |
| `importlib.import_module` | 可动态导入任意模块 |

### 8.2 系统调用类

| 名称| 原因 |
| ----------------------------------------- | -------------- |
| `os.system` | 执行系统命令 |
| `os.popen`| 执行系统命令 |
| `os.spawn*` | 执行系统命令 |
| `os.execl*` | 执行系统命令 |
| `os.kill` | 可杀死任意进程 |
| `subprocess.call` / `subprocess.Popen` 等 | 执行外部程序 |
| `subprocess.run`| 执行外部程序 |
| `subprocess.check_output` | 执行外部程序 |
| `subprocess.getoutput`| 执行外部程序 |

### 8.3 序列化类

| 名称 | 原因|
| -------------------------------- | ------------------- |
| `pickle.load` / `pickle.loads` | 可导致任意代码执行|
| `pickle.Unpickler` | 可导致任意代码执行|
| `shelve.open`| 基于 pickle，不安全 |
| `marshal.load` / `marshal.loads` | 可加载任意代码对象|

### 8.4 系统 API 类

| 名称| 原因|
| ------------------------- | ------------------- |
| `ctypes` 全部函数 | 可直接调用系统 API|
| `win32api`, `win32con` 等 | 可破坏系统|
| `win32gui`, `win32ui` | 可操作窗口系统|
| `win32process`| 可操作进程|
| `win32security` | 可修改安全设置|
| `win32file` | 可操作文件系统|
| `win32service`| 可操作 Windows 服务 |
| `win32evtlog` | 可操作事件日志|
| `win32net`| 可操作网络共享|

### 8.5 文件系统类

| 名称 | 原因 |
| -------------------------- | -------------------- |
| `shutil.rmtree`| 可删除任意目录 |
| `shutil.move`| 可移动任意文件 |
| `os.remove`| 可删除任意文件 |
| `os.rmdir` | 可删除任意目录 |
| `os.removedirs`| 可删除任意目录 |
| `os.unlink`| 可删除任意文件 |
| `os.link`| 可创建硬链接 |
| `os.symlink` | 可创建符号链接 |
| `os.mknod` | 可创建设备文件 |
| `os.chmod` | 可修改文件权限 |
| `os.chown` | 可修改文件所有者 |
| `os.lchown`| 可修改符号链接所有者 |
| `os.rename` / `os.renames` | 可重命名任意文件 |

### 8.6 网络类

| 名称 | 原因 |
| -------------------------------- | -------------------------------------------- |
| `socket.socket`（原始）| 可进行底层网络攻击 |
| `socket.create_connection` | 可建立任意连接 |
| `socket.socketpair`| 可创建任意套接字对 |
| `urllib.request.urlopen`（原始） | 可发起任意网络请求（建议使用 `requests` 库） |

### 8.7 反射与内省类

| 名称| 原因 |
| ----------------------- | ------------------ |
| `inspect.getsource` | 可获取任意源码 |
| `inspect.getmembers`| 可获取任意对象成员 |
| `gc.get_objects`| 可获取所有对象 |
| `sys.settrace`| 可设置全局跟踪 |
| `sys.setprofile`| 可设置全局性能分析 |
| `sys.setrecursionlimit` | 可破坏递归限制 |

### 8.8 例外情况

若 MOD 在 `import` 中明确声明了某些库（如 `os`），则 `os.path` 等安全子模块可用，但上述危险函数仍会被拦截。程序在加载 MOD 时会替换危险函数为占位符，调用时抛出 `PermissionError`。

### 8.9 AST 增强检测（v26.8+）

程序在加载 MOD 时会对所有代码文件执行静态 AST 分析，检测以下安全风险：

#### 8.9.1 危险函数调用检测

| 分类 | 检测内容 | 处理方式 |
|------|----------|----------|
| 内置禁用函数 | `eval()`, `exec()`, `compile()` | **全体阻止加载** |
| 内置危险函数 | `__import__()`, `globals()`, `locals()`, `vars()`, `breakpoint()`, `delattr()`, `super()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `os` 模块 | `system()`, `popen()`, `spawn*()`, `execl*()`, `execv*()`, `kill()`, `remove()`, `unlink()`, `rmdir()`, `chmod()`, `chown()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `subprocess` 模块 | `call()`, `Popen()`, `run()`, `check_output()`, `getoutput()`, `getstatusoutput()`, `check_call()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `pickle` / `shelve` / `marshal` | `load()`, `loads()`, `Unpickler()`, `shelve.open()`, `marshal.load()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `ctypes` 模块 | `CDLL()`, `windll()`, `oledll()`, `PyDLL()`, `create_string_buffer()`, `c_void_p()`, `cast()`, `pointer()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `socket` 模块 | `socket()`, `create_connection()`, `socketpair()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `shutil` 模块 | `rmtree()`, `move()`, `copytree()` | **仅第三方 MOD 阻止**，官方 DLC 放行 |
| `setattr(app, key, None)` | 试图删除 `app` 属性 | 阻止加载 |
| `__import__()` | 任意动态导入 | 阻止加载 |
| `getattr(op, ...)` | 访问 `operator` 模块 | 阻止加载 |

#### 8.9.2 内部 API 访问检测

- **`app._*` 调用拦截**：普通 MOD 代码中任何以 `_` 开头的 `app` 方法/属性调用（如 `app._internal_method()`）都会被 AST 检测拦截，防止访问内部实现。
- **官方 DLC 例外**：若 `ModConfig.json` 中 `License` 字段为 `"ZIYIT STUDIO"`（即 `DLC_LICENSE`），则跳过 `app._*` 拦截，允许访问内部 API。此类 DLC 还会经服务器验证确保真实性。
- **`app.__dict__` 访问拦截**：禁止直接操作 `app` 的实例字典。
- **`del app.xxx` 拦截**：禁止删除 `app` 的属性。

#### 8.9.3 内部符号遮蔽检测

| 检测类型 | 说明 |
|----------|------|
| 类名遮蔽 | 禁止定义与主程序内部类同名的顶层类（`CloudTeachingKiller`, `ModManager`, `AppDictProxy` 等 70+ 个） |
| 函数名遮蔽 | 禁止定义与内部函数同名的顶层函数 |
| 变量名遮蔽 | 禁止定义与内部同名的顶层变量 |

完整内部符号列表见 8.0 节。

#### 8.9.4 代码复杂度限制

| 限制项 | 阈值 | 说明 |
|--------|------|------|
| 函数最大行数 | 500 行 | 单函数超过 500 行报错 |
| 最大嵌套深度 | 5 层 | 控制流（if/for/while/try/with）嵌套超过 5 层报错 |

#### 8.9.5 混淆检测

| 检测项 | 阈值 | 说明 |
|--------|------|------|
| `chr()` 调用次数 | > 5 次 | 过多的 `chr()` 调用疑似字符串构造混淆 |

#### 8.9.6 例外规则

- 普通 MOD 若在 `import` 中声明了相关模块（如 `os`），则该模块的常规操作（如 `os.path.join`）不受限制，但危险函数（`os.system`, `ctypes.*` 等）仍被拦截。
- 官方 DLC（`License` 为 `"ZIYIT STUDIO"`）跳过 `app._*` 拦截、`dangerous_funcs` 拦截和 `dangerous_attrs` 拦截，但 `eval`、`exec`、`compile` 三个禁用函数仍被全体拦截。

---

## 9. Mixin 编写方案

Mixin 是 Python 中常用的代码复用模式，但在 MOD 上下文中，由于代码在独立命名空间执行，不能直接使用继承。建议以下三种方式：

### 9.1 方式一：函数式工具（推荐）

将通用逻辑封装为独立函数，在多个命令函数中调用。

**`utils.py`**（在 `Path.Code` 中列出）：
```python
def common_task(app):
app.log_message('Common task executed', 'debug')

def get_selected_process(app):
pids = app.selected_processes
return pids[0] if pids else None
```

**`main.py`**：
```python
from utils import common_task, get_selected_process

def command1(app):
common_task(app)
pid = get_selected_process(app)
if pid:
app.log_message(f'Selected PID: {pid}', 'info')

def command2(app):
common_task(app)
app.refresh_process_list()
```

### 9.2 方式二：类组合

定义一个辅助类，实例化后调用其方法。

```python
class Helper:
def __init__(self, app):
self.app = app

def do_something(self):
self.app.log_message('Helper working', 'info')

def get_selected_pid(self):
pids = self.app.selected_processes
return pids[0] if pids else None

def my_command(app):
h = Helper(app)
pid = h.get_selected_pid()
if pid:
h.do_something()
```

### 9.3 方式三：使用 Mixin 风格（模块级函数）

将通用功能组织为模块，通过 `import` 导入后使用。

**`mixins/process_mixin.py`**：
```python
def kill_all_selected(app):
for pid in app.selected_processes:
app.kill_process_tree(pid)

def get_selected_names(app):
names = []
for pid in app.selected_processes:
for proc in app.all_process_data:
if proc['pid'] == pid:
names.append(proc['display_name'])
break
return names
```

**`main.py`**：
```python
from mixins.process_mixin import kill_all_selected, get_selected_names

def kill_selected_custom(app):
names = get_selected_names(app)
app.log_message(f'Killing: {names}', 'info')
kill_all_selected(app)
```

### 9.4 跨 MOD 代码共享

若多个 MOD 需要共享相同代码，可将公共代码打包为独立的 MOD（依赖关系），然后通过 `Dependencies` 引用，在 `MainCode` 中使用 `import` 导入（需在 `import` 白名单中声明该 MOD 的名称）。

---

## 10. 多语言支持

### 10.1 语言文件格式

MOD 在 `Path.Lang` 中指定语言文件，例如 `lang/zh_cn.json`：
```json
{
"menu": {
"example": {
"action": "执行示例操作"
}
},
"dialog": {
"title": "示例对话框"
}
}
```

### 10.2 翻译键使用

在 `ModConfig.json` 的 `label` 中直接使用翻译键：
```json
"label": "menu.example.action"
```

在代码中使用 `app.get_text`：
```python
title = app.get_text('dialog.title', 'Example Dialog')
```

### 10.3 回退机制

若当前语言的翻译不存在，程序会依次尝试：
1. 主程序语言文件
2. 所有已加载 MOD 的语言文件（按加载顺序）
3. 返回 `default` 或原始 `key`

### 10.4 当前支持的语言代码

| 语言代码 | 语言名称|
| -------- | ----------------------- |
| `zh_cn`| 中文（简体）|
| `zh_tw`| 中文（台灣）|
| `zh_hk`| 中文（香港）|
| `us_en`| English (United States) |
| `ja_jp`| 日本語（日本）|
| `ko_kr`| 한국어（대한민국）|
| `ru_ru`| Русский（Россия） |
| `es_es`| Español（España） |
| `fr_fr`| Français（France）|
| `de` | Deutsch |
| `it_it`| Italiano（Italia）|
| `pt_br`| Português（Brasil） |
| `ar_sa`| العربية（السعودية） |

完整语言列表请参见 `app.language_display_names`。

### 10.5 翻译键命名规范

建议使用以下命名结构：
```
[domain].[module].[section].[key]
```

示例：
```json
{
"mod": {
"advanced_process": {
"dialog": "高级进程对话框",
"settings": "高级进程设置"
}
}
}
```

对应翻译键：`mod.advanced_process.dialog`

**禁止使用的命名方式**：
- 使用纯数字键
- 使用与主程序冲突的键（如 `messages.error`）
- 使用过长的键（超过 5 层嵌套）

---

## 11. 版本兼容性

### 11.1 版本号规则

程序版本号遵循 ZEP 2 规范：

**正式版格式**：
- `[年份].[Drop序号]` 或 `[年份].[Drop序号].[修订版]`
- 示例：`26.5`, `26.6`, `26.7.1`

**快照版格式**：
- `[年份].[Drop序号]-snapshot-[周次]`
- 示例：`26.7-snapshot-26W26B`

**版本比较规则**：
- 正式版之间按数字大小比较：年份 → Drop 序号 → 修订版
- 快照版的版本号低于同主版本的正式版（`26.7` > `26.7-snapshot-26W26B`）

### 11.2 MinVersion / MaxVersion 检查

程序加载 MOD 时会检查：
1. 若 `MinVersion` 存在且 `app.version < MinVersion` → 跳过加载
2. 若 `MaxVersion` 存在且 `app.version > MaxVersion` → 跳过加载
3. 版本比较使用内部比较器（支持快照版比较）。

**示例**：
```json
"MinVersion": "26.5",
"MaxVersion": "26.9"
```
表示该 MOD 兼容 `26.5` 到 `26.9` 之间的所有版本（含边界）。

---

## 12. 调试技巧

### 12.1 日志查看

日志文件位于程序根目录 `logs/RC-logs-Part*.log`。

**日志级别**：
- `DEBUG`：详细调试信息（开发时启用）
- `INFO`：常规信息
- `WARNING`：警告信息
- `ERROR`：错误信息
- `FUCK`：致命错误，立即退出程序

### 12.2 开发者模式

按 `Ctrl+Shift+D` 或通过菜单 `工具` → `开发者模式` 进入，可查看：
- 系统信息（进程数、内存、CPU）
- 日志缓冲区
- 测试各级别日志输出
- 强制保存日志
- 查看日志文件
- 开发者设置（日志保存间隔、文件数量限制等）

### 12.3 命令行调试

| 命令 | 说明 |
| ------------------------------------------------ | ------------------------ |
| `Taskmgr.exe --test <file.rcm>`| 测试 MOD 而不安装|
| `Taskmgr.exe --verify <file.rcm>`| 验证 RCM 合法性|
| `Taskmgr.exe --list-mods`| 列出已安装的 MOD/DLC |
| `Taskmgr.exe --unpack <file.rcm> --output <dir>` | 解包 RCM 文件调试|
| `Taskmgr.exe --pack <src> --output <out>`| 打包 MOD（测试打包过程） |

### 12.4 常见错误及解决方案

| 错误现象 | 可能原因 | 解决方法 |
| ------------ | -------------------------------- | ------------------------------------ |
| MOD 加载失败 | `ModConfig.json` 格式错误| 使用 `--verify` 验证 |
| 菜单未出现 | `Menu` 数组为空| 确保至少有一个菜单项 |
| 函数未找到 | `command` 指定的函数未定义 | 确保函数名正确且在全局作用域 |
| 导入库失败 | 库不在 `import` 白名单中 | 在 `import` 数组中添加 |
| 依赖缺失 | 依赖的 MOD/DLC 未安装| 安装依赖并确保先加载 |
| 函数名冲突 | 多个 MOD 定义同名函数| 使用前缀命名避免冲突 |
| app 未传递 | 命令函数未定义参数 | 函数定义必须接受一个参数（如 `app`） |
| 权限错误 | 调用了禁止的函数 | 参考第 8 章，使用安全替代方案|
| 版本不兼容 | `MinVersion`/`MaxVersion` 不满足 | 调整版本范围或更新程序 |
| 翻译未生效 | 语言文件路径错误或格式错误 | 检查 `Path.Lang` 配置和 JSON 格式|
| DLC 未授权 | 用户未购买或授权验证失败 | 检查网络，确认授权 |
| MOD 解压失败 | `.rcm` 文件损坏或权限不足| 检查文件完整性，确认目录权限 |
| 白名单阻止 | 进程在白名单中 | 通过白名单管理界面调整 |
| 许可证过期 | 试用期结束 | 重新激活或购买 |

---

## 13. 打包工具

### 13.1 命令行打包

| 命令 | 说明|
| ---------------------------------------------------- | --------------------------------------- |
| `Taskmgr.exe --pack <src_dir> --output <out.rcm>`| 打包 MOD（需要已存在 `ModConfig.json`） |
| `Taskmgr.exe --unpack <file.rcm> --output <out_dir>` | 解包调试|
| `Taskmgr.exe --verify <file.rcm>`| 验证 RCM 合法性 |
| `Taskmgr.exe --test <file.rcm>`| 测试 MOD 而不安装 |
| `Taskmgr.exe --list-mods`| 列出已安装的 MOD/DLC|

### 13.2 打包流程

1. 验证 `<source_dir>` 中存在 `ModConfig.json`
2. 检查 `ModConfig.json` 格式（必需字段、类型正确）
3. 检查所有 `Path` 中引用的文件是否存在
4. 简单检查 `Menu.command` 指定的函数是否在 `MainCode` 中定义
5. 将整个目录打包为 ZIP（无密码），扩展名改为 `.rcm`
6. 可选：生成 SHA256 校验和文件

### 13.3 GUI 打包工具

```bash
Taskmgr.exe --pack-gui
```
或在主程序菜单 `工具` → `打包工具` 中打开。

**GUI 功能**：
- 选择源码目录
- 填写所有 ModConfig 字段（表单输入）
- 管理依赖、导入、语言映射、菜单项（列表/表格管理）
- 验证配置完整性
- 自动生成 `ModConfig.json`
- 一键打包生成 `.rcm` 文件

### 13.4 程序化创建

开发者可在脚本中使用 Python 字典构造 `ModConfig.json`，然后调用命令行打包。

```python
import json
config = { ... }# 参考 3.5 节完整示例
with open('ModConfig.json', 'w', encoding='utf-8') as f:
json.dump(config, f, ensure_ascii=False, indent=2)
```

---

## 14. MOD 目录结构

程序自动维护以下目录结构：

```
程序根目录/
├── Mods/# 存放 .rcm 安装包（用户自行放入）
│ ├── AdvancedProcessManager.rcm
│ ├── NetworkMonitor.rcm
│ └── AnotherMod.rcm
└── Taskmgr.exe # 主程序

%APPDATA%\LocalLow\Release_control\
└── Mods/ # 解压后的 Mod/DLC 内容（程序自动维护）
├── AdvancedProcessManager/ # 以 ModConfig 中的 Name 命名
│ ├── ModConfig.json
│ ├── main.py
│ └── ...
├── NetworkMonitor/
└── AnotherMod/
```

**重要说明**：
- `.rcm` 文件为 ZIP 压缩包，程序启动时自动解压到用户数据目录
- 若 `.rcm` 修改时间新于解压目录，程序会重新解压覆盖
- 用户**无需手动解压**，程序自动完成

---

## 15. 管理界面

### 15.1 MOD 管理界面

- 列表显示所有已解压的 MOD（非 DLC），含名称、作者、版本、状态（启用/禁用）
- 支持启用/禁用（不加载功能，保留文件）
- 支持卸载（删除解压目录和 `.rcm` 文件）
- 显示依赖关系，缺失依赖时警告

### 15.2 DLC 管理界面

- 列表显示所有已解压的 DLC，含名称、版本、授权状态（已授权/未授权）
- 刷新授权状态（重新下载 `DLC.txt` 和 `DLCL.txt` 并验证）
- 未授权的 DLC 显示"购买"按钮，跳转至官方商店
- 支持卸载

---

## 16. 发布流程

### 16.1 MOD 发布（社区）

#### 16.1.1 GitHub Releases

1. **创建 GitHub 仓库**（若尚未创建）
 - 仓库名称建议与 MOD 名称一致
 - 添加 `README.md` 描述 MOD 功能、使用方法、兼容版本

2. **打包 MOD**
 ```bash
 Taskmgr.exe --pack MyMod --output MyMod_v1.0.0.rcm
 ```

3. **创建 Release**
 - 进入 GitHub 仓库 → Releases → Create a new release
 - Tag version 与 MOD 版本号一致，如 `v1.0.0`
 - Release title 为 `MyMod v1.0.0`
 - 在描述中列出更新内容、安装方法、依赖信息

4. **上传附件**
 - 上传 `.rcm` 文件
 - 可选上传 SHA256 校验和文件

5. **发布**

#### 16.1.2 Bilibili 专栏/视频

1. **撰写专栏文章**
 - 标题：`【Release Control MOD】MyMod v1.0.0 发布`
 - 内容包含：
 - MOD 功能介绍（图文并茂）
 - 安装方法（图文指导）
 - 下载链接（GitHub Releases 地址）
 - 兼容版本
 - 更新日志
 - 使用注意事项
 - 标签：`Release Control`, `MOD`, `进程管理`

2. **制作视频教程**（可选）
 - 展示 MOD 的主要功能
 - 演示安装和使用过程
 - 在视频简介中提供下载链接

3. **发布动态**
 - 在 Bilibili 动态中分享专栏/视频链接
 - 使用话题 `#ReleaseControl` `#MOD开发`

#### 16.1.3 官方社区/论坛

1. **注册/登录** [官方社区](https://github.com/ziyit-Hacker/Release_control/issues)
2. **发布新帖**
 - 板块选择：`MOD 发布`
 - 标题：`[MOD] MyMod v1.0.0 - 功能描述`
 - 内容：
 - 功能介绍
 - 截图（可选）
 - 安装说明
 - 下载链接（GitHub Releases 或网盘）
 - 更新日志
 - 支持与反馈方式
3. **回帖互动**：解答用户问题，收集反馈

#### 16.1.4 其他平台

- **GitHub Gist**：可发布配置示例或代码片段
- **个人博客/网站**：发布详细的 MOD 介绍文章
- **社交媒体**：在 Twitter/X、微博等平台分享发布消息

### 16.2 DLC 发布（官方）

1. **联系 ZIYIT STUDIO**（`ziyitstudio@qq.com`）提交 DLC 方案，包括：
 - DLC 名称、描述
 - 功能详情
 - 定价建议
 - 预计发布时间

2. **通过审核后**：
 - 官方将 DLC 名称加入远程 `DLCL.txt`
 - 在 `DLC.txt` 中为用户添加授权记录
 - 提供官方下载渠道（官网或 GitHub Releases）
 - 官方发布公告

3. **用户购买后**：
 - 程序自动从服务器同步授权
 - 无需手动输入密钥
 - DLC 自动加载

### 16.3 版本更新建议

- 遵循语义化版本（SemVer）
- 更新时递增版本号
- 在 GitHub Releases 和论坛帖子中注明更新内容
- 用户可通过重新下载 `.rcm` 或拖拽更新

---

## 17. 安全考虑

- **代码沙箱**：MOD/DLC 代码在独立命名空间执行，危险函数被替换为占位符
- **文件访问限制**：只能访问 `%APPDATA%\LocalLow\Release_control\Mods\` 及其子目录
- **导入白名单**：仅允许 `import` 数组中声明的库
- **版本兼容**：通过 `MinVersion`/`MaxVersion` 防止不兼容加载
- **授权验证**：DLC 完全基于服务器数据，防止本地篡改
- **无注释原则**：ZEP 2 禁止注释，代码必须自文档化
- **错误日志**：所有错误必须通过 `app.log_message` 记录

---

## 18. 最佳实践

### 18.1 代码组织

```
MyMod/
├── ModConfig.json
├── main.py# 主入口，仅包含菜单命令函数
├── utils.py # 工具函数
├── handlers.py# 事件处理器
├── resources/ # 资源文件（图标、图片等）
│ └── icon.ico
└── lang/# 多语言文件
├── zh_cn.json
└── us_en.json
```

### 18.2 命名建议

- MOD 名称：使用 PascalCase，如 `AdvancedProcessManager`
- 函数名：使用 snake_case，如 `open_advanced_dialog`
- 翻译键：使用 `mod.[name].[section].[key]` 格式

### 18.3 性能优化

- 避免在菜单命令函数中执行耗时操作，应使用后台线程
- 使用 `app.log_message` 而非 `print` 输出调试信息
- 大量数据操作时使用批量处理

### 18.4 错误处理

- 所有可能出错的操作应包裹在 `try/except` 中
- 使用 `app.log_message` 记录错误详情
- 向用户显示友好的错误提示

---

## 19. 高级功能

### 19.1 后台线程

```python
import threading

def start_background_task(app):
def worker():
while app.running:
app.log_message('Background task running', 'debug')
time.sleep(5)
thread = threading.Thread(target=worker, daemon=True)
thread.start()
```

### 19.2 定时任务

```python
def schedule_task(app):
def task():
app.log_message('Scheduled task executed', 'info')
app.root.after(60000, task)# 60 秒后执行
```

### 19.3 自定义 UI

```python
def open_custom_window(app):
win = tk.Toplevel(app.root)
win.title('Custom Window')
win.geometry('400x300')
label = ttk.Label(win, text='Hello from MOD')
label.pack()
```

---

## 20. 故障排查指南

### 20.1 系统化诊断流程

1. **检查日志文件**：`logs/RC-logs-Part*.log`
2. **确认 MOD 已解压**：检查 `%APPDATA%\LocalLow\Release_control\Mods\`
3. **验证 ModConfig.json**：使用 `Taskmgr.exe --verify <file.rcm>`
4. **检查授权状态**：在 DLC 管理界面点击"刷新授权"
5. **确认版本兼容**：检查 `MinVersion` 和 `MaxVersion`

### 20.2 常见错误码

| 错误码 | 说明| 解决方案 |
| ------------------------------ | ----------------------- | -------------- |
| `ERR_MOD_INVALID_CONFIG` | ModConfig.json 格式无效 | 检查 JSON 语法 |
| `ERR_MOD_VERSION_INCOMPATIBLE` | 程序版本不兼容| 调整版本范围 |
| `ERR_MOD_DEPENDENCY_MISSING` | 依赖缺失| 安装依赖 |
| `ERR_MOD_DEPENDENCY_CYCLE` | 循环依赖| 移除循环 |
| `ERR_MOD_DLC_UNAUTHORIZED` | DLC 未授权| 检查授权记录 |
| `ERR_MOD_FUNCTION_NOT_FOUND` | 函数不存在| 检查函数名 |
| `ERR_MOD_IMPORT_NOT_ALLOWED` | 导入被拒绝| 添加导入白名单 |
| `ERR_MOD_EXTRACT_FAILED` | 解压失败| 检查文件完整性 |

---

## 21. 与主程序交互

### 21.1 调用主程序功能

```python
# 刷新进程列表
app.refresh_process_list()

# 结束选中进程
app.kill_selected()

# 获取所有进程数据
processes = app.all_process_data
```

### 21.2 读写配置

```python
# 读取配置
value = app.config.get('MyMod', 'setting', fallback='default')

# 写入配置
app.config.set('MyMod', 'setting', 'value')
app.save_config()
```

---

## 22. 测试与发布

### 22.1 测试 MOD

```bash
Taskmgr.exe --test MyMod.rcm
```

### 22.2 发布检查清单

- [ ] 所有函数已定义且接受 `app` 参数
- [ ] `ModConfig.json` 格式正确
- [ ] 所有引用的文件存在于包中
- [ ] 已在目标版本测试通过
- [ ] 多语言文件完整
- [ ] 依赖关系声明正确

---

## 23. 常见问题（FAQ）

**Q: MOD 安装后菜单不出现？**
A: 确保 `Menu` 数组至少包含一项，且 `command` 对应的函数在 `main.py` 中定义。

**Q: DLC 显示未授权？**
A: 检查服务器 `DLC.txt` 中是否包含该用户的授权记录，用户名是否正确。

**Q: 函数报错 `takes 0 positional arguments but 1 was given`？**
A: 所有命令函数必须接受一个参数 `app`。

**Q: 拖拽安装无效？**
A: Tkinter DND 在 Windows 上不稳定，建议使用 `Mods/` 文件夹方式安装。

**Q: 如何调试 MOD？**
A: 启用开发者模式（`Ctrl+Shift+D`），查看日志输出。

---

## 24. 进程上下文菜单扩展

MOD 可以通过注入上下文菜单项来扩展进程右键功能。虽然当前版本不支持直接注册自定义上下文菜单项，但可以通过以下方式实现类似功能：

### 24.1 使用全局快捷键

```python
def custom_action(app):
selected_pids = app.selected_processes
if not selected_pids:
return
# 执行自定义逻辑
for pid in selected_pids:
app.log_message(f'Custom action on PID {pid}', 'info')
```

### 24.2 通过菜单命令触发

在 `ModConfig.json` 中添加菜单项，用户通过 MOD 菜单触发操作。

### 24.3 进程信息获取

主程序内置的 `ProcessContextMenu` 类提供了以下功能，MOD 可参考实现：

- **优先级管理** (`ProcessPriorityManager`)：
- `get_current_priority_key(pid)`: 获取当前优先级
- `set_priority(pid, priority_key)`: 设置优先级
- 优先级键值：`realtime`, `high`, `above_normal`, `normal`, `below_normal`, `idle`

- **CPU 亲和性管理** (`ProcessAffinityManager`)：
- `get_current_affinity(pid)`: 获取当前 CPU 亲和性
- `set_affinity(pid, cpu_list)`: 设置 CPU 亲和性

- **进程翻译管理** (`ProcessTranslationManager`)：
- `get_translation(process_name)`: 获取进程翻译
- `set_translation(process_name, chinese_name)`: 设置进程翻译
- `delete_translation(process_name)`: 删除进程翻译

---

## 25. 进程作业管理

主程序提供了 `ProcessJobManager` 类，用于创建和管理 Windows Job Object，对进程组进行资源限制。

### 25.1 核心功能

| 方法| 说明 |
| ----------------------------------------------------------- | ------------------------ |
| `create_job(job_name)`| 创建作业对象 |
| `delete_job(job_name)`| 删除作业对象 |
| `assign_process_to_job(job_name, pid)`| 将进程分配给作业 |
| `set_cpu_limit(job_name, cpu_percent)`| 设置 CPU 使用率上限（%） |
| `set_memory_limit(job_name, memory_mb)` | 设置内存上限（MB） |
| `set_io_rate_limit(job_name, transfer_rate_mb, iops_limit)` | 设置磁盘 IO 速率限制 |
| `remove_limits(job_name)` | 移除所有限制 |

### 25.2 使用示例

```python
def apply_resource_limits(app):
pids = app.selected_processes
if not pids:
return
job_mgr = ProcessJobManager(app)
job_name = f'MOD_Job_{int(time.time())}'
job_mgr.create_job(job_name)
for pid in pids:
job_mgr.assign_process_to_job(job_name, pid)
job_mgr.set_cpu_limit(job_name, 50) # 限制 CPU 50%
job_mgr.set_memory_limit(job_name, 512)# 限制内存 512MB
app.log_message(f'Applied resource limits to {len(pids)} processes', 'info')
```

---

## 26. 进程暂停与恢复

主程序提供了 `ProcessSuspendManager` 类，支持暂停和恢复进程。

### 26.1 核心方法

| 方法| 说明 |
| ------------------------- | ------------------ |
| `suspend_process(pid)`| 暂停单个进程 |
| `resume_process(pid)` | 恢复单个进程 |
| `suspend_processes(pids)` | 暂停多个进程 |
| `resume_processes(pids)`| 恢复多个进程 |
| `is_suspended(pid)` | 检查进程是否已暂停 |
| `toggle_suspend(pid)` | 切换暂停状态 |
| `get_suspended_count()` | 获取已暂停进程数量 |

### 26.2 使用示例

```python
def toggle_suspend_selected(app):
pids = app.selected_processes
if not pids:
return
suspend_mgr = ProcessSuspendManager(app)
# 检查第一个进程的状态
if suspend_mgr.is_suspended(pids[0]):
suspend_mgr.resume_processes(pids)
app.log_message(f'Resumed {len(pids)} processes', 'info')
else:
suspend_mgr.suspend_processes(pids)
app.log_message(f'Suspended {len(pids)} processes', 'info')
app.refresh_process_list()
```

---

## 27. 进程延迟操作

主程序提供了 `ProcessDelayManager` 类，支持在指定延迟后执行操作。

### 27.1 核心方法

| 方法 | 说明 |
| -------------------------------------------- | ------------------ |
| `add_delayed_kill(pids, delay_seconds)`| 延迟终止进程 |
| `add_delayed_start(commands, delay_seconds)` | 延迟启动程序 |
| `add_delayed_suspend(pids, delay_seconds)` | 延迟暂停进程 |
| `add_delayed_resume(pids, delay_seconds)`| 延迟恢复进程 |
| `cancel_task(task_id)` | 取消延迟任务 |
| `get_pending_tasks()`| 获取所有待执行任务 |

### 27.2 使用示例

```python
def schedule_kill(app):
pids = app.selected_processes
if not pids:
return
delay_mgr = ProcessDelayManager(app)
task_id = delay_mgr.add_delayed_kill(pids, 30)
if task_id:
app.log_message(f'Scheduled kill task {task_id} for {len(pids)} processes in 30s', 'info')
messagebox.showinfo('延迟操作', f'已安排 {len(pids)} 个进程在 30 秒后终止')
```

---

## 28. 进程深度分析

主程序提供了 `ProcessAnalyzer` 类，用于深度分析进程。

### 28.1 核心方法

| 方法 | 说明|
| ------------------------------ | --------------------------- |
| `get_process_modules(pid)` | 获取进程加载的 DLL 模块列表 |
| `get_process_threads(pid)` | 获取进程线程信息|
| `get_process_handles(pid)` | 获取进程打开的文件句柄|
| `get_process_environment(pid)` | 获取进程环境变量|
| `get_full_analysis(pid)` | 获取完整分析报告|

### 28.2 使用示例

```python
def analyze_selected_process(app):
pids = app.selected_processes
if not pids:
return
analyzer = ProcessAnalyzer(app)
analysis = analyzer.get_full_analysis(pids[0])
if analysis:
app.log_message(f'Modules: {len(analysis["modules"])}', 'info')
app.log_message(f'Threads: {len(analysis["threads"])}', 'info')
app.log_message(f'Handles: {len(analysis["handles"])}', 'info')
app.log_message(f'Environment vars: {len(analysis["environment"])}', 'info')
```

---

## 29. 实时性能监控

主程序提供了 `RealTimeProcessChart` 和 `RealTimeMonitorPage` 类，用于实时监控进程性能。

### 29.1 核心功能

- **CPU 使用率图表**：实时绘制 CPU 使用率曲线
- **内存占用图表**：实时绘制内存占用曲线
- **自动滚动**：自动保持最新数据可见
- **导出图片**：将图表导出为 PNG 文件
- **清空图表**：清除当前所有数据点

### 29.2 使用示例

```python
def open_realtime_monitor(app):
pids = app.selected_processes
if not pids:
return
for proc in app.all_process_data:
if proc['pid'] == pids[0]:
# 打开实时监控窗口
chart = RealTimeProcessChart(app.root, app, pids[0], proc['display_name'])
break
```

---

## 30. 网络连接查看器

主程序提供了 `NetworkConnectionsViewer` 类，用于查看系统网络连接。

### 30.1 核心功能

- **连接列表**：显示所有 TCP/UDP 连接
- **实时速率**：显示 TCP 连接的实时传输速率
- **筛选功能**：按关键字筛选连接
- **导出 CSV**：将连接列表导出为 CSV 文件
- **右键菜单**：结束进程、复制地址、查看历史图表

### 30.2 连接状态

| 状态| 说明 |
| ------------- | ------------ |
| `ESTABLISHED` | 已建立连接 |
| `SYN_SENT`| 正在发起连接 |
| `SYN_RECV`| 正在接受连接 |
| `FIN_WAIT1` | 正在关闭连接 |
| `FIN_WAIT2` | 等待关闭确认 |
| `TIME_WAIT` | 等待超时关闭 |
| `CLOSE_WAIT`| 等待关闭 |
| `LAST_ACK`| 等待最终确认 |
| `LISTEN`| 监听状态 |
| `CLOSING` | 正在关闭 |

---

## 31. 内存清理工具

主程序提供了 `MemoryCleaner` 类，用于清理系统内存。

### 31.1 核心功能

- **手动清理**：立即清理所有进程的工作集
- **自动清理**：按设定间隔自动清理
- **内存状态显示**：实时显示内存使用情况
- **进度反馈**：显示清理进度和释放的内存大小

### 31.2 使用示例

```python
def clean_memory_now(app):
cleaner = MemoryCleaner(app.root, app)
cleaner.on_clean_click()
```

---

## 32. PDF417 条形码支持

主程序提供了 PDF417 条形码的生成和扫描功能，主要用于 IATA BCBP（登机牌）标准。

### 32.1 PDF417 生成字段

| 字段 | 说明 | 格式 |
| ---------- | -------------------- | -------------- |
| 乘客姓名 | 拼音或英文姓名 | 姓/名 或 姓 名 |
| 航班号 | IATA 两字代码 + 数字 | CA1234 |
| 日期和时间 | 连续 13 位数字 | 202412251430 |
| 座位号 | 字母+数字| 12A|
| 登机顺序 | 3 位数字或字母 | 001|
| 常旅客号 | 会员卡号 | CA12345678901|
| 安全信息 | SSSS/OK/KTN+数字 | OK |
| 电子票号 | 13-14 位数字 | 9991234567890|

### 32.2 使用示例

```python
def generate_boarding_pass(app):
# 使用 QRCodeTool 生成 PDF417
tool = QRCodeTool(app.root, app)
# 填写字段...
tool.generate_pdf417_boarding_pass()
```

---

## 33. 文件安全销毁工具

主程序提供了 `FileDestroyer` 类，用于安全销毁文件。

### 33.1 核心功能

- **二进制模式**：在文件二进制数据中插入零字节
- **文本模式**：从文本文件中删除指定位置的字符
- **进度显示**：实时显示销毁进度
- **速度控制**：可调节销毁速度

### 33.2 参数说明

| 参数 | 说明 | 默认值 |
| ------ | ---------------------- | ------ |
| 间隔 | 销毁位置的间隔（字节） | 575|
| 块大小 | 每次销毁的连续字节数 | 50 |
| 延迟 | 每步操作延迟（微秒） | 0|

### 33.3 使用示例

```python
def destroy_file(app):
# 通过菜单打开文件销毁工具
app.open_file_destroyer()
```

---

## 34. 密码工具与字典生成器

主程序提供了 `PasswordToolWindow`、`ZipCracker` 和 `DictionaryGenerator` 类。

### 34.1 ZIP 密码破解工具 (`ZipCracker`)

| 功能 | 说明|
| -------------- | ------------------------------- |
| 支持的加密方式 | ZIP 2.0 Legacy, AES-256, 7-Zip|
| 字典支持 | 从文本文件加载密码字典|
| 实时进度 | 显示当前尝试的密码和进度|
| 结果保存 | 找到密码后保存到 `[时间戳].txt` |

### 34.2 字典生成器 (`DictionaryGenerator`)

| 模式 | 说明|
| -------- | ------------------------------------------- |
| 长度模式 | 生成指定长度的所有组合|
| 掩码模式 | 使用 `?` 占位符生成部分固定、部分变化的密码 |
| 字符集 | 数字、小写、大写、特殊字符、自定义字符集|

### 34.3 使用示例

```python
def open_password_tool(app):
# 通过菜单打开密码工具
app.open_zip_cracker()
```

---

## 35. 主题管理

主程序提供了 `ThemeManager` 类，支持浅色/深色/跟随系统主题。

### 35.1 核心方法

| 方法| 说明 |
| ----------------------------- | ------------------------------------ |
| `get_active_theme()`| 获取当前有效主题 |
| `set_theme(theme)`| 设置主题（light/dark/follow_system） |
| `get_stored_value()`| 获取存储的主题值 |
| `register_callback(callback)` | 注册主题变更回调 |

### 35.2 使用示例

```python
def on_theme_change(app):
theme = app.theme_manager.get_active_theme()
app.log_message(f'Theme changed to {theme}', 'debug')

# 注册主题变更回调（在 MOD 加载时）
app.theme_manager.register_callback(on_theme_change)
```

---

## 36. CLI 命令行工具

主程序支持以下命令行参数：

### 36.1 基本命令

| 命令 | 说明 |
| ---------------------------------------- | -------------------- |
| `--pack <source_dir> --output <out.rcm>` | 打包 MOD |
| `--unpack <file.rcm> --output <out_dir>` | 解包 RCM |
| `--verify <file.rcm>`| 验证 RCM 文件|
| `--list-mods`| 列出已安装的 MOD/DLC |
| `--test <file.rcm>`| 测试 MOD（不安装） |
| `--pack-gui` | 启动 GUI 打包工具|

### 36.2 版本管理命令

| 命令 | 说明 |
| ---------------------------------------- | -------------------- |
| `-c, --update-hash <file> <version>` | 验证文件 SHA256 哈希 |
| `-d, --update-version <ver> <save_path>` | 下载指定版本 |
| `-l, --update-version-link <version>`| 复制下载链接 |
| `-u, --update-list`| 列出可用版本 |
| `-v, --version`| 显示版本号 |
| `-n, --download-link <url> <save_path>`| 从 URL 下载文件|

### 36.3 使用示例

```bash
# 打包 MOD
Taskmgr.exe --pack MyMod --output MyMod.rcm

# 验证 MOD
Taskmgr.exe --verify MyMod.rcm

# 测试 MOD
Taskmgr.exe --test MyMod.rcm

# 列出所有 MOD
Taskmgr.exe --list-mods

# 下载最新版本
Taskmgr.exe -d 26.7 ./installer.exe

# 验证哈希
Taskmgr.exe -c ./installer.exe 26.7
```

---

## 附录 A：完整 API 速查表

| 类别 | 名称| 用途|
| -------- | ----------------------------------------------------------- | ----------------- |
| 日志 | `app.log_message(msg, level)` | 记录日志|
| 日志 | `app.save_logs_to_file()` | 保存日志|
| 翻译 | `app.get_text(key, default)`| 获取翻译|
| 翻译 | `app.reload_language()` | 重新加载语言|
| 进程 | `app.refresh_process_list()`| 刷新进程列表|
| 进程 | `app.selected_processes`| 选中 PID 列表 |
| 进程 | `app.all_process_data`| 所有进程数据|
| 进程 | `app.kill_selected()` | 结束选中进程|
| 进程 | `app.kill_process_tree(pid)`| 结束进程树|
| 进程 | `app.find_process_by_name(name)`| 按名称查找 PID|
| 进程 | `app.get_process_display_name(name)`| 获取中文显示名|
| 进程 | `app.get_selected_processes()`| 获取选中 PID 列表 |
| 进程 | `app.clear_selection()` | 清除选中|
| 配置 | `app.config`| 配置对象|
| 配置 | `app.save_config()` | 保存配置|
| UI | `app.root`| 主窗口|
| UI | `app.show_messagebox(type, title, msg, *args)`| 本地化消息框|
| UI | `app.create_tooltip_button(parent, text, cmd, tip, action)` | 创建提示按钮|
| UI | `app.setup_global_hotkeys()`| 设置全局快捷键|
| UI | `app.apply_theme()` | 应用主题|
| 权限 | `app.check_permission(feature)` | 权限检查|
| 权限 | `app.apply_permission_controls()` | 应用权限控制|
| 系统 | `app.get_network_time()`| 获取网络时间|
| 系统 | `app.version` | 程序版本|
| 系统 | `app.user_level`| 用户等级|
| 系统 | `app.running` | 运行状态|
| MOD| `app.mod_manager` | MOD 管理器|
| MOD| `app.setup_drag_drop()` | 设置拖拽安装|
| MOD| `app.open_mod_manager()`| 打开 MOD 管理 |
| MOD| `app.open_dlc_manager()`| 打开 DLC 管理 |
| MOD| `app.open_pack_tool()`| 打开打包工具|
| 监控 | `app.open_monitor_manager()`| 打开监控管理器|
| 监控 | `app.open_whitelist()`| 打开白名单设置|
| 监控 | `app.check_locked_hosts()`| 检查锁定 hosts|
| 监控 | `app.play_sound_notification()` | 播放声音通知|
| 搜索 | `app.on_search()` | 执行搜索|
| 搜索 | `app.show_search_history_window()`| 显示搜索历史|
| 进程分析 | `app.open_process_analysis_dialog()`| 打开进程分析|
| 进程限制 | `app.open_process_limit_dialog()` | 打开进程限制设置|
| 进程挂起 | `app.open_process_suspend_dialog()` | 打开进程挂起/恢复 |
| 进程延迟 | `app.open_process_delay_dialog()` | 打开延迟操作|
| 进程查询 | `app.get_process_by_pid(pid)` | 按 PID 获取进程信息 |
| 进程查询 | `app.get_process_count()` | 获取总进程数 |
| 进程查询 | `app.is_process_alive(pid)` | 检查进程是否存活 |
| 进程查询 | `app.safe_get_process_name(pid)` | 安全获取进程名 |
| 进程查询 | `app.safe_get_process_cpu(pid)` | 安全获取进程 CPU |
| 进程查询 | `app.safe_get_process_memory(pid)` | 安全获取进程内存 |
| 进程查询 | `app.safe_get_process_create_time(pid)` | 安全获取进程创建时间 |
| 进程查询 | `app.safe_get_process_status(pid)` | 安全获取进程状态 |
| 进程查询 | `app.safe_get_process_username(pid)` | 安全获取进程用户 |
| 进程查询 | `app.safe_get_process_children(pid)` | 安全获取子进程 |
| 进程查询 | `app.safe_get_process_parent(pid)` | 安全获取父进程 |
| 系统信息 | `app.get_system_uptime()` | 获取系统运行时间 |
| 系统信息 | `app.get_cpu_count()` | 获取 CPU 核心数 |
| 系统信息 | `app.get_total_memory()` | 获取总物理内存 |
| 系统信息 | `app.get_available_memory()` | 获取可用内存 |
| 系统信息 | `app.get_platform()` | 获取操作系统平台 |
| 系统信息 | `app.get_python_version()` | 获取 Python 版本 |
| 系统信息 | `app.get_system_health_data()` | 获取系统健康数据 |
| 系统信息 | `app.get_battery_status_data()` | 获取电池状态 |
| 系统信息 | `app.get_process_timeline_data()` | 获取进程启动时间线 |
| 系统信息 | `app.get_process_ranking_data()` | 获取进程资源排名 |
| 配置 | `app.get_config_path()` | 获取配置文件路径 |
| 配置 | `app.get_mods_dir()` | 获取 MOD 目录 |
| 配置 | `app.get_cache_dir()` | 获取缓存目录 |
| 配置 | `app.get_app_data_dir()` | 获取应用数据目录 |
| 配置 | `app.get_setting(s,k,d)` | 读取配置项 |
| 配置 | `app.set_setting(s,k,v)` | 写入配置项 |
| 配置 | `app.get_config()` | 获取配置对象 |
| 工具 | `app.format_timestamp(ts)` | 格式化时间戳 |
| 工具 | `app.open_url(url)` | 打开 URL |
| 工具 | `app.open_file(path)` | 打开文件 |
| 工具 | `app.open_folder(path)` | 打开文件夹 |
| 工具 | `app.show_notification(t,m)` | 显示通知 |
| 工具 | `app.show_input_dialog(t,p)` | 显示输入对话框 |
| 工具 | `app.show_yes_no_dialog(t,m)` | 显示确认对话框 |
| 工具 | `app.clipboard_copy(text)` | 复制到剪贴板 |
| 工具 | `app.clipboard_paste()` | 从剪贴板粘贴 |
| 工具 | `app.create_toplevel(t,g)` | 创建子窗口 |
| 工具 | `app.execute_shell_command(c,t)` | 执行命令 |
| 工具 | `app.get_theme()` | 获取当前主题 |
| 工具 | `app.on_theme_change(cb)` | 注册主题变更 |
| 工具 | `app.get_language()` | 获取当前语言 |
| 工具 | `app.get_all_languages()` | 获取所有语言 |
| 工具 | `app.get_version_string()` | 获取版本号 |
| MOD | `app.get_loaded_mods()` | 获取已加载 MOD |
| MOD | `app.get_mod_info(name)` | 获取 MOD 信息 |
| MOD | `app.has_dlc(name)` | 检查 DLC 授权 |
| MOD | `app.call_mod_function(m,f,*a)` | 跨 MOD 调用函数 |
| 事件 | `app.register_callback(e,cb)` | 注册事件回调 |
| 事件 | `app.unregister_callback(e,cb)` | 移除事件回调 |
| 事件 | `app.trigger_event(e,*a)` | 触发事件 |
| 事件 | `app.add_timer(ms,cb)` | 添加定时器 |
| 其他 | `app.is_developer_mode()` | 检查开发者模式 |
| 其他 | `app.get_selected_count()` | 获取选中进程数 |
| 其他 | `app.get_root()` | 获取主窗口 |
| 其他 | `app.restart_self()` | 重启主程序 |
| 其他 | `app.exit_self()` | 退出主程序 |
| 进程增强 | `app.get_process_environment(pid)` | 获取进程环境变量 |
| 进程增强 | `app.get_process_threads(pid)` | 获取进程线程列表 |
| 进程增强 | `app.get_process_connections(pid)` | 获取进程网络连接 |
| 进程增强 | `app.get_process_open_files(pid)` | 获取进程打开文件 |
| 进程增强 | `app.get_process_memory_maps(pid)` | 获取进程内存映射 |
| 进程增强 | `app.get_process_io_counters(pid)` | 获取进程 I/O 统计 |
| 进程增强 | `app.get_process_cmdline(pid)` | 获取进程命令行 |
| 进程增强 | `app.suspend_process(pid)` | 暂停进程 |
| 进程增强 | `app.resume_process(pid)` | 恢复进程 |
| 进程增强 | `app.kill_process_tree(pid,t)` | 结束进程树（含子进程） |
| 进程增强 | `app.get_process_by_name(name)` | 按名称查找进程 |
| 进程增强 | `app.wait_process_exit(pid,t)` | 等待进程退出 |
| 进程增强 | `app.get_process_num_handles(pid)` | 获取进程句柄数 |
| 系统增强 | `app.get_cpu_per_core()` | 获取每核 CPU 使用率 |
| 系统增强 | `app.get_cpu_frequency()` | 获取 CPU 频率 |
| 系统增强 | `app.get_disk_io_counters()` | 获取磁盘 I/O 统计 |
| 系统增强 | `app.get_network_connections()` | 获取所有网络连接 |
| 系统增强 | `app.get_network_interfaces()` | 获取网络接口信息 |
| 系统增强 | `app.get_system_swap()` | 获取交换分区信息 |
| 系统增强 | `app.get_system_load()` | 获取系统负载 |
| 系统增强 | `app.get_system_users()` | 获取登录用户列表 |
| 系统增强 | `app.get_disk_partitions()` | 获取磁盘分区列表 |
| 系统增强 | `app.get_system_sensors_temperatures()` | 获取传感器温度 |
| 配置增强 | `app.get_config_sections()` | 获取配置节名列表 |
| 配置增强 | `app.get_config_keys(s)` | 获取配置键名列表 |
| 配置增强 | `app.save_config_backup(p)` | 备份配置文件 |
| 配置增强 | `app.get_log_content(n)` | 获取最近日志内容 |
| 配置增强 | `app.clear_app_log()` | 清空应用日志 |
| 配置增强 | `app.get_cache_size()` | 获取缓存目录大小 |
| 配置增强 | `app.get_data_dir()` | 获取应用数据目录 |
| 配置增强 | `app.get_temp_dir()` | 获取临时目录路径 |
| 窗口控制 | `app.set_window_size(w,h)` | 设置主窗口尺寸 |
| 窗口控制 | `app.set_window_minimized()` | 最小化主窗口 |
| 窗口控制 | `app.set_window_maximized()` | 最大化主窗口 |
| 窗口控制 | `app.set_window_title_text(t)` | 设置窗口标题 |
| 窗口控制 | `app.flash_window_taskbar()` | 闪烁任务栏按钮 |
| 窗口控制 | `app.set_always_on_top_mode(b)` | 设置窗口置顶 |
| 窗口控制 | `app.center_window(w)` | 居中窗口 |
| 窗口控制 | `app.get_window_geometry()` | 获取窗口几何信息 |
| MOD增强 | `app.enable_mod_by_name(n)` | 启用 MOD |
| MOD增强 | `app.disable_mod_by_name(n)` | 禁用 MOD |
| MOD增强 | `app.get_mod_enabled(n)` | 检查 MOD 是否加载 |
| MOD增强 | `app.get_all_mod_names()` | 获取所有 MOD 名称 |
| MOD增强 | `app.get_available_dlcs()` | 获取已授权 DLC 列表 |
| MOD增强 | `app.reload_all_mods()` | 重新加载所有 MOD |
| 网络工具 | `app.get_local_ip_address()` | 获取本机局域网 IP |
| 网络工具 | `app.ping_address(h,c)` | Ping 目标主机 |
| 网络工具 | `app.check_port_open(h,p,t)` | 检查端口是否开放 |
| 网络工具 | `app.get_public_ip_address()` | 获取公网 IP 地址 |
| 网络工具 | `app.download_url_to_file(u,d,t)` | 下载文件到本地 |
| 网络工具 | `app.hash_file_md5(p)` | 计算文件 MD5 哈希 |
| 网络工具 | `app.hash_file_sha256(p)` | 计算文件 SHA-256 哈希 |
| 网络工具 | `app.get_file_metadata(p)` | 获取文件元数据 |

---

## 附录 B：错误代码参考

| 错误代码 | 说明| 解决方法 |
| ------------------------------ | ----------------------- | ------------------------------ |
| `ERR_MOD_INVALID_CONFIG` | ModConfig.json 格式无效 | 检查 JSON 语法和必需字段 |
| `ERR_MOD_VERSION_INCOMPATIBLE` | 程序版本不兼容| 调整 `MinVersion`/`MaxVersion` |
| `ERR_MOD_DEPENDENCY_MISSING` | 依赖的 MOD/DLC 未安装 | 安装依赖 |
| `ERR_MOD_DEPENDENCY_CYCLE` | 循环依赖| 移除循环依赖 |
| `ERR_MOD_DLC_UNAUTHORIZED` | DLC 未授权| 检查授权记录 |
| `ERR_MOD_FUNCTION_NOT_FOUND` | 菜单命令函数不存在| 检查 `command` 拼写和函数定义|
| `ERR_MOD_IMPORT_NOT_ALLOWED` | 导入未在白名单中的库| 在 `import` 数组中添加 |
| `ERR_MOD_EXTRACT_FAILED` | 解压 `.rcm` 失败| 检查文件完整性 |
| `ERR_MOD_PERMISSION_DENIED`| 权限不足| 以管理员身份运行 |

---

## 附录 C：术语表

| 术语 | 说明|
| -------------- | --------------------------------------------------- |
| **MOD**| 社区开发的免费扩展包|
| **DLC**| 官方发布的付费扩展包|
| **RCM**| Release Control Module 的缩写，MOD/DLC 的安装包格式 |
| **NRCL** | Network Release Control License，网络许可证系统 |
| **ZEP**| Ziyit Enhancement Proposal，项目增强提案|
| **SemVer** | 语义化版本号规范|
| **沙箱** | 隔离的代码执行环境|
| **白名单** | 允许的导入库列表|
| **Job Object** | Windows 作业对象，用于进程组资源限制|
| **BCBP** | Bar Coded Boarding Pass，IATA 条形码登机牌标准|

---

## 附录 D：完整示例 MOD

```python
import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time

def open_custom_dialog(app):
CustomDialog(app)

class CustomDialog:
def __init__(self, app):
self.app = app
self.window = tk.Toplevel(app.root)
self.window.title('自定义对话框')
self.window.geometry('400x300')
self.window.transient(app.root)
self.window.grab_set()

ttk.Label(self.window, text='当前进程数:').pack(pady=10)
self.count_label = ttk.Label(self.window, text=str(len(app.all_process_data)))
self.count_label.pack(pady=5)

ttk.Button(self.window, text='刷新', command=self.refresh_count).pack(pady=10)
ttk.Button(self.window, text='关闭', command=self.window.destroy).pack(pady=10)

def refresh_count(self):
self.app.refresh_process_list()
self.count_label.config(text=str(len(self.app.all_process_data)))
```

---

## 附录 E：版本更新日志格式

```
## [1.0.0] - 2026-01-01

### 新增
- 添加 XX 功能
- 支持 YY 操作

### 修复
- 修复 ZZ 问题
- 修复 AA 错误

### 变更
- 优化 BB 性能
- 更新 CC 接口
```

---

## 附录 F：贡献指南

1. Fork 项目仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交修改：`git commit -m 'feat: add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

---

## 附录 G：CoreToolkit 前置 DLC 开发接口

CoreToolkit 是一个由 ZIYIT STUDIO 官方发布的**前置 DLC**（`License = "ZIYIT STUDIO"`），它提供了一系列通用的工具函数和 UI 辅助，旨在简化其他 MOD/DLC 的开发，避免重复造轮子。任何 MOD 都可以通过声明依赖关系来使用 CoreToolkit 提供的接口。

**当前版本**：1.0.1
**最低主程序版本**：26.7

---

### G.1 概述

CoreToolkit 包含三个核心模块：

| 模块       | 用途                                                         |
| ---------- | ------------------------------------------------------------ |
| `main.py`  | 菜单命令入口，提供了可直接挂载的功能（MOD 状态、DLC 配置、开发者工具箱） |
| `mixin.py` | **推荐其他 MOD 调用的通用 API**，涵盖对话框、进程信息、线程、句柄、服务、驱动、注册表、WMI、配置读写等 |
| `utils.py` | 基础工具类与函数，包括系统信息收集、字节格式化、安全 PID 获取等 |

所有公开 API 均设计为无状态、线程安全（除非特别说明），可安全地在 MOD 代码中调用。

---

### G.2 依赖配置

要在你的 MOD 中使用 CoreToolkit，需要在 `ModConfig.json` 中完成两步配置：

1. **声明依赖**
   在 `Dependencies` 数组中添加 `"CoreToolkit"`。

2. **声明导入白名单**
   在 `import` 数组中添加 `"CoreToolkit"`（或具体子模块，如 `"CoreToolkit.mixin"`）。

3. **安装前置 DLC**
   向官方 `ziyitstudio@qq.com` 申请获得该 DLC。

**示例**：
```json
{
  "Name": "MyAdvancedMod",
  "License": "MIT",
  "Version": "1.0.0",
  "Dependencies": ["CoreToolkit"],
  "import": ["CoreToolkit.mixin", "CoreToolkit.utils"],
  "Path": {
    "MainCode": "main.py"
  },
  "Menu": [
    {"label": "My Mod Action", "command": "my_action"}
  ]
}
```

> **注意**：`Dependencies` 确保 CoreToolkit 会在你的 MOD 之前加载；`import` 白名单允许你的 MOD 导入这些模块。两者缺一不可。

---

### G.3 核心 API 参考

所有 API 均位于 `CoreToolkit` 包下，你可以通过以下方式导入：

```python
from CoreToolkit.mixin import (
    show_info_dialog,
    get_selected_process_info,
    list_processes,
    list_threads,
    list_handles,
    list_services,
    list_drivers,
    control_service,
    reg_read,
    reg_write,
    reg_delete_value,
    reg_enum_keys,
    reg_enum_values,
    query_wmi,
    get_system_info,
    register_setting,
    unregister_setting,
    run_in_thread,
    read_config,
    write_config,
    format_process_name,
)
from CoreToolkit.utils import SystemInfo, format_bytes, safe_selected_pids
```

---

#### G.3.1 mixin 模块 – 基础 UI 与辅助函数

`mixin.py` 提供了最常用的通用函数，推荐优先使用。

##### `show_info_dialog(app, title, message_key)`

- **参数**：
  - `app`：主程序实例（由命令函数传入）
  - `title` (`str`)：对话框标题（直接显示，不经过翻译）
  - `message_key` (`str`)：消息内容的翻译键，或直接文本
- **说明**：显示一个信息对话框，消息内容会根据当前语言自动翻译。
- **示例**：
  ```python
  show_info_dialog(app, '操作成功', 'my_mod.success_message')
  ```

##### `show_error_dialog(app, title, message_key)`

- **参数**：同 `show_info_dialog`
- **说明**：显示一个错误对话框。
- **示例**：
  ```python
  show_error_dialog(app, '错误', 'my_mod.error_occurred')
  ```

##### `get_selected_process_info(app)`

- **参数**：
  - `app`：主程序实例
- **返回值**：`list[dict]` – 当前选中进程的完整数据列表（每个 dict 结构与 `app.all_process_data` 中的条目一致）
- **说明**：获取当前用户选中的进程信息，若未选中任何进程则返回空列表。
- **示例**：
  ```python
  selected = get_selected_process_info(app)
  for proc in selected:
      print(proc['pid'], proc['display_name'])
  ```

##### `run_in_thread(func, daemon=True)`

- **参数**：
  - `func`：要在线程中执行的函数（不接受参数）
  - `daemon` (`bool`)：是否设为守护线程，默认为 `True`
- **返回值**：`threading.Thread` – 已启动的线程对象
- **说明**：在一个新线程中执行函数，避免阻塞 UI。适用于耗时操作。
- **示例**：
  ```python
  def background_task():
      # 耗时操作
      pass
  run_in_thread(background_task)
  ```

##### `read_config(app, section, key, fallback='')`

- **参数**：
  - `app`：主程序实例
  - `section` (`str`)：配置文件节名
  - `key` (`str`)：配置键名
  - `fallback` (`str`)：未找到时的默认值，默认为空字符串
- **返回值**：`str` – 配置值
- **说明**：从 `config.ini` 中读取指定配置项。
- **示例**：
  ```python
  interval = read_config(app, 'MyMod', 'refresh_interval', '5')
  ```

##### `write_config(app, section, key, value)`

- **参数**：
  - `app`：主程序实例
  - `section` (`str`)：配置文件节名
  - `key` (`str`)：配置键名
  - `value`：要写入的值（会自动转换为字符串）
- **说明**：将配置项写入 `config.ini` 并立即保存。如果节不存在会自动创建。
- **示例**：
  ```python
  write_config(app, 'MyMod', 'refresh_interval', 10)
  ```

##### `format_process_name(proc)`

- **参数**：
  - `proc` (`dict`)：进程数据字典（来自 `app.all_process_data` 或 `get_selected_process_info`）
- **返回值**：`str` – 进程的显示名称（优先返回 `display_name`，否则返回 `name`，否则返回 `'Unknown'`）
- **说明**：安全地获取进程的友好名称。
- **示例**：
  ```python
  for proc in selected:
      name = format_process_name(proc)
      print(name)
  ```

---

#### G.3.2 mixin 模块 – 进程与系统枚举 API（新增）

以下 API 提供了对系统底层信息的枚举能力，适用于开发者工具和高级诊断场景。

##### `list_processes()`

- **参数**：无
- **返回值**：`list[dict]` – 所有进程的信息列表，每个进程包含：
  - `pid`：进程 ID
  - `ppid`：父进程 ID
  - `name`：进程名称
  - `exe`：可执行文件路径
  - `status`：进程状态
  - `username`：所属用户名
  - `create_time`：创建时间戳
- **说明**：枚举系统中所有正在运行的进程。
- **示例**：
  ```python
  processes = list_processes()
  for p in processes[:10]:
      print(f"{p['pid']}: {p['name']} ({p['username']})")
  ```

##### `list_threads(pid=None)`

- **参数**：
  - `pid` (`int`, optional)：指定进程 PID，若为 `None` 则枚举所有进程的线程
- **返回值**：`list[dict]` – 线程信息列表，每个线程包含：
  - `tid`：线程 ID
  - `pid`：所属进程 PID
  - `user_time`：用户态运行时间（秒）
  - `system_time`：内核态运行时间（秒）
- **说明**：枚举系统中所有线程或指定进程的线程。
- **示例**：
  ```python
  threads = list_threads(1234)  # 获取 PID 1234 的所有线程
  for t in threads:
      print(f"TID: {t['tid']}, User: {t['user_time']:.2f}s")
  ```

##### `list_handles(pid=None)`

- **参数**：
  - `pid` (`int`, optional)：指定进程 PID，若为 `None` 则枚举所有进程的句柄
- **返回值**：`list[dict]` – 句柄信息列表，每个句柄包含：
  - `pid`：所属进程 PID
  - `handle`：句柄值
  - `type_index`：对象类型索引
  - `flags`：句柄标志
  - `object`：对象地址
  - `access`：访问权限掩码
- **说明**：通过 `NtQuerySystemInformation` 枚举系统句柄。需要管理员权限才能获取完整信息。
- **示例**：
  ```python
  handles = list_handles(1234)
  print(f"Process 1234 has {len(handles)} open handles")
  ```

##### `list_services()`

- **参数**：无
- **返回值**：`list[dict]` – Windows 服务信息列表，每个服务包含：
  - `name`：服务名称
  - `display_name`：显示名称
  - `status`：服务状态（如 `running`, `stopped`）
  - `start_type`：启动类型（如 `auto_start`, `demand_start`）
- **说明**：枚举系统中所有 Windows 服务。
- **示例**：
  ```python
  services = list_services()
  for svc in services:
      if svc['status'] == 'running':
          print(svc['display_name'])
  ```

##### `control_service(service_name, action)`

- **参数**：
  - `service_name` (`str`)：服务名称
  - `action` (`str`)：操作类型，可选 `'start'`、`'stop'`、`'restart'`
- **返回值**：`bool` – 操作是否成功
- **说明**：控制 Windows 服务的启动、停止或重启。
- **示例**：
  ```python
  if control_service('Spooler', 'restart'):
      show_info_dialog(app, '成功', '服务已重启')
  ```

##### `list_drivers()`

- **参数**：无
- **返回值**：`list[dict]` – 内核驱动程序信息列表，每个驱动包含：
  - `base_address`：加载基址（十六进制字符串）
  - `name`：驱动程序名称
- **说明**：通过 `EnumDeviceDrivers` 枚举已加载的内核驱动程序。需要管理员权限。
- **示例**：
  ```python
  drivers = list_drivers()
  for drv in drivers:
      print(f"{drv['name']} @ {drv['base_address']}")
  ```

##### `query_wmi(wql)`

- **参数**：
  - `wql` (`str`)：WMI 查询语句，如 `"SELECT Name, ProcessId FROM Win32_Process"`
- **返回值**：`list[dict] | None` – 查询结果列表，失败时返回 `None`
- **说明**：执行 WMI 查询，返回结果字典列表。需要安装 `wmi` 库。
- **示例**：
  ```python
  result = query_wmi("SELECT Caption, Manufacturer FROM Win32_ComputerSystem")
  if result:
      print(result[0].get('Caption'))
  ```

##### `get_system_info()`

- **参数**：无
- **返回值**：`dict` – 系统信息字典，包含：
  - `cpu_count_logical`：逻辑 CPU 数量
  - `cpu_count_physical`：物理 CPU 核心数
  - `cpu_percent`：当前 CPU 使用率
  - `memory`：虚拟内存信息（`total`, `available`, `percent`, `used`, `free`）
  - `disk_partitions`：磁盘分区列表（每个包含 `device`, `mountpoint`, `fstype`, `total`, `used`, `free`, `percent`）
  - `boot_time`：系统启动时间戳
- **说明**：获取全面的系统硬件和资源信息。
- **示例**：
  ```python
  info = get_system_info()
  print(f"CPU: {info['cpu_percent']}%")
  print(f"Memory: {info['memory']['percent']}%")
  ```

---

#### G.3.3 mixin 模块 – 注册表操作 API（新增）

以下 API 提供了对 Windows 注册表的读写和枚举能力。

##### `reg_read(root, path, value_name)`

- **参数**：
  - `root`：注册表根键（字符串如 `"HKEY_LOCAL_MACHINE"`，或 `winreg` 常量）
  - `path` (`str`)：子键路径
  - `value_name` (`str`)：值名称
- **返回值**：`dict | None` – 包含 `value` 和 `type` 的字典，键不存在时返回 `None`
- **说明**：读取注册表值。
- **示例**：
  ```python
  result = reg_read('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'ProductName')
  if result:
      print(result['value'])
  ```

##### `reg_write(root, path, value_name, value, value_type=winreg.REG_SZ)`

- **参数**：
  - `root`：注册表根键
  - `path` (`str`)：子键路径
  - `value_name` (`str`)：值名称
  - `value`：要写入的值
  - `value_type`：注册表值类型，默认为 `winreg.REG_SZ`
- **返回值**：`bool` – 是否成功
- **说明**：写入注册表值。如果键不存在会自动创建。
- **示例**：
  ```python
  reg_write('HKEY_CURRENT_USER', 'Software\\MyMod', 'Enabled', '1')
  ```

##### `reg_delete_value(root, path, value_name)`

- **参数**：
  - `root`：注册表根键
  - `path` (`str`)：子键路径
  - `value_name` (`str`)：值名称
- **返回值**：`bool` – 是否成功
- **说明**：删除注册表值。
- **示例**：
  ```python
  reg_delete_value('HKEY_CURRENT_USER', 'Software\\MyMod', 'Enabled')
  ```

##### `reg_enum_keys(root, path)`

- **参数**：
  - `root`：注册表根键
  - `path` (`str`)：子键路径
- **返回值**：`list[str]` – 子键名称列表
- **说明**：枚举指定注册表路径下的所有子键。
- **示例**：
  ```python
  keys = reg_enum_keys('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft')
  for key in keys[:10]:
      print(key)
  ```

##### `reg_enum_values(root, path)`

- **参数**：
  - `root`：注册表根键
  - `path` (`str`)：子键路径
- **返回值**：`list[dict]` – 值列表，每个包含 `name`、`value`、`type`
- **说明**：枚举指定注册表路径下的所有值。
- **示例**：
  ```python
  values = reg_enum_values('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion')
  for v in values:
      print(f"{v['name']} = {v['value']}")
  ```

---

#### G.3.4 mixin 模块 – MOD 设置注册 API（新增）

以下 API 允许 MOD 向 CoreToolkit 注册自定义设置项，这些设置项会统一管理并可被其他 MOD 复用。

##### `register_setting(app, section, key, setting_type, default, label, callback=None, choices=None)`

- **参数**：
  - `app`：主程序实例
  - `section` (`str`)：配置节名
  - `key` (`str`)：配置键名
  - `setting_type` (`str`)：设置类型，如 `'bool'`、`'int'`、`'str'`、`'choice'`
  - `default`：默认值
  - `label` (`str`)：设置项的显示标签（翻译键或直接文本）
  - `callback` (`function`, optional)：设置变更时的回调函数
  - `choices` (`list`, optional)：当 `setting_type == 'choice'` 时可选项列表
- **说明**：向 CoreToolkit 注册一个设置项，其他 MOD 可以通过 `read_config` 读取该设置。
- **示例**：
  ```python
  register_setting(
      app,
      'MyMod',
      'enable_feature',
      'bool',
      True,
      'my_mod.setting.enable_feature',
      callback=lambda: print('Setting changed')
  )
  ```

##### `unregister_setting(app, section, key)`

- **参数**：
  - `app`：主程序实例
  - `section` (`str`)：配置节名
  - `key` (`str`)：配置键名
- **说明**：注销一个已注册的设置项。
- **示例**：
  ```python
  unregister_setting(app, 'MyMod', 'enable_feature')
  ```

---

#### G.3.5 utils 模块

`utils.py` 提供了一些基础辅助类和函数。

##### `SystemInfo` 类

- **构造方法**：`SystemInfo(app)`
- **方法**：
  - `collect()` → `dict`：收集以下系统信息并返回字典：
    - `version`：主程序版本
    - `language`：当前语言
    - `user_level`：用户等级
    - `process_count`：总进程数
    - `selected_count`：选中进程数
    - `os`：操作系统平台
    - `python`：Python 版本
    - `timestamp`：当前时间戳
- **示例**：
  ```python
  info = SystemInfo(app).collect()
  print(info['os'])
  ```

##### `format_bytes(value)`

- **参数**：
  - `value`：数字（字节数），可以是 `int`、`float` 或 `None`
- **返回值**：`str` – 格式化的字节字符串（如 `"1.23 MB"`）
- **说明**：自动选择合适的单位（B, KB, MB, GB, TB），若传入无效值则返回 `"0 B"`。
- **示例**：
  ```python
  size = format_bytes(1024 * 1024)  # 返回 "1.00 MB"
  ```

##### `safe_selected_pids(app)`

- **参数**：
  - `app`：主程序实例
- **返回值**：`list[int]` – 过滤后的 PID 列表（只包含有效的正整数 PID）
- **说明**：获取当前选中的 PID 列表，并过滤掉无效值（如负数、非整数），避免后续操作出错。
- **示例**：
  ```python
  pids = safe_selected_pids(app)
  if pids:
      # 安全处理
  ```

---

### G.4 CoreToolkit 内置用户功能

CoreToolkit 自带三个菜单功能，方便开发者快速查看系统状态：

| 菜单项 | 功能说明 |
| ------ | -------- |
| **MOD 状态** (`core.menu.mod_status`) | 显示所有已加载 MOD/DLC 的名称、类型、版本和加载状态 |
| **DLC 配置** (`core.menu.dlc_config`) | 查看当前用户授权信息和已购买的 DLC 列表，支持手动刷新授权 |
| **开发者工具箱** (`core.menu.dev_toolbox`) | 集成了进程、线程、句柄、服务、驱动程序、注册表、WMI、系统信息等枚举工具，方便调试和开发 |

---

### G.5 使用示例：在 MOD 中集成 CoreToolkit

以下是一个完整的 MOD 示例，展示如何依赖 CoreToolkit 并使用其高级 API。

**ModConfig.json**：
```json
{
  "Name": "MyEnhancedMod",
  "License": "MIT",
  "Version": "1.0.0",
  "Dependencies": ["CoreToolkit"],
  "import": ["CoreToolkit.mixin", "CoreToolkit.utils"],
  "Path": {
    "MainCode": "main.py"
  },
  "Menu": [
    {"label": "系统诊断", "command": "run_diagnostic"}
  ]
}
```

**main.py**：
```python
from CoreToolkit.mixin import (
    show_info_dialog,
    list_processes,
    list_services,
    get_system_info,
    run_in_thread,
    reg_read,
)
from CoreToolkit.utils import format_bytes

def run_diagnostic(app):
    def worker():
        info = get_system_info()
        processes = list_processes()
        running_services = [s for s in list_services() if s['status'] == 'running']

        total_mem = info['memory']['total']
        used_mem = info['memory']['used']

        # 读取注册表获取 Windows 版本
        ver = reg_read(
            'HKEY_LOCAL_MACHINE',
            'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion',
            'ProductName'
        )
        os_name = ver['value'] if ver else 'Unknown'

        msg = (
            f"OS: {os_name}\n"
            f"CPU: {info['cpu_percent']}%\n"
            f"Memory: {format_bytes(used_mem)} / {format_bytes(total_mem)} ({info['memory']['percent']}%)\n"
            f"Processes: {len(processes)}\n"
            f"Running Services: {len(running_services)}\n"
            f"Boot Time: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(info['boot_time']))}"
        )

        app.root.after(0, lambda: show_info_dialog(app, '诊断报告', msg))

    run_in_thread(worker)
```

---

### G.6 注意事项

1. **版本兼容性**：CoreToolkit 要求主程序版本 `>= 26.7`，且其自身版本号会随主程序更新。请确保你的 MOD 的 `MinVersion` 与 CoreToolkit 的要求一致。
2. **循环依赖**：CoreToolkit 本身没有依赖，其他 MOD 可以放心依赖它，但不要形成 A→B→A 的循环。
3. **UI 线程安全**：所有涉及 UI 的操作（如 `show_info_dialog`）必须在主线程中调用。如果你在后台线程中需要显示对话框，请使用 `app.root.after(0, lambda: ...)` 回调到主线程。
4. **翻译键**：`show_info_dialog` 的 `message_key` 会通过 `app.get_text` 翻译，因此你可以在自己的语言文件中定义对应的翻译条目，也可以直接传入普通字符串（但不会翻译）。
5. **配置读写**：`read_config` / `write_config` 操作的是主程序的 `config.ini` 文件，建议使用你自己的节名（如 `[MyMod]`）避免冲突。
6. **性能**：`get_selected_process_info` 返回的是数据的副本，不会影响主程序内部状态，可放心调用。
7. **权限要求**：`list_handles`、`list_drivers` 等 API 需要管理员权限才能获取完整信息。在普通用户权限下，部分数据可能不可用。
8. **WMI 依赖**：`query_wmi` 需要系统安装 `wmi` 库（通常由主程序自带），如果不可用会返回 `None`。

---

本文档随 Release Control 更新，最新版本请查阅官方仓库。*