# Effective SPEC — v0.1.0

| 范围 | 冻结的产品事实 | 待澄清/边界 | 验收入口 |
|---|---|---|---|
| Release `v0.1.0` | 类似 wolai 的 macOS 桌面块级编辑器，纯本地纯净 Markdown 存储 | 无云同步、无协同、无数据库视图 | [验收索引](#验收索引) |
| 核心能力 | Tauri 2.0 桌面端、Folder-Notes 页面树、标题联动、Tiptap 10种块、两态拖拽、防抖落盘、热监听 | 仅支持标准 Markdown 语法表达的块属性 | AC-001 ~ AC-022 |
| 异常与边界 | 外部文件并发修改冲突提示、非法文件名拦截、图片写入失败提示 | 纯离线运行，网络断开不影响任何功能 | ERR-001 ~ ERR-006 |

## Control

- Release: `v0.1.0`
- Requirement Version: `1.0`
- Requirement Baseline: [docs/vibe/releases/v0.1.0/PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- Status: `SPECIFIED`

---

## Product Behaviors

### REQ-001 — 桌面端应用生命周期与工作区引导

- Source: `PROJECT_BRIEF.md` Core Scenario 1
- Actors: 终端用户
- Preconditions: macOS 系统环境（支持 macOS 11+）
- Trigger: 用户双击启动客户端
- Expected Behavior:
  1. 应用检查本地配置是否存在上次打开的工作区路径。
  2. 若已存在有效路径，自动载入并展示工作区界面。
  3. 若首次启动或路径无效，展示轻量引导页面，允许用户通过系统原生文件夹选择弹窗指定本地目录（默认推荐路径：`~/Documents/DocEditorWorkspace`）。
  4. 若选定的工作区为空目录，应用自动在根目录创建《👋 欢迎与快速上手 (Welcome.md)》，内置 10 种块类型展示与排版操作指引。
- Resulting State: 工作区成功加载，左侧展示页面树，右侧打开选定页面或欢迎页面。
- Explicit Non-goals: 不提供多用户登录，不提供在线云端工作区。

#### Acceptance Criteria
- AC-001: 首次启动能调起原生目录选择器，指定本地目录后进入主界面。
- AC-002: 空工作区自动生成 `Welcome.md`，内容包含标题、文本、待办、Callout、代码块等示例。
- AC-003: 重启应用后能自动记住并重载上次的工作区路径。

#### Error Scenarios
- ERR-001: 选定目录无写权限时，提示“该文件夹无写入权限，请重新选择”。

#### Boundary Conditions
- BND-001: 工作区路径中包含中文、空格或特殊合法字符时能正常读写。

---

### REQ-002 — Folder-Notes 页面树管理与页面标题双向联动

- Source: `PROJECT_BRIEF.md` Core Scenario 2, 3
- Actors: 终端用户
- Preconditions: 工作区已成功载入
- Trigger: 用户在左侧树操作页面或在主编辑区修改标题
- Expected Behavior:
  1. **Folder-Notes 映射模型**：
     - 单个文档存储为 `<PageName>.md`。
     - 若该页面挂载子页面，底层自动创建 `<PageName>/` 文件夹，子页面保存在 `<PageName>/<SubPageName>.md`。
     - 左侧树将 `<PageName>.md` 和 `<PageName>/` 合并渲染为单一节点：点击节点标题打开该页面正文，点击左侧展开箭头展开/折叠其子页面列表。
  2. **新建操作**：
     - 侧边栏顶部提供“新建根页面”按钮。
     - 悬浮在已有页面节点上时，显示“添加子页面”图标（➕），点击在对应同名目录下新建 `<Untitled>.md`。
  3. **标题双向联动**：
     - 主编辑区顶部提供页面无边框大标题输入框。
     - 用户修改页面标题后按回车或失焦（防抖 500ms），系统将底层对应的 `.md` 文件及同名子目录重命名，侧边栏实时响应。
  4. **删除操作**：
     - 点击页面上下文菜单“删除”，弹出确认提示（若有子页面一并提示）；确认后将对应文件及子目录移入系统废纸篓或本地删除。
- Resulting State: 磁盘文件树与内存页面树完全一致。
- Explicit Non-goals: 第一版不做多选批量移动，不做复杂的标签过滤视图。

#### Acceptance Criteria
- AC-004: 能在根目录和子页面层级分别新建页面，并在磁盘正确创建 `.md` 与对应文件夹。
- AC-005: 修改编辑区顶部大标题，底层磁盘文件名与侧边栏节点名称同步变化。
- AC-006: 包含子页面的父页面重命名时，其对应的子页面文件夹同步更名，子页面路径引用不损坏。
- AC-007: 删除包含子页面的父页面时，弹出二次确认并彻底清理对应文件与子目录。

#### Error Scenarios
- ERR-002: 输入操作系统非法文件名字符（如 `/`、`\`、`:`、`*`、`?`、`"`、`<`、`>`、`|`）时，输入框提示非法字符并自动过滤或阻止重命名。
- ERR-003: 重命名产生同名冲突时，提示“同层级已存在同名文档”。

#### Boundary Conditions
- BND-002: 支持最多 5 层子页面嵌套。

---

### REQ-003 — 块级文档编辑器交互与两态模式

- Source: `PROJECT_BRIEF.md` Core Scenario 4
- Actors: 终端用户
- Preconditions: 用户打开任意 `.md` 页面
- Trigger: 键盘敲击、鼠标悬浮、拖拽、快捷键
- Expected Behavior:
  1. **两态交互模型**：
     - **编辑态 (Text Mode)**：光标在块内正常打字输入。
     - **选中态 (Block Selection Mode)**：光标在块内按 `Esc`，光标隐藏，当前整个块呈现浅蓝/柔和背景高亮外框；在选中态按 `Enter` 恢复编辑态；按上下箭头可在不同块之间切换选中；按 `Backspace` 整体删除该块。
  2. **六点拖拽手柄 (⠿ Drag Handle)**：
     - 鼠标悬浮在任意块左侧外边距区域时，显示六点拖拽手柄图标。
     - 单击手柄直接进入选中态并弹出块快捷操作菜单。
     - 按下手柄并拖拽，出现上下放置指示蓝线；松开鼠标后将该块移动到目标位置。
  3. **快捷斜杠浮动菜单 (Slash Command Menu)**：
     - 在空块或文字末尾输入 `/` 时，在光标正下方弹出浮动命令菜单。
     - 支持键盘上下箭头切换候选项，按 `Enter` 执行转换/插入；按 `Esc` 或退格删除 `/` 关闭菜单。
     - 支持中文/拼音模糊过滤（如输入 `/wz` 过滤出“文本”，输入 `/db` 过滤出“待办清单”）。
  4. **键盘流**：
     - `Enter`：在普通段落下创建新段落块；在列表项下创建新同类型列表项；在空列表项下按 `Enter` 退出列表变为普通段落。
     - `Backspace`：在空块开头按退格删除该块，光标聚焦至上一块末尾。
     - 快捷键：`Cmd+B` 粗体、`Cmd+I` 斜体、`Cmd+E` 行内代码、`Cmd+Shift+X` 删除线。
- Resulting State: 编辑器文档结构按块操作精确更新。
- Explicit Non-goals: 第一版不做多列分栏排版（Column layout），不做块折叠折叠（Toggle block）。

#### Acceptance Criteria
- AC-008: 鼠标悬浮在块左侧能显示 ⠿ 手柄，且能拖拽调换块物理顺序。
- AC-009: 按 `Esc` 可从编辑态切换至块选中态，按上下键可在块间转移高亮，按 `Backspace` 可删除选中块。
- AC-010: 输入 `/` 弹出浮动菜单，可通过方向键选择并回车插入/转换为指定块类型。
- AC-011: 列表项按回车连续生成新项，空列表项回车自动转回普通段落。
- AC-012: 基础行内快捷键（`Cmd+B/I/E`）正常作用于选中文字。

#### Error Scenarios
- ERR-004: 拖拽到非法区域或取消拖拽时，文档保持原顺序不发生损坏。

---

### REQ-004 — 10 种核心块类型定义与排版规范

- Source: `PROJECT_BRIEF.md` In-Scope 3
- Actors: 终端用户
- Preconditions: 编辑器就绪
- Trigger: 输入快捷语法或通过 `/` 菜单插入
- Expected Behavior:
  支持以下 10 种核心块类型及其双向 Markdown 语法映射：
  1. **普通段落 (Paragraph)**：标准单行/多行文本。
  2. **标题 1 (Heading 1)**：大标题，对应 `# `。
  3. **标题 2 (Heading 2)**：中标题，对应 `## `。
  4. **标题 3 (Heading 3)**：小标题，对应 `### `。
  5. **无序列表 (Bullet List)**：圆形项目符号，对应 `- `。
  6. **有序列表 (Numbered List)**：数字序号，对应 `1. `。
  7. **待办清单 (Todo Checklist)**：带复选框，对应 `- [ ] ` 与 `- [x] `。点击复选框即时切换勾选状态并给文本添加浅灰中划线。
  8. **引用块 (Quote)**：左侧灰色竖线装饰，对应 `> `。
  9. **代码块 (Code Block)**：深色等宽背景容器，对应 ```` ``` ````。
  10. **分割线 (Divider)**：水平分隔细线，对应 `---`。
  11. **Callout 提示框 (Callout Box)**：
      - 对应 GFM 语法 `> [!NOTE]`（或 `> [!TIP]`、`> [!WARNING]`）。
      - 前端渲染为圆角浅色背景卡片，左侧带有高亮指示条及默认图标（💡）。
  12. **本地图片 (Image)**：
      - 支持从系统剪贴板粘贴截图（`Cmd+V`）。
      - 接收到图片二进制数据后，自动生成唯一文件名（如 `img-YYYYMMDD-HHmmss.png`），通过 Tauri 写入当前工作区的 `assets/` 相对目录中。
      - 编辑器插入 `![](assets/img-xxxx.png)` 语法并展示图片预览。
- Resulting State: 各种块类型正确展示，富文本与底层 Markdown 语法一一对应。
- Explicit Non-goals: 第一版不支持第三方图床上传，不支持数学公式块 LaTeX，不支持多维表格。

#### Acceptance Criteria
- AC-013: 10 种核心块在编辑区均有明确的专用渲染样式。
- AC-014: 待办清单点击勾选框切换完成状态，对应底层 Markdown 更新为 `- [x]`。
- AC-015: 粘贴剪贴板截图能在工作区 `assets/` 下自动生成图片文件，并在文档中正常渲染相对路径图片。
- AC-016: Callout 块在编辑区渲染为美观的提示卡片，保存为标准 GFM Blockquote 语法。

#### Error Scenarios
- ERR-005: 粘贴过大图片（>20MB）或不支持的剪贴板数据格式时，给出明确提示并不造成应用崩溃。

---

### REQ-005 — 100% 纯净 Markdown 双向无损持久化

- Source: `PROJECT_BRIEF.md` In-Scope 4
- Actors: 系统后台
- Preconditions: 用户在编辑区进行内容修改
- Trigger: 内容变更（输入、删除、换行、拖拽排序等）
- Expected Behavior:
  1. **防抖自动保存**：用户停止键入 1000 毫秒后，触发保存动作。
  2. **显式保存**：按 `Cmd+S` 立即触发无防抖即时保存。
  3. **序列化纯净度**：
     - 输出的标准 `.md` 文本中，**绝对不包含任何私有 HTML 注释（如 `<!-- block-id -->`）或自定义 XML 标签**。
     - 输出内容符合 CommonMark / GFM 国际通用规范，可使用原生 Obsidian / VS Code 完美打开。
  4. **反向反序列化 (Parse on Open)**：
     - 打开本地 `.md` 文件时，解析器将 Markdown AST 转换为 Tiptap 块级节点。
     - 往返一致性：Markdown → Block AST → Markdown 在无编辑修改时不产生意外的字符漂移或多余空行。
- Resulting State: 磁盘文件内容与编辑器内存状态保持同步。
- Explicit Non-goals: 不保留无法用标准 Markdown 语法表达的私有属性（如自定义字体色、块背景色）。

#### Acceptance Criteria
- AC-017: 编辑停顿 1 秒内自动写入磁盘，窗口标题或底部状态栏显示“已保存”。
- AC-018: 生成的 `.md` 文件在 VS Code 中打开，语法 100% 合法且排版完全一致。
- AC-019: 任意标准 Markdown 文件导入/打开，所有基础块、列表、代码块、待办正确解析为对应块。

#### Error Scenarios
- ERR-006: 磁盘满或写入失败时，界面常驻红字警告“保存失败，请检查磁盘空间”，并保留内存中编辑内容不被清空。

---

### REQ-006 — 本地文件系统实时热监听与并发防冲突

- Source: `PROJECT_BRIEF.md` In-Scope 4
- Actors: 本地操作系统（Finder / 外部编辑器）与 Tauri Rust 监听进程
- Preconditions: 工作区目录正被监听
- Trigger: 外部修改、新增、重命名或删除文件
- Expected Behavior:
  1. Rust 底层使用 `notify` 监听工作区目录树。
  2. **外部文件增删**：
     - 若外部新增/删除了 `.md` 文件，侧边栏页面树在 300ms 防抖后自动重新加载并渲染。
  3. **外部修改当前文件**：
     - 若外部程序修改了当前正在编辑的 `.md` 文件：
     - 系统检查当前编辑器是否有未保存的本地修改（Dirty 状态）。
     - 若无未保存修改，直接平滑重载最新内容。
     - 若有未保存修改，弹出模态对话框：
       *“检测到外部文件已变更，是否覆盖本地未保存的改动并重新载入？”*
       - 选项 A：【重新载入】（丢弃未保存内容，加载磁盘版本）
       - 选项 B：【保留当前版本】（使用当前编辑器内容覆盖磁盘）
- Resulting State: 外部变更得到受控同步，不会静默冲掉用户正在键入的文字。

#### Acceptance Criteria
- AC-020: 在 Finder 中向工作区复制一个新 `.md` 文件，左侧树在 1 秒内自动出现该文件。
- AC-021: 在外部修改非当前打开的 `.md`，再次点击打开时展示的是外部修改后的最新内容。
- AC-022: 在当前文档有未保存键入时外部修改该文件，系统弹出冲突选择对话框，用户选择能正确执行对应策略。

---

## User Flows

```text
[启动应用]
    │
    ├─► 是否已保存工作区? ──No──► [选取本地文件夹] ──► [初始化空工作区并写入 Welcome.md]
    │                                                     │
    └─► Yes                                               ▼
         │                                         [进入工作区主界面]
         └────────────────────────────────────────────────┤
                                                          ▼
                                                  [左侧 Folder-Notes 树]
                                                          │
                                                    点击打开页面
                                                          │
                                                          ▼
                                                  [右侧块级编辑器]
                                                          │
                            ┌─────────────────────────────┼─────────────────────────────┐
                            ▼                             ▼                             ▼
                      [输入文字/快捷键]             [输入 / 唤起菜单]          [悬浮左侧 ⠿ 拖拽调序]
                            │                             │                             │
                            └─────────────────────────────┼─────────────────────────────┘
                                                          ▼
                                                    [内容产生变动]
                                                          │
                                                     防抖 1000ms
                                                          │
                                                          ▼
                                                [写入磁盘纯净 .md 文件]
```

---

## State Transitions

| Current State | Event | Guard | Next State | User-visible Result |
|---|---|---|---|---|
| `UNINITIALIZED` | 应用启动 | 本地配置无有效工作区路径 | `ONBOARDING` | 展示选择工作区欢迎指引卡片 |
| `UNINITIALIZED` | 应用启动 | 本地配置存在有效工作区路径 | `WORKSPACE_LOADED` | 直接加载工作区目录树 |
| `ONBOARDING` | 用户选定目录 | 目录存在且有写权限 | `WORKSPACE_LOADED` | 渲染侧边栏，打开欢迎文档 |
| `VIEWING_PAGE` | 点击编辑区 | 页面可写 | `EDITING_PAGE` | 光标闪烁，可键入文本 |
| `EDITING_PAGE` | 按 `Esc` | 光标处于块内 | `BLOCK_SELECTED` | 整个块呈现高亮外框，光标隐藏 |
| `BLOCK_SELECTED` | 按上下键 | 存在相邻块 | `BLOCK_SELECTED` | 高亮转移至相邻块 |
| `BLOCK_SELECTED` | 按 `Enter` | 当前有选中块 | `EDITING_PAGE` | 进入该块内部恢复打字 |
| `EDITING_PAGE` | 输入变更 | 防抖计时器触发 | `SAVING` | 状态栏提示“正在保存...” |
| `SAVING` | 文件写入成功 | 写入无异常 | `SAVED` | 状态栏显示“已保存” |
| `EDITING_PAGE` | 外部修改当前文件 | 当前文档处于 Dirty 状态 | `CONFLICT_PROMPT` | 弹出冲突处理选择弹窗 |

---

## 验收索引

| REQ | AC | Source |
|---|---|---|
| REQ-001 | AC-001, AC-002, AC-003 | `PROJECT_BRIEF.md` GOAL-001 |
| REQ-002 | AC-004, AC-005, AC-006, AC-007 | `PROJECT_BRIEF.md` GOAL-002 |
| REQ-003 | AC-008, AC-009, AC-010, AC-011, AC-012 | `PROJECT_BRIEF.md` GOAL-003, GOAL-004 |
| REQ-004 | AC-013, AC-014, AC-015, AC-016 | `PROJECT_BRIEF.md` GOAL-003 |
| REQ-005 | AC-017, AC-018, AC-019 | `PROJECT_BRIEF.md` GOAL-005 |
| REQ-006 | AC-020, AC-021, AC-022 | `PROJECT_BRIEF.md` GOAL-006 |

---

## Limitations & Disclaimers

- 第一版不处理非 UTF-8 编码的特殊老旧文本文件（统一采用 UTF-8 读写）。
- 第一版不支持超出标准 Markdown 承载能力的富样式（如自定义字号、文字底色、多列排版），以保持与外部生态的绝对纯净兼容。
