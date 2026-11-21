"use server";

import { redirect } from "next/navigation";
import { endSession } from "./session";

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
