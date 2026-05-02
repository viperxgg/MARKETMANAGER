/**
 * Inline feedback primitives — server-component-friendly.
 *
 * Use these to show action outcomes next to the action itself, without
 * routing through the URL `?notice=` query param. Designed to compose with
 * existing globals.css `.notice` / `.notice.warning` / `.notice.error`.
 *
 * Example:
 *   <ActionFeedback state={lastAction?.state} message={lastAction?.message} />
 *
 * The components render nothing when state is undefined, so they are safe to
 * place inside any page without conditional wrapping.
 */

export type FeedbackState = "success" | "warning" | "error" | "info";

export type ActionFeedbackProps = {
  state?: FeedbackState;
  message?: string;
  /** Optional remediation hint shown on a second line. */
  hint?: string;
};

const noticeClassFor = (state: FeedbackState): string => {
  if (state === "success") return "notice";
  if (state === "warning") return "notice warning";
  if (state === "error") return "notice error";
  return "notice";
};

const labelFor = (state: FeedbackState): string => {
  if (state === "success") return "تم";
  if (state === "warning") return "تنبيه";
  if (state === "error") return "خطأ";
  return "ملاحظة";
};

export function ActionFeedback({ state, message, hint }: ActionFeedbackProps) {
  if (!state || !message) return null;
  return (
    <div className={noticeClassFor(state)} role={state === "error" ? "alert" : "status"}>
      <strong style={{ marginInlineEnd: 6 }}>{labelFor(state)}:</strong>
      <span>{message}</span>
      {hint ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Skeleton row — drop into a list while server data is loading.
 * Server components don't actually render a loading state during data
 * fetching (Next.js streams), so this is mainly used by suspense
 * boundaries and client-side optimistic UIs.
 */
export function SkeletonRow({ height = 56 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        height,
        opacity: 0.6
      }}
    />
  );
}

export function EmptyState({
  title,
  hint,
  cta
}: {
  title: string;
  hint?: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div
      className="panel subtle"
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: 28,
        textAlign: "center"
      }}
    >
      <div style={{ fontWeight: 700 }}>{title}</div>
      {hint ? (
        <div className="muted" style={{ fontSize: 13, maxWidth: 360 }}>
          {hint}
        </div>
      ) : null}
      {cta ? (
        <a className="button" href={cta.href} style={{ marginTop: 8 }}>
          {cta.label}
        </a>
      ) : null}
    </div>
  );
}
