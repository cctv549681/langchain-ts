import { Chapter, ChapterAnalysis } from '../../types/document';
import { DEFAULT_MODEL } from '../../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { getModelBuilder } from '../../helper/getModelBuilder';
import { z } from 'zod';

/**
 * 分析单个章节的结构并提取关键信息
 * @param chapter 需要分析的章节
 * @returns 章节分析结果
 */
async function analyzeSingleChapter(chapter: Chapter): Promise<ChapterAnalysis> {
  console.log(`开始分析章节: ${chapter.title || '无标题'} (ID: ${chapter.id})`);
  
  try {
    // 为每个章节单独初始化模型
    const builder = await getModelBuilder(
      { type: "chat", provider: "ollama", model: "qwen3:4b" },
      {
        temperature: 0,
        verbose: true, // 输出详细日志
      }
    );
  
    const model = await builder();
    console.log(`模型已为章节 ${chapter.title} 初始化完成`);
    
    // 定义章节分析的结构化输出Schema
    const chapterAnalysisSchema = z.object({
      // 章节结构相关信息
      structure: z.object({
        // 章节类型：叙述、描述、对话为主或混合
        type: z.enum(["narrative", "descriptive", "dialogue-heavy", "mixed"]),
        // 结构复杂度，1-10分
        complexity: z.number().min(1).max(10),
        // 章节核心思想
        coreIdea: z.string(),
        // 章节关键要点，最多5个
        keyPoints: z.array(z.string()).max(5)
      }),
      // 受众相关信息
      audience: z.object({
        // 目标受众群体
        targetGroup: z.string(),
        // 受众需要的先验知识水平
        priorKnowledge: z.enum(["none", "basic", "intermediate"]),
        // 教育价值评分，1-10分
        educationalValue: z.number().min(1).max(10)
      }),
      // 可视化潜力相关信息
      visualizationPotential: z.object({
        // 易于可视化的核心概念
        conceptsEasyToVisualize: z.array(z.string()),
        // 建议使用的可视化元素
        suggestedVisualElements: z.array(z.string())
      }),
      // 视频策划相关信息
      videoPlanning: z.object({
        // 建议拆分为多少集
        suggestedEpisodeCount: z.number().int().positive(),
        // 讲解难度，1-10分
        difficultyToExplain: z.number().min(1).max(10),
        // 推荐讲解方式（类比、逐步、对比、讲故事）
        recommendedApproach: z.enum(["analogy", "step-by-step", "comparison", "storytelling"]),
        // 可用的举例
        potentialExamples: z.array(z.string())
      }),
      // 章节主题列表
      themes: z.array(z.string())
    });

    // 创建结构化输出处理器
    const structuredModel = model.withStructuredOutput(chapterAnalysisSchema);

    const analysisPrompt = PromptTemplate.fromTemplate(`
      你是一位专业的短视频内容策划专家，专注于将电子书内容转换为3分钟知识类短视频脚本。
      你的任务是分析以下章节的结构和内容，提取适合讲解的核心思想和关键概念。
      
      章节标题: {title}
      章节内容:
      {content}

      请注意：
      1. 提取的概念和思想要适合3分钟短视频解说
      2. 内容要有深度但表达要通俗易懂
      3. 找出最具教育价值和受众兴趣的要点
      4. 考虑概念的连贯性和自包含性，确保单个视频能完整表达一个观点
    `);

    // 如果章节内容太长，可能需要截断或分段处理
    const contentForAnalysis = 
      chapter.pageContent.length > 8000 
        ? chapter.pageContent.substring(0, 8000) + "..." 
        : chapter.pageContent;
    
    console.log(`章节 ${chapter.title} 内容长度: ${chapter.pageContent.length} 字符，处理长度: ${contentForAnalysis.length} 字符`);
    
    const promptInput = await analysisPrompt.format({
      title: chapter.title || '无标题',
      content: contentForAnalysis
    });
    
    console.log(`开始调用大模型分析章节: ${chapter.title}`);
    
    // 直接获取结构化输出
    const analysisData = await structuredModel.invoke(promptInput);
    console.log(`章节 ${chapter.title} 分析完成:`, analysisData);
    
    // 创建章节分析对象
    const chapterAnalysis = {
      chapterId: chapter.id,
      structure: analysisData.structure,
      audience: analysisData.audience,
      visualizationPotential: analysisData.visualizationPotential,
      videoPlanning: analysisData.videoPlanning,
      themes: analysisData.themes || []
    } as ChapterAnalysis;
    
    console.log(`章节 ${chapter.title} 处理成功`);
    return chapterAnalysis;
    
  } catch (error) {
    console.error(`处理章节 ${chapter.title} 失败:`, error);
    
    // 创建一个兜底的分析结果
    const chapterAnalysis = {
      chapterId: chapter.id,
      structure: {
        type: "mixed" as const,
        complexity: 5,
        coreIdea: "分析失败",
        keyPoints: ["内容分析失败"]
      },
      audience: {
        targetGroup: "未知",
        priorKnowledge: "basic" as const,
        educationalValue: 1
      },
      visualizationPotential: {
        conceptsEasyToVisualize: [],
        suggestedVisualElements: []
      },
      videoPlanning: {
        suggestedEpisodeCount: 1,
        difficultyToExplain: 5,
        recommendedApproach: "step-by-step" as const,
        potentialExamples: []
      },
      themes: ["未能识别主题"],
    } as ChapterAnalysis;
    
    return chapterAnalysis;
  }
}

/**
 * 分析章节结构并提取关键信息
 * @param chapters 需要分析的章节数组
 * @returns 章节分析结果数组
 */
export async function analyzeStructure(chapters: Chapter[]): Promise<ChapterAnalysis[]> {
  try {
    console.log(`开始分析 ${chapters.length} 个章节，每个章节将单独调用大模型`);
    
    // 处理每个章节 - 每章单独调用大模型
    const analysisResults: ChapterAnalysis[] = [];
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      console.log(`\n=== 处理第 ${i + 1}/${chapters.length} 个章节 ===`);
      
      const chapterAnalysis = await analyzeSingleChapter(chapter);
      analysisResults.push(chapterAnalysis);
      
      console.log(`第 ${i + 1}/${chapters.length} 个章节处理完成\n`);
    }
    
    console.log(`所有 ${chapters.length} 个章节分析完成`);
    return analysisResults;
  } catch (error: any) {
    console.error('内容分析失败:', error);
    throw new Error(`内容分析失败: ${error.message}`);
  }
} 