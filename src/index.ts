import ShortTurnMemory from "./core/ShortTurnMemory"
import SkillManager from "./core/SkillManager"
import {
  PowerShellTool,
  PowerShellToolDefinition,
} from "./tools/PowerShellTool"
import { BashTool, BashToolDefinition } from "./tools/BashTool"
import { WebSearchTool, WebSearchToolDefinition } from "./tools/WebSearchTool"
import {
  SendMessageTool,
  SendMessageToolDefinition,
} from "./tools/SendMessageTool"
import {
  GetAgentInfoTool,
  GetAgentInfoToolDefinition,
} from "./tools/GetAgentInfoTool"
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
const generalAgentMemory = new ShortTurnMemory({
  id: "general-agent",
  persist: true,
  maxLength: 100,
})

const codeAgentMemory = new ShortTurnMemory({
  id: "code-agent",
  persist: true,
  maxLength: 100,
})

const testAgentMemory = new ShortTurnMemory({
  id: "test-agent",
  persist: true,
  maxLength: 100,
})

// 技能管理器 - 自动扫描全局、项目、插件目录下的所有技能
const skillManager = new SkillManager()

// 工具管理器 - 统一管理所有系统工具，自动注入到Agent中
const toolsManager = new ToolsManager()
  .register(PowerShellTool, PowerShellToolDefinition)
  .register(BashTool, BashToolDefinition)
  .register(WebSearchTool, WebSearchToolDefinition)
  .register(SendMessageTool, SendMessageToolDefinition)
  .register(GetAgentInfoTool, GetAgentInfoToolDefinition)

// 默认模型配置 - 请根据实际使用的大模型参数修改
const DEFAULT_MODEL: Model = {
  name: "deepseek-v3-2-251201",
  apiKey: "beb5cb1b-b298-486f-9b7a-3e0a3e0a68ee",
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
}

agentManager.registerAgent(
  new Agent({
    name: "general-agent",
    description: "通用智能助手，支持代码执行、技能调用和多轮对话",
    systemPrompt:
      "你是一个通用智能助手助手，可以帮用户解答技术问题、编写调试代码、调用工具完成任务。回答简洁准确，需要时主动调用工具。",
    model: DEFAULT_MODEL,
    memory: generalAgentMemory,
    skillManager,
    toolsManager,
  })
)
agentManager.registerAgent(
  new Agent({
    name: "code-agent",
    description: "程序员助手,支持代码执行,技能调用和多轮对话",
    systemPrompt:
      "你是一个讲话极度精准简洁的程序员，可以帮用户解答技术问题、编写调试代码、调用工具完成任务, 需要时主动调用工具。",
    model: DEFAULT_MODEL,
    memory: codeAgentMemory,
    skillManager,
    toolsManager,
  })
)
agentManager.registerAgent(
  new Agent({
    name: "test-agent",
    description:
      "专业测试工程师，支持测试用例设计、接口测试、自动化脚本、缺陷定位、问题复现、流程验证",
    systemPrompt: `
你是一名专业、严谨、高效的资深测试工程师。
规则：
1. 回答精准、简洁、专业，不冗余
2. 可根据需求输出完整测试用例、接口测试方案、测试流程
3. 支持缺陷分析、复现步骤、原因定位、修复建议
4. 可编写接口自动化、脚本测试、数据验证
5. 需要时主动调用工具执行代码、发送请求、验证结果
6. 多轮对话保持上下文，持续跟进任务直到完成
`.trim(),
    model: DEFAULT_MODEL,
    memory: testAgentMemory,
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
