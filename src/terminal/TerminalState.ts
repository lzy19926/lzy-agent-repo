import eventBus from "../bus/EventBus"
import { formatDuration } from "../utils"
import { ANSI_COLORS, TIME_THRESHOLDS, SPINNER_CHARS, THINKING_TEXTS } from "../constant/terminal"
/**
 * 终端状态指示器封装
 * 负责管理LLM请求的等待时间、待执行工具、运行中技能等状态的显示，包括颜色变化和定时更新
 */

export default class TerminalState {
  private stateTimer: NodeJS.Timeout | null = null // 状态更新计时器
  private currentWaitTime: number = 0 // 当前等待时间（秒）
  private pendingTools: string[] = [] // 当前待执行的工具列表
  private currentSkill: string | null = null // 当前正在执行的技能
  private spinnerFrame: number = 0 // 加载动画当前帧索引
  private currentThinkingText: string = "思考中" // 当前随机思考文案

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
    if (seconds >= TIME_THRESHOLDS.YELLOW && seconds < TIME_THRESHOLDS.ORANGE) {
      timeColor = ANSI_COLORS.YELLOW
    } else if (
      seconds >= TIME_THRESHOLDS.ORANGE &&
      seconds < TIME_THRESHOLDS.RED
    ) {
      timeColor = ANSI_COLORS.ORANGE
    } else if (seconds >= TIME_THRESHOLDS.RED) {
      timeColor = ANSI_COLORS.RED
    }

    // 获取当前加载动画字符
    const spinnerChar = SPINNER_CHARS[this.spinnerFrame % SPINNER_CHARS.length]
    this.spinnerFrame++

    // 转换秒数为分秒格式
    const timeDisplay = formatDuration(seconds)

    // 构造显示内容：[转圈圈] 思考中… (时间 | toolCalling | skill)
    // 括号和分隔符使用灰色
    let bracketContent = `${timeColor}${timeDisplay}${ANSI_COLORS.RESET}`

    // 添加工具列表信息
    if (this.pendingTools.length > 0) {
      bracketContent += `${ANSI_COLORS.GRAY} | ${ANSI_COLORS.RESET}${
        ANSI_COLORS.GRAY
      }toolCalling: ${this.pendingTools.join(", ")}${ANSI_COLORS.RESET}`
    }

    // 添加当前技能信息
    if (this.currentSkill) {
      bracketContent += `${ANSI_COLORS.GRAY} | ${ANSI_COLORS.RESET}${ANSI_COLORS.GRAY}skill: ${this.currentSkill}${ANSI_COLORS.RESET}`
    }

    // 括号使用灰色，转圈圈和思考文案使用深蓝色
    const displayContent = `${ANSI_COLORS.LIGHT_BLUE}${spinnerChar} ${this.currentThinkingText}… ${ANSI_COLORS.RESET}${ANSI_COLORS.GRAY}(${ANSI_COLORS.RESET}${bracketContent}${ANSI_COLORS.GRAY})${ANSI_COLORS.RESET}`

    // 清除当前行并左对齐显示内容
    process.stdout.write(`${ANSI_COLORS.CLEAR_LINE}${displayContent}`)
  }

  /**
   * 启动状态指示器，每秒自动更新
   */
  startStateIndicator(): void {
    this.clearStateIndicator()

    this.pendingTools = []
    this.currentWaitTime = 0
    this.spinnerFrame = 0
    // 随机选择思考文案
    this.currentThinkingText = THINKING_TEXTS[Math.floor(Math.random() * THINKING_TEXTS.length)]
    // 上方空一行
    process.stdout.write("\n")
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
    // 下方空一行
    process.stdout.write("\n")
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
