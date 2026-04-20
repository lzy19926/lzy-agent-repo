/**
 * 全局异步互斥锁
 * 作用：确保异步函数**串行执行、同一时间只运行一个**，解决并发冲突
 * 适用：文件写入、数据库操作、Agent 工具调用排队
 */

// 全局锁队列：存储上一个任务的 Promise，用于实现排队
let lockPromise: Promise<void> = Promise.resolve()

/**
 * 加锁执行异步函数
 * @param fn 需要排队执行的异步函数
 * @returns 返回 fn 的执行结果 Promise
 */
export async function lockExec<T>(fn: () => Promise<T>): Promise<T> {
  // 1. 等待前面所有任务执行完毕（排队等待）
  await lockPromise

  // 2. 创建执行器：执行 fn，执行完自动释放锁
  const executor = async () => {
    try {
      await fn()
    } finally {
      // 无论成功失败，锁都会释放
    }
  }

  // 3. 将当前任务加入锁队列，后续任务必须等它完成
  lockPromise = executor()

  // 4. 返回当前任务的执行结果（支持 await 获取返回值）
  return fn()
}
