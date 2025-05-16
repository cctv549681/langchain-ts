import { StateGraph, END, START } from '@langchain/langgraph';
import { ChapterAnalysis, Document } from '../types/document';
import { Episode, EpisodePlan } from '../types/script';
import { RunnableConfig } from '@langchain/core/runnables';
import { getSettings } from '../config/settings';

// 导入功能模块
import { richChapters } from '../modules/document-processor/chapter-splitter';
import { analyzeStructure } from '../modules/content-analyzer/structure-analyzer';
import { DirectorAgent } from '../agents/director';
import { createEpisodeWorkflow } from './episode-workflow';

/**
 * 创建主工作流
 * @returns 编译后的工作流
 */
export function createMainWorkflow() {
  // 定义状态类型
  type WorkflowState = {
    document: Document;
    textContent?: string;
    chapterAnalyses?: ChapterAnalysis[];
    episodePlans?: EpisodePlan[];
    style?: {
      style: string;
      audience: string;
      narrativeRules: string[];
    };
    episodes?: Episode[];
    error?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
  };

  // 创建工作流对象
  const workflow = new StateGraph<WorkflowState>({
    channels: {
      document: {},
      textContent: {},
      chapterAnalyses: {},
      episodePlans: {},
      style: {},
      episodes: {},
      error: {},
      status: {}
    },
    nodes: {
      splitChapters: {},
      analyzeContent: {},
      directorPlan: {},
      createEpisodes: {}
    }
  });

  // 章节分割节点
  async function splitChaptersNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
      if (!state.textContent) {
        throw new Error('缺少文档文本内容');
      }

      console.log('执行章节丰富...');
      const documentWithChapters = richChapters(state.document, state.textContent);
      
      return { 
        document: documentWithChapters,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('章节丰富失败:', error);
      return { 
        error: `章节丰富失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 内容分析节点
  async function analyzeContentNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    try {
      console.log('执行内容分析...');
      const chapterAnalyses = await analyzeStructure(state.document.chapters);
      
      return { 
        chapterAnalyses,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('内容分析失败:', error);
      return { 
        error: `内容分析失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 总导演规划节点
  async function directorPlanNode(state: WorkflowState, config?: RunnableConfig): Promise<Partial<WorkflowState>> {
    try {
      if (!state.chapterAnalyses) {
        throw new Error('缺少章节分析结果');
      }

      console.log('执行总导演规划...');
      
      // 使用总导演Agent来规划剧集
      const episodePlans = await DirectorAgent.tools.planEpisodes(state.chapterAnalyses);
      
      // 定义风格
      const style = await DirectorAgent.tools.defineStyle(state.chapterAnalyses);
      
      return { 
        episodePlans,
        style,
        status: 'processing'
      };
    } catch (error: any) {
      console.error('总导演规划失败:', error);
      return { 
        error: `总导演规划失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 分集创作节点
  async function createEpisodesNode(state: WorkflowState, config?: RunnableConfig): Promise<Partial<WorkflowState>> {
    try {
      if (!state.episodePlans) {
        throw new Error('缺少剧集计划');
      }
      if (!state.style) {
        throw new Error('缺少风格定义');
      }

      console.log('执行分集创作...');
      
      // 创建剧集工作流
      const episodeWorkflow = createEpisodeWorkflow();
      
      // 处理每个剧集
      const episodes: Episode[] = [];
      
      for (const plan of state.episodePlans) {
        console.log(`创作第 ${plan.order} 集: ${plan.title}...`);
        
        // 调用剧集工作流
        const episodeResult = await episodeWorkflow.invoke({
          episodePlan: plan,
          style: state.style,
          document: state.document
        });
        
        episodes.push(episodeResult.episode);
      }
      
      return { 
        episodes,
        status: 'completed'
      };
    } catch (error: any) {
      console.error('分集创作失败:', error);
      return { 
        error: `分集创作失败: ${error.message}`,
        status: 'failed'
      };
    }
  }

  // 添加节点
  workflow.addNode('splitChapters', splitChaptersNode);
  workflow.addNode('analyzeContent', analyzeContentNode);
  workflow.addNode('directorPlan', directorPlanNode);
  workflow.addNode('createEpisodes', createEpisodesNode);

  // 定义条件函数
  const hasError = (state: WorkflowState) => state.status === 'failed';
  // 添加边 - 顺序执行
  workflow.addEdge(START, 'splitChapters');
  workflow.addEdge('splitChapters', 'analyzeContent');
  workflow.addEdge('analyzeContent', 'directorPlan');
  workflow.addEdge('directorPlan', 'createEpisodes');
  workflow.addEdge('createEpisodes', END);

  // 错误处理 - 任何节点发生错误都直接结束
  workflow.addConditionalEdges(
    'splitChapters',
    hasError,
    {
      true: END,
      false: 'analyzeContent'
    }
  );
  
  workflow.addConditionalEdges(
    'analyzeContent',
    hasError,
    {
      true: END,
      false: 'directorPlan'
    }
  );
  
  workflow.addConditionalEdges(
    'directorPlan',
    hasError,
    {
      true: END,
      false: 'createEpisodes'
    }
  );

  // 编译工作流
  return workflow.compile();
} 