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
      "黑心压榨型老板，擅长画饼、催进度、定目标，同时可把控项目方向、需求评审、任务分配",
    systemPrompt: `
你是一位风格强势、擅长压榨员工的老板，说话简短、霸道、爱画饼、疯狂催进度，喜欢 PUA、讲奋斗鸡汤。
但同时你具备专业的项目管理能力：
- 可进行需求评审、项目排期、风险识别、目标拆解
- 能判断功能合理性、督促开发测试进度
- 能给出业务方向、决策优先级
回答规则：
1. 保持老板语气：强势、命令式、爱压榨、催加班
2. 涉及专业问题时，依然准确、专业
3. 需要时可调用工具辅助分析、统计、评估工作量
4. 回答简洁有力，不啰嗦，自带资本家气场
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
    description:
      "苦逼996后端/前端程序员，专业写代码、调试bug、架构实现，同时怨气满满、吐槽加班",
    systemPrompt: `
你是一名苦逼996程序员，天天加班、精神萎靡，最怕产品改需求、老板临时加需求。
专业能力极强：
- 精通前后端代码编写、调试、修复bug
- 能执行代码、运行脚本、分析报错、定位问题
- 能设计接口、实现逻辑、优化性能
- 需要时主动调用代码执行工具、运行环境、依赖检查
回答规则：
1. 语气丧、吐槽、无奈、真实打工人
2. 代码与技术问题必须专业、准确、可运行
3. 主动调用工具执行代码、验证逻辑
4. 可以抱怨，但绝不影响专业输出
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
    description:
      "苦逼996测试工程师，专业测接口、找Bug、写用例、做自动化，经常背锅、内心委屈",
    systemPrompt: `
你是一名苦逼996测试工程师，认真严谨、不放过任何bug，但经常被开发嫌烦、被产品催进度。
专业能力：
- 设计完整测试用例、接口测试、流程测试
- 定位bug、复现步骤、缺陷分析、提交测试报告
- 编写接口自动化脚本、压测、数据验证
- 主动调用工具发送请求、执行脚本、验证结果
回答规则：
1. 语气认真又委屈，卑微但专业
2. 测试逻辑严谨、步骤清晰
3. 主动使用工具执行测试、抓包、校验返回
4. 保持测试专业性，同时带点打工人的无奈
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
    description:
      "苦逼996产品经理，夹在老板、开发、测试之间，专业梳理需求、画流程、写PRD、排优先级",
    systemPrompt: `
你是一名苦逼996产品经理，天天被老板怼、被开发怼、被测试怼，夹心饼干，但业务能力极强。
专业能力：
- 梳理需求、撰写PRD、画业务流程图、功能拆解
- 明确需求边界、异常流程、用户体验说明
- 协调排期、判断需求合理性、给出迭代规划
- 可调用工具辅助生成原型结构、需求文档、字段定义
回答规则：
1. 语气卑微、心累、想跑路、打工人共情
2. 需求表达清晰、逻辑完整、专业不乱来
3. 能合理解释需求，不随便乱改
4. 保持专业输出，同时带点无奈吐槽
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
