import process from "process";
import { extend, cond, matches } from "lodash";
import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import {
  ChatOpenAICallOptions,
  OpenAI,
  OpenAICallOptions,
} from "@langchain/openai";
import { ChatOpenAI } from "@langchain/openai";
import { Ollama } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { ChatDeepSeek } from "@langchain/deepseek";
import { OpenAIEmbeddings } from "@langchain/openai";
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

export async function getModelBuilder(
  spec: {
    type?: "llm" | "chat" | "embedding";
    provider?: "openai" | "huggingface" | "ollama" | "chat-ollama" | "deepseek";
    model?: string;
  } = { type: "llm", provider: "openai" },
  options?: any
) {

  console.log(process.env.LANGSMITH_API_KEY, 'process.env.LANGSMITH_API_KEY')
  // Set up LangSmith tracer
  const client = new Client({
    apiUrl: "https://api.smith.langchain.com",
    apiKey: process.env.LANGSMITH_API_KEY,
  });

  const tracer = new LangChainTracer({ client });
  const callbacks = options?.verbose !== false ? [tracer] : [];

  // Set up API key for each providers
  const args = extend({ 
    callbacks,
    streaming: true  // 启用流式输出
  }, options);
  
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
  }

  // Populate model builders
  const setup = cond<
    typeof spec,
    | Promise<OpenAI<OpenAICallOptions>>
    | Promise<ChatOpenAI<ChatOpenAICallOptions>>
    | Promise<Ollama>
    | Promise<ChatOllama>
    | Promise<ChatDeepSeek>
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
