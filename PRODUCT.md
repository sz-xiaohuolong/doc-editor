# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Tauri 2.0 (Rust) + React 18 + TypeScript + Tailwind CSS + Tiptap (ProseMirror)

## Users

- 个人知识管理者、深度笔记写作者、开发者。
- 习惯 wolai / Notion 的块级排版与斜杠交互，但对数据主权、本地离线与文件通用性有极高要求的用户。

## Product Purpose

打造一款类似“wolai”的本地离线桌面端块级文档编辑器，提供沉浸流畅的积木式图文排版体验，数据 100% 保存在本地纯净 Markdown 文件中。

## Positioning

真正的 Local-First、100% 纯净 Markdown 兼容的“macOS 原生 wolai”。零私有格式绑定，外部工具（Obsidian、VS Code、Finder）无缝互通。

## Operating Context

- macOS 桌面独立窗口环境。
- 用户指定的本地工作区目录。
- 典型流程：启动应用 ➔ 侧边栏浏览 Folder-Notes 页面树 ➔ 主编辑区打字、回车分块、`/` 唤出命令菜单、拖拽 ⠿ 调序 ➔ 1 秒内防抖自动落盘为纯净 `.md`。

## Capabilities and Constraints

- **Capabilities**:
  - Folder-Notes 页面树层级结构与增删改查。
  - 页面大标题与底层文件名双向联动。
  - 核心 10 种块类型（含 H1-H4 四级标题、待办清单、Callout 提示框、本地图片粘贴）。
  - 块级两态模型（编辑态 vs Esc 选中态）与六点悬浮手柄拖拽排序。
  - 纯净 Markdown 双向无损往返解析与原子安全写入。
  - 本地文件系统热监听与并发冲突保护。
- **Constraints**:
  - 100% 离线，无云端同步与网络依赖。
  - 遵循 CommonMark / GFM 标准，不向文件注入私有 HTML 垃圾注释。

## Brand Commitments

- **视觉与交互对齐 wolai 原生质感**：
  - 浅暖灰侧边栏与纯白主编辑区。
  - 左上角 macOS 交通灯（红黄绿）无缝融合。
  - 激活页面采用轻柔底色胶囊高亮。
  - 页面大标题具备充足呼吸感。
  - 斜杠 `/` 浮动命令面板具备精致圆角、微投影、拼音缩写提示与结构化分组。
  - 六点手柄 ⠿ 提供随心所欲的积木挪动手感。

## Evidence on Hand

- 用户提供的 wolai 实际运行截图：`media_1791452647270_98f28a46.png`。详细呈现了工作区切换器、快捷动作栏、我的页面树、当前激活页高亮、居中大标题、光标下的 `/` 浮动命令菜单（展示四级标题 H1~H4 等）。

## Product Principles

1. **Local-First & Data Sovereignty**：数据主权归属用户，文件纯净可移植。
2. **Tactile Block Fluidity**：积木式操作手感是一等公民，拖拽与键盘流平滑连贯。
3. **Quiet & Focused Editorial**：白纸般安静沉浸，控制控件按需唤现，不打断思考心流。
