import fs from "fs"
import path from "path"
import os from "os"
import YAML from "yaml"

import type { SkillMeta } from "../types/types"

interface SkillManagerOptions {
  skillsDirs?: string[] // 自定义技能扫描路径，优先级按顺序：后面的覆盖前面的
  pluginSkillsDirs?: string[] // 插件技能路径，优先级最低
}

export default class SkillManager {
  private skillPaths: string[] // 技能扫描路径列表，优先级从低到高
  private skills: Map<string, SkillMeta> // 技能注册表
  private static DEFAULT_GLOBAL_SKILLS_DIR = path.join(
    os.homedir(),
    ".lzyAgentCli",
    "skills"
  )
  private static DEFAULT_PROJECT_SKILLS_DIR = path.join(
    process.cwd(),
    ".lzyAgentCli",
    "skills"
  )

  constructor(options: SkillManagerOptions = {}) {
    // 初始化扫描路径，优先级：插件 < 全局 < 项目 < 自定义
    this.skillPaths = [
      ...(options.pluginSkillsDirs || []),
      SkillManager.DEFAULT_GLOBAL_SKILLS_DIR,
      SkillManager.DEFAULT_PROJECT_SKILLS_DIR,
      ...(options.skillsDirs || []),
    ]
    this.skills = new Map()
    this._loadSkillMetadata() // 启动时仅预加载元数据，渐进式加载
  }

  /**
   * 第一阶段：扫描所有技能路径，仅加载元数据（轻量级，不占内存）
   */
  private _loadSkillMetadata(): void {
    for (const baseDir of this.skillPaths) {
      if (!fs.existsSync(baseDir)) continue

      // 每个子目录是一个独立技能
      const skillDirs = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)

      for (const skillDir of skillDirs) {
        const skillRoot = path.join(baseDir, skillDir)
        const skillMetaPath = path.join(skillRoot, "SKILL.md")

        if (!fs.existsSync(skillMetaPath)) continue // 没有SKILL.md的目录不是合法技能

        try {
          // 仅读取文件前部分，解析YAML元数据，不加载完整body
          const content = fs.readFileSync(skillMetaPath, "utf8")
          const parts = content.split(/---[\r\n]+/)

          if (parts.length < 2) continue // 不符合SKILL.md格式要求

          // 解析元数据部分
          const metaYaml = parts[1]
          const meta = YAML.parse(metaYaml) as Partial<SkillMeta>

          if (!meta.name) continue // 元数据必须包含name字段

          // 注册元数据到索引，同名技能高优先级覆盖低优先级
          this.skills.set(meta.name, {
            name: meta.name,
            description: meta.description || "无描述",
            path: skillMetaPath,
            version: meta.version,
            author: meta.author,
            body: "",
          })
        } catch (e) {
          console.error(`解析技能元数据失败: ${skillDir}`, (e as Error).message)
        }
      }
    }
  }

  /**
   * 获取所有技能元数据
   */
  getSkills(): SkillMeta[] {
    return Array.from(this.skills.values()).map((skill) => ({ ...skill }))
  }

  /**
   * 获取单个技能，自动加载body内容
   */
  getSkill(skillName: string): SkillMeta | undefined {
    const skill = this.skills.get(skillName)
    if (!skill) return undefined

    // 自动加载SKILL.md内容（如果有路径且body为空）
    if (skill.path && !skill.body && fs.existsSync(skill.path)) {
      try {
        const content = fs.readFileSync(skill.path, "utf8")
        const parts = content.split(/---[\r\n]+/)

        let yaml = ""
        let body = ""

        if (parts.length >= 3) {
          // 标准格式：---\nyaml---\nbody
          yaml = parts[1].trim()
          body = parts.slice(2).join("---\n").trim()
        } else if (parts.length === 2) {
          // 紧凑格式：yaml---\nbody
          yaml = parts[0].trim()
          body = parts[1].trim()
        }

        // 最终 body 必须赋值（即使空）
        skill.body = body || ""
      } catch (e) {
        console.error(`加载技能内容失败: ${skillName}`, (e as Error).message)
      }
    }
    return { ...skill }
  }

  /**
   * 生成所有可用技能的列表提示
   * 用于注入到系统prompt中，告知大模型所有可用技能
   */
  generateSkillListPrompt(): string {
    const skills = this.getSkills()
    if (skills.length === 0) return ""

    let prompt = "当前可用技能列表：\n\n"
    skills.forEach((skill, index) => {
      prompt += `${index + 1}. skill_name: ${skill.name}\n`
      prompt += `   description: ${skill.description}\n\n`
    })
    prompt += "需要使用某个技能时，请调用 load_skill 工具加载完整技能内容。"
    return prompt
  }

  /**
   * 生成已加载技能的完整提示，包含工具调用说明
   */
  generateLoadedSkillPrompt(
    skillName: string,
    params?: Record<string, unknown>
  ): string {
    const skill = this.getSkill(skillName)
    if (!skill) return ""

    return `
你已经加载了技能 ${skill.name}，可以直接使用：

【技能：${skill.name}】
${skill.description}
---
${skill.body}
${params ? `\n【输入参数】：${JSON.stringify(params, null, 2)}` : ""}

当你需要使用工具时，按照以下格式返回：
<|FunctionCallBegin|>[{"name":"工具名称","parameters":{"参数名":"参数值"}}]<|FunctionCallEnd|>

不需要使用工具时直接回复用户即可。
`
  }
}
