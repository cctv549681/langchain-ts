import * as fs from 'fs';
import * as path from 'path';
import { Document } from '../../types/document';

/**
 * 解析PDF/EPUB文档
 */
export async function parseDocument(filePath: string): Promise<Document> {
  const fileExt = path.extname(filePath).toLowerCase();
  
  if (fileExt === '.pdf') {
    return await parsePDF(filePath);
  } else if (fileExt === '.epub') {
    return await parseEPUB(filePath);
  } else {
    throw new Error(`不支持的文件格式: ${fileExt}`);
  }
}

async function parsePDF(filePath: string): Promise<Document> {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  
  return createDocumentFromText(filePath, data.text);
}

async function parseEPUB(filePath: string): Promise<Document> {
  const { EPub } = require('epub2');
  const epub = await EPub.createAsync(filePath);
  
  let fullText = '';
  
  // 使用 flow 属性获取章节列表
  for (const chapter of epub.flow) {
    try {
      // 使用 getChapter 方法获取章节内容
      const chapterText = await new Promise<string>((resolve, reject) => {
        epub.getChapter(chapter.id, (error: any, text: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(text);
          }
        });
      });
      
      // 清理 HTML 标签和多余空格
      const cleanText = chapterText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      fullText += cleanText + '\n\n';
    } catch (error) {
      console.warn(`跳过章节 ${chapter.id}:`, error);
      continue;
    }
  }
  
  return createDocumentFromText(filePath, fullText);
}

function createDocumentFromText(filePath: string, text: string): Document {
  const chapters = text
    .split(/\n\s*\n/)
    .filter(chunk => chunk.trim().length > 100)
    .map((chunk, index) => ({
      id: `chapter-${index + 1}`,
      pageContent: chunk.trim(),
      metadata: { 
        source: filePath,
        wordCount: chunk.length
      }
    }));

  return {
    id: `doc-${Date.now()}`,
    title: path.basename(filePath, path.extname(filePath)),
    chapters,
    metadata: {
      fileName: path.basename(filePath),
      createdAt: new Date(),
      processingStatus: 'completed'
    }
  };
} 