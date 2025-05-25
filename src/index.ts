import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// import { getSettings, updateSettings } from './config/settings';
import { DEFAULT_OUTPUT_DIR } from './config/constants';
// import { Document, DocumentMetadata } from './types/document';
import { createMainWorkflow } from './workflows/main-workflow';
import { parseDocument } from './modules/document-processor/pdf-parser';
import { generateOutputFiles } from './utils/file-operations';
import { ensureDirectoryExists } from './utils/file-operations';
import { DataStore } from './storage/data-store';
import { VectorStoreManager } from './storage/vector-store';

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
    const forceReprocess = args.includes('--force'); // 添加强制重新处理选项
    
    // 检查输入文件
    if (!inputFilePath) {
      console.error('错误: 请提供输入文件路径');
      console.log('用法: npm run start <输入PDF文件路径> [输出目录路径] [--force]');
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
    ensureDirectoryExists(outputDir);
    
    // 初始化数据存储
    const dataStore = DataStore.getInstance();
    await dataStore.initialize();
    
    // 初始化向量存储
    const vectorStore = VectorStoreManager.getInstance();
    await vectorStore.initialize();
    
    // 解析PDF
    console.log('正在解析PDF文件...');
    const document = await parseDocument(inputFilePath);
    document.id = document.id || uuidv4(); // 确保文档有ID
    
    // 检查是否已经完成全部处理
    const isFullyProcessed = await vectorStore.hasCompletedStep(document.id, 'qualityCheck');
    
    if (isFullyProcessed && !forceReprocess) {
      console.log('该文档已完全处理过，正在从缓存加载结果...');
      const finalResult = await vectorStore.getWorkflowState(document.id, 'qualityCheck');
      console.log(`已找到缓存的最终结果，包含 ${finalResult.episodes?.length || 0} 集内容`);
      
      // 处理最终结果...
      if (finalResult.episodes && finalResult.episodes.length > 0) {
        await generateOutputFiles(finalResult.episodes, outputDir);
        console.log(`输出文件已生成到目录: ${outputDir}`);
      } else {
        console.log('缓存中没有找到有效的剧集数据，需要重新处理');
      }
      
      return;
    }
    
    // 如果强制重新处理，可以清除现有工作流状态
    if (forceReprocess) {
      console.log('清除现有的处理状态，准备重新处理...');
      // 这里不需要特别的清除代码，因为saveWorkflowState会覆盖现有状态
    }
    
    // 存储文档到向量数据库（如果还没有）
    const hasStoredDoc = await vectorStore.hasCompletedStep(document.id, 'docStored');
    if (!hasStoredDoc || forceReprocess) {
      console.log('将文档存储到向量数据库...');
      await vectorStore.storeDocument(document);
      await vectorStore.saveWorkflowState(document.id, 'docStored', true);
    } else {
      console.log('文档已存在于向量数据库中，跳过存储步骤');
    }
    
    // 创建工作流
    const workflow = createMainWorkflow();
    
    // 执行工作流
    console.log('开始处理文档...');
    const result = await workflow.invoke({
      document: document,
      status: 'pending'
    });
    
    // 检查处理状态
    if (result.status === 'failed') {
      console.error(`处理失败: ${result.error}`);
      process.exit(1);
    }
    
    // 处理结果
    if (result.episodes && result.episodes.length > 0) {
      console.log(`处理完成! 生成 ${result.episodes.length} 集短视频解说脚本。`);
      
      console.log('正在生成输出文件...');
      await generateOutputFiles(result.episodes, outputDir);
      
      console.log(`所有文件已生成到目录: ${outputDir}`);
      console.log('处理完成!');
    } else {
      console.error('错误: 没有生成任何解说集数');
      process.exit(1);
    }
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
