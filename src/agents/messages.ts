import type {
  Message,
  SystemMessage,
  UserMessage,
  AgentMessage,
  ToolResultMessage,
  OtherAssistantMessage,
} from "../types/types"
import type OpenAI from "openai"

export const buildUserMessage = (userInput: string): UserMessage => {
  return {
    role: "user",
    content: [{ type: "text", text: userInput }],
    timestamp: Date.now(),
  }
}

export const buildOtherAssistantMessage = (message: string): OtherAssistantMessage => {
  return {
    role: "otherAssistant",
    content: [{ type: "text", text: message }],
    timestamp: Date.now(),
  }
}

export const buildSystemMessage = (systemPrompt: string): SystemMessage => {
  return {
    role: "system",
    content: [{ type: "text", text: systemPrompt }],
    timestamp: Date.now(),
  }
}

/**
 * 内部工具：将内部统一Message格式转换为OpenAI兼容的消息格式
 * @param msg 内部消息对象
 * @returns OpenAI ChatCompletionMessageParam 格式的消息
 */
export const messageToLLM_OpenAI = (msg: Message): OpenAI.Chat.ChatCompletionMessageParam => {
  // 提取所有text类型内容的文本内容
  const getTextContent = () => {
    return msg.content
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("")
  }

  if (msg.role === "system") {
    return {
      role: "system",
      content: getTextContent(),
    }
  }

  if (msg.role === "user" || msg.role === "otherAssistant") {
    return {
      role: "user",
      content: getTextContent(),
    }
  }

  if (msg.role === "assistant") {
    // 检查是否有工具调用
    const toolCalls = msg.content.filter(c => c.type === "toolCall")
    if (toolCalls.length > 0) {
      return {
        role: "assistant",
        content: getTextContent() || null,
        tool_calls: toolCalls.map(call => ({
          id: call.id,
          type: "function",
          function: {
            name: call.name,
            arguments: JSON.stringify(call.arguments),
          }
        }))
      }
    }

    // 纯文本回复
    return {
      role: "assistant",
      content: getTextContent(),
    }
  }

  if (msg.role === "toolResult") {
    return {
      role: "tool",
      tool_call_id: msg.toolCallId,
      content: getTextContent(),
    }
  }

  // 兜底返回
  return msg as any
}
