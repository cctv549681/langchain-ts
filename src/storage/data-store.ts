import { Document, Chapter, ChapterAnalysis, KeyInformation } from '../types/document';
import { Episode, EpisodePlan } from '../types/script';
import { DocumentStoreManager } from './document-store';
import { VectorStoreManager } from './vector-store';
import { v4 as uuidv4 } from 'uuid';

/**
 * 数据存储服务
 * 封装所有存储相关操作，协调不同存储组件
 */
export class DataStore {
  private static instance: DataStore;
  private documentStore: DocumentStoreManager;
  private vectorStore: VectorStoreManager;
  private initialized = false;

  private constructor() {
    this.documentStore = DocumentStoreManager.getInstance();
    this.vectorStore = VectorStoreManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore();
    }
    return DataStore.instance;
  }

  /**
   * 初始化数据存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 初始化各存储组件
      await this.documentStore.initialize();
      await this.vectorStore.initialize();
      
      this.initialized = true;
      console.log("数据存储服务初始化成功");
    } catch (error: any) {
      console.error("数据存储服务初始化失败:", error);
      throw new Error(`数据存储服务初始化失败: ${error.message}`);
    }
  }

  /**
   * 存储文档
   * @param document 电子书文档
   */
  public async storeDocument(document: Document): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 先存储到文档存储
      const documentId = await this.documentStore.saveDocument(document);
      
      // 再存储到向量存储
      await this.vectorStore.storeDocument(document);
      
      return documentId;
    } catch (error: any) {
      console.error("存储文档失败:", error);
      throw new Error(`存储文档失败: ${error.message}`);
    }
  }

  /**
   * 获取文档
   * @param documentId 文档ID
   */
  public async getDocument(documentId: string): Promise<Document | null> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return await this.documentStore.getDocument(documentId);
    } catch (error: any) {
      console.error("获取文档失败:", error);
      throw new Error(`获取文档失败: ${error.message}`);
    }
  }

  /**
   * 列出所有文档
   */
  public async listDocuments(): Promise<Array<{ id: string; title: string; metadata: any }>> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return await this.documentStore.listDocuments();
    } catch (error: any) {
      console.error("列出文档失败:", error);
      throw new Error(`列出文档失败: ${error.message}`);
    }
  }

  /**
   * 更新文档处理状态
   * @param documentId 文档ID
   * @param status 处理状态
   * @param details 处理详情
   */
  public async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    details?: string
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      await this.documentStore.updateDocumentStatus(documentId, status, details);
    } catch (error: any) {
      console.error("更新文档状态失败:", error);
      throw new Error(`更新文档状态失败: ${error.message}`);
    }
  }

  /**
   * 存储章节分析结果
   * @param documentId 文档ID
   * @param chapterAnalyses 章节分析结果
   */
  public async storeChapterAnalyses(
    documentId: string,
    chapterAnalyses: ChapterAnalysis[]
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 为每个章节分析结果存储向量表示
      for (const analysis of chapterAnalyses) {
        const content = JSON.stringify(analysis);
        await this.vectorStore.storeKeyInformation(
          'chapter_analysis',
          content,
          {
            documentId,
            chapterId: analysis.chapterId
          }
        );
      }
      
      console.log(`为文档(ID: ${documentId})存储了 ${chapterAnalyses.length} 个章节分析结果`);
    } catch (error: any) {
      console.error("存储章节分析结果失败:", error);
      throw new Error(`存储章节分析结果失败: ${error.message}`);
    }
  }

  /**
   * 存储剧集计划
   * @param documentId 文档ID
   * @param episodePlans 剧集计划
   */
  public async storeEpisodePlans(
    documentId: string,
    episodePlans: EpisodePlan[]
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 为每个剧集计划存储向量表示
      for (const plan of episodePlans) {
        const content = JSON.stringify(plan);
        await this.vectorStore.storeKeyInformation(
          'episode_plan',
          content,
          {
            documentId,
            episodeId: plan.id,
            chapterId: plan.chapterId,
            order: plan.order
          }
        );
      }
      
      console.log(`为文档(ID: ${documentId})存储了 ${episodePlans.length} 个剧集计划`);
    } catch (error: any) {
      console.error("存储剧集计划失败:", error);
      throw new Error(`存储剧集计划失败: ${error.message}`);
    }
  }

  /**
   * 存储完成的剧集
   * @param documentId 文档ID
   * @param episodes 剧集数组
   */
  public async storeEpisodes(
    documentId: string,
    episodes: Episode[]
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 创建剧集数据目录
      const document = await this.documentStore.getDocument(documentId);
      if (!document) {
        throw new Error(`文档ID ${documentId} 不存在`);
      }
      
      // 在这里可以实现将剧集数据存储到文件系统或数据库的逻辑
      // 此处省略具体实现...
      
      // 为每个剧集的脚本和字幕存储向量表示，便于后续一致性检查
      for (const episode of episodes) {
        // 存储脚本内容
        for (const scene of episode.script.scenes) {
          await this.vectorStore.storeKeyInformation(
            'script_scene',
            scene.description,
            {
              documentId,
              episodeId: episode.id,
              sceneId: scene.id,
              sceneNumber: scene.sceneNumber
            }
          );
        }
        
        // 存储对话内容
        for (const dialogue of episode.script.dialogues) {
          await this.vectorStore.storeKeyInformation(
            'script_dialogue',
            dialogue.text,
            {
              documentId,
              episodeId: episode.id,
              dialogueId: dialogue.id,
              character: dialogue.character
            }
          );
        }
      }
      
      console.log(`为文档(ID: ${documentId})存储了 ${episodes.length} 个剧集`);
    } catch (error: any) {
      console.error("存储剧集失败:", error);
      throw new Error(`存储剧集失败: ${error.message}`);
    }
  }

  /**
   * 查找相关段落
   * @param query 查询文本
   * @param documentId 文档ID
   * @param limit 结果数量限制
   */
  public async findRelevantParagraphs(
    query: string,
    documentId: string,
    limit: number = 5
  ): Promise<any[]> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      const results = await this.vectorStore.similaritySearch(
        query,
        { documentId, contentType: "paragraph" },
        limit
      );
      
      return results;
    } catch (error: any) {
      console.error("查找相关段落失败:", error);
      throw new Error(`查找相关段落失败: ${error.message}`);
    }
  }

  /**
   * 检查内容一致性
   * @param content 要检查的内容
   * @param documentId 文档ID
   */
  public async checkContentConsistency(
    content: string,
    documentId: string
  ): Promise<{
    consistent: boolean;
    similarContents: any[];
    similarityScore: number;
  }> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      return await this.vectorStore.checkContentConsistency(content, documentId);
    } catch (error: any) {
      console.error("检查内容一致性失败:", error);
      throw new Error(`检查内容一致性失败: ${error.message}`);
    }
  }

  /**
   * 删除文档及相关数据
   * @param documentId 文档ID
   */
  public async deleteDocumentData(documentId: string): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      // 删除文档存储中的数据
      await this.documentStore.deleteDocument(documentId);
      
      // 删除向量存储中的数据
      await this.vectorStore.deleteDocumentVectors(documentId);
      
      console.log(`文档(ID: ${documentId})及相关数据已成功删除`);
    } catch (error: any) {
      console.error("删除文档数据失败:", error);
      throw new Error(`删除文档数据失败: ${error.message}`);
    }
  }
} 