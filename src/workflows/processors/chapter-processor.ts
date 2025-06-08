import { getModelBuilder } from "../../helper/getModelBuilder";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { getProcessingConfig, ProcessingConfig } from "../../config/processing-config";
import { HumanMessage } from "@langchain/core/messages";

/**
 * 章节处理器 - 负责章节的智能拆分、分析和内容提取
 */
export class ChapterProcessor {
  private config: ProcessingConfig;

  constructor(config?: Partial<ProcessingConfig>) {
    this.config = config ? { ...getProcessingConfig(), ...config } : getProcessingConfig();
  }
  
  /**
   * 分析章节内容，智能拆分长章节并生成分析报告
   */
  async analyzeChapter(state: any) {
    const chapterIndex = state.currentChapterIndex || 0;
    const chapters = state.document?.chapters || [];
    
    if (chapterIndex >= chapters.length) {
      return { status: "completed" as const };
    }
    
    const chapter = chapters[chapterIndex];
    console.log(`📖 分析第${chapterIndex + 1}章: ${chapter.title || '未命名'} (${chapter.pageContent.length}字)`);
    
    const content = chapter.pageContent;
    
    // 🔍 第一步：智能过滤无用内容
    const filteredContent = this.filterUselessContent(content, chapter.title || '');
    console.log(`🧹 过滤后内容: ${filteredContent.length}字 (原始: ${content.length}字) 内容: ${filteredContent}`);
    
        // 🚫 如果过滤后内容太少，标记跳过
    if (filteredContent.length < this.config.content.minContentLength) {
      console.log(`⚠️ 章节内容过少 (${filteredContent.length} < ${this.config.content.minContentLength})，跳过`);
      return {
        currentChapter: '',
        chapterAnalysis: '',
        status: "skip" as const,
      };
    }

    // 🔍 第二步：评估章节价值
    const chapterValue = this.evaluateChapterValue(filteredContent, chapter.title || '');
    if (chapterValue < this.config.evaluation.minChapterScore) {
      console.log(`⚠️ 章节视频制作价值较低 (${chapterValue.toFixed(2)} < ${this.config.evaluation.minChapterScore})，跳过`);
      return {
        currentChapter: '',
        chapterAnalysis: '',
        status: "skip" as const,
      };
    }
    
    let processedContent = '';
    
    if (filteredContent.length <= this.config.content.longChapterThreshold) {
      processedContent = filteredContent;
      console.log(`📄 章节较短 (${filteredContent.length} <= ${this.config.content.longChapterThreshold})，直接处理`);
    } else {
      console.log(`📄 章节较长 (${filteredContent.length} > ${this.config.content.longChapterThreshold})，开始智能拆分...`);
      processedContent = await this.processLongChapter(filteredContent);
    }

    // 检查处理后的内容是否有效
    if (!processedContent || processedContent.trim().length < 50) {
      console.log(`⚠️ 处理后内容过少或为空，跳过章节`);
      return {
        currentChapter: '',
        chapterAnalysis: '',
        status: "skip" as const,
      };
    }

    // 分析章节的视频制作价值
    const chapterAnalysis = await this.analyzeVideoValue(
      chapter.title || `第${chapterIndex + 1}章`,
      processedContent
    );

    // 检查分析结果是否有效
    if (!chapterAnalysis || chapterAnalysis.trim().length < 20) {
      console.log(`⚠️ 章节分析结果无效，跳过章节`);
      return {
        currentChapter: '',
        chapterAnalysis: '',
        status: "skip" as const,
      };
    }

    console.log(`✅ 章节处理完成，状态: processing`);
    return {
      currentChapter: processedContent,
      chapterAnalysis,
      status: "processing" as const,
    };
  }

  /**
   * 🧹 过滤无用内容
   */
  private filterUselessContent(content: string, title: string): string {
    let filtered = content;
    
    // 1. 移除页码（数字独占一行）
    filtered = filtered.replace(/^\s*\d+\s*$/gm, '');
    
    // 2. 移除目录条目（带点线或数字的格式）
    filtered = filtered.replace(/^.{0,50}\.{3,}.{0,20}\d+\s*$/gm, '');
    filtered = filtered.replace(/^第[一二三四五六七八九十\d]+章.*\d+\s*$/gm, '');
    
    // 3. 移除版权信息
    filtered = filtered.replace(/版权所有|copyright|©|保留所有权利|未经许可不得复制/gi, '');
    
    // 4. 移除出版信息
    filtered = filtered.replace(/ISBN|出版社|印刷|装帧|开本|印次|版次/gi, '');
    
    // 5. 移除网址和邮箱
    filtered = filtered.replace(/https?:\/\/[^\s]+/g, '');
    filtered = filtered.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    
    // 6. 移除过短的行（但保留可能的小标题）
    filtered = filtered.replace(/^[^\u4e00-\u9fa5a-zA-Z]{1,5}$/gm, '');  // 只删除非中英文的短行
    
    // 7. 移除重复的空行
    filtered = filtered.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // 8. 移除特殊符号行
    filtered = filtered.replace(/^[★☆■□▲△●○※◆◇]+\s*$/gm, '');
    
    // 9. 移除"第X页"、"页码"等
    filtered = filtered.replace(/第\s*\d+\s*页|页码\s*\d+/g, '');
    
    return filtered.trim();
  }

  /**
   * 📊 评估章节价值（返回0-1的分数）- 通用算法适用各种书籍
   */
  private evaluateChapterValue(content: string, title: string): number {
    let score = 0.5; // 基础分数
    
    // 1. 内容长度评分
    const length = content.length;
    if (length < 200) score -= 0.4;  // 太短肯定没价值
    else if (length > 300 && length < 8000) score += 0.2;  // 适中长度
    else if (length > 15000) score -= 0.1;  // 太长可能是合并章节
    
    // 2. 标题质量评分
    if (title) {
      // 正常章节标题加分
      if (/第[一二三四五六七八九十\d]+章|chapter|第\d+节|part\s+\d+/i.test(title)) score += 0.15;
      
      // 明确的无用标题大幅扣分
      if (/^(目录|索引|参考文献|致谢|附录|版权|序言|前言|后记|contents|index|references|acknowledgment|appendix|preface|introduction|conclusion)$/i.test(title.trim())) {
        score -= 0.6;
      }
    }
    
    // 3. 句子结构评分
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 8);
    const avgSentenceLength = sentences.length > 0 ? content.length / sentences.length : 0;
    
    if (sentences.length < 3) score -= 0.4;  // 句子太少
    else if (sentences.length > 5 && avgSentenceLength > 15) score += 0.1;  // 有完整表达
    
    // 4. 通用实质内容检测（适用各种书籍类型）
    const contentIndicators = this.detectContentType(content);
    score += contentIndicators.score;
    
    // 5. 目录格式检测（更严格）
    const tocPattern = /\.{3,}|\d+\s*$|第\d+页|page\s+\d+|\.{2,}\d+/gm;
    const tocMatches = (content.match(tocPattern) || []).length;
    const tocRatio = tocMatches / sentences.length;
    
    if (tocRatio > 0.3) score -= 0.5;  // 超过30%是目录格式
    else if (tocMatches > 15) score -= 0.3;  // 绝对数量太多
    
    // 6. 重复内容检测
    const repetitionScore = this.detectRepetition(content);
    score += repetitionScore;
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 检测内容类型和质量（通用方法）
   */
  private detectContentType(content: string): { score: number; type: string } {
    let score = 0;
    let type = "unknown";
    
    // 学术/科研类内容
    const academicWords = /研究|分析|理论|方法|实验|数据|结果|结论|发现|证据|假设|模型|测试|验证/g;
    const academicCount = (content.match(academicWords) || []).length;
    
    // 实用/技能类内容  
    const practicalWords = /方法|技巧|步骤|如何|怎样|建议|策略|经验|案例|例子|实践|操作|指南|技能/g;
    const practicalCount = (content.match(practicalWords) || []).length;
    
    // 故事/叙述类内容
    const narrativeWords = /故事|经历|回忆|描述|讲述|叙述|情节|人物|场景|对话|感受|体验/g;
    const narrativeCount = (content.match(narrativeWords) || []).length;
    
    // 商业/管理类内容
    const businessWords = /管理|营销|策略|商业|企业|市场|客户|产品|服务|团队|领导|决策|竞争/g;
    const businessCount = (content.match(businessWords) || []).length;
    
    // 哲学/思辨类内容
    const philosophyWords = /思考|观点|理念|价值|意义|本质|存在|认知|思维|逻辑|判断|选择|人生/g;
    const philosophyCount = (content.match(philosophyWords) || []).length;
    
    // 计算最高分类
    const weights = this.config.evaluation.contentTypeWeights;
    const scores = [
      { type: "academic", count: academicCount, weight: weights.academic },
      { type: "practical", count: practicalCount, weight: weights.practical },
      { type: "narrative", count: narrativeCount, weight: weights.narrative },
      { type: "business", count: businessCount, weight: weights.business },
      { type: "philosophy", count: philosophyCount, weight: weights.philosophy }
    ];
    
    const maxScore = Math.max(...scores.map(s => s.count));
    const totalMatches = scores.reduce((sum, s) => sum + s.count, 0);
    
    if (totalMatches > 8) {
      score += 0.3;  // 内容丰富
      type = scores.find(s => s.count === maxScore)?.type || "mixed";
    } else if (totalMatches > 4) {
      score += 0.15;  // 内容一般
    } else if (totalMatches < 2) {
      score -= 0.2;  // 内容贫乏
    }
    
    return { score, type };
  }

  /**
   * 检测重复内容
   */
  private detectRepetition(content: string): number {
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
    if (sentences.length < 5) return 0;
    
    const uniqueSentences = new Set(sentences.map(s => s.trim()));
    const repetitionRatio = 1 - (uniqueSentences.size / sentences.length);
    
    if (repetitionRatio > 0.5) return -0.3;  // 重复率超过50%
    if (repetitionRatio > 0.3) return -0.1;  // 重复率超过30%
    return 0;
  }

  /**
   * 处理长章节：智能拆分 + 内容汇总
   */
  private async processLongChapter(content: string): Promise<string> {
    try {
      const segments = this.smartSplitChapter(content);
      console.log(`📄 拆分为 ${segments.length} 个段落`);
      
      const builder = await getModelBuilder(
        { type: "chat", provider: "deepseek" },
        { 
          temperature: this.config.model.segmentAnalysisTemperature, 
          verbose: this.config.model.verbose 
        }
      );
      const model = await builder();
      
      // 🚀 并行处理所有段落，提高效率
      console.log(`🚀 开始并行分析 ${segments.length} 个段落...`);
      
      const segmentPromises = segments.map(async (segment, i) => {
        console.log(`🔍 分析段落 ${i + 1}/${segments.length} (${segment.length}字)`);
        
        try {
          // 添加超时控制，避免单个段落卡住整个流程
          const summary = await Promise.race([
            this.extractSegmentSummary(model, segment),
            new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('AI调用超时')), this.config.timeout.totalProcessing)
            )
          ]);
          
          if (summary && summary.trim()) {
            console.log(`✅ 段落${i + 1}分析完成`);
            return `段落${i + 1}：${summary}`;
          } else {
            console.log(`⚠️ 段落${i + 1}分析结果为空，使用原文摘要`);
            return `段落${i + 1}：${segment.substring(0, 200)}...`;
          }
        } catch (error: any) {
          console.error(`❌ 段落${i + 1}分析失败:`, error.message);
          // 返回原文摘要作为备选
          return `段落${i + 1}：${segment.substring(0, 200)}...`;
        }
      });
      
      // 等待所有段落处理完成
      const segmentSummaries = await Promise.allSettled(segmentPromises);
      
      // 提取成功的结果
      const successfulSummaries = segmentSummaries
        .map((result, i) => {
          if (result.status === 'fulfilled') {
            return result.value;
          } else {
            console.error(`❌ 段落${i + 1}处理被拒绝:`, result.reason);
            return `段落${i + 1}：[处理失败，使用原文]`;
          }
        })
        .filter(summary => summary && summary.trim());
      
      if (successfulSummaries.length === 0) {
        console.log(`⚠️ 所有段落分析都失败，返回原始内容摘要`);
        return content.substring(0, 1000) + '...';
      }
      
      console.log(`✅ 完成段落分析和汇总，成功处理 ${successfulSummaries.length}/${segments.length} 个段落`);
      return successfulSummaries.join('\n\n');
    } catch (error: any) {
      console.error(`❌ 长章节处理失败:`, error.message);
      // 如果整个处理失败，返回原始内容的摘要
      return content.substring(0, 1000) + '...';
    }
  }

  /**
   * 提取段落核心要点
   */
  private async extractSegmentSummary(model: any, segment: string): Promise<string> {
    // 如果段落太短，直接返回
    if (segment.length < 100) {
      return segment.trim();
    }
    
    // 如果段落太长，先截取前面部分
    const processSegment = segment.length > this.config.content.maxSegmentLength 
      ? segment.substring(0, this.config.content.maxSegmentLength) + '...' 
      : segment;
    
    const summaryPrompt = ChatPromptTemplate.fromTemplate(`
请提取这个段落的核心要点（控制在${this.config.content.maxSummaryLength}字以内）：

段落内容：
{segment}

要求：
1. 提取最核心的1-2个观点
2. 保留重要的案例或数据
3. 用简洁的语言概括
4. 保持作者的原意
5. 忽略页码、页眉页脚等无关信息

只输出核心要点，不要其他说明。
`);

    try {
      // 添加超时和重试机制
      const response = await Promise.race([
        model.invoke(new HumanMessage(await summaryPrompt.format({ segment: processSegment }))),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('单个段落AI调用超时')), this.config.timeout.singleSegment)
        )
      ]);
      
      const result = typeof response === 'string' ? response : response.content?.toString() || '';
      
      // 验证结果质量
      if (!result || result.trim().length < 10) {
        console.log(`⚠️ AI返回结果过短，使用原文摘要`);
        return processSegment.substring(0, this.config.content.maxSummaryLength) + '...';
      }
      
      return result.trim();
    } catch (error: any) {
      console.error(`❌ 段落摘要提取失败:`, error.message);
      // 如果AI调用失败，返回原文的前N字作为摘要
      return processSegment.substring(0, this.config.content.maxSummaryLength) + '...';
    }
  }

  /**
   * 分析章节视频制作价值
   */
  private async analyzeVideoValue(title: string, content: string): Promise<string> {
    const builder = await getModelBuilder(
      { type: "chat", provider: "deepseek" },
      { 
        temperature: this.config.model.chapterAnalysisTemperature, 
        verbose: this.config.model.verbose 
      }
    );
    const model = await builder();

    const analysisPrompt = ChatPromptTemplate.fromTemplate(`
请分析这个章节的内容，评估其视频制作价值：

章节标题：{title}
章节内容：{content}

分析要求：
1. 这个章节有几个独立的核心观点？（1-5个）
2. 每个观点是否有具体案例支撑？
3. 哪些观点最适合做成有趣的短视频？
4. 推荐制作几个视频？（1-4个）
5. 忽略目录、页码等无关内容

输出格式：
核心观点数量：X个
推荐视频数量：X个
主要观点：
1. [观点1]
2. [观点2]
3. [观点3]

最适合视频化的观点：[具体说明为什么适合做视频]
章节质量评估：[优秀/良好/一般/较差]
`);

    const response = await model.invoke(
      await analysisPrompt.format({ title, content })
    );
    
    return typeof response === 'string' ? response : response.content?.toString() || '';
  }

  /**
   * 智能拆分章节
   */
  private smartSplitChapter(content: string): string[] {
    const segments: string[] = [];
    
    // 先按双换行符分割段落
    const paragraphs = content.split(/\n\s*\n+/).filter(p => {
      const trimmed = p.trim();
      // 过滤掉太短的段落和可能的页码
      return trimmed.length > 50 && !/^\d+$/.test(trimmed);
    });
    
    let currentSegment = '';
    
    for (const paragraph of paragraphs) {
      if ((currentSegment + '\n\n' + paragraph).length <= 2000) {
        currentSegment = currentSegment ? currentSegment + '\n\n' + paragraph : paragraph;
      } else {
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        
        if (paragraph.length > 2000) {
          const subSegments = this.splitLongParagraph(paragraph);
          segments.push(...subSegments);
          currentSegment = '';
        } else {
          currentSegment = paragraph;
        }
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment.trim());
    }
    
    return segments.filter(s => s.length > 100);
  }

  /**
   * 拆分过长段落
   */
  private splitLongParagraph(paragraph: string): string[] {
    const sentences = paragraph.split(/[。！？.!?]/).filter(s => s.trim().length > 10);
    const segments: string[] = [];
    let currentSegment = '';
    
    for (const sentence of sentences) {
      const sentenceWithPunc = sentence + (sentence.endsWith('.') ? '' : '。');
      
      if ((currentSegment + sentenceWithPunc).length <= 1800) {
        currentSegment = currentSegment ? currentSegment + sentenceWithPunc : sentenceWithPunc;
      } else {
        if (currentSegment) {
          segments.push(currentSegment.trim());
        }
        currentSegment = sentenceWithPunc;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment.trim());
    }
    
    return segments;
  }
} 