import * as path from "path";
import { promises as fs } from "fs";

export class FileManager {
  async saveAndContinue(state: any) {
    const chapterIndex = state.currentChapterIndex || 0;
    const chapters = state.document?.chapters || [];
    const chapter = chapters[chapterIndex];
    const shouldSave = state.currentChapter && state.currentChapter.trim();

    if (!chapter) {
      throw new Error("当前章节不存在");
    }

    const chapterTitle = chapter.title || `第${chapterIndex + 1}章`;

    // 🔍 调试信息：打印当前状态
    console.log(`🔍 调试信息 - 章节 ${chapterIndex + 1}:`);
    console.log(`   - currentChapter: ${state.currentChapter ? `✅ 存在(${state.currentChapter.length}字)` : '❌ 不存在'}`);
    console.log(`   - chapterAnalysis: ${state.chapterAnalysis ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - videoPlans: ${state.videoPlans ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - videoScripts: ${state.videoScripts ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - aiPrompts: ${state.aiPrompts ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - status: ${state.status}`);
    console.log(`   - shouldSave: ${shouldSave}`);

    // 处理跳过的章节
    if (state.status === "skip") {
      console.log(`⏭️ 跳过章节: ${chapterTitle} (状态为skip)`);
    }
    // 检查是否有处理失败的情况
    else if (state.status === "failed") {
      console.log(`❌ 章节处理失败: ${chapterTitle} - ${state.error || '未知错误'}`);
    }
    // 只有当章节有实际内容时才保存
    else if (shouldSave) {
      console.log(`💾 保存章节结果: ${chapterTitle}`);

      const outputDir = path.join(process.cwd(), "output");
      const chapterDir = path.join(outputDir, chapterTitle);

      await this.ensureDirectoryExists(outputDir);
      await this.ensureDirectoryExists(chapterDir);

      // 保存章节文件
      if (state.chapterAnalysis) {
        const analysisFile = path.join(chapterDir, "1-章节分析.md");
        await fs.writeFile(
          analysisFile,
          `# ${chapterTitle} - 章节分析\n\n${state.chapterAnalysis}`,
          "utf-8"
        );
        console.log(`✅ 保存章节分析`);
      }

      if (state.videoPlans) {
        const plansFile = path.join(chapterDir, "2-视频规划.md");
        await fs.writeFile(
          plansFile,
          `# ${chapterTitle} - 视频规划\n\n${state.videoPlans}`,
          "utf-8"
        );
        console.log(`✅ 保存视频规划`);
      }

      if (state.videoScripts) {
        const scriptsFile = path.join(chapterDir, "3-视频脚本.md");
        await fs.writeFile(
          scriptsFile,
          `# ${chapterTitle} - 视频脚本\n\n${state.videoScripts}`,
          "utf-8"
        );
        console.log(`✅ 保存视频脚本`);
      }

      if (state.aiPrompts) {
        const promptsFile = path.join(chapterDir, "4-AI提示词.md");
        await fs.writeFile(
          promptsFile,
          `# ${chapterTitle} - AI视频提示词\n\n${state.aiPrompts}`,
          "utf-8"
        );

        const jiemengFile = path.join(chapterDir, "即梦提示词.txt");
        const jiemengContent = this.extractJiemengPrompts(state.aiPrompts);
        await fs.writeFile(jiemengFile, jiemengContent, "utf-8");

        console.log(`✅ 保存AI提示词`);
      }
    } else {
      console.log(`⏭️ 跳过章节: ${chapterTitle} (无有效内容)`);
    }

    // 继续下一章节
    const nextChapterIndex = chapterIndex + 1;
    const totalChapters = chapters.length;
    
    // 判断是否处理完所有章节

    // 测试时只处理一章
    if (shouldSave) {
      return {
        currentChapterIndex: nextChapterIndex,
        status: "completed" as const,
      };
    } else {
      // 继续处理下一章节
      return {
        currentChapterIndex: nextChapterIndex,
        currentChapter: "",
        chapterAnalysis: "",
        videoPlans: "",
        videoScripts: "",
        aiPrompts: "",
        status: "processing" as const,
      };
    }
  }

  private async ensureDirectoryExists(dirPath: string) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  private extractJiemengPrompts(aiPrompts: string): string {
    // 提取即梦AI格式的提示词
    const lines = aiPrompts.split("\n");
    const jiemengPrompts: string[] = [];

    let isInPrompt = false;
    let currentPrompt = "";

    for (const line of lines) {
      if (line.includes("即梦提示词") || line.includes("即梦AI")) {
        isInPrompt = true;
        continue;
      }

      if (isInPrompt) {
        if (
          line.trim() === "" ||
          line.startsWith("#") ||
          line.startsWith("---")
        ) {
          if (currentPrompt.trim()) {
            jiemengPrompts.push(currentPrompt.trim());
            currentPrompt = "";
          }
          isInPrompt = false;
        } else {
          currentPrompt += line + "\n";
        }
      }
    }

    if (currentPrompt.trim()) {
      jiemengPrompts.push(currentPrompt.trim());
    }

    return jiemengPrompts.join("\n\n---\n\n");
  }
}
