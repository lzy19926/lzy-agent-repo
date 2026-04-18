import eventBus from "./EventBus"
import commandBus from "./CommandBus"
import type TerminalUI from "./TerminalUI"
import type Agent from "../agents/Agent"

interface Command {
  description: string
  execute: (args: string[]) => Promise<void> | void
}

interface CommandExecuterOptions {
  terminalUI: TerminalUI
}

export default class CommandExecuter {
  private terminalUI: TerminalUI
  private commands: Record<string, Command>

  constructor(options: CommandExecuterOptions = {} as CommandExecuterOptions) {
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

    process.on("SIGINT", () => {
      eventBus.publish("event:app:exit")
      this.terminalUI.close()
      process.exit(0)
    })
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
    // 发布退出事件，通知外部处理清理工作
    eventBus.publish("event:app:exit")
    this.terminalUI.close()
    process.exit(0)
  }

  clear(): void {
    this.terminalUI.clear()
    // 发布清空会话事件，由外部处理记忆清空
    eventBus.publish("event:session:clear")
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
    // 1. 获取Agent列表和当前Agent（回调转Promise）
    const { agents, currentAgent } = await commandBus.invoke(
      "command:agent:list"
    )

    // 2. 构造选择项
    const selectOptions = agents.map((agent: Agent) => ({
      name: agent.name + (agent.name === currentAgent.name ? " (current)" : ""),
      value: agent,
      description: agent.description,
    }))

    // 3. 显示选择菜单并等待用户选择（直接await结果，无需回调）
    const selectedAgent = (await this.terminalUI.select(
      selectOptions,
      "🤖 可用Agent："
    )) as Agent

    if (!selectedAgent) return

    // 4. 切换Agent（回调转Promise）
    const { success, agent } = await commandBus.invoke(
      "command:agent:switch",
      selectedAgent.name
    )
    // 5. 处理结果
    if (success && agent) {
      this.terminalUI.printSuccess(
        `已切换到Agent: ${agent.name} - ${agent.description}`
      )
    } else {
      this.terminalUI.printError(`切换Agent失败`)
    }
  }

  async listSkills(): Promise<void> {
    // 1. 获取技能列表和已加载技能（回调转Promise）
    const { skills, loadedSkillName } = await commandBus.invoke(
      "command:skill:list"
    )

    if (skills.length === 0) {
      this.terminalUI.printInfo("当前Agent没有可用技能")
      return
    }

    // 2. 构造选择项
    const selectOptions = skills.map((skill: any) => ({
      name: skill.name + (skill.name === loadedSkillName ? " (current)" : ""),
      value: skill,
      description: skill.description,
    }))

    // 3. 显示选择菜单并等待用户选择（直接await结果，无需回调）
    const selectedSkill: any = await this.terminalUI.select(
      selectOptions,
      "🛠️  当前Agent可用技能："
    )

    if (!selectedSkill) return

    // 4. 加载技能（调用CommandBus）
    const { success, message } = await commandBus.invoke(
      "command:skill:load",
      selectedSkill.name
    )

    // 5. 处理结果
    if (success) {
      this.terminalUI.printSuccess(`成功加载：${selectedSkill.name}`)
    } else {
      this.terminalUI.printError(`加载失败：${message || selectedSkill.name}`)
    }
  }
}
