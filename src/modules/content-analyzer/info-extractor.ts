import { Chapter, KeyInformation } from '../../types/document';
import { DEFAULT_MODEL } from '../../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';

/**
 * 从章节中提取关键信息
 * @param chapter 需要分析的章节
 * @returns 提取的关键信息
 */
export async function extractKeyInformation(chapter: Chapter): Promise<KeyInformation> {
  try {
    const model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      temperature: 0
    });

    const extractionPrompt = PromptTemplate.fromTemplate(`
      你是一个专业的内容分析AI。请从以下文本中提取关键信息，包括人物、地点、事件、时间线和人物关系。
      只提取文本中明确提及的信息，不要推测或创造不存在的信息。

      章节标题: {title}
      章节内容:
      {content}

      请按照以下JSON格式返回提取的信息:

      {
        "characters": [
          {
            "name": "角色名称",
            "role": "角色在故事中的职责/身份",
            "description": "角色简要描述"
          }
        ],
        "locations": ["地点1", "地点2", ...],
        "events": ["事件1", "事件2", ...],
        "timeline": ["时间点或时间段1", "时间点或时间段2", ...],
        "relationships": [
          {
            "character1": "角色1",
            "character2": "角色2",
            "relationship": "关系描述"
          }
        ]
      }
    `);

    // 如果章节内容太长，可能需要截断或分段处理
    const contentForAnalysis = 
      chapter.content.length > 8000 
        ? chapter.content.substring(0, 8000) + "..." 
        : chapter.content;
    
    const promptInput = await extractionPrompt.format({
      title: chapter.title,
      content: contentForAnalysis
    });
    
    const response = await model.invoke(promptInput);
    
    // 解析模型返回的JSON响应
    let extractedData: any;
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法从响应中提取JSON");
      }
    } catch (parseError: any) {
      console.error("解析响应失败:", parseError);
      // 创建一个基本的信息对象
      extractedData = {
        characters: [],
        locations: [],
        events: [],
        timeline: [],
        relationships: []
      };
    }
    
    // 转换为KeyInformation对象
    const keyInformation: KeyInformation = {
      characters: extractedData.characters || [],
      locations: extractedData.locations || [],
      events: extractedData.events || [],
      timeline: extractedData.timeline || [],
      relationships: extractedData.relationships || []
    };
    
    return keyInformation;
  } catch (error: any) {
    console.error('关键信息提取失败:', error);
    throw new Error(`关键信息提取失败: ${error.message}`);
  }
} 