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

/**
 * 生产级安全JSON解析方法，解析失败不会抛出异常、不会阻塞流程
 * @param jsonString 要解析的JSON字符串
 * @param defaultValue 解析失败时返回的默认值，默认值为null
 * @param options 可选配置
 * @param options.preventPrototypePollution 是否防止原型污染，默认开启（自动过滤__proto__、constructor、prototype等敏感属性）
 * @returns 解析后的对象，解析失败返回defaultValue
 * @example
 * safeJsonParse('{"a": 1}') // {a: 1}
 * safeJsonParse('invalid json', {}) // {}
 * safeJsonParse('{"__proto__": {"hack": true}}') // {} （自动过滤危险属性）
 */
export function safeJsonParse<T = any>(
  jsonString: any,
  defaultValue: T | null = null,
  options: {
    preventPrototypePollution?: boolean
  } = { preventPrototypePollution: true }
): T | null {
  // 非字符串类型直接返回默认值
  if (typeof jsonString !== "string") {
    return defaultValue
  }

  // 空字符串或纯空白字符串直接返回默认值
  const trimmedStr = jsonString.trim()
  if (trimmedStr.length === 0) {
    return defaultValue
  }

  try {
    if (options.preventPrototypePollution) {
      // 防止原型污染：使用reviver函数过滤敏感属性
      return JSON.parse(trimmedStr, (key: string, value: any) => {
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype"
        ) {
          return undefined
        }
        return value
      }) as T
    } else {
      // 普通解析模式
      return JSON.parse(trimmedStr) as T
    }
  } catch (e) {
    // 捕获所有解析错误，返回默认值
    return defaultValue
  }
}
