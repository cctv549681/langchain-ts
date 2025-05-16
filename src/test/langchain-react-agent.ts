import { InitializeAgentExecutorOptions, initializeAgentExecutorWithOptions } from 'langchain/agents'
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { ChatOpenAI } from "@langchain/openai";
import { getModelBuilder } from "../helper/getModelBuilder";
import { Calculator } from "@langchain/community/tools/calculator";
import * as readline from 'readline';

const tools = [
 new SerpAPI(process.env.SERP_API_KEY),
 new Calculator(),
]

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 封装readline.question为Promise
function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
 const builder = await getModelBuilder(
   { type: "chat", provider: "ollama" },
   {
     temperature: 1.5,
     verbose: true,
   }
 );
 const model = await builder();

 const executor = await initializeAgentExecutorWithOptions(tools, model, {
   agentType: "zero-shot-react-description",
   verbose: true,
 });

 try {
   while (true) {
     // 获取用户输入
     const input = await askQuestion("\n请输入您的问题（输入 'exit' 退出）: ");
     
     // 检查是否退出
     if (input.toLowerCase() === 'exit') {
       console.log('再见！');
       break;
     }

     console.log('\n正在思考...\n');
     
     // 执行查询
     const result = await executor.call({
       input: input + " 使用中文回答",  // 确保用中文回答
     });

     console.log('\n回答:', result.output);
   }
 } catch (error) {
   console.error('发生错误:', error);
 } finally {
   // 关闭readline接口
   rl.close();
 }
}

main().catch(console.error);
