import "dotenv/config"
import ShortTurnMemory from "./core/ShortTurnMemory"
import SkillManager from "./core/SkillManager"
import { PowerShellTool } from "./tools/PowerShellTool"
import { BashTool } from "./tools/BashTool"
import { WebSearchTool } from "./tools/WebSearchTool"
import { SendMessageTool } from "./tools/SendMessageTool"
import { GetAgentInfoTool } from "./tools/GetAgentInfoTool"
import ToolsManager from "./core/ToolsManager"
import TerminalUI from "./terminal/TerminalUI"
import CommandExecuter from "./terminal/CommandExecuter"
import type { Model } from "./types/types"
import Agent from "./agents/Agent"
import { buildUserMessage } from "./agents/Messages"

// Agent管理 - 管理多Agent实例，共享核心依赖（单例模式）
import agentManager from "./core/AgentManager"

// ========================
// 1. 核心配置
// ========================
// 为每个Agent创建独立的短期记忆实例，按agent name隔离
const bossAgentMemory = new ShortTurnMemory({
  id: "boss-agent",
  persist: true,
  maxLength: 50,
})

const coderAgentMemory = new ShortTurnMemory({
  id: "coder-agent",
  persist: true,
  maxLength: 50,
})

const testAgentMemory = new ShortTurnMemory({
  id: "tester-agent",
  persist: true,
  maxLength: 50,
})

const pmAgentMemory = new ShortTurnMemory({
  id: "pm-agent",
  persist: true,
  maxLength: 50,
})

// 技能管理器 - 自动扫描全局、项目、插件目录下的所有技能
const skillManager = new SkillManager()

// 工具管理器 - 统一管理所有系统工具，自动注入到Agent中
const toolsManager = new ToolsManager()
  .register(PowerShellTool)
  .register(BashTool)
  .register(WebSearchTool)
  .register(SendMessageTool)
  .register(GetAgentInfoTool)

// 默认模型配置 - 请根据实际使用的大模型参数修改
const DEFAULT_MODEL: Model = {
  name: process.env.MODEL_NAME || "",
  apiKey: process.env.MODEL_API_KEY || "",
  baseURL: process.env.MODEL_BASE_URL || "",
}

agentManager.registerAgent(
  new Agent({
    name: "boss-agent",
    description:
      "团队主脑 & 通用助理，负责统筹任务、调度角色、决策优先级、推进项目闭环",
    systemPrompt: `
你是团队主脑与通用助理，冷静理性、统筹全局。
核心职责：
- 接收目标，拆解任务，分配给程序员/测试/产品
- 协调沟通，推进进度，解决阻塞，确保项目落地
- 做决策、定优先级、把控整体方向
- 汇总所有角色输出，给出最终结论
回答规则：
1. 语气客观、清晰、有条理、不情绪化
2. 指令明确，分配清晰，推动执行
3. 只输出有效信息，不废话、不闲聊
4. 专业、高效、可落地
`.trim(),
    model: DEFAULT_MODEL,
    memory: bossAgentMemory,
    skillManager,
    toolsManager,
  })
)

agentManager.registerAgent(
  new Agent({
    name: "coder-agent",
    description: "专业程序员，负责代码实现、bug修复、架构设计、技术方案输出",
    systemPrompt: `
你是专业程序员，输出**极度准确、极度简洁**，只讲技术事实。
核心能力：
- 编写可运行代码，定位并修复bug
- 输出技术方案、接口设计、数据结构、逻辑实现
- 评估工作量、技术风险、依赖与可行性
回答规则：
1. 语言极简，不解释无关内容，不情绪化
2. 技术内容100%准确、可执行、可落地
3. 只回答技术问题，不闲聊、不吐槽
4. 有问题直接报问题，有方案直接给方案
`.trim(),
    model: DEFAULT_MODEL,
    memory: coderAgentMemory,
    skillManager,
    toolsManager,
  })
)

agentManager.registerAgent(
  new Agent({
    name: "tester-agent",
    description: "专业测试工程师，负责验证功能、发现bug、输出测试结论",
    systemPrompt: `
你是专业测试工程师，严谨、客观、只讲结果。
核心能力：
- 执行测试用例，接口/功能/流程全覆盖验证
- 复现bug，明确问题等级、影响范围、复现步骤
- 输出测试报告：通过/不通过、缺陷清单
回答规则：
1. 只讲客观结果，不情绪化、不抱怨
2. 问题描述清晰、可复现、可定位
3. 只输出测试相关专业内容
4. 简洁、准确、无废话
`.trim(),
    model: DEFAULT_MODEL,
    memory: testAgentMemory,
    skillManager,
    toolsManager,
  })
)

agentManager.registerAgent(
  new Agent({
    name: "pm-agent",
    description: "专业产品经理，负责需求定义、功能规划、业务逻辑、优先级排序",
    systemPrompt: `
你是专业产品经理，清晰、严谨、业务导向。
核心能力：
- 定义需求、撰写清晰功能说明、业务流程
- 明确字段、规则、边界、异常场景
- 排需求优先级，给出迭代规划
回答规则：
1. 需求表达清晰、无歧义、可落地
2. 逻辑完整，覆盖正常/异常流程
3. 只输出产品专业内容
4. 简洁、理性、不情绪化
`.trim(),
    model: DEFAULT_MODEL,
    memory: pmAgentMemory,
    skillManager,
    toolsManager,
  })
)

// ========================
// 2. 命令与交互
// ========================

// 终端UI - 处理用户输入输出
const terminalUI = new TerminalUI({
  onInput: async (input: string): Promise<any> => {
    const trimInput = input.trim()
    if (!trimInput) return

    const currentAgent = agentManager.getCurrentAgent()
    const agentName = agentManager.getCurrentAgent().name

    try {
      // 优先处理命令输入(过滤命令)
      if (commandExecuter.isCommand(trimInput)) {
        await commandExecuter.executeCommand(trimInput)
        return { content: "", agentName }
      }
      // 输出对话
      const userMessage = buildUserMessage(trimInput)
      const content = await currentAgent.chat(userMessage)
      return { content, agentName }
    } catch (e: unknown) {
      return terminalUI.printError(`处理失败: ${(e as Error)?.message}`)
    }
  },
})

// 命令解析器 - 处理系统命令（切换Agent、管理技能等
const commandExecuter = new CommandExecuter({
  terminalUI,
})
