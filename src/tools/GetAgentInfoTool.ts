import { buildTool } from "../utils"
import { ToolExecutionType } from "../types/types"
import type {
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"
import agentManager from "../core/AgentManager"

const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "GetAgentInfoTool",
    description:
      "获取当前系统中所有可用Agent的完整信息列表，包括每个Agent的名称、描述、模型信息、可用工具列表、当前加载的技能等。当用户需要了解有哪些Agent可以使用、查询所有Agent的能力时使用此工具。",
    strict: true,
  },
}

async function executeGetAgentInfoTool(
  input: {},
  signal?: AbortSignal
): Promise<ToolResult> {
  try {
    // 返回所有Agent的列表信息
    const agentList = agentManager.getAgents()
    const agentsDetail = await Promise.all(
      agentList.map(async (agentInfo) => {
        const agent = agentManager.getAgent(agentInfo.name)!
        return agent.getMetadata()
      })
    )

    return {
      type: "text",
      result: { success: true, agents: agentsDetail },
      content: [
        {
          type: "text",
          text: `当前可用Agent列表：\n${JSON.stringify(agentsDetail, null, 2)}`,
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
          text: `获取Agent信息失败：${error.message}`,
        },
      ],
    }
  }
}

export const GetAgentInfoTool = buildTool(definition, executeGetAgentInfoTool, ToolExecutionType.PARALLEL)
