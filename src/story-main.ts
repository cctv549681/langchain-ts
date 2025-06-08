import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { parseDocument } from './modules/document-processor/pdf-parser';
import { createStoryWorkflow } from './workflows/story-workflow';

dotenv.config();

// 简单的文件操作工具函数
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 故事化视频创作系统 - 主入口
 */
async function main() {
  try {
    console.log('🎬 故事化视频创作系统启动...');
    
    const args = process.argv.slice(2);
    const inputFilePath = args[0];
    const outputDir = args[1] || './output';
    
    if (!inputFilePath) {
      console.error('❌ 请提供输入文件路径');
      console.log('用法: npm run story <PDF/EPUB文件路径> [输出目录]');
      process.exit(1);
    }
    
    if (!fs.existsSync(inputFilePath)) {
      console.error(`❌ 文件不存在: ${inputFilePath}`);
      process.exit(1);
    }
    
    const fileExt = path.extname(inputFilePath).toLowerCase();
    if (!['.pdf', '.epub'].includes(fileExt)) {
      console.error(`❌ 不支持的文件格式: ${fileExt}。支持格式: PDF, EPUB`);
      process.exit(1);
    }
    
    // 确保输出目录存在
    ensureDirectoryExists(outputDir);
    
    console.log('📖 解析文档...');
    const document = await parseDocument(inputFilePath);
    console.log(`✅ 文档解析完成，共 ${document.chapters?.length || 0} 个章节`);
    
    console.log('🎭 开始故事化创作...');
    const workflow = createStoryWorkflow();
    const result = await workflow.invoke({
      document,
      currentChapterIndex: 0,  // 从第0章开始
      allResults: [],          // 初始化结果数组
      status: "pending"
    });
    
    if (result.status === 'failed') {
      console.error(`❌ 创作失败: ${result.error}`);
      process.exit(1);
    }
    
    console.log('✅ 故事化创作完成！');
    
    // 保存结果文件
    await saveResults(result, outputDir);
    
    console.log(`🎉 所有文件已保存到: ${outputDir}`);
    
  } catch (error: any) {
    console.error('❌ 处理过程中发生错误:', error.message);
    process.exit(1);
  }
}

/**
 * 保存结果到文件 - 适应逐章节处理模式
 */
async function saveResults(result: any, outputDir: string) {
  console.log('💾 保存结果文件...');
  
  const allResults = result.allResults || [];
  if (allResults.length === 0) {
    console.warn('⚠️ 没有生成任何结果');
    return;
  }

  // 为每个章节创建单独的文件夹
  for (let i = 0; i < allResults.length; i++) {
    const chapterResult = allResults[i];
    const chapterDir = path.join(outputDir, `第${chapterResult.chapterIndex + 1}章-${chapterResult.chapterTitle || '未命名'}`);
    
    // 确保章节目录存在
    ensureDirectoryExists(chapterDir);
    
    console.log(`📁 保存第${chapterResult.chapterIndex + 1}章结果...`);
    
    // 1. 保存章节分析
    if (chapterResult.analysis) {
      const analysisFile = path.join(chapterDir, '1-章节分析.md');
      fs.writeFileSync(analysisFile, `# 第${chapterResult.chapterIndex + 1}章分析\n\n${chapterResult.analysis}`, 'utf-8');
    }
    
    // 2. 保存视频规划
    if (chapterResult.plans) {
      const plansFile = path.join(chapterDir, '2-视频规划.md');
      fs.writeFileSync(plansFile, `# 视频规划\n\n${chapterResult.plans}`, 'utf-8');
    }
    
    // 3. 保存视频脚本
    if (chapterResult.scripts) {
      const scriptsFile = path.join(chapterDir, '3-视频脚本.md');
      fs.writeFileSync(scriptsFile, `# 视频脚本\n\n${chapterResult.scripts}`, 'utf-8');
    }
    
    // 4. 保存AI提示词
    if (chapterResult.prompts) {
      const promptsFile = path.join(chapterDir, '4-AI提示词.md');
      fs.writeFileSync(promptsFile, `# AI视频提示词\n\n${chapterResult.prompts}`, 'utf-8');
      
      // 额外保存纯文本格式
      const txtFile = path.join(chapterDir, '即梦提示词.txt');
      fs.writeFileSync(txtFile, chapterResult.prompts, 'utf-8');
    }
  }
  
  // 创建总览文件
  const summaryFile = path.join(outputDir, '📋 全书视频总览.md');
  let summary = `# 全书视频创作总览

## 处理时间
${new Date().toLocaleString()}

## 章节统计
- 总章节数：${allResults.length}
- 预计视频总数：${allResults.reduce((total, chapter) => {
    const videoCount = chapter.plans?.match(/视频数量：(\d+)/)?.[1] || '0';
    return total + parseInt(videoCount);
  }, 0)}

`;

  // 为每个章节添加概览
  allResults.forEach((chapter, index) => {
    const videoCount = chapter.plans?.match(/视频数量：(\d+)/)?.[1] || '未知';
    summary += `## 第${chapter.chapterIndex + 1}章：${chapter.chapterTitle || '未命名'}
- 推荐视频数：${videoCount}个
- 文件夹：\`第${chapter.chapterIndex + 1}章-${chapter.chapterTitle || '未命名'}\`

`;
  });

  summary += `
## 使用说明
1. 每个章节都有独立的文件夹
2. 每个文件夹包含：分析→规划→脚本→提示词
3. 即梦提示词.txt 可直接用于AI视频生成

## 状态
${result.status || '完成'}
`;
  
  fs.writeFileSync(summaryFile, summary, 'utf-8');
  
  console.log('📄 已生成文件结构：');
  console.log('  📋 全书视频总览.md');
  allResults.forEach((chapter) => {
    const chapterName = `第${chapter.chapterIndex + 1}章-${chapter.chapterTitle || '未命名'}`;
    console.log(`  📁 ${chapterName}/`);
    console.log(`     📝 1-章节分析.md`);
    console.log(`     🎯 2-视频规划.md`);
    console.log(`     🎬 3-视频脚本.md`);
    console.log(`     🤖 4-AI提示词.md`);
    console.log(`     📱 即梦提示词.txt`);
  });
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('💥 致命错误:', error);
    process.exit(1);
  });
}

export { main }; 

console.log("📚 书籍内容转视频AI生成系统");
console.log("🎯 功能特点:");
console.log("   • 智能章节拆分：长章节按段落智能拆分，保持句子连贯");
console.log("   • 内容汇总：先分段提取要点，再汇总核心观点");
console.log("   • 故事化：将抽象知识转化为生动的动物角色故事");
console.log("   • 戏剧化：设计冲突矛盾和爆点，增强观看体验");
console.log("   • 逐章处理：每章独立分析，避免注意力稀释");
console.log("   • AI提示词：生成适合即梦AI等工具的视频提示词");
console.log("─".repeat(60)); 