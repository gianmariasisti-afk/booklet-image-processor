import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: string;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: any;
  tool_choice?: any;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

function toAnthropicContent(
  content: MessageContent | MessageContent[]
): Anthropic.ContentBlockParam[] {
  const parts = Array.isArray(content) ? content : [content];
  const result: Anthropic.ContentBlockParam[] = [];

  for (const part of parts) {
    if (typeof part === "string") {
      result.push({ type: "text", text: part });
    } else if (part.type === "text") {
      result.push({ type: "text", text: part.text });
    } else if (part.type === "image_url") {
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const [header, data] = url.split(",");
        const mediaType = header.split(":")[1].split(";")[0] as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp";
        result.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data },
        });
      } else {
        result.push({
          type: "image",
          source: { type: "url", url },
        });
      }
    }
  }

  return result;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });

  const systemMessages = params.messages.filter((m) => m.role === "system");
  const userMessages = params.messages.filter((m) => m.role !== "system");

  const system = systemMessages
    .map((m) => (typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((c) => (typeof c === "string" ? c : (c as TextContent).text || "")).join("\n") : ""))
    .join("\n");

  const messages: Anthropic.MessageParam[] = userMessages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: toAnthropicContent(m.content),
  }));

  const maxTokens = params.maxTokens || params.max_tokens || 4096;

  let responseFormat = params.responseFormat || params.response_format;
  const outputSchema = params.outputSchema || params.output_schema;
  if (!responseFormat && outputSchema) {
    responseFormat = { type: "json_schema", json_schema: { name: outputSchema.name, schema: outputSchema.schema } };
  }

  const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: "claude-haiku-4-5",
    max_tokens: maxTokens,
    messages,
    ...(system ? { system } : {}),
  };

  if (responseFormat?.type === "json_schema" || responseFormat?.type === "json_object") {
    const schemaName = responseFormat.type === "json_schema" ? (responseFormat as any).json_schema?.name : "response";
    const schemaDefinition = responseFormat.type === "json_schema" ? (responseFormat as any).json_schema?.schema : undefined;

    requestParams.tools = [
      {
        name: schemaName || "structured_output",
        description: "Return structured JSON output",
        input_schema: schemaDefinition || { type: "object" as const },
      },
    ];
    requestParams.tool_choice = { type: "tool", name: schemaName || "structured_output" };
  }

  const response = await client.messages.create(requestParams);

  let textContent = "";
  const toolCalls: ToolCall[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id: block.id,
        type: "function",
        function: {
          name: block.name,
          arguments: typeof block.input === "string" ? block.input : JSON.stringify(block.input),
        },
      });
      if (!textContent) {
        textContent = typeof block.input === "string" ? block.input : JSON.stringify(block.input);
      }
    }
  }

  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent,
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: response.stop_reason,
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
