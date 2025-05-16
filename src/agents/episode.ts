import { CoreIdea, KeyPoint } from '../types/document';
import { EpisodePlan, Episode, Script, Example, VisualCue, Subtitle, TechnicalNote } from '../types/script';
import { DEFAULT_MODEL, DEFAULT_VIDEO_DURATION, DEFAULT_SEGMENT_DURATION, DEFAULT_SPEECH_WORD_RATE } from '../config/constants';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { v4 as uuidv4 } from 'uuid';

// 生成解说脚本
async function createScript(episodePlan: EpisodePlan, coreIdea: CoreIdea, keyPoints: KeyPoint[]): Promise<Script> {
  try {
    const model = new ChatOpenAI({ modelName: DEFAULT_MODEL, temperature: 0.7 });

    const scriptPrompt = ChatPromptTemplate.fromTemplate(`
      你是一位专业的知识类短视频脚本创作者。你的任务是为单人解说视频创建一个3分钟左右的脚本，围绕以下核心思想和关键点进行讲解。
      
      核心思想:
      {coreIdea}
      
      关键点:
      {keyPoints}
      
      剧集计划:
      {episodePlan}
      
      请创建一个清晰、易懂且引人入胜的解说脚本，包含以下部分:
      1. 简短有力的介绍，吸引观众注意
      2. 核心概念的清晰解释
      3. 2-3个通俗易懂的实例，帮助理解概念
      4. 简洁的总结和收尾
      5. 适当的视觉提示建议
      
      以JSON格式返回完整脚本:
      {
        "introduction": "引人入胜的开场介绍",
        "conceptExplanation": "详细的核心概念讲解",
        "examples": [
          {
            "id": "示例ID",
            "situation": "情景描述",
            "explanation": "示例解释",
            "relevance": "与核心概念的关联",
            "estimatedDuration": 45 // 估计时长（秒）
          },
          // 可以有更多示例...
        ],
        "conclusion": "总结和收尾",
        "visualCues": [
          {
            "id": "提示ID",
            "description": "视觉元素描述",
            "timecode": "显示时间点",
            "purpose": "目的说明"
          },
          // 可以有更多视觉提示...
        ]
      }
    `);

    // 准备输入数据
    const coreIdeaStr = JSON.stringify(coreIdea, null, 2);
    const keyPointsStr = JSON.stringify(keyPoints, null, 2);
    const episodePlanStr = JSON.stringify(episodePlan, null, 2);

    const response = await model.invoke(
      await scriptPrompt.format({
        coreIdea: coreIdeaStr,
        keyPoints: keyPointsStr,
        episodePlan: episodePlanStr
      })
    );

    // 解析响应
    let scriptData;
    try {
      scriptData = JSON.parse(response.content.toString());
    } catch (error) {
      // 尝试提取JSON
      const content = response.content.toString();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = content.substring(jsonStart, jsonEnd);
        scriptData = JSON.parse(jsonStr);
      } else {
        throw new Error("无法从响应中提取有效的JSON数据");
      }
    }

    // 确保每个示例和视觉提示都有ID
    if (scriptData.examples) {
      scriptData.examples = scriptData.examples.map((example: any) => ({
        ...example,
        id: example.id || uuidv4()
      }));
    }

    if (scriptData.visualCues) {
      scriptData.visualCues = scriptData.visualCues.map((cue: any) => ({
        ...cue,
        id: cue.id || uuidv4()
      }));
    }

    // 添加估计段落时长
    const estimatedSegmentDurations = new Map<string, number>();
    
    // 估算每个部分的时长
    const introWords = scriptData.introduction.split(' ').length;
    const conceptWords = scriptData.conceptExplanation.split(' ').length;
    const conclusionWords = scriptData.conclusion.split(' ').length;
    
    estimatedSegmentDurations.set('introduction', Math.ceil(introWords / DEFAULT_SPEECH_WORD_RATE));
    estimatedSegmentDurations.set('conceptExplanation', Math.ceil(conceptWords / DEFAULT_SPEECH_WORD_RATE));
    estimatedSegmentDurations.set('conclusion', Math.ceil(conclusionWords / DEFAULT_SPEECH_WORD_RATE));
    
    // 返回完整脚本对象
    return {
      introduction: scriptData.introduction,
      conceptExplanation: scriptData.conceptExplanation,
      examples: scriptData.examples || [],
      conclusion: scriptData.conclusion,
      visualCues: scriptData.visualCues || [],
      estimatedSegmentDurations
    };
  } catch (error: any) {
    console.error('生成脚本失败:', error);
    throw new Error(`生成脚本失败: ${error.message}`);
  }
}

// 生成字幕
async function generateSubtitles(script: Script): Promise<Subtitle[]> {
  try {
    const model = new ChatOpenAI({ modelName: DEFAULT_MODEL, temperature: 0.3 });

    const subtitlePrompt = ChatPromptTemplate.fromTemplate(`
      你是一位专业的短视频字幕创作者。请为以下解说脚本创建详细的字幕，包括时间码和重点概念强调。
      
      解说脚本:
      {script}
      
      请考虑以下因素:
      1. 按照标准SRT格式创建字幕
      2. 每个字幕片段不超过2行，每行不超过42个字符
      3. 每个字幕显示时间为2-5秒
      4. 为重要概念和关键词添加强调标记
      
      以JSON数组格式返回字幕:
      [
        {
          "id": "字幕ID",
          "text": "字幕文本",
          "startTime": "00:00:03,500",
          "endTime": "00:00:06,000",
          "emphasis": true/false // 是否需要强调
        },
        // 更多字幕...
      ]
    `);

    const scriptStr = JSON.stringify(script, null, 2);

    const response = await model.invoke(
      await subtitlePrompt.format({ script: scriptStr })
    );

    // 解析响应
    let subtitles;
    try {
      subtitles = JSON.parse(response.content.toString());
    } catch (error) {
      // 尝试提取JSON
      const content = response.content.toString();
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = content.substring(jsonStart, jsonEnd);
        subtitles = JSON.parse(jsonStr);
      } else {
        throw new Error("无法从响应中提取有效的JSON数据");
      }
    }

    // 确保每个字幕都有ID
    return subtitles.map((subtitle: any) => ({
      ...subtitle,
      id: subtitle.id || uuidv4()
    }));
  } catch (error: any) {
    console.error('生成字幕失败:', error);
    throw new Error(`生成字幕失败: ${error.message}`);
  }
}

// 生成技术建议
async function createTechnicalNotes(script: Script, episodePlan: EpisodePlan): Promise<TechnicalNote[]> {
  try {
    const model = new ChatOpenAI({ modelName: DEFAULT_MODEL, temperature: 0.5 });

    const technicalPrompt = ChatPromptTemplate.fromTemplate(`
      你是一位专业的知识类短视频导演。请为以下解说脚本提供详细的技术建议，帮助制作高质量的解说视频。
      
      解说脚本:
      {script}
      
      剧集计划:
      {episodePlan}
      
      请提供以下方面的技术建议:
      1. 视觉呈现（图形、文字、动画等）
      2. 音频处理（背景音乐、音效等）
      3. 解说风格和节奏
      4. 重点内容的展示方式
      5. 整体制作建议
      
      以JSON数组格式返回技术建议:
      [
        {
          "id": "建议ID",
          "relatedSegment": "相关段落ID或名称",
          "category": "visual/audio/presentation/graphics/general",
          "content": "详细建议内容",
          "importance": "critical/recommended/optional"
        },
        // 更多建议...
      ]
    `);

    const scriptStr = JSON.stringify(script, null, 2);
    const episodePlanStr = JSON.stringify(episodePlan, null, 2);

    const response = await model.invoke(
      await technicalPrompt.format({
        script: scriptStr,
        episodePlan: episodePlanStr
      })
    );

    // 解析响应
    let technicalNotes;
    try {
      technicalNotes = JSON.parse(response.content.toString());
    } catch (error) {
      // 尝试提取JSON
      const content = response.content.toString();
      const jsonStart = content.indexOf('[');
      const jsonEnd = content.lastIndexOf(']') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonStr = content.substring(jsonStart, jsonEnd);
        technicalNotes = JSON.parse(jsonStr);
      } else {
        throw new Error("无法从响应中提取有效的JSON数据");
      }
    }

    // 确保每个技术建议都有ID
    return technicalNotes.map((note: any) => ({
      ...note,
      id: note.id || uuidv4()
    }));
  } catch (error: any) {
    console.error('生成技术建议失败:', error);
    throw new Error(`生成技术建议失败: ${error.message}`);
  }
}

// 创建完整的单集内容
async function createEpisode(
  episodePlan: EpisodePlan,
  coreIdea: CoreIdea,
  keyPoints: KeyPoint[]
): Promise<Episode> {
  // 创建脚本
  const script = await createScript(episodePlan, coreIdea, keyPoints);
  
  // 生成字幕
  const subtitles = await generateSubtitles(script);
  
  // 创建技术建议
  const technicalNotes = await createTechnicalNotes(script, episodePlan);
  
  // 计算总时长
  let totalDuration = 0;
  script.estimatedSegmentDurations.forEach(duration => {
    totalDuration += duration;
  });
  
  script.examples.forEach(example => {
    totalDuration += example.estimatedDuration;
  });
  
  // 创建完整的剧集对象
  return {
    id: uuidv4(),
    title: episodePlan.title,
    coreIdeaId: episodePlan.coreIdeaId,
    order: episodePlan.order,
    estimatedDuration: totalDuration || DEFAULT_VIDEO_DURATION,
    script,
    subtitles,
    technicalNotes
  };
}

// 导出单集创作Agent
export const EpisodeAgent = {
  name: "单集创作",
  createScript,
  generateSubtitles,
  createTechnicalNotes,
  createEpisode
}; 