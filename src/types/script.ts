// 简化的故事化视频脚本类型定义
// 移除复杂的结构化类型，专注于文本处理

export interface SimpleVideoScript {
  title: string;
  order: number;
  story: string;           // 故事内容 (纯文本)
  visualPrompts: string[]; // AI视频提示词
  duration: number;        // 预估时长
}

export interface StoryWorkflowResult {
  selectedChapters?: string[];  // 选中的章节内容
  corePoints?: string;          // 核心爆点 (纯文本)
  storyConflict?: string;       // 故事冲突 (纯文本)
  videoScripts?: string;        // 视频脚本 (纯文本)
  aiPrompts?: string;           // AI视频提示词 (纯文本)
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
} 