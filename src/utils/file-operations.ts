import * as fs from 'fs';
import * as path from 'path';
import { Episode } from '../types/script';
import { modifyFileName } from './format-helpers';
// import { convertToSRT, convertToVTT } from '../modules/creation/subtitle-generator';

/**
 * 确保目录存在，如果不存在则创建
 * @param directoryPath 目录路径
 */
export function ensureDirectoryExists(directoryPath: string): void {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

/**
 * 生成输出文件
 * @param episodes 剧集数组
 * @param outputDir 输出目录
 */
export async function generateOutputFiles(episodes: Episode[], outputDir: string): Promise<void> {
  try {
    // 确保主输出目录存在
    ensureDirectoryExists(outputDir);
    
    // 创建索引文件
    const indexContent = createIndexContent(episodes);
    fs.writeFileSync(path.join(outputDir, 'index.md'), indexContent);
    
    // 为每个剧集生成文件
    for (const episode of episodes) {
      // 创建剧集目录
      const episodeDir = path.join(outputDir, `episode-${episode.order.toString().padStart(2, '0')}`);
      ensureDirectoryExists(episodeDir);
      
      // 生成脚本文件
      const scriptContent = formatScriptContent(episode);
      fs.writeFileSync(path.join(episodeDir, 'script.md'), scriptContent);
      
      // 生成SRT字幕文件
      // const srtContent = convertToSRT(episode.subtitles);
      // fs.writeFileSync(path.join(episodeDir, 'subtitle.srt'), srtContent);
      
      // // 生成VTT字幕文件
      // const vttContent = convertToVTT(episode.subtitles);
      // fs.writeFileSync(path.join(episodeDir, 'subtitle.vtt'), vttContent);
      
      // 生成技术笔记
      const techNotesContent = formatTechnicalNotes(episode);
      fs.writeFileSync(path.join(episodeDir, 'technical-notes.md'), techNotesContent);
      
      // 生成剧集信息文件
      const infoContent = formatEpisodeInfo(episode);
      fs.writeFileSync(path.join(episodeDir, 'info.json'), infoContent);
    }
    
    console.log(`成功生成所有输出文件到目录: ${outputDir}`);
  } catch (error: any) {
    console.error('生成输出文件失败:', error);
    throw new Error(`生成输出文件失败: ${error.message}`);
  }
}

/**
 * 创建索引内容
 * @param episodes 剧集数组
 * @returns 索引文件内容
 */
function createIndexContent(episodes: Episode[]): string {
  let content = `# 短视频连续剧系列索引\n\n`;
  content += `共 ${episodes.length} 集\n\n`;
  content += `## 剧集列表\n\n`;
  
  // 按集数排序
  const sortedEpisodes = [...episodes].sort((a, b) => a.order - b.order);
  
  sortedEpisodes.forEach(episode => {
    const estimatedMinutes = Math.ceil(episode.estimatedDuration / 60);
    content += `### 第 ${episode.order} 集: ${episode.title}\n\n`;
    content += `- 预计时长: ${estimatedMinutes} 分钟\n`;
    content += `- 路径: \`episode-${episode.order.toString().padStart(2, '0')}/\`\n\n`;
  });
  
  return content;
}

/**
 * 格式化脚本内容
 * @param episode 剧集对象
 * @returns 格式化的脚本内容
 */
function formatScriptContent(episode: Episode): string {
  let content = `# ${episode.title}\n\n`;
  content += `## 基本信息\n\n`;
  content += `- 剧集编号: ${episode.order}\n`;
  content += `- 预计时长: ${Math.ceil(episode.estimatedDuration / 60)} 分钟\n\n`;
  
  content += `## 场景列表\n\n`;
  
  // 按场景编号排序
  const sortedScenes = [...episode.script.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
  
  for (const scene of sortedScenes) {
    content += `### 场景 ${scene.sceneNumber}: ${scene.setting}\n\n`;
    content += `**时间:** ${scene.time}\n\n`;
    content += `**描述:** ${scene.description}\n\n`;
    content += `**角色:** ${scene.characters.join(', ')}\n\n`;
    
    // 找出该场景的所有对话
    const sceneDialogues = episode.script.dialogues.filter(d => d.sceneId === scene.id);
    if (sceneDialogues.length > 0) {
      content += `**对话:**\n\n`;
      
      for (const dialogue of sceneDialogues) {
        let dialogueText = `**${dialogue.character}:** ${dialogue.text}`;
        
        if (dialogue.emotion || dialogue.action) {
          dialogueText += ` *(`;
          if (dialogue.emotion) dialogueText += `情绪: ${dialogue.emotion}`;
          if (dialogue.emotion && dialogue.action) dialogueText += `, `;
          if (dialogue.action) dialogueText += `动作: ${dialogue.action}`;
          dialogueText += `)*`;
        }
        
        content += `${dialogueText}\n\n`;
      }
    }
    
    content += `---\n\n`;
  }
  
  return content;
}

/**
 * 格式化技术笔记
 * @param episode 剧集对象
 * @returns 格式化的技术笔记内容
 */
function formatTechnicalNotes(episode: Episode): string {
  let content = `# ${episode.title} - 技术笔记\n\n`;
  
  // 按重要性分组
  const criticalNotes = episode.technicalNotes.filter(note => note.importance === 'critical');
  const recommendedNotes = episode.technicalNotes.filter(note => note.importance === 'recommended');
  const optionalNotes = episode.technicalNotes.filter(note => note.importance === 'optional');
  
  if (criticalNotes.length > 0) {
    content += `## 关键技术要点\n\n`;
    criticalNotes.forEach(note => {
      content += `- **${note.category}**: ${note.content}\n`;
      if (note.relatedSceneId) {
        const scene = episode.script.scenes.find(s => s.id === note.relatedSceneId);
        if (scene) {
          content += `  *(场景 ${scene.sceneNumber}: ${scene.setting})*\n`;
        }
      }
      content += '\n';
    });
  }
  
  if (recommendedNotes.length > 0) {
    content += `## 建议技术要点\n\n`;
    recommendedNotes.forEach(note => {
      content += `- **${note.category}**: ${note.content}\n`;
      if (note.relatedSceneId) {
        const scene = episode.script.scenes.find(s => s.id === note.relatedSceneId);
        if (scene) {
          content += `  *(场景 ${scene.sceneNumber}: ${scene.setting})*\n`;
        }
      }
      content += '\n';
    });
  }
  
  if (optionalNotes.length > 0) {
    content += `## 可选技术要点\n\n`;
    optionalNotes.forEach(note => {
      content += `- **${note.category}**: ${note.content}\n`;
      if (note.relatedSceneId) {
        const scene = episode.script.scenes.find(s => s.id === note.relatedSceneId);
        if (scene) {
          content += `  *(场景 ${scene.sceneNumber}: ${scene.setting})*\n`;
        }
      }
      content += '\n';
    });
  }
  
  return content;
}

/**
 * 格式化剧集信息
 * @param episode 剧集对象
 * @returns 格式化的JSON字符串
 */
function formatEpisodeInfo(episode: Episode): string {
  // 创建一个简化版的剧集对象，用于JSON输出
  const episodeInfo = {
    id: episode.id,
    title: episode.title,
    order: episode.order,
    estimatedDuration: episode.estimatedDuration,
    sceneCount: episode.script.scenes.length,
    dialogueCount: episode.script.dialogues.length,
    characters: Array.from(new Set(episode.script.dialogues.map(d => d.character))),
    settings: Array.from(new Set(episode.script.scenes.map(s => s.setting)))
  };
  
  return JSON.stringify(episodeInfo, null, 2);
} 