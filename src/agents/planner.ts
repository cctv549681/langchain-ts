import { ContentAnalysis } from "../types/document";
import { EpisodePlan } from "../types/script";
import { DEFAULT_MODEL, DEFAULT_VIDEO_DURATION } from "../config/constants";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { convertToJSON } from "../utils/format-helpers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { RunnableConfig } from "@langchain/core/runnables";

// 工具函数：规划解说集数
const planEpisodes = tool(
  async (args: any, config: RunnableConfig) => {
    const { contentAnalysis } = args;
    try {
      const model = new ChatOpenAI({
        modelName: DEFAULT_MODEL,
        temperature: 0.2,
      });

      const planPrompt = ChatPromptTemplate.fromTemplate(`
      你是一位专业的知识类短视频总策划。你的任务是将电子书内容转化为精彩的3分钟短视频系列，每集围绕一个明确的核心概念进行讲解。
      
      任务要求:
      1. 每集视频严格控制在3分钟，大约450字左右的解说词
      2. 每集聚焦单一核心概念，确保概念完整性和自包含性
      3. 概念难度和内容密度要均衡，避免单集内容过于复杂或过于简单
      4. 各集之间要有合理的知识递进和连贯性
      5. 优先选择具有可视化潜力和实用价值的概念
      
      你的规划应考虑:
      - 目标受众的接受能力和先验知识
      - 概念的教育价值和趣味性
      - 内容的可视化表达潜力
      - 适合3分钟短视频的讲解深度

      以下是电子书内容分析:
      {contentAnalysis}

      请规划一系列精彩的短视频剧集，并按照以下JSON格式返回:
      [
        {
          "id": "ep-唯一ID", 
          "title": "引人入胜的集数标题",
          "coreIdeaId": "对应核心思想ID",
          "order": 集数编号,
          "synopsis": "本集25字左右概要，突出核心卖点",
          "keyPoints": ["关键点1", "关键点2", "关键点3"], // 限制3-5个关键点
          "concepts": ["核心概念", "相关概念"], // 限制2-3个概念
          "visualizationSuggestions": ["可视化建议1", "可视化建议2"], // 视觉表现建议
          "exampleTypes": ["类比", "案例", "故事"], // 建议的示例类型
          "estimatedDuration": 180, // 秒数
          "targetTone": "educational|conversational|inspirational|analytical|storytelling",
          "audiencePrerequisites": "none|basic|intermediate" // 观众需要的知识基础
        },
        ...
      ]
    `);

      // 转换内容分析为字符串以便于输入到提示中
      const contentAnalysisStr = JSON.stringify(contentAnalysis, null, 2);

      const response = await model.invoke(
        await planPrompt.format({ contentAnalysis: contentAnalysisStr })
      );

      // 从响应中提取JSON
      const episodePlans = convertToJSON(response.content.toString());

      // 确保每个计划都有唯一ID
      return episodePlans.map((plan: any) => ({
        ...plan,
        id: plan.id || uuidv4(),
      }));
    } catch (error: any) {
      console.error("规划解说集数失败:", error);
      throw new Error(`规划解说集数失败: ${error.message}`);
    }
  },
  {
    name: "planEpisodes",
    description: "规划解说集数",
    schema: {
      type: "object",
      properties: {
        contentAnalysis: {
          type: "object",
          description: "内容分析结果",
        },
      },
      required: ["contentAnalysis"],
    },
  }
);

// 工具函数：定义解说风格
const defineStyle = tool(
  async (args: any, config: RunnableConfig) => {
    const { contentAnalysis } = args;
    try {
      const model = new ChatOpenAI({
        modelName: DEFAULT_MODEL,
        temperature: 0.3,
      });

      const stylePrompt = ChatPromptTemplate.fromTemplate(`
      你是一位专业的短视频解说风格设计师。请基于以下电子书内容分析，设计一套引人入胜且教育性强的单人解说视频风格方案。
      
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

      内容分析:
      {contentAnalysis}

      请按照以下JSON格式返回:
      {
        "style": {
          "tonality": "视频整体基调（如严谨学术型/轻松对话型/启发思考型）",
          "narrationStyle": "解说风格描述，包括语速、语调、表达特点等",
          "linguisticFeatures": "语言特点，如是否使用修辞、类比、问句等",
          "personalityTrait": "解说人设特点（如专业教授/好奇探索者/贴心导师）"
        },
        "audience": {
          "primaryTarget": "主要目标受众描述",
          "ageRange": "适合的年龄范围",
          "knowledgeLevel": "假设的知识水平",
          "interests": ["兴趣点1", "兴趣点2", "兴趣点3"]
        },
        "presentationRules": [
          "表达规则1（如避免使用专业术语）",
          "表达规则2（如每个概念必须配合一个实例）",
          "表达规则3（如关键术语需要强调）"
        ],
        "visualConsiderations": [
          "视觉元素建议1",
          "视觉元素建议2"
        ],
        "introOutroTemplates": {
          "introTemplate": "开场白模板，XX字以内",
          "outroTemplate": "结束语模板，XX字以内",
          "transitionPhrases": ["过渡短语1", "过渡短语2"]
        }
      }
    `);

      // 转换内容分析为字符串以便于输入到提示中
      const contentAnalysisStr = JSON.stringify(contentAnalysis, null, 2);

      const response = await model.invoke(
        await stylePrompt.format({ contentAnalysis: contentAnalysisStr })
      );

      // 从响应中提取JSON
      return convertToJSON(response.content.toString());
    } catch (error: any) {
      console.error("定义解说风格失败:", error);
      throw new Error(`定义解说风格失败: ${error.message}`);
    }
  },
  {
    name: "defineStyle",
    description: "定义解说风格",
    schema: {
      type: "object",
      properties: {
        contentAnalysis: {
          type: "object",
          description: "内容分析结果",
        },
      },
      required: ["contentAnalysis"],
    },
  }
);

// 工具函数：估算总集数
const estimateTotalEpisodes = tool(async (args: any, config: RunnableConfig) => {
  const { contentAnalysis } = args;
  try {
    const model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      temperature: 0,
    });

    const estimatePrompt = ChatPromptTemplate.fromTemplate(`
      你是一位知识型短视频内容规划专家。你需要基于电子书内容分析，科学合理地估算将其转化为3分钟短视频系列所需的集数。
      
      请考虑以下因素进行评估：
      1. 每集视频3分钟，约450字解说文本
      2. 每集必须聚焦一个完整且自包含的核心概念
      3. 概念的复杂度和可分解性
      4. 受众的理解能力和注意力维持
      5. 知识点之间的关联性和独立性
      6. 内容的教育价值和优先级
      
      集数规划原则：
      - 宁可分散复杂概念到多集，也不要在单集内塞入过多内容
      - 保持各集内容量大致均衡
      - 考虑受众接受能力，避免连续出现高难度内容
      - 确保系列整体完整性和逻辑连贯性
      - 考虑视频产出效率和资源投入

      内容分析:
      {contentAnalysis}

      请按照以下JSON格式返回:
      {
        "totalEpisodes": 估算的总集数,
        "episodeBreakdown": [
          {
            "conceptCluster": "概念集合1",
            "episodeCount": 预计集数,
            "complexity": 1-10评分,
            "rationale": "规划依据"
          },
          {
            "conceptCluster": "概念集合2",
            "episodeCount": 预计集数,
            "complexity": 1-10评分,
            "rationale": "规划依据"
          }
        ],
        "contentDistributionStrategy": "内容分布策略描述",
        "estimatedProductionTimePerEpisode": "每集预计制作时间（小时）",
        "recommendedSequencing": "建议的发布顺序策略"
      }
    `);

    // 转换内容分析为字符串以便于输入到提示中
    const contentAnalysisStr = JSON.stringify(contentAnalysis, null, 2);

    const response = await model.invoke(
      await estimatePrompt.format({ contentAnalysis: contentAnalysisStr })
    );

    // 从响应中提取JSON
    return convertToJSON(response.content.toString());
  } catch (error: any) {
    console.error("估算总集数失败:", error);
    throw new Error(`估算总集数失败: ${error.message}`);
  }
},{
  name: "estimateTotalEpisodes",
  description: "估算总集数",
  schema: {
    type: "object",
    properties: {
      contentAnalysis: {
        type: "object",
        description: "内容分析结果",
      },
    },
    required: ["contentAnalysis"],
  },
});

// 创建总策划Agent
const plannerAgentTools = [planEpisodes, defineStyle, estimateTotalEpisodes];

// 创建LangGraph Agent
export const plannerAgent = createReactAgent({
  llm: new ChatOpenAI({ modelName: DEFAULT_MODEL }),
  tools: plannerAgentTools,
});
