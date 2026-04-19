import eventBus from "../bus/EventBus"
/**
 * 终端状态指示器封装
 * 负责管理LLM请求的等待时间、待执行工具、运行中技能等状态的显示，包括颜色变化和定时更新
 */

// ANSI 颜色代码
const ANSI_COLORS = {
  GRAY: "\x1b[90m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  RESET: "\x1b[0m",
  CLEAR_LINE: "\x1b[2K\r", // 清除当前行并回到行首
}

export default class TerminalState {
  private stateTimer: NodeJS.Timeout | null = null // 状态更新计时器
  private currentWaitTime: number = 0 // 当前等待时间（秒）
  private pendingTools: string[] = [] // 当前待执行的工具列表
  private currentSkill: string | null = null // 当前正在执行的技能

  constructor() {
    this.subscribeAllEvents()
  }

  private subscribeAllEvents() {
    // 订阅事件，处理状态显示
    eventBus.subscribe("llm:request:start", () => {
      this.pendingTools = []
      this.startStateIndicator()
    })

    eventBus.subscribe("llm:request:end", () => {
      this.clearStateIndicator()
    })

    // 监听工具调用事件，保存待执行的工具列表
    eventBus.subscribe(
      "event:tools:calling",
      (data: { toolCalls: string[] }) => {
        this.pendingTools = data.toolCalls
      }
    )

    // 监听技能加载事件，更新当前技能
    eventBus.subscribe("event:skill:loaded", (skill: { name: string }) => {
      this.currentSkill = skill.name
    })
  }

  /**
   * 显示/更新终端状态指示器
   * @param seconds 已等待秒数
   */
  updateStateIndicator(seconds: number): void {
    let timeColor = ANSI_COLORS.GRAY
    if (seconds >= 15 && seconds < 30) {
      timeColor = ANSI_COLORS.YELLOW
    } else if (seconds >= 30) {
      timeColor = ANSI_COLORS.RED
    }

    // 构造显示内容：工具 -> 技能 -> 等待时间
    let displayContent = ""

    // 添加工具列表信息
    if (this.pendingTools.length > 0) {
      displayContent += `${ANSI_COLORS.GRAY}Tools: ${this.pendingTools.join(
        ", "
      )}${ANSI_COLORS.RESET}`
    }

    // 添加当前技能信息
    if (this.currentSkill) {
      if (displayContent) displayContent += " | "
      displayContent += `${ANSI_COLORS.GRAY}Skill: ${this.currentSkill}${ANSI_COLORS.RESET}`
    }

    // 添加等待时间信息（始终在最后）
    if (displayContent) displayContent += " | "
    displayContent += `(${timeColor}Waiting: ${seconds}s${ANSI_COLORS.RESET})`

    // 计算终端宽度，实现完全右对齐（需要先移除ANSI颜色代码计算实际显示长度）
    const terminalWidth = process.stdout.columns || 80
    const visibleLength = displayContent.replace(/\x1b\[[0-9;]*m/g, "").length
    const paddingLength = Math.max(0, terminalWidth - visibleLength)

    // 清除当前行并右对齐显示内容
    process.stdout.write(
      `${ANSI_COLORS.CLEAR_LINE}${" ".repeat(paddingLength)}${displayContent}`
    )
  }

  /**
   * 启动状态指示器，每秒自动更新
   */
  startStateIndicator(): void {
    this.clearStateIndicator()

    this.pendingTools = []
    this.currentWaitTime = 0
    this.updateStateIndicator(0)

    // 每秒更新一次
    this.stateTimer = setInterval(() => {
      this.currentWaitTime++
      this.updateStateIndicator(this.currentWaitTime)
    }, 1000)
  }

  /**
   * 停止并清除状态指示器
   */
  clearStateIndicator(): void {
    if (this.stateTimer) {
      clearInterval(this.stateTimer)
      this.stateTimer = null
    }
    // 重置工具和时间状态
    this.pendingTools = []
    this.currentWaitTime = 0
  }

  /**
   * 显示灰色的工具/技能调用通知
   * @param message 通知内容
   */
  printGrayNotification(message: string): void {
    console.log(`${ANSI_COLORS.GRAY}${message}${ANSI_COLORS.RESET}`)
  }

  /**
   * 销毁资源，清理计时器
   */
  destroy(): void {
    this.clearStateIndicator()
  }
}
