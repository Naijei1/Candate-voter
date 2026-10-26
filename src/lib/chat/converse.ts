import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import type { DocumentType } from "@smithy/types";
import { CHAT_TOOL_SPECS } from "./tools";
import type { ChatContentBlock, ChatMessage, ConverseFn } from "./types";

const bedrockTools = CHAT_TOOL_SPECS.map((tool) => ({
  toolSpec: {
    name: tool.name,
    description: tool.description,
    inputSchema: { json: tool.inputSchema },
  },
})) as Tool[];

/**
 * Bedrock credentials come from the default provider chain (the Amplify
 * compute role in production). This function does not read an API key.
 */
export function createBedrockConverse(
  env: Record<string, string | undefined> = process.env,
): ConverseFn {
  const region =
    env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || "us-east-1";
  let client: BedrockRuntimeClient | null = null;

  return async (input) => {
    client ??= new BedrockRuntimeClient({ region, maxAttempts: 3 });
    const response = await client.send(
      new ConverseCommand({
        modelId: input.modelId,
        system: [{ text: input.system }],
        messages: input.messages.map(toSdkMessage),
        toolConfig: { tools: bedrockTools },
        inferenceConfig: { maxTokens: input.maxTokens, temperature: 0 },
      }),
    );
    const message = fromSdkMessage(response.output?.message);
    const stopReason = response.stopReason;
    return {
      stopReason:
        stopReason === "end_turn" ||
        stopReason === "tool_use" ||
        stopReason === "max_tokens"
          ? stopReason
          : "other",
      message,
      usage: {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
      },
    };
  };
}

function toSdkMessage(message: ChatMessage): Message {
  return {
    role: message.role,
    content: message.content.map(toSdkBlock),
  };
}

function toSdkBlock(block: ChatContentBlock): ContentBlock {
  if ("text" in block) return { text: block.text };
  if ("toolUse" in block) {
    return {
      toolUse: {
        toolUseId: block.toolUse.toolUseId,
        name: block.toolUse.name,
        input: asDocument(block.toolUse.input),
      },
    };
  }
  return {
    toolResult: {
      toolUseId: block.toolResult.toolUseId,
      status: block.toolResult.status,
      content: [{ json: block.toolResult.content as DocumentType }],
    },
  };
}

function fromSdkMessage(message: Message | undefined): ChatMessage {
  const content: ChatContentBlock[] = [];
  for (const block of message?.content ?? []) {
    if ("text" in block && typeof block.text === "string") {
      content.push({ text: block.text });
      continue;
    }
    if ("toolUse" in block && block.toolUse?.toolUseId && block.toolUse.name) {
      content.push({
        toolUse: {
          toolUseId: block.toolUse.toolUseId,
          name: block.toolUse.name,
          input: block.toolUse.input ?? {},
        },
      });
    }
  }
  return { role: "assistant", content };
}

function asDocument(value: unknown): DocumentType {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as DocumentType;
}

export function textOf(message: ChatMessage): string {
  return message.content
    .flatMap((block) => ("text" in block ? [block.text] : []))
    .join("\n")
    .trim();
}

export function toolUses(message: ChatMessage): Array<{
  toolUseId: string;
  name: string;
  input: unknown;
}> {
  return message.content.flatMap((block) =>
    "toolUse" in block ? [block.toolUse] : [],
  );
}
