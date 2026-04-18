import readline from "readline"

interface ListItem {
  name: string
  description?: string
}

interface TerminalUIOptions {
  prompt?: string
  onInput?: (input: string) => Promise<string> | string
}

export default class TerminalUI {
  private rl: readline.Interface
  private onInput?: (input: string) => Promise<string> | string

  constructor(options: TerminalUIOptions = {}) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: options.prompt || "🧑>-- ",
    })
    this.onInput = options.onInput
    this.showWelcome()
    this.rl.on("line", async (input: string) => {
      if (this.onInput) {
       const text =  await this.onInput(input.trim())
       this.print(text,"🤖 >--")
      }
      this.rl.prompt()
    })
  }

  // 输出信息
  print(message: string, prefix = "🤖> "): void {
    console.log(`${prefix}${message}`)
  }

  // 输出错误信息
  printError(message: string): void {
    console.error(`❌> ${message}`)
  }

  // 输出成功信息
  printSuccess(message: string): void {
    console.log(`✅> ${message}`)
  }

  // 输出列表
  printList(items: ListItem[], title = ""): void {
    if (title) {
      console.log(`\n${title}`)
    }
    items.forEach((item, index) => {
      console.log(
        `${index + 1}. ${item.name}${
          item.description ? ` - ${item.description}` : ""
        }`
      )
    })
    console.log()
  }

  // 清屏
  clear(): void {
    console.clear()
  }

  // 显示欢迎信息
  showWelcome(): void {
    console.log(`
╔════════════════════════════════════════╗
║        🤖 LZY Agent CLI v1.0.0         ║
╚════════════════════════════════════════╝
输入 /help 查看所有可用命令
开始和Agent对话吧！
`)
    this.rl.prompt()
  }

  // 关闭终端
  close(): void {
    this.rl.close()
    console.log("\n👋 再见！")
    process.exit(0)
  }
}
