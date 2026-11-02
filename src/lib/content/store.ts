import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { tableNameFromEnv } from "../data/repository";
import { checkPartition, type RecordCheck } from "./checks";
import { COPY_FIELDS, copyFromItem, emptySiteCopy, type SiteCopy } from "./copy";

export const CONTENT_PK = "CONTENT#site";
export const CONTENT_SK = "META";

let cached: DynamoDBDocumentClient | null = null;

function client(): DynamoDBDocumentClient {
  if (cached) return cached;
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  cached = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return cached;
}

export async function getSiteCopy(): Promise<SiteCopy> {
  const result = await client().send(
    new GetCommand({
      TableName: tableNameFromEnv(),
      Key: { pk: CONTENT_PK, sk: CONTENT_SK },
    }),
  );
  return copyFromItem(result.Item ?? null);
}

export async function saveSiteCopy(copy: SiteCopy): Promise<void> {
  const item: Record<string, unknown> = {
    pk: CONTENT_PK,
    sk: CONTENT_SK,
    entityType: "site-copy",
    updatedAt: copy.updatedAt,
    updatedBy: copy.updatedBy,
    logoKey: copy.logoKey,
    heroKey: copy.heroKey,
    founderKey: copy.founderKey,
  };
  for (const field of COPY_FIELDS) item[field] = copy[field];
  await client().send(new PutCommand({ TableName: tableNameFromEnv(), Item: item }));
}

export async function loadSiteCopy(): Promise<SiteCopy> {
  try {
    return await getSiteCopy();
  } catch (error) {
    console.error("site copy read failed:", error instanceof Error ? error.name : "Error");
    return emptySiteCopy();
  }
}

export async function addCheck(check: RecordCheck): Promise<void> {
  await client().send(
    new PutCommand({
      TableName: tableNameFromEnv(),
      Item: {
        pk: checkPartition(check.targetType, check.targetId),
        sk: check.checkedAt,
        entityType: "record-check",
        targetType: check.targetType,
        targetId: check.targetId,
        checkedAt: check.checkedAt,
        note: check.note,
        by: check.by,
      },
    }),
  );
}

export async function listChecks(targetType: RecordCheck["targetType"], targetId: string): Promise<RecordCheck[]> {
  const result = await client().send(
    new QueryCommand({
      TableName: tableNameFromEnv(),
      KeyConditionExpression: "#pk = :pk",
      ExpressionAttributeNames: { "#pk": "pk" },
      ExpressionAttributeValues: { ":pk": checkPartition(targetType, targetId) },
      ScanIndexForward: false,
      Limit: 20,
    }),
  );
  return (result.Items ?? []).flatMap((item) => {
    if (typeof item.checkedAt !== "string" || typeof item.by !== "string") return [];
    return [
      {
        targetType,
        targetId,
        checkedAt: item.checkedAt,
        note: typeof item.note === "string" ? item.note : null,
        by: item.by,
      },
    ];
  });
}

export async function loadChecks(
  targetType: RecordCheck["targetType"],
  targetId: string,
): Promise<RecordCheck[]> {
  try {
    return await listChecks(targetType, targetId);
  } catch (error) {
    console.error("check read failed:", error instanceof Error ? error.name : "Error");
    return [];
  }
}
