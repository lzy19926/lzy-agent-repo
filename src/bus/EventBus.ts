import { EventEmitter } from "events"

/**
 * 全局唯一事件总线单例
 * 统一管理所有跨模块事件的发布与订阅
 */
class EventBus extends EventEmitter {
  private static instance: EventBus

  private constructor() {
    super()
    this.setMaxListeners(50)
  }

  /**
   * 获取全局唯一实例
   */
  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  /**
   * 发布事件
   * @param eventName 事件名
   * @param args 事件参数
   */
  public publish(eventName: string, ...args: any[]): boolean {
    return this.emit(eventName, ...args)
  }

  /**
   * 订阅事件
   * @param eventName 事件名
   * @param listener 监听器函数
   */
  public subscribe(
    eventName: string,
    listener: (...args: any[]) => void
  ): this {
    return this.on(eventName, listener)
  }

  /**
   * 取消订阅事件
   * @param eventName 事件名
   * @param listener 监听器函数
   */
  public unsubscribe(
    eventName: string,
    listener: (...args: any[]) => void
  ): this {
    return this.off(eventName, listener)
  }

  /**
   * 订阅一次事件，触发后自动取消订阅
   * @param eventName 事件名
   * @param listener 监听器函数
   */
  public subscribeOnce(
    eventName: string,
    listener: (...args: any[]) => void
  ): this {
    return this.once(eventName, listener)
  }
}

/**
 * 全局唯一事件总线单例
 * 统一管理所有跨模块事件的发布与订阅
 */
export default EventBus.getInstance()
