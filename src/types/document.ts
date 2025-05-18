export interface Document {
  id: string; // 文档唯一标识符
  title: string; // 文档标题
  author?: string; // 文档作者(可选)
  chapters?: Chapter[]; // 文档章节列表
  coreIdeas?: CoreIdea[]; // 核心思想列表(可选)
  metadata: DocumentMetadata; // 文档元数据
  textContent?: any; // 文档文本内容
}

export interface DocumentMetadata {
  fileName: string; // 文件名
  createdAt: Date; // 创建时间
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed'; // 处理状态：待处理|处理中|已完成|失败
  processingDetails?: string; // 处理详情(可选)
}

export interface Chapter {
  id?: string; // 章节唯一标识符
  metadata?: ChapterMetadata; // 章节元数据
  pageContent: string; // 章节内容
  parentTitle?: string; // 父标题
  title?: string; // 章节标题
  order?: number; // 章节顺序
  keyPoints?: KeyPoint[]; // 关键点列表(可选)
  chapterSize?: number; // 章节大小
}

export interface ChapterMetadata {
  wordCount?: number; // 字数统计
  estimatedReadingTime?: number; // 预计阅读时间(分钟)
  complexityScore?: number; // 复杂度评分(1-10)
  containsDialogue?: boolean; // 是否包含对话(可选)
  startPage?: number; // 起始页码(可选)
  endPage?: number; // 结束页码(可选)
  keyConceptsCount?: number; // 关键概念数量
  source: string; // 来源
}

export interface CoreIdea {
  id: string; // 核心思想唯一标识符
  title: string; // 核心思想标题
  description: string; // 核心思想描述
  relatedChapters: string[]; // 相关章节ID列表
  importance: number; // 重要性评分
}

export interface KeyPoint {
  id: string; // 关键点唯一标识符
  concept: string; // 概念
  explanation: string; // 解释
  importance: number; // 重要性评分
}

export interface ContentAnalysis {
  documentId: string; // 文档唯一标识符
  structure: {
    type: 'conceptual' | 'narrative' | 'instructional' | 'argumentative' | 'mixed'; // 内容类型：概念性|叙述性|指导性|论证性|混合型
    complexity: number; // 复杂度评分(1-10)
    keyThemes: string[]; // 关键主题列表
  };
  coreIdeas: {
    title: string; // 核心思想标题
    description: string; // 核心思想描述
    importance: number; // 重要性评分(1-10)
  }[];
  targetAudience: string[]; // 目标受众
  knowledgePrerequisites: string[]; // 知识前提条件
  suggestedEpisodeCount: number; // 建议集数
}

export interface KeyConcepts {
  mainIdeas: {
    concept: string; // 主要概念
    explanation: string; // 概念解释
  }[];
  supportingConcepts: {
    concept: string; // 支持性概念
    explanation: string; // 概念解释
    relatedMainIdea: string; // 相关主要概念
  }[];
  practicalApplications: {
    concept: string; // 实际应用概念
    example: string; // 应用示例
  }[];
}

export interface ChapterAnalysis {
  chapterId: string; // 章节唯一标识符
  
  // 结构分析
  structure: {
    type?: 'narrative' | 'descriptive' | 'dialogue-heavy' | 'mixed'; // 结构类型
    complexity?: number; // 复杂度评分(1-10)
    coreIdea?: string; // 核心思想或中心观点
    keyPoints?: string[]; // 关键点列表
  };
  
  // 受众分析
  audience: {
    targetGroup?: string; // 适合的目标受众
    priorKnowledge?: 'none' | 'basic' | 'intermediate'; // 先验知识要求
    educationalValue?: number; // 教育价值评分(1-10)
  };
  
  // 可视化潜力
  visualizationPotential: {
    conceptsEasyToVisualize?: string[]; // 易于可视化的概念
    suggestedVisualElements?: string[]; // 建议的视觉元素
  };
  
  // 视频规划
  videoPlanning: {
    suggestedEpisodeCount?: number; // 建议集数
    difficultyToExplain?: number; // 概念解释难度(1-10)
    recommendedApproach?: 'analogy' | 'step-by-step' | 'comparison' | 'storytelling'; // 建议讲解方式
    potentialExamples?: string[]; // 潜在示例
  };
  
  
  themes?: string[]; // 主题列表
}

export interface KeyInformation {
  characters: {
    name: string; // 角色名称
    role: string; // 角色定位
    description: string; // 角色描述
  }[];
  locations: string[]; // 地点列表
  events: string[]; // 事件列表
  timeline: string[]; // 时间线
  relationships: {
    character1: string; // 角色1
    character2: string; // 角色2
    relationship: string; // 角色关系
  }[];
} 