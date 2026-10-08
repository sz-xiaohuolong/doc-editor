# Proposed Technical Design — v0.1.0

## Control

- Proposal ID: `DESIGN-001`
- Target Release: `v0.1.0`
- Status: `PROPOSED` (待审阅)
- Related REQ/AC: `REQ-001` ~ `REQ-006`, `AC-001` ~ `AC-022`
- Related Decisions: 2026-10-08 Grill-Me 9轮深度决策
- Owner: Antigravity
- Last Updated: 2026-10-08

---

## Goal and Constraints

- **Goal**: 构建首版类 wolai 的原生 macOS 桌面端块级编辑器，兼具极致轻量运行（~10MB 体积，~40MB 内存）、优雅两态积木拖拽排版手感与 100% 纯净标准 Markdown 文件持久化。
- **In Scope**:
  - Tauri 2.0 桌面端窗口与 Rust 原生文件读写/监听
  - Folder-Notes 页面树模型与大标题/文件名双向重命名联动
  - Tiptap / ProseMirror 块级编辑内核（10 种核心块、两态选择、六点拖拽手柄、`/` 快捷菜单）
  - 100% 纯净 Markdown 双向序列化（零私有注释注入）
  - 本地文件实时热监听与冲突提示保护
- **Out of Scope**:
  - 云端同步、账号登录、在线多人协作、多维数据库视图（留待未来版本）
- **Constraints**:
  - 必须纯本地离线可用，不发起任何外网请求
  - 文件系统操作必须具备防抖与原子安全写入，防止损坏用户笔记

---

## Proposed Architecture

系统采用经典 **Tauri 2.0 (Rust) + React 18 / TypeScript + Tiptap** 双进程分离架构：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        macOS 桌面独立客户端                              │
├────────────────────────────────────────────────────────────────────────┤
│  [ Webview 前端渲染进程 (React 18 + TypeScript + Tailwind CSS) ]         │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ 侧边栏: Folder-Notes  │  │ 主工作区: Tiptap 块级编辑器              │ │
│  │  - 复合节点树渲染     │  │  - 页面大标题 (联动文件名)              │ │
│  │  - 拖拽 / 增删改查    │  │  - 10 种核心 Block NodeViews             │ │
│  │  - 展开/折叠状态      │  │  - 六点手柄 ⠿ (拖拽调序)               │ │
│  │  - 冲突提示弹窗       │  │  - Esc 两态 (Edit Mode / Select Mode)   │ │
│  └──────────┬────────────┘  │  - SlashCommand 浮动菜单 ("/")           │ │
│             │               │  - tiptap-markdown 纯净序列化            │ │
│             │               └───────────────────┬────────────────────┘ │
│             │                                   │                      │
│             └─────────────────┬─────────────────┘                      │
│                               ▼                                        │
│             [ Tauri IPC Client (invoke / listen) ]                     │
└───────────────────────────────┼────────────────────────────────────────┘
                                │ IPC (Tauri v2 RPC)
┌───────────────────────────────▼────────────────────────────────────────┐
│  [ Tauri Core 原生进程 (Rust) ]                                         │
│                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│  │ 原生窗口与配置管理   │  │ 文件系统 I/O 服务    │  │ 本地监听服务  │ │
│  │  - 记忆上次工作区    │  │  - 递归扫描目录树    │  │  - notify 库  │ │
│  │  - 系统文件夹对话框  │  │  - 原子写入与防抖    │  │  - 防抖通知   │ │
│  │  - 首次自动生成示例  │  │  - 标题双向重命名    │  │  - 外部变更   │ │
│  │    Welcome.md        │  │  - 剪贴板图片落盘    │  │    Event 推送 │ │
│  └──────────────────────┘  └──────────────────────┘  └───────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Interfaces and Contracts

### 1. Tauri IPC Commands (Rust 导出给前端调用)

| 命令名称 | 参数 | 返回值 | 职责与行为 |
|---|---|---|---|
| `select_workspace_dir` | 无 | `Option<String>` | 调起 macOS 原生选择文件夹面板，返回用户选取的目录路径 |
| `get_current_workspace` | 无 | `Option<String>` | 读取本地持久化配置，获取上次记住的工作区路径 |
| `set_current_workspace` | `path: String` | `Result<(), String>` | 记住当前工作区路径到系统配置目录 |
| `scan_workspace_tree` | `workspace_path: String` | `Result<Vec<FileTreeNode>, String>` | 递归扫描目录，输出 Folder-Notes 聚合结构树 |
| `read_file_content` | `file_path: String` | `Result<String, String>` | 以 UTF-8 读取文件内容，自动防范非法路径穿透 |
| `write_file_content` | `file_path: String, content: String` | `Result<(), String>` | 原子写入（先写临时的 `.tmp` 再安全 rename），防止写坏 |
| `create_page` | `parent_dir: String, title: String` | `Result<FileTreeNode, String>` | 创建新 `.md` 文件（如不存在则按需创建同名目录） |
| `rename_page_and_folder` | `old_md_path: String, new_title: String`| `Result<String, String>` | 同时重命名 `.md` 文件及同名子文件夹（若存在） |
| `delete_page_and_folder` | `md_path: String` | `Result<(), String>` | 删除 `.md` 文件并安全删除同名子目录（若存在） |
| `save_clipboard_image` | `workspace_path: String, image_bytes: Vec<u8>` | `Result<String, String>` | 写入 `assets/img-<timestamp>.png` 并返回相对路径 |

### 2. Tauri Events (Rust 推送给前端)

- **`workspace-changed`**: 当底层 `notify` 发现工作区有文件新增、删除或重命名时触发，携带变更的相对路径。
- **`active-file-modified-externally`**: 当外部进程修改了当前前端正在打开的文档时触发，前端用于判断并弹出冲突提示。

### 3. Folder-Notes 数据结构 (TypeScript)

```typescript
export interface FileTreeNode {
  id: string;               // 唯一节点标识 (绝对路径哈希或相对路径)
  name: string;             // 页面显示名称 (去除 .md 后缀)
  filePath: string;         // 底层 .md 文件的绝对路径
  folderPath?: string;      // 若拥有子页面，对应的同名文件夹路径
  hasSubpages: boolean;     // 是否拥有子页面
  children: FileTreeNode[]; // 递归子页面列表
}
```

---

## Editor Engine & Markdown Serializer Design

### 1. Tiptap Node 扩展矩阵

| Block 类型 | Tiptap Node / Extension | 前端渲染表现 | 序列化 Markdown 语法 |
|---|---|---|---|
| 段落 | `Paragraph` | 标准文本行，支持行内粗体/斜体/代码 | `一段文字\n\n` |
| 主标题~小标题 (H1~H4) | `Heading` (levels 1, 2, 3, 4) | 28px / 24px / 20px / 16px 粗体 | `# H1\n\n`, `## H2\n\n`, `### H3\n\n`, `#### H4\n\n` |
| 无序列表 | `BulletList` + `ListItem` | 圆点符号，支持嵌套 | `- Item 1\n- Item 2\n\n` |
| 有序列表 | `OrderedList` + `ListItem` | 递增数字，支持嵌套 | `1. Item 1\n2. Item 2\n\n` |
| 待办清单 | `TaskList` + `TaskItem` | 原生复选框，勾选文字置灰中划线 | `- [ ] 待办\n- [x] 已完成\n\n` |
| 引用块 | `Blockquote` | 左侧 4px 灰色高亮竖线装饰 | `> 引用文字\n\n` |
| 代码块 | `CodeBlockLowlight` | 深色卡片背景，等宽字体，支持语言标签 | ```` ```ts\ncode\n``` ```` |
| 分割线 | `HorizontalRule` | 细灰色水平分割线 | `---\n\n` |
| Callout 框 | 自定义 `CalloutNode` | 浅蓝/浅黄背景卡片，带 💡/⚠️ 图标 | `> [!NOTE]\n> 内容\n\n` (GFM 标准) |
| 本地图片 | `ImageNode` | 圆角边框图片预览，支持拖拽自适应 | `![](assets/img-xxx.png)\n\n` |

### 2. 块两态选择与拖拽手柄机制 (Block Two-State & Handle)

1. **手柄悬浮 (Drag Handle)**：
   - 使用 ProseMirror 插件，在鼠标 `mousemove` 时检测当前悬浮的 Top-level Block 坐标。
   - 在该 Block 左侧绝对定位渲染六点手柄（⠿）。
   - 手柄设置 `draggable="true"`，拖拽时通过 ProseMirror `DropCursor` 插件在目标缝隙展示蓝色水平指示线，放开鼠标时调用 `tr.delete().insert()` 移动节点。
2. **两态键盘流**：
   - 监听键盘 `keydown`：
     - 若按下 `Esc`：捕获事件，根据当前光标位置创建 `NodeSelection.create(doc, blockPos)`，高亮整个块节点（添加 CSS 外框），失焦内部文本。
     - 在 `NodeSelection` 激活态下：
       - 按 `ArrowDown` / `ArrowUp`：查找上一个/下一个同级块并切换 `NodeSelection`。
       - 按 `Backspace`：`tr.deleteSelection()` 一键删除该块。
       - 按 `Enter`：将选区切入块内首个文本偏移并恢复光标，无缝返回编辑态。

---

## Data, Security, and Storage Boundaries

1. **100% 本地数据隔离**：
   - 所有文件保存在用户指定的本地工作区目录。
   - 不依赖 SQLite 或专有二进制格式，数据纯粹由标准文件和文件夹组成。
   - 用户任何时候都能直接用访达（Finder）、VS Code、Obsidian 打开或备份整个工作区。
2. **原子写入保护 (Atomic Write)**：
   - 为避免停电或崩溃导致截断写坏文件，Rust 写入逻辑执行：
     `写入同目录隐藏临时文件 .<filename>.<uuid>.tmp ➔ fsync 刷盘 ➔ 覆盖重命名为目标文件`。
3. **路径穿透防御 (Path Traversal Protection)**：
   - Rust 校验所有操作的文件路径必须严格属于当前工作区根路径的子集，拒绝任何 `../` 越界路径。

---

## Failure Modes and Recovery

| 故障场景 | 潜在影响 | 防御与恢复策略 |
|---|---|---|
| 编辑中应用崩溃 | 丢失未保存的内容 | 采用 1000ms 短防抖自动落盘；同时前端将当前正在编辑的内容做 LocalStorage 应急缓存 |
| 重命名文件名包含非法字符 | 操作系统抛出异常 | 前端输入过滤 + Rust 层过滤非法字符（`/\:*?"<>|`），提示用户合法名称 |
| 外部程序修改当前正在打字的文件 | 并发覆盖用户输入 | 捕获 `notify` 事件，若 `isDirty == true`，弹出冲突 Modal 供用户二选一决定 |
| 粘贴特大图片文件 | 内存占用剧增 | 前端限制剪贴板图片大小（最大 20MB），超大图片抛出 Toast 告警 |

---

## Verification Design

| 验证项 | 验证手段 | 预期证据与产物 |
|---|---|---|
| **Markdown 往返无损 (Round-trip)** | 自动化单元测试 (Vitest) | 10 种块类型经过 `Markdown ➔ Tiptap AST ➔ Markdown` 字符级无损验证通过 |
| **Folder-Notes 树解析与联动** | 单元测试 + 集成测试 | 验证 `.md` + 同名目录的合并渲染、重命名与删除同步 |
| **Tauri 应用构建与启动** | 真实本地执行与探针验证 | Tauri 2.0 在当前 macOS 上成功编译、打包并启动窗口 |
| **两态块选择与键盘流** | UI 交互测试 / 手动验证 | `Esc` 激活块选中外框、上下键转移选中、回车进入编辑流畅无跳动 |
| **防抖持久化与原子落盘** | 文件监控与内容断言 | 编辑输入 1 秒后磁盘文件内容更新，文件格式为标准纯净 CommonMark |

---

## Approval

- Required Human Gates: Architecture Decision (Tauri 2.0 + Tiptap + Folder-Notes)
- Decision: `PROPOSED` (待用户审阅)
