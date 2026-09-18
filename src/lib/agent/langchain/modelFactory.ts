import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { AIConnection } from "@/config/ai-models";

export interface ModelFactoryOptions {
  /** 采样温度，默认 0.2（面板没有该字段） */
  temperature?: number;
}

// AIConnection → LangChain ChatModel 工厂。
// 三种协议各映射到一个官方集成类；anthropic 的 baseUrl 做了 /v1 归一化。
export function createChatModel(
  connection: AIConnection,
  options: ModelFactoryOptions = {}
): BaseChatModel {
  const temperature = options.temperature ?? 0.2;

  if (connection.protocol === "anthropic") {
    // ChatAnthropic 内部会拼 /v1/messages；面板默认存 https://api.anthropic.com/v1，
    // 原样传入会拼成 /v1/v1/messages。DeepSeek 的 /anthropic 路径不在此列。
    const baseUrl = connection.baseUrl.replace(/\/v1\/?$/, "");
    return new ChatAnthropic({
      model: connection.model,
      apiKey: connection.apiKey,
      anthropicApiUrl: baseUrl,
      temperature,
    });
  }

  if (connection.protocol === "gemini") {
    return new ChatGoogleGenerativeAI({
      model: connection.model,
      apiKey: connection.apiKey,
      temperature,
      // 部分 Gemini 模型不接受 system 消息，交给 LangChain 转成 human 内容
      convertSystemMessageToHumanContent: true,
    });
  }

  // chat-completions：OpenAI 兼容端点全覆盖（OpenAI / DeepSeek / 通义 / 智谱 / MiniMax / Gemini 兼容端点）
  return new ChatOpenAI({
    model: connection.model,
    apiKey: connection.apiKey,
    temperature,
    configuration: { baseURL: connection.baseUrl },
  });
}
