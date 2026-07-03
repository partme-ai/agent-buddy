export type FinalMenuSection =
  | 'overview'
  | 'instances'
  | 'agents'
  | 'knowledge'
  | 'wiki'
  | 'memory'
  | 'sessions'
  | 'settings'

export type FinalMenuPageKey =
  | 'overview.summary'
  | 'overview.health'
  | 'instances.list'
  | 'instances.groups'
  | 'instances.detail'
  | 'instances.install'
  | 'agents.market'
  | 'agents.teams'
  | 'agents.experts'
  | 'agents.abilities.skills'
  | 'agents.abilities.connectors'
  | 'agents.abilities.tools'
  | 'agents.knowledge'
  | 'agents.memory'
  | 'knowledge.center'
  | 'knowledge.support'
  | 'knowledge.api'
  | 'wiki.center'
  | 'wiki.support'
  | 'wiki.api'
  | 'memory.service'
  | 'sessions.overview'
  | 'sessions.active'
  | 'sessions.history'
  | 'settings.general'
  | 'settings.security'
  | 'settings.notifications'
  | 'settings.backup'
  | 'settings.enterprise'

export type PageCompletionStatus = 'complete-shell' | 'data-wired' | 'action-wired' | 'future-enhancement'

export interface FinalMenuPageSpec {
  key: FinalMenuPageKey
  section: FinalMenuSection
  title: string
  description: string
  primaryBlocks: string[]
  primaryActions: string[]
  dataSources: string[]
  emptyStates: string[]
  completionStatus: PageCompletionStatus
}

export const FINAL_MENU_PAGE_SPECS: FinalMenuPageSpec[] = [
  {
    key: 'overview.summary',
    section: 'overview',
    title: '总体总览',
    description: '本地 Agent Console 的全局运行状态，面向日常巡检。',
    primaryBlocks: ['指标卡', '全局健康状态', 'Runtime 检测条', 'Sync Flush Plan', '最近事件'],
    primaryActions: ['刷新', '运行 Agent Doctor', '打开安装向导'],
    dataSources: ['RuntimeDetection', 'AgentInstallation', 'SessionEvent', 'SyncOutboxEvent', 'AuditEvent', 'DoctorReport'],
    emptyStates: ['无 Runtime', '无同步事件', '无最近事件'],
    completionStatus: 'data-wired',
  },
  {
    key: 'overview.health',
    section: 'overview',
    title: '健康看板',
    description: '集中查看 Runtime、MCP、Memory、Knowledge、Session、Sync 的健康与风险。',
    primaryBlocks: ['Agent Doctor', '风险告警', '最近任务', '同步失败', 'Runtime 健康表'],
    primaryActions: ['重新诊断', '查看风险', '查看同步事件'],
    dataSources: ['DoctorReport', 'AuditEvent', 'InstallEvent', 'SyncOutboxEvent', 'RuntimeDetection'],
    emptyStates: ['未运行 Doctor', '无风险事件', '无同步失败'],
    completionStatus: 'data-wired',
  },
  {
    key: 'instances.list',
    section: 'instances',
    title: '实例列表',
    description: '统一展示 Runtime、Agent 安装、MCP、Knowledge、Memory、Session、Local API 实例。',
    primaryBlocks: ['实例工具栏', '卡片视图', '列表视图', '状态筛选', '批量操作'],
    primaryActions: ['添加实例', '切换视图', '搜索', '筛选', '批量操作'],
    dataSources: ['RuntimeDetection', 'AgentInstallation', 'McpServerConfig', 'KnowledgeSpace', 'MemoryItem', 'SessionEvent', 'LocalApiSpec'],
    emptyStates: ['无实例', '无筛选结果'],
    completionStatus: 'data-wired',
  },
  {
    key: 'instances.groups',
    section: 'instances',
    title: '实例分组',
    description: '按 Runtime、Agent Installation、MCP、Knowledge、Memory、Session 等分组管理实例。',
    primaryBlocks: ['分组卡片', '实例摘要', '分组操作'],
    primaryActions: ['新增分组', '编辑', '拖拽排序', '设置标签'],
    dataSources: ['Derived ConsoleInstance'],
    emptyStates: ['无分组', '无实例'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'instances.detail',
    section: 'instances',
    title: '实例详情',
    description: '实例级管理入口，覆盖概览、测试、渠道、会话、Agent、技能、节点、用量、任务、配置、调试、日志。',
    primaryBlocks: ['详情 Hero', '实例 Tabs', '实例概览', '上下文诊断', '实例日志'],
    primaryActions: ['修复', '重启', '调试', '查看日志'],
    dataSources: ['Derived ConsoleInstance', 'InstallEvent', 'AuditEvent', 'SessionEvent'],
    emptyStates: ['未选择实例', '无日志'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'instances.install',
    section: 'instances',
    title: '安装向导',
    description: 'Source 到 Runtime 的完整安装流程，导入不等于安装，安装必须经过 Install Plan。',
    primaryBlocks: ['选择来源', '选择智能体', '环境检查', '配置引导', '生成计划', '确认部署'],
    primaryActions: ['风险扫描', '导入来源', '刷新来源', '选择 Runtime', '预览 Bundle', '生成 Install Plan', '确认部署'],
    dataSources: ['AgentSourceSummary', 'LocalAgentSummary', 'RuntimeDetection', 'InstallPlan'],
    emptyStates: ['无来源', '无智能体', '未选择 Runtime', '未生成安装计划'],
    completionStatus: 'action-wired',
  },
  {
    key: 'agents.market',
    section: 'agents',
    title: '智能体市场',
    description: '统一展示 Agent PaaS Bundle、GitHub Source Bundle 和 Local Source Bundle。',
    primaryBlocks: ['市场 Hero', 'Bundle 卡片', '安装状态', '来源标签'],
    primaryActions: ['选择安装', '查看详情', '进入安装向导'],
    dataSources: ['BundleCatalogItem', 'AgentInstallation'],
    emptyStates: ['无 Bundle', '无搜索结果'],
    completionStatus: 'data-wired',
  },
  {
    key: 'agents.teams',
    section: 'agents',
    title: '团体',
    description: '多 Agent Team 的设计入口，先按分类自动形成团体壳。',
    primaryBlocks: ['团体卡片', '成员数', 'Bundle 数', '协作策略占位'],
    primaryActions: ['创建团体', '团体成员', '团体配置', '安装管理'],
    dataSources: ['LocalAgentSummary', 'BundleCatalogItem'],
    emptyStates: ['无团体', '无成员'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'agents.experts',
    section: 'agents',
    title: '专家',
    description: 'Agent Source 导入后的核心专家管理页，支持原文预览、Runtime 转换预览和 Bundle 预览。',
    primaryBlocks: ['专家卡片', 'Runtime Preview 选择', '原始 Markdown', 'Runtime 转换预览', 'Bundle Preview'],
    primaryActions: ['选择专家', '查看原文', '转换预览', '生成 Bundle 预览'],
    dataSources: ['LocalAgentSummary', 'AgentMarkdownPreview', 'AgentRuntimeConversionPreview', 'AgentBundle'],
    emptyStates: ['无专家', '未选择预览'],
    completionStatus: 'action-wired',
  },
  {
    key: 'agents.abilities.skills',
    section: 'agents',
    title: '技能',
    description: '技能市场、我的技能、Runtime 目标路径和安装策略入口。',
    primaryBlocks: ['技能来源', 'Runtime 目标路径', '技能卡片'],
    primaryActions: ['技能市场', '我的技能', '安装', '卸载'],
    dataSources: ['SkillPackage', 'SkillTargetPath', 'MarketplaceSource'],
    emptyStates: ['无技能', '无目标路径'],
    completionStatus: 'data-wired',
  },
  {
    key: 'agents.abilities.connectors',
    section: 'agents',
    title: '连接器',
    description: 'MCP 市场、我的 MCP、MCP 安装和 Local API / MCP 路由表。',
    primaryBlocks: ['MCP 卡片', '权限标签', 'Local API 表'],
    primaryActions: ['MCP 市场', '我的 MCP', 'MCP 安装', '权限策略'],
    dataSources: ['McpServerConfig', 'LocalApiSpec'],
    emptyStates: ['无 MCP', '无 Local API'],
    completionStatus: 'data-wired',
  },
  {
    key: 'agents.abilities.tools',
    section: 'agents',
    title: '工具',
    description: '工具市场入口与生成产物浏览/预览。',
    primaryBlocks: ['工具操作区', 'Generated Artifacts', 'Artifact Preview'],
    primaryActions: ['工具市场', '我的工具', '工具安装', '风险扫描', '预览产物'],
    dataSources: ['GeneratedArtifact'],
    emptyStates: ['无生成产物', '未选择预览'],
    completionStatus: 'action-wired',
  },
  {
    key: 'agents.knowledge',
    section: 'agents',
    title: '智能体知识',
    description: 'Agent 维度的知识装载、知识列表、快照与 Context Pack 入口。',
    primaryBlocks: ['知识装载动作', '知识列表', '知识快照'],
    primaryActions: ['知识装载', 'Context Pack', '镜像计划'],
    dataSources: ['KnowledgeSpace', 'KnowledgeSnapshot'],
    emptyStates: ['无知识空间', '无快照'],
    completionStatus: 'data-wired',
  },
  {
    key: 'agents.memory',
    section: 'agents',
    title: '智能体记忆',
    description: 'Agent 维度记忆列表、候选记忆和审批入口。',
    primaryBlocks: ['记忆列表', '记忆候选'],
    primaryActions: ['审批记忆', '查看冲突'],
    dataSources: ['MemoryItem', 'MemoryCandidate'],
    emptyStates: ['无记忆', '无候选'],
    completionStatus: 'action-wired',
  },
  {
    key: 'knowledge.center',
    section: 'knowledge',
    title: '知识中心',
    description: 'Agent Buddy 产品文档、使用指南、最佳实践与本地知识空间。',
    primaryBlocks: ['产品文档', '使用指南', '最佳实践', '知识列表', '快照'],
    primaryActions: ['查看文档', '查看知识空间'],
    dataSources: ['KnowledgeSpace', 'KnowledgeSnapshot'],
    emptyStates: ['无知识空间', '无文档同步'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'knowledge.support',
    section: 'knowledge',
    title: '帮助支持',
    description: 'FAQ、在线支持、反馈建议入口。',
    primaryBlocks: ['常见问题', '在线支持', '反馈建议'],
    primaryActions: ['查看 FAQ', '提交反馈'],
    dataSources: ['StaticContent'],
    emptyStates: ['无帮助内容'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'knowledge.api',
    section: 'knowledge',
    title: 'API 引用',
    description: 'Local API / MCP 路由表和接口说明。',
    primaryBlocks: ['API 文档', '接口测试占位', '错误码说明', '路由表'],
    primaryActions: ['查看路由', '接口测试'],
    dataSources: ['LocalApiSpec'],
    emptyStates: ['无 Local API'],
    completionStatus: 'data-wired',
  },
  {
    key: 'wiki.center',
    section: 'wiki',
    title: 'Wiki 知识中心',
    description: 'Wiki 维度复用知识中心，但面向项目说明和适配规范。',
    primaryBlocks: ['Wiki 文档', '适配指南', '最佳实践', '知识列表'],
    primaryActions: ['查看 Wiki', '查看适配规范'],
    dataSources: ['KnowledgeSpace', 'KnowledgeSnapshot'],
    emptyStates: ['无 Wiki'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'wiki.support',
    section: 'wiki',
    title: 'Wiki 帮助支持',
    description: 'Wiki 视角的 FAQ、在线支持、反馈建议入口。',
    primaryBlocks: ['常见问题', '在线支持', '反馈建议'],
    primaryActions: ['查看 FAQ', '提交反馈'],
    dataSources: ['StaticContent'],
    emptyStates: ['无帮助内容'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'wiki.api',
    section: 'wiki',
    title: 'Wiki API 引用',
    description: 'Wiki 视角的 Local API / MCP 路由表和接口说明。',
    primaryBlocks: ['API 文档', '接口测试占位', '错误码说明', '路由表'],
    primaryActions: ['查看路由', '接口测试'],
    dataSources: ['LocalApiSpec'],
    emptyStates: ['无 Local API'],
    completionStatus: 'data-wired',
  },
  {
    key: 'memory.service',
    section: 'memory',
    title: '记忆服务',
    description: 'Buddy Memory Provider、候选记忆、审批、回写冲突和服务状态。',
    primaryBlocks: ['服务状态', '提出记忆', '候选审批', '记忆列表', '回写冲突'],
    primaryActions: ['提出记忆', '审批通过', '查看回写计划'],
    dataSources: ['MemoryItem', 'MemoryCandidate', 'MemoryWritebackPlan'],
    emptyStates: ['无记忆', '无候选', '无冲突'],
    completionStatus: 'action-wired',
  },
  {
    key: 'sessions.overview',
    section: 'sessions',
    title: '会话总览',
    description: '会话数量、活跃度、Session Scanner、Handoff Pack 和同步状态。',
    primaryBlocks: ['会话指标', 'Session Scanner', 'Handoff Packs'],
    primaryActions: ['查看活跃会话', '创建 Handoff'],
    dataSources: ['SessionEvent', 'HandoffPack', 'SessionSyncPlan'],
    emptyStates: ['无会话', '无 Handoff'],
    completionStatus: 'data-wired',
  },
  {
    key: 'sessions.active',
    section: 'sessions',
    title: '活跃会话',
    description: '当前可继续的会话列表和 Handoff 创建表单。',
    primaryBlocks: ['活跃会话列表', 'Handoff 表单'],
    primaryActions: ['克隆会话', '创建 Handoff Pack'],
    dataSources: ['SessionEvent'],
    emptyStates: ['无活跃会话'],
    completionStatus: 'action-wired',
  },
  {
    key: 'sessions.history',
    section: 'sessions',
    title: '历史会话',
    description: '历史 Session Event Timeline 和可恢复 Handoff。',
    primaryBlocks: ['历史事件', '可恢复 Handoff'],
    primaryActions: ['恢复会话', '查看 Handoff'],
    dataSources: ['SessionEvent', 'HandoffPack'],
    emptyStates: ['无历史会话', '无 Handoff'],
    completionStatus: 'data-wired',
  },
  {
    key: 'settings.general',
    section: 'settings',
    title: '常规设置',
    description: '设备、PaaS 地址、保留策略、安装模式、同步和遥测配置。',
    primaryBlocks: ['设备配置', 'PaaS URL', '保留策略', '安装模式', '同步/遥测开关'],
    primaryActions: ['保存设置'],
    dataSources: ['AgentBuddySettings'],
    emptyStates: ['无设置文件'],
    completionStatus: 'action-wired',
  },
  {
    key: 'settings.security',
    section: 'settings',
    title: '安全设置',
    description: '安全策略、登录限制、会话管理和审计时间线。',
    primaryBlocks: ['安全策略', '登录限制', '会话管理', '安全审计'],
    primaryActions: ['查看审计', '调整策略'],
    dataSources: ['AuditEvent'],
    emptyStates: ['无审计事件'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'settings.notifications',
    section: 'settings',
    title: '通知策略',
    description: '通知渠道、通知模板、订阅管理。',
    primaryBlocks: ['通知渠道', '通知模板', '订阅管理', '策略卡片'],
    primaryActions: ['配置渠道', '编辑模板', '管理订阅'],
    dataSources: ['StaticContent'],
    emptyStates: ['无通知策略'],
    completionStatus: 'complete-shell',
  },
  {
    key: 'settings.backup',
    section: 'settings',
    title: '备份还原',
    description: '备份任务、备份历史、还原操作和清理策略。',
    primaryBlocks: ['备份任务', '备份历史', '还原按钮'],
    primaryActions: ['创建备份任务', '清理过期备份', '还原'],
    dataSources: ['InstallBackup'],
    emptyStates: ['无备份'],
    completionStatus: 'action-wired',
  },
  {
    key: 'settings.enterprise',
    section: 'settings',
    title: '企业管理',
    description: 'PaaS 连接、设备注册、Bundle Pull、同步、Deep Link、Buddy 状态。',
    primaryBlocks: ['PaaS 连接', 'Device Registration', 'Bundle Pull', 'Sync Preview', 'Deep Link', '企业边界说明'],
    primaryActions: ['执行 Deep Link', '查看同步', '查看 Buddy 状态'],
    dataSources: ['PaasConnectionInfo', 'DeviceRegistrationRequest', 'BundlePullRequest', 'PaasSyncPreview', 'SyncFlushPlan', 'BuddyStatusReport'],
    emptyStates: ['未配置 PaaS', '无同步事件'],
    completionStatus: 'action-wired',
  },
]

export function getFinalMenuPageSpec(key: FinalMenuPageKey): FinalMenuPageSpec | undefined {
  return FINAL_MENU_PAGE_SPECS.find((item) => item.key === key)
}

export function listFinalMenuPagesBySection(section: FinalMenuSection): FinalMenuPageSpec[] {
  return FINAL_MENU_PAGE_SPECS.filter((item) => item.section === section)
}

export function isFinalMenuComplete(): boolean {
  return FINAL_MENU_PAGE_SPECS.length === 29 && FINAL_MENU_PAGE_SPECS.every((item) => item.primaryBlocks.length > 0 && item.primaryActions.length > 0)
}
