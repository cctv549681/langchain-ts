import { ContentAnalysis, ChapterAnalysis, Chapter } from "../types/document";
import { EpisodePlan, EpisodePlanningResult } from "../types/script";
import { DEFAULT_MODEL, DEFAULT_VIDEO_DURATION } from "../config/constants";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { getModelBuilder } from "../helper/getModelBuilder";

// Zod Schema for the complete planning result
const episodePlanningResultSchema = z.object({
  chapterSummary: z.string().describe("章节内容总结，300-500字，提炼核心要点和主要观点"),
  extractedConcepts: z.array(z.string()).min(3).max(8).describe("从章节中提取的核心概念列表"),
  splitRationale: z.string().describe("拆分成多个视频的理由和逻辑，说明为什么这样划分"),
  episodes: z.array(z.object({
    id: z.string().describe("唯一的剧集ID，例如 ep-xxxxxx"),
    title: z.string().describe("引人入胜的集数标题，与章节内容紧密相关"),
    order: z.number().int().positive().describe("集数编号，从1开始"),
    synopsis: z.string().describe("本集100字左右大纲，基于章节具体内容，不脱离原文"),
    keyPoints: z.array(z.string()).min(3).max(5).describe("3-5个关键点，直接来源于章节内容"),
    coreConcepts: z.array(z.string()).min(1).max(3).describe("本集涉及的核心概念，来自extractedConcepts"),
    contentSource: z.string().describe("本集内容在原章节中的具体来源或段落描述"),
    visualizationSuggestions: z.array(z.string()).describe("基于具体内容的视觉表现建议"),
    exampleTypes: z.array(z.string()).describe("建议的示例类型，基于章节中的实际案例"),
    estimatedDuration: z.number().int().positive().describe("预估时长（秒），约180秒"),
    targetTone: z.enum(["educational", "conversational", "inspirational", "analytical", "storytelling"]).describe("目标风格基调"),
  })).min(2).max(4).describe("2-4个视频大纲")
});

/**
 * 规划解说集数
 * @param chapterAnalysis 章节分析结果
 * @param chapter 章节内容
 * @returns 集数规划结果
 */
export async function planEpisodes(
  chapterAnalysis: ChapterAnalysis,
  chapter: Chapter
): Promise<EpisodePlanningResult> {
  try {
    const builder = await getModelBuilder(
      { type: "chat", provider: "ollama", model: "qwen3:4b" },
      {
        temperature: 0,
        verbose: true, // 输出详细日志
      }
    );

    const model = (await builder()).withStructuredOutput(episodePlanningResultSchema, {
      name: "planEpisodes",
    });

    const planPrompt = ChatPromptTemplate.fromTemplate(
`你是一位专业的知识类短视频策划专家。请按照以下步骤，将章节内容转化为2-4个3分钟短视频大纲。

## 第一步：章节内容总结
仔细阅读章节内容，写出300-500字的总结，包括：
- 章节的核心主题和主要观点
- 关键信息和重要细节
- 逻辑结构和论证过程
- 实际案例和例子

## 第二步：概念提取
从章节内容中提取3-8个核心概念，这些概念应该：
- 是章节中明确提到或重点阐述的
- 具有独立的教育价值
- 适合在短视频中讲解
- 有清晰的定义和应用场景

## 第三步：视频拆分策略
基于章节内容的复杂度、概念数量和逻辑结构，决定拆分成2-4个视频，并说明：
- 为什么选择这个数量的视频
- 每个视频的内容范围和重点
- 视频之间的逻辑关系和递进性
- 如何确保每个视频内容完整且自包含

## 第四步：视频大纲制作
为每个视频制作详细大纲，确保：
- 每个视频约3分钟（180秒）
- 大纲100字左右，紧密贴合章节原文内容
- 明确指出内容来源于章节的哪个部分
- 不添加章节中没有的内容
- 保持与原文的一致性和准确性

## 输入信息：

章节标题：
<章节标题>{chapterTitle}</章节标题>

章节分析：
<章节分析>{chapterAnalysis}</章节分析>

章节内容：
<章节内容>{chapterContent}</章节内容>

## 输出要求：
请严格按照schema结构输出，包含章节总结、提取概念、拆分理由和视频大纲。每个视频大纲必须与章节内容密切相关，不得脱离原文内容。`
    );

    const chapterAnalysisStr = JSON.stringify(chapterAnalysis, null, 2);

    const response = await model.invoke(
      await planPrompt.format({
        chapterAnalysis: chapterAnalysisStr,
        chapterContent: JSON.stringify(chapter.pageContent, null, 2),
        chapterTitle: JSON.stringify(chapter.title, null, 2),
      })
    );
    console.log(response);

    return response;
  } catch (error: any) {
    console.error("规划解说集数失败:", error);
    throw new Error("规划解说集数失败: " + error.message);
  }
}

// Zod Schema for Style Definition
const styleDefinitionSchema = z.object({
  style: z.object({
    tonality: z.string().describe("视频整体基调（例如：严谨学术型、轻松对话型、启发思考型）"),
    narrationStyle: z.string().describe("解说风格描述，包括语速、语调、表达特点等"),
    linguisticFeatures: z.string().describe("语言特点，例如：是否使用修辞、类比、问句等"),
    personalityTrait: z.string().describe("解说人设特点（例如：专业教授、好奇探索者、贴心导师）"),
  }),
  audience: z.object({
    primaryTarget: z.string().describe("主要目标受众描述"),
    ageRange: z.string().describe("适合的年龄范围"),
    knowledgeLevel: z.string().describe("假设的知识水平"),
    interests: z.array(z.string()).describe("受众兴趣点列表"),
  }),
  presentationRules: z.array(z.string()).describe("表达规则列表 (例如：避免使用专业术语)"),
  visualConsiderations: z.array(z.string()).describe("视觉元素建议列表"),
  introOutroTemplates: z.object({
    introTemplate: z.string().describe("开场白模板，XX字以内"),
    outroTemplate: z.string().describe("结束语模板，XX字以内"),
    transitionPhrases: z.array(z.string()).describe("过渡短语列表"),
  }),
});

/**
 * 定义解说风格
 * @param chapterAnalyses 章节分析结果数组
 * @returns 风格定义对象
 */
export async function defineStyle(chapterAnalyses: ChapterAnalysis[]): Promise<z.infer<typeof styleDefinitionSchema>> {
  try {
    const builder = await getModelBuilder(
      { type: "chat", provider: "ollama", model: "qwen3:4b" },
      {
        temperature: 0,
        verbose: true, // 输出详细日志
      }
    );

    const model = (await builder()).withStructuredOutput(styleDefinitionSchema, {
      name: "defineStyle",
    });

    const stylePrompt = ChatPromptTemplate.fromTemplate(
`你是一位专业的短视频解说风格设计师。请基于以下电子书内容分析，设计一套引人入胜且教育性强的单人解说视频风格方案。
      
你需要考虑：
1. 内容类型与解说风格的匹配度
2. 目标受众的认知水平和兴趣点
3. 3分钟短视频的高效信息传递需求
4. 知识类内容的通俗化表达方式
5. 如何在短时间内建立观众兴趣和信任

设计的风格应当：
- 具有独特识别性，让系列视频风格一致
- 平衡教育性与趣味性
- 提供清晰的表达指导和语言规范
- 适合各类核心概念的讲解需求
- 考虑不同年龄段、教育背景的受众需求

章节分析:
{chapterAnalyses}

请设计解说风格方案，确保包含风格、受众、表达规则、视觉建议以及片头片尾模板等所有必要信息。`
    );

    const chapterAnalysesStr = JSON.stringify(chapterAnalyses, null, 2);

    const response = await model.invoke(
      await stylePrompt.format({ chapterAnalyses: chapterAnalysesStr })
    );

    return response;
  } catch (error: any) {
    console.error("定义解说风格失败:", error);
    throw new Error("定义解说风格失败: " + error.message);
  }
}

