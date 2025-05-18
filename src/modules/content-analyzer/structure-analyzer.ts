import { Chapter, ChapterAnalysis } from '../../types/document';
import { DEFAULT_MODEL } from '../../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { getModelBuilder } from '../../helper/getModelBuilder';
import { z } from 'zod';

/**
 * 分析章节结构并提取关键信息
 * @param chapters 需要分析的章节数组
 * @returns 章节分析结果数组
 */
export async function analyzeStructure(chapters: Chapter[]): Promise<ChapterAnalysis[]> {
  try {
    const builder = await getModelBuilder(
      { type: "chat", provider: "ollama", model: "qwen3:4b" },
      {
        temperature: 0,
        // verbose: true, // 输出详细日志
      }
    );
  
    const model = await builder();
    
    // 定义输出结构的Schema
    const chapterAnalysisSchema = z.object({
      structure: z.object({
        type: z.enum(["narrative", "descriptive", "dialogue-heavy", "mixed"]),
        complexity: z.number().min(1).max(10),
        coreIdea: z.string(),
        keyPoints: z.array(z.string()).max(5)
      }),
      audience: z.object({
        targetGroup: z.string(),
        priorKnowledge: z.enum(["none", "basic", "intermediate"]),
        educationalValue: z.number().min(1).max(10)
      }),
      visualizationPotential: z.object({
        conceptsEasyToVisualize: z.array(z.string()),
        suggestedVisualElements: z.array(z.string())
      }),
      videoPlanning: z.object({
        suggestedEpisodeCount: z.number().int().positive(),
        difficultyToExplain: z.number().min(1).max(10),
        recommendedApproach: z.enum(["analogy", "step-by-step", "comparison", "storytelling"]),
        potentialExamples: z.array(z.string())
      }),
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

    // 处理每个章节
    const analysisResults: ChapterAnalysis[] = [];
    
    for (const chapter of chapters) {
      // 如果章节内容太长，可能需要截断或分段处理
      const contentForAnalysis = 
        chapter.pageContent.length > 8000 
          ? chapter.pageContent.substring(0, 8000) + "..." 
          : chapter.pageContent;
      
      const promptInput = await analysisPrompt.format({
        title: chapter.title,
        content: contentForAnalysis
      });
      
      try {
        // 直接获取结构化输出，不再需要复杂的JSON解析
        const analysisData = await structuredModel.invoke(promptInput);
        console.log(analysisData);
        
        // 创建章节分析对象
        const chapterAnalysis = {
          chapterId: chapter.id,
          structure: analysisData.structure,
          audience: analysisData.audience,
          visualizationPotential: analysisData.visualizationPotential,
          videoPlanning: analysisData.videoPlanning,
          // 为保持向后兼容性
          themes: []
        } as ChapterAnalysis;
        
        analysisResults.push(chapterAnalysis);
        
      } catch (error) {
        console.error(`处理章节 ${chapter.title} 失败:`, error);
        
        // 创建一个兜底的分析结果
        const chapterAnalysis = {
          chapterId: chapter.id,
          structure: {
            type: "mixed",
            complexity: 5,
            keyPoints: ["内容分析失败"]
          },
          themes: ["未能识别主题"],
        } as ChapterAnalysis;
        analysisResults.push(chapterAnalysis);
      }
      
    }
    
    return analysisResults;
  } catch (error: any) {
    console.error('内容分析失败:', error);
    throw new Error(`内容分析失败: ${error.message}`);
  }
} 