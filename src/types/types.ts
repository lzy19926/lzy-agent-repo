import OpenAI from "openai"

// 模型配置
export interface Model {
  provider?: string
  name: string
  apiKey: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
}

// 消息内容类型
export interface TextContent {
  type: "text"
  text: string
}

export interface ToolCallContent {
  type: "toolCall"
  id: string
  name: string
  arguments: Record<string, any>
}

export type MessageContent = TextContent | ToolCallContent

// 角色定义
export type Role = "system" | "user" | "assistant" | "tool" | "otherAssistant"

// 系统消息
export interface SystemMessage {
  role: "system"
  content: MessageContent[]
  timestamp: number
}

// 用户消息
export interface UserMessage {
  role: "user"
  content: MessageContent[]
  timestamp: number
}

// 其他Agent发送的消息
export interface OtherAssistantMessage {
  role: "otherAssistant"
  content: MessageContent[]
  timestamp: number
}

// 助手消息
export interface AgentMessage {
  role: "assistant"
  content: MessageContent[]
  stopReason: string
  id?: string
  model?: string
  timestamp: number
}

// 工具结果消息
export interface ToolResultMessage {
  role: "toolResult"
  toolCallId: string
  toolName: string
  content: MessageContent[]
  isError: boolean
  timestamp: number
}

export type Message =
  | SystemMessage
  | UserMessage
  | AgentMessage
  | ToolResultMessage
  | OtherAssistantMessage

// 工具参数定义
export type ToolParameter = { [key: string]: unknown }
export type ToolExecuter<T = any> = (input: T, signal?: AbortSignal) => Promise<ToolResult>

// 统一工具接口，所有工具都要实现此接口
export interface AgentTool {
  name: string
  description: string
  definition: FunctionToolDefinition
  execute: ToolExecuter
}

export interface ToolResult {
  type: "text"
  result: unknown
  content: MessageContent[]
}

// 对话上下文
export interface Context {
  systemPrompt?: string
  messages: Message[]
  tools?: ToolDefinition[]
}

// 技能元数据
export interface SkillMeta {
  name: string
  description: string
  path: string // SKILL.md 路径
  version?: string
  author?: string
  body: string // SKILL.md 主体内容
}

// Agent循环配置
export interface AgentLoopConfig {
  model: Model
  skills?: SkillMeta[]
  tools?: AgentTool[]
  maxTurns?: number
  systemPrompt?: string
}

export type ToolDefinition = FunctionToolDefinition
export type FunctionToolDefinition = OpenAI.Chat.ChatCompletionFunctionTool
