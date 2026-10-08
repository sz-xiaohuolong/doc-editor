# Project

## Current Positioning

- Project Name: doc-editor
- Current Release: `v0.1.0` (待冻结)
- Quality Profile: `Standard`
- Product Summary: 类似 “wolai” 的块级 (Block-based) 本地文档编辑器，第一版纯本地文件存储，不含云同步。
- Primary Users: 习惯块级笔记/知识管理、重视数据隐私与本地离线可用的个人用户。

## Current Product Boundaries

- In Scope:
  - 核心块级编辑器（多类型 Block、快捷键、斜杠 `/` 菜单）
  - 本地文档目录树管理（创建、重命名、层级、删除）
  - 纯本地数据持久化（读写本地文件系统或工作区目录）
- Out of Scope (第一版明确排除):
  - 云端同步与多端同步服务
  - 用户账号与鉴权登录系统
  - 多人实时协同编辑
  - 复杂的外部集成或公共分享链接

## Document Map

权威索引见根目录 [DOCUMENT_MAP.md](../../DOCUMENT_MAP.md)。

## Supported Commands

| 目的 | 命令 | 备注 |
|---|---|---|
| Setup | `待确认` | 项目技术选型确定后建立 |
| Dev | `待确认` | 开发服务启动命令 |
| Test | `待确认` | 单元/端到端测试 |
| Build | `待确认` | 构建产物打包 |

## Current Risks and Constraints

- 块级编辑器数据模型与本地文件存储格式设计直接影响未来的扩展性（如双链、反向引用、导出 Markdown 等）。
- 桌面客户端方案 (Tauri / Electron) 与纯本地 Web / Local Server 方案在用户体验与环境依赖上有显著差异。
