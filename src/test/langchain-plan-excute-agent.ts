import { Calculator } from "@langchain/community/tools/calculator";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { getModelBuilder } from "../helper/getModelBuilder";
import { PlanAndExecuteAgentExecutor } from 'langchain/experimental/plan_and_execute'


async function main() {
  const tools = [
    new Calculator(),
    new SerpAPI(process.env.SERP_API_KEY),
  ]

  const builder = await getModelBuilder(
    { type: "chat", provider: "ollama" },
    {
      temperature: 1.5,
      verbose: true, // 输出详细日志 
    }
  );

  const model = await builder();


  const executor = await PlanAndExecuteAgentExecutor.fromLLMAndTools({  
    llm: model,
    tools,
    verbose: true, // 输出详细日志 
  });

  const result = await executor.invoke({
    input: "现在是2025年5月2号, 谁是美国总统? 然后告诉我他最近有什么政策? 市场什么反馈? 使用中文回答",
  });

  console.log(result);
}

main().catch(console.error);


