import { randomUUID } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extensionForType, type MediaSlot } from "./media-rules";

export { MAX_MEDIA_BYTES, isBrandKey, parseMediaSlot } from "./media-rules";

export function mediaBucketName(env: Record<string, string | undefined> = process.env): string | null {
  const name = env.CANDATE_MEDIA_BUCKET?.trim() ?? "";
  return name || null;
}

export function brandObjectKey(slot: MediaSlot, contentType: string): string | null {
  const ext = extensionForType(contentType);
  if (!ext) return null;
  return `brand/${slot}/${randomUUID()}.${ext}`;
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
    client = new S3Client({ region });
  }
  return client;
}

export async function presignBrandUpload(input: {
  bucket: string;
  key: string;
  contentType: string;
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: input.bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  return getSignedUrl(s3(), command, { expiresIn: 120 });
}

export async function readBrandObject(bucket: string, key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  const result = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) return null;
  const bytes = await result.Body.transformToByteArray();
  return { body: bytes, contentType: result.ContentType ?? "application/octet-stream" };
}
