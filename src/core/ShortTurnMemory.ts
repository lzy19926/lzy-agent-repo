import fs from "fs"
import path from "path"
import type { Message } from "../types/types"

export interface ShortTurnMemoryOptions {
  /** 记忆实例ID，用于隔离不同Agent的记忆，不传时使用全局默认路径 */
  id?: string
  /** 是否持久化到磁盘 */
  persist?: boolean
  /** 最大记忆条数，默认100 */
  maxLength?: number
  /** 持久化文件路径，默认: ./.lzyAgentCli/memory/{id}/short_term_memory.jsonl */
  persistPath?: string
  /** 持久化防抖延迟，默认200ms，短时间内连续写入会合并为一次 */
  saveDelay?: number
}

/**
 * 短期记忆模块
 * 负责管理最近对话消息，超过最大长度自动淘汰最早的消息
 * 支持JSONL格式持久化到磁盘，防抖写入优化性能
 */
export default class ShortTurnMemory {
  private messages: Message[] = []
  private readonly maxLength: number
  private readonly persist: boolean
  private readonly persistPath: string
  private readonly saveDelay: number
  private saveTimer?: NodeJS.Timeout

  constructor(options: ShortTurnMemoryOptions = {}) {
    this.maxLength = options.maxLength ?? 100
    this.persist = options.persist ?? false

    // 处理持久化路径：如果有id则按id隔离，否则使用默认路径
    if (options.persistPath) {
      this.persistPath = options.persistPath
    } else {
      const memoryBaseDir = path.join(process.cwd(), "./.lzyAgentCli/memory")
      if (options.id) {
        // 按id隔离路径
        this.persistPath = path.join(memoryBaseDir, options.id, "short_term_memory.jsonl")
      } else {
        // 全局默认路径
        this.persistPath = path.join(memoryBaseDir, "short_term_memory.jsonl")
      }
    }

    this.saveDelay = options.saveDelay ?? 200

    // 开启持久化时加载磁盘上的历史记录
    if (this.persist) {
      this.loadFromDisk()
    }
  }

  /**
   * 批量新增消息到记忆
   * 超过最大长度时自动删除最早的消息
   * 防抖批量持久化到磁盘，优化写入性能
   */
  addMessages(messages: Message[]): void {
    // 批量添加所有消息
    this.messages.push(...messages)

    // 超过最大长度，删除最早的消息
    if (this.messages.length > this.maxLength) {
      this.messages = this.messages.slice(-this.maxLength)
    }

    // 持久化到磁盘：防抖合并连续写入
    if (this.persist) {
      // 清除之前的未执行的写入任务
      if (this.saveTimer) {
        clearTimeout(this.saveTimer)
      }
      // 延迟写入，短时间内连续新增会合并为一次写入
      this.saveTimer = setTimeout(() => {
        this.saveToDisk()
        this.saveTimer = undefined
      }, this.saveDelay)
    }
  }

  /**
   * 强制刷新写入缓冲区，确保所有未持久化的消息都写入磁盘
   * 程序退出前调用，防止丢失最后一次写入数据
   */
  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveToDisk()
      this.saveTimer = undefined
    }
  }

  /**
   * 获取所有记忆消息
   * 返回深拷贝，防止外部修改内部数据
   */
  getMessages(): Message[] {
    return this.messages
  }

  /**
   * 清空所有记忆
   */
  clear(): void {
    this.messages = []
    if (this.persist) {
      // 删除持久化文件
      if (fs.existsSync(this.persistPath)) {
        fs.unlinkSync(this.persistPath)
      }
    }
  }

  /**
   * 从磁盘加载历史记忆
   */
  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.persistPath)) {
        fs.mkdirSync(path.dirname(this.persistPath), { recursive: true })
        fs.writeFileSync(this.persistPath, "")
        return
      }

      const content = fs.readFileSync(this.persistPath, "utf8")
      const lines = content
        .trim()
        .split("\n")
        .filter((line) => line.trim())

      this.messages = lines.map((line) => JSON.parse(line)) as Message[]

      // 加载后如果超过长度，裁剪到最大长度
      if (this.messages.length > this.maxLength) {
        this.messages = this.messages.slice(-this.maxLength)
        this.saveToDisk()
      }
    } catch (e) {
      console.error("加载短期记忆失败:", (e as Error).message)
      // 加载失败时清空无效数据
      this.messages = []
    }
  }

  /**
   * 保存记忆到磁盘，JSONL格式
   */
  private saveToDisk(): void {
    try {
      const content = this.messages.map((msg) => JSON.stringify(msg)).join("\n")
      fs.writeFileSync(this.persistPath, content, "utf8")
    } catch (e) {
      console.error("保存短期记忆失败:", (e as Error).message)
    }
  }
}
