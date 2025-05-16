import { Script, Dialogue, Subtitle } from '../../types/script';
import { v4 as uuidv4 } from 'uuid';
import { SUPPORTED_SUBTITLE_FORMATS } from '../../config/constants';

/**
 * 根据脚本生成字幕
 * @param script 视频脚本
 * @returns 生成的字幕数组
 */
export async function generateSubtitles(script: Script): Promise<Subtitle[]> {
  try {
    const subtitles: Subtitle[] = [];
    let currentTime = 0; // 当前时间位置（毫秒）
    
    // 按场景顺序处理
    const sortedScenes = [...script.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
    
    for (const scene of sortedScenes) {
      // 找出该场景的所有对话
      const sceneDialogues = script.dialogues.filter(dialogue => dialogue.sceneId === scene.id);
      
      // 如果场景没有对话，可能需要添加场景描述字幕
      if (sceneDialogues.length === 0) {
        const sceneSubtitle = createSceneDescriptionSubtitle(scene.description, currentTime);
        subtitles.push(sceneSubtitle);
        currentTime += 3000; // 场景描述默认显示3秒
        continue;
      }
      
      // 处理场景中的对话
      for (const dialogue of sceneDialogues) {
        // 计算对话持续时间（毫秒）
        const dialogueDuration = dialogue.estimatedDuration * 1000;
        
        // 创建字幕
        const subtitle: Subtitle = {
          id: uuidv4(),
          text: dialogue.text,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + dialogueDuration),
          speaker: dialogue.character
        };
        
        subtitles.push(subtitle);
        
        // 更新当前时间
        currentTime += dialogueDuration;
        
        // 对话之间添加短暂停顿
        currentTime += 500; // 0.5秒间隔
      }
      
      // 场景间可能需要添加额外过渡时间
      currentTime += 1000; // 1秒场景过渡
    }
    
    return subtitles;
  } catch (error: any) {
    console.error('字幕生成失败:', error);
    throw new Error(`字幕生成失败: ${error.message}`);
  }
}

/**
 * 创建场景描述字幕
 * @param description 场景描述
 * @param startTime 开始时间（毫秒）
 * @returns 场景描述字幕
 */
function createSceneDescriptionSubtitle(description: string, startTime: number): Subtitle {
  return {
    id: uuidv4(),
    text: `[${description}]`,
    startTime: formatTime(startTime),
    endTime: formatTime(startTime + 3000), // 默认3秒
    speaker: undefined
  };
}

/**
 * 将毫秒时间格式化为字幕时间格式（HH:MM:SS,mmm）
 * @param timeMs 时间（毫秒）
 * @returns 格式化的时间字符串
 */
function formatTime(timeMs: number): string {
  const totalSeconds = Math.floor(timeMs / 1000);
  const milliseconds = timeMs % 1000;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  // 格式化为 "00:00:00,000"
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)},${padZero(milliseconds, 3)}`;
}

/**
 * 数字补零
 * @param num 需要格式化的数字
 * @param length 目标长度（默认为2）
 * @returns 补零后的字符串
 */
function padZero(num: number, length: number = 2): string {
  return num.toString().padStart(length, '0');
}

/**
 * 将字幕数组转换为SRT格式
 * @param subtitles 字幕数组
 * @returns SRT格式的字符串
 */
export function convertToSRT(subtitles: Subtitle[]): string {
  let srtContent = '';
  
  subtitles.forEach((subtitle, index) => {
    // SRT索引从1开始
    srtContent += `${index + 1}\n`;
    // 时间轴，注意SRT使用逗号作为毫秒分隔符
    srtContent += `${subtitle.startTime} --> ${subtitle.endTime}\n`;
    // 如果有发言人，添加发言人标记
    const text = subtitle.speaker 
      ? `[${subtitle.speaker}] ${subtitle.text}` 
      : subtitle.text;
    srtContent += `${text}\n\n`;
  });
  
  return srtContent;
}

/**
 * 将字幕数组转换为VTT格式
 * @param subtitles 字幕数组
 * @returns VTT格式的字符串
 */
export function convertToVTT(subtitles: Subtitle[]): string {
  // VTT文件头
  let vttContent = 'WEBVTT\n\n';
  
  subtitles.forEach((subtitle, index) => {
    // VTT可以有可选的cue标识符
    vttContent += `cue-${index + 1}\n`;
    // 时间轴，注意VTT使用点号作为毫秒分隔符
    const startTime = subtitle.startTime.replace(',', '.');
    const endTime = subtitle.endTime.replace(',', '.');
    vttContent += `${startTime} --> ${endTime}\n`;
    // 如果有发言人，添加发言人标记
    const text = subtitle.speaker 
      ? `<v ${subtitle.speaker}>${subtitle.text}</v>` 
      : subtitle.text;
    vttContent += `${text}\n\n`;
  });
  
  return vttContent;
} 