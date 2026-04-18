import { spawn } from "child_process"
import type {
  AgentTool,
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"

const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "BashTool",
    description:
      "执行Bash命令，支持标准Bash语法、管道、重定向、通配符等操作。适用于Linux/macOS系统或Windows下的WSL/Git Bash环境。",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "要执行的完整Bash命令，支持所有合法Bash语法",
        },
        timeout: {
          type: "number",
          description:
            "命令执行超时时间，单位毫秒，默认60000（60秒），最大支持300000（5分钟）",
          default: 60000,
        },
      },
      required: ["command"],
      additionalProperties: false,
    },
    strict: true,
  },
}

async function _executeBashTool(
  { command, timeout }: any,
  signal?: AbortSignal
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // 启动子进程执行Bash命令
    const child = spawn("bash", ["-c", command], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    })

    let stdout = ""
    let stderr = ""
    let timeoutHandle: NodeJS.Timeout | undefined

    // 收集输出
    child.stdout?.on("data", (data) => {
      stdout += data.toString()
    })

    child.stderr?.on("data", (data) => {
      stderr += data.toString()
    })

    // 处理超时
    if (timeout && timeout > 0) {
      timeoutHandle = setTimeout(() => {
        child.kill("SIGTERM")
        reject(
          new Error(
            `Command timed out after ${timeout} milliseconds\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        )
      }, timeout || 60000)
    }

    // 处理中断信号
    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          child.kill("SIGTERM")
          reject(
            new Error(`Command aborted\nstdout: ${stdout}\nstderr: ${stderr}`)
          )
        },
        { once: true }
      )
    }

    // 进程结束处理
    child.on("close", (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })

    // 进程错误处理
    child.on("error", (err) => {
      if (timeoutHandle) clearTimeout(timeoutHandle)
      reject(
        new Error(
          `Failed to execute Bash command: ${err.message}\nstdout: ${stdout}\nstderr: ${stderr}`
        )
      )
    })
  })
}

const executeBashTool = async (
  input: any,
  signal?: AbortSignal
): Promise<ToolResult> => {
  const result = await _executeBashTool(input, signal)
  return {
    type: "text",
    result: result,
    content: [
      {
        type: "text",
        text: result.stderr
          ? `${result.stdout}\n${result.stderr}`
          : result.stdout,
      },
    ],
  }
}

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

export const BashToolDefinition = definition
export const BashTool = buildTool(definition, executeBashTool)
