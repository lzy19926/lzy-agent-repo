import { buildTool } from "../utils"
import type {
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"
import agentManager from "../core/AgentManager"
import { buildOtherAssistantMessage } from "../agents/Messages"

const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "SendMessageTool",
    description:
      "发送消息给指定的其他Agent，当用户需要和其他Agent对话、委托任务、转发消息时使用此工具。",
    parameters: {
      type: "object",
      properties: {
        agentName: {
          type: "string",
          description: "目标Agent的名称，比如agent2、code-agent等",
        },
        message: {
          type: "string",
          description: "要发送给目标Agent的完整消息内容",
        },
      },
      required: ["agentName", "message"],
      additionalProperties: false,
    },
    strict: true,
  },
}

async function executeSendMessageTool(
  input: { agentName: string; message: string },
  signal?: AbortSignal
): Promise<ToolResult> {
  try {
    const { agentName, message } = input

    // 获取目标Agent
    const targetAgent = agentManager.getAgent(agentName)
    if (!targetAgent) {
      return {
        type: "text",
        result: { success: false, error: `Agent不存在: ${agentName}` },
        content: [
          {
            type: "text",
            text: `错误：找不到名为${agentName}的Agent，请检查名称是否正确`,
          },
        ],
      }
    }

    // 给目标Agent发送消息（构建otherAssistant类型消息，不触发外层计时）
    const agentMessage = buildOtherAssistantMessage(message)
    const response = await targetAgent.chat(agentMessage)

    return {
      type: "text",
      result: { success: true, from: agentName, response },
      content: [
        {
          type: "text",
          text: `收到来自${agentName}的回复：\n${response}`,
        },
      ],
    }
  } catch (e: unknown) {
    const error = e as Error
    return {
      type: "text",
      result: { success: false, error: error.message },
      content: [
        {
          type: "text",
          text: `发送消息失败：${error.message}`,
        },
      ],
    }
  }
}

export const SendMessageToolDefinition = definition
export const SendMessageTool = buildTool(definition, executeSendMessageTool)
