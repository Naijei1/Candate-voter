"use server";

import { redirect } from "next/navigation";
import { clearIdCookie } from "./session";

export async function signOutAction(): Promise<void> {
  await clearIdCookie();
  redirect("/");
}
