import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ALERT_CATEGORIES,
  ALERT_DELIVERY_STATUS,
  type AlertCategory,
  type AlertDelivery,
  type AlertPreferences,
  type Follow,
  type FollowType,
  followSortKey,
  userPartition,
} from "./alerts";

export const DEFAULT_USERS_TABLE = "candate-voter-users";

export type UserProfile = AlertPreferences & {
  userId: string;
  email: string;
};

export function usersTableName(env: Record<string, string | undefined> = process.env): string {
  return env.CANDATE_USERS_TABLE?.trim() || DEFAULT_USERS_TABLE;
}

export function defaultPreferences(): AlertPreferences {
  return {
    categories: ["filings"],
    delivery: "daily",
    quietStart: null,
    quietEnd: null,
    deliveryStatus: ALERT_DELIVERY_STATUS,
  };
}

let cached: DynamoDBDocumentClient | null = null;

function client(): DynamoDBDocumentClient {
  if (cached) return cached;
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  cached = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return cached;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const result = await client().send(
    new GetCommand({
      TableName: usersTableName(),
      Key: { pk: userPartition(userId), sk: "PROFILE" },
    }),
  );
  const item = result.Item;
  if (!item || typeof item.email !== "string") return null;
  return profileFromItem(userId, item);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await client().send(
    new PutCommand({
      TableName: usersTableName(),
      Item: {
        pk: userPartition(profile.userId),
        sk: "PROFILE",
        email: profile.email,
        categories: profile.categories,
        delivery: profile.delivery,
        quietStart: profile.quietStart,
        quietEnd: profile.quietEnd,
        deliveryStatus: ALERT_DELIVERY_STATUS,
      },
    }),
  );
}

export async function listFollows(userId: string): Promise<Follow[]> {
  const result = await client().send(
    new QueryCommand({
      TableName: usersTableName(),
      KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :prefix)",
      ExpressionAttributeNames: { "#pk": "pk", "#sk": "sk" },
      ExpressionAttributeValues: { ":pk": userPartition(userId), ":prefix": "FOLLOW#" },
    }),
  );
  return (result.Items ?? []).flatMap((item) => {
    if (
      item.targetType !== "race" &&
      item.targetType !== "candidate" &&
      item.targetType !== "jurisdiction" &&
      item.targetType !== "measure" &&
      item.targetType !== "issue"
    ) {
      return [];
    }
    if (typeof item.targetId !== "string" || typeof item.createdAt !== "string") return [];
    return [
      {
        userId,
        targetType: item.targetType,
        targetId: item.targetId,
        createdAt: item.createdAt,
      },
    ];
  });
}

export async function saveFollow(follow: Follow): Promise<void> {
  await client().send(
    new PutCommand({
      TableName: usersTableName(),
      Item: {
        pk: userPartition(follow.userId),
        sk: followSortKey(follow.targetType, follow.targetId),
        targetType: follow.targetType,
        targetId: follow.targetId,
        createdAt: follow.createdAt,
      },
    }),
  );
}

export async function deleteFollow(userId: string, type: FollowType, id: string): Promise<void> {
  await client().send(
    new DeleteCommand({
      TableName: usersTableName(),
      Key: { pk: userPartition(userId), sk: followSortKey(type, id) },
    }),
  );
}

function profileFromItem(userId: string, item: Record<string, unknown>): UserProfile {
  const allowed = new Set<string>(ALERT_CATEGORIES);
  const categories = Array.isArray(item.categories)
    ? item.categories.filter((value): value is AlertCategory => typeof value === "string" && allowed.has(value))
    : [];
  const delivery: AlertDelivery =
    item.delivery === "immediate" || item.delivery === "weekly" ? item.delivery : "daily";
  return {
    userId,
    email: String(item.email),
    categories: categories.length > 0 ? categories : ["filings"],
    delivery,
    quietStart: typeof item.quietStart === "string" ? item.quietStart : null,
    quietEnd: typeof item.quietEnd === "string" ? item.quietEnd : null,
    deliveryStatus: ALERT_DELIVERY_STATUS,
  };
}

export type NewsFeed = {
  states: string[];
  categories: string[];
};

export function emptyNewsFeed(): NewsFeed {
  return { states: [], categories: [] };
}

export async function getNewsFeed(userId: string): Promise<NewsFeed> {
  const result = await client().send(
    new GetCommand({
      TableName: usersTableName(),
      Key: { pk: userPartition(userId), sk: "FEED" },
    }),
  );
  return newsFeedFromItem(result.Item ?? null);
}

export async function saveNewsFeed(userId: string, feed: NewsFeed): Promise<void> {
  await client().send(
    new PutCommand({
      TableName: usersTableName(),
      Item: {
        pk: userPartition(userId),
        sk: "FEED",
        states: feed.states,
        categories: feed.categories,
      },
    }),
  );
}

function newsFeedFromItem(item: Record<string, unknown> | null): NewsFeed {
  if (!item) return emptyNewsFeed();
  const states = Array.isArray(item.states)
    ? item.states.filter((value): value is string => typeof value === "string" && /^[A-Z]{2}$/.test(value))
    : [];
  const categories = Array.isArray(item.categories)
    ? item.categories.filter((value): value is string => typeof value === "string" && value.length > 0 && value.length < 80)
    : [];
  return { states, categories };
}
