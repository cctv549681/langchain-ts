import { Document, Chapter, ChapterMetadata } from "../../types/document";
import { v4 as uuidv4 } from "uuid";
import { MIN_CHAPTER_LENGTH } from "../../config/constants";

/**
 * 丰富章节内容
 * @param document 需要处理的文档对象
 * @returns 包含章节的文档对象
 */
export function richChapters(document: Document): Document {
  try {
    // 章节识别模式 - 可根据实际需求调整
    // 这个模式旨在匹配常见的章节标题模式，例如"第一章"、"Chapter 1"等
    const chapterPatterns = [
      /第[一二三四五六七八九十\d]+章[^\n]*/g, // 中文章节格式
      /Chapter\s+\d+[^\n]*/gi, // 英文章节格式
      /CHAPTER\s+\d+[^\n]*/g, // 全大写英文章节格式
      /^\d+\.\s+[A-Z][^\n]*/gm, // 数字+标题格式
    ];

    // 存储找到的所有章节标记及其位置
    type ChapterMark = {
      title: string;
      position: number;
    };

    let chapterMarks: ChapterMark[] = [];
    if (document.chapters.length === 1) {
      const rawText = document.chapters[0].pageContent;

      // 使用不同的模式查找章节标记
      for (const pattern of chapterPatterns) {
        let match;
        while ((match = pattern.exec(rawText)) !== null) {
          chapterMarks.push({
            title: match[0].trim(),
            position: match.index,
          });
        }
      }

      // 按位置排序章节标记
      chapterMarks.sort((a, b) => a.position - b.position);
      // 如果没有找到章节标记，则将整个文本作为一个章节
      if (chapterMarks.length === 0) {
        const chapterMetadata: ChapterMetadata = {
          wordCount: countWords(rawText),
          estimatedReadingTime: estimateReadingTime(rawText),
          complexityScore: calculateComplexity(rawText),
          containsDialogue: hasDialogue(rawText),
          source: "unknown", // 或者根据实际情况填写
        };

        const singleChapter: Chapter = {
          id: uuidv4(),
          title: "全文",
          pageContent: rawText,
          order: 1,
          metadata: chapterMetadata,
        };

        document.chapters = [singleChapter];
        return document;
      }
      // 提取各章节内容
      const chapters: Chapter[] = [];

      for (let i = 0; i < chapterMarks.length; i++) {
        const currentMark = chapterMarks[i];
        const nextMark =
          i < chapterMarks.length - 1 ? chapterMarks[i + 1] : null;

        // 提取当前章节内容
        const startPos = currentMark.position;
        const endPos = nextMark ? nextMark.position : rawText.length;
        const chapterContent = rawText.substring(startPos, endPos).trim();

        // 检查章节内容长度是否满足最小要求
        if (chapterContent.length < MIN_CHAPTER_LENGTH) {
          continue; // 跳过太短的章节
        }

        // 创建章节元数据
        const chapterMetadata: ChapterMetadata = {
          wordCount: countWords(chapterContent),
          estimatedReadingTime: estimateReadingTime(chapterContent),
          complexityScore: calculateComplexity(chapterContent),
          containsDialogue: hasDialogue(chapterContent),
          source: "unknown", // 或者根据实际情况填写
        };

        // 创建章节对象
        const chapter: Chapter = {
          id: uuidv4(),
          title: currentMark.title,
          pageContent: chapterContent,
          order: i + 1,
          metadata: chapterMetadata,
        };

        chapters.push(chapter);
      }
      // 更新文档的章节
      document.chapters = chapters;
    } else {
      document.chapters = document.chapters.map((chapter) => {
        const { title, content } = splitTitleAndContent(chapter.pageContent);
        const chapterMetadata: ChapterMetadata = {
          ...chapter.metadata,
          wordCount: countWords(content),
          estimatedReadingTime: estimateReadingTime(content),
          complexityScore: calculateComplexity(content),
          containsDialogue: hasDialogue(content),
        };
        return {
          ...chapter,
          title,
          pageContent: content,
          metadata: chapterMetadata,
        };
      }).filter((chapter) => chapter.title !== "");
    }

    return document;
  } catch (error: any) {
    console.error("章节分割失败:", error);
    throw new Error(`章节分割失败: ${error.message}`);
  }
}

/**
 * 计算文本的单词数量
 * @param text 文本内容
 * @returns 单词数量
 */
function countWords(text: string): number {
  // 对于中文，按字符计数
  if (/[\u4e00-\u9fa5]/.test(text)) {
    // 移除标点符号和空格后计算字符数
    return text.replace(/[\s\p{P}]/gu, "").length;
  }

  // 对于英文和其他语言，按空格分隔计数
  return text.trim().split(/\s+/).length;
}

/**
 * 估算阅读时间（分钟）
 * @param text 文本内容
 * @returns 估计阅读时间（分钟）
 */
function estimateReadingTime(text: string): number {
  const wordCount = countWords(text);
  // 假设平均阅读速度：中文 300 字/分钟，英文 200 词/分钟
  const wordsPerMinute = /[\u4e00-\u9fa5]/.test(text) ? 300 : 200;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * 计算文本复杂度分数（1-10）
 * @param text 文本内容
 * @returns 复杂度分数
 */
function calculateComplexity(text: string): number {
  // 这是一个简化的复杂度计算，实际实现可能需要更复杂的NLP分析
  // 这里基于句子长度、词汇多样性等简单指标计算

  // 平均句子长度计算
  const sentences = text
    .split(/[.!?。！？]/g)
    .filter((s) => s.trim().length > 0);
  const avgSentenceLength = countWords(text) / (sentences.length || 1);

  // 将平均句子长度映射到1-10的复杂度分数
  // 假设： 平均句子长度5-25对应复杂度1-10
  let complexity = Math.min(10, Math.max(1, Math.round(avgSentenceLength / 3)));

  return complexity;
}

/**
 * 检查文本是否包含对话内容
 * @param text 文本内容
 * @returns 是否包含对话
 */
function hasDialogue(text: string): boolean {
  // 查找常见的对话标记：引号或对话破折号
  return /["'""''].*?["'""'']|—\s*[A-Za-z\u4e00-\u9fa5]/m.test(text);
}
export function splitTitleAndContent(text) {
  // 使用正则表达式匹配结构：数字 + 换行 + 标题 + 双换行 + 内容
  const regex = /^\d+\n(.+?)\n\n([\s\S]*)$/;
  const match = text.match(regex);

  return match
    ? {
        title: match[1], // 提取标题部分
        content: match[2], // 提取内容部分
      }
    : {
        title: "", // 默认空标题
        content: text, // 无匹配时返回原始文本
      };
}
