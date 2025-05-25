import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Document as LangchainDocument } from "@langchain/core/documents";
import { getSettings, getChromaConfig } from "../config/settings";
import { ensureDirectoryExists } from "../utils/file-operations";
import { Chapter, Document } from "../types/document";
import { v4 as uuidv4 } from "uuid";
import { 
  DEFAULT_SIMILARITY_THRESHOLD, 
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_CHROMADB_COLLECTION
} from '../config/constants';

/**
 * ChromaDB向量存储管理器
 * 用于存储和检索电子书内容的向量表示
 */
export class VectorStoreManager {
  private static instance: VectorStoreManager;
  private vectorStore: Chroma | null = null;
  private initialized = false;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): VectorStoreManager {
    if (!VectorStoreManager.instance) {
      VectorStoreManager.instance = new VectorStoreManager();
    }
    return VectorStoreManager.instance;
  }

  /**
   * 初始化向量存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const settings = getSettings();
      const directory = settings.vectorStore.directory;
      
      // 确保目录存在
      ensureDirectoryExists(directory);
      
      // 初始化嵌入模型和向量存储
      const embeddings = new OllamaEmbeddings({
        model: "bge-m3:latest",
        baseUrl: "http://localhost:11434",
      });
      
      let chromaSettings;
      try {
        // 获取ChromaDB特定设置
        chromaSettings = getChromaConfig();
      } catch (error) {
        // 如果没有配置ChromaDB，使用默认设置
        chromaSettings = {
          url: "http://localhost:8000",
          collectionName: DEFAULT_CHROMADB_COLLECTION
        };
      }
      
      // 创建或连接到现有的ChromaDB实例
      try {
        // 首先尝试连接到现有集合
        this.vectorStore = await Chroma.fromExistingCollection(
          embeddings,
          {
            collectionName: chromaSettings.collectionName,
            url: chromaSettings.url,
            collectionMetadata: {
              "description": "电子书转短视频连续剧内容向量存储"
            }
          }
        );
        console.log(`连接到现有ChromaDB集合: ${chromaSettings.collectionName}`);
      } catch (error) {
        // 如果集合不存在，创建新集合
        console.log(`创建新的ChromaDB集合: ${chromaSettings.collectionName}`);
        this.vectorStore = new Chroma(
          embeddings,
          {
            collectionName: chromaSettings.collectionName,
            url: chromaSettings.url,
            collectionMetadata: {
              "description": "电子书转短视频连续剧内容向量存储"
            }
          }
        );
      }
      
      this.initialized = true;
      console.log("向量存储初始化成功");
    } catch (error: any) {
      console.error("向量存储初始化失败:", error);
      throw new Error(`向量存储初始化失败: ${error.message}`);
    }
  }

  /**
   * 存储文档章节
   * @param document 电子书文档
   */
  public async storeDocument(document: Document): Promise<void> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      console.log(`将文档 "${document.title}" 存储到向量数据库...`);
      
      // 将每个章节转换为LangChain文档格式并存储
      const langchainDocs: LangchainDocument[] = [];
      
      for (const chapter of document.chapters) {
        // 将章节拆分为段落
        const paragraphs = chapter.pageContent.split(/\n\n+/).filter(p => p.trim().length > 0);
        
        // 为每个段落创建文档
        for (const [index, paragraph] of paragraphs.entries()) {
          langchainDocs.push(
            new LangchainDocument({
              pageContent: paragraph,
              metadata: {
                documentId: document.id,
                documentTitle: document.title,
                chapterId: chapter.id,
                chapterTitle: chapter.title,
                chapterOrder: chapter.order,
                paragraphIndex: index,
                contentType: "paragraph"
              }
            })
          );
        }
      }
      
      // 批量添加到向量存储
      await this.vectorStore.addDocuments(langchainDocs);
      console.log(`成功将 ${langchainDocs.length} 个段落存储到向量数据库`);
      
    } catch (error: any) {
      console.error("存储文档到向量数据库失败:", error);
      throw new Error(`存储文档到向量数据库失败: ${error.message}`);
    }
  }

  /**
   * 存储关键信息
   * @param infoType 信息类型
   * @param content 信息内容
   * @param metadata 元数据
   */
  public async storeKeyInformation(
    infoType: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<string> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      const infoId = uuidv4();
      
      const doc = new LangchainDocument({
        pageContent: content,
        metadata: {
          id: infoId,
          type: infoType,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
      
      await this.vectorStore.addDocuments([doc]);
      return infoId;
      
    } catch (error: any) {
      console.error("存储关键信息失败:", error);
      throw new Error(`存储关键信息失败: ${error.message}`);
    }
  }

  /**
   * 按相似度搜索内容
   * @param query 查询文本
   * @param filter 过滤条件
   * @param limit 结果数量限制
   */
  public async similaritySearch(
    query: string,
    filter?: Record<string, any>,
    limit: number = DEFAULT_SEARCH_LIMIT
  ): Promise<LangchainDocument[]> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      // 执行相似度搜索
      const results = await this.vectorStore.similaritySearch(
        query,
        limit,
        filter
      );
      
      return results;
      
    } catch (error: any) {
      console.error("相似度搜索失败:", error);
      throw new Error(`相似度搜索失败: ${error.message}`);
    }
  }

  /**
   * 查找相似性最高的内容
   * @param query 查询文本
   * @param filter 过滤条件 
   */
  public async findMostSimilar(
    query: string,
    filter?: Record<string, any>
  ): Promise<{ document: LangchainDocument; score: number } | null> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      // 执行相似度搜索并返回分数
      const resultsWithScores = await this.vectorStore.similaritySearchWithScore(
        query,
        1,
        filter
      );
      
      if (resultsWithScores.length > 0) {
        const [document, score] = resultsWithScores[0];
        return { document, score };
      }
      
      return null;
      
    } catch (error: any) {
      console.error("查找最相似内容失败:", error);
      throw new Error(`查找最相似内容失败: ${error.message}`);
    }
  }

  /**
   * 检查内容一致性
   * 通过检索相似内容来验证内容的一致性
   * @param content 要检查的内容
   * @param documentId 文档ID
   */
  public async checkContentConsistency(
    content: string,
    documentId: string
  ): Promise<{
    consistent: boolean;
    similarContents: LangchainDocument[];
    similarityScore: number;
  }> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      // 搜索相似内容并返回分数
      const resultsWithScores = await this.vectorStore.similaritySearchWithScore(
        content,
        3,
        { documentId }
      );
      
      // 计算平均相似度分数
      let averageScore = 0;
      const similarContents: LangchainDocument[] = [];
      
      if (resultsWithScores.length > 0) {
        let totalScore = 0;
        resultsWithScores.forEach(([doc, score]) => {
          similarContents.push(doc);
          // 将分数转换为0-1范围（假设原始分数为欧几里得距离）
          const normalizedScore = 1 / (1 + score);
          totalScore += normalizedScore;
        });
        
        averageScore = totalScore / resultsWithScores.length;
      }
      
      // 确定是否一致 (使用配置中的阈值)
      const consistent = averageScore > DEFAULT_SIMILARITY_THRESHOLD;
      
      return {
        consistent,
        similarContents,
        similarityScore: averageScore
      };
      
    } catch (error: any) {
      console.error("内容一致性检查失败:", error);
      throw new Error(`内容一致性检查失败: ${error.message}`);
    }
  }

  /**
   * 删除文档相关的所有向量
   * @param documentId 文档ID
   */
  public async deleteDocumentVectors(documentId: string): Promise<void> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      if (!this.vectorStore) {
        throw new Error("向量存储初始化失败");
      }

      // 删除与指定文档关联的所有向量
      await this.vectorStore.delete({
        filter: { documentId }
      });
      
      console.log(`成功删除文档 ID ${documentId} 的所有向量`);
      
    } catch (error: any) {
      console.error("删除文档向量失败:", error);
      throw new Error(`删除文档向量失败: ${error.message}`);
    }
  }

  /**
   * 保存工作流状态
   * @param documentId 文档ID
   * @param stepName 步骤名称
   * @param data 要保存的数据
   */
  public async saveWorkflowState(
    documentId: string,
    stepName: string,
    data: any
  ): Promise<string> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      // 将对象数据序列化为字符串
      const serializedData = JSON.stringify(data);
      
      // 创建一个唯一的状态ID
      const stateId = `workflow-${documentId}-${stepName}`;
      
      // 创建文档摘要用于向量化
      const stateSummary = `Workflow state for document ${documentId} at step ${stepName}`;
      
      // 储存到向量数据库
      const doc = new LangchainDocument({
        pageContent: stateSummary,
        metadata: {
          id: stateId,
          type: "workflow_state",
          step: stepName,
          documentId: documentId,
          timestamp: Date.now(),
          data: serializedData
        }
      });
      
      // 检查是否已存在同名state
      await this.deleteWorkflowState(documentId, stepName);
      
      // 添加新状态
      await this.vectorStore.addDocuments([doc]);
      
      console.log(`工作流状态已保存: ${stepName} for 文档 ${documentId}`);
      return stateId;
    } catch (error: any) {
      console.error("保存工作流状态失败:", error);
      throw new Error(`保存工作流状态失败: ${error.message}`);
    }
  }

  /**
   * 获取工作流状态
   * @param documentId 文档ID
   * @param stepName 步骤名称
   */
  public async getWorkflowState(
    documentId: string,
    stepName: string
  ): Promise<any | null> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      // 查询状态记录
      // 注意：使用 where 参数和 $eq 操作符是 ChromaDB 推荐的过滤方式
      // 使用类型断言绕过 TypeScript 类型检查，因为 LangChain 的类型定义与 ChromaDB API 不完全匹配
      const results = await this.vectorStore.similaritySearch(
        `Workflow state for document ${documentId} at step ${stepName}`,
        1,
        {
          step: stepName
        }
      );

      if (results.length > 0) {
        const stateDoc = results[0];
        // 解析存储的数据
        if (stateDoc.metadata.data) {
          try {
            return JSON.parse(stateDoc.metadata.data);
          } catch (e) {
            console.error("解析工作流状态数据失败:", e);
          }
        }
      }
      
      return null;
    } catch (error: any) {
      console.error("获取工作流状态失败:", error);
      return null;
    }
  }

  /**
   * 删除工作流状态
   * @param documentId 文档ID
   * @param stepName 步骤名称
   */
  private async deleteWorkflowState(
    documentId: string,
    stepName: string
  ): Promise<void> {
    try {
      if (!this.initialized || !this.vectorStore) {
        await this.initialize();
      }

      // 删除特定状态
      await this.vectorStore.delete({
        where: {
          type: { $eq: "workflow_state" },
          documentId: { $eq: documentId },
          step: { $eq: stepName }
        } 
      } as any); // 使用类型断言解决类型不匹配问题
    } catch (error: any) {
      console.error("删除工作流状态失败:", error);
    }
  }

  /**
   * 检查工作流步骤是否已完成
   * @param documentId 文档ID
   * @param stepName 步骤名称
   */
  public async hasCompletedStep(
    documentId: string,
    stepName: string
  ): Promise<boolean> {
    const state = await this.getWorkflowState(documentId, stepName);
    return state !== null;
  }
} 