import type Agent from "../agents/Agent"
import eventBus from "../bus/EventBus"
import commandBus from "../bus/CommandBus"

class AgentManager {
  private static instance: AgentManager
  private agents: Map<string, Agent>
  public currentAgent: Agent | null

  private constructor() {
    this.agents = new Map()
    this.currentAgent = null
    this.subscribeAllEvents()
    this.registerAllCommands()
  }

  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager()
    }
    return AgentManager.instance
  }

  // ========================
  // 全局Event订阅
  // ========================
  private subscribeAllEvents() {
    // 订阅应用退出事件
    eventBus.subscribe("event:app:exit", () => {
      // 退出前flush当前Agent记忆
      const currentAgent = this.getCurrentAgent()
      currentAgent.memory.flush()
    })

    // 订阅会话清空事件
    eventBus.subscribe("event:session:clear", () => {
      const currentAgent = this.getCurrentAgent()
      currentAgent.memory.clear()
    })
  }
  // ========================
  // 全局Command订阅
  // ========================
  private registerAllCommands() {
    // 订阅Agent列表查询命令
    commandBus.register("command:agent:list", () => {
      return {
        agents: this.getAgents(),
        currentAgent: this.getCurrentAgent(),
      }
    })
    // 订阅Agent切换命令
    commandBus.register("command:agent:switch", (agentName: string) => {
      const currentAgent = this.switchAgent(agentName)
      return {
        success: currentAgent ? true : false,
        agent: currentAgent,
      }
    })
    // 订阅技能列表查询命令
    commandBus.register("command:skill:list", () => {
      const currentAgent = this.getCurrentAgent()
      return {
        skills: currentAgent.skillManager.getSkills(),
        loadedSkillName: currentAgent.currentSkill?.name,
      }
    })
    // 订阅技能加载命令
    commandBus.register("command:skill:load", (skillName: string) => {
      try {
        const currentAgent = this.getCurrentAgent()
        const success = currentAgent.loadSkill(skillName)
        return { success }
      } catch (e) {
        return { success: false, message: (e as Error).message }
      }
    })
  }

  // 注册Agent
  registerAgent(agent: Agent): boolean {
    if (!agent.name) {
      throw new Error("Agent必须包含 name 字段")
    }
    this.agents.set(agent.name, agent)

    if (!this.currentAgent) {
      this.currentAgent = agent
    }

    return true
  }

  // 获取所有Agent
  getAgents(): { name: string; description: string }[] {
    return Array.from(this.agents.values()).map((agent) => ({
      name: agent.name,
      description: agent.description || "无描述",
    }))
  }

  // 获取当前使用的Agent
  getCurrentAgent(): Agent {
    if (!this.currentAgent) {
      throw new Error("没有可用的Agent")
    }
    return this.currentAgent
  }

  // 获取指定名称的Agent
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name)
  }

  // 切换Agent
  switchAgent(name: string): Agent {
    const agent = this.agents.get(name)
    if (!agent) {
      throw new Error(`Agent不存在: ${name}`)
    }
    this.currentAgent = agent
    return agent
  }
}

/**
 * 全局单例 Agent管理器
 * */
export default AgentManager.getInstance()
