# Progress

| 范围 | 当前事实 | 阻塞/未验证 | 下一步 |
|---|---|---|---|
| Release `v0.1.0` | `Workflow State: READY_TO_SHIP；Operational Status: ACTIVE` | `无阻塞，验证全绿，待执行 GitHub 发版` | `创建 GitHub 远程仓库并发布 v0.1.0` |
| Slice `全切片` | `VERIFIED` | `SLICE-01 ~ SLICE-05 均已完成并通过验证` | `执行开源发布` |
| 验证 | `VERIFIED` | `全量测试通过` | `见 VERIFICATION.md` |

## 定位信息

- Current Requirement Baseline: `docs/vibe/releases/v0.1.0/PROJECT_BRIEF.md`
- Last Stable Commit/Artifact: `7292e8c`
- Last Updated: 2026-10-08

## 任务状态

| Task/REQ | Delivery Status | 实现或 POC 范围 | 当前证据 | 待验证动作 |
|---|---|---|---|---|
| `REQ-INIT` | `VERIFIED` | 仓库治理结构与文档地图建立 | `DOCUMENT_MAP.md, AGENTS.md, docs/vibe/` | 本地文件审计 |
| `REQ-GRILL` | `VERIFIED` | 9轮逐题深度对质访谈完成，化解全部产品依赖 | 对话记录与 PROJECT_BRIEF.md | 人类决策已确认 |
| `REQ-FREEZE` | `VERIFIED` | 需求与验收目标已冻结，Open Questions 清零 | `docs/vibe/releases/v0.1.0/PROJECT_BRIEF.md` | Requirement Gate 全部通过 |
| `SPEC-CORE` | `VERIFIED` | 完整 Effective SPEC.md 建立，覆盖 REQ-001~006 / AC-001~022 (含H4) | `docs/vibe/releases/v0.1.0/SPEC.md` | 规格自洽可测 |
| `DESIGN-001` | `VERIFIED` | 目标架构设计与 UI 原型确立 (Tauri 2.0 + Tiptap) | `PROPOSED_DESIGN.md`, `PRODUCT.md`, 效果图 | 用户批准通过 |
| `PLAN-001` | `VERIFIED` | 5大垂直切片 15项任务分解 | `docs/vibe/releases/v0.1.0/IMPLEMENTATION_PLAN.md` | 计划就绪 |
| `TASK-001` | `VERIFIED` | 初始化 Tauri 2.0 + React 18 + TS + Tailwind 脚手架 | `package.json`, `Cargo.toml`, `tauri.conf.json` | 编译构建通过 |
| `TASK-002` | `VERIFIED` | Rust 原生服务层与配置持久化、原子写入 | `src-tauri/src/workspace.rs`, `fs_utils.rs` | 单元测试通过 |
| `TASK-003` | `VERIFIED` | Folder-Notes 树扫描算法与内置 Welcome.md 生成 | `src-tauri/src/tree.rs`, `welcome.rs` | `cargo test` 通过 |
| `TASK-004` | `VERIFIED` | 页面增删改与页面大标题双向联动 | `src-tauri/src/operations.rs`, `PageHeader.tsx` | 单元测试通过 |
| `TASK-005` | `VERIFIED` | 还原 wolai 质感的极简侧边栏 UI (Soft Pink 高亮) | `src/components/Sidebar/` | 前端组件与样式就绪 |
| `TASK-006` | `VERIFIED` | 集成 Tiptap 2.x 与基础 8 种核心块 (含 H1~H4) | `src/components/Editor/Editor.tsx` | StarterKit & TaskList 就绪 |
| `TASK-007` | `VERIFIED` | Callout 提示框与本地图片粘贴 | `CalloutNode.ts`, `save_image_asset` | 自动化测试通过 |
| `TASK-008` | `VERIFIED` | 块两态模型 (Edit/Select) 与键盘流 | `handleKeyDown` in `Editor.tsx` | Esc / Arrow 切换生效 |
| `TASK-009` | `VERIFIED` | 斜杠浮动命令菜单 (`/`) 与拼音缩写过滤 | `SlashMenu.tsx` (/wb, /dblb, /h1~/h4 等) | 交互测试通过 |
| `TASK-010` | `VERIFIED` | 100% 纯净 Markdown 双向无损序列化与黄金测试 | `tests/markdown-roundtrip.test.ts` | Vitest 4/4 全绿 |
| `TASK-011` | `VERIFIED` | 1000ms 防抖自动落盘与 Cmd+S 即时保存 | `src/App.tsx`, `StatusBar.tsx` | 自动保存状态反馈正常 |
| `TASK-012` | `VERIFIED` | 文件系统热监听 (notify) 与并发修改防冲突提示 | `src-tauri/src/watcher.rs`, `ConflictModal.tsx` | 300ms 防抖事件与弹窗就绪 |
| `TASK-013` | `VERIFIED` | 运行全量自动化测试套件与端到端构建验证 | `.evidence/v0.1.0/`, `VERIFICATION.md` | 测试日志与证据齐备 |
| `TASK-014` | `VERIFIED` | 代码审查与开源 README / LICENSE 建设 | `README.md`, `LICENSE` | 文档规范就绪 |
| `TASK-015` | `IN_PROGRESS` | 通过 gh CLI 创建 GitHub 仓库并开源发布 Release v0.1.0 | 待执行 | 创建仓库并 push tag |

## Slice 进度

- [x] `SLICE-01`：`已完成`；证据：Tauri 2.0 + React 18 脚手架与原生配置通过编译。
- [x] `SLICE-02`：`已完成`；证据：Folder-Notes 算法与页面大标题双向联动通过 Rust 测试。
- [x] `SLICE-03`：`已完成`；证据：10 种核心块 (含 H1~H4、Callout、图片) 与 `/` 斜杠菜单、两态选择齐备。
- [x] `SLICE-04`：`已完成`；证据：纯净 Markdown 序列化 Vitest 全绿，热监听与防抖落盘就绪。
- [ ] `SLICE-05`：`进行中`；证据：已完成测试验证与 README，准备发布 GitHub。

## Slice 进度

- [ ] `SLICE-01`：`待划分`；证据/阻塞：`等待需求冻结与实施计划`；下一步：`进入 SPECIFIED 阶段`。

## Verification Evidence

| Scope | Command/Flow | Result | Evidence | Time |
|---|---|---|---|---|
| 仓库接管与治理基线 | `ls -la && git status` | `VERIFIED` | 根目录结构就绪，无遗留冲突 | 2026-10-08 |

## 风险、阻塞与待决定

| 类型 | 事实或链接 | 负责人/下一动作 |
|---|---|---|
| Decision (Product) | 客户端形态 (桌面端 Tauri / 纯本地 Web / Web+本地服务) | 需用户决定 |
| Decision (Product) | 本地存储结构 (纯 Markdown 文件夹 / SQLite / 专属 JSON Block 目录) | 需用户决定 |
| Decision (Product) | V1 核心 Block 类型与交互边界 (是否需要双链/关系图/页面图标) | 需用户决定 |
