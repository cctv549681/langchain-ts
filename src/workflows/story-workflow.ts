import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { Document } from "../types/document";
import { ChapterProcessor } from "./processors/chapter-processor";
import { VideoPlanner } from "./processors/video-planner";
import { ScriptGenerator } from "./processors/script-generator";
import { PromptGenerator } from "./processors/prompt-generator";
import { FileManager } from "./processors/file-manager";

/**
 * 故事化视频创作工作流 - 核心编排层
 * 负责工作流的状态管理和节点编排
 */
export function createStoryWorkflow() {
  
  // 状态定义 - 使用 reducer 允许多次更新
  const WorkflowState = Annotation.Root({
    document: Annotation<Document>(),
    currentChapterIndex: Annotation<number>(),
    currentChapter: Annotation<string | undefined>({
      reducer: (_, newValue) => newValue,
      default: () => undefined,
    }),
    chapterAnalysis: Annotation<string | undefined>({
      reducer: (_, newValue) => newValue,
      default: () => undefined,
    }),
    videoPlans: Annotation<string | undefined>({
      reducer: (_, newValue) => newValue,
      default: () => undefined,
    }),
    videoScripts: Annotation<string | undefined>({
      reducer: (_, newValue) => newValue,
      default: () => undefined,
    }),
    aiPrompts: Annotation<string | undefined>({
      reducer: (_, newValue) => newValue,
      default: () => undefined,
    }),
    allResults: Annotation<any[]>(),
    error: Annotation<string | undefined>(),
    status: Annotation<"pending" | "processing" | "completed" | "failed" | "skip">({
      reducer: (_, newValue) => newValue,
      default: () => "pending",
    }),
  });

  // 初始化处理器
  const chapterProcessor = new ChapterProcessor();
  const videoPlanner = new VideoPlanner();
  const scriptGenerator = new ScriptGenerator();
  const promptGenerator = new PromptGenerator();
  const fileManager = new FileManager();

  // 节点1: 章节分析
  async function analyzeChapterNode(state: typeof WorkflowState.State) {
    try {
      const result = await chapterProcessor.analyzeChapter(state);
      return result;
    } catch (error: any) {
      console.error("❌ 章节分析失败:", error);
      return {
        error: `章节分析失败: ${error.message}`,
        status: "failed" as const,
      };
    }
  }

  // 节点2: 视频规划
  async function planVideosNode(state: typeof WorkflowState.State) {
    try {
      const result = await videoPlanner.planVideos(state);
      return result;
    } catch (error: any) {
      console.error("❌ 视频规划失败:", error);
      return {
        error: `视频规划失败: ${error.message}`,
        status: "failed" as const,
      };
    }
  }

  // 节点3: 脚本生成
  async function generateVideoScriptsNode(state: typeof WorkflowState.State) {
    try {
      const result = await scriptGenerator.generateScripts(state);
      return result;
    } catch (error: any) {
      console.error("❌ 视频脚本生成失败:", error);
      return {
        error: `视频脚本生成失败: ${error.message}`,
        status: "failed" as const,
      };
    }
  }

  // 节点4: 提示词生成
  async function generateAIPromptsNode(state: typeof WorkflowState.State) {
    try {
      const result = await promptGenerator.generatePrompts(state);
      return result;
    } catch (error: any) {
      console.error("❌ AI提示词生成失败:", error);
      return {
        error: `AI提示词生成失败: ${error.message}`,
        status: "failed" as const,
      };
    }
  }

  // 节点5: 文件保存和继续
  async function saveAndContinueNode(state: typeof WorkflowState.State) {
    try {
      const result = await fileManager.saveAndContinue(state);
      return result;
    } catch (error: any) {
      console.error("❌ 保存结果失败:", error);
      return {
        error: `保存结果失败: ${error.message}`,
        status: "failed" as const,
      };
    }
  }

  // 条件判断函数
  const shouldContinue = (state: typeof WorkflowState.State) => {
    const chapterIndex = state.currentChapterIndex || 0;
    const totalChapters = state.document?.chapters?.length || 0;
    
    console.log(`🔍 条件判断: 章节 ${chapterIndex}/${totalChapters}, 状态: ${state.status}`);
    
    // 优先级顺序：失败 > 完成 > 跳过 > 继续
    if (state.status === "failed") {
      console.log("❌ 检测到失败状态，终止流程");
      return "error";
    }
    
    if (state.status === "completed") {
      console.log("✅ 检测到完成状态，终止流程");
      return "completed";
    }
    
    if (chapterIndex >= totalChapters) {
      console.log("📚 所有章节处理完成，终止流程");
      return "completed";
    }
    
    if (state.status === "skip") {
      console.log("⏭️ 检测到跳过状态，直接保存");
      return "skip";
    }
    
    console.log("➡️ 继续正常流程");
    return "continue";
  };

  // 创建工作流 - 循环处理每个章节
  const workflow = new StateGraph(WorkflowState)
    .addNode("analyzeChapter", analyzeChapterNode)
    .addNode("planVideos", planVideosNode)
    .addNode("generateVideoScripts", generateVideoScriptsNode)
    .addNode("generateAIPrompts", generateAIPromptsNode)
    .addNode("saveAndContinue", saveAndContinueNode)

    .addEdge(START, "analyzeChapter")
    // 移除了 analyzeChapter 的固定边，改为只使用条件边
    .addEdge("planVideos", "generateVideoScripts")
    .addEdge("generateVideoScripts", "generateAIPrompts")
    .addEdge("generateAIPrompts", "saveAndContinue")
    
    .addConditionalEdges("saveAndContinue", shouldContinue, {
      continue: "analyzeChapter",
      completed: END,
      error: END,
    })

    .addConditionalEdges("analyzeChapter", shouldContinue, {
      continue: "planVideos",
      skip: "saveAndContinue",  // 跳过的章节直接到保存节点
      completed: END,
      error: END,
    });

  return workflow.compile();
} 