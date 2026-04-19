import type { AgentTool, FunctionToolDefinition } from "../types/types"
import eventBus from "../bus/EventBus"

class ToolsManager {
  private tools: Map<
    string,
    { tool: AgentTool; definition: FunctionToolDefinition }
  > = new Map()

  /**
   * 注册工具
   * @param tool 实现Tool接口的工具实例
   * @param definition 工具定义
   */
  register(tool: AgentTool, definition: FunctionToolDefinition): ToolsManager {
    this.tools.set(tool.name, { tool, definition })
    return this
  }

  /**
   * 获取所有已注册工具列表
   * @returns 工具实例数组
   */
  getTools(): AgentTool[] {
    return Array.from(this.tools.values()).map((item) => item.tool)
  }

  /**
   * 获取所有已注册工具的定义列表
   * @returns 工具定义数组
   */
  getToolDefinitions(): FunctionToolDefinition[] {
    return Array.from(this.tools.values()).map((item) => item.definition)
  }

  /**
   * 获取指定工具
   * @param toolName 工具名称
   * @returns 工具实例
   */
  getTool(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName)?.tool
  }

  /**
   * 执行指定工具
   * @param toolName 工具名称
   * @param args 工具参数
   * @returns 执行结果
   */
  async execute(toolName: string, args: Record<string, unknown>): Promise<any> {
    const toolEntry = this.tools.get(toolName)
    if (!toolEntry) throw new Error(`工具 ${toolName} 未注册`)
    return toolEntry.tool.execute(args)
  }
}

export default ToolsManager
