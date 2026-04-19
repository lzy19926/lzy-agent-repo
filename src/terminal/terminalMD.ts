//@ts-nocheck
// 轻量级终端MD显示插件
import chalk from "chalk"
import { marked } from "marked"
import { markedTerminal } from "marked-terminal"

marked.use(
  markedTerminal({
    // 代码块（最常用）
    code: chalk.yellowBright,
    codespan: chalk.bgHex("#1a1a1a").hex("#f9c094").bold,

    // 引用
    blockquote: chalk.hex("#8BE9FD").italic.bold,

    // 标题
    heading: chalk.hex("#50fa7b").bold.underline,
    firstHeading: chalk.hex("#BD93F9").bold.underline,

    // 分割线
    hr: chalk.gray.dim,

    // 列表
    listitem: chalk.white,
    list: (body, ordered) => {
      if (ordered) {
        return body.replace(/^/gm, "  ")
      }
      return body.replace(/^\s*\*\s*/gm, "").replace(/^/gm, "● ")
    },

    // 段落 & 文字
    paragraph: chalk.white,
    text: chalk.white,

    // 强调
    strong: chalk.white.bold,
    em: chalk.italic.hex("#FF79C6"),
    del: chalk.strikethrough.dim,

    // 链接
    link: chalk.hex("#62EAFA").underline,
    href: chalk.dim.hex("#62EAFA"),

    // 表格
    table: chalk.white,
    tableOptions: {
      borderColor: "gray",
      border: ["│", "─", "┼"],
    },

    // 通用优化
    width: 90,
    reflowText: true,
    tab: 2,
    unescape: true,
    emoji: true,
    showSectionPrefix: false,
  })
)

export default marked