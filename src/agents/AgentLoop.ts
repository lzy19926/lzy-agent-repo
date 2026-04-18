/**
 * Minimal agent loop implementation
 */
import type { AgentLoopConfig, Context, Message } from "../types/types"
import { callLLM } from "./chat"
/**
 * Start a minimal agent loop
 */
export async function runAgentLoop(
  messages: Message[],
  config: AgentLoopConfig,
  signal?: AbortSignal
): Promise<Message[]> {
  const maxTurns = config.maxTurns ?? 5

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
      debugger
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

  return context.messages
}
