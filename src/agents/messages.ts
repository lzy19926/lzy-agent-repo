import type {
  Message,
  SystemMessage,
  UserMessage,
  AgentMessage,
  ToolResultMessage,
} from "../types/types"

export const buildUserMessage = (userInput: string): UserMessage => {
  return {
    role: "user",
    content: [{ type: "text", text: userInput }],
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

export const messageToLLM = (msg: Message) => {
  if (msg.role === "system") {
    return {
      role: "system",
      content: msg.content.map((c: any) => c.text).join(""),
    }
  }
  if (msg.role === "user") {
    return {
      role: "user",
      content: msg.content.map((c: any) => c.text).join(""),
    }
  }
  if (msg.role === "assistant") {
    return {
      role: "assistant",
      content: msg.content.map((c: any) => c.text).join(""),
    }
  }
  if (msg.role === "toolResult") {
    return {
      role: "tool",
      tool_call_id: msg.toolCallId,
      content: msg.content.map((c: any) => c.text).join(""),
    }
  }
}
