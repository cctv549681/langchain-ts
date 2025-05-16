import { Calculator } from "@langchain/community/tools/calculator";
import { SerpAPI } from "@langchain/community/tools/serpapi";
import { getModelBuilder } from "../helper/getModelBuilder";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import {
  createReactAgentAnnotation,
  ToolNode,
} from "@langchain/langgraph/prebuilt";
import {
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOllama } from "@langchain/ollama";
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

  // const tools = [new Calculator(), new SerpAPI(process.env.SERP_API_KEY)];
  const toolNode = new ToolNode(tools);

  const builder = await getModelBuilder(
    { type: "chat", provider: "ollama", model: "qwen3:4b" },
    {
      temperature: 0,
    }
  );

  const model = (await builder()) as ChatOllama;
  const modelWithTools = model.bindTools(tools);

  const agentCheckPoint = new MemorySaver();

  function shouldContinue({ messages }: typeof MessagesAnnotation.State) {
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (lastMessage.tool_calls?.length) {
      console.log("call tool");
      return "tools";
    }
    console.log("not call tool");

    return "__end__";
  }

  async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await modelWithTools.invoke(state.messages);
    return {
      messages: [response],
    };
  }
  const workflow = new StateGraph(createReactAgentAnnotation())
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const app = workflow.compile({
    checkpointer: agentCheckPoint,
  });

  const finalState = await app.invoke(
    {
      messages: [
        new HumanMessage(
          "现在是2025年5月10日，查一下美国现任总统是谁? 使用中文回答"
        ),
      ],
    },
    {
      configurable: { thread_id: "test1" },
    }
  );

  console.log(finalState.messages[finalState.messages.length - 1].content);

  const nextState = await app.invoke(
    {
      messages: [
        new HumanMessage("然后告诉我他最近有什么政策? 市场什么反馈? "),
      ],
    },
    {
      configurable: { thread_id: "test1" },
    }
  );

  console.log(nextState.messages[nextState.messages.length - 1].content);
}

main().catch(console.error);
