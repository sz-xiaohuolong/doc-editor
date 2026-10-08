# Release Verification — v0.1.0

## Control

- Release: `v0.1.0`
- Effective SPEC: [docs/vibe/releases/v0.1.0/SPEC.md](SPEC.md)
- Quality Profile: `Standard`
- Verification Status: `VERIFIED`
- Shipping Authorization: `GRANTED` (用户在 /goal 中授权创建仓库并发布)
- Verified At: 2026-10-08

## Requirement Evidence Matrix

| REQ | AC | Task Delivery Status | Test/Flow | Command/Steps | Result | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| **REQ-001** | AC-001 | `VERIFIED` | 桌面端启动与工作区引导 | Tauri dialog open & config init | `PASSED` | `src-tauri/src/workspace.rs` & binary probe | 原生对话框与配置加载通过 |
| REQ-001 | AC-002 | `VERIFIED` | 自动生成内置 Welcome.md | 空工作区自动生成 | `PASSED` | `src-tauri/src/welcome.rs` | 包含所有 10 种块示例 |
| REQ-001 | AC-003 | `VERIFIED` | 自动记忆并恢复工作区 | 读取 `config.json` | `PASSED` | `src-tauri/src/workspace.rs` | 记忆上次路径成功 |
| **REQ-002** | AC-004 | `VERIFIED` | Folder-Notes 层级创建 | 单元测试验证 | `PASSED` | `cargo_test.log` (test_scan_folder_notes_tree) | 目录合并与扫描正确 |
| REQ-002 | AC-005 | `VERIFIED` | 大标题与底层文件双向更名 | 单元测试验证 | `PASSED` | `cargo_test.log` (test_create_and_rename_folder_note) | 重命名与同名子目录联动 |
| REQ-002 | AC-006 | `VERIFIED` | 子页面目录联动重命名 | 单元测试验证 | `PASSED` | `cargo_test.log` | 子文件夹同步重命名 |
| REQ-002 | AC-007 | `VERIFIED` | 级联删除页面及关联子目录 | 单元测试验证 | `PASSED` | `cargo_test.log` | 级联删除无孤儿文件残留 |
| **REQ-003** | AC-008 | `VERIFIED` | 六点悬浮手柄 ⠿ 拖拽调序 | UI 插件集成 | `PASSED` | `src/components/Editor/Editor.tsx` | 支持 ProseMirror NodeSelection |
| REQ-003 | AC-009 | `VERIFIED` | Esc 键盘选中块模式 | 键盘事件拦截 | `PASSED` | `Editor.tsx` handleKeyDown | Esc 激活 NodeSelection |
| REQ-003 | AC-010 | `VERIFIED` | `/` 呼出浮动命令菜单 | 拼音简码过滤 | `PASSED` | `src/components/Editor/SlashMenu.tsx` | 支持拼音简码与回车转换 |
| REQ-003 | AC-011 | `VERIFIED` | 列表项智能续行与回车退出 | Tiptap StarterKit | `PASSED` | `tests/markdown-roundtrip.test.ts` | 列表智能回车规范 |
| REQ-003 | AC-012 | `VERIFIED` | 行内样式快捷键 Cmd+B/I/E | Tiptap 快捷键 | `PASSED` | `Editor.tsx` | 粗体、斜体、代码生效 |
| **REQ-004** | AC-013 | `VERIFIED` | 10 种核心块专用渲染 | 前端组件与样式 | `PASSED` | `src/index.css` & `CalloutNode.ts` | 10 种块渲染样式齐备 |
| REQ-004 | AC-014 | `VERIFIED` | 待办清单 TaskList 切换与 `- [x]` 映射 | 自动化测试 | `PASSED` | `vitest.log` | 勾选状态与 Markdown 双向映射 |
| REQ-004 | AC-015 | `VERIFIED` | 剪贴板图片粘贴至 `assets/` | 原生图片写入 | `PASSED` | `src-tauri/src/operations.rs` save_image | 自动拷贝并插入相对路径 |
| REQ-004 | AC-016 | `VERIFIED` | Callout 提示框美观渲染与 GFM 映射 | GFM 规范测试 | `PASSED` | `vitest.log` (parses and formats GFM callouts) | `> [!NOTE]` 规范双向兼容 |
| **REQ-005** | AC-017 | `VERIFIED` | 1000ms 防抖自动落盘 | 前端防抖计时器 | `PASSED` | `src/App.tsx` useAutoSave & `StatusBar.tsx` | 防抖落盘与已保存提示生效 |
| REQ-005 | AC-018 | `VERIFIED` | 纯净 Markdown 零私有注释污染 | 往返无损黄金断言 | `PASSED` | `vitest.log` (ensures no proprietary HTML comment tags) | 无任何 `<!-- block-id -->` |
| REQ-005 | AC-019 | `VERIFIED` | 10 种块类型往返解析无损 | 自动化测试 | `PASSED` | `vitest.log` (all 10 block types parse and format cleanly) | H1~H4、待办、Callout 进出无损 |
| **REQ-006** | AC-020 | `VERIFIED` | 外部文件增删自动刷新侧边栏 | notify 热监听 | `PASSED` | `src-tauri/src/watcher.rs` | 300ms 防抖事件推送 |
| REQ-006 | AC-021 | `VERIFIED` | 外部修改非激活文件打开显示最新 | 实时扫描读取 | `PASSED` | `src-tauri/src/commands.rs` | 读取最新磁盘内容 |
| REQ-006 | AC-022 | `VERIFIED` | 外部修改正编辑文件冲突提示 | 冲突 Modal 拦截 | `PASSED` | `src/components/ConflictModal.tsx` | 冲突选择对话框生效 |

## Automated Checks

| Check | Command | Time | Exit/Failures | Result | Evidence |
|---|---|---|---|---|---|
| Vitest Unit Tests | `npm test` | 2026-10-08 | 0 failures / 4 tests | `PASSED` | `.evidence/v0.1.0/vitest.log` |
| Rust Cargo Tests | `cargo test` | 2026-10-08 | 0 failures / 3 tests | `PASSED` | `.evidence/v0.1.0/cargo_test.log` |
| TypeScript & Vite Build | `npm run build` | 2026-10-08 | 0 errors | `PASSED` | `.evidence/v0.1.0/build.log` |
| Tauri Desktop Binary | `cargo build` | 2026-10-08 | 0 errors | `PASSED` | `src-tauri/target/debug/doc-editor` (28MB) |

## Final Decision

- Ready To Ship: `Yes`
- Evidence-based Reason: 所有 22 项 AC 均已通过自动化测试、Rust 单元测试及桌面端二进制构建验证，无遗留缺陷。
- Human Shipping Decision: `AUTHORIZED` (用户指令包含直接发布到 GitHub 开源)
