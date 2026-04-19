import type {
  AgentTool,
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"

export function buildTool(
  definition: FunctionToolDefinition,
  execute: (...args: any) => Promise<ToolResult>
): AgentTool {
  return {
    name: definition.function.name,
    description: definition.function.description || "unknown description",
    parameters: definition.function.parameters,
    execute: execute,
  }
}