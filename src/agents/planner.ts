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
      你是一位专业的知识类短视频总策划。你的任务是基于电子书内容规划一系列3分钟短视频解说集数，每集围绕一个核心思想进行讲解。
      请确保:
      1. 每集内容量适合3分钟视频
      2. 核心思想解释清晰且完整
      3. 每集围绕单一核心概念，包含讲解和通俗示例
      4. 整体解说风格一致

      以下是电子书内容分析:
      {contentAnalysis}

      请将电子书核心思想规划为多个解说集数，并按照以下JSON格式返回:
      [
        {
          "id": "唯一ID", 
          "title": "集数标题",
          "coreIdeaId": "所基于的核心思想ID",
          "order": 集数编号,
          "synopsis": "本集概要",
          "keyPoints": ["关键点1", "关键点2", ...],
          "concepts": ["概念1", "概念2", ...],
          "estimatedDuration": 180,
          "targetTone": "educational|conversational|inspirational|analytical|storytelling"
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
      你是一位短视频解说风格顾问。请基于以下电子书内容分析，定义适合的单人解说视频风格、目标受众和表达规则。

      内容分析:
      {contentAnalysis}

      请按照以下JSON格式返回:
      {
        "style": "详细的解说风格描述，包括表达方式、语调、专业程度等",
        "audience": "目标受众描述",
        "presentationRules": ["表达规则1", "表达规则2", ...]
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
      你是一位短视频规划专家。请基于以下内容分析，估算将电子书改编为3分钟单人解说短视频所需的总集数。
      请考虑核心概念数量、复杂度、关键思想点等因素。

      内容分析:
      {contentAnalysis}

      请按照以下JSON格式返回:
      {
        "totalEpisodes": 估算的总集数,
        "reasoning": "详细的推理过程和依据"
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
