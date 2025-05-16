import { StateGraph, END } from '@langchain/langgraph';
import { Document } from '../types/document';
import { Episode, EpisodePlan, Script, Subtitle, TechnicalNote } from '../types/script';
import { RunnableConfig } from '@langchain/core/runnables';
import { v4 as uuidv4 } from 'uuid';

// 导入功能模块
import { createScript } from '../modules/creation/script-creator';
import { generateSubtitles } from '../modules/creation/subtitle-generator';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { DEFAULT_MODEL } from '../config/constants';

/**
 * 创建剧集工作流
 * @returns 编译后的工作流
 */
export function createEpisodeWorkflow() {
  // 定义状态类型
  type EpisodeWorkflowState = {
    episodePlan: EpisodePlan;
    style: {
      style: string;
      audience: string;
      narrativeRules: string[];
    };
    document: Document;
    script?: Script;
    subtitles?: Subtitle[];
    technicalNotes?: TechnicalNote[];
    episode?: Episode;
    error?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };

  // 创建工作流对象
  const workflow = new StateGraph<EpisodeWorkflowState>({
    channels: {
      episodePlan: {},
      style: {},
      document: {},
      script: {},
      subtitles: {},
      technicalNotes: {},
      episode: {},
      error: {},
      status: {}
    }
  });

  // 脚本创建节点
  async function createScriptNode(state: EpisodeWorkflowState): Promise<Partial<EpisodeWorkflowState>> {
    try {
      console.log(`为剧集"${state.episodePlan.title}"创建脚本...`);
      const script = await createScript(state.episodePlan);
      
      return { 
        script,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('脚本创建失败:', error);
      return { 
        error: `脚本创建失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 字幕生成节点
  async function generateSubtitlesNode(state: EpisodeWorkflowState): Promise<Partial<EpisodeWorkflowState>> {
    try {
      if (!state.script) {
        throw new Error('缺少脚本');
      }

      console.log(`为剧集"${state.episodePlan.title}"生成字幕...`);
      const subtitles = await generateSubtitles(state.script);
      
      return { 
        subtitles,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('字幕生成失败:', error);
      return { 
        error: `字幕生成失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 技术建议节点
  async function generateTechnicalNotesNode(state: EpisodeWorkflowState): Promise<Partial<EpisodeWorkflowState>> {
    try {
      if (!state.script) {
        throw new Error('缺少脚本');
      }

      console.log(`为剧集"${state.episodePlan.title}"生成技术建议...`);
      
      const model = new ChatOpenAI({
        modelName: DEFAULT_MODEL,
        temperature: 0.4
      });
      
      const techPrompt = ChatPromptTemplate.fromTemplate(`
        你是一位专业的短视频技术顾问。请基于以下脚本，提供拍摄和制作建议。
        为每个关键场景提供摄影、灯光、音效和特效方面的建议。
        
        剧集标题: {title}
        目标风格: {style}
        
        脚本场景:
        {scriptScenes}
        
        请按照以下JSON格式返回技术建议:
        [
          {
            "relatedSceneId": "场景ID，如果是通用建议则留空",
            "category": "camera|lighting|sound|vfx|general",
            "content": "详细的技术建议内容",
            "importance": "critical|recommended|optional"
          },
          ...
        ]
      `);
      
      // 格式化脚本场景为字符串
      const scriptScenesStr = JSON.stringify(state.script.scenes, null, 2);
      
      const response = await model.invoke(
        await techPrompt.format({
          title: state.episodePlan.title,
          style: state.style.style,
          scriptScenes: scriptScenesStr
        })
      );
      
      // 从响应中提取JSON
      const jsonMatch = response.content.toString().match(/\[[\s\S]*\]/);
      let techNotes: any[] = [];
      
      if (jsonMatch) {
        techNotes = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从响应中提取技术建议');
      }
      
      // 转换为TechnicalNote对象
      const technicalNotes: TechnicalNote[] = techNotes.map(note => ({
        id: uuidv4(),
        relatedSceneId: note.relatedSceneId,
        category: note.category as 'camera' | 'lighting' | 'sound' | 'vfx' | 'general',
        content: note.content,
        importance: note.importance as 'critical' | 'recommended' | 'optional'
      }));
      
      return { 
        technicalNotes,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('技术建议生成失败:', error);
      return { 
        error: `技术建议生成失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 整合节点
  async function assembleEpisodeNode(state: EpisodeWorkflowState): Promise<Partial<EpisodeWorkflowState>> {
    try {
      if (!state.script) {
        throw new Error('缺少脚本');
      }
      if (!state.subtitles) {
        throw new Error('缺少字幕');
      }
      if (!state.technicalNotes) {
        throw new Error('缺少技术建议');
      }

      console.log(`整合剧集"${state.episodePlan.title}"...`);
      
      // 整合所有数据创建最终的剧集对象
      const episode: Episode = {
        id: state.episodePlan.id,
        title: state.episodePlan.title,
        chapterId: state.episodePlan.chapterId,
        order: state.episodePlan.order,
        estimatedDuration: state.episodePlan.estimatedDuration,
        script: state.script,
        subtitles: state.subtitles,
        technicalNotes: state.technicalNotes
      };
      
      return { 
        episode,
        status: 'completed'
      };
    } catch (error: any) {
      console.error('剧集整合失败:', error);
      return { 
        error: `剧集整合失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 添加节点
  workflow.addNode('createScript', createScriptNode);
  workflow.addNode('generateSubtitles', generateSubtitlesNode);
  workflow.addNode('generateTechnicalNotes', generateTechnicalNotesNode);
  workflow.addNode('assembleEpisode', assembleEpisodeNode);

  // 定义条件函数
  const hasError = (state: EpisodeWorkflowState) => state.status === 'failed';

  // 添加边 - 顺序执行
  workflow.addEdge('createScript', 'generateSubtitles');
  workflow.addEdge('generateSubtitles', 'generateTechnicalNotes');
  workflow.addEdge('generateTechnicalNotes', 'assembleEpisode');
  workflow.addEdge('assembleEpisode', END);

  // 错误处理
  workflow.addConditionalEdges(
    'createScript',
    hasError,
    {
      true: END,
      false: 'generateSubtitles'
    }
  );
  
  workflow.addConditionalEdges(
    'generateSubtitles',
    hasError,
    {
      true: END,
      false: 'generateTechnicalNotes'
    }
  );
  
  workflow.addConditionalEdges(
    'generateTechnicalNotes',
    hasError,
    {
      true: END,
      false: 'assembleEpisode'
    }
  );

  // 编译工作流
  return workflow.compile();
} 