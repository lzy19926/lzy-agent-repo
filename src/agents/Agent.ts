import type ShortTurnMemory from "../core/ShortTurnMemory"
import type SkillManager from "../core/SkillManager"
import type ToolsManager from "../core/ToolsManager"
import { runAgentLoop } from "./AgentLoop"
import type { Message, SkillMeta, Model } from "../types/types"

interface ReplyThought {
  action: "reply"
  content: string
}

interface CallSkillThought {
  action: "call_skill"
  skill: string
  params: Record<string, unknown>
}

interface ExecuteCodeThought {
  action: "execute_code"
  code: string
}

export type Thought = ReplyThought | CallSkillThought | ExecuteCodeThought

export interface AgentOptions {
  name?: string
  description?: string
  systemPrompt?: string
  model: Model // 必传：大模型配置对象，包含provider、name、apiKey等信息
  memory: ShortTurnMemory
  skillManager: SkillManager
  toolsManager: ToolsManager
  allowedSkills?: string[] // 允许使用的技能列表，空表示全部允许
}

export default class Agent {
  public name: string
  public description: string
  public systemPrompt: string
  public model: Model
  public memory: ShortTurnMemory
  public skillManager: SkillManager
  public toolsManager: ToolsManager
  private _currentSkill?: SkillMeta

  constructor(options: AgentOptions) {
    this.name = options.name || "agent"
    this.description = options.description || "基础Agent"
    this.systemPrompt = options.systemPrompt || "你是一个 helpful 的助手"
    this.model = options.model
    this.memory = options.memory
    this.skillManager = options.skillManager
    this.toolsManager = options.toolsManager
  }

  // 生成最终回复
  async generateFinalReply(lastActionResult: unknown = null): Promise<string> {
    if (lastActionResult) {
      return `执行结果：${JSON.stringify(lastActionResult)}`
    }
    return "处理完成"
  }

  /**
   * 选择单个可用技能
   * @param skillName 技能名称
   * @returns 是否选择成功
   */
  selectSkill(skillName: string): boolean {
    this._currentSkill = this.skillManager.getSkill(skillName)

    if (!this._currentSkill) return false
    return true
  }

  /**
   * 构建完整的系统prompt，包含单个技能信息
   * @param skillName 要使用的技能名称，不传则注入所有可用技能但限制单次只能用一个
   * @returns 注入了技能描述的系统prompt
   */
  buildSystemPrompt(skillName?: string): string {
    let systemPrompt = this.systemPrompt
    let skillsPrompt = ""

    if (this._currentSkill) {
      skillsPrompt = `
      你可以使用以下工具来完成任务：
      ${this.skillManager.generateSkillPrompt(this._currentSkill.name)}\n

      当你需要使用工具时，按照以下格式返回：
      <|FunctionCallBegin|>[{"name":"工具名称","parameters":{"参数名":"参数值"}}]<|FunctionCallEnd|>

      不需要使用工具时直接回复用户即可。
      `
    }

    return `${this.systemPrompt}${skillsPrompt}`
  }

  /**
   * 开始对话
   * @param messages 初始消息列表
   * @param signal 可选的中止信号，用于取消请求
   * @returns 更新后的消息列表，包含助手回复和工具执行结果
   */
  async chat(userInput: string, signal?: AbortSignal): Promise<string> {
    // 1. 构造用户消息对象
    const userMessage: Message = {
      role: "user",
      content: [{ type: "text", text: userInput }],
      timestamp: Date.now(),
    }

    // 2. 保存用户消息到上下文
    this.memory.addMessage(userMessage)

    // 3. 调用AgentLoop执行对话，传入当前所有上下文消息
    const loopConfig = {
      systemPrompt: this.buildSystemPrompt(),
      tools: this.toolsManager.getTools(),
      toolDefinitions: this.toolsManager.getToolDefinitions(),
      model: this.model,
      maxTurns: 5,
    }

    const messages = this.memory.getMessages()

    const responseMessages = await runAgentLoop(messages, loopConfig, signal)

    const lastMessage = responseMessages[responseMessages.length - 1]
    const content = lastMessage?.content[0]

    if (content.type === "toolCall") {
      return "toolCalling"
    }
    if (content.type === "text") {
      return content.text
    }
    return "[INTERNAL ERROR]"
  }
}
