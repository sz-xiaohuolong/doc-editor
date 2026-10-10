# Implementation Plan — v0.2.0

## Control

- Requirement Baseline: [docs/vibe/releases/v0.2.0/PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- Effective SPEC: [docs/vibe/releases/v0.2.0/SPEC.md](SPEC.md)
- Proposed Design: [docs/vibe/releases/v0.2.0/PROPOSED_DESIGN.md](PROPOSED_DESIGN.md)
- Status: `APPROVED` (用户授权直接编码推进)

## Global Constraints

- 严格遵循 100% 纯本地、纯 CommonMark/GFM 规范，不向底层文件注入任何私有标记。
- 每个切片必须有自动化测试或真实运行证据支撑。
- 零破坏性原则：v0.1.0 已有功能（六点手柄、10种块、Callout、图片粘贴、热监听）必须 100% 保持稳定。

---

## Slice Map

| Slice | Business Loop | REQ/AC | Dependencies | Exit Evidence | Status |
|---|---|---|---|---|---|
| **SLICE-06** | 双向链接体系 (WikiLinks & Backlinks) | REQ-007 (AC-023~026, ERR-007), REQ-008 (AC-027~029) | v0.1.0 基础设施 | 输入 `[[` 弹出联想并生成药丸标签，点击药丸跳转；底部 Backlinks 面板准确统计并展示引用切片 | `NOT_STARTED` |
| **SLICE-07** | 全局全文搜索与 CJK 分词检索 (Global Search) | REQ-009 (AC-030~033, ERR-008) | SLICE-06 | `Cmd+P` 快速唤起搜索模态框，CJK 关键词高亮匹配，全键盘流上下导航与回车跳转 | `NOT_STARTED` |
| **SLICE-08** | 多格式本地文件导入流水线 (Import Pipeline) | REQ-010 (AC-034~036, ERR-009~011) | SLICE-07 | 支持本地导入 `.md`/`.txt`/`.html`/`.docx`，内嵌媒体转存本地，导入后自动建页并跳转 | `NOT_STARTED` |
| **SLICE-09** | 综合端到端验证、证据归档与 GitHub Release v0.2.0 发布 | 全体 REQ-007~010 / AC-023~036 | SLICE-08 | 产出全套真实截屏与日志归档至 `.evidence/v0.2.0/`，发布 GitHub Release | `NOT_STARTED` |

---

## Tasks

### TASK-016 — 实现 Tiptap WikiLinkNode 扩展与标准 Markdown [[Page]] 往返序列化
- Slice: `SLICE-06`
- Goal: 创建 `WikiLinkNode` 行内原子节点，配置带有 wolai 质感的内联药丸样式，扩展 Markdown 序列化支持 `[[页面名称]]`。
- Files/Modules: `src/components/Editor/extensions/WikiLinkNode.ts`, `src/utils/markdown.ts`, `tests/wikilink-roundtrip.test.ts`
- Status: `NOT_STARTED`

### TASK-017 — 实现输入 [[ 自动唤起页面联想菜单与键盘补全
- Slice: `SLICE-06`
- Goal: 在编辑器中实时监听打字，光标遇到 `[[` 时计算光标视口坐标并呼出 `WikiLinkMenu` 悬浮浮层，支持拼音与中文过滤、回车确认插入。
- Files/Modules: `src/components/Editor/WikiLinkMenu.tsx`, `src/components/Editor/Editor.tsx`
- Status: `NOT_STARTED`

### TASK-018 — 实现页面底部 BacklinksPanel 反向链接卡片与无缝跳转
- Slice: `SLICE-06`
- Goal: 自动遍历工作区文档扫描引用当前文档的来源文档，提取上下文文本切片，在编辑器底部呈现折叠/展开的反向链接卡片列表，点击跳转来源页。
- Files/Modules: `src/components/Editor/BacklinksPanel.tsx`, `src/services/backlinksEngine.ts`, `src/App.tsx`
- Status: `NOT_STARTED`

### TASK-019 — 实现纯本地 CJK 分词搜索引擎 (searchEngine.ts)
- Slice: `SLICE-07`
- Goal: 实现离线 CJK 单字/双字 Unigram+Bigram 滑动窗口分词，支持快速计算标题权重与正文权重，提取命中高亮切片。
- Files/Modules: `src/services/searchEngine.ts`, `tests/search-engine.test.ts`
- Status: `NOT_STARTED`

### TASK-020 — 实现全局搜索模态框 (GlobalSearchModal) 与快捷键流
- Slice: `SLICE-07`
- Goal: 绑定全局 `Cmd+P` / `Ctrl+P` 与侧边栏“搜索”按钮，构建优雅毛玻璃居中浮层，实现键盘上下键导航、高亮匹配与回车跳转。
- Files/Modules: `src/components/Search/GlobalSearchModal.tsx`, `src/components/Sidebar/Sidebar.tsx`, `src/App.tsx`
- Status: `NOT_STARTED`

### TASK-021 — 实现本地多格式文件转换流水线 (importPipeline.ts)
- Slice: `SLICE-08`
- Goal: 支持读取本地 `.md`、`.txt`、`.html`、`.docx`（集成 mammoth），转换解析为纯净 Markdown，自动将 base64 图片保存为工作区 `.assets/` 本地相对路径。
- Files/Modules: `src/services/importPipeline.ts`, `package.json`
- Status: `NOT_STARTED`

### TASK-022 — 集成侧边栏导入入口与文件创建联动
- Slice: `SLICE-08`
- Goal: 侧边栏底部提供醒目的“导入文件”操作入口，支持单选与多选，安全处理重名文档（自动追加序号），导入后刷新树并打开新文档。
- Files/Modules: `src/components/Sidebar/Sidebar.tsx`, `src/App.tsx`
- Status: `NOT_STARTED`

### TASK-023 — 运行全量自动化测试套件与端到端回归验证
- Slice: `SLICE-09`
- Goal: 运行 Vitest 单元测试与 Puppeteer E2E 真实环境测试，验证双链补全跳转、Backlinks、Cmd+P 全局搜索、文件导入全链路。
- Files/Modules: `scripts/verify-v0.2.0.js`, `tests/`
- Status: `NOT_STARTED`

### TASK-024 — 归档证据包与更新发布文档
- Slice: `SLICE-09`
- Goal: 截取真实界面图片存入 `.evidence/v0.2.0/`，编写 `VERIFICATION.md`，更新 `DOCUMENT_MAP.md` 与 `PROGRESS.md`。
- Files/Modules: `.evidence/v0.2.0/`, `docs/vibe/releases/v0.2.0/VERIFICATION.md`, `docs/vibe/PROGRESS.md`
- Status: `NOT_STARTED`

### TASK-025 — 提交 Git 代码并推送发布 GitHub Release v0.2.0
- Slice: `SLICE-09`
- Goal: 规范提交所有源码与文档，推送至 GitHub main 分支，打 tag 并发布 v0.2.0 Release。
- Files/Modules: Git commit & push, gh release
- Status: `NOT_STARTED`
