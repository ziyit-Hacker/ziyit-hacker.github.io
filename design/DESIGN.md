# DESIGN.md — ZIYIT STUDIO 视觉与交互设计标准

> 配套文档：[AGENTS.md](./AGENTS.md)（协作规范）。
> 本文档是全站 UI 的**唯一视觉依据**，所有页面（除 `backrooms/` 外）必须遵守。
> 版本：v1.20　|　最近更新：2026-08-09　|　变更记录见 [CHANGELOG.md](./CHANGELOG.md)

---

## 1. 设计主题与氛围

**一句话**：科技感、轻量、清晰、可信赖的创作者工作室风格。

- **基调**：以大面积留白与中性色为底，主色科技蓝建立可信赖感，强调色活力绿点睛"创造"属性。
- **密度**：内容页中等偏宽松；管理后台紧凑（信息密度高，允许缩小间距至刻度 3）。
- **质感**：扁平 + 轻度阴影（Elevation 1-2），圆角适中（6-8px），避免过度拟物。
- **动效**：克制的过渡（150-300ms），仅用于反馈与状态切换，不做炫技动画。

参考的设计语言：Google Material Design（层次、组件化）、Apple HIG（简洁、留白）、Microsoft Fluent（圆角、轻阴影）。

## 2. 色彩系统

### 2.1 色板 Token（CSS 变量）

```css
:root {
  /* 品牌主色：科技蓝 */
  --ziyit-primary:        #0078d4;   /* 主按钮、主链接、激活态、品牌蓝 */
  --ziyit-primary-dark:   #005a9e;   /* 主按钮 hover/按压 */
  --ziyit-primary-light:  #e8f3fb;   /* 主色浅底（选中背景、标签底） */

  /* 品牌强调色：活力绿 */
  --ziyit-accent:         #66e656;   /* 品牌识别、重要提示、VIP 标识 */
  --ziyit-accent-dark:    #28a745;   /* 成功态（绿底白字场景） */

  /* 功能色 */
  --ziyit-info:           #12b7f5;   /* 信息提示 */
  --ziyit-warning:        #f3a707;   /* 警告 */
  --ziyit-danger:         #f25767;   /* 错误、删除、危险操作 */
  --ziyit-success:        #28a745;   /* 成功 */

  /* 中性色 */
  --ziyit-text-primary:   #333333;   /* 主文字 */
  --ziyit-text-secondary: #666666;   /* 次要文字 */
  --ziyit-text-disabled:  #999999;   /* 禁用文字 */
  --ziyit-text-inverse:   #ffffff;   /* 深底上的文字 */
  --ziyit-border:         #dddddd;   /* 默认边框 */
  --ziyit-border-light:   #eeeeee;   /* 分割线、卡片描边 */
  --ziyit-bg:             #f5f5f5;   /* 页面背景 */
  --ziyit-bg-card:        #ffffff;   /* 卡片背景 */
  --ziyit-bg-hover:       #f0f7fc;   /* 列表/卡片 hover 底 */
}
```

### 2.2 使用规范

| 用途 | 颜色 | 说明 |
|---|---|---|
| 主导航激活、主按钮、关键链接 | `--ziyit-primary` | 全站唯一主色 |
| 品牌口号、VIP、强调亮点 | `--ziyit-accent` | 用量 ≤ 10%，点睛不抢戏 |
| 成功 / 错误 / 警告 / 信息 | 功能色 | 仅用于对应语义，不混用 |
| 页面背景 / 卡片 / 文字 | 中性色 | 大面积使用，保证对比度 |

**规则**：
- 一屏内主色与强调色**不同时大面积出现**；强调色只用于最核心的 1 处。
- 纯装饰不用功能色；功能色必须表达真实状态。
- 文本主色禁用纯黑 `#000`（用 `#333`），避免刺眼。
- 链接色统一 `--ziyit-primary`，hover 加深为 `--ziyit-primary-dark`。

### 2.3 渐变规范（背景统一方案）

背景**禁止图片**，允许以下两种渐变（页面级大背景或卡片点缀）：

```css
/* 标准品牌渐变：深蓝渐变（用于页头、Hero、Banner） */
background: linear-gradient(135deg, #0078d4, #005a9e);

/* 轻量渐变（用于卡片点缀，白底之上） */
background: linear-gradient(135deg, #ffffff, #f0f7fc);
```

- 渐变仅使用品牌蓝系；强调绿**不用于大面积渐变**（只做细节点缀）。
- 内容区默认纯色 `--ziyit-bg`，渐变保留给横幅与分区头。

### 2.4 深色模式

通过 `html[data-theme="dark"]` 仅交换中性色 token 与功能性浅底，**品牌主色（`--ziyit-primary` / `--ziyit-accent`）保持不变**：

```css
[data-theme="dark"] {
  --ziyit-bg: #16181d;
  --ziyit-bg-card: #1f2229;
  --ziyit-bg-hover: #262a33;
  --ziyit-text-primary: #e6e6e6;
  --ziyit-text-secondary: #a8adb8;
  --ziyit-text-disabled: #6b7078;
  --ziyit-border: #3a3f48;
  --ziyit-border-light: #2c3038;
  --ziyit-primary-light: rgba(0, 120, 212, .18);
}
```

- 深色模式需同步修正组件中硬编码的浅色（`code` 底、表格斑马纹、禁用输入框底、骨架屏、空态图标灰、危险标签浅底等），统一放在 `[data-theme="dark"]` 覆盖块内。
- 主题切换机制见 §4.14；实现时深色覆盖块必须与浅色 token 定义分离，避免互相污染。

## 3. 排版规范

### 3.1 字体栈

```css
font-family: "Segoe UI", "Microsoft YaHei", "PingFang SC", "Helvetica Neue", Arial, sans-serif;
```

- 中文优先微软雅黑，英文/数字用 Segoe UI。
- 禁用衬线体（正文）；代码/数据场景可用等宽 `Consolas, "Courier New", monospace`。

### 3.2 字号层级

| 层级 | 字号 | 行高 | 字重 | 应用场景 |
|---|---|---|---|---|
| Display（页面大标题） | 36px | 1.3 | 700 | 首页 Hero 标题、落地页主标题 |
| H1（页级标题） | 28px | 1.4 | 700 | 各功能页主标题（如"下载中心"） |
| H2（区块标题） | 22px | 1.4 | 600 | 内容区块标题 |
| H3（卡片标题） | 18px | 1.5 | 600 | 卡片内标题 |
| 正文 | 15-16px | 1.6 | 400 | 默认正文 |
| 辅助文字 | 13px | 1.5 | 400 | 说明、时间戳、元信息 |
| 小字/徽标 | 12px | 1.4 | 400 | 版权、角标 |

```css
h1 { font-size: 28px; line-height: 1.4; font-weight: 700; }
h2 { font-size: 22px; line-height: 1.4; font-weight: 600; }
h3 { font-size: 18px; line-height: 1.5; font-weight: 600; }
body { font-size: 15px; line-height: 1.6; color: var(--ziyit-text-primary); }
```

### 3.3 规则
- 一页只使用 Display 一次；标题层级不允许跳级（h1→h3）。
- 长文本控制在每行 60-90 字符，行高 ≥ 1.6。
- 重要数值/状态可用 `--ziyit-primary` 或 `--ziyit-accent` 强调，但一屏不超过 2 处。

## 4. 组件样式规范（详细）

> 每个组件统一按 **布局结构 / 尺寸参数 / 颜色方案 / 交互状态 / 功能描述 / 使用场景** 六要素定义，开发时严格照此实现。

### 4.1 按钮（Button）

**布局结构**
```
┌──────────────────────────────┐
│  [图标(可选)] 按钮文字        │  ← 单行水平居中，图标在文字前 8px
└──────────────────────────────┘
```
图标仅限有明确语义时使用；多个主操作时"主要操作"置左/首。

**尺寸参数**
| 规格 | 高度 | 水平内边距 | 字号 | 圆角 | 用途 |
|---|---|---|---|---|---|
| 大号 | 44px | 24px 32px | 16px | 8px | 页面主 CTA、Hero |
| 默认 | 36px | 20px | 15px | 6px | 常规操作（默认） |
| 小号 | 28px | 12px 16px | 13px | 6px | 行内/紧凑场景 |
| 触控(移动端) | ≥ 44px | — | — | — | 全部可点按钮 |

**颜色方案**
| 类型 | 底色 | 文字 | 描边 | 说明 |
|---|---|---|---|---|
| `.btn-primary` | `--ziyit-primary` | 白 | 无 | 页面主操作，每屏最多 1 个 |
| `.btn-secondary` | 白 | `--ziyit-primary` | `--ziyit-primary` 1px | 次要操作 |
| `.btn-text` | 透明 | `--ziyit-primary` | 无 | 行内弱操作、链接化 |
| `.btn-danger` | `--ziyit-danger` | 白 | 无 | 删除、封禁、注销等危险操作 |
| `.btn-success` | `--ziyit-success` | 白 | 无 | 明确成功语义的确认 |
| 禁用 | `#cccccc` | `#999999` | 无 | 任何类型 + `:disabled` |

**交互状态**：default → hover（底色加深：primary→`--ziyit-primary-dark`，其余→加深 10%）→ active（`scale(0.98)` + 底色再加深）→ focus（`box-shadow: 0 0 0 3px var(--ziyit-primary-light)`）→ disabled（灰底灰字 + `cursor: not-allowed`）。加载中显示转圈/省略号并 `disabled`，防止重复提交。

**功能描述**：触发一个明确的操作（提交、跳转、删除、下载等）；按钮文字必须为动词或动词短语，直述结果。

**使用场景**：表单提交（primary）、页面辅助操作（secondary）、列表内编辑/详情（text）、删除与封禁（danger）、确认购买/授权（success）。

```css
.btn-primary { background: var(--ziyit-primary); color: #fff; border: none; border-radius: 6px; padding: 8px 20px; font-size: 15px; cursor: pointer; transition: background .2s, transform .1s; }
.btn-primary:hover { background: var(--ziyit-primary-dark); }
.btn-primary:active { transform: scale(.98); }
.btn-primary:disabled { background: #ccc; color: #999; cursor: not-allowed; }
```

### 4.2 表单输入框（Input）

**布局结构**
```
┌ label（13px 次要文字，与输入框间距 8px）────┐
│ ┌──────────────────────────────────────┐ │
│ │  占位提示文字                    (图标) │ │
│ └──────────────────────────────────────┘ │
└ 错误/帮助文案（13px，红/灰色，间距 6px）──┘
```

**尺寸参数**：高度 36px（移动端 44px）；水平内边距 12px；字号 15px；圆角 6px；边框 1px；`label` 与输入框间距 8px；错误文案与输入框间距 6px；输入框组垂直间距 16px。

**颜色方案**：边框 `--ziyit-border`；focus 边框 `--ziyit-primary` + 外圈 3px `--ziyit-primary-light`；错误边框 `--ziyit-danger` + 错误文案 `--ziyit-danger`；成功边框 `--ziyit-success`；禁用底 `#f5f5f5` 文字 `--ziyit-text-disabled`。

**交互状态**：default → focus（蓝框 + 光晕）→ error（红框 + 红文案）→ success（绿框 + 可选绿勾）→ disabled（灰底不可输入）→ readonly（可读不可改）。输入时实时校验（失焦触发为主，不打断输入）。

**功能描述**：接收用户单行文本输入；配合 `label` 明确含义；支持 `type=password` 明文切换。

**使用场景**：用户名、密码、邮箱、搜索框、IP/链接录入等单行文本场景。

```css
.input { width: 100%; padding: 8px 12px; border: 1px solid var(--ziyit-border); border-radius: 6px; font-size: 15px; outline: none; transition: border-color .2s, box-shadow .2s; }
.input:focus { border-color: var(--ziyit-primary); box-shadow: 0 0 0 3px var(--ziyit-primary-light); }
.input.error { border-color: var(--ziyit-danger); }
```

### 4.3 下拉选择（Select）

**布局结构**
```
┌─────────────────────────┬─┐
│  当前选中项文字           │▾│  ← 右侧原生箭头
└─────────────────────────┴─┘
```
**尺寸参数**：与输入框一致（高 36px、字号 15px、圆角 6px）；下拉列表最小宽度 180px，最大 320px；选项高度 32px。
**颜色方案**：控件同输入框；选项 hover 底 `--ziyit-primary-light`；选中项文字 `--ziyit-primary`。
**交互状态**：default → focus → disabled；原生下拉（移动端必须用原生控件保证可用性）。
**功能描述**：从预设选项中选择一项；选项 ≤ 7 项时可直接平铺。
**使用场景**：语言选择、角色/类型筛选、表单枚举字段。

### 4.4 复选框 / 单选框 / 开关（Checkbox / Radio / Switch）

- **复选框**：16×16px，圆角 4px，选中底 `--ziyit-primary` 白勾，未选白底灰边；用于多选。
- **单选框**：16×16px 圆形，选中中心 8px 主色圆点；用于互斥单选。
- **开关**：胶囊形框架（**52×24px**，圆角 12px=高度一半，短边呈半圆弧），边框 2px；内部填充与边框色随状态组合——**关**：内部透明（`transparent`）+ 边框蓝（`--ziyit-primary`）；**开**：内部蓝（`--ziyit-primary`）+ 边框白（`--ziyit-text-inverse`）；**禁用**：内部灰（`--ziyit-border`）+ 边框保持蓝。白色圆点滑块居左/居右标识状态（圆点颜色随底色自适应保证对比：透明芯主色、蓝芯白色）。小号 40×18px（圆点 12px）；用于即时启停。
- **实现陷阱（必须遵守）**：`.track` 为 `<span>`，默认 `inline` 时 `width/height` 不生效会塌陷为 0——必须显式 `display: inline-block` 并设置 `width + min-width`；同时页面级 `label` 统一样式（如 `.form-group label`）会以更高特异性覆盖组件的 `display: inline-flex`，组件选择器需以 `:not([class])` 等限定，避免误伤 `.switch`/`.check`/`.radio`。
- 文本（中文）必须位于**框架外部右侧**，指示**功能用途**（如"自动更新""接收通知"），而非状态提示；**控件内部不含任何文字**。触控区域整行 ≥ 44px。
- **交互状态**：
  - default → hover（`box-shadow: 0 0 0 2px var(--ziyit-primary-light)` 光环）
  - active（点击/切换：内部填充与边框色组合互换 + 圆点位移动效 250ms，`cubic-bezier(.4,0,.2,1)` 精准滑动到对应位置）
  - focus-visible（键盘 Tab 聚焦：`box-shadow: 0 0 0 3px var(--ziyit-primary-light)` 光环）
  - disabled（内部填充灰 `--ziyit-border`、**边框保持蓝**、圆点白、文字 `--ziyit-text-disabled`、`cursor: not-allowed`）
- **可访问性**：输入框必须视觉隐藏但**保留焦点能力**（禁止 `display:none`，用 `position:absolute + clip` 裁剪），否则键盘 Tab 无法聚焦；原生 checkbox 自带空格键切换，无需额外键盘事件。
- 点击整行 label 均可切换；状态切换须有可感知反馈（颜色 + 位移动效双通道）。

```css
.switch { position: relative; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; min-height: 44px; font-size: 15px; user-select: none; }
.switch input { position: absolute; width: 1px; height: 1px; opacity: 0; clip: rect(0 0 0 0); }
.switch .track { display: inline-block; width: 52px; min-width: 52px; height: 24px; border-radius: 12px; background: transparent; border: 2px solid var(--ziyit-primary); position: relative; flex-shrink: 0; transition: background .25s, border-color .25s; }
.switch .track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--ziyit-primary); transition: left .25s cubic-bezier(.4, 0, .2, 1), background .25s; }
.switch input:checked + .track { background: var(--ziyit-primary); border-color: var(--ziyit-text-inverse); }
.switch input:checked + .track::after { left: 30px; background: var(--ziyit-text-inverse); }
.switch input:focus-visible + .track { box-shadow: 0 0 0 3px var(--ziyit-primary-light); }
.switch input:disabled + .track { background: var(--ziyit-border); cursor: not-allowed; }
.switch input:disabled + .track::after { background: var(--ziyit-bg-card); }
```

### 4.5 卡片（Card）

**布局结构**
```
┌────────────────────────────┐
│ 标题（H3，18px/600）        │  ← 顶部
│ 内容区（正文 15px）         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  ← 可选分割线
│ 操作区（右对齐按钮组）       │  ← 底部
└────────────────────────────┘
```
**尺寸参数**：内边距 20px（紧凑场景 16px）；圆角 8px；内容间距 12-16px；卡片间栅格间隙 16px。
**颜色方案**：白底、`--ziyit-border-light` 1px 描边；hover 阴影 Elevation 2（见 §7）。
**交互状态**：静止（Elevation 1）→ hover（可点击卡片：`translateY(-2px)` + Elevation 2）；不可点卡片 hover 仅阴影变化。
**功能描述**：将相关内容分组呈现；可承载标题+内容+操作。
**使用场景**：产品/功能介绍、MOD 列表项、用户信息、统计面板。

```css
.card { background: var(--ziyit-bg-card); border: 1px solid var(--ziyit-border-light); border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); transition: box-shadow .2s, transform .2s; }
.card.clickable:hover { box-shadow: 0 4px 12px rgba(0,0,0,.12); transform: translateY(-2px); }
```

### 4.6 导航（Navigation）

**4.6.1 顶部导航（桌面）**
- **布局结构**：整行高 56px；左 Logo（32px 图 + 品牌名 18px/700），中部链接区（15px），右用户区；当前页链接加主色底纹。
- **颜色方案**：白底 + 底部 1px `--ziyit-border-light`；链接默认 `--ziyit-text-primary`，hover 主色，激活主色 + 下划线/浅底。
- **交互状态**：链接 hover 变主色；当前页高亮；登录态右侧显示用户名（点击进用户中心）。

**4.6.2 侧边栏（管理后台）**
- **布局结构**：宽度 220px；菜单项高度 40px，圆角 6px，内边距 12px 16px；图标 20px + 文字 14px。
- **颜色方案**：底 `--ziyit-bg`；菜单项 hover 底 `--ziyit-bg-hover`；激活项 `--ziyit-primary` 底白字。
- **交互状态**：hover 浅底；激活高亮；分组标题 12px 次要文字。

**4.6.3 移动端折叠导航**
- **布局结构**：顶部一行 ≡ 按钮（44×44px 触控区，文字 24px）；展开后菜单项独立一行竖排，子菜单缩进。
- **交互状态**：点击一次 ≡ 展开、再点一次折叠；**默认折叠、不自动折叠**（点菜单外不收起）；子项点击折叠子菜单。
- **颜色方案**：白底菜单 + 分割线；当前项主色文字。

**4.6.4 下拉菜单**
- **布局结构**：白底圆角 8px，Elevation 2，最小宽 180px；项高 36px，内边距 10px 16px；分隔线 1px。
- **交互**：hover 展开；项 hover 底 `--ziyit-bg-hover`；点击项后收起。

**4.6.5 页面级导航（站点头部）**
- **适用场景**：整站统一头部（参照 `index.html` 的 `.site-nav` 结构），位于 Hero/Banner 之上。
- **布局结构**：导航条高 52px；多级菜单（一级 + hover 二级下拉 + 分隔竖线）；≤768px 折叠为 ≡ 汉堡菜单，展开后竖排缩进。
- **颜色方案**：**随明暗主题切换**——浅色模式 `--ziyit-bg-card` 底 + `--ziyit-border` 底边框 + `--ziyit-text-primary` 文字；深色模式 token 自动变深底 + 浅色文字；hover 主色文字 + `--ziyit-bg-hover` 底；二级面板 `--ziyit-bg-card` + `--ziyit-border` 边框 + Elevation 2。**禁止硬编码深色底（如 `#23272e`）**，必须使用 token 以保证明暗切换。
- **交互状态**：一级项 hover 展开二级；**下拉面板与一级项之间的 6px 空隙必须以 `ul::before`（或等宽 padding 区）桥接，否则鼠标移入时 hover 中断、菜单消失**；移动端点击 ≡ 展开/折叠；触控目标 ≥ 44px。

### 4.7 模态框（Modal）

**布局结构**
```
┌───────────────────────────────┐
│ 标题（22px/600）          [×] │  ← 右上关闭
│ 内容区（15px 正文，滚动）       │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│        [取消]     [确认]       │  ← 底部右对齐
└───────────────────────────────┘
```
**尺寸参数**：宽 90%/最大 480px（危险确认可 420px）；内边距 24px；遮罩 `rgba(0,0,0,.5)`；面板 Elevation 3；圆角 8px。
**颜色方案**：面板白底；标题主文字；取消按钮 secondary、确认按钮 primary/danger（依语义）。
**交互状态**：打开：遮罩淡入 200ms + 面板上移淡入；关闭：Esc / 点遮罩 / 取消 / ×；关闭需重置表单。
**功能描述**：承载需要用户决策或聚焦的临时任务（确认、编辑、查看详情）。
**使用场景**：删除确认、编辑表单、DLC 授予、IP 封禁、用户详情。

```css
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; border-radius: 8px; width: 90%; max-width: 480px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,.2); }
```

### 4.8 表格与列表（Table / List）

**布局结构**
```
┌ 表头行（整行 40px，13px 次要文字）───────────┐
│ 单元格1 | 单元格2 | 单元格3      (操作列右对齐) │
├──────────────────────────────────────────┤
│ 数据行（整行 44px，14px 主文字）  [编辑][删除] │
│ ...（斑马纹可选）                           │
└ 空态/分页区 ──────────────────────────────┘
```
**尺寸参数**：表头高 40px，数据行高 44px（紧凑 36px）；单元格水平内边距 12px；表格圆角 8px（容器）。
**颜色方案**：表头底 `--ziyit-bg`，表头文字 `--ziyit-text-secondary`；行 hover 底 `--ziyit-bg-hover`；斑马纹偶数行 `#fafafa`；分割线 `--ziyit-border-light`。
**交互状态**：行 hover 高亮；可点行可整行点击；操作按钮行内 hover 反馈；排序表头 hover 显示排序图标。
**功能描述**：结构化展示多列数据，支持搜索、排序、分页、行操作。
**使用场景**：用户管理、MOD 列表、封禁列表、API Key 列表、服务器状态。
**移动端**：禁止横向滚动——转卡片式列表或隐藏次要列（`display:none`）。

### 4.9 Toast 提示（Toast）

**布局结构**
```
┌────────────────────────────┐
│ [状态图标] 提示文字    [×]  │  ← 顶部居中浮层
└────────────────────────────┘
```
**尺寸参数**：高自动，内边距 10px 20px；圆角 6px；距顶 20px；最长显示 4s；最大宽度 360px。
**颜色方案**：深底 `rgba(51,51,51,.92)` 白字；成功/错误/警告加对应功能色左边条 4px 或前置图标。
**交互状态**：淡入 200ms；自动消失（成功 2s、错误 4s）；可点 × 关闭；同屏最多叠 3 条。
**功能描述**：轻量、非阻断的操作结果反馈；替代 `alert()`/`confirm()`。
**使用场景**：操作成功、保存失败、网络错误、权限不足等一次性反馈。

```css
.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(51,51,51,.92); color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 14px; z-index: 9999; animation: fadeSlideIn .2s ease; }
```

### 4.10 标签与徽章（Tag / Badge）

**布局结构**
```
┌─────────┐  ┌─────┐
│ VIP     │  │ 12 │  ← 徽章数字
└─────────┘  └─────┘
```
**尺寸参数**：标签高 22px，内边距 2px 8px，圆角 4px，13px；徽章直径 ≥ 16px，圆角 50%，12px 白字。
**颜色方案**（浅底深字）：VIP 用 `--ziyit-accent` 底或描边；封禁/违规 `--ziyit-danger` 浅底（`#fdecee`）红字；普通/默认 `--ziyit-bg` 底 `--ziyit-text-secondary` 字；徽章数字 `--ziyit-primary` 底白字。
**交互状态**：可关闭标签 hover 显示 ×；纯展示标签无交互。
**功能描述**：标记短状态或计数（VIP、封禁、数量角标）。
**使用场景**：用户角色标识、DLC/MOD 类型、消息计数、状态分类。

### 4.11 分页（Pagination）

**布局结构**：`« 1 2 3 4 5 … 20 »`，居中或右对齐；每页按钮 32×32px，圆角 6px，间距 4px。
**颜色方案**：默认透明、主文字；hover `--ziyit-bg-hover`；当前页 `--ziyit-primary` 底白字；禁用箭头 `--ziyit-text-disabled`。
**交互**：点击切换页码；上一页/下一页在边界禁用；异步加载时按钮短暂禁用。
**功能描述**：大数据列表分批浏览；每页 10/20/50 可切换（管理类）。
**使用场景**：用户列表、MOD 列表、日志列表等长列表。

### 4.12 加载指示器（Loading）

加载状态分两种：**按钮加载态**（组件内联，见 §4.1）与**页面/区块加载指示器**。

**布局结构**（主加载指示器，Cloudflare 风格滑动加载条）
```
┌──────────────────────────┐
│ [logo]     ZIYIT         │  ← 图标 22×22 + 品牌标题 20px/700/字距 6px/主色
│  └────────────────────┐  │  ← 轨道 300×4px 浅蓝底(--ziyit-primary-light)
│  │ ███████→           │  │  ← 滑块 35% 宽(运行时拉伸至 53%) 主色渐变
│  └────────────────────┘  │  ← 循环 2s：左→右滑出→停0.1s→右→左滑出→停0.1s
└──────────────────────────┘
```
**尺寸参数**：图标 `assets/logo.ico` 22×22px（`object-fit: contain`）；标题 20px、字重 700、字距 6px、下边距 12px；轨道 **300×4px**、圆角 2px；滑块基准宽 **35%**（105px）、圆角 2px，运行时随速度拉伸至最多 **53.3%**（160px）。
**颜色方案**：标题 `--ziyit-primary`；轨道 `--ziyit-primary-light`；滑块 `linear-gradient(90deg, var(--ziyit-primary), var(--ziyit-primary-dark))`。
**交互状态**：滑块 `loaderSlide` 动画（**2s** 无限循环）在轨道内**往返滑动，每次行程滑出轨道完全消失后停留 0.1s 再折返**：去程（0→45% 时间）从左外滑入、滑过轨道、滑出右端完全消失，停留 0.1s（45→50%）；回程（50→95% 时间）从右外反向滑回、滑出左端完全消失，停留 0.1s（95→100%）；左右交替循环；每次行程速度从最快速度的 **45%** 加速至 **100%**（`cubic-bezier(0.33,0.45,0.67,0)`：起点斜率 1.35=45%、终点斜率 3=100%）；**宽度随速度联动拉伸**：速度:拉伸 = 7.5%:2.5%（3:1），速度越快滑块被拉得越长——基准宽 35%，行程中由 35% 拉伸至最多 53.3%（`scaleX` 1→1.524，与位移共享同一缓动同步变化），停留段速度归零缩回 35%；`prefers-reduced-motion` 时降级为静态轨道+标题。
**功能描述**：页面级/区块级整体加载反馈，强化品牌识别，替代纯转圈。
**使用场景**：整页加载、列表首次加载、模态框内数据加载。

- **类型**：① 主加载指示器（如上，logo + ZIYIT 标题 + 变速滑动加载条）；② 骨架屏（卡片/行高亮占位，`#ececec` 脉动至 45% 透明度）；③ 按钮加载态（见 §4.1，转圈/省略号 + disabled，防重复提交）。
- **规则**：请求 < 300ms 不显示；加载完成立即移除；失败显示错误态 + 重试。

```css
.ziyit-loader { text-align: center; }
.ziyit-loader .loader-title { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 20px; font-weight: 700; letter-spacing: 6px; color: var(--ziyit-primary); margin-bottom: 12px; }
.ziyit-loader .loader-logo { width: 22px; height: 22px; object-fit: contain; }
.ziyit-loader .loader-bar { width: 300px; height: 4px; border-radius: 2px; background: var(--ziyit-primary-light); overflow: hidden; position: relative; margin: 0 auto; }
.ziyit-loader .loader-fill { position: absolute; top: 0; left: 0; width: 35%; height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--ziyit-primary), var(--ziyit-primary-dark)); animation: loaderSlide 2s infinite; }
@keyframes loaderSlide { 0% { transform: translateX(-100%) scaleX(1); animation-timing-function: cubic-bezier(0.33, 0.45, 0.67, 0); } 45% { transform: translateX(260%) scaleX(1.524); } 50% { transform: translateX(260%) scaleX(1); animation-timing-function: cubic-bezier(0.33, 0.45, 0.67, 0); } 95% { transform: translateX(-100%) scaleX(1.524); } 100% { transform: translateX(-100%) scaleX(1); } }
```

### 4.13 空状态（Empty State）

**布局结构**：居中；48px 图标（灰）+ 标题（16px/600 主文字）+ 说明（13px 次要文字）+ 1 个主操作按钮。
**颜色方案**：图标与文字全部中性灰；操作按钮 `--ziyit-primary`。
**功能描述**：无数据、无结果、无权限时的引导状态，必须提供下一步动作。
**使用场景**：搜索无结果、列表为空、未登录访问受保护页、筛选无匹配。

### 4.14 主题切换（Theme Switcher）

**布局结构**
```
┌──────────────────────────────┐
│ [☀] 浅色  [☾] 深色  [🖥] 跟随系统 │  ← 分段按钮组（radiogroup），三选一
└──────────────────────────────┘
```
选项内边距 0 14px、高 36px、圆角 6px、间距 4px、容器内边距 4px；图标 16px + 文字 14px。

**颜色方案**：容器底 `--ziyit-bg` + `--ziyit-border-light` 1px 描边；选项默认 `--ziyit-text-secondary`，hover `--ziyit-bg-hover` 底 + 主文字，选中 `--ziyit-primary` 底白字。

**交互状态**：default → hover → active（选中态高亮）→ focus-visible（主色光环）。选中项以 `aria-checked="true"` + `.active` 双重标记。

**功能描述**：提供浅色 / 深色 / 跟随系统三种主题偏好；偏好写入 **cookie**（key：`ziyit-theme`，有效期 1 年，`path=/`，刷新后保持）；"跟随系统"模式下监听 `prefers-color-scheme` 的 `change` 事件，系统切换时页面自动跟随（其余偏好不受影响）。

**实现规范**：
- `<html>` 上维护两个属性：`data-theme`（实际生效配色 `light`/`dark`，驱动全部 CSS）与 `data-theme-pref`（用户偏好 `light`/`dark`/`auto`，驱动控件高亮）。
- 主题初始化脚本必须置于 `<head>`（DOM 渲染前），避免切换主题时页面闪烁（FOUC）。
- 解析规则：`pref === 'auto'` 时读取 `matchMedia('(prefers-color-scheme: dark)')` 决定实际配色。
- 深色 CSS 统一收敛于 `[data-theme="dark"]` 选择器（见 §2.4），禁止在组件样式内散落深色判断。
- 老浏览器不支持 `prefers-color-scheme` 时，"跟随系统"自动回退浅色，不影响其余功能。

**使用场景**：全站顶栏/设置页，用户可自定义明暗偏好。

## 5. 图标系统

- **风格**：线性（outline）、描边 1.5-2px、圆角端点、主色默认、中性色次级。
- **尺寸**：16px（行内/辅助）、24px（按钮/列表）、32px（区块标题）、48px（页面空态/大图标）。
- **来源**：优先使用与现状一致的图标库（如 icons8 / Material Symbols），风格统一后不可混搭；同一页面不得出现两种风格图标。
- 图标必须配 `title` 或 `aria-label`；纯装饰图标 `aria-hidden="true"`。

## 6. 布局与间距

- **间距刻度**：以 4px 为基准（4/8/12/16/20/24/32/40），禁止任意数值。
- **内容宽度**：内容区最大 `1200px`，左右留白 20px（移动端 16px）；表单容器最大 `600px`。
- **栅格**：简单 flex/grid 即可，不做复杂 12 栅格；卡片列表 `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`。
- **页面结构**：页头（H1 + 可选描述）→ 内容区 → 底部版权条（`--ziyit-text-secondary` 12px 居中）。

## 7. 深度与层级（阴影）

| 层级 | 阴影 | 用途 |
|---|---|---|
| Elevation 1 | `0 1px 3px rgba(0,0,0,.08)` | 卡片默认 |
| Elevation 2 | `0 4px 12px rgba(0,0,0,.12)` | 下拉菜单、悬浮卡片、hover |
| Elevation 3 | `0 8px 24px rgba(0,0,0,.2)` | 模态框 |

阴影仅用中性黑低透明度，禁止彩色阴影。

## 8. 交互设计指南

### 8.1 通用反馈机制
- **悬停**：可交互元素必变（变深/抬升/描边），非交互元素不变。
- **点击**：按压态（`scale(0.98)` 或背景加深），反馈 ≤ 100ms。
- **加载**：数据请求中显示骨架屏或居中转圈；按钮内"…"；耗时操作禁止让页面无响应。
- **成功**：Toast 提示 + 数据即时更新（刷新列表/清空表单）。
- **失败**：Toast 红色提示，保留用户已输入内容，不丢数据。
- **空数据**：空态插图/图标 + 说明 + 恢复操作。

### 8.2 微交互规范
- 过渡时长：颜色 150-200ms、位移动效 200-300ms、淡入 200ms；统一 `ease`。
- 统一写法：`transition: all .2s ease` 分属性写，不整块 `all`（性能）。
- 仅新元素出现/状态切换可动效，滚动与被动场景禁动效。
- 尊重 `prefers-reduced-motion`：用户关闭动效时全部过渡归零。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
}
```

### 8.3 状态变化
- 每个组件至少定义：`default / hover / active / disabled`；输入类另加 `focus / error / success`。
- 状态变化必须有可感知差异（颜色 + 形状/阴影双通道，不单靠颜色区分，照顾色弱用户）。

## 9. 响应式设计

### 9.1 断点标准
| 断点 | 设备 | 布局策略 |
|---|---|---|
| ≤ 768px | 移动端 | 单列、隐藏非核心、折叠导航、触控目标 ≥ 44px |
| 769-1024px | 平板 | 双列网格、保留侧栏（可折叠）、字号不变 |
| ≥ 1025px | 桌面 | 完整布局、卡片多列、内容宽度 1200px |

```css
/* 移动优先：默认单列，>=769 升级 */
@media (min-width: 769px) { /* 双列 */ }
@media (min-width: 1025px) { /* 桌面 */ }
```

### 9.2 适配原则
- **导航**：桌面顶部横排；移动端改为 ≡ 折叠菜单（点击一次展开、再点一次折叠、默认折叠、不自动折叠）。
- **表格**：移动端禁止横向溢出——改为卡片式列表，或仅保留核心列（用 `display:none` 隐藏次要列）。
- **表单**：移动端控件全宽、输入框堆叠；`datetime`/`select` 使用原生控件。
- **图片**：`max-width: 100%; height: auto;`；背景图禁用（见 §10）。
- **触控**：按钮/链接最小 44×44px，间距 ≥ 8px，避免误触。

### 9.3 内容优先级
移动端自上而下：主内容 → 次要内容 → 页脚；折叠式收纳（如"更多功能"）优于平铺全部。

## 10. 禁止事项（Do's & Don'ts）

| 禁止（Don't） | 应做（Do） |
|---|---|
| 使用图片作页面背景 | 纯色 `--ziyit-bg` 或品牌渐变（§2.3） |
| 自定义新色值/字号/间距 | 一律取自 token 与刻度 |
| 用 `alert()`/`confirm()` 做提示 | 用统一 Toast/模态框组件 |
| 表格横向溢出 | 移动端转卡片式/隐藏次要列 |
| 元素 hover 无反馈 | 可交互元素必须有反馈 |
| 危险操作无确认 | 删除/封禁等必须二次确认 |
| 多风格图标混用 | 全站统一图标风格与尺寸 |
| 修改 `backrooms/` 目录任何页面 | 保持其独立风格 |
| 引入背景图片资源 | 渐变或纯色 |

## 11. 参考链接

- Google Stitch DESIGN.md 规范：<https://stitch.withgoogle.com/docs/design-md/overview/>
- Material Design：<https://m3.material.io/>
- Apple Human Interface Guidelines：<https://developer.apple.com/design/human-interface-guidelines/>
- Microsoft Fluent：<https://fluent2.microsoft.design/>
- 设计案例库（各大科技公司 DESIGN.md 实例）：<https://github.com/VoltAgent/awesome-design-md>

---

*版本：v1.20　|　最近更新：2026-08-09　|　变更记录见 [CHANGELOG.md](./CHANGELOG.md)*
