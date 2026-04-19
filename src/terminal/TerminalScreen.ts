import chalk from "chalk"
import boxen from "boxen"
import commandBus from "../bus/CommandBus"

export default class TerminalScreen {
  /**
   * 显示欢迎界面
   */
  async showWelcome() {
    // 先清屏
    console.clear()
    // 每次渲染都获取最新终端宽度，最小宽度80防止过小错乱
    const width = Math.max(process.stdout.columns, 80)
    const contentWidth = width - 2 // 减去左右边框各1个字符
    // 头部信息
    const infoText = "Lzy Agent Cli • v1.0.0"
    const infoPadding = Math.max(
      0,
      Math.floor((contentWidth - infoText.length) / 2)
    )
    const info = " ".repeat(infoPadding) + chalk.whiteBright.bold(infoText)
    const tipsText = "/ 查看更多指令"
    const tipsPadding = Math.max(
      0,
      Math.floor((contentWidth - tipsText.length) / 2)
    )
    const tips = " ".repeat(tipsPadding) + chalk.gray(tipsText)

    // 获取已注册的Agent列表
    const { agents } = await commandBus.invoke("command:agent:list")
    // Agent列表左对齐，加左边距
    const agentList = agents
      .map(
        (agent: { name: string; description: string }) =>
          `    🤖[${agent.name}]: ${agent.description}`
      )
      .join("\n\n")

    const content = `
${info}
${tips}

${agentList}
`
    // Claude 风格边框
    const welcome = boxen(content, {
      align: "left",
      margin: 0,
      borderColor: "cyan",
      borderStyle: "round",
      width: width,
      height: 15,
    })

    console.log(welcome)
  }
}
