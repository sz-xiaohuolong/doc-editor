use std::fs;
use std::path::Path;

pub const WELCOME_CONTENT: &str = r#"# 👋 欢迎使用 DocEditor

这是一款专为你打造的**类 wolai 本地块级（Block-based）文档编辑器**。所有文件均以 100% 纯净的 Markdown 格式保存在你的本地电脑上，拥有绝对的数据主权，且与 Obsidian / VS Code 完美互通。

> [!NOTE]
> 这是一个 **Callout 提示框**（基于 GFM 标准规范）。在空行输入 `/callout` 即可快速插入提示卡片！

---

## 🚀 核心块级积木排版

在编辑区任意行输入 `/`（斜杠），即可呼出快捷命令菜单，快速转换或插入以下常用块：

### 待办任务清单
- [x] 打开本地工作区文件夹
- [ ] 尝试在左侧悬浮鼠标并拖拽六点手柄 ⠿ 调换段落顺序
- [ ] 按下键盘 `Esc` 键体验块选中模式，使用上下键切换选中的块
- [ ] 尝试从剪贴板粘贴一张截图到文档中

#### 代码高亮示例
```typescript
// 纯净 CommonMark，支持等宽代码排版
function greet(name: string): string {
  return `Hello, ${name}! Welcome to your local knowledge base.`;
}
console.log(greet("小火龙"));
```

### 引用与列表
> 知识不仅是记录，更是连接思考的积木。

- 支持无序列表与回车智能续行
- 支持多层嵌套
1. 第一步：在左侧树新建页面
2. 第二步：享受沉浸式打字与自动落盘

祝你在 DocEditor 中书写愉快！
"#;

pub fn ensure_welcome_page(workspace_root: &Path) -> std::io::Result<()> {
    let welcome_path = workspace_root.join("👋 欢迎与快速上手.md");
    if !welcome_path.exists() {
        fs::write(&welcome_path, WELCOME_CONTENT)?;
    }
    Ok(())
}
