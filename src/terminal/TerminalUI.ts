import * as clack from "@clack/prompts"
import TerminalTime from "./TerminalTime"

interface ListItem {
  name: string
  description?: string
}

type OnInputResult = Promise<{ content: string; agentName: string }>

interface TerminalUIOptions {
  prompt?: string
  onInput?: (input: string) => OnInputResult
}

export default class TerminalUI {
  private onInput?: (input: string) => OnInputResult
  private promptText: string
  private isRunning: boolean = true
  private terminalTime: TerminalTime // 等待时间指示器实例

  constructor(options: TerminalUIOptions = {}) {
    this.promptText = options.prompt || "🧑>-- "
    this.onInput = options.onInput
    this.terminalTime = new TerminalTime() // 初始化等待时间指示器
    this.showWelcome()
    // 启动输入循环
    this.startInputLoop()
  }

  // 启动输入循环
  private async startInputLoop(): Promise<void> {
    while (this.isRunning) {
      // 手动打印提示，和输入在同一行
      process.stdout.write(this.promptText)

      const input = await clack.text({
        message: "",
        defaultValue: "",
      })

      if (clack.isCancel(input)) {
        this.close()
        return
      }

      const trimInput = (input as string).trim()
      if (!trimInput) continue

      try {
        if (this.onInput) {
          const { content, agentName } = await this.onInput(trimInput)
          if (content) {
            clack.log.info(`🤖[${agentName}]`)
            clack.log.info(content)
          }
        }
      } catch (e: unknown) {
        const error = e as Error
        this.printError(`处理失败: ${error.message}`)
      }
    }
  }

  // 输出信息
  print(message: string, prefix = "🤖> "): void {
    clack.log.info(`${prefix}${message}`)
  }

  // 输出错误信息
  printError(message: string): void {
    clack.log.error(`❌> ${message}`)
  }

  // 输出成功信息
  printSuccess(message: string): void {
    clack.log.success(`✅> ${message}`)
  }

  // 输出提示信息
  printInfo(message: string): void {
    clack.log.info(`ℹ️>  ${message}`)
  }

  // 输出列表
  printList(items: ListItem[], title = ""): void {
    if (title) {
      clack.log.info(`\n${title}`)
    }
    items.forEach((item, index) => {
      clack.log.info(
        `${index + 1}. ${item.name}${
          item.description ? ` - ${item.description}` : ""
        }`
      )
    })
    clack.log.info("")
  }

  // 清屏
  clear(): void {
    console.clear()
  }

  // 显示欢迎信息
  showWelcome(): void {
    clack.intro("🤖 LZY Agent CLI v1.0.0")
    clack.log.info("输入 /help 查看所有可用命令")
    clack.log.info("开始和Agent对话吧！\n")
  }

  // 关闭终端
  close(): void {
    this.isRunning = false
    this.terminalTime.destroy() // 销毁等待时间指示器资源
    clack.outro("👋 再见！")
    process.exit(0)
  }

  // 交互式选择菜单
  async select<T>(
    options: { name: string; value: T; description?: string }[],
    title?: string,
    onSelected?: (res: T) => any
  ): Promise<T | null> {
    const selected = await clack.select({
      message: title || "请选择：",
      //@ts-ignore
      options: options.map((opt) => ({
        label: opt.name,
        value: opt.value,
        description: opt.description,
      })),
    })

    if (clack.isCancel(selected)) {
      return null
    }

    // 执行回调
    onSelected?.(selected as T)
    return selected as T
  }
}
