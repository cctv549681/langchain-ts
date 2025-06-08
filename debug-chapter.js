const { ChapterProcessor } = require('./dist/workflows/processors/chapter-processor');

async function debugChapter4() {
  console.log('🔍 开始调试第4章处理...');
  
  const processor = new ChapterProcessor();
  
  // 模拟第4章的内容（从日志中提取的部分）
  const testContent = `引言 未 来的时代将与我们有生之年所经历的时代完全不同，但与历史上的许多时代有着相似之处。 我为何得出这样的结论？因为事实历来如此。 在过去约50年的时间里，为了做好我的工作，我需要了解决定一个国家及其市场成败的关键要素。我认识到，要想预测和应对前所未有的情况，我必须尽可能多地研究类似的历史案例，搞清这些案例背后的驱动机制。这些工作帮助我总结出妥善应对这些情况的原则。 几年前，我注意到一些重大势态发展，在我的有生之年里，这些事件从未发生过，但在历史上曾多次出现。 最重要的是，我看到在巨额债务和零（或接近于零）利率的综合影响下，世界三大储备货币国家大规模印钞；在各国（特别是美国）内部，由于财富、政治和价值观差距达到约一个世纪以来的最大程度，政治和社会出现了严重冲突；一个崛起的世界大国（中国）挑战现存的世界大国（美国）和现有世界秩序。最近一段与目前类似的时期是1930—1945年。这令我十分担忧。`;
  
  const mockState = {
    currentChapterIndex: 3,
    document: {
      chapters: [
        { title: '第1章' },
        { title: '第2章' },
        { title: '第3章' },
        { 
          title: '第4章', 
          pageContent: testContent.repeat(10) // 模拟11000字的内容
        }
      ]
    }
  };
  
  try {
    console.log('📖 开始分析章节...');
    const result = await processor.analyzeChapter(mockState);
    
    console.log('✅ 分析结果:');
    console.log('- status:', result.status);
    console.log('- currentChapter长度:', result.currentChapter?.length || 0);
    console.log('- chapterAnalysis存在:', !!result.chapterAnalysis);
    
    if (result.status === 'skip') {
      console.log('⚠️ 章节被跳过');
    } else if (result.status === 'failed') {
      console.log('❌ 章节处理失败:', result.error);
    } else {
      console.log('🎉 章节处理成功!');
    }
    
  } catch (error) {
    console.error('💥 调试过程中发生错误:', error);
  }
}

debugChapter4().catch(console.error); 