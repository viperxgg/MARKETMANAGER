import Link from "next/link";
import { getDatabaseStatus } from "@/lib/db";
import { getEnvHealth } from "@/lib/env";
import { getIntegrationsOverview } from "@/lib/integrations";
import { isFacebookConfigured } from "@/lib/integrations/facebook/client";

/**
 * Live system-health bar. Pulls every status signal from canonical helpers —
 * never duplicates logic, never logs values.
 *
 * Two variants:
 *   - <SystemStatusBar />   compact pills row, designed for the AppShell topbar
 *   - <SystemStatusPanel /> full panel with remediation hints, for the home page
 *
 * Both are server components. They re-evaluate on every render
 * (`force-dynamic` is already set on the consuming pages), so the user always
 * sees current state without manual refresh.
 */

type Pill = {
  id: string;
  label: string;
  state: "ok" | "warn" | "error" | "off";
  detail: string;
  /** Optional remediation hint — never includes secret values. */
  hint?: string;
};

async function buildPills(): Promise<Pill[]> {
  const [overview, dbStatus, envHealth, fbConfigured] = await Promise.all([
    getIntegrationsOverview().catch(() => []),
    getDatabaseStatus().catch(() => ({
      state: "connection_error" as const,
      label: "DB error",
      message: "Could not reach Postgres."
    })),
    Promise.resolve(getEnvHealth()),
    Promise.resolve(isFacebookConfigured())
  ]);

  const find = (id: string) => overview.find((o) => o.id === id);
  const leads = find("leads");
  const email = find("email");
  const facebook = find("facebook");
  const openai = find("openai");

  // Map an integration overview row → pill state.
  const fromIntegration = (
    integration: typeof leads,
    label: string,
    fallbackHint: string
  ): Pill => {
    if (!integration) {
      return {
        id: label.toLowerCase(),
        label,
        state: "off",
        detail: "Not registered",
        hint: fallbackHint
      };
    }
    const { configured, enabled, detail, missingEnvVars } = integration.status;
    if (!configured) {
      return {
        id: integration.id,
        label,
        state: "error",
        detail: "Not configured",
        hint:
          missingEnvVars.length > 0
            ? `Missing: ${missingEnvVars.join(", ")}`
            : fallbackHint
      };
    }
    if (!enabled) {
      return {
        id: integration.id,
        label,
        state: "warn",
        detail: "Disabled by feature flag",
        hint: `Set ENABLE_${integration.id.toUpperCase()}=true to enable.`
      };
    }
    return {
      id: integration.id,
      label,
      state: "ok",
      detail
    };
  };

  return [
    {
      id: "db",
      label: "Database",
      state: dbStatus.state === "connected" ? "ok" : "error",
      detail: dbStatus.label,
      hint:
        dbStatus.state === "connected"
          ? undefined
          : "Set DATABASE_URL and DIRECT_URL in your environment."
    },
    {
      id: "auth",
      label: "Auth",
      state: envHealth.allRequiredPresent ? "ok" : "error",
      detail: envHealth.allRequiredPresent ? "Credentials auth" : "Missing required vars",
      hint: envHealth.allRequiredPresent
        ? undefined
        : `Missing: ${envHealth.required
            .filter((r) => !r.present)
            .map((r) => r.name)
            .join(", ")}`
    },
    fromIntegration(
      leads,
      "Leads (Google Places)",
      "Set LEAD_SEARCH_PROVIDER and LEAD_SEARCH_API_KEY."
    ),
    fromIntegration(email, "Email (Resend)", "Set RESEND_API_KEY and RESEND_FROM."),
    {
      id: "facebook",
      label: "Facebook (Meta)",
      state: facebook
        ? !facebook.status.configured
          ? "error"
          : !facebook.status.enabled
          ? "warn"
          : !fbConfigured
          ? "error"
          : "ok"
        : "off",
      detail: fbConfigured && facebook?.status.enabled
        ? "Configured"
        : "Not configured",
      hint:
        !fbConfigured
          ? "Set META_PAGE_ID and META_ACCESS_TOKEN."
          : facebook && !facebook.status.enabled
          ? "Set ENABLE_FACEBOOK=true."
          : undefined
    },
    fromIntegration(openai, "OpenAI", "Set OPENAI_API_KEY and OPENAI_MODEL.")
  ];
}

function pillClassFor(state: Pill["state"]): string {
  // Map to existing globals.css badge variants — no new CSS needed.
  if (state === "ok") return "badge";
  if (state === "warn") return "badge warning";
  if (state === "error") return "badge warning";
  return "badge warning";
}

function pillSymbolFor(state: Pill["state"]): string {
  if (state === "ok") return "●";
  if (state === "warn") return "◐";
  if (state === "error") return "○";
  return "·";
}

/**
 * Compact pill row — drops into the AppShell topbar. One line, no remediation
 * hints (those live on the full panel). Click any pill to open the
 * /admin/integrations page.
 */
export async function SystemStatusBar() {
  const pills = await buildPills();
  const allOk = pills.every((p) => p.state === "ok");

  return (
    <div
      className="system-status-bar"
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16
      }}
    >
      <Link
        href="/admin/integrations"
        className="muted"
        style={{ fontSize: 12, fontWeight: 700, textDecoration: "none" }}
        aria-label="فتح حالة التكاملات"
      >
        {allOk ? "النظام جاهز" : "حالة النظام"}
      </Link>
      {pills.map((p) => (
        <Link
          key={p.id}
          href="/admin/integrations"
          className={pillClassFor(p.state)}
          style={{ textDecoration: "none" }}
          title={`${p.label}: ${p.detail}${p.hint ? " — " + p.hint : ""}`}
        >
          <span aria-hidden="true" style={{ marginInlineEnd: 6 }}>
            {pillSymbolFor(p.state)}
          </span>
          {p.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Full status panel — designed for the home dashboard. Each row shows the
 * service, its current state, and (when something is wrong) the exact env
 * vars to set. Never displays values.
 */
export async function SystemStatusPanel() {
  const pills = await buildPills();
  const allOk = pills.every((p) => p.state === "ok");

  return (
    <section className="panel">
      <div className="split-row" style={{ marginBottom: 12 }}>
        <div>
          <div className="eyebrow">حالة المنظومة</div>
          <h2 className="section-title" style={{ margin: 0 }}>
            {allOk ? "كل التكاملات جاهزة" : "بعض التكاملات تحتاج إعداد"}
          </h2>
        </div>
        <Link className="button secondary compact" href="/admin/integrations">
          صفحة الإدارة
        </Link>
      </div>
      <div className="stack">
        {pills.map((p) => (
          <div className="split-row" key={p.id} style={{ alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.label}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {p.detail}
                {p.hint ? (
                  <>
                    {" — "}
                    <span className="warning-text">{p.hint}</span>
                  </>
                ) : null}
              </div>
            </div>
            <span className={pillClassFor(p.state)}>
              {p.state === "ok"
                ? "متّصل"
                : p.state === "warn"
                ? "معطّل"
                : p.state === "error"
                ? "غير مهيأ"
                : "غير مسجّل"}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
