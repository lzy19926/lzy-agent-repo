// 原理 调用DuckDuckGo搜索API进行搜索, 不直接使用LLM内置的web_search能力

import { z } from "zod"
import { buildTool } from "./utils"
import type {
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"

// 输入Schema定义
const inputSchema = z.strictObject({
  query: z.string().min(2).describe("搜索查询内容"),
  maxResults: z.number().optional().default(5).describe("返回结果最大数量"),
})
type Input = z.infer<typeof inputSchema>

// 输出Schema定义
const searchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  snippet: z.string().optional(),
})
const outputSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  durationSeconds: z.number(),
})
type Output = z.infer<typeof outputSchema>

const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "SimpleWebSearch",
    description:
      "极简版网络搜索工具，基于DuckDuckGo公开API实现，支持搜索网页、知识问答等。",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "要搜索的关键词或问题，不少于2个字符",
        },
        maxResults: {
          type: "number",
          description: "返回结果的最大数量，默认5条，最多支持20条",
          default: 5,
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
    strict: true,
  },
}

/**
 * 验证输入参数
 */
function validateInput(input: Input) {
  if (!input.query.trim()) {
    return {
      result: false,
      message: "搜索查询不能为空",
    }
  }
  if (input.maxResults && (input.maxResults < 1 || input.maxResults > 20)) {
    return {
      result: false,
      message: "返回结果数量必须在1-20之间",
    }
  }
  return { result: true }
}
/**
 * 格式化工具返回结果
 */
function formatResult(output: Output): string {
  let resultText = `## 搜索结果："${output.query}"\n\n`
  resultText += `搜索耗时：${output.durationSeconds.toFixed(2)}s\n\n`

  if (output.results.length === 0) {
    resultText += "未找到相关结果"
    return resultText
  }

  output.results.forEach((result, index) => {
    resultText += `${index + 1}. [${result.title}](${result.url})\n`
    if (result.snippet) {
      resultText += `   ${result.snippet}\n`
    }
    resultText += "\n"
  })

  resultText += "### 来源：\n"
  output.results.forEach((result) => {
    resultText += `- [${result.title}](${result.url})\n`
  })

  return resultText
}

async function _executeWebSearchTool(
  { query, maxResults }: Input,
  signal?: AbortSignal
): Promise<Output> {
  const startTime = performance.now()
  const max = maxResults || 5

  // 验证输入参数
  const validation = validateInput({ query, maxResults: max })
  if (!validation.result) {
    throw new Error(validation.message || "参数验证失败")
  }

  try {
    // 调用DuckDuckGo搜索API
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
      { signal }
    )

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    const rawResult = (await response.json()) as any

    // 解析搜索结果
    const results: z.infer<typeof searchResultSchema>[] = []

    // 抽象结果
    if (rawResult.AbstractText) {
      results.push({
        title: rawResult.Heading || query,
        url: rawResult.AbstractURL,
        snippet: rawResult.AbstractText,
      })
    }

    // 相关主题结果
    if (rawResult.RelatedTopics && rawResult.RelatedTopics.length > 0) {
      rawResult.RelatedTopics.filter(
        (topic: any) => topic.Text && topic.FirstURL
      )
        .slice(0, max - results.length)
        .forEach((topic: any) => {
          results.push({
            title: topic.Text.split(" - ")[0] || query,
            url: topic.FirstURL,
            snippet: topic.Text,
          })
        })
    }

    // 计算耗时
    const durationSeconds = (performance.now() - startTime) / 1000

    return {
      query,
      results,
      durationSeconds,
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error("搜索已被用户取消")
    }
    throw new Error(`搜索失败: ${(error as Error).message}`)
  }
}

const executeWebSearchTool = async (
  input: Input,
  signal?: AbortSignal
): Promise<ToolResult> => {
  const result = await _executeWebSearchTool(input, signal)
  return {
    type: "text",
    result: result,
    content: [
      {
        type: "text",
        text: formatResult(result),
      },
    ],
  }
}

export const WebSearchToolDefinition = definition
export const WebSearchTool = buildTool(definition, executeWebSearchTool)