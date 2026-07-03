# Agent Buddy final console menu implementation

This document records the full Agent Buddy Desktop console information architecture implemented in the current MVP UI pass.

## Product direction

Agent Buddy is no longer treated as a single expert marketplace page. The product shell is now organized as a local Agent Console around the main governance objects:

```text
Overview
Instances
Agents
Knowledge
Wiki
Memory
Sessions
Settings
```

This matches Agent Buddy's role as the local Edge Plane: install, inject, synchronize, and govern agents, runtimes, knowledge, memory, sessions, MCP, skills, audit, and PaaS sync.

## Top-level navigation

```text
概览
├── 总体总览
└── 健康看板

实例
├── 实例列表
├── 实例分组
├── 实例详情
└── 安装向导

智能体
├── 市场
├── 团体
├── 专家
├── 能力 / 技能
├── 能力 / 连接器
├── 能力 / 工具
├── 知识
└── 记忆

知识
├── 知识中心
├── 帮助支持
└── API 引用

Wiki
├── 知识中心
├── 帮助支持
└── API 引用

记忆
└── 服务

会话
├── 总览
├── 活跃
└── 历史

设置
├── 常规设置
├── 安全设置
├── 通知策略
├── 备份还原
└── 企业管理
```

## Implemented UI shell

The new `App.tsx` implements a complete console layout:

```text
ConsoleShell
├── ConsoleSidebar
├── ConsoleTopbar
├── ConsoleStatus
└── Route Renderer
```

The sidebar uses the final menu structure and displays dynamic local counters:

```text
Runtime detected count
Agent source count
Installed agent count
Pending sync count
Active session count
Risk count
```

The topbar provides:

```text
Breadcrumb
Page title
Global search
Health check
Refresh
```

## Implemented pages

### Overview

`overview.dashboard` includes:

```text
Metric cards
Global health donut
Runtime health strip
Recent tasks
Recent audit events
Sync queue
```

`overview.health` includes:

```text
Instance health rows
Risk alert list
Doctor report
Recent tasks
Recent audit events
```

### Instances

`instances.list` renders a unified local instance list from:

```text
RuntimeDetection
AgentInstallation
McpServerConfig
KnowledgeSpace
Memory service synthetic instance
Session service synthetic instance
```

Each instance has:

```text
id
name
type
status
health
group
subtitle
path
runtime
tags
```

`instances.groups` groups instances by runtime/service domain.

`instances.detail` provides a tabbed detail shell:

```text
实例概览
对话测试
渠道管理
会话管理
Agent 管理
技能管理
节点管理
用量统计
定时任务
调试工具
上下文诊断
实例日志
```

`instances.installer` turns the previous install wizard into a full six-step flow:

```text
1. 选择来源
2. 选择智能体
3. 环境检查
4. 配置引导
5. 安装计划
6. 确认部署
```

### Agents

`agents.market` renders the unified Bundle Catalog.

`agents.experts` contains:

```text
Agent Source import
Source risk scan
Source detail / license / notice
Expert cards
Raw Markdown preview
Runtime conversion preview
Install controls
```

`agents.teams` adds a team/group shell for future multi-agent groups.

`agents.skills`, `agents.connectors`, and `agents.tools` render marketplace-style management pages using existing Buddy skills, MCP servers, and tool abstractions.

### Knowledge and Wiki

Knowledge pages show:

```text
Knowledge spaces
Knowledge snapshots
Product docs
Help support
API references
```

Wiki pages provide shells for:

```text
Agent Source authoring rules
Agent Bundle specification
Runtime adapter Wiki
MCP / Skill rules
```

### Memory

Memory service page includes:

```text
Memory service endpoint
Memory item count
Memory candidate count
Candidate creation
Candidate approval
Active memory list
```

### Sessions

Session pages include:

```text
Session overview metrics
Session event lists
Handoff packs
Create Handoff form
```

### Settings

Settings pages include shells for:

```text
General settings
Security settings
Notification policy
Backup restore
Enterprise / Agent PaaS connection
```

## Data strategy

This UI pass does not require new database tables. It aggregates existing data already available through Tauri commands:

```text
RuntimeDetection
AgentInstallation
InstallEvent
AuditEvent
SyncOutboxEvent
MemoryItem
MemoryCandidate
KnowledgeSpace
KnowledgeSnapshot
SessionEvent
HandoffPack
AgentSourceSummary
BundleCatalogItem
GeneratedArtifact
```

The `ConsoleInstance` abstraction is currently frontend-derived. It can later move into Rust as a first-class domain object.

## Still deferred

Validation remains intentionally deferred until the feature surface is complete:

```text
npm typecheck
cargo check
Tauri dev run
UI interaction testing
```

Potential next engineering steps:

```text
1. Split App.tsx into page components.
2. Add Rust console aggregation commands.
3. Persist Instance / InstanceGroup / InstanceTag tables.
4. Add real local API daemon runtime.
5. Add platform Deep Link registration.
6. Run build/typecheck validation.
```
