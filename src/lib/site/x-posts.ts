export const X_BEARER_ENV = "X_BEARER_TOKEN";

export type XPost = {
  id: string;
  text: string;
  handle: string;
  name: string;
  createdAt: string;
  url: string;
};

/**
 * Recent posts from official X accounts. Returns null when X_BEARER_TOKEN is
 * unset so the home page hides the section. No handles are stored yet, so a
 * configured token still returns an empty list rather than guessed posts.
 */
export async function recentKentuckyPosts(): Promise<XPost[] | null> {
  const token = process.env[X_BEARER_ENV]?.trim();
  if (!token) return null;
  return [];
}
