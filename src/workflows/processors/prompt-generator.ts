import { getModelBuilder } from "../../helper/getModelBuilder";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * 提示词生成器 - 负责生成即梦AI分镜式视频提示词
 */
export class PromptGenerator {
  
  /**
   * 基于视频脚本生成即梦AI分镜式视频提示词
   */
  async generatePrompts(state: any) {
    console.log("🎬 生成即梦AI分镜式视频提示词...");
    
    // 如果是跳过的章节，直接返回空结果
    if (!state.videoScripts || state.status === "skip") {
      return {
        aiPrompts: '',
        status: "skip" as const,
      };
    }

    const builder = await getModelBuilder(
      { type: "chat", provider: "deepseek" },
      { temperature: 0.5, verbose: true }
    );
    const model = await builder();

    // 第一步：设计分镜脚本
    console.log("📝 第一步：设计分镜脚本...");
    const storyboardTemplate = ChatPromptTemplate.fromTemplate(`
你是专业的视频分镜设计师，需要为教育视频设计详细的分镜脚本。

视频脚本：
{videoScripts}

角色设定：
- 狐狸：聪明好奇，代表提问者和探索者
- 熊：憨厚困惑，代表需要帮助的学习者  
- 兔子：温和智慧，代表知识传授者和解答者

请为每个视频设计8-10个分镜，每个分镜3-5秒，要求：

1. 分镜要有完整的故事线：引入→冲突→发展→高潮→解决→结尾
2. 角色出场要有逻辑性和连贯性
3. 场景转换要自然流畅
4. 知识点讲解要可视化
5. 情感递进要明显

输出格式：
## 视频1分镜设计

### 分镜1：开场引入（3-4秒）
**场景**：森林空地，阳光斑驳
**角色**：狐狸独自出现
**动作**：狐狸好奇地观察周围，表现出对某个问题的思考
**情绪**：好奇、探索
**镜头**：中景，展现环境和角色状态
**转场**：狐狸表情变得困惑

### 分镜2：问题提出（3-4秒）
**场景**：同一森林空地
**角色**：狐狸
**动作**：狐狸抓头思考，表现出遇到难题的困惑
**情绪**：困惑、需要帮助
**镜头**：特写，突出表情变化
**转场**：听到脚步声，转头看向一边

### 分镜3：伙伴出现（4-5秒）
**场景**：森林空地
**角色**：熊走向狐狸
**动作**：熊缓慢走来，也表现出同样的困惑
**情绪**：困惑、寻求帮助
**镜头**：中景，展现两个角色的互动
**转场**：两只动物面面相觑

### 分镜4：智者登场（4-5秒）
**场景**：森林边缘的花园
**角色**：兔子优雅出现
**动作**：兔子从花丛中走出，带着智慧的微笑
**情绪**：智慧、温和、准备帮助
**镜头**：中景转特写，突出兔子的智者形象
**转场**：兔子走向狐狸和熊

### 分镜5：知识传授（5-6秒）
**场景**：三只动物围成圆圈的空地
**角色**：三只动物，兔子为主导
**动作**：兔子开始讲解，空中出现知识图表
**情绪**：专注学习、知识传递
**镜头**：全景，展现学习氛围
**转场**：狐狸和熊表情开始变化

### 分镜6：理解时刻（3-4秒）
**场景**：同一场地
**角色**：三只动物
**动作**：狐狸和熊恍然大悟，表情从困惑转为兴奋
**情绪**：恍然大悟、兴奋、满足
**镜头**：特写切换，捕捉表情变化
**转场**：三只动物相视而笑

### 分镜7：友谊升华（4-5秒）
**场景**：夕阳下的山坡
**角色**：三只动物并肩站立
**动作**：三只动物从学习关系升华为友谊
**情绪**：温暖、友谊、满足
**镜头**：全景，展现友谊画面
**转场**：夕阳西下，天色渐暗

### 分镜8：完美结尾（3-4秒）
**场景**：夜空下的山坡
**角色**：三只动物的剪影
**动作**：静静站立，仰望星空
**情绪**：深远、总结、升华
**镜头**：远景，意境深远
**转场**：淡出结束

---

## 视频2分镜设计
（按相同格式继续设计）

请确保每个分镜都有明确的：场景、角色、动作、情绪、镜头、转场
`);

    const storyboardResponse = await model.invoke(
      await storyboardTemplate.format({
        videoScripts: state.videoScripts
      })
    );
    
    const storyboardScript = typeof storyboardResponse === 'string' ? storyboardResponse : storyboardResponse.content?.toString() || '';
    
    console.log("📝 分镜脚本设计完成");

    // 第二步：基于分镜脚本生成即梦AI提示词
    console.log("🎨 第二步：生成即梦AI提示词...");
    const promptsTemplate = ChatPromptTemplate.fromTemplate(`
你是即梦AI提示词专家，需要基于分镜脚本生成可直接使用的即梦AI提示词。

分镜脚本：
{storyboardScript}

即梦AI工作流：
1. 先用图片提示词生成分镜图片
2. 再用运动提示词基于图片生成3-5秒视频

角色外观统一设定：
- 狐狸：聪明的橙红色狐狸，大眼睛闪烁智慧光芒，尖耳朵，蓬松尾巴
- 熊：憨厚的棕色大熊，厚实毛发，圆润体型，小眼睛
- 兔子：温和的白色兔子，柔软毛发，温柔眼神，长耳朵

请为每个分镜生成即梦AI提示词，要求：

1. 图片提示词要包含：主体+细节+环境+风格+情感+光影+构图+画质
2. 运动提示词要基于图片，描述具体动作和变化
3. 保持角色外观一致性
4. 使用即梦AI理解的中文表达
5. 添加专业的镜头语言

输出格式：
## 视频1即梦AI提示词

### 分镜1：开场引入
**图片提示词**：
一只聪明的橙红色狐狸，大眼睛闪烁着智慧光芒，尖耳朵竖立，蓬松的尾巴，站在森林空地中央，周围是高大的松树和斑驳的阳光，表情好奇专注地观察周围，镜头中景，正面平视，温暖的自然光透过树叶洒下，营造探索的氛围，动漫风格，温馨教育感，8K高清，细节丰富

**视频运动提示词**：
狐狸缓缓转头环顾四周，耳朵轻微摆动捕捉声音，尾巴自然摇摆，眼神专注地观察不同方向，周围树叶在微风中轻柔摆动，阳光斑点在地面缓慢移动，镜头固定，动作流畅自然，表现出好奇探索的状态

### 分镜2：问题提出
**图片提示词**：
同一只橙红色狐狸，表情从好奇转为困惑，一只前爪抬起轻抚头部做思考状，耳朵稍微下垂，森林背景保持一致，光线稍微变暗营造思考氛围，镜头特写，聚焦狐狸的表情变化，动漫风格，略带困惑的情绪，高清画质，表情细节清晰

**视频运动提示词**：
狐狸头部轻微左右摆动表现思考状态，前爪缓慢从头部放下又抬起，眼神在不同方向游移寻找答案，耳朵偶尔抖动，尾巴缓慢摆动，背景保持静止，镜头固定，表情变化自然，动作符合思考逻辑

（继续为每个分镜生成对应的图片和运动提示词）

---

## 视频2即梦AI提示词
（按相同格式继续生成）

注意事项：
- 严格按照分镜脚本的场景、角色、动作来生成提示词
- 保持角色外观描述的一致性
- 镜头语言要与分镜设计匹配
- 每个提示词都要完整可用，可直接复制到即梦AI
- 运动描述要自然流畅，符合3-5秒的时长
`);

    const promptsResponse = await model.invoke(
      await promptsTemplate.format({
        storyboardScript: storyboardScript
      })
    );
    
    const aiPrompts = typeof promptsResponse === 'string' ? promptsResponse : promptsResponse.content?.toString() || '';

    console.log("🎨 即梦AI提示词生成完成");

    // 保存当前章节的结果到状态
    const chapterResult = {
      chapterIndex: state.currentChapterIndex,
      chapterTitle: state.document?.chapters?.[state.currentChapterIndex || 0]?.title,
      analysis: state.chapterAnalysis,
      plans: state.videoPlans,
      scripts: state.videoScripts,
      storyboard: storyboardScript, // 新增分镜脚本
      prompts: aiPrompts
    };

    const allResults = [...(state.allResults || []), chapterResult];

    return {
      aiPrompts,
      storyboard: storyboardScript, // 新增分镜脚本到状态
      allResults,
      currentChapterIndex: (state.currentChapterIndex || 0) + 1,
      status: "processing" as const,
    };
  }
} 