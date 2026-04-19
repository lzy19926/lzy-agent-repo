import { spawn } from "child_process"
import { buildTool } from "../utils"
import type {
  ToolResult,
  FunctionToolDefinition,
} from "../types/types"

const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "PowerShellTool",
    description:
      "执行PowerShell命令，支持标准PowerShell语法、管道、重定向等操作。",
    parameters: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "要执行的完整PowerShell命令，支持所有合法PowerShell语法",
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

async function _executePowerShellTool(
  { command, timeout }: any,
  signal?: AbortSignal
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    // 启动子进程执行PowerShell命令
    const child = spawn("powershell", ["-c", command], {
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
          `Failed to execute PowerShell command: ${err.message}\nstdout: ${stdout}\nstderr: ${stderr}`
        )
      )
    })
  })
}

const executePowerShellTool = async (
  input: any,
  signal?: AbortSignal
): Promise<ToolResult> => {
  const result = await _executePowerShellTool(input, signal)
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

export const PowerShellTool = buildTool(definition, executePowerShellTool)
