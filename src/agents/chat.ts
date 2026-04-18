/**
 * 极简LLM交互实现，仅使用fetch进行API调用
 */
import type { Model, Context, AgentMessage } from "../types/types"
import OpenAI from "openai"

/**
 * 调用LLM API获取完整响应（非流式）
 * @param model 模型配置
 * @param context 对话上下文
 * @param options 可选配置（API Key、中断信号等）
 */
export async function callLLM(
  model: Model,
  context: Context,
  options?: { signal?: AbortSignal }
): Promise<AgentMessage> {
  const baseURL = model.baseURL || ""
  const apiKey = model?.apiKey || ""
  const tools = context.tools || []

  const call_OpenAI = async () => {
    const openai = new OpenAI({ apiKey, baseURL })

    const systemMessage = context.systemPrompt
      ? [{ role: "system", content: context.systemPrompt || "" }]
      : []

    const historyMessages = context.messages.map((msg) => {
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
      msg
    })

    return await openai.chat.completions.create({
      model: model.name,
      //@ts-ignore
      messages: [...systemMessage, ...historyMessages],
      tools: tools,
    })
  }

  const response = await call_OpenAI()
  const choice = response.choices[0]

  // 转换为标准AssistantMessage格式
  return {
    role: "assistant",
    content: choice?.message?.tool_calls
      ? choice.message.tool_calls.map((call: any) => ({
          type: "toolCall",
          id: call.id,
          name: call.function.name,
          arguments: JSON.parse(call.function.arguments),
        }))
      : [{ type: "text", text: choice?.message?.content || "" }],
    stopReason: choice?.finish_reason || "stop",
    id: response.id,
    model: response.model,
    timestamp: Date.now(),
  } as any
}
