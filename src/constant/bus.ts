/**
 * 总线常量定义
 * 包含所有事件(EVENT)和命令(COMMAND)常量
 */

export const EVENT = {
  APP: {
    /**应用退出事件*/
    EXIT: "event:app:exit",
  },
  SESSION: {
    /**会话清空事件*/
    CLEAR: "event:session:clear",
  },
  AGENT: {
    /**Agent切换完成事件*/
    SWITCHED: "event:agent:switched",
  },
  SKILL: {
    /**技能加载完成事件*/
    LOADED: "event:skill:loaded",
  },
  TOOLS: {
    /**工具调用中事件*/
    CALLING: "event:tools:calling",
  },
}

export const COMMAND = {
  AGENT: {
    /**获取Agent列表*/
    LIST: "command:agent:list",
    /**切换Agent*/
    SWITCH: "command:agent:switch",
  },
  SKILL: {
    /**获取技能列表*/
    LIST: "command:skill:list",
    /**加载技能*/
    LOAD: "command:skill:load",
  },
}