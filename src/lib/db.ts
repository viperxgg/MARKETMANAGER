import { PrismaClient } from "@prisma/client";

export type DatabaseStatus = {
  state: "connected" | "missing_database_url" | "connection_error";
  label: string;
  message: string;
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Keep production logs quiet so connection strings and provider details are never echoed.
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : []
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Strict guard for code paths that REQUIRE a working database (audit log writes,
 * approval gate checks, workflow persistence). Throws a clear error rather than
 * degrading to preview mode.
 *
 * Use sparingly — most code should call `hasDatabaseUrl()` and degrade gracefully.
 */
export function assertDatabaseUrl(): void {
  if (!hasDatabaseUrl()) {
    throw new Error(
      "DATABASE_URL is required for this operation but is missing or empty. " +
        "Add it to your .env file (and to Vercel Project Settings → Environment Variables)."
    );
  }
}

export const manualMode = true;

export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!hasDatabaseUrl()) {
    return {
      state: "missing_database_url",
      label: "DATABASE_URL غير موجود",
      message:
        "لم يتم ضبط DATABASE_URL. تبقى اللوحة في وضع المعاينة ولا يتم حفظ الإجراءات."
    };
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      state: "connected",
      label: "متصل",
      message:
        "PostgreSQL متاح. يمكن حفظ المسودات والحملات وإدخالات التتبع والذاكرة."
    };
  } catch {
    return {
      state: "connection_error",
      label: "خطأ اتصال",
      message:
        "DATABASE_URL موجود لكن تعذر الوصول إلى PostgreSQL. يبقى وضع المعاينة آمنًا؛ تحقق من رابط الاتصال وتوفر قاعدة البيانات."
    };
  }
}
