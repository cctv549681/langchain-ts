import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// import { getSettings, updateSettings } from './config/settings';
import { DEFAULT_OUTPUT_DIR } from './config/constants';
// import { Document, DocumentMetadata } from './types/document';
import { createMainWorkflow } from './workflows/main-workflow';
import { parseDocument } from './modules/document-processor/pdf-parser';
// import { generateOutputFiles } from './utils/file-operations';
// import { ensureDirectoryExists } from './utils/file-operations';
import { DataStore } from './storage/data-store';

// 加载环境变量
dotenv.config();

/**
 * 主函数
 */
async function main() {
  try {
    console.log('电子书转短视频单人解析系统启动...');
    
    // 获取命令行参数
    const args = process.argv.slice(2);
    const inputFilePath = args[0];
    const outputDir = args[1] || DEFAULT_OUTPUT_DIR;
    
    // 检查输入文件
    if (!inputFilePath) {
      console.error('错误: 请提供输入文件路径');
      console.log('用法: npm run start <输入PDF文件路径> [输出目录路径]');
      process.exit(1);
    }
    
    // 检查文件存在性和格式
    if (!fs.existsSync(inputFilePath)) {
      console.error(`错误: 输入文件不存在: ${inputFilePath}`);
      process.exit(1);
    }
    
    const fileExt = path.extname(inputFilePath).toLowerCase();
    if (fileExt !== '.pdf' && fileExt !== '.epub') {
      console.error(`错误: 不支持的文件格式: ${fileExt}。目前仅支持PDF和EPUB文件。`);
      process.exit(1);
    }
    
    // 确保输出目录存在
    // ensureDirectoryExists(outputDir);
    
    // 更新设置
    // updateSettings({
    //   outputDirectory: outputDir
    // });
    
    // 初始化数据存储
    const dataStore = DataStore.getInstance();
    await dataStore.initialize();
    
    // console.log(`使用输入文件: ${inputFilePath}`);
    // console.log(`输出目录: ${outputDir}`);
    
    // 解析PDF
    console.log('正在解析PDF文件...');
    const document = await parseDocument(inputFilePath);
    
    // 保存文档到存储系统
    // const documentId = await dataStore.storeDocument(document);
    // console.log(`文档已保存到存储系统，ID: ${documentId}`);
    
    // 创建工作流
    const workflow = createMainWorkflow();
    
    // 执行工作流
    console.log('开始处理文档...');
    const result = await workflow.invoke({
      document: document,
      status: 'pending'
    });
    
    // // 检查处理状态
    // if (result.status === 'failed') {
    //   console.error(`处理失败: ${result.error}`);
    //   await dataStore.updateDocumentStatus(documentId, 'failed', result.error);
    //   process.exit(1);
    // }
    
    // // 保存处理结果
    // if (result.episodes && result.episodes.length > 0) {
    //   // 更新文档状态
    //   await dataStore.updateDocumentStatus(documentId, 'completed', '处理成功');
      
    //   // 存储解说计划
    //   if (result.episodePlans) {
    //     await dataStore.storeEpisodePlans(documentId, result.episodePlans);
    //   }
      
    //   // 存储完成的解说集数
    //   await dataStore.storeEpisodes(documentId, result.episodes);
      
    //   console.log(`处理完成! 生成 ${result.episodes.length} 集短视频解说脚本。`);
      
    //   console.log('正在生成输出文件...');
    //   await generateOutputFiles(result.episodes, outputDir);
      
    //   console.log(`所有文件已生成到目录: ${outputDir}`);
    //   console.log('处理完成!');
    // } else {
    //   console.error('错误: 没有生成任何解说集数');
    //   await dataStore.updateDocumentStatus(documentId, 'failed', '没有生成任何解说集数');
    //   process.exit(1);
    // }
  } catch (error: any) {
    console.error('处理过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('致命错误:', error);
    process.exit(1);
  });
}

export { main };
