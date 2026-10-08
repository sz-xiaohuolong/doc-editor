# Implementation Plan — v0.1.0

## Control

- Requirement Baseline: [docs/vibe/releases/v0.1.0/PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- Effective SPEC: [docs/vibe/releases/v0.1.0/SPEC.md](SPEC.md)
- Proposed Design: [docs/vibe/releases/v0.1.0/PROPOSED_DESIGN.md](PROPOSED_DESIGN.md)
- Status: `APPROVED` (用户授权直接编码推进)

## Global Constraints

- 只实现当前 Requirement Version 1.0 的冻结范围。
- 遵循 100% 纯净标准 CommonMark/GFM 规范，不向底层文件注入任何私有标记。
- 每个 Task 必须有单元测试或可运行构建证据。
- 严格遵循垂直切片（Vertical Slice）顺序递进。

---

## Slice Map

| Slice | Business Loop | REQ/AC | Dependencies | Exit Evidence | Status |
|---|---|---|---|---|---|
| **SLICE-01** | 项目工程脚手架与 Tauri 2.0 原生基础设施 | REQ-001 (AC-001, AC-003, ERR-001, BND-001) | 无 | Vite/React 前端与 Tauri Rust 编译通过，原生对话框可调起 | `NOT_STARTED` |
| **SLICE-02** | Folder-Notes 页面树与工作区文件管理 | REQ-001 (AC-002), REQ-002 (AC-004~007, ERR-002~003, BND-002) | SLICE-01 | Folder-Notes 扫描与重命名算法单元测试通过，侧边栏页面增删改查自洽 | `NOT_STARTED` |
| **SLICE-03** | Tiptap 块级编辑器核心与 10 种块类型 (含 H1~H4、Callout、图片) | REQ-003 (AC-008~012, ERR-004), REQ-004 (AC-013~016, ERR-005) | SLICE-02 | 10 种块渲染正常，六点手柄拖拽排序生效，两态键盘流与 `/` 菜单流畅 | `NOT_STARTED` |
| **SLICE-04** | 100% 纯净 Markdown 双向无损往返与热监听 | REQ-005 (AC-017~019, ERR-006), REQ-006 (AC-020~022) | SLICE-03 | Round-trip 黄金断言测试全绿，防抖落盘与外部修改冲突保护生效 | `NOT_STARTED` |
| **SLICE-05** | 综合端到端验证、代码审查与 GitHub 开源发布 | 全体 REQ/AC (AC-001~022) | SLICE-04 | 产出完整测试证据包，完成 Code Review，通过 `gh` 创建公开仓库并 Release | `NOT_STARTED` |

---

## Tasks

### TASK-001 — 初始化 Tauri 2.0 + React 18 + TS + Tailwind CSS 脚手架
- Slice: `SLICE-01`
- Goal: 搭建现代前端与桌面后端双进程项目骨架，配置 Tailwind 样式与开发环境。
- REQ/AC: REQ-001
- Files/Modules: `package.json`, `vite.config.ts`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/src/main.rs`, `src/App.tsx`, `tailwind.config.js`
- Status: `NOT_STARTED`

### TASK-002 — 实现 Rust 原生服务层与配置持久化
- Slice: `SLICE-01`
- Goal: 实现配置持久化（记录上次工作区）、macOS 原生目录选择对话框、路径防穿透安全校验、原子写入（.tmp -> rename）。
- REQ/AC: REQ-001 (AC-001, AC-003, ERR-001, BND-001)
- Files/Modules: `src-tauri/src/workspace.rs`, `src-tauri/src/fs_utils.rs`
- Status: `NOT_STARTED`

### TASK-003 — 实现 Folder-Notes 树扫描算法与初始 Welcome.md 生成
- Slice: `SLICE-02`
- Goal: 实现递归扫描工作区并将 `<Name>.md` 与 `<Name>/` 合并为 Folder-Notes 复合节点的算法；若工作区为空自动生成内置示例的《Welcome.md》。
- REQ/AC: REQ-001 (AC-002), REQ-002 (AC-004, BND-002)
- Files/Modules: `src-tauri/src/tree.rs`, `src/types/tree.ts`, `src-tauri/src/welcome.rs`
- Status: `NOT_STARTED`

### TASK-004 — 实现页面增删改与页面大标题双向联动
- Slice: `SLICE-02`
- Goal: 新建页面/子页面、删除页面（含递归子目录）；主编辑区大标题修改 500ms 防抖同步重命名底层 `.md` 文件及同名子目录。
- REQ/AC: REQ-002 (AC-005, AC-006, AC-007, ERR-002, ERR-003)
- Files/Modules: `src-tauri/src/operations.rs`, `src/components/PageTitle.tsx`, `src/hooks/useWorkspace.ts`
- Status: `NOT_STARTED`

### TASK-005 — 打造还原 wolai 质感的极简侧边栏 UI
- Slice: `SLICE-02`
- Goal: 实现融入 macOS 交通灯的左侧导航、小火龙风格工作区头部、展开折叠箭头、Emoji 图标、激活页面轻柔粉红胶囊高亮。
- REQ/AC: REQ-002
- Files/Modules: `src/components/Sidebar/`, `src/components/WorkspaceHeader.tsx`
- Status: `NOT_STARTED`

### TASK-006 — 集成 Tiptap 2.x 与基础 8 种核心块 (含 H1~H4)
- Slice: `SLICE-03`
- Goal: 配置 Tiptap 编辑器内核，支持段落、主标题/大标题/中标题/小标题 (H1~H4)、无序列表、有序列表、待办任务 (TaskList 带 Checkbox)、代码块 (等宽高亮)、引用块、分割线。
- REQ/AC: REQ-003 (AC-011), REQ-004 (AC-013, AC-014)
- Files/Modules: `src/components/Editor/`, `src/components/Editor/extensions/`
- Status: `NOT_STARTED`

### TASK-007 — 实现 Callout 提示框与本地图片粘贴
- Slice: `SLICE-03`
- Goal: 实现 GFM `> [!NOTE]` 规范的 Callout 卡片组件；实现从剪贴板粘贴图片，由 Rust 安全存入 `assets/` 相对路径并在文档中渲染。
- REQ/AC: REQ-004 (AC-015, AC-016, ERR-005)
- Files/Modules: `src/components/Editor/extensions/CalloutNode.ts`, `src-tauri/src/assets.rs`
- Status: `NOT_STARTED`

### TASK-008 — 实现块两态模型 (Edit/Select) 与六点拖拽手柄 ⠿
- Slice: `SLICE-03`
- Goal: 块左侧 24px 悬浮热区淡入六点手柄，支持鼠标拖拽调换块物理顺序；光标处按 `Esc` 转换为整块选中高亮，上下键转移，回车重入编辑。
- REQ/AC: REQ-003 (AC-008, AC-009, ERR-004)
- Files/Modules: `src/components/Editor/plugins/dragHandle.ts`, `src/components/Editor/plugins/blockSelection.ts`
- Status: `NOT_STARTED`

### TASK-009 — 实现斜杠浮动命令菜单 (`/`) 与拼音缩写过滤
- Slice: `SLICE-03`
- Goal: 监听输入 `/` 弹出悬浮弹窗，呈现分组块列表（文本、待办、H1~H4、Callout、代码块等），支持方向键上下导航与拼音简码过滤 (`/wb`, `/h1`~`/h4`, `/dblb`)。
- REQ/AC: REQ-003 (AC-010, AC-012)
- Files/Modules: `src/components/Editor/SlashMenu.tsx`, `src/components/Editor/extensions/slashCommand.ts`
- Status: `NOT_STARTED`

### TASK-010 — 实现 100% 纯净 Markdown 双向无损序列化与黄金测试
- Slice: `SLICE-04`
- Goal: 基于 `tiptap-markdown` 定制解析器与生成器，确保 10 种块往返无损且零私有注释注入；编写自动化 Round-trip 单元测试套件。
- REQ/AC: REQ-005 (AC-018, AC-019)
- Files/Modules: `src/utils/markdown.ts`, `tests/markdown-roundtrip.test.ts`
- Status: `NOT_STARTED`

### TASK-011 — 实现 1000ms 防抖自动落盘与 Cmd+S 即时保存
- Slice: `SLICE-04`
- Goal: 编辑输入 1000ms 防抖触发保存，`Cmd+S` 立即保存，状态栏动态提示“已保存/正在保存”，防止数据丢失。
- REQ/AC: REQ-005 (AC-017, ERR-006)
- Files/Modules: `src/hooks/useAutoSave.ts`, `src/components/StatusBar.tsx`
- Status: `NOT_STARTED`

### TASK-012 — 实现文件系统热监听 (notify) 与并发修改防冲突提示
- Slice: `SLICE-04`
- Goal: Rust 底层集成 `notify` (300ms 防抖)，外部增删文件自动刷新页面树；外部修改当前编辑文件且处于 Dirty 状态时，弹出冲突选择 Modal。
- REQ/AC: REQ-006 (AC-020, AC-021, AC-022)
- Files/Modules: `src-tauri/src/watcher.rs`, `src/components/ConflictModal.tsx`
- Status: `NOT_STARTED`

### TASK-013 — 运行全量自动化测试套件与端到端构建验证
- Slice: `SLICE-05`
- Goal: 运行前端 Vitest 单元测试、Rust 单元测试及生产包打包验证，测试日志与截屏存入 `.evidence/v0.1.0/`，编写 `VERIFICATION.md`。
- REQ/AC: 全体 AC-001 ~ AC-022
- Files/Modules: `.evidence/v0.1.0/`, `docs/vibe/releases/v0.1.0/VERIFICATION.md`
- Status: `NOT_STARTED`

### TASK-014 — 代码审查与开源 README / LICENSE 建设
- Slice: `SLICE-05`
- Goal: 执行生产级代码质量与安全走查，编写优雅的开源 `README.md`、`LICENSE` (MIT) 与贡献指引。
- REQ/AC: 全体规范
- Files/Modules: `README.md`, `LICENSE`
- Status: `NOT_STARTED`

### TASK-015 — 通过 gh CLI 创建 GitHub 仓库并开源发布 Release v0.1.0
- Slice: `SLICE-05`
- Goal: 使用已认证的 GitHub CLI 账号在 GitHub 创建公开仓库 `sz-xiaohuolong/doc-editor`，推送代码并发布 `v0.1.0` Release！
- REQ/AC: 交付完成
- Files/Modules: Git commit & GitHub Release
- Status: `NOT_STARTED`
