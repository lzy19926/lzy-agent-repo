import type ShortTurnMemory from "../core/ShortTurnMemory"
import type SkillManager from "../core/SkillManager"
import type ToolsManager from "../core/ToolsManager"
import { runAgentLoop } from "./AgentLoop"
import eventBus from "../bus/EventBus"
import { buildUserMessage, buildSystemMessage } from "./Messages"
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
  private _ready: boolean = false
  public currentSkill?: SkillMeta

  constructor(options: AgentOptions) {
    this.name = options.name || "agent"
    this.description = options.description || "基础Agent"
    this.systemPrompt = options.systemPrompt || "你是一个 helpful 的助手"
    this.model = options.model
    this.memory = options.memory
    this.skillManager = options.skillManager
    this.toolsManager = options.toolsManager

    this.init()
  }

  // 初始化系统
  private init() {
    if (this._ready) return
    const systemPrompt = this.buildSystemPrompt()

    this.memory.addMessages([buildSystemMessage(systemPrompt)])

    this._ready = true
  }

  /**
   * 构造chat方法的返回结果
   * @param responseMessages AgentLoop返回的新增消息数组
   * @returns 处理后的回复内容
   */
  private buildChatResponse(responseMessages: Message[]): string {
    const lastMessage = responseMessages[responseMessages.length - 1]

    // 边界情况处理：无返回消息
    if (!lastMessage?.content?.length) {
      return "[INTERNAL ERROR: 无有效返回消息]"
    }

    const content = lastMessage.content[0]

    if (content.type === "toolCall") {
      return "toolCalling"
    }

    if (content.type === "text") {
      return content.text
    }

    return `[INTERNAL ERROR: 未知消息类型]`
  }

  /**
   * 加载技能并注入到消息上下文
   * 读取SKILL.md的正文内容，构造为System消息添加到记忆中
   * @param skillName 技能名称
   * @returns 是否加载成功
   */
  loadSkill(skillName: string): boolean {
    const skill = this.skillManager.getSkill(skillName)
    if (!skill) return false

    // 构造技能系统消息并添加到记忆上下文
    const skillSkillPrompt =
      this.skillManager.generateLoadedSkillPrompt(skillName)
    const skillSystemMessage = buildSystemMessage(skillSkillPrompt)

    // 添加到记忆上下文
    this.memory.addMessages([skillSystemMessage])

    this.currentSkill = skill

    return true
  }

  /**
   * 构建完整的系统prompt
   */
  buildSystemPrompt(): string {
    // 基础系统提示 +
    let userPrompt = this.systemPrompt
    // 所有可用技能列表
    let skillsMetaDataPrompt = this.skillManager.generateSkillListPrompt()

    let systemPrompt = `
    ${userPrompt}\n\n
    ${skillsMetaDataPrompt}\n\n`

    return systemPrompt
  }

  /**
   * 获取Agent元数据信息
   * @returns 包含Agent基础信息、工具列表、模型信息、当前技能的元数据对象
   */
  getMetadata() {
    return {
      name: this.name,
      description: this.description,
      model: {
        name: this.model.name,
      },
      tools: this.toolsManager.getToolDefinitions().map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
      })),
      currentSkill: this.currentSkill
        ? {
            name: this.currentSkill.name,
            description: this.currentSkill.description,
          }
        : null,
    }
  }

  /**
   * 开始对话
   * @param messages 初始消息列表
   * @param signal 可选的中止信号，用于取消请求
   * @returns 更新后的消息列表，包含助手回复和工具执行结果
   */
  async chat(userInput: string, signal?: AbortSignal): Promise<string> {
    eventBus.publish("llm:request:start") // 发布LLM请求开始事件

    // 1. 保存用户消息到上下文
    this.memory.addMessages([buildUserMessage(userInput)])

    // 2. 调用AgentLoop执行对话，传入当前所有上下文消息
    const loopConfig = {
      systemPrompt: this.buildSystemPrompt(),
      tools: this.toolsManager.getTools(),
      toolDefinitions: this.toolsManager.getToolDefinitions(),
      model: this.model,
      maxTurns: 5,
    }

    const messages = this.memory.getMessages()

    const responseMessages = await runAgentLoop(messages, loopConfig, signal)

    // 3. 保存Agent消息到上下文
    this.memory.addMessages(responseMessages)
    eventBus.publish("llm:request:end") // 发布LLM请求结束事件（无论成功失败）

    // 4. 返回Agent回答结果
    return this.buildChatResponse(responseMessages)
  }
}
