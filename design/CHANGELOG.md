# CHANGELOG — ZIYIT STUDIO 设计体系变更记录

> 记录 `AGENTS.md` 与 `DESIGN.md` 的每一次变更，保证设计迭代可追溯。
> 版本规则：小改动 +0.1（如 v1.0 → v1.1）；体系级重构 +1（如 v1.x → v2.0）。

## v1.29 — 2026-10-01
### 更新
- **人机验证对接后端 v0.3.55 的「验证方式」新契约**（`Human_verification/api.js`、`Human_verification/phantom.js`）：
  - `POST /session` 新增的 `allowedMethods` / `defaultMethod` / `canSwitch` 三字段落地到 `api.js`（随票据一起缓存、换后端或票据失效时一并复位），并新增 `sessionInfo()` 供上层读取；缺字段的老后端按"两套都允许、默认拖拽那套"回落，行为与升级前一致。
  - **"换一种方式验证"入口按能力渲染**：只有 `canSwitch === true` 且 `defaultMethod === "phantom"` 时才渲染该入口；`canSwitch === false` 时**不渲染**入口、也不显示"当前验证暂不支持无障碍替代方式"之类提示。
  - **默认方式直达**：`defaultMethod === "pow"` 的密钥直接进 PoW 流程，不再先出拖拽题；若权威预告 `requiredMethods` 仍含 `phantom`（双验证），PoW 通过后自动续跑拖拽那套，两套凭据一并交给接入方。
  - **`preferredMethod` 接上两个领题接口**：`POST /challenge`、`POST /pow/challenge` 支持 `"phantom"` / `"pow"`；仅在取值合法时带上，双验证场景由后端忽略（此时如实提示换不掉），非法值静默回落由后端处理。原先发送已被后端移除的 `a11y` 字段的逻辑删除。
  - `requiredMethods` 仍是判断"要不要走双套"的唯一依据；**反向同理**：`/challenge` 返回的预告里没有 `phantom`（例如密钥只允许 PoW）时不再先把拖拽题端上来，直接转 PoW —— 这是 api-key / 体验页通道拿不到 `/session` 能力时唯一的兜底信号。
  - "换一种方式验证"入口改为**按本次实际流程**决定：只有本次确实要出拖拽题、且 `/session` 明说 `canSwitch` 时才渲染；拿不到密钥能力（api-key / 体验页通道）时不渲染，避免承诺一个换不掉的入口。
  - **领题端点按 403 自动改道**：领题端点与密钥白名单是硬绑定（`/challenge` ↔ phantom、`/pow/challenge` ↔ pow），选错时后端**硬拒 403**（`requested verification method not allowed for this key`），不再回落成密钥默认方式。api-key / 体验页通道在领题前拿不到密钥白名单，故 `api.js` 新增 `isMethodNotAllowed(e)` 识别这条 403，`phantom.js` 命中后改调 `/pow/challenge`；若该密钥连 PoW 也不允许，则按 `_classify403` 新增的 `method` 分支给出明确中文提示并转为重试按钮，不再无限自动重试。
### 说明
- 只改前端；后端未改动。
- 密钥的「验证方式」在三条通道上生效范围不同（后端既定行为，非前端缺陷）：票据通道按来源命中的密钥生效；api-key 通道按该密钥的 `human_mode` / `allowed_modes` 生效；体验页通道（`x-phantom-exp-key`）**已按所填密钥取验证方式**（后端 `_authorize` 的 `exp` 分支改为用 `exp_key` 查 `get_human_mode_config`，身份/计费仍按登录 JWT），因此体验页也会受该密钥的 `allowed_modes` 约束、可能命中上述 403 改道。
- 另注：`Human_verification/api.js` 的 `explicitApiKey()` 读全站共用的 `localStorage['phantom_api_key']`；只要在密钥页生成过一次密钥，之后全站都会切成 api-key 通道、绕过 `/session`。

## v1.28 — 2026-10-01
### 修复
- **后端地址解析不再读 `backend.txt`**：`assets/ziyit_api.js`、`Human_verification/api.js`、`Human_verification.html` 三处各自的 `<repo>/backend.txt` 拉取 + 解析逻辑（`backendTxtUrl()` / `parseBases()` / `loadBackendBases()` / `FILE_BASES`）全部删除，改为「Cookie `ziyit_api_base_ok` → `localStorage['ziyit_api_base']` → 兜底常量」一条链；兜底常量统一为 `https://ziyitstudio.ccwu.cc`（原为 ngrok 临时域名）。
- **在线客服连接失败**：`guideAuthSync` / `guideChat` / `guideChatStream` 原本直接用 `currentBase()` 取址，绕过了 `backendReady()` 的地址就绪与探测，缓存里留着旧地址时就会直连失败。现统一走新增的 `fetchApi()` / `fetchApiRaw()`（先 `backendReady()` 再取址），并在连接层失败（非后端回包）时清缓存地址、按 cookie / 兜底重解析重试一次。`authFetch`（申诉）、`userType`、`backroomsTypeOpen`、`backroomsDownloadStandard`、`backroomsOpenLevel` 同类问题一并收敛。
- **Passkey 验证对不上后端**：地址不再靠 `backend.txt` 探测乱切，`passkey/setup → enable`、`login/passkey/start → finish` 固定落在同一个后端实例上，避免票据（Redis 里的一次性 challenge / ticket）因为换后端而失效。
- **去掉散落的硬编码后端地址**：`assets/guide_agent_watcher.js`、`user/register.html`、`backrooms/review.html`、`backrooms/submit.html` 各自写死的 ngrok 地址删除，改为调用 `ZIYIT_API.base()`（cookie 优先），取不到时直接读 cookie。
### 说明
- 只改前端；后端 `main.py` 未改动。
- `backend.txt` 文件本身保留，但已无任何代码读取它。

## v1.27 — 2026-10-01
### 修复
- **`user/index.html` 两步登录第二步的可读性**：验证码输入框的 `label` 随所选因子切换（邮箱验证码 / 2FA 动态码 / 一次性恢复码），不再是笼统的「验证码」，避免用户分不清该填邮箱验证码还是登录密码；「使用其他方式登录」分支的验证码标签同步处理。
- **失败提示中文化**：`/auth/login/factor` 与 `/auth/login/email/start` 失败时不再直接显示后端英文 `detail`（`Verification code is invalid or expired` 等），改按「状态码 + 因子」映射为可执行的中文提示（验证码失效 → 引导重新获取；429 → 限流提示；票据失效 → 引导重新登录）。
- **验证码格式前置校验**：邮箱验证码 / 2FA 动态码在提交前必须是 6 位数字，不符合就直接提示，不再把「密码」当成验证码发给后端。
- **发送验证码提示**：写明「有效期内重复点发送不会发新邮件，直接用收到的那封邮件里的码」，并补齐 429 限流提示与倒计时结束后按钮文案复位。
### 说明
- 本次只动前端 `user/index.html`；后端配合项（邮箱验证码失效后重新生成新码时必须立刻发信并重置 60 秒冷却）另行同步。

## v1.26 — 2026-08-09
### 修复
- **`.hidden` 基础类缺失**：`assets/ziyit-theme.css` 补齐 `.hidden { display:none !important; }`（此前仅有 `.visible` 的 block 修正），使导航权限脚本"隐藏无权限菜单项"的逻辑真正生效。
### 更新
- **全站旧界面（2024 年老布局）统一重构为 DESIGN.md 规范**（豁免目录 `backrooms/`、`design/`、`wsh/`、`tas/`、`ikun/`、`move/` 除外）：
  - `user/` 目录全部 7 页（登录/注册/修改密码/用户信息/修改用户名/VIP 升级/更新公告）重写：head 主题防闪烁脚本 + `ziyit-theme.css` + token 化样式（`.form-container` 卡片、表单控件、提示色）+ 规范 `.site-nav` 导航 + 权限过滤脚本；保留全部功能 JS（Phantom 人机验证、CryptoJS MD5 登录、公告 Markdown 解析、VIP 邮件生成、注销流程等）。
  - 下载中心（`download/index.html`、`download/errordiv`）、`developers/`、`Translator`/`translate`、`人机验证使用方式.html` 统一规范导航 + 权限过滤 + token 化；补齐 `ziyit_api.js` 引用（权限脚本依赖）。
  - `school/ky.html`：CSS 硬编码浅色（body/container/标题/表格/错误提示）全部 token 化，补充 school 风格导航。
- **`download/RC.html` 深色模式适配**（2026 年新版产品页，按用户要求不重构 UI）：`<style>` 内 200+ 处硬编码浅色（`#f5f7fc/#ffffff/#e2e8f0/#f9fafb/#334155/#475569/#64748b` 等）token 化为 `--ziyit-*` 变量；内联样式（MOD 上传表单、功能权限表、note-stable、登录/离线提示条）同步适配，提示条改半透明 tint 双模式通用；hero 标题渐变在深色下换浅色渐变；JS 动态生成的 MOD 类型徽标与描述色适配深色；红底"最新版本/未发布"徽标保持两模式可读。
- 导航权限过滤沉淀为两种模式（DESIGN.md §4.6.5）：**需登录页**（未登录全部隐藏，登录后 all 可见 + 管理员 `Minecraft_zy227` 额外 admin/adminstr + VIP 额外 admin）与**公开页**（未登录保留 all、隐藏 admin 项）。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.25 — 2026-08-09
### 更新
- **全站"加载中"文本替换为加载界面（DESIGN.md §4.12）**：
  - `assets/ziyit-theme.css` 新增共享加载界面样式：`.ziyit-loading` 容器、`.ziyit-loading-btn` 按钮中加载（主色按钮+白转圈）、`.ziyit-loader` 品牌滑动进度条（标题+滑动条，Cloudflare 风格 `loaderSlide` 动画）、`.spinner-inline` 行内转圈（浅色/深色背景通用）。
  - `music/admin.html`/`admin.js`：API Key / MOD / RC 密钥 / 用户列表 / IP 封禁列表加载时统一显示"按钮加载 + 进度条"界面（`loadingHTML()` 复用共享类）；`loadUsers()`、`loadIpBans()` 请求前注入加载界面；`admin.css` 删除此前重复定义的加载样式块（改由共享 ziyit-theme.css 提供）。
  - `ModWiki/index.html`：物品/配方列表加载区与计数 span 的"加载中…"替换为加载界面/行内转圈。
  - `user/profile.html`（用户名行 + 登录记录区）、`user/username.html`（当前信息区）、`user/VIP.html`（用户ID/用户名/当前类型行）、`user/gg.html`、`school/ky.html`（更新内容加载区，"点点点"文本动画函数改为空实现，由加载界面自带动画替代）。
  - `download/RC.html`：更新日志、开发者文档的静态与 JS 注入"正在加载…"替换为加载界面。
  - `music/index.js`：音频缓冲进度提示文字由"加载音乐中/加载中…"改为"音频缓冲中/缓冲中…"（进度条界面保留真实百分比）。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.24 — 2026-08-09
### 更新
- **管理系统完全适配深色模式**（`music/admin.css` + `admin.html` + `admin.js`）：
  - `admin.css` 新增「深色模式适配」块：`[data-theme="dark"]` 切换本文件自定义变量（标题/正文/次要文字/浅色块/边框 → 深色体系）；深色下背景由亮紫渐变改为纯色深底 `#16181d`；白底玻璃拟态卡片（`.admin-header/.sidebar/.content-section/.music-player-admin/.lyrics-admin/.music-list-admin/.system-info/.coin-verifier`）→ `--ziyit-bg-card`；列表项/统计卡/信息项/歌词区/LRC 面板等浅色块 → `--ziyit-bg-hover`；模态框、可编辑文本域、滚动条同步深色化。
  - 兜底冲突修正：恢复 `.modal` 全屏遮罩（避免被 ziyit-theme.css 兜底压成卡片底色）与 `.stat-card` 渐变蓝卡设计。
  - `admin.js` 动态生成内容的内联硬编码色全部 token 化：`#64748b → var(--ziyit-text-secondary)`、`#a4262c/#b91c1c → var(--ziyit-danger)`、表头 `#f1f5f9 → var(--ziyit-bg-hover)`、分隔线 `#eef2f7 → var(--ziyit-border-light)`。
  - `admin.html` 内联 `#475569 → var(--ziyit-text-secondary)`、确认删除按钮 `#a4262c → var(--ziyit-danger)`。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.23 — 2026-08-09
### 修复
- **导航栏随明暗主题切换**：`.site-nav` 由"恒定深色条（`#23272e`）"改为 token 自适应——浅色模式 `--ziyit-bg-card` 白底 + `--ziyit-border` 底边框 + `--ziyit-text-primary` 深色文字；深色模式自动变深底 + 浅色文字。一级/二级链接、分隔竖线、下拉面板、汉堡按钮、移动端折叠菜单全部 token 化（hover 主色文字 + `--ziyit-bg-hover` 底）；深色兜底块中 `.site-nav a` 特殊链接色同步改为 `--ziyit-text-primary`。
- 同步更新 `design/DESIGN.md §4.6.5`（颜色方案改为"随明暗主题切换"，禁止硬编码深色底）与 `design/ui-test.html`（导航演示 token 化）。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.22 — 2026-08-09
### 修复
- **浅色模式深色大块**：`ztg.html` 移除 `body` 的 backrooms.jpg 背景图（改纯色 token 背景）、页脚 `rgba(0,0,0,0.5)` token 化为 `--ziyit-bg-card`，并删除底部后室黄色覆盖块中冲突的 footer/.box 规则；`user.html` 用户信息区黑字 token 化为 `--ziyit-text-primary`（深色模式可读）。
- **导航栏跨页面统一**：`search.html`、`user.html`、`ztg.html`、`school/index.html` 的旧式 `.box/.pod` 蓝色/紫色横条导航全部替换为与主页一致的 `.site-nav` 规范结构（`.site-nav-inner` + `.site-nav-toggle` 汉堡 + `.site-nav-menu`），保留各页 `data-role` 权限过滤与 `id="navMenu"` 绑定；删除各页 `.box/.pod` 残留样式与移动端 `ul.pod` 列布局规则。
- **h1 背景随主题切换**：`ztg.html` 删除 h1 内联 `rgba(195,234,249,0.29)` 覆盖（改由样式块 token 生效）；`school/index.html` h1 补充 `var(--ziyit-primary-light)` 背景 + `var(--ziyit-text-primary)` 文字。
- **导航下拉按钮垂直分行**：根因是页面全局 `ul li { display: inline-block; line-height: 35px }` 与登录态 `.visible { display: inline-block !important }` 把二级下拉的 `li` 变为横排堆叠。修复：`assets/ziyit-theme.css` 新增 `.site-nav-menu > li, .site-nav-menu ul li { display: block; line-height: 1.6 }` 及 `.site-nav-menu > li.visible, .site-nav-menu ul li.visible { display: block !important }`，确保每个按钮独占一行。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.21 — 2026-08-09
### 更新
- `assets/ziyit-theme.css` 新增「深色模式全面适配」兜底层：
  - 40+ 常见内容容器类（含 `#form-container`、`.form-container`、`.admin-header`、`.stat-card`、`.info-card` 等）深色下强制 `--ziyit-bg-card` 背景与 `--ziyit-border` 边框（`!important` 压过内联硬编码）；
  - 表格、正文标题/段落/单元格文字深色兜底为 `--ziyit-text-primary`；链接统一浅蓝 `#8ab4f8`（导航链接除外）；次要文字兜底 `--ziyit-text-secondary`；
  - 管理系统（`music/admin`）标题/用户信息卡深色适配。
- 导航栏 `.site-nav-menu > li` 间距 `2px → 6px`，缓解菜单项视觉堆叠。
- 内联硬编码色 token 化：`user/profile.html`（info-card/info-row/info-value/section h2/label 全部 token 化）、`search.html`（推荐网站 5 张卡片白底与 `#555` 次要文字）、`download/index.html`（搜索标题 `#1b222e`）、`user/gg.html`（`.error` 红底提示）、`user/VIP.html`（VIP 信息区底色与边框）；另经子代理批量替换 6 文件 55 处内联色（`#64748b/#e2e8f0/#f8fafc/#f1f5f9` 等 → token）。
### 说明
- 按用户要求本轮不进行浏览器测试。

## v1.20 — 2026-08-09
### 修复
- `ui-test.html` 导航下拉菜单 hover 缝隙：二级面板 `margin-top: 6px` 与一级项之间存在 6px 空隙，鼠标移入即中断 hover 导致菜单瞬间消失。修复：`.site-nav-menu ul::before` 伪元素向上桥接 6px（移动端禁用），鼠标可平滑移入下拉并正常点击。
### 更新
- `DESIGN.md §4.6.5`：交互状态补充"下拉缝隙必须伪元素桥接"的实现规范。

## v1.19 — 2026-08-09
### 更新
- `DESIGN.md §4.6 导航`：新增 **4.6.5 页面级深色导航（站点头部）**——恒定深色底 `#23272e` 52px 条 + 多级下拉 + 分隔竖线，≤768px 折叠为 ≡ 汉堡菜单；颜色与页面 token 解耦，明暗主题下不变。
- `ui-test.html`：升级至 v1.8——页面顶部（Hero 之上）新增 `.site-nav` 深色导航栏，参照 `index.html` 的 `.top-bar` 结构（功能区 / 开发者 / 图书馆 / 用户中心），含 hover 二级下拉与移动端汉堡折叠。

## v1.18 — 2026-08-09
### 更新
- `DESIGN.md §4.14 主题切换`：偏好存储由 `localStorage` 改为 **cookie**（key：`ziyit-theme`，有效期 1 年，`path=/`）；实现规范同步说明 cookie 读写需 `encodeURIComponent/decodeURIComponent` 与正则解析。
- `ui-test.html`：升级至 v1.7——head 初始化脚本与 `setTheme` 均改为 cookie 读写（新增 `getCookie`/`setCookie` 工具），区块描述同步更新。

## v1.17 — 2026-08-09
### 修复
- `ui-test.html` 开关宽度持续为 0 的根因：`.track` 为 `<span>`（默认 `inline`），且 `.form-group label { display: block; }`（特异性更高）把 `.switch` 的 `inline-flex` 覆盖为 `block`，使轨道退化为 inline 元素导致 `width: 52px` 失效、宽度塌陷为 0（高度由 line-height 撑起故看似正常）。修复：`.track` 显式 `display: inline-block`；`.form-group label` 改为 `.form-group label:not([class])`，避免覆盖 `.switch`/`.check`/`.radio` 的组件 display。
### 更新
- `DESIGN.md §4.4 开关`：新增"实现陷阱"规范——轨道必须 `display: inline-block` + `width/min-width`；页面级 `label` 统一样式需用 `:not([class])` 限定，防止误伤组件。
- `ui-test.html`：升级至 v1.6——按上述修复应用。

## v1.16 — 2026-08-09
### 修复
- `ui-test.html` 开关轨道宽度异常（不足 1px）：`.track` 显式设置 `width: 52px` + `min-width: 52px`（小号 40px 同理），配合 `flex-shrink: 0` 防止 flex 布局中轨道被收缩；高度保持 24px 不变。
### 更新
- `DESIGN.md §4.4 开关`：状态配色修正——**关**：内部透明（`transparent`）+ 边框蓝（`--ziyit-primary`）；**开**：内部蓝 + 边框白（`--ziyit-text-inverse`）；**禁用**：内部灰 + 边框保持蓝；圆点随底色自适应（透明芯主色、蓝芯白色）；补充 `--ziyit-text-inverse` token 说明与宽度防收缩规范。
- `ui-test.html`：升级至 v1.5——`--ziyit-text-inverse` 加入 :root；开关按修正后状态配色实现。

## v1.15 — 2026-08-09
### 更新
- `DESIGN.md §4.4 开关`：最终定稿——胶囊形框架 **52×24px**（短边半圆弧，圆角 12px），边框 2px 恒为 `--ziyit-primary`；**开**：内部蓝 / **关**：内部白 / **禁用**：内部灰（`--ziyit-border`）且边框保持蓝；白色圆点滑块 250ms `cubic-bezier(.4,0,.2,1)` 精准滑动；外部中文文本固定指示**功能用途**（非状态提示），控件内部不含文字；小号 40×18px。
- `ui-test.html`：升级至 v1.4——开关按定稿形态重构；标签改为固定功能用途文本（自动更新 / 接收通知 / 夜间模式），移除动态状态文本与"已禁用"字样；禁用态演示灰芯蓝框。

## v1.14 — 2026-08-09
### 更新
- `DESIGN.md §4.4 开关`：视觉改版为"内外反色"形态——圆角长方形框架 44×24px，**开启**：外围白（`--ziyit-bg-card`）/ 内部蓝（`--ziyit-primary`）/ 白点居右；**关闭**：外围蓝 / 内部白 / 圆点居左；圆点颜色随底色自适应（白底主色、蓝底白色）保证对比度；状态文本（启用/禁用）随状态实时更新；位移动效 250ms `cubic-bezier(.4,0,.2,1)`，hover/focus-visible 光环。
- `ui-test.html`：升级至 v1.3——开关按上述形态重构；`switch-label` 增加 `data-on`/`data-off` 文本并随切换同步更新；小号规格同步调整。

## v1.13 — 2026-08-09
### 更新
- `DESIGN.md §2.4 深色模式`：由"规划预留"改为正式实现——通过 `html[data-theme="dark"]` 仅交换中性色 token 与功能性浅底，品牌主色保持不变；新增深色覆盖块规范与硬编码浅色修正清单。
- `DESIGN.md §4.4 开关`：重构为完整交互控件——开启/关闭视觉区分（轨道主色/禁用灰 + 滑块位移动效）、hover 描边、键盘 `focus-visible` 光环、disabled / checked+disabled 双态、可访问性（输入框视觉隐藏但保留焦点，禁止 `display:none`）；新增小号规格与完整 CSS 示例。
- `DESIGN.md §4.14 主题切换`：新增组件规范——浅色 / 深色 / 跟随系统三档，`localStorage`（`ziyit-theme`）持久化，`prefers-color-scheme` 实时监听，`data-theme`（生效）/ `data-theme-pref`（偏好）双属性机制，初始化脚本置于 `<head>` 防闪烁。
- `ui-test.html`：升级至 v1.2——开关增强（hover/focus/disabled/键盘可操作）+ 功能联动示例（开关控制输入框禁用）；新增"4.14 主题切换"演示区块与 `theme-opt` 分段按钮；`data-theme` 深色覆盖块同步修正 topbar/modal/表格斑马纹/禁用输入框/code 等硬编码浅色；页头内联主题初始化脚本防 FOUC。

## v1.12 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器`：滑块宽度随速度联动拉伸——基准宽 35%，速度:拉伸 = 7.5%:2.5%（3:1），行程中由 35% 拉伸至最多 53.3%（`scaleX` 1→1.524，与位移共享同一缓动同步变化），停留段速度归零缩回 35%。
- `ui-test.html`：`loaderSlide` 关键帧新增 `scaleX` 拉伸；基准宽改回 35%。

## v1.11 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器`：蓝色滑块变短（45%→**40%**，120px），轨道保持 300px。
- `ui-test.html` 同步更新 `.loader-fill` 宽度。

## v1.10 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器`：加载条轨道加长（200px→**300px**），滑块随轨道自适应为 135px。
- `ui-test.html` 同步更新 `.loader-bar` 宽度。

## v1.9 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器`：滑块加长（35%→**45%**）；动画提速（2.4s→**2s**）；每次行程滑出轨道完全消失后**停留 0.1s** 再折返（关键帧 45→50% 与 95→100% 为静止段），让用户感知"跑过去后花点时间才回来"。
- `ui-test.html` 同步更新 `loader-fill` 宽度、动画时长与 `loaderSlide` 关键帧。

## v1.8 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器` 动画改为**滑出消失后折返**的往返：去程从左外滑入、滑过轨道、滑出右端完全消失；回程从右外反向滑回、滑出左端完全消失；左右交替、循环无缝（0% 与 100% 位置相同）；每次行程速度仍为最快速度的 45%→100% 加速（`cubic-bezier(0.33,0.45,0.67,0)`）。
- `ui-test.html` 同步更新 `loaderSlide` 关键帧。

## v1.7 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器` 动画改为**往返变速**：滑块在轨道内去程（左→右）与回程（右→左）交替运作，每次行程速度从最快速度的 **45%** 加速至 **100%**（`cubic-bezier(0.33,0.45,0.67,0)`：起点斜率 1.35=45%、终点斜率 3=100%）；行程时间对半分配（各 50%）。
- `ui-test.html` 同步更新 `loaderSlide` 关键帧。

## v1.6 — 2026-08-09
### 修复
- `DESIGN.md §4.12 加载指示器` 减速段（0→25%）卡顿：原位移 -100%→-55% 使滑块 85% 时间在轨道外、可见位移小，视觉似卡住；调整为 **-60%→40%**（起点滑块已部分可见、减速段全程在轨道内滑行），减速段起点速度由 3× 线性降至 **2× 线性**（`cubic-bezier(0.33,0.667,0.67,0.667)`，末端仍为起点 50%），甩出段 `cubic-bezier(0.33,0.45,0.67,0.15)` 保持段间速度连续；25%/75% 时间分配与"减速至最快速度 50%"不变。
- `ui-test.html` 同步更新 `loaderSlide` 关键帧。

## v1.5 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器` 动画简化为**两段**：减速（0→25% 时间，从最快速度减至其 50%，`cubic-bezier(0.33,1,0.67,0.5)`，末端斜率=起点 1/2，不归零）→ 加速甩出（25→100% 时间，`cubic-bezier(0.33,0.2,0.67,0.15)`）；段间速度连续、中间不停顿。
- `ui-test.html` 同步更新 `loaderSlide` 关键帧。

## v1.4 — 2026-08-09
### 修复
- `DESIGN.md §4.12 加载指示器` 动画卡顿：移除外层统一 `cubic-bezier`（原实现每段起点速度归零，段边界产生停顿感）；改为缓动写在**关键帧内**——起步加速（0→35%，`ease-in`）→ 中段减速（35→65%，`ease-out`，最慢）→ 末段甩出（65→100%，`ease-in`），段间速度连续、中间不停顿。
- `ui-test.html` 同步更新 `loaderSlide` 关键帧。

## v1.3 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器` 增强：标题前加品牌图标 `assets/logo.ico`（22×22px）；滑块动画改为**变速运动**（2.4s `cubic-bezier(0.45,0,0.55,1)` 分段关键帧：起步加速 → 中段减速 → 末段甩出，非匀速），由 `left` 定位改为 `transform: translateX`（性能更优）。
- `ui-test.html` "4.12 加载指示器" 同步：新增 `.loader-logo` 图标与变速 `loaderSlide` 关键帧。

## v1.2 — 2026-08-09
### 更新
- `DESIGN.md §4.12 加载指示器` 改版：新增 **主加载指示器**（"ZIYIT" 品牌标题 20px/700/字距 6px + 200×4px 浅蓝轨道 + 主色渐变滑块左右滑动，借鉴 Cloudflare 风格，2s 循环）；明确两种加载状态（按钮加载态见 §4.1，保持不变；页面/区块级使用主加载指示器 + 骨架屏）。
- `ui-test.html` "4.12 加载指示器" 区块同步更新为 `.ziyit-loader` 新结构。

## v1.1 — 2026-08-03
### 更新
- `DESIGN.md` 组件章节重构为"详细控件规范"：每个组件统一按**布局结构 / 尺寸参数 / 颜色方案 / 交互状态 / 功能描述 / 使用场景**六要素定义。
- 组件从 8 个扩展至 13 个：新增 下拉选择、复选框/单选框/开关、分页、加载指示器、空状态；导航细分为顶部/侧边栏/移动端折叠/下拉四类。
- 补充全部组件的尺寸表格、状态机与代码示例。
### 新增
- `ui-test.html`：按 DESIGN.md v1.1 实现的 UI 控件测试页（色彩/排版/按钮/表单/卡片/导航/模态框/表格/标签/分页/加载/空态/Toast/图标/阴影全量预览）。

## v1.0 — 2026-08-03
### 新增
- 首次建立 ZIYIT STUDIO 网页 UI 设计体系。
- `AGENTS.md`：设计原则与价值观、团队协作规范、评审流程与清单、决策框架与冲突解决、资源与版本控制、AI 协作说明。
- `DESIGN.md`：色彩系统（品牌主色 `#0078d4` / 强调色 `#66e656` + 功能色 + 中性色）、排版层级、组件样式（按钮/表单/卡片/导航/模态框/表格/提示/标签）、图标规范、布局与间距刻度、阴影层级、交互与微交互指南、响应式断点（768/1024/1025）、Do's & Don'ts。
- 全局硬性约束：页面背景禁止使用图像文件（统一纯色或品牌渐变）；`backrooms/` 目录豁免。
- 参考依据：Google Stitch DESIGN.md 规范、Material Design、Apple HIG、Microsoft Fluent、VoltAgent/awesome-design-md 设计案例。
