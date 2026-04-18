# 多Agent通信技术方案

## 📖 功能概述
本项目支持Agent之间的消息转发和协作，用户可以让一个Agent给另一个Agent发送消息、委托任务，实现灵活的多Agent协作模式。

## ✨ 能力特性
- ✅ Agent之间直接发送消息，无需用户手动切换
- ✅ 自动识别用户意图，自主调用消息转发工具
- ✅ 回复消息自动携带发送方Agent名称标识
- ✅ 支持复杂任务委托，Agent之间可以多轮协作
- ✅ 完全透明的调用过程，用户无需了解底层实现

---

## 🎯 使用示例
### 基础使用
用户输入：
```
🧑>-- 把"写一个快速排序的Python代码"发送给code-agent
```
系统输出：
```
🤖[general-agent]
已收到来自code-agent的回复：

这是快速排序的Python实现：
```python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
```
### 复杂任务委托
用户输入：
```
🧑>-- 让code-agent写一个计算器的前端页面，然后让design-agent给它优化UI设计
```
系统会自动完成：
1. general-agent给code-agent发消息，让它写计算器前端代码
2. code-agent返回代码给general-agent
3. general-agent把代码发送给design-agent，让它优化UI
4. design-agent返回优化后的代码给general-agent
5. general-agent把最终结果返回给用户

---

## 🏗️ 技术架构
### 核心组件
| 组件 | 职责 |
|------|------|
| SendMessageToAgentTool | 消息转发工具，负责Agent之间的消息传递 |
| AgentManager | 单例管理器，提供Agent实例查询能力 |
| AgentLoop | 自动识别消息转发意图，调用工具 |
| TerminalUI | 显示Agent名称标识，区分不同Agent的回复 |

### 消息流转流程
```mermaid
flowchart LR
    A[用户输入] --> B[当前Agent接收消息]
    B --> C{LLM判断是否需要转发}
    C -->|是| D[调用SendMessageToAgentTool工具]
    D --> E[通过AgentManager查询目标Agent]
    E --> F[调用目标Agent.chat()方法]
    F --> G[目标Agent生成回复]
    G --> H[返回给调用方Agent]
    H --> I[调用方Agent整理结果返回给用户]
    C -->|否| J[当前Agent直接处理返回结果]
    I --> K[终端显示带Agent名称的回复]
    J --> K
```

---

## 🔧 核心实现

### 1. 消息工具实现
```typescript
// src/tools/SendMessageToAgentTool.ts
const definition: FunctionToolDefinition = {
  type: "function",
  function: {
    name: "SendMessageToAgentTool",
    description: "发送消息给指定的其他Agent，当用户需要和其他Agent对话、委托任务、转发消息时使用此工具。",
    parameters: {
      type: "object",
      properties: {
        agentName: {
          type: "string",
          description: "目标Agent的名称，比如agent2、code-agent等",
        },
        message: {
          type: "string",
          description: "要发送给目标Agent的完整消息内容",
        },
      },
      required: ["agentName", "message"],
    },
  },
}

async function executeSendMessageTool(input: { agentName: string; message: string }) {
  // 获取目标Agent实例
  const targetAgent = agentManager.getAgent(input.agentName)
  if (!targetAgent) {
    return { success: false, error: `Agent不存在: ${input.agentName}` }
  }
  
  // 调用目标Agent的chat方法
  const response = await targetAgent.chat(input.message)
  
  return {
    success: true,
    from: input.agentName,
    response: response,
    content: `收到来自${input.agentName}的回复：\n${response}`,
  }
}
```

### 2. AgentManager单例实现
```typescript
// src/core/AgentManager.ts
class AgentManager {
  private static instance: AgentManager
  private agents: Map<string, Agent>
  
  private constructor() {
    this.agents = new Map()
  }
  
  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager()
    }
    return AgentManager.instance
  }
  
  // 获取指定Agent
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name)
  }
}

// 导出单例实例
export default AgentManager.getInstance()
```
**设计亮点**：
- 私有构造函数，确保全局只有一个实例
- 所有模块（包括工具层）都能获取到同一个AgentManager实例
- Agent注册和查询都在同一个实例上，数据完全一致

### 3. 终端显示Agent名称
```typescript
// src/terminal/TerminalUI.ts
private async startInputLoop(): Promise<void> {
  while (this.isRunning) {
    process.stdout.write(this.promptText)
    const input = await clack.text({ message: "", defaultValue: "" })
    
    if (clack.isCancel(input)) {
      this.close()
      return
    }
    
    const trimInput = (input as string).trim()
    if (!trimInput) continue
    
    try {
      if (this.onInput) {
        const result = await this.onInput(trimInput)
        if (result) {
          let content: string
          let prefix = "🤖 >--"
          if (typeof result === "string") {
            content = result
          } else {
            content = result.content || result.text || ""
            if (result.agentName) {
              prefix = `[${result.agentName}] >--`
            }
          }
          if (content) {
            this.print(content, prefix)
          }
        }
      }
    } catch (e: unknown) {
      const error = e as Error
      this.printError(`处理失败: ${error.message}`)
    }
  }
}
```

### 4. 系统提示词增强
为了让Agent更好地理解和使用消息转发功能，需要在Agent的系统提示中加入：
```
你可以使用SendMessageToAgentTool工具给其他Agent发送消息。
当用户说"把XXX发送给YYY"、"告诉YYY做XXX"、"让YYY帮我做XXX"这类指令时，
你应该调用这个工具，agentName参数填目标Agent的名称，message参数填要发送的内容。
工具执行后会返回目标Agent的回复，你把这个回复整理后返回给用户即可。
```

---

## 📐 设计优势

### 1. 无侵入式实现
- 不需要修改Agent的核心逻辑
- 不需要修改现有的交互流程
- 完全基于工具系统实现，和其他工具使用方式一致

### 2. 灵活性高
- Agent可以自主决定什么时候转发消息
- 支持任意Agent之间的消息传递，没有层级限制
- 支持复杂的多Agent协作流程，不限制消息转发次数

### 3. 扩展性强
- 可以很容易扩展消息的格式和内容
- 可以增加消息审核、消息历史记录等功能
- 可以支持跨进程、跨机器的Agent通信（未来扩展）

---

## 🚀 高级扩展

### 1. 消息广播
可以扩展工具支持同时给多个Agent发送消息：
```typescript
// 扩展参数支持数组
parameters: {
  agentNames: {
    type: "array",
    items: { type: "string" },
    description: "目标Agent名称列表"
  },
  message: { type: "string" }
}
```

### 2. 消息队列
对于耗时较长的任务，可以增加消息队列支持，异步处理消息：
- 发送消息后立即返回消息ID
- 用户可以查询消息处理状态
- 处理完成后主动通知用户

### 3. 权限控制
增加Agent之间的调用权限控制：
- 配置哪些Agent可以给哪些Agent发消息
- 敏感操作需要用户确认
- 支持黑白名单配置

### 4. 跨进程通信
未来可以扩展支持跨进程、跨机器的Agent通信：
- 基于HTTP API实现远程Agent调用
- 支持Agent部署在不同的服务器上
- 实现分布式多Agent协作系统

---

## 🎨 最佳实践
1. **Agent职责明确**：每个Agent专注于自己擅长的领域，避免全能Agent
2. **提示词清晰**：明确告诉Agent什么时候应该使用消息转发工具
3. **错误处理完善**：对于不存在的Agent、调用失败等情况，返回友好提示
4. **结果整理**：调用方Agent可以对目标Agent的回复进行整理，再返回给用户
5. **用户体验优先**：消息转发过程对用户透明，不需要用户关心底层实现
