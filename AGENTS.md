# AGENTS.md

## 项目概况
- **项目名称**: doc-editor (类 wolai 本地块级文档编辑器)
- **治理规范**: vibe-workflow
- **权威文档地图**: [DOCUMENT_MAP.md](file:///Users/daiyifei/Documents/code/doc-editor/DOCUMENT_MAP.md)

## 核心守则 (Constitution)
1. **工程开始前必须冻结需求**：满足 `Requirement Status == FROZEN`, `Open Questions == None`, `Current Release ID exists`, `Acceptance Goals are testable` 才能进入 SPEC、设计与实现。
2. **What to build is frozen. How to build it is delegated**：不得静默改变产品范围。
3. **Repository is memory. Chat is conversation**：一切关键决策、状态与证据以仓库文档为准。
4. **Human Decision Gates**：产品范围变更、数据 Schema/存储格式、架构方向、敏感破坏性操作必须经人类明确批准。
5. **Fresh verification evidence**：未通过实际运行证据验证不得声称完成。
6. **证据与正文分离**：测试截屏、dump、日志存入 `.evidence/<release-id>/`，不内嵌无关大日志。

## 会话恢复顺序
1. 读取 `AGENTS.md` 与 `DOCUMENT_MAP.md`。
2. 读取 `docs/vibe/PROGRESS.md` 获取当前 Release 与任务状态。
3. 组合 Minimal Sufficient Context 开始工作。
