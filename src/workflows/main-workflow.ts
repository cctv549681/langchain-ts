import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { ChapterAnalysis, Document } from '../types/document';
import { Episode, EpisodePlan } from '../types/script';
import { RunnableConfig } from '@langchain/core/runnables';
import { getSettings } from '../config/settings';
import { z } from 'zod';
import { StructuredTool } from '@langchain/core/tools';

// 导入功能模块
import { richChapters } from '../modules/document-processor/chapter-splitter';
import { analyzeStructure } from '../modules/content-analyzer/structure-analyzer';
import { plannerAgent } from '../agents/planner';
import { createEpisodeWorkflow } from './episode-workflow';

/**
 * 创建主工作流
 * @returns 编译后的工作流
 */
export function createMainWorkflow() {
  // 使用 Annotation API 定义状态类型
  const WorkflowState = Annotation.Root({
    document: Annotation<Document>(),
    textContent: Annotation<string | undefined>(),
    chapterAnalyses: Annotation<ChapterAnalysis[] | undefined>(),
    episodePlans: Annotation<EpisodePlan[] | undefined>(),
    style: Annotation<{
      style: string;
      audience: string;
      narrativeRules: string[];
    } | undefined>(),
    episodes: Annotation<Episode[] | undefined>(),
    qualityResults: Annotation<any | undefined>(),
    error: Annotation<string | undefined>(),
    status: Annotation<'pending' | 'processing' | 'quality_check' | 'completed' | 'failed'>(),
  });

  // 章节分割节点 - 文档处理
  async function richChaptersNode(state: typeof WorkflowState.State) {
    try {
      const documentWithChapters = richChapters(state.document);
      
      return { 
        document: documentWithChapters,
        status: 'processing' as const
      };
    } catch (error: any) {
      console.error('章节分割失败:', error);
      return { 
        error: `章节分割失败: ${error.message}`,
        status: 'failed' as const
      };
    }
  }

  // 内容分析节点
  async function analyzeContentNode(state: typeof WorkflowState.State) {
    try {
      console.log('执行内容分析...');
      const chapterAnalyses = await analyzeStructure(state.document.chapters);
      
      return { 
        chapterAnalyses,
        status: 'processing' as const
      };
    } catch (error: any) {
      console.error('内容分析失败:', error);
      return { 
        error: `内容分析失败: ${error.message}`,
        status: 'failed' as const
      };
    }
  }

  // 总策划规划节点
  async function plannerPlanNode(state: typeof WorkflowState.State) {
    try {
      if (!state.chapterAnalyses) {
        throw new Error('缺少章节分析结果');
      }

      console.log('执行总策划规划...');
      
      // 使用 plannerAgent，传递消息
      const planPrompt = `规划解说集数：根据内容分析结果规划每集主题和核心概念
        内容分析: ${JSON.stringify(state.chapterAnalyses)}`;
      
      const episodePlansData = await plannerAgent.invoke({
        messages: [{
          role: "user", 
          content: planPrompt
        }]
      });
      
      // 提取响应中的JSON格式的剧集计划
      const episodePlansText = episodePlansData.messages[episodePlansData.messages.length - 1].content;
      const episodePlansMatch = episodePlansText.toString().match(/\[\s*\{.*\}\s*\]/s);
      const episodePlans = episodePlansMatch ? JSON.parse(episodePlansMatch[0]) : [];
      
      // 定义风格
      const stylePrompt = `定义解说风格：根据内容分析结果定义适合的单人解说视频风格
        内容分析: ${JSON.stringify(state.chapterAnalyses)}`;
      
      const styleData = await plannerAgent.invoke({
        messages: [{
          role: "user", 
          content: stylePrompt
        }]
      });
      
      // 提取响应中的JSON格式的风格定义
      const styleText = styleData.messages[styleData.messages.length - 1].content;
      const styleMatch = styleText.toString().match(/\{\s*"style".*\}/s);
      const style = styleMatch ? JSON.parse(styleMatch[0]) : {
        style: "教育型解说",
        audience: "一般受众",
        narrativeRules: ["简明扼要", "通俗易懂", "重点突出"]
      };
      
      return { 
        episodePlans,
        style,
        status: 'processing' as const
      };
    } catch (error: any) {
      console.error('总策划规划失败:', error);
      return { 
        error: `总策划规划失败: ${error.message}`,
        status: 'failed' as const
      };
    }
  }

  // 分集创作节点
  // async function createEpisodesNode(state: typeof WorkflowState.State) {
  //   try {
  //     if (!state.episodePlans) {
  //       throw new Error('缺少剧集计划');
  //     }
  //     if (!state.style) {
  //       throw new Error('缺少风格定义');
  //     }

  //     console.log('执行分集创作...');
      
  //     // 创建剧集工作流
  //     const episodeWorkflow = createEpisodeWorkflow();
      
  //     // 处理每个剧集
  //     const episodes = [];
      
  //     for (const plan of state.episodePlans) {
  //       console.log(`创作第 ${plan.order} 集: ${plan.title}...`);
        
  //       try {
  //         // 仅发送最简单的参数结构，避免类型错误
  //         const episodeInput = {
  //           title: plan.title || "未命名集",
  //           data: {
  //             episodePlan: plan,
  //             style: state.style, 
  //             document: state.document
  //           }
  //         };
          
  //         // 使用类型断言来避免类型冲突
  //         const episodeResult = await episodeWorkflow.invoke(episodeInput as any);
          
  //         if (episodeResult && episodeResult.episode) {
  //           episodes.push(episodeResult.episode);
  //         } else {
  //           console.warn(`创作第 ${plan.order} 集未返回有效结果`);
  //         }
  //       } catch (error) {
  //         console.error(`创作第 ${plan.order} 集失败:`, error);
  //         // 继续处理下一集
  //       }
  //     }
      
  //     if (episodes.length === 0) {
  //       throw new Error('未能成功创作任何剧集');
  //     }
      
  //     return { 
  //       episodes,
  //       status: 'quality_check' as const // 下一步进入质量检查
  //     };
  //   } catch (error: any) {
  //     console.error('分集创作失败:', error);
  //     return { 
  //       error: `分集创作失败: ${error.message}`,
  //       status: 'failed' as const
  //     };
  //   }
  // }

  // 质量检查节点 (新增，符合主流程图)
  // async function qualityCheckNode(state: typeof WorkflowState.State) {
  //   try {
  //     if (!state.episodes) {
  //       throw new Error('缺少创作的剧集');
  //     }

  //     console.log('执行质量检查...');
      
  //     // 执行质量检查逻辑
  //     const qualityResults = {
  //       passed: true,
  //       details: []
  //     };
      
  //     // 检查每个剧集的质量
  //     for (const episode of state.episodes) {
  //       // 检查时长是否符合3分钟要求
  //       if (episode.estimatedDuration < 150 || episode.estimatedDuration > 210) {
  //         qualityResults.passed = false;
  //         qualityResults.details.push({
  //           episodeId: episode.id,
  //           issue: '时长不符合3分钟要求',
  //           severity: 'high'
  //         });
  //       }
        
  //       // 检查脚本是否包含必要的组成部分
  //       if (!episode.script.introduction || !episode.script.conceptExplanation || episode.script.examples.length === 0) {
  //         qualityResults.passed = false;
  //         qualityResults.details.push({
  //           episodeId: episode.id,
  //           issue: '脚本缺少必要组成部分',
  //           severity: 'high'
  //         });
  //       }
        
  //       // 检查字幕是否完整
  //       if (!episode.subtitles || episode.subtitles.length === 0) {
  //         qualityResults.passed = false;
  //         qualityResults.details.push({
  //           episodeId: episode.id,
  //           issue: '缺少字幕',
  //           severity: 'high'
  //         });
  //       }
  //     }
      
  //     return { 
  //       qualityResults,
  //       status: qualityResults.passed ? 'completed' as const : 'failed' as const
  //     };
  //   } catch (error: any) {
  //     console.error('质量检查失败:', error);
  //     return { 
  //       error: `质量检查失败: ${error.message}`,
  //       status: 'failed' as const
  //     };
  //   }
  // }

  // 定义条件函数
  const hasError = (state: typeof WorkflowState.State) => {
    return state.status === 'failed' ? "true" : "false";
  };

  // 创建工作流对象 - 使用 Annotation API
  const workflow = new StateGraph(WorkflowState)
    // 添加节点
    .addNode("richChaptersNode", richChaptersNode)
    .addNode("analyzeContent", analyzeContentNode)
    .addNode("plannerPlan", plannerPlanNode)
    // .addNode("createEpisodes", createEpisodesNode)
    // .addNode("qualityCheck", qualityCheckNode)
    
    // 添加边 - 按照主流程图的顺序连接
    .addEdge(START, "richChaptersNode")
    .addEdge("richChaptersNode", "analyzeContent")
    .addEdge("analyzeContent", "plannerPlan")
    // .addEdge("plannerPlan", "createEpisodes")
    // .addEdge("createEpisodes", "qualityCheck")
    .addEdge("plannerPlan", END)
    
    // 错误处理分支 - 使用正确的条件路径返回方式
    .addConditionalEdges("richChaptersNode", hasError, { 
      true: END, 
      false: "analyzeContent" 
    })
    .addConditionalEdges("analyzeContent", hasError, { 
      true: END, 
      false: "plannerPlan" 
    })
    // .addConditionalEdges("plannerPlan", hasError, { 
    //   true: END, 
    //   false: "createEpisodes" 
    // })
    // .addConditionalEdges("createEpisodes", hasError, { 
    //   true: END, 
    //   false: "qualityCheck" 
    // })
    // .addConditionalEdges("qualityCheck", hasError, { 
    //   true: END, 
    //   false: END 
    // });

  // 编译工作流
  return workflow.compile();
} 