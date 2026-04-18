import type Agent from "../agents/Agent"

export default class AgentManager {
  private agents: Map<string, Agent>
  public currentAgent: Agent | null

  constructor() {
    this.agents = new Map()
    this.currentAgent = null
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
