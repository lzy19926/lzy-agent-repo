import type AgentManager from "./AgentManager"
import type TerminalUI from "./TerminalUI"
import type ShortTurnMemory from "./ShortTurnMemory"

interface Command {
  description: string
  execute: (args: string[]) => Promise<void> | void
}

interface CommandParserOptions {
  agentManager: AgentManager
  terminalUI: TerminalUI
  memory: ShortTurnMemory
}

export default class CommandParser {
  private agentManager: AgentManager
  private terminalUI: TerminalUI
  private memory: ShortTurnMemory
  private commands: Record<string, Command>

  constructor(options: CommandParserOptions = {} as CommandParserOptions) {
    this.agentManager = options.agentManager
    this.terminalUI = options.terminalUI
    this.memory = options.memory
    this.commands = {
      "/help": {
        description: "查看帮助信息",
        execute: this.showHelp.bind(this),
      },
      "/exit": {
        description: "退出程序",
        execute: this.exit.bind(this),
      },
      "/clear": {
        description: "清屏并清空当前会话上下文",
        execute: this.clear.bind(this),
      },
      "/agents": {
        description: "查看所有可用的Agent",
        execute: this.listAgents.bind(this),
      },
      "/skills": {
        description: "查看当前Agent可用的技能",
        execute: this.listSkills.bind(this),
      },
    }
  }

  // 检查是否是命令
  isCommand(input: string): boolean {
    return input.startsWith("/")
  }

  // 解析并执行命令
  async executeCommand(input: string): Promise<boolean> {
    const parts = input.split(" ")
    const cmd = parts[0]
    const args = parts.slice(1)

    const command = this.commands[cmd]
    if (!command) {
      this.terminalUI.printError(
        `未知命令: ${cmd}，输入 /help 查看所有可用命令`
      )
      return true
    }

    try {
      await command.execute(args)
    } catch (e: unknown) {
      const error = e as Error
      this.terminalUI.printError(`命令执行失败: ${error.message}`)
    }
    return true
  }

  showHelp(): void {
    this.terminalUI.printList(
      Object.entries(this.commands).map(([cmd, info]) => ({
        name: cmd,
        description: info.description,
      })),
      "📖 可用命令："
    )
  }

  exit(): void {
    this.terminalUI.close()
    this.memory.flush()
  }

  clear(): void {
    this.terminalUI.clear()
    this.memory.clear()
    this.terminalUI.printSuccess("已清屏并清空当前会话上下文")
  }

  listAgents(): void {
    const agents = this.agentManager.getAgents()
    const currentAgent = this.agentManager.getCurrentAgent()
    this.terminalUI.printList(
      agents.map((agent) => ({
        name:
          agent.name + (agent.name === currentAgent.name ? " (当前使用)" : ""),
        description: agent.description,
      })),
      "🤖 可用Agent："
    )
  }

  switchAgent(args: string[]): void {
    if (args.length === 0) {
      this.terminalUI.printError(
        "请指定要切换的Agent名称，用法：/use <agent-name>"
      )
      return
    }
    const agentName = args[0]
    const agent = this.agentManager.switchAgent(agentName)
    this.terminalUI.printSuccess(
      `已切换到Agent: ${agent.name} - ${agent.description}`
    )
  }

  listSkills(): void {
    const currentAgent = this.agentManager.getCurrentAgent()
    const skills = currentAgent.skillManager.getSkills()
    this.terminalUI.printList(
      skills.map((skill) => ({
        name: skill.name,
        description: `${skill.description}`,
      })),
      "🛠️  当前Agent可用技能："
    )
  }
}
