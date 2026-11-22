import assert from "node:assert/strict";
import test from "node:test";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { changeFollow } from "../src/lib/users/follow-actions";
import { FOLLOW_LIMIT, followSortKey } from "../src/lib/users/follows";

test("the shared follow write enforces the race and candidate quota even with email alerts disabled", async (t) => {
  const topic = process.env.THEVOTE_ALERTS_TOPIC_ARN;
  delete process.env.THEVOTE_ALERTS_TOPIC_ARN;
  t.after(() => { if (topic !== undefined) process.env.THEVOTE_ALERTS_TOPIC_ARN = topic; });

  const userId = "follow-limit-user";
  const rows = new Map(Array.from({ length: FOLLOW_LIMIT - 1 }, (_, index) => {
    const targetType = index % 2 === 0 ? "race" : "candidate";
    const targetId = `target-${index}`;
    return [followSortKey(targetType, targetId), { targetType, targetId, createdAt: "2026-11-22T00:00:00Z" }];
  }));
  let locked = false;
  t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command: DeleteCommand | PutCommand | QueryCommand) => {
    if (command instanceof PutCommand && command.input.Item?.sk === "ALERT_LOCK") {
      assert.match(command.input.ConditionExpression ?? "", /attribute_not_exists/);
      if (locked) throw Object.assign(new Error("locked"), { name: "ConditionalCheckFailedException" });
      locked = true;
      return {};
    }
    assert.ok(locked);
    if (command instanceof QueryCommand) {
      assert.equal(command.input.ConsistentRead, true);
      return { Items: [...rows.values()] };
    }
    if (command instanceof PutCommand) rows.set(command.input.Item?.sk, command.input.Item as { targetType: string; targetId: string; createdAt: string });
    if (command instanceof DeleteCommand) {
      if (command.input.Key?.sk === "ALERT_LOCK") locked = false;
      else rows.delete(command.input.Key?.sk);
    }
    return {};
  });
  const save = (targetType: string, targetId: string) => changeFollow(userId, { targetType, targetId }, false);
  const first = save("candidate", "last-slot");
  await assert.rejects(save("race", "over-limit"), { name: "ConditionalCheckFailedException" });
  assert.equal(await first, "ok");
  assert.equal(await save("race", "over-limit"), "follow_limit");
  assert.equal(await save("candidate", "other-candidate"), "follow_limit");
  assert.equal(await save("candidate", "last-slot"), "ok");
  assert.equal(await save("jurisdiction", "KY"), "ok");
  assert.equal(await changeFollow(userId, { targetType: "candidate", targetId: "last-slot" }, true), "ok");
  assert.equal(await save("race", "over-limit"), "ok");
});
