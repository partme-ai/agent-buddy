# WorkBuddy-inspired Agent Buddy UI reference

This document records the UI direction for Agent Buddy based on the provided WorkBuddy screenshot.

## UI observations

The reference UI uses a product-console layout:

```text
Left workspace sidebar
  ↓
Top module tabs
  ↓
Search and quick action area
  ↓
Featured scenario carousel
  ↓
Expert / expert-team tabs
  ↓
Category chips
  ↓
Card grid
```

The key impression is not a dense admin dashboard. It feels like a local marketplace / workspace catalog where users browse useful experts, then install or activate them.

## Agent Buddy adaptation

Agent Buddy should adapt this UI pattern, but use Agent Buddy's own product model:

```text
WorkBuddy Expert      → Agent Buddy Agent / Bundle
WorkBuddy Skill       → Agent Buddy Skill Package
WorkBuddy Connector   → Agent Buddy MCP / Connector
精选场景               → Agent Source / Runtime scenario packs
我的专家               → Installed Agents
```

## Recommended navigation

Left sidebar:

```text
新建任务
我的智能体
智能体源
运行环境
技能
连接器
知识库
记忆
会话
审计同步
更多
```

Workspace list:

```text
Agent PaaS
Agent Buddy
Agent SaaS
Imported Sources
Local Projects
```

Top tabs inside Agent Buddy:

```text
专家 / 智能体
技能
连接器
知识
记忆
会话
运行环境
```

## Home page structure

### 1. Featured Scenarios

Horizontal cards similar to WorkBuddy's selected scenarios:

```text
PaaS 智能体
  - 我可安装的企业智能体
  - 最近更新的 Bundle
  - 需要升级的 Bundle

本地导入
  - agency-agents-zh
  - GitHub Source
  - Local Directory Source

编程工具
  - Claude Code
  - Codex
  - OpenCode
  - Cursor / TRAE

企业运营
  - WorkBuddy
  - Hermes
  - MCP Connectors

知识与记忆
  - Knowledge Mirror
  - Memory Center
  - Session Handoff
```

### 2. Expert tabs

Use tabs:

```text
专家
专家团
本地已安装
可更新
待确认
```

Agent Buddy meaning:

| Tab | Meaning |
|---|---|
| 专家 | Single Agent Bundle / Local Agent |
| 专家团 | Team / Agent Pack / Source category |
| 本地已安装 | AgentInstallation records |
| 可更新 | Bundle diff / Source refresh changed |
| 待确认 | Install Plan / Memory Candidate / Approval |

### 3. Category chips

Use chips for:

```text
全部
OPC-一人公司
腾讯专区
产品设计
技术工程
金融投资
游戏空间
数据智能
营销增长
内容创作
销售商务
运营人力
项目质量
法务安全
行业顾问
```

For imported sources, chips should be generated from categories in the source.

### 4. Cards

Agent card content:

```text
Avatar / icon
Agent name
Source name
Short description
Tags
Install status
Primary action
Secondary actions
```

Actions:

```text
查看详情
预览 Markdown
转换预览
安装
升级
打开目录
```

## Design rules

1. Use a calm light workspace background.
2. Cards should be rounded, low-shadow, and content-forward.
3. Keep enterprise-heavy concepts behind secondary panels.
4. Default interaction should be browse → preview → install.
5. Installation must remain a confirmed action; never install immediately after source import.
6. PaaS Bundle and Local Source Bundle should be visually unified, but their origin should be visible.

## Agent Buddy page mapping

| WorkBuddy UI area | Agent Buddy equivalent |
|---|---|
| Left navigation | Local workspace modules |
| 专家 tab | Agent / Bundle catalog |
| 技能 tab | Skill registry / SkillHub / skills.sh |
| 连接器 tab | MCP registry / connector install |
| 精选场景 | Source + Runtime + enterprise scenarios |
| 专家卡片 | Agent Bundle / LocalAgent card |
| 我的专家 | Installed Agents |
| 搜索专家 | Search agents by name/source/description |

## Implementation target

The current MVP UI already has the functional panels. The next frontend pass should reorganize them into:

```text
AppShell
  - Sidebar
  - TopNav
  - MainContent
    - FeaturedScenarios
    - BundleCatalog
    - AgentGrid
    - InspectorDrawer
```

The existing functional panels should become detail drawers or secondary pages instead of all rendering vertically on the home page.
