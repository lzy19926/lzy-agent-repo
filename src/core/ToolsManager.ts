import type { AgentTool, FunctionToolDefinition } from "../types/types"
import eventBus from "../bus/EventBus"

class ToolsManager {
  private tools: Map<string, AgentTool> = new Map()

  /**
   * 注册工具
   * @param tool 实现AgentTool接口的工具实例
   */
  register(tool: AgentTool): ToolsManager {
    this.tools.set(tool.name, tool)
    return this
  }

  /**
   * 获取所有已注册工具列表
   * @returns 工具实例数组
   */
  getTools(): AgentTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取所有已注册工具的定义列表
   * @returns 工具定义数组
   */
  getToolDefinitions(): FunctionToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.definition)
  }

  /**
   * 获取指定工具
   * @param toolName 工具名称
   * @returns 工具实例
   */
  getTool(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName)
  }

  /**
   * 执行指定工具
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 执行结果
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<any> {
    const tool = this.tools.get(toolName)
    if (!tool) throw new Error(`工具 ${toolName} 未注册`)
    return tool.execute(args)
  }
}

export default ToolsManager
