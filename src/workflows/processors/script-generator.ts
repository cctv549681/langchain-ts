import { getModelBuilder } from "../../helper/getModelBuilder";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * 脚本生成器 - 负责生成故事化视频脚本
 */
export class ScriptGenerator {
  
  /**
   * 基于视频规划生成具体脚本
   */
  async generateScripts(state: any) {
    console.log("🎬 生成视频脚本...");
    console.log(`🔍 脚本生成器接收到的状态: ${state.status}`);
    console.log(`📋 视频规划存在: ${!!state.videoPlans}`);
    
    // 如果章节被明确标记为跳过，则继承跳过状态
    if (state.status === "skip") {
      console.log("⏭️ 章节已被标记为跳过，脚本生成也跳过");
      return {
        videoScripts: '',
        status: "skip" as const,
      };
    }
    
    // 如果视频规划为空但状态不是skip，说明处理过程中出现了问题
    if (!state.videoPlans) {
      console.log("⚠️ 视频规划为空，但状态不是skip，可能是处理异常");
      return {
        videoScripts: '',
        status: "failed" as const,
        error: "视频规划为空，无法生成脚本"
      };
    }

    const builder = await getModelBuilder(
      { type: "chat", provider: "deepseek" },
      { temperature: 0.7, verbose: true }
    );
    const model = await builder();

    const scriptPrompt = ChatPromptTemplate.fromTemplate(`
基于视频规划，为每个视频创作具体的故事脚本：

视频规划：
{videoPlans}

要求：
- 使用动物角色：🦊狐狸（理论派）、🐻熊（实践派）、🐰兔子（好奇宝宝）
- 每个视频包含开头钩子、核心冲突、知识讲解、结尾升华
- 对话要生动有趣，符合角色性格
- 每个视频脚本200-300字

输出格式：
## 视频1：[标题]
**开场（30秒）**：[设置悬念的开头]
**冲突（60秒）**：[角色间的分歧和讨论]  
**解答（60秒）**：[知识点讲解和案例]
**结尾（30秒）**：[总结和思考]

## 视频2：[标题]
（同样格式）
`);

    const response = await model.invoke(
      await scriptPrompt.format({
        videoPlans: state.videoPlans
      })
    );
    
    const videoScripts = typeof response === 'string' ? response : response.content?.toString() || '';

    return {
      videoScripts,
      status: "processing" as const,
    };
  }
} 