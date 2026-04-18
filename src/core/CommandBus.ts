class CommandBus {
  // 存储命令处理器
  private commandHandlers = new Map<
    string,
    (...args: any[]) => Promise<any> | any
  >()
  private static instance: CommandBus
  private constructor() {}

  /**
   * 获取全局唯一实例
   */
  public static getInstance(): CommandBus {
    if (!CommandBus.instance) {
      CommandBus.instance = new CommandBus()
    }
    return CommandBus.instance
  }

  /**
   * 注册命令处理器
   */
  public register<T = any>(
    commandName: string,
    handler: (...args: any[]) => T | Promise<T>
  ): void {
    this.commandHandlers.set(commandName, handler)
  }

  /**
   * 调用命令
   */
  public async invoke<T = any>(
    commandName: string,
    ...args: any[]
  ): Promise<T> {

    const handler = this.commandHandlers.get(commandName)
    if (!handler) {
      throw new Error(`命令未注册：${commandName}`)
    }
    return await handler(...args)
  }
}

/**
 * 全局唯一命令总线
 * 统一管理所有跨模块命令触发
 */
export default CommandBus.getInstance()
