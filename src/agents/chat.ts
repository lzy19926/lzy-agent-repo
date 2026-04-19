/**
 * 极简LLM交互实现，仅使用fetch进行API调用
 */
import type { Model, Context, AgentMessage } from "../types/types"
import { messageToLLM } from "./Messages"
import OpenAI from "openai"

const call_OpenAI = async (
  model: Model,
  context: Context,
  options?: { signal?: AbortSignal }
): Promise<AgentMessage> => {
  const baseURL = model.baseURL || ""
  const apiKey = model?.apiKey || ""
  const tools = context.tools || []

  const openai = new OpenAI({ apiKey, baseURL })
  const historyMessages = context.messages.map((msg) => messageToLLM(msg))

  const response = await openai.chat.completions.create({
    model: model.name,
    //@ts-ignore
    messages: [...historyMessages],
    tools: tools,
  })

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
  //TODO 各API接口兼容层
  const message = await call_OpenAI(model, context, options)

  return message
}
