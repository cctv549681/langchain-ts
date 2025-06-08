const { ChapterProcessor } = require('./dist/workflows/processors/chapter-processor');

async function testAsyncFix() {
  console.log('🧪 测试异步修复效果...');
  
  const processor = new ChapterProcessor();
  
  // 创建一个长章节内容
  const longContent = `
第一段：历史研究的重要性。在过去约50年的时间里，为了做好我的工作，我需要了解决定一个国家及其市场成败的关键要素。我认识到，要想预测和应对前所未有的情况，我必须尽可能多地研究类似的历史案例，搞清这些案例背后的驱动机制。

第二段：当前的重大变化。几年前，我注意到一些重大势态发展，在我的有生之年里，这些事件从未发生过，但在历史上曾多次出现。最重要的是，我看到在巨额债务和零利率的综合影响下，世界三大储备货币国家大规模印钞。

第三段：社会冲突的加剧。在各国（特别是美国）内部，由于财富、政治和价值观差距达到约一个世纪以来的最大程度，政治和社会出现了严重冲突。这种情况与1930-1945年期间非常相似。

第四段：中美竞争的现实。一个崛起的世界大国（中国）挑战现存的世界大国（美国）和现有世界秩序。这种大国竞争在历史上多次出现，每次都会带来深刻的变化。

第五段：历史周期的规律。我在研究历史的过程中发现，就像生物存在生命周期一样，历史通常也是通过相对明确的生命周期，随着一代人向下一代人的过渡而逐步演进的。

第六段：大周期的特征。这个大周期在以下两个时期之间产生更迭：和平与繁荣时期，具有强大的创造力和生产力；萧条、革命与战争时期，财富和权力斗争此起彼伏。

第七段：未来的预测。通过解释所有这些周期，我想表达的要点是，一旦这些周期朝着一个方向发展，历史的构成板块就会移动，所有人的生活都会发生巨变。
  `.repeat(3); // 重复3次，确保内容足够长
  
  const mockState = {
    currentChapterIndex: 3,
    document: {
      chapters: [
        { title: '第1章' },
        { title: '第2章' },
        { title: '第3章' },
        { 
          title: '第4章 - 异步测试', 
          pageContent: longContent
        }
      ]
    }
  };
  
  console.log(`📊 测试内容长度: ${longContent.length} 字符`);
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 开始处理章节...');
    const result = await processor.analyzeChapter(mockState);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📈 处理结果:');
    console.log(`⏱️  总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`📊 状态: ${result.status}`);
    console.log(`📝 内容长度: ${result.currentChapter?.length || 0} 字符`);
    console.log(`✅ 分析存在: ${!!result.chapterAnalysis}`);
    
    if (result.status === 'processing') {
      console.log('🎉 异步处理成功！');
      console.log('📄 处理后的内容预览:');
      console.log(result.currentChapter?.substring(0, 300) + '...');
    } else {
      console.log(`⚠️ 处理状态异常: ${result.status}`);
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.error(`💥 处理失败 (耗时 ${duration.toFixed(2)} 秒):`, error.message);
  }
}

testAsyncFix().catch(console.error); 