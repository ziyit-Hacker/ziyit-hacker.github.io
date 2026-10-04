# CHANGELOG — ZIYIT STUDIO 设计体系变更记录

> 记录 `AGENTS.md` 与 `DESIGN.md` 的每一次变更，保证设计迭代可追溯。
> 版本规则：小改动 +0.1（如 v1.0 → v1.1）；体系级重构 +1（如 v1.x → v2.0）。

## v1.31 — 2026-10-04
### 修复
- **用户管理界面不显示头像**：`music/admin.js` 的 `renderUserList()` 原先把头像渲染成**用户名首字母文字**（`div.user-avatar-small`），改为真正的 `<img>`，数据取用户资料里的 `avatarUrl`，用 `ZIYIT_API.applyImage()` 加载（自带 blob 处理）并绑定 `error` 事件兜底默认头像 `../assets/ziyit.png`；用户详情弹窗（`openEditModal`）顶部同步新增头像预览（`#edit-avatar`），加载失败同样回退默认头像。`admin.css` 的 `.user-avatar-small` 补 `overflow:hidden; object-fit:cover`，保证任意比例图片裁成圆形。
- **管理员列表无头像 / 无法区分当前登录管理员**：`renderAdmins()` 为每位管理员加上头像节点；当前登录管理员（`currentAdminInfo.userId`）所在行加 `.self-admin` 高亮（绿色描边 + 浅绿底）并在用户名后显示「当前登录」角标（`.user-badge-self`）。因后端 `_admin_view()` 不返回 `avatarUrl`，前端用 `adminAvatarOf()` 先从已加载的全量用户列表取，未知者由 `hydrateAdminAvatars()` 逐个调 `GET /users/{id}` 补拉并缓存（一次性、完成后自动重渲染）；顶栏「当前登录管理员」也改为真实头像（`loadHeaderAvatar()`）。
- **点击「在线客服」标签被弹回用户管理**：根因是 `checkUserPermission()` 的异步回调（`adminMe()` 返回后）**无条件** `switchSection(firstVisible)`，会覆盖用户已点击的目标分段或 URL `#guide-console` 直达。现引入 `adminSectionLocked` 标记：侧栏任意 `[data-section]` 点击（捕获阶段）、`#guide-console` hash 直达、`guide_resolve` 直达都会上锁，异步校验随即改为「有 hash 目标优先用 hash，否则才兜底首个可见菜单」。同时删除 `[data-section="user-management"]` 的**重复事件绑定**（原 L35 与 L3490 各绑一次，后者缺 `menu-item.active` 切换），保留一处并补上 `loadIpBans()`。
### 新增
- **管理员邮箱验证强制门**：`checkUserPermission()` 通过后另查 `GET /auth/me`（`/admin/me` 不返回 `emailVerified`），未验证时弹出全屏遮罩 `#email-verify-gate` 拦截全部管理功能，展示当前邮箱与未验证状态，提供「发送验证邮件」（`POST /email/send-verify`，60s 重发节流）、「刷新状态」（重新校验，通过即解锁）与「前往验证 / 绑定邮箱」（跳 `user/profile.html`）三个动作；未绑定邮箱时隐藏发送按钮并提示先绑定。网络异常（非 401）时不误伤、不拦截。
### 说明
- 只改前端与文档（`music/admin.html`、`music/admin.js`、`music/admin.css`、本文件）；**后端一行未改**。
- **后端字段缺口（前端已兜底，若要更省事建议后端补齐，由用户自行决定）**：
  1. `_admin_view()`（`GET /admin/admins`）不返回 `avatarUrl` → 前端改按 `GET /users/{id}` 逐个补拉（N+1，管理员数量小可接受）。若后端在 `_admin_view()` 里补 `avatarUrl`（复用 `public_user_data` 的 `with_base_url(f"/img/{avatar_id}")` 口径），前端可省掉这轮请求。
  2. `GET /admin/me` 不返回 `emailVerified` / `email` → 前端另调 `GET /auth/me` 判断。若后端在 `/admin/me` 补上 `emailVerified`，前端可少一次请求。
  3. 邮箱验证**当前仅为前端强制**（后端 `require_email_verified()` 已定义但全站未被任何路由引用）→ 若需服务端硬拦截，可在管理员相关路由的依赖里挂上 `require_email_verified`。

## v1.30 — 2026-10-01
### 新增
- **澄镜防注入检测前端落地**（对接后端《网站功能与结构说明》15.5「对外接口」）：
  - 新建产品 / 体验单页 [injection.html](file:///f:/Code/html/ziyit/injection.html)：Hero + 功能特点（三层防护 / 98%+ 准确率 / 混合判定 / fail-open 不误扣）+ **动态定价**（读 `GET /injection/pricing`，不硬编码）+ 体验区 + 代码示例 + 页内 API 文档。
  - 体验区：`api-key` 用 password 型输入框（带显示 / 隐藏切换，**只进 sessionStorage**，不写 `localStorage['phantom_api_key']` 以免污染全站人机验证通道）；textarea 实时字数 + 10000 上限前置拦截（对应 413）；回车直接检测、Shift + 回车换行；结果区给出 `injection` 0/1 大徽章、`modelProb` + `threshold`、命中关键词标签、Token 明细、`cost` 拆解、`charged` + `balance`、`degraded` 降级提示。
  - 错误映射按 `401 / 400 / 403(reason) / 413 / 503` 分档中文提示（余额不足带 `points` / `minRequired`）。
  - 新建 [user/injection.html](file:///f:/Code/html/ziyit/user/injection.html)：登录用户查看**自己名下密钥**的防注入用量（调用 / 注入 / 降级 / Token / 点数 + 关键词 TopN + 分版本 + 分密钥，支持 `start` / `end` / `limit`）。
  - 后台管理 `music/admin` 新增「防注入检测」区块（Lv.3+）：模型版本、定价配置（可只改一项）、用量报表（`start` / `end` / `user_id` 过滤）。
  - [assets/ziyit_api.js](file:///f:/Code/html/ziyit/assets/ziyit_api.js) 新增 `injectionDetect / injectionModels / injectionPricing / injectionUsage / adminInjectionReport / adminInjectionPricing / adminInjectionSavePricing`；检测走 `api-key` 头且**不带** Authorization（计费归属由密钥决定）。
- **接入地址统一用本站域名**：产品页 curl / JavaScript / Python 三份示例直接写 `https://ziyitstudio.ccwu.cc/injection/detect`，不再留 `<后端域名>` 占位符要接入方自己填；新增《网站功能与结构说明》15.5.8「接入地址」记录该口径。
- **用量数据可视化与报表改造**（本轮）：
  - [user/injection.html](file:///f:/Code/html/ziyit/user/injection.html) 由「用量明细表」升级为**「我的用量」可视化页**：三维分段控件 —— 时间区间（7 / 30 / 90 天，默认 30）、统计维度（**账户整体** / **单个 API KEY**）、图表类型（**条形** / **折线**）；条形图为**堆叠柱**（防注入 + 人机验证两段堆叠展示），折线图为**两条异色折线**分别展示两类数据；全部**手写 SVG**（纯静态站、无第三方库）。防注入序列取 `GET /injection/usage` 聚合，人机验证序列用 `pointsLedger`（`reason="points_consume"`）按天聚合。账户维度两类均有按天序列；单密钥维度人机验证无按密钥流水（后端点水条目 `points.apply()` 不带 apiKey），改展示 `points_used` / `daily_points_used` 两个数字卡并标注口径。**数据缺口显式降级、绝不伪造**：`byDay` 缺失时提示"后端暂未提供按天数据（byDay）"并从图剔除该序列。
  - [music/admin.html](file:///f:/Code/html/ziyit/music/admin.html) / [music/admin.js](file:///f:/Code/html/ziyit/music/admin.js)：模型版本从只读标签改为**下拉列表 + 当前使用版本标记 + 「切换」按钮**（Lv.3+，`PUT /admin/injection/model`）：切换中按钮置灰显示「切换中…」并提示「切换过程约需 20 秒，期间 fail-open 不误扣点数」，成功后回刷 `GET /injection/models` 刷新列表；被环境变量锁定（`locked`）时下拉禁用并提示。
  - 管理端报表新增**「分调用来源」分组表**（`api` 对外 API / `cs` 在线客服内部），并在筛选区新增**「调用来源」筛选**（透传 `source` 参数）。
  - **在线客服后台** `#guide-console` 新增**「本站注入检测消耗」**卡片（今天 / 7 天 / 30 天）：检测次数 / 判为注入 / 总 Token / 消耗点数 + 关键词，读本站来源（`source="cs"`）。
  - 管理端定价表单补**「保存后即刻生效」**提示（新价从下一次检测起计费）。
  - [assets/ziyit_api.js](file:///f:/Code/html/ziyit/assets/ziyit_api.js) 新增 `adminInjectionModel / adminInjectionSetModel / guideInjectionUsage`，`adminInjectionReport` 支持 `source` 参数。
### 修复
- **不再把防注入的点数写成"另一套"**：防注入扣的就是与人机验证**共用的同一份 ZIYIT 点数**（后端 `points_consume`、`reason="injection_detect"`，同一余额、同一条流水）。据此统一措辞：`injection.html` 定价区与结果区（「实际扣除点数」「点数余额（与人机验证共用）」）、`user/injection.html` 说明与「消耗点数」、后台「定价配置」注明只是计费单价。`user/points.html` 的流水原因映射补上 `injection_detect → 防注入检测消耗`（原先会直接把原始英文 reason 显示出来），点数说明也写明全站共用一份余额与流水；共用的价目卡 `pricingHtml()` 一并列出防注入单价（`user/points.html`、`user/api-key.html` 都用它渲染），不再让防注入看起来是另一套计费。
- **防注入消耗未计入可视化图表**（本轮修复）：`user/injection.html` 原先防注入的按天序列只取 `/injection/usage` 的 `byDay`，而后端尚未返回该字段，导致图中只剩人机验证一条、**防注入消耗整段缺失**。现改为**两类消耗都从同一份点数流水按天聚合**——防注入 `reason=injection_detect`（含客服内部 `injection_detect_cs`）、人机验证 `reason=points_consume`，防注入逐日序列不再依赖后端 `byDay`（`byDay` 若存在仍优先采用，缺失时回落流水）。流水整体加载失败时才降级提示，堆叠柱 / 双折线两条序列随之恢复。
- **图表字段名不匹配，导致账号整体「防注入」恒为 0**（本轮修复）：后端 `byDay` 每行的字段名是 **`date`**（见 `injection_api.py` 的 `_BYDAY_ZERO`），前端却读 `r.day` → 键名错位、`injMap` 恒空，表现为「账号整体条形图只剩人机验证一段、折线图防注入恒为 0」。改为读 `r.date`（兼容旧假设的 `day`）。
- **单密钥维度扩成两类**（本轮）：原「单个 API KEY」只画防注入，现改为**区间合计双序列** —— 条形图为单根**堆叠柱**（防注入 + 人机验证两段），折线图为**两条水平虚线**分别表示两类合计；人为序列仅在该密钥有点数流水时绘制（缺数据时只画防注入并明确标注）。
- **堆叠条形图两段错位（不贴合）**（本轮修复）：`svgBar` 与单密钥的 `keyRangeChart` 堆叠时把「已堆叠高度」按**点数**累加（`acc += v`），而柱高按**像素**算（`plotH * v / max`）——两者单位不一致，导致同一天同时有防注入与人机验证时，上面那段落到错误位置（与下面那段重叠 / 游离），看起来「两段没连上」。改为按**像素**累加（`acc += h`），两段严丝合缝地自下而上堆叠（注入在下、人机验证在上，与图例一致）。
### 说明
- 只改前端与文档（`injection.html`、`user/injection.html`、`user/points.html`、`music/admin.html`、`music/admin.js`、`assets/ziyit_api.js`、`网站功能与结构说明.md` 15.5.8、本文件）；**后端一行未改**。
- **入口铺开**：全站 25 个带「功能区」导航的页面统一插入「防注入检测」（紧跟「人机验证」之后，相对路径按页面层级取 `./` 或 `../`）；另有 7 个页面本就带「我的点数」项，同步插入「我的用量」。本轮导航文案统一：全站 8 处「我的防注入用量」→「我的用量」（`injection.html`、`user/dlc.html`、`user/pentest.html`、`user/points.html`、`user/rc-key.html`、`user/rc-serial.html`、`user/security.html`、`user/VIP.html`）。`assets/site-index.js` 由 `build_site_index.py` 重跑生成（1061 页），两个新页面已进入站内搜索。
- 未铺开的页面：18 个本身就没有这套全局导航（`Human_verification.html`、`search.html`、`music/admin.html`、`ikun/`、`ModWiki/`、`move/`、`tas/`、`wsh/`、`download/RC.html` 等独立子站/单页），保留原样；`wsh/user.html`、`wsh/user/password.html` 非 UTF-8 编码，未做写入以免改坏编码。
- 体验页定位为「用户填自己的密钥」。**未做**免填 key 的体验端点：后端无此能力，且人机验证侧 `_authorize_experience` 亦要求登录并扣自己账号点数，并非匿名免费。
- **前端全部就绪；下列三处需后端补齐才能完整生效**（可视化页依赖的 `byDay` 后端已上线、字段名为 `date`，前端已采用；`start` / `end` / `source` 也在）；前端已按"缺口显式降级、绝不伪造"处理，缺数据时给出明确提示：
  1. 新增 **Lv.1+ 只读 `GET /guide/injection/usage`**（在线客服内部 `source="cs"` 的聚合）——客服后台卡片已调用，404 时提示"后端 /guide/injection/usage 尚未上线"。
  2. `GET /admin/injection/report` 增加 **`source` 过滤参数**（当前 `bySource` 仅分组，未按来源过滤）——前端已带筛选并在返回仍含多来源时明确提示，避免误判筛选失效。
  3. **点数流水条目补 `apiKeyMasked`**（调用链：`human/main.py:_points_charge` → `main.py:points_charge(api_key=…)` → `points.py:charge()` → `apply()`）：`apply()` 目前只写 `id/userId/delta/reason/balanceAfter/at`，**不记密钥**，故 `points_consume` 流水无法按密钥拆分，「单个 API KEY」维度的人机验证画不出来。改法：`apply()` 加一个 `api_key_masked` 入参并写入条目（脱敏沿用 `guide/injection_api.py:mask_key`，与 `byKey.keyMasked` 同口径），`charge()` 透传，`points_charge()` 用 `api_key` 算好传入。前端已预留读取 `e.apiKeyMasked`（`humanByKey`），补上即自动显示，无需再改前端。

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
