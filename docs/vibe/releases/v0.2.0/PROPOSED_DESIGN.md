# Proposed Technical Design — v0.2.0

## Control

- Proposal ID: `DESIGN-002`
- Target Release: `v0.2.0`
- Status: `APPROVED`
- Related REQ/AC: `REQ-007` ~ `REQ-010`, `AC-023` ~ `AC-036`
- Baseline SPEC: [docs/vibe/releases/v0.2.0/SPEC.md](SPEC.md)
- Owner: Antigravity
- Last Updated: 2026-10-10

---

## 1. Goal and Architectural Principles

- **核心目标**: 在保留 v0.1.0 所有块级编辑器能力（六点手柄、10种核心块、防抖落盘、热监听）的前提下，实现 3 大关键进阶机制：
  1. **双向链接体系 (WikiLinks & Backlinks)**：Tiptap `WikiLinkNode` 扩展 + 行内药丸标签 + `[[` 联想菜单 + 底部反向链接引用扫描；
  2. **本地全文搜索 (Global Search)**：基于 CJK Unigram/Bigram 分词的毫秒级离线全文索引 + `Cmd+P` 模态弹窗 + 高亮定位；
  3. **多格式本地导入流水线 (Import Pipeline)**：`.md` / `.txt` / `.html` / `.docx` 纯本地安全解析 + 图片转存 `.assets/` + 自动新建页面。
- **宪法原则**:
  - **100% 纯本地、纯 CommonMark 存储**：不依赖远程 API、不依赖私有云端黑盒、不注入非标准 HTML 注释；
  - **零破坏性 (Zero Regression)**：所有已验证功能（Typography、BlockHandle、SlashMenu、Hot Reload）零回退。

---

## 2. Component Architecture Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        macOS 桌面客户端 (v0.2.0)                         │
├────────────────────────────────────────────────────────────────────────┤
│  [ React 18 + TypeScript 前端渲染进程 ]                                 │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │ 侧边栏 Sidebar        │  │ 主编辑区 Editor & Extensions           │ │
│  │  - 搜索按钮 (Cmd+P)   │  │  - WikiLinkNode (药丸内联节点)          │ │
│  │  - Folder-Notes 树    │  │  - WikiLinkMenu ("[[" 键入触发联想)     │ │
│  │  - 导入文件按钮       │  │  - BlockHandle (六点手柄 ⠿)             │ │
│  │    (MD/TXT/HTML/DOCX) │  │  - 底部 BacklinksPanel (反向引用汇总)   │ │
│  └──────────┬────────────┘  └───────────────────┬────────────────────┘ │
│             │                                   │                      │
│             ▼                                   ▼                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 核心业务服务层 (Services)                                         │  │
│  │  1. SearchEngine: CJK 分词 + 倒排索引 + 关键词命中高亮切片        │  │
│  │  2. BacklinksEngine: 遍历工作区文本提取 [[Page]] 引用元组        │  │
│  │  3. ImportPipeline: mammoth (.docx) + html2md + 提取图片到本地   │  │
│  │  4. TauriAPI: 调用底层文件系统与桌面事件 (包含 Web Mock 适配)     │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      │ Tauri IPC / Local FS
┌─────────────────────────────────────▼──────────────────────────────────┐
│  [ Tauri 2.0 / Rust 原生服务层 ]                                        │
│  - 递归文件扫描 (scan_workspace)                                       │
│  - 安全原子读写 (read_document / write_document)                       │
│  - 批量读取与多格式文件存盘                                            │
│  - 媒体资源安全存储 (save_image / .assets/ 目录)                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Designs

### 3.1 块级双向链接 (WikiLinkNode & WikiLinkMenu)
- **Tiptap 行内节点设计 (`WikiLinkNode`)**:
  - `name`: `'wikiLink'`
  - `group`: `'inline'`
  - `inline`: `true`
  - `selectable`: `true`
  - `atom`: `true` (作为一个整体单位被光标移动和退格删除)
  - `attrs`: `{ targetTitle: { default: '' } }`
  - `parseHTML`: 匹配带有 `data-wiki-link` 属性的 `<a>` 或 `<span>`
  - `renderHTML`:
    ```html
    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer font-medium text-[13px] transition-colors border border-rose-200/60" data-wiki-link="true">
      <span class="text-[11px] opacity-70">🔗</span>
      <span>{targetTitle}</span>
    </span>
    ```
  - **点击事件**: 点击触发全局 `onNavigateToPage(targetTitle)`，平滑切换活跃页面。
- **联想输入触发 (`WikiLinkMenu`)**:
  - 在 `Editor.tsx` 中监听 `editor.onUpdate` / `onSelectionUpdate`；
  - 检查光标前紧挨着的字符是否包含 `[[`；
  - 一旦捕获到 `[[` 且未遇到闭合 `]]`，计算光标屏幕坐标，在光标正下方渲染 `WikiLinkMenu` 悬浮浮层；
  - 浮层提供工作区所有页面的列表，支持拼音首字母和中文模糊过滤；
  - 按 <kbd>Enter</kbd> 或鼠标点击时，通过 `editor.chain().deleteRange().insertContent()` 插入 `wikiLink` 节点，并自动补全后续输入；
  - 按 <kbd>Esc</kbd> 退出联想菜单。
- **Markdown 序列化与反序列化**:
  - `tiptap-markdown` 扩展注册：
    - 序列化: 输出 `[[${targetTitle}]]`；
    - 反序列化: 正则 `/\[\[([^\]]+)\]\]/g` 匹配转换为 `wikiLink` 节点。

### 3.2 反向链接扫描面板 (BacklinksPanel)
- **挂载位置**: 紧随正文编辑器末尾，位于 `Editor.tsx` 底部。
- **索引算法 (`scanBacklinks`)**:
  - 输入：当前页面标题 `currentTitle`，工作区所有文件及内容；
  - 规则：扫描工作区内除了当前文件之外的所有 `.md` 文本，匹配正则 `new RegExp(`\\[\\[${escapeRegex(currentTitle)}\\]\\]`, 'g')`；
  - 提取上下文：提取命中行前后文本切片（最多 80 个字符），高亮引用词；
  - 产出结构：
    ```typescript
    interface BacklinkItem {
      sourceFilePath: string;
      sourceTitle: string;
      snippet: string;
    }
    ```
- **UI 呈现**:
  - 顶部显示：`反向链接 · N 个引用` 与展开/收起箭头；
  - 展开卡片：每个引用源渲染为优雅的独立毛玻璃卡片，显示源文档名与上下文文字切片；
  - 点击卡片：直接触发页面切换，无缝导航到引用源文档。

### 3.3 本地全局全文搜索 (GlobalSearchModal & SearchEngine)
- **快捷键绑定**:
  - 全局监听 `window.addEventListener('keydown')`：捕获 `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p'`；
  - 侧边栏顶部“搜索”快捷按钮点击同步唤起。
- **纯本地 CJK 搜索引擎 (`searchEngine.ts`)**:
  - **分词算法 (CJK Tokenizer)**:
    - 纯英文/数字：按词分词；
    - CJK 汉字：单字 Unigram + 相邻双字 Bigram 窗口滑动提取；
  - **倒排建立与评分**:
    - 对工作区所有文档进行索引：大标题权重 5.0，正文内容权重 1.0；
    - 支持匹配度评分排序；
  - **高亮切片提取**:
    - 提取匹配词在正文中的上下文段落（前后各 30 字符），将匹配词包装在 `<mark class="bg-rose-100 text-rose-600 font-semibold px-0.5 rounded">` 中。
- **UI 交互**:
  - 居中毛玻璃模态浮层，自动聚焦输入框；
  - 支持键盘 <kbd>↓</kbd> / <kbd>↑</kbd> 切换选中项，<kbd>Enter</kbd> 打开选中页面并关闭弹窗，<kbd>Esc</kbd> 关闭弹窗。

### 3.4 多格式文件导入流水线 (ImportPipeline & ImportDialog)
- **支持格式**:
  - `.md` / `.markdown`：原生 CommonMark
  - `.txt`：普通文本（转为段落）
  - `.html` / `.htm`：HTML 富文本
  - `.docx`：Word 文档（使用 `mammoth.js` 纯本地解析为 HTML 后转为 Markdown）
- **本地图片转存流水线**:
  - HTML/Word 中若含有 `data:image/...;base64,...` 内嵌图片：
    - 本地将其解析为字节数组；
    - 调用 `saveImageAsset(workspaceRoot, bytes)` 写入工作区 `.assets/img-<timestamp>-<hash>.png`；
    - 将富文本中的 `img src` 重写为本地相对路径 `assets/img-xxx.png`。
- **导入交互**:
  - 侧边栏底部提供“导入文件”按钮，支持原生文件对话框或 Web 模式下的 `<input type="file" multiple>`；
  - 遇到同名文件时，自动计算可用标题如 `页面名 (1)`，防止数据覆盖；
  - 写入磁盘后触发 `refreshTree()`，并自动切换到新导入的页面。

---

## 4. Verification & Testing Strategy

1. **自动化单元测试 (Vitest)**:
   - 验证 `wikiLink` 正则匹配与标准 `[[页面名称]]` 往返序列化；
   - 验证 CJK 单字/双字分词与全文检索相关度算法；
   - 验证 HTML / TXT 转换为纯净 Markdown 的转换器。
2. **端到端测试 (Puppeteer E2E `scripts/verify-v0.2.0.js`)**:
   - 验证在编辑器中输入 `[[` 弹出工作区页面联想菜单，按回车插入药丸节点；
   - 验证点击药丸节点能够切换页面；
   - 验证底部 Backlinks 面板准确统计并展示引用卡片；
   - 验证按下 `Cmd+P` 唤起全局搜索弹窗，输入关键词实时高亮并可通过上下键+回车导航；
   - 验证文件导入功能（模拟导入 `.md` / `.txt` / `.html` 文件并成功渲染到侧边栏与编辑区）；
   - 截取全功能运行截图并保存至 `.evidence/v0.2.0/`。
