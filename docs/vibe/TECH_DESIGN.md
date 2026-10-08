# Current Architecture — TECH_DESIGN.md

## Overview

DocEditor 是一款类似 “wolai” 的 Local-First 模块化块级（Block-based）桌面文档编辑器，数据 100% 保存在用户本地目录，底层格式为纯净标准 Markdown（CommonMark / GFM 规范），无私有数据锁定。

## Verified Architecture

系统采用 **Tauri 2.0 (Rust) + React 18 / TypeScript + Tiptap** 架构，分为前端渲染层与原生后端服务层：

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        macOS 桌面独立客户端                              │
├────────────────────────────────────────────────────────────────────────┤
│  [ Webview 前端渲染进程 (React 18 + TypeScript + Tailwind CSS) ]         │
│                                                                        │
│  - 侧边栏 (Sidebar.tsx):                                               │
│      Folder-Notes 复合递归树，支持展开/折叠、新建、删除、Emoji 渲染       │
│      当前激活项呈现 Soft Pink 胶囊圆角高亮                             │
│  - 主编辑区 (Editor.tsx & PageHeader.tsx):                             │
│      无边框大标题输入框，500ms 防抖联动底层 .md 文件名重命名             │
│      基于 Tiptap 2.x (ProseMirror)，支持 10 种核心块类型：              │
│        1. 普通段落 (Paragraph)                                         │
│        2. H1 主标题 / H2 大标题 / H3 中标题 / H4 小标题                  │
│        3. 无序列表 / 有序列表                                           │
│        4. 待办清单 (TaskList / TaskItem，支持点击勾选即时联动)            │
│        5. 提示框 (CalloutNode，GFM > [!NOTE] 语法，带 💡 卡片渲染)       │
│        6. 引用块 (Blockquote)                                          │
│        7. 代码块 (CodeBlock)                                           │
│        8. 分割线 (HorizontalRule)                                      │
│        9. 本地图片 (Image，支持剪贴板粘贴写入 assets/)                  │
│  - 斜杠菜单 (SlashMenu.tsx):                                           │
│      输入 "/" 唤起浮动命令面板，支持拼音简码 (/wb, /dblb, /h1~/h4 等)    │
│  - 块级两态模式 (handleKeyDown):                                        │
│      光标处按 Esc 转换为整块选中高亮 (NodeSelection)，上下键转移，      │
│      回车重入编辑                                                      │
│  - 纯净持久化 (tiptap-markdown & useAutoSave):                         │
│      1000ms 防抖自动原子落盘，Cmd+S 即时保存，零私有 HTML 注释污染        │
│                                                                        │
│                             │ Tauri IPC (invoke / listen)              │
│                             ▼                                          │
│  [ Tauri 2.0 原生后端 (Rust) ]                                         │
│                                                                        │
│  - src-tauri/src/workspace.rs:  配置持久化 (记录上次工作区路径)         │
│  - src-tauri/src/tree.rs:       Folder-Notes 树扫描算法                │
│  - src-tauri/src/operations.rs: 页面新建、级联重命名、删除与图片落盘     │
│  - src-tauri/src/fs_utils.rs:   路径防穿透校验与原子写入保护 (.tmp 刷盘) │
│  - src-tauri/src/watcher.rs:    notify 目录热监听 (300ms 防抖)          │
│  - src-tauri/src/welcome.rs:    空目录自动生成演示 Welcome.md           │
└────────────────────────────────────────────────────────────────────────┘
```

## Supported Commands

- 开发调试：`npm run dev` 或 `npx @tauri-apps/cli dev`
- 前端测试：`npm test` (Vitest)
- 后端测试：`cd src-tauri && cargo test`
- 生产构建：`npm run build`
- 桌面打包：`npx @tauri-apps/cli build`
