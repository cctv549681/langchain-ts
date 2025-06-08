/**
 * 章节处理配置
 */
export interface ProcessingConfig {
  // 超时配置
  timeout: {
    /** 单个段落AI调用超时时间（毫秒） */
    singleSegment: number;
    /** 整体段落处理超时时间（毫秒） */
    totalProcessing: number;
    /** 章节分析超时时间（毫秒） */
    chapterAnalysis: number;
  };
  
  // 内容处理配置
  content: {
    /** 章节内容最小长度阈值 */
    minContentLength: number;
    /** 长章节拆分阈值 */
    longChapterThreshold: number;
    /** 单个段落最大长度 */
    maxSegmentLength: number;
    /** 段落摘要最大长度 */
    maxSummaryLength: number;
  };
  
  // AI模型配置
  model: {
    /** 段落分析温度 */
    segmentAnalysisTemperature: number;
    /** 章节分析温度 */
    chapterAnalysisTemperature: number;
    /** 是否启用详细日志 */
    verbose: boolean;
  };
  
  // 评估配置
  evaluation: {
    /** 章节价值评估最低分数阈值 */
    minChapterScore: number;
    /** 内容类型检测权重 */
    contentTypeWeights: {
      academic: number;
      practical: number;
      narrative: number;
      business: number;
      philosophy: number;
    };
  };
}

/**
 * 默认处理配置
 */
export const DEFAULT_PROCESSING_CONFIG: ProcessingConfig = {
  timeout: {
    singleSegment: 20000,      // 20秒
    totalProcessing: 30000,    // 30秒  
    chapterAnalysis: 25000,    // 25秒
  },
  
  content: {
    minContentLength: 500,     // 最小500字
    longChapterThreshold: 3000, // 超过3000字算长章节
    maxSegmentLength: 3000,    // 单个段落最大3000字
    maxSummaryLength: 300,     // 摘要最大300字
  },
  
  model: {
    segmentAnalysisTemperature: 1.0,
    chapterAnalysisTemperature: 0.4,
    verbose: true,
  },
  
  evaluation: {
    minChapterScore: 0.6,
    contentTypeWeights: {
      academic: 0.25,
      practical: 0.3,
      narrative: 0.2,
      business: 0.25,
      philosophy: 0.2,
    },
  },
};

/**
 * 获取处理配置（支持环境变量覆盖）
 */
export function getProcessingConfig(): ProcessingConfig {
  const config = { ...DEFAULT_PROCESSING_CONFIG };
  
  // 从环境变量读取超时配置
  if (process.env.SINGLE_SEGMENT_TIMEOUT) {
    config.timeout.singleSegment = parseInt(process.env.SINGLE_SEGMENT_TIMEOUT);
  }
  
  if (process.env.TOTAL_PROCESSING_TIMEOUT) {
    config.timeout.totalProcessing = parseInt(process.env.TOTAL_PROCESSING_TIMEOUT);
  }
  
  if (process.env.CHAPTER_ANALYSIS_TIMEOUT) {
    config.timeout.chapterAnalysis = parseInt(process.env.CHAPTER_ANALYSIS_TIMEOUT);
  }
  
  // 从环境变量读取内容配置
  if (process.env.MIN_CONTENT_LENGTH) {
    config.content.minContentLength = parseInt(process.env.MIN_CONTENT_LENGTH);
  }
  
  if (process.env.MIN_CHAPTER_SCORE) {
    config.evaluation.minChapterScore = parseFloat(process.env.MIN_CHAPTER_SCORE);
  }
  
  return config;
} 