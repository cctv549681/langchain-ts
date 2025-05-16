import { EpisodePlan } from '../../types/script';
import { Script, Scene, Dialogue, Transition } from '../../types/script';
import { DEFAULT_MODEL, DEFAULT_VIDEO_DURATION } from '../../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { v4 as uuidv4 } from 'uuid';

/**
 * 根据剧集计划创建脚本
 * @param episodePlan 剧集计划
 * @returns 创建的脚本
 */
export async function createScript(episodePlan: EpisodePlan): Promise<Script> {
  try {
    const model = new ChatOpenAI({
      modelName: DEFAULT_MODEL,
      temperature: 0.7 // 创意性任务适当提高温度
    });

    const scriptPrompt = PromptTemplate.fromTemplate(`
      你是一位专业的短视频编剧。你的任务是为一个3分钟左右的短视频创作脚本。
      请特别注意：
      1. 内容必须紧凑，适合3分钟视频
      2. 场景不要太多，建议3-8个场景
      3. 对话要简洁有力
      4. 场景描述要具体生动
      5. 剧情要符合视觉叙事原则

      剧集信息:
      标题: {title}
      剧情概要: {synopsis}
      关键点: {keyPoints}
      角色: {characters}
      场景: {settings}
      目标时长: {targetDuration}秒
      风格基调: {targetTone}

      请按照以下JSON格式返回脚本:

      {
        "scenes": [
          {
            "sceneNumber": 场景编号,
            "setting": "场景设置",
            "time": "时间",
            "description": "场景描述",
            "characters": ["角色1", "角色2"],
            "estimatedDuration": 预计时长(秒)
          }
        ],
        "dialogues": [
          {
            "sceneNumber": 对应的场景编号,
            "character": "说话的角色",
            "text": "对话内容",
            "emotion": "情绪",
            "action": "动作描述",
            "estimatedDuration": 预计时长(秒)
          }
        ],
        "transitions": [
          {
            "fromSceneNumber": 起始场景编号,
            "toSceneNumber": 目标场景编号,
            "type": "转场类型(cut|fade|dissolve|wipe|other)",
            "description": "转场描述"
          }
        ]
      }
    `);

    const promptInput = await scriptPrompt.format({
      title: episodePlan.title,
      synopsis: episodePlan.synopsis,
      keyPoints: episodePlan.keyPoints.join(', '),
      characters: episodePlan.characters.join(', '),
      settings: episodePlan.settings.join(', '),
      targetDuration: DEFAULT_VIDEO_DURATION,
      targetTone: episodePlan.targetTone
    });
    
    const response = await model.invoke(promptInput);
    
    // 解析模型返回的JSON响应
    let scriptData: any;
    try {
      // 尝试从响应中提取JSON
      const jsonMatch = response.content.toString().match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scriptData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("无法从响应中提取JSON");
      }
    } catch (parseError: any) {
      console.error("解析响应失败:", parseError);
      throw new Error(`脚本创建失败: ${parseError.message}`);
    }
    
    // 转换为Script对象
    const scenes: Scene[] = scriptData.scenes.map((sceneData: any) => ({
      id: uuidv4(),
      sceneNumber: sceneData.sceneNumber,
      setting: sceneData.setting,
      time: sceneData.time,
      description: sceneData.description,
      characters: sceneData.characters || [],
      estimatedDuration: sceneData.estimatedDuration || 15 // 默认15秒
    }));
    
    const dialogues: Dialogue[] = scriptData.dialogues.map((dialogueData: any) => {
      // 查找对应的场景ID
      const sceneId = scenes.find(scene => scene.sceneNumber === dialogueData.sceneNumber)?.id || '';
      
      return {
        id: uuidv4(),
        sceneId,
        character: dialogueData.character,
        text: dialogueData.text,
        emotion: dialogueData.emotion,
        action: dialogueData.action,
        estimatedDuration: dialogueData.estimatedDuration || 5 // 默认5秒
      };
    });
    
    const transitions: Transition[] = scriptData.transitions.map((transitionData: any) => {
      // 查找对应的场景ID
      const fromSceneId = scenes.find(scene => scene.sceneNumber === transitionData.fromSceneNumber)?.id || '';
      const toSceneId = scenes.find(scene => scene.sceneNumber === transitionData.toSceneNumber)?.id || '';
      
      return {
        id: uuidv4(),
        fromSceneId,
        toSceneId,
        type: transitionData.type || 'cut',
        description: transitionData.description
      };
    });
    
    // 创建场景时长映射
    const estimatedSceneDurations = new Map<string, number>();
    scenes.forEach(scene => {
      estimatedSceneDurations.set(scene.id, scene.estimatedDuration);
    });
    
    // 组合成最终的脚本对象
    const script: Script = {
      scenes,
      dialogues,
      transitions,
      estimatedSceneDurations
    };
    
    return script;
  } catch (error: any) {
    console.error('脚本创建失败:', error);
    throw new Error(`脚本创建失败: ${error.message}`);
  }
} 