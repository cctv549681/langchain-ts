import { Chapter, Document, DocumentMetadata } from "../../types/document";
import * as path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";

/**
 * 解析PDF文件并提取内容
 * @param filePath PDF文件路径
 * @returns 解析后的文档对象
 */
export async function parseDocument(filePath: string): Promise<Document> {
  let doc;
  try {
    if (path.extname(filePath) === ".pdf") {
      // 加载PDF文件
      const loader = new PDFLoader(filePath, {
        splitPages: false,
      });
      doc = await loader.load();
    } else if (path.extname(filePath) === ".epub") {
      const loader = new EPubLoader(filePath, {
        splitChapters: true,
      });
      doc = await loader.load();
    }

    // 创建文档元数据
    const metadata: DocumentMetadata = {
      fileName: path.basename(filePath),
      createdAt: new Date(),
      processingStatus: "pending",
    };


    // 创建并返回文档对象
    // 注意：实际实现需要处理章节分割等逻辑
    return {
      id: path.basename(filePath, path.extname(filePath)),
      title: path.basename(filePath, path.extname(filePath)),
      metadata,
      chapters: doc.filter((chapter) => chapter.pageContent.length > 0).map((chapter, index) => ({
        ...chapter,
        id: `${metadata.fileName}-${index + 1}`,
        order: index + 1,
        metadata: {
          ...chapter.metadata,
          source: filePath,
        },
      })),
    };
  } catch (error: any) {
    console.error("PDF解析失败:", error);
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}
