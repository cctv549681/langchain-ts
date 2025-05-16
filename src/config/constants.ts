export const DEFAULT_MODEL = process.env.MODEL_NAME || "gpt-4";
export const DEFAULT_VIDEO_DURATION = 180; // 默认视频时长（秒）
export const DEFAULT_SEGMENT_DURATION = 20; // 默认解说段落时长（秒）
export const DEFAULT_SPEECH_WORD_RATE = 2.5; // 每秒说几个字
export const DEFAULT_OUTPUT_DIR = "./output";
export const SUPPORTED_SUBTITLE_FORMATS = ["srt", "vtt"];

// 核心思想分析相关常量
export const MIN_CONCEPT_LENGTH = 50; // 最小概念描述字数
export const MAX_WORDS_PER_EPISODE = 450; // 每集最大字数（基于3分钟视频长度）

// 章节分割相关常量
export const MIN_CHAPTER_LENGTH = 100; // 最小章节长度（字数）

// 质量控制常量
export const MIN_EXPLANATION_PERCENTAGE = 0.5; // 最小解释比例
export const MAX_EXAMPLES_PERCENTAGE = 0.5; // 最大示例比例
export const MIN_SEGMENTS_PER_EPISODE = 3; // 每集最小段落数
export const MAX_SEGMENTS_PER_EPISODE = 6; // 每集最大段落数

// 存储相关常量
export const DEFAULT_VECTOR_STORE_DIR = "/Users/jiang/Documents/chroma"; // 向量存储目录
export const DEFAULT_CHROMADB_URL = "http://localhost:8000"; // ChromaDB服务URL
export const DEFAULT_CHROMADB_COLLECTION = "ebook-to-video-content"; // 默认集合名称
export const VECTOR_EMBED_DIMENSION = 1536; // 向量嵌入维度（基于OpenAI模型）

// 相似度搜索相关常量
export const DEFAULT_SIMILARITY_THRESHOLD = 0.75; // 默认相似度阈值
export const DEFAULT_SEARCH_LIMIT = 5; // 默认搜索结果数量限制
export const MAX_TOKENS_PER_CHUNK = 500; // 每个文本块最大token数 