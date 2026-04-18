# 🤖 LZY Agent CLI

极简 Agent CLI 工具，基于 pi-nomo 的 agent-loop 原理实现。

## ✨ 功能特性

- ✅ 终端多轮对话
- ✅ 自定义技能系统，轻松扩展功能
- ✅ 安全的代码沙箱执行，支持JS代码运行
- ✅ 多Agent架构，支持不同角色的专业Agent切换
- ✅ 分层上下文记忆，支持持久化到本地md文件
- ✅ 内置多种实用命令

## 🚀 安装使用

### 本地运行
```bash
# 安装依赖
npm install

# 启动
npm start
```

### 全局安装
```bash
# 全局安装
npm link

# 运行
agent
```

## 📖 可用命令

| 命令 | 说明 |
|------|------|
| `/help` | 查看帮助信息 |
| `/exit` | 退出程序 |
| `/clear` | 清屏并清空当前会话上下文 |
| `/agents` | 查看所有可用的Agent |
| `/use <agent-name>` | 切换到指定Agent |
| `/skills` | 查看当前Agent可用的技能 |

## 🛠️ 自定义技能

在 `src/skills/` 目录下新建JS文件，按照以下格式编写：

```javascript
module.exports = {
  name: 'skill_name', // 技能名称（唯一）
  description: '技能描述',
  parameters: [ // 参数定义
    {
      name: 'param1',
      type: 'string',
      required: true,
      description: '参数描述'
    }
  ],
  execute: async (params) => { // 技能执行逻辑
    // 你的代码
    return { result: '执行结果' }
  }
}
```

程序启动时会自动加载 `src/skills/` 目录下的所有技能。

## 🧠 自定义Agent

在 `src/agents/` 目录下新建JS文件，继承BaseAgent：

```javascript
const BaseAgent = require('./BaseAgent')

class MyAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      name: 'my-agent', // Agent名称（唯一）
      description: '我的自定义Agent',
      systemPrompt: '你的系统提示词',
      allowedSkills: [], // 允许使用的技能列表，空表示全部允许
      ...options
    })
  }

  // 重写think方法，实现自己的思考逻辑
  async think(lastActionResult = null) {
    return {
      action: 'reply', // 可选：reply、call_skill、execute_code
      content: '回复内容'
    }
  }
}

module.exports = MyAgent
```

程序启动时会自动加载 `src/agents/` 目录下的所有Agent。

## 🔌 对接LLM

默认的Agent是简单的规则实现，你可以修改 `think` 方法，对接自己的LLM API来实现更智能的功能：

```javascript
async think(lastActionResult = null) {
  // 1. 构造prompt，包含上下文、技能列表等信息
  // 2. 调用LLM API获取回复
  // 3. 解析LLM返回的内容，决定下一步动作
  return {
    action: 'call_skill',
    skill: 'get_time',
    params: {}
  }
}
```

## 📁 项目结构

```
├── bin/                  # 命令行入口
│   └── agent.js
├── src/
│   ├── core/             # 核心模块
│   │   ├── AgentLoop.js  # Agent循环引擎
│   │   ├── AgentManager.js # Agent管理器
│   │   ├── CodeExecutor.js # 代码沙箱执行器
│   │   ├── CommandParser.js # 命令解析器
│   │   ├── ContextManager.js # 上下文记忆管理器
│   │   ├── SkillManager.js # 技能管理器
│   │   └── TerminalUI.js # 终端UI
│   ├── agents/           # Agent目录
│   ├── skills/           # 技能目录
│   └── index.js          # 程序主入口
├── memory/               # 记忆文件存储目录（自动生成）
└── package.json
```

## 📝 许可

ISC
