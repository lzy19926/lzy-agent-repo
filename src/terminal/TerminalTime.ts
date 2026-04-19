import eventBus from "../bus/EventBus"
/**
 * 终端等待时间指示器封装
 * 负责管理LLM请求的等待时间显示，包括颜色变化和定时更新
 */

// ANSI 颜色代码
const ANSI_COLORS = {
  GRAY: "\x1b[90m",
  YELLOW: "\x1b[33m",
  RED: "\x1b[31m",
  RESET: "\x1b[0m",
  CLEAR_LINE: "\x1b[2K\r", // 清除当前行并回到行首
}

export default class TerminalTime {
  private waitTimeTimer: NodeJS.Timeout | null = null // 等待时间计时器
  private currentWaitTime: number = 0 // 当前等待时间（秒）

  constructor() {
    this.subscribeAllEvents()
  }

  private subscribeAllEvents() {
    // 订阅事件，处理状态显示
    eventBus.subscribe("llm:request:start", () => {
      this.startWaitTimeIndicator()
    })

    eventBus.subscribe("llm:request:end", () => {
      this.clearWaitTimeIndicator()
    })

    eventBus.subscribe("tool:execute:start", (toolName: string) => {
      this.printGrayNotification(`运行工具: ${toolName}`)
    })

    eventBus.subscribe("skill:execute:start", (skillName: string) => {
      this.printGrayNotification(`运行技能: ${skillName}`)
    })
  }

  /**
   * 显示/更新LLM等待时间指示器
   * @param seconds 已等待秒数
   */
  updateWaitTimeIndicator(seconds: number): void {
    let color = ANSI_COLORS.GRAY
    if (seconds >= 15 && seconds < 30) {
      color = ANSI_COLORS.YELLOW
    } else if (seconds >= 30) {
      color = ANSI_COLORS.RED
    }

    // 清除当前行并显示新的等待时间
    process.stdout.write(
      `${ANSI_COLORS.CLEAR_LINE}                          (${color}Wating: ${seconds}s${ANSI_COLORS.RESET})`
    )
  }

  /**
   * 启动等待时间指示器，每秒自动更新
   */
  startWaitTimeIndicator(): void {
    this.currentWaitTime = 0
    this.updateWaitTimeIndicator(0)

    // 每秒更新一次
    this.waitTimeTimer = setInterval(() => {
      this.currentWaitTime++
      this.updateWaitTimeIndicator(this.currentWaitTime)
    }, 1000)
  }

  /**
   * 停止并清除等待时间指示器
   */
  clearWaitTimeIndicator(): void {
    if (this.waitTimeTimer) {
      clearInterval(this.waitTimeTimer)
      this.waitTimeTimer = null
    }
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
    this.clearWaitTimeIndicator()
  }
}
