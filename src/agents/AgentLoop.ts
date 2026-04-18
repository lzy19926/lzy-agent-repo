/**
 * Minimal agent loop implementation
 */
import type { AgentLoopConfig, Context, Message } from "../types/types"
import { callLLM } from "./Chat"
/**
 * Start a minimal agent loop
 */
export async function runAgentLoop(
  messages: Message[],
  config: AgentLoopConfig,
  signal?: AbortSignal
): Promise<Message[]> {
  const maxTurns = config.maxTurns ?? 5
  const originalMessageCount = messages.length // 记录初始消息数量

  const context: Context = {
    systemPrompt: config.systemPrompt,
    messages: [...messages],
    tools: config.toolDefinitions,
  }

  for (let turn = 0; turn < maxTurns; turn++) {
    // Call LLM
    const assistantMessage = await callLLM(config.model, context, {
      signal,
    })
    context.messages.push(assistantMessage)
    // Check for tool calls
    const toolCalls = assistantMessage.content.filter(
      (c) => c.type === "toolCall"
    )
    if (toolCalls.length === 0) {
      break
    }

    // Execute tools sequentially
    for (const toolCall of toolCalls) {
      const tool = config.tools?.find((t) => t.name === toolCall.name)
      if (!tool) continue

      try {
        // Validate and execute tool
        const result = await tool.execute?.(toolCall.arguments)

        context.messages.push({
          role: "toolResult",
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          isError: false,
          content: result.content,
          timestamp: Date.now(),
        })
      } catch (error) {
        context.messages.push({
          role: "toolResult",
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          isError: true,
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          timestamp: Date.now(),
        })
      }
    }
  }

  // 仅返回本次循环新增的消息（从初始长度之后的部分）
  return context.messages.slice(originalMessageCount)
}
