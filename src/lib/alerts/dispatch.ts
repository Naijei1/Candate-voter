import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PublishCommand } from "@aws-sdk/client-sns";
import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { timingSafeStringEqual } from "../api/auth";
import { PRODUCTION_ORIGIN } from "../api/public-origin";
import { cyclesFromEnv } from "../data/cycles";
import { createDynamoRepository, type VoterRepository } from "../data/repository";
import { loadPublicCandidates } from "../data/view";
import { usersClient, usersTableName } from "../users/store";
import { certifiedEvents, fecReportEvents, mergeEvents, parseSosFilings, sosEvents, SOS_HOUSE, SOS_SENATE, type AlertEvent } from "./events";
import { alertsClient } from "./sns";
import { reconcileEmailSubscriptions } from "./subscriptions";

const PARTITION = "ALERTS#EVENTS";
export const DISPATCH_HEADER = "x-thevote-alerts-secret";

export function canDispatch(request: Request, expected = process.env.THEVOTE_ALERTS_SECRET): boolean {
  const provided = request.headers.get(DISPATCH_HEADER);
  return Boolean(expected && provided && timingSafeStringEqual(provided, expected));
}

async function putOnce(sk: string, fields: object): Promise<boolean> {
  try {
    await usersClient().send(new PutCommand({
      TableName: usersTableName(), Item: { pk: PARTITION, sk, ...fields },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") return false;
    throw error;
  }
}

async function afterBaseline(source: string, events: AlertEvent[]): Promise<AlertEvent[]> {
  const sk = `BASELINE#${source}`;
  const result = await usersClient().send(new GetCommand({
    TableName: usersTableName(), Key: { pk: PARTITION, sk }, ConsistentRead: true,
  }));
  if (!result.Item) {
    if (await putOnce(sk, { ids: events.map(({ id }) => id), observedAt: new Date().toISOString() })) return [];
    return afterBaseline(source, events);
  }
  const existing = new Set<string>(result.Item.ids);
  return events.filter(({ id }) => !existing.has(id));
}

export async function sendNewEvents(events: AlertEvent[], claim: (event: AlertEvent) => Promise<boolean>, publish: (event: AlertEvent) => Promise<void>): Promise<number> {
  let published = 0;
  const pending = mergeEvents(events);
  // Email subscriptions have a 10-message-per-second delivery limit. Run serially.
  for (const event of pending) {
    if (!(await claim(event))) continue;
    await publish(event);
    published += 1;
  }
  return published;
}

async function publishEvent(topic: string, event: AlertEvent): Promise<void> {
  try {
    await alertsClient(topic).send(new PublishCommand({
      TopicArn: topic,
      Subject: [...event.subject.replace(/[\r\n\t]/g, " ")].slice(0, 99).join(""),
      Message: `${event.subject}\n\n${event.source}\n${new URL(event.page, PRODUCTION_ORIGIN).href}`,
      MessageAttributes: { follow: { DataType: "String.Array", StringValue: JSON.stringify(event.follow) } },
    }));
  } catch (error) {
    // An explicit client error did not publish. An ambiguous transport failure keeps its marker.
    const status = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status && status >= 400 && status < 500) {
      await usersClient().send(new DeleteCommand({
        TableName: usersTableName(), Key: { pk: PARTITION, sk: `EVENT#${event.id}` },
      }));
    }
    throw error;
  }
}

async function loadSos(url: string, baseline: string, repo: VoterRepository): Promise<AlertEvent[]> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(3500) });
  if (!response.ok) throw new Error(`SOS returned ${response.status}`);
  const filings = parseSosFilings(await response.text(), url);
  const detected = await afterBaseline(baseline, sosEvents(filings));
  if (!detected.length) return detected;
  const newIds = new Set(detected.map(({ id }) => id));
  const newRows = filings.filter(({ id }) => newIds.has(`sos:${id}`));
  const raceIds = [...new Set(newRows.map(({ raceId }) => raceId))];
  const roster = await Promise.all(raceIds.map((raceId) => loadPublicCandidates(repo, raceId)));
  return sosEvents(newRows, roster.flat());
}

async function loadCertified(): Promise<AlertEvent[] | null> {
  try {
    const file = await readFile(join(process.cwd(), "data", "ky-certified-results.json"), "utf8");
    return certifiedEvents(JSON.parse(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function dispatchAlerts(topic: string): Promise<{ published: number; failed: boolean; sources: { certified: "available" | "unavailable" } }> {
  const repo = createDynamoRepository();
  const [certified, ...otherSources] = await Promise.allSettled([
    loadCertified().then((events) => events === null ? null : afterBaseline("certified", events)),
    ...cyclesFromEnv().map(async (cycle) => afterBaseline(`fec:${cycle}`, fecReportEvents((await repo.listFinance(cycle)).direct))),
    loadSos(SOS_SENATE, "sos:senate", repo),
    loadSos(SOS_HOUSE, "sos:house", repo),
    reconcileEmailSubscriptions(topic).then(() => []),
  ]);
  let failed = false;
  const events = [certified, ...otherSources].flatMap((source) => {
    if (source.status === "fulfilled") return source.value ?? [];
    failed = true;
    console.error("alert source failed", source.reason instanceof Error ? source.reason.name : "Error");
    return [];
  });
  const published = await sendNewEvents(events, (event) => putOnce(`EVENT#${event.id}`, {
    claimedAt: new Date().toISOString(), sourceUrl: event.source,
  }), (event) => publishEvent(topic, event));
  const available = certified.status === "fulfilled" && certified.value !== null;
  return { published, failed, sources: { certified: available ? "available" : "unavailable" } };
}
