import { SNSClient } from "@aws-sdk/client-sns";

export function alertsTopic(): string | null {
  return process.env.THEVOTE_ALERTS_TOPIC_ARN?.trim() || null;
}

const clients = new Map<string, SNSClient>();

export function alertsClient(topic: string): SNSClient {
  const region = topic.split(":")[3];
  if (!region) throw new Error("Invalid SNS topic ARN");
  let client = clients.get(region);
  if (!client) {
    // SNS Standard has no idempotency token. Avoid SDK retries on ambiguous publishes.
    client = new SNSClient({ region, maxAttempts: 1 });
    clients.set(region, client);
  }
  return client;
}
