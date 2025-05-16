import { Chapter, ChapterAnalysis } from '../../types/document';
import { DEFAULT_MODEL } from '../../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * 分析章节结构并提取关键信息
 * @param chapters 需要分析的章节数组
 * @returns 章节分析结果数组
 */
export async function analyzeStructure(chapters: Chapter[]): Promise<ChapterAnalysis[]> {
  try {
    const model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      temperature: 0
    });

    const analysisPrompt = PromptTemplate.fromTemplate(`
      你是一个专业的文学分析专家，你的任务是分析以下章节的结构和内容，并提取关键信息。
      请尽可能详细地分析，但要保持客观准确。

      章节标题: {title}
      章节内容:
      {content}

      请按照以下格式回复：
      
      {
        "structure": {
          "type": "narrative|descriptive|dialogue-heavy|mixed",
          "complexity": 1-10的数字,
          "keyPoints": ["关键点1", "关键点2", ...]
        },
        "characters": [
          {
            "name": "角色名称",
            "importance": "main|supporting|minor",
            "traits": ["特点1", "特点2", ...]
          },
          ...
        ],
        "settings": [
          {
            "location": "场景位置",
            "time": "时间背景",
            "description": "简短描述"
          },
          ...
        ],
        "themes": ["主题1", "主题2", ...],
        "suggestedEpisodeCount": 估计合适的剧集数量
      }
    `);

    // 处理每个章节
    const analysisResults: ChapterAnalysis[] = [];
    
    for (const chapter of chapters) {
      // 如果章节内容太长，可能需要截断或分段处理
      const contentForAnalysis = 
        chapter.content.length > 8000 
          ? chapter.content.substring(0, 8000) + "..." 
          : chapter.content;
      
      const promptInput = await analysisPrompt.format({
        title: chapter.title,
        content: contentForAnalysis
      });
      
      const response = await model.invoke(promptInput);
      
      // 解析模型返回的JSON响应
      let analysisData: any;
      try {
        // 尝试从响应中提取JSON
        const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法从响应中提取JSON");
        }
      } catch (parseError: any) {
        console.error("解析响应失败:", parseError);
        // 创建一个基本的分析结果
        analysisData = {
          structure: {
            type: "mixed",
            complexity: 5,
            keyPoints: ["内容分析失败"]
          },
          characters: [],
          settings: [],
          themes: ["未能识别主题"],
          suggestedEpisodeCount: 1
        };
      }
      
      // 创建章节分析对象
      const chapterAnalysis: ChapterAnalysis = {
        chapterId: chapter.id,
        structure: analysisData.structure,
        characters: analysisData.characters || [],
        settings: analysisData.settings || [],
        themes: analysisData.themes || [],
        suggestedEpisodeCount: analysisData.suggestedEpisodeCount || 1
      };
      
      analysisResults.push(chapterAnalysis);
    }
    
    return analysisResults;
  } catch (error: any) {
    console.error('内容分析失败:', error);
    throw new Error(`内容分析失败: ${error.message}`);
  }
} 