import { getModelBuilder } from "../../helper/getModelBuilder";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * 视频规划器 - 负责制定视频制作计划
 */
export class VideoPlanner {
  
  /**
   * 基于章节分析制定视频规划
   */
  async planVideos(state: any) {
    console.log("🎯 制定视频规划...");
    console.log(`🔍 视频规划器接收到的状态: ${state.status}`);
    console.log(`📊 章节分析存在: ${!!state.chapterAnalysis}`);
    console.log(`📄 章节内容存在: ${!!state.currentChapter}`);
    
    // 如果章节处理器明确标记为跳过，则继承跳过状态
    if (state.status === "skip") {
      console.log("⏭️ 章节已被标记为跳过，视频规划也跳过");
      return {
        videoPlans: '',
        status: "skip" as const,
      };
    }
    
    // 如果章节内容为空但状态不是skip，说明处理过程中出现了问题
    if (!state.chapterAnalysis || !state.currentChapter) {
      console.log("⚠️ 章节分析或内容为空，但状态不是skip，可能是处理异常");
      return {
        videoPlans: '',
        status: "failed" as const,
        error: "章节分析或内容为空，无法进行视频规划"
      };
    }

    const builder = await getModelBuilder(
      { type: "chat", provider: "deepseek" },
      { temperature: 0.6, verbose: true }
    );
    const model = await builder();

    const planPrompt = ChatPromptTemplate.fromTemplate(`
基于章节分析，制定具体的视频制作计划：

章节分析：
{chapterAnalysis}

章节要点汇总：
{currentChapter}

制作原则：
1. 每个视频专注1个核心观点，确保深度
2. 选择最有争议性、最有故事性的观点
3. 每个视频2-3分钟，适合短视频平台
4. 考虑观众接受度和传播价值

输出格式：
推荐视频数量：X个

视频1：
标题：[吸引眼球的标题，15字以内]
核心观点：[用一句话精准概括，20字以内]
故事角度：[为什么这个观点值得做视频？怎么讲更有趣？]
预期效果：[观众看完会有什么收获或感受？]

视频2：
标题：[吸引眼球的标题，15字以内]
核心观点：[用一句话精准概括，20字以内] 
故事角度：[为什么这个观点值得做视频？怎么讲更有趣？]
预期效果：[观众看完会有什么收获或感受？]

（以此类推）

制作建议：[对整个章节视频制作的整体建议]
`);

    const response = await model.invoke(
      await planPrompt.format({
        chapterAnalysis: state.chapterAnalysis,
        currentChapter: state.currentChapter
      })
    );
    
    const videoPlans = typeof response === 'string' ? response : response.content?.toString() || '';

    return {
      videoPlans,
      status: "processing" as const,
    };
  }
} 