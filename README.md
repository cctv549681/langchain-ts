# 📚 书籍内容转视频AI生成系统

> 将书籍内容智能转化为**故事化视频脚本**，通过动物角色和戏剧化叙事，让抽象知识变得生动有趣

## 🎯 核心特点

### 💡 智能内容处理
- **智能过滤**: 自动识别并移除目录、页码、版权信息等无用内容
- **章节价值评估**: AI智能评分，自动跳过价值较低的章节(如索引、致谢等)
- **智能章节拆分**: 长章节(>2000字)按段落智能拆分，保持句子连贯
- **内容汇总**: 先分段提取核心要点(200字内)，再汇总形成完整观点
- **避免注意力稀释**: 每个处理单元控制在2000字以内，确保AI专注度

### 🎭 故事化创作
- **动物角色体系**: 🦊狐狸(智慧型)、🐻熊(行动型)、🐰兔子(好奇型)
- **冲突设计**: 设置认知冲突、情感转折、智慧顿悟等爆点
- **戏剧化叙事**: 三幕结构，增强观看体验

### 📹 视频优化
- **逐章处理**: 每章独立分析，由AI智能决定生成2-4个视频
- **短视频适配**: 每个视频2-3分钟，适合抖音、B站等平台
- **AI提示词**: 生成适合即梦AI等工具的专业视频提示词

## 🚀 使用方法

```bash
# 安装依赖
npm install

# 处理PDF或EPUB书籍
npm start /path/to/your/book.pdf
```

## 📁 输出结构

```
output/
├── 📋 全书视频总览.md          # 所有章节的制作进度概览
├── 第1章-章节名/
│   ├── 1-章节分析.md          # 智能拆分和汇总后的分析
│   ├── 2-视频规划.md          # AI决定的视频数量和主题
│   ├── 3-视频脚本.md          # 完整的故事化脚本
│   ├── 4-AI提示词.md          # 场景化视频提示词
│   └── 即梦提示词.txt          # 即梦AI专用格式
└── 第2章-章节名/...
```

## 🔧 技术架构

- **LangGraph**: 工作流编排框架
- **Ollama + Qwen3:4b**: 本地大语言模型
- **智能拆分算法**: 按换行符和句子边界智能拆分
- **逐章处理模式**: 避免长文本影响AI注意力

## 📋 处理流程

1. **🧹 内容过滤**: 自动移除页码、目录、版权等无用信息
2. **📊 价值评估**: AI评分章节质量，自动跳过低价值内容
3. **📖 章节拆分**: 检测章节长度，>2000字时智能拆分
4. **🧠 内容汇总**: 分段提取要点，汇总核心观点  
5. **🎯 视频规划**: AI分析内容价值，决定视频数量(2-4个)
6. **✍️ 脚本创作**: 为每个视频创作完整故事脚本
7. **🎬 提示词生成**: 生成AI视频制作的专业提示词
8. **🔄 循环处理**: 自动处理下一章节

## 💡 核心优势

### 相比传统方法
- ❌ 传统: 简单截取 → ✅ 现在: 智能拆分+汇总
- ❌ 传统: 一次处理全书 → ✅ 现在: 逐章精细化处理  
- ❌ 传统: 枯燥知识输出 → ✅ 现在: 故事化+冲突设计
- ❌ 传统: 通用提示词 → ✅ 现在: 场景化AI提示词

### 解决痛点
- 🧹 **无用内容干扰**: 智能过滤目录、页码等，专注核心内容
- 📊 **章节质量参差**: AI评分系统，自动跳过低价值章节
- 🎯 **注意力稀释**: 控制处理单元大小，保持AI专注
- 🧩 **思想割裂**: 先拆分再汇总，保持作者完整思路
- 📹 **制作困难**: 提供完整脚本和AI提示词，直接可用
- 🎭 **内容枯燥**: 动物角色+冲突设计，让知识生动有趣

---

*本系统专为知识内容创作者设计，将复杂的书籍内容转化为易于制作和传播的短视频素材* 