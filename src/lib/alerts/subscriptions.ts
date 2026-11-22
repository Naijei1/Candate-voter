import { randomUUID } from "node:crypto";
import { GetSubscriptionAttributesCommand, SetSubscriptionAttributesCommand, SubscribeCommand, UnsubscribeCommand } from "@aws-sdk/client-sns";
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { VerifiedUser } from "../auth/cognito";
import { userPartition } from "../users/follows";
import { listFollows, usersClient, usersTableName } from "../users/store";
import { followFilter, MUTED_FILTER } from "./filter";
import { alertsClient, alertsTopic } from "./sns";

const CANCELED = "ALERTS#CANCELED";
const FILTERS = "ALERTS#FILTERS";
const recordKey = (sub: string) => ({ pk: userPartition(sub), sk: "EMAIL_ALERTS" });

export async function withAlertLock<T>(sub: string, action: () => Promise<T>): Promise<T> {
  if (!alertsTopic()) return action();
  const key = { pk: userPartition(sub), sk: "ALERT_LOCK" };
  const owner = randomUUID();
  const now = Date.now();
  await usersClient().send(new PutCommand({
    TableName: usersTableName(), Item: { ...key, owner, lockedUntil: now + 120_000 },
    ConditionExpression: "attribute_not_exists(pk) OR lockedUntil < :now", ExpressionAttributeValues: { ":now": now },
  }));
  try {
    return await action();
  } finally {
    await usersClient().send(new DeleteCommand({
      TableName: usersTableName(), Key: key,
      ConditionExpression: "#owner = :owner", ExpressionAttributeNames: { "#owner": "owner" },
      ExpressionAttributeValues: { ":owner": owner },
    }));
  }
}

export async function getEmailSubscription(sub: string): Promise<string | null> {
  const result = await usersClient().send(new GetCommand({
    TableName: usersTableName(), Key: recordKey(sub), ConsistentRead: true,
  }));
  return typeof result.Item?.subscriptionArn === "string" ? result.Item.subscriptionArn : null;
}

async function attributes(topic: string, arn: string) {
  try {
    return (await alertsClient(topic).send(new GetSubscriptionAttributesCommand({ SubscriptionArn: arn }))).Attributes;
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundException") return undefined;
    throw error;
  }
}

async function setFilter(topic: string, arn: string, policy: string) {
  await alertsClient(topic).send(new SetSubscriptionAttributesCommand({
    SubscriptionArn: arn, AttributeName: "FilterPolicy", AttributeValue: policy,
  }));
}

export async function changeAlertFollows(sub: string, write: () => Promise<void>): Promise<void> {
  const topic = alertsTopic();
  if (!topic) return write();
  await withAlertLock(sub, async () => {
    const arn = await getEmailSubscription(sub);
    if (!arn?.startsWith(`${topic}:`)) return write();
    await usersClient().send(new PutCommand({
      TableName: usersTableName(), Item: { pk: FILTERS, sk: sub },
    }));
    await write();
    await syncEmailFilter(sub, topic, arn);
  });
}

async function syncEmailFilter(sub: string, topic: string, arn: string | null): Promise<void> {
  if (arn?.startsWith(`${topic}:`)) {
    const current = await attributes(topic, arn);
    if (current) {
      const policy = followFilter(await listFollows(sub));
      if (current.FilterPolicy !== policy) await setFilter(topic, arn, policy);
    } else {
      await usersClient().send(new DeleteCommand({ TableName: usersTableName(), Key: recordKey(sub) }));
    }
  }
  await usersClient().send(new DeleteCommand({ TableName: usersTableName(), Key: { pk: FILTERS, sk: sub } }));
}

export async function setEmailAlerts(user: VerifiedUser, enabled: boolean, topic: string): Promise<void> {
  await withAlertLock(user.sub, async () => {
    const existing = await getEmailSubscription(user.sub);
    const arn = existing?.startsWith(`${topic}:`) ? existing : null;
    const current = arn ? await attributes(topic, arn) : undefined;
    if (!enabled) {
      if (arn && current) {
        if (current.PendingConfirmation === "true") {
          // AWS won't delete a pending email subscription. Mute it before removing it from the account.
          await usersClient().send(new PutCommand({
            TableName: usersTableName(), Item: { pk: CANCELED, sk: arn, sub: user.sub },
          }));
          await setFilter(topic, arn, MUTED_FILTER);
        } else {
          await alertsClient(topic).send(new UnsubscribeCommand({ SubscriptionArn: arn }));
        }
      }
      await usersClient().send(new DeleteCommand({ TableName: usersTableName(), Key: recordKey(user.sub) }));
      return;
    }
    if (!user.emailVerified) throw new Error("A verified email is required");
    const policy = followFilter(await listFollows(user.sub));
    const result = arn && current ? { SubscriptionArn: arn } : await alertsClient(topic).send(new SubscribeCommand({
      TopicArn: topic, Protocol: "email", Endpoint: user.email, ReturnSubscriptionArn: true,
      Attributes: { FilterPolicy: policy, FilterPolicyScope: "MessageAttributes" },
    }));
    const subscriptionArn = result.SubscriptionArn;
    if (!subscriptionArn?.startsWith(`${topic}:`)) throw new Error("SNS did not return a subscription ARN");
    // SNS can return an existing ARN when the same address subscribes again.
    const canceledKey = { pk: CANCELED, sk: subscriptionArn };
    const canceled = await usersClient().send(new GetCommand({ TableName: usersTableName(), Key: canceledKey, ConsistentRead: true }));
    if (canceled.Item || (current && current.FilterPolicy !== policy)) await setFilter(topic, subscriptionArn, policy);
    await usersClient().send(new PutCommand({
      TableName: usersTableName(), Item: { ...recordKey(user.sub), subscriptionArn },
    }));
    if (canceled.Item) await usersClient().send(new DeleteCommand({ TableName: usersTableName(), Key: canceledKey }));
  });
}

export async function reconcileEmailSubscriptions(topic: string): Promise<void> {
  const results = await Promise.allSettled([
    forEachPending(FILTERS, async ({ sk: sub }) => {
      if (typeof sub !== "string") return;
      await withAlertLock(sub, async () => syncEmailFilter(sub, topic, await getEmailSubscription(sub)));
    }),
    forEachPending(CANCELED, async ({ sk: arn, sub }) => {
      if (typeof arn !== "string" || !arn.startsWith(`${topic}:`) || typeof sub !== "string") return;
      await withAlertLock(sub, async () => {
        if (await getEmailSubscription(sub) !== arn) {
          const current = await attributes(topic, arn);
          if (current?.PendingConfirmation === "true") return;
          if (current) await alertsClient(topic).send(new UnsubscribeCommand({ SubscriptionArn: arn }));
        }
        await usersClient().send(new DeleteCommand({ TableName: usersTableName(), Key: { pk: CANCELED, sk: arn } }));
      });
    }),
  ]);
  if (results.some((result) => result.status === "rejected")) throw new Error("Subscription reconciliation incomplete");
}

async function forEachPending(partition: string, handle: (item: Record<string, unknown>) => Promise<void>) {
  let cursor: Record<string, unknown> | undefined;
  let failed = false;
  do {
    const rows = await usersClient().send(new QueryCommand({
      TableName: usersTableName(), KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": partition },
      ExclusiveStartKey: cursor,
    }));
    for (const item of rows.Items ?? []) {
      try { await handle(item); } catch { failed = true; }
    }
    cursor = rows.LastEvaluatedKey;
  } while (cursor);
  if (failed) throw new Error("Pending subscriptions remain");
}
