import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Belt-and-suspenders helper.
 *
 * Middleware already blocks unauthenticated requests, but server actions are
 * POSTs that bypass page-level auth checks. Call this at the top of any
 * mutating server action — it asserts the session AND the email whitelist.
 *
 *   export async function deleteSomethingAction(formData: FormData) {
 *     await requireOwner();
 *     // ... rest of action
 *   }
 */
export async function requireOwner() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/sign-in");
  }
  return session;
}

export async function getOwnerEmail(): Promise<string> {
  const session = await auth();
  return session?.user?.email ?? "";
}
