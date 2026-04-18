# 🤖 LZY Agent CLI

原生TypeScript开发的极简Agent构建框架 , Agent CLI 工具，支持多Agent切换、多Agent通信, 技能扩展、工具调用和持久化记忆。

## ✨ 功能特性

- ✅ 终端多轮对话，基于 [@clack/prompts](https://github.com/natemoo-re/clack) 打造优雅交互体验
- ✅ 自定义技能系统，自动扫描全局/项目/插件目录下的技能，轻松扩展功能
- ✅ 系统工具支持，内置PowerShell/Bash/WebSearch/消息转发等工具，可直接调用系统能力
- ✅ 多Agent架构，支持不同角色的专业Agent切换，每个Agent拥有独立记忆
- ✅ 多Agent通信，Agent之间可以互相发送消息、委托任务，支持灵活的多Agent协作
- ✅ 分层上下文记忆，短期记忆支持持久化到本地文件，会话永不丢失
- ✅ 原生对接LLM大模型，默认支持智谱GLM-4系列，可扩展其他模型
- ✅ 内置多种实用命令，支持Agent切换、技能管理等操作
- ✅ 完全TypeScript编写，类型安全，易于维护和扩展

## 🚀 安装使用

### 本地运行
```bash
# 安装依赖
npm install

# 编译TypeScript
npm run build

# 启动程序
npm start

# 开发模式（实时编译）
npm run dev
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
| `/tools` | 查看所有可用的系统工具 |

## 🛠️ 自定义技能

在 `.lzyAgentCli/skills/` 目录下新建SKILL.md文件/文件夹：

程序启动时会自动加载 `.lzyAgentCli/skills/` 目录下的所有技能，也支持扫描全局和插件目录下的技能。


## 🔧 系统工具

项目内置了系统工具能力，可以方便地调用系统资源：

### PowerShell工具
支持直接执行PowerShell命令，无需手动编写技能：
```typescript
// Agent会自动根据用户需求调用此工具
// 例如用户问："查看当前目录下的文件"，Agent会自动调用PowerShell执行dir命令
```

### Bash工具
支持直接执行Bash命令，适用于Linux/macOS/WSL/Git Bash环境：
```typescript
// Agent会自动根据用户需求调用此工具
// 例如用户问："查看当前目录下的文件"，Agent会自动调用Bash执行ls命令
```

### 消息转发工具
支持Agent之间互相发送消息，实现多Agent协作：
```typescript
// Agent会自动根据用户需求调用此工具
// 例如用户问："把'你好'发送给code-agent"，Agent会自动调用此工具转发消息
```

如需添加更多系统工具，可以在 `src/tools/` 目录下编写，然后在 `src/index.ts` 中注册：
```typescript
toolsManager.register(YourTool, YourToolDefinition)
```

## 📁 项目结构

```
├── .lzyAgentCli/         # 脚手架缓存
│   └── memory            # 记忆文件存储目录（自动生成）
│   └── skills            # 项目内置skills
│
├── bin/                  # 命令行入口
│   └── agent.js
│
├── src/
│   ├── agents/           # Agent实现目录
│   │   ├── Agent.ts      # 基础Agent类
│   │   └── AgentLoop.ts  # Agent思考循环核心逻辑
│   ├── core/             # 核心模块
│   │   ├── AgentManager.ts # Agent管理器，负责Agent注册、切换
│   │   ├── ShortTurnMemory.ts # 短期记忆管理器，支持持久化
│   │   ├── SkillManager.ts # 技能管理器，自动加载和执行技能
│   │   └── ToolsManager.ts # 工具管理器，统一管理系统工具
│   ├── terminal/         # 终端交互模块
│   │   ├── TerminalUI.ts # 终端UI渲染和用户输入处理
│   │   └── CommandExecuter.ts # 系统命令解析和执行
│   ├── tools/            # 系统工具实现目录
│   │   ├── PowerShellTool.ts # PowerShell命令执行工具
│   │   ├── BashTool.ts # Bash命令执行工具
│   │   ├── WebSearchTool.ts # 网页搜索工具
│   │   └── SendMessageToAgentTool.ts # Agent间消息转发工具
│   ├── types/            # TypeScript类型定义
│   ├── utils/            # 工具函数
│   ├── bus/              # 事件总线（可选）
│   └── index.ts          # 程序主入口

├── dist/                 # TypeScript编译输出目录（自动生成）
├── package.json
└── tsconfig.json
```

## ⚙️ 配置说明

### 记忆配置
每个Agent的记忆可以独立配置：
```typescript
const memory = new ShortTurnMemory({
  id: "agent-id", // 记忆唯一标识，用于持久化文件名
  persist: true, // 是否持久化到本地文件
  maxLength: 100, // 最大记忆条数
})
```

### 技能配置
技能管理器支持配置多个扫描目录：
```typescript
const skillManager = new SkillManager({
  scanDirs: [
    "./.lzyAgentCli/skills", // 项目内置技能
    "/path/to/global/skills", // 全局技能目录
    "/path/to/plugin/skills" // 插件技能目录
  ]
})
```

## 📝 许可

ISC
