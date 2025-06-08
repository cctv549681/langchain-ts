import * as process from "process";
import { extend, cond, matches } from "lodash";
import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import {
  ChatOpenAICallOptions,
  OpenAI,
  OpenAICallOptions,
} from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
import { Ollama } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { ChatDeepSeek } from "@langchain/deepseek";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export async function getModelBuilder(
  spec: {
    type?: "llm" | "chat" | "embedding";
    provider?:
      | "openai"
      | "huggingface"
      | "ollama"
      | "chat-ollama"
      | "deepseek"
      | "qwen";
    model?: string;
  } = { type: "llm", provider: "openai" },
  options?: any
) {
  console.log(process.env.LANGSMITH_API_KEY, "process.env.LANGSMITH_API_KEY");
  // Set up LangSmith tracer
  const client = new Client({
    apiUrl: "https://api.smith.langchain.com",
    apiKey: process.env.LANGSMITH_API_KEY,
  });

  const tracer = new LangChainTracer({ client });
  const callbacks = options?.verbose !== false ? [tracer] : [];

  // Set up API key for each providers
  const args = extend(
    {
      callbacks,
      streaming: true, // 启用流式输出
    },
    options
  );

  if (spec?.provider === "openai") {
    args.openAIApiKey = process.env.OPENAI_API_KEY;
  } else if (spec?.provider === "huggingface")
    args.apiKey = process.env.HUGGINGFACE_API_KEY;
  else if (spec?.provider === "ollama") {
    args.baseUrl = "http://localhost:11434";
    args.model = spec.model || "qwen3:4b";
  } else if (spec?.provider === "deepseek") {
    args.apiKey = process.env.DEEPSEEK_API_KEY;
    args.model = spec.model || "deepseek-chat";
  } else if (spec?.provider === "qwen") {
    console.log(process.env.QWEN_API_KEY, "process.env.QWEN_API_KEY");
    args.apiKey = process.env.QWEN_API_KEY;
    args.model = spec.model || "qwen-plus-latest";
  }

  // Populate model builders
  const setup = cond<
    typeof spec,
    | Promise<OpenAI<OpenAICallOptions>>
    | Promise<ChatOpenAI<ChatOpenAICallOptions>>
    | Promise<Ollama>
    | Promise<ChatOllama>
    | Promise<ChatDeepSeek>
    | Promise<ChatAlibabaTongyi>
  >([
    [
      matches({ type: "llm", provider: "openai" }),
      async () => new OpenAI(args),
    ],
    [
      matches({ type: "chat", provider: "openai" }),
      async () => new ChatOpenAI(args),
    ],
    [
      matches({ type: "llm", provider: "ollama" }),
      async () => new Ollama(args),
    ],
    [
      matches({ type: "chat", provider: "ollama" }),
      async () => new ChatOllama(args),
    ],
    [
      matches({ type: "chat", provider: "deepseek" }),
      async () => new ChatDeepSeek(args),
    ],
    [
      matches({ type: "chat", provider: "qwen" }),
      async () => {
        // const model = new ChatOpenAI({
        //   // 此处以qwen-plus为例，您可按需更换模型名称。模型列表：https://help.aliyun.com/zh/model-studio/getting-started/models
        //   ...args,
        //   // 开启reasoning模式的关键参数
        //   modelKwargs: {
        //     // 启用推理模式
        //     reasoning: true,
        //     // 或者使用 enable_reasoning 参数（根据具体API文档）
        //     enable_reasoning: true,
        //     // 设置推理深度（可选）
        //     reasoning_depth: "deep", // 可选值: "shallow", "medium", "deep"
        //     // 显示推理过程（可选）
        //     show_reasoning_process: true,
        //   },
        //   configuration: {
        //     baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        //   },
        // });
        const llm = new ChatAlibabaTongyi({
          ...args,
          // 使用支持reasoning的模型
          // 开启reasoning模式的参数
          alibabaApiKey: args.apiKey,
          modelKwargs: {
            reasoning: true,
            enable_reasoning: true,
            show_reasoning_process: true,
            reasoning_depth: "deep",
          },
          // 或者使用其他可能的参数名
          enableReasoning: true,
          // 显示推理过程
          showReasoningProcess: true,
          // 推理深度设置
          reasoningDepth: "deep", // "shallow", "medium", "deep"
          // 其他标准参数
          temperature: 0.7,
          maxTokens: 2000,
          topP: 0.8,
        });
        return llm;
      },
    ],
    // [
    //   matches({ type: "embedding", provider: "openai" }),
    //   async () => new OpenAIEmbeddings(args),
    // ],
    // [
    //   matches({ type: "llm", provider: "huggingface" }),
    //   async () => new HuggingFaceInference(args),
    // ],
    // [
    //   matches({ type: "embedding", provider: "huggingface" }),
    //   async () => new HuggingFaceInferenceEmbeddings(args),
    // ],
  ]);

  // Return function to prevent "Serialization Error"
  return () => setup(spec);
}
