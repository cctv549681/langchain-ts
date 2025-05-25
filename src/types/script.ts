export interface EpisodePlan {
  chapterId: string | number; // 关联章节ID
  id: string; // 集数计划唯一标识符
  title: string; // 集数标题
  coreIdeaId: string; // 核心思想ID
  order: number; // 集数顺序
  synopsis: string; // 内容概要
  keyPoints: string[]; // 关键点列表
  concepts: string[]; // 概念列表
  estimatedDuration: number; // 预计时长(秒)
  targetTone: 'educational' | 'conversational' | 'inspirational' | 'analytical' | 'storytelling'; // 目标语调：教育性|对话式|激励性|分析性|叙事性
}

export interface Episode {
  id: string; // 集数唯一标识符
  title: string; // 集数标题
  coreIdeaId: string; // 核心思想ID
  order: number; // 集数顺序
  estimatedDuration: number; // 预计时长(秒)
  script: Script; // 脚本内容
  subtitles: Subtitle[]; // 字幕列表
  technicalNotes: TechnicalNote[]; // 技术注释列表
}

export interface Script {
  dialogues: any; // 对话内容
  scenes: any; // 场景描述
  introduction: string; // 介绍部分
  conceptExplanation: string; // 概念解释
  examples: Example[]; // 示例列表
  conclusion: string; // 结论部分
  visualCues: VisualCue[]; // 视觉提示
  estimatedSegmentDurations: Map<string, number>; // 各段落预计时长(键为段落名，值为时长秒数)
}

export interface Example {
  id: string; // 示例唯一标识符
  situation: string; // 情境描述
  explanation: string; // 解释内容
  relevance: string; // 相关性说明
  estimatedDuration: number; // 预计时长(秒)
}

export interface Subtitle {
  id: string; // 字幕唯一标识符
  text: string; // 字幕文本
  startTime: string; // 开始时间(格式如 "00:00:12,500")
  endTime: string; // 结束时间(格式如 "00:00:15,750")
  emphasis: boolean; // 是否需要强调
}

export interface VisualCue {
  id: string; // 视觉提示唯一标识符
  description: string; // 提示描述
  timecode: string; // 时间码
  purpose: string; // 用途说明
}

export interface TechnicalNote {
  id: string; // 技术注释唯一标识符
  relatedSegment?: string; // 相关段落(可选)
  category: 'visual' | 'audio' | 'presentation' | 'graphics' | 'general'; // 类别：视觉|音频|演示|图形|通用
  content: string; // 注释内容
  importance: 'critical' | 'recommended' | 'optional'; // 重要性：关键的|推荐的|可选的
  relatedSceneId?: string; // 相关场景ID
}

// 新的集数规划结果接口
export interface EpisodePlanningResult {
  chapterSummary: string; // 章节内容总结
  extractedConcepts: string[]; // 提取的核心概念列表
  splitRationale: string; // 拆分理由
  episodes: {
    id: string; // 唯一的剧集ID
    title: string; // 集数标题
    order: number; // 集数编号
    synopsis: string; // 本集大纲
    keyPoints: string[]; // 关键点
    coreConcepts: string[]; // 核心概念
    contentSource: string; // 内容来源描述
    visualizationSuggestions: string[]; // 视觉表现建议
    exampleTypes: string[]; // 示例类型
    estimatedDuration: number; // 预估时长
    targetTone: 'educational' | 'conversational' | 'inspirational' | 'analytical' | 'storytelling'; // 目标风格基调
  }[];
} 