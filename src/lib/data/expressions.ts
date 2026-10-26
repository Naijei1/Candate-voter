/**
 * Build an UpdateItem SET expression that aliases every attribute name.
 * DynamoDB reserves words we store (`state` in particular).
 * `createdAt` is set only when the item is first written.
 */
export function buildSetExpression(attributes: Record<string, unknown>): {
  UpdateExpression: string;
  ExpressionAttributeNames: Record<string, string>;
  ExpressionAttributeValues: Record<string, unknown>;
} {
  const names: Record<string, string> = { "#createdAt": "createdAt" };
  const values: Record<string, unknown> = {};
  const sets: string[] = [];

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "createdAt") {
      throw new Error("createdAt is managed by the update expression");
    }
    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    names[nameKey] = key;
    values[valueKey] = value;
    sets.push(`${nameKey} = ${valueKey}`);
  }

  if (typeof values[":updatedAt"] !== "string" || values[":updatedAt"].length === 0) {
    throw new Error("updatedAt is required on every upsert");
  }

  sets.push("#createdAt = if_not_exists(#createdAt, :updatedAt)");

  return {
    UpdateExpression: `SET ${sets.join(", ")}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}
