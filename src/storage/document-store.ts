import * as fs from "fs";
import * as path from "path";
import { Document, DocumentMetadata, Chapter } from "../types/document";
import { getSettings } from "../config/settings";
import { ensureDirectoryExists } from "../utils/file-operations";
import { v4 as uuidv4 } from "uuid";

/**
 * 文档存储管理器
 * 用于持久化存储电子书文档及其处理状态
 */
export class DocumentStoreManager {
  private static instance: DocumentStoreManager;
  private storageDir: string;
  private initialized = false;

  private constructor() {
    // 获取存储目录
    const settings = getSettings();
    this.storageDir = path.join(settings.outputDirectory, "documents");
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): DocumentStoreManager {
    if (!DocumentStoreManager.instance) {
      DocumentStoreManager.instance = new DocumentStoreManager();
    }
    return DocumentStoreManager.instance;
  }

  /**
   * 初始化文档存储
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // 确保存储目录存在
      ensureDirectoryExists(this.storageDir);

      // 创建索引文件，如果不存在的话
      const indexPath = path.join(this.storageDir, "index.json");
      if (!fs.existsSync(indexPath)) {
        fs.writeFileSync(indexPath, JSON.stringify({ documents: [] }, null, 2));
      }

      this.initialized = true;
      console.log("文档存储初始化成功");
    } catch (error: any) {
      console.error("文档存储初始化失败:", error);
      throw new Error(`文档存储初始化失败: ${error.message}`);
    }
  }

  /**
   * 保存文档
   * @param document 要保存的文档对象
   */
  public async saveDocument(document: Document): Promise<string> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 如果文档没有ID，创建一个
      if (!document.id) {
        document.id = uuidv4();
      }

      // 更新文档元数据
      if (!document.metadata) {
        document.metadata = {} as DocumentMetadata;
      }

      // 确保文档的目录存在
      const documentDir = path.join(this.storageDir, document.id);
      ensureDirectoryExists(documentDir);

      // 保存主文档信息（不含章节内容，以减小文件大小）
      const documentInfo = {
        id: document.id,
        title: document.title,
        author: document.author,
        metadata: document.metadata,
        chapters: document.chapters?.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          metadata: chapter.metadata,
        })),
      };

      const documentInfoPath = path.join(documentDir, "info.json");
      fs.writeFileSync(documentInfoPath, JSON.stringify(documentInfo, null, 2));
      if (document.chapters && document.chapters.length > 0) {
        // 单独保存每个章节的内容，以便更好地管理和访问
        for (const chapter of document.chapters) {
          const chapterPath = path.join(
            documentDir,
            `chapter-${chapter.id}.json`
          );
          fs.writeFileSync(chapterPath, JSON.stringify(chapter, null, 2));
        }
      }

      // 更新索引
      await this.updateIndex(document);

      console.log(`文档"${document.title}"(ID: ${document.id})保存成功`);
      return document.id;
    } catch (error: any) {
      console.error("保存文档失败:", error);
      throw new Error(`保存文档失败: ${error.message}`);
    }
  }

  /**
   * 根据ID获取文档
   * @param documentId 文档ID
   */
  public async getDocument(documentId: string): Promise<Document | null> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const documentDir = path.join(this.storageDir, documentId);

      // 检查文档是否存在
      if (!fs.existsSync(documentDir)) {
        console.log(`文档ID ${documentId} 不存在`);
        return null;
      }

      // 读取文档信息
      const documentInfoPath = path.join(documentDir, "info.json");
      const documentInfoStr = fs.readFileSync(documentInfoPath, "utf-8");
      const documentInfo = JSON.parse(documentInfoStr);

      // 初始化章节数组
      const chapters: Chapter[] = [];

      // 读取每个章节的详细内容
      for (const chapterInfo of documentInfo.chapters) {
        const chapterPath = path.join(
          documentDir,
          `chapter-${chapterInfo.id}.json`
        );
        if (fs.existsSync(chapterPath)) {
          const chapterStr = fs.readFileSync(chapterPath, "utf-8");
          const chapter = JSON.parse(chapterStr) as Chapter;
          chapters.push(chapter);
        }
      }

      // 构建完整的文档对象
      const document: Document = {
        ...documentInfo,
        chapters,
      };

      return document;
    } catch (error: any) {
      console.error(`获取文档(ID: ${documentId})失败:`, error);
      throw new Error(`获取文档失败: ${error.message}`);
    }
  }

  /**
   * 列出所有文档
   */
  public async listDocuments(): Promise<
    Array<{ id: string; title: string; metadata: DocumentMetadata }>
  > {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const indexPath = path.join(this.storageDir, "index.json");
      const indexStr = fs.readFileSync(indexPath, "utf-8");
      const index = JSON.parse(indexStr);

      return index.documents;
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
    status: "pending" | "processing" | "completed" | "failed",
    details?: string
  ): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      // 获取文档
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error(`文档ID ${documentId} 不存在`);
      }

      // 更新状态
      document.metadata.processingStatus = status;
      if (details) {
        document.metadata.processingDetails = details;
      }

      // 保存更新后的文档
      await this.saveDocument(document);

      console.log(`文档(ID: ${documentId})状态已更新为: ${status}`);
    } catch (error: any) {
      console.error(`更新文档状态失败(ID: ${documentId}):`, error);
      throw new Error(`更新文档状态失败: ${error.message}`);
    }
  }

  /**
   * 删除文档
   * @param documentId 文档ID
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      if (!this.initialized) {
        await this.initialize();
      }

      const documentDir = path.join(this.storageDir, documentId);

      // 检查文档是否存在
      if (!fs.existsSync(documentDir)) {
        console.log(`文档ID ${documentId} 不存在`);
        return;
      }

      // 删除文档目录及其所有内容
      fs.rmSync(documentDir, { recursive: true, force: true });

      // 更新索引
      await this.removeFromIndex(documentId);

      console.log(`文档(ID: ${documentId})已成功删除`);
    } catch (error: any) {
      console.error(`删除文档失败(ID: ${documentId}):`, error);
      throw new Error(`删除文档失败: ${error.message}`);
    }
  }

  /**
   * 私有方法：更新索引
   * @param document 文档对象
   */
  private async updateIndex(document: Document): Promise<void> {
    try {
      const indexPath = path.join(this.storageDir, "index.json");
      const indexStr = fs.readFileSync(indexPath, "utf-8");
      const index = JSON.parse(indexStr);

      // 检查文档是否已在索引中
      const existingDocIndex = index.documents.findIndex(
        (doc: { id: string }) => doc.id === document.id
      );

      const docInfo = {
        id: document.id,
        title: document.title,
        metadata: document.metadata,
      };

      if (existingDocIndex >= 0) {
        // 更新现有文档信息
        index.documents[existingDocIndex] = docInfo;
      } else {
        // 添加新文档信息
        index.documents.push(docInfo);
      }

      // 写回索引文件
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    } catch (error: any) {
      console.error("更新索引失败:", error);
      throw new Error(`更新索引失败: ${error.message}`);
    }
  }

  /**
   * 私有方法：从索引中删除文档
   * @param documentId 文档ID
   */
  private async removeFromIndex(documentId: string): Promise<void> {
    try {
      const indexPath = path.join(this.storageDir, "index.json");
      const indexStr = fs.readFileSync(indexPath, "utf-8");
      const index = JSON.parse(indexStr);

      // 过滤掉要删除的文档
      index.documents = index.documents.filter(
        (doc: { id: string }) => doc.id !== documentId
      );

      // 写回索引文件
      fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    } catch (error: any) {
      console.error("从索引中删除文档失败:", error);
      throw new Error(`从索引中删除文档失败: ${error.message}`);
    }
  }
}
