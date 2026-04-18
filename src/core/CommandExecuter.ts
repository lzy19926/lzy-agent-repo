import type AgentManager from "./AgentManager"
import type TerminalUI from "./TerminalUI"

interface Command {
  description: string
  execute: (args: string[]) => Promise<void> | void
}

interface CommandExecuterOptions {
  agentManager: AgentManager
  terminalUI: TerminalUI
}

export default class CommandExecuter {
  private agentManager: AgentManager
  private terminalUI: TerminalUI
  private commands: Record<string, Command>

  constructor(options: CommandExecuterOptions = {} as CommandExecuterOptions) {
    this.agentManager = options.agentManager
    this.terminalUI = options.terminalUI
    this.commands = {
      "/": {
        description: "选择命令并执行",
        execute: this.listCommands.bind(this),
      },
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

  // 获取所有命令列表
  getCommands(): { name: string; description: string }[] {
    return Object.entries(this.commands).map(([name, cmd]) => ({
      name,
      description: cmd.description,
    }))
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
    this.agentManager.getCurrentAgent().memory.flush()
  }

  clear(): void {
    this.terminalUI.clear()
    // 清空当前活跃Agent记忆
    this.agentManager.getCurrentAgent().memory.clear()
    this.terminalUI.printSuccess("已清屏并清空当前会话上下文")
  }

  async listCommands(): Promise<void> {
    const commands = this.getCommands()
    // 构造选择项
    const selectOptions = commands.map((cmd) => ({
      name: cmd.name,
      value: cmd.name,
      description: cmd.description,
    }))

    // 显示命令选择菜单
    const selectedCmd = await this.terminalUI.select(
      selectOptions,
      "📖 可用命令："
    )

    if (selectedCmd) {
      // 执行选中的命令
      await this.executeCommand(selectedCmd)
    }
  }

  async listAgents(): Promise<void> {
    const agents = this.agentManager.getAgents()
    const currentAgent = this.agentManager.getCurrentAgent()

    // 构造选择项，当前使用的Agent加上标记
    const selectOptions = agents.map((agent) => ({
      name: agent.name + (agent.name === currentAgent.name ? " (current)" : ""),
      value: agent,
      description: agent.description,
    }))

    // 显示交互式选择菜单
    await this.terminalUI.select(
      selectOptions,
      "🤖 可用Agent：",
      async (selectedAgent) => {
        if (selectedAgent) {
          try {
            const agent = this.agentManager.switchAgent(selectedAgent.name)
            this.terminalUI.printSuccess(
              `已切换到Agent: ${agent.name} - ${agent.description}`
            )
          } catch (e) {
            this.terminalUI.printError(`切换失败：${(e as Error).message}`)
          }
        }
      }
    )
  }

  async switchAgent(args: string[]): Promise<void> {
    if (args.length === 0) {
      // 没有参数时显示交互式选择菜单
      await this.listAgents()
      return
    }
    const agentName = args[0]
    const agent = this.agentManager.switchAgent(agentName)
    this.terminalUI.printSuccess(
      `已切换到Agent: ${agent.name} - ${agent.description}`
    )
  }

  async listSkills(): Promise<void> {
    const currentAgent = this.agentManager.getCurrentAgent()
    const skills = currentAgent.skillManager.getSkills()

    if (skills.length === 0) {
      this.terminalUI.printInfo("当前Agent没有可用技能")
      return
    }

    // 获取当前已加载的技能
    const loadedSkillName = currentAgent.currentSkill?.name

    // 构造选择项，已加载的技能加上✅标记
    const selectOptions = skills.map((skill) => ({
      name: skill.name + (skill.name === loadedSkillName ? " (current)" : ""),
      value: skill,
      description: skill.description,
    }))

    // 显示交互式选择菜单
    await this.terminalUI.select(
      selectOptions,
      "🛠️  当前Agent可用技能：",
      (selectedSkill) => {
        if (selectedSkill) {
          try {
            const success = currentAgent.loadSkill(selectedSkill.name)
            if (success) {
              this.terminalUI.printSuccess(`成功加载：${selectedSkill.name}`)
            } else {
              this.terminalUI.printError(`加载失败：${selectedSkill.name}`)
            }
          } catch (e) {
            this.terminalUI.printError(`加载失败：${(e as Error).message}`)
          }
        }
      }
    )
  }
}
