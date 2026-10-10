# DocEditor (小火龙文档编辑器) 🐲

> 一款专为本地知识管理者打造的、类似 “wolai” 的模块化块级（Block-based）桌面文档编辑器。
> **100% 纯净 Markdown 存储，数据完全属于本地，零云端绑定。**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri 2.0](https://img.shields.io/badge/Tauri-v2.2-orange.svg)](https://tauri.app)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org)

---

## ✨ 核心特性

- 🧱 **沉浸式块级排版 (Block-based)**：基于 Tiptap (ProseMirror) 工业级编辑器内核，每一段落都是可随意操控的积木。
- ⚡ **原生极致轻量**：采用 **Tauri 2.0 (Rust) + React 18** 构建，相比动辄数百兆的 Electron 应用，DocEditor 仅占用约 30~50MB 内存，毫秒级冷启动。
- 📂 **100% 纯净 CommonMark/GFM 存储**：所有文件保存在用户指定的本地目录，**绝不侵入任何私有 HTML 注释或专有标签**，随时可用 VS Code、Obsidian 打开无缝兼容。
- 🌲 **类 wolai Folder-Notes 页面树**：支持“页面即目录”心智模型，一个页面既能记录正文，也能在名下无限挂载子页面，页面大标题修改自动同步重命名底层文件与子目录。
- ⌨️ **快捷斜杠浮动菜单 (`/`)**：在行内输入 `/` 呼出命令菜单，支持拼音简码过滤（如 `/wb` 文本、`/dblb` 待办、`/h1`~`/h4` 标题、`/callout` 提示框等）。
- 🎯 **块级两态与键盘流**：按 `Esc` 键激活块整选模式，上下方向键转移焦点，回车重入编辑，还原真实的积木操控手感。
- 💡 **丰富块类型**：
  - 普通文本段落
  - 主标题 (H1) / 大标题 (H2) / 中标题 (H3) / 小标题 (H4)
  - 无序列表 / 有序列表
  - 待办任务清单 (TaskList 带即时切换复选框)
  - GFM Callout 提示框 (`> [!NOTE]`，带卡片背景与图标)
  - 代码高亮块、引用块、水平分割线
  - 本地剪贴板图片粘贴（自动拷贝存入 `assets/` 相对路径）
- 🔗 **块级双向链接 (WikiLinks)**：在编辑器任意位置键入 `[[` 弹出工作区页面联想菜单，生成带有 wolai 质感的内联药丸标签，单击平滑跳转，采用标准 `[[页面名称]]` 语法与外部笔记工具无缝互通。
- 🔄 **反向链接面板 (Backlinks)**：文档底部常驻反向链接汇总面板，自动扫描所有引用当前文档的来源文档，提取上下文文本切片，点击卡片直接反向导航。
- 🔍 **本地全局全文搜索 (Global Search)**：全局快捷键 `Cmd+P`（Mac）/ `Ctrl+P`（Windows）随时唤起居中搜索浮层，内置高性能离线 CJK 单字/双字分词引擎，实时高亮匹配关键词，全键盘流移动与回车直达。
- 📥 **多格式本地文件导入流水线**：侧边栏支持导入 `.md`, `.txt`, `.html`, `.docx`，纯本地离线转换，自动转存内嵌图片至 `.assets/`，同名文件自动编号防覆盖。
- 🛡️ **本地文件热监听与并发冲突防护**：后台实时监听工作区文件变动，外部增删文件自动刷新侧栏；外部修改当前正编辑文件时弹出冲突处理确认框。

---

## 🛠️ 技术架构

```text
DocEditor (macOS 桌面客户端)
├── Webview 前端渲染层 (React 18 + TypeScript + Tailwind CSS)
│   ├── 侧边栏：Folder-Notes 复合递归树，支持展开/折叠、增删改查
│   ├── 主编辑区：Tiptap 2.x 块级引擎，支持 10 种核心块及两态流
│   ├── 斜杠菜单：SlashMenu 浮动命令面板与拼音快捷匹配
│   └── 持久化层：tiptap-markdown 纯净双向往返转换
└── Tauri 2.0 原生后端 (Rust)
    ├── 配置管理：记住上次打开的本地工作区路径
    ├── 文件 I/O：原子安全写入保护 (.tmp 刷盘)，路径防穿透校验
    ├── Folder-Notes 扫描：递归聚合同名 .md 与子目录
    ├── 资产管理：剪贴板截图安全落盘至 assets/ 相对路径
    └── 热监听器：基于 notify crate 的 300ms 防抖文件系统监听
```

---

## 🚀 快速开始

### 前置环境要求
- [Node.js](https://nodejs.org) >= 18
- [Rust & Cargo](https://rustup.rs) >= 1.75
- macOS (已内置开发环境)

### 安装依赖与启动
```bash
# 1. 克隆代码仓库
git clone https://github.com/sz-xiaohuolong/doc-editor.git
cd doc-editor

# 2. 安装前端依赖
npm install

# 3. 启动桌面端开发调试模式
npm run tauri dev
```

### 构建打包
```bash
# 运行单元测试
npm test
cd src-tauri && cargo test

# 编译打包 macOS 桌面应用 (.dmg / .app)
npm run tauri build
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 许可证开源。
