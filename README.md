# 电子书转短视频单人解析系统

## 项目简介

本系统可将电子书（PDF格式）自动转换为短视频单人解析脚本和字幕，专注于提取和解释电子书的核心概念和中心思想。每集视频长度控制在3分钟左右，系统不负责实际视频制作，仅输出脚本和字幕文件。

## 功能特点

- **PDF文档处理**：支持PDF电子书解析，包括文本提取和章节识别
- **核心思想提取**：分析内容结构、提取核心思想和关键概念
- **单人解说规划**：由"总策划Agent"规划整体知识结构和解说风格
- **解说脚本创作**：为每集生成3分钟左右的视频解说脚本，包含概念讲解和通俗示例
- **字幕生成**：自动生成SRT和VTT格式的字幕文件，标记重点概念
- **技术建议**：提供解说和视觉辅助元素建议
- **质量保证**：确保内容准确性、示例相关性和专业与通俗性平衡

## 技术栈

- TypeScript
- LangChain
- LangGraph
- Node.js

## 安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/ebook-to-video-script.git
cd ebook-to-video-script
```

2. 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

3. 配置环境变量

创建 `.env` 文件并配置以下变量:

```
MODEL_NAME=gpt-4
OPENAI_API_KEY=your_openai_api_key
```

## 使用方法

1. 构建项目

```bash
npm run build
# 或使用 pnpm
pnpm run build
```

2. 运行系统

```bash
npm run start /path/to/your/ebook.pdf [output_directory]
# 或使用 pnpm
pnpm run start /path/to/your/ebook.pdf [output_directory]
```

如果不指定输出目录，结果将保存在 `./output` 目录中。

## 输出结果

系统会在指定的输出目录中生成以下内容：

- `index.md`：概念解析索引
- 每集目录（例如 `episode-01/`）：
  - `script.md`：详细解说脚本，包含概念讲解和示例
  - `subtitle.srt`：SRT格式字幕
  - `subtitle.vtt`：VTT格式字幕
  - `technical-notes.md`：技术建议
  - `info.json`：解说元数据

## 系统架构

系统遵循以下工作流程：

1. **文档处理**：解析PDF，提取文本，分割章节
2. **内容分析**：分析内容结构，提取核心思想和关键概念
3. **总策划规划**：规划整体解说结构和风格
4. **分集创作**：为每集创建解说脚本、字幕和技术建议
5. **输出生成**：生成最终文件

## 配置选项

系统配置可在 `src/config/` 目录下修改：

- `constants.ts`：关键常量和默认值
- `settings.ts`：系统设置和配置

## 贡献

欢迎贡献代码、报告问题或提出改进建议！

## 许可证

MIT 