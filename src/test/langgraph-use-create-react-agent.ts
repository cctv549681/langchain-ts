import { Calculator } from "@langchain/community/tools/calculator";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { getModelBuilder } from "../helper/getModelBuilder";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

async function main() {
  const client = new MultiServerMCPClient({
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/jiang/Desktop",
      ],
      env: {
        ...process.env as Record<string, string>,
      },
    },
    "tavily-mcp": {
      command: "npx",
      args: ["-y", "tavily-mcp@0.1.4"],
      env: {
        ...process.env,
        TAVILY_API_KEY: "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",
      },
    },
  });
  const tools = await client.getTools();

  const builder = await getModelBuilder(
    { type: "chat", provider: "ollama", model: "qwen3:4b" },
    {
      temperature: 0,
      enable_thinking: false,
      // verbose: true, // 输出详细日志
    }
  );

  const model = await builder();

  const agentCheckPoint = new MemorySaver();

  const agent = createReactAgent({
    llm: model,
    tools,
    checkpointSaver: agentCheckPoint,
  });

  const agentState = await agent.stream(
    {
      messages: [
        new HumanMessage(
          "现在是2025年5月9日，使用工具tavily-mcp查询美国现任总统是谁? 使用中文回答"
        ),
      ],
    },
    {
      configurable: { thread_id: "test1" },
    }
  );

  process.stdout.write("回答: ");
  let lastMessagesLength = 0;
  for await (const chunk of agentState) {
    const messages = chunk.messages || [];
    for (let i = lastMessagesLength; i < messages.length; i++) {
      const msg = messages[i];
      // 输出消息类型和内容
      console.log(`[${msg.constructor.name}] ${msg.content}`);
    }
    lastMessagesLength = messages.length;
  }
  
  const agentState2 = await agent.invoke(
    {
      messages: [new HumanMessage("然后告诉我他最近有什么政策? 市场什么反馈? ")],
    },
    { configurable: { thread_id: "test1" } }
  );

  console.log(
    agentState2.messages[agentState2.messages.length - 1].content,
  );
}

main().catch(console.error);
