import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

async function signInWithCredentials(formData: FormData) {
  "use server";
  // Auth.js v5 reads `redirectTo` straight from FormData when present.
  await signIn("credentials", formData);
}

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callback = params.callbackUrl ?? "/";
  const hasError = Boolean(params.error);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem"
      }}
    >
      <section
        className="panel"
        style={{
          maxWidth: 420,
          width: "100%",
          padding: "2.5rem",
          textAlign: "center"
        }}
      >
        <div className="eyebrow">نظام تشغيل وكالة Smart Art AI</div>
        <h1 className="page-title" style={{ marginTop: "0.5rem" }}>
          تسجيل الدخول
        </h1>
        <p className="muted" style={{ marginBottom: "2rem" }}>
          هذه لوحة تشغيل خاصة بمالك واحد. أدخل اسم المستخدم وكلمة السر.
        </p>

        {hasError && (
          <div className="notice warning" style={{ marginBottom: "1.5rem" }}>
            بيانات الدخول غير صحيحة. حاول مجددًا.
          </div>
        )}

        <form action={signInWithCredentials} className="stack" style={{ textAlign: "right" }}>
          <input type="hidden" name="redirectTo" value={callback} />
          <div className="field">
            <label>اسم المستخدم</label>
            <input
              name="username"
              type="text"
              required
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="field">
            <label>كلمة السر</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <button
            className="button"
            type="submit"
            style={{ width: "100%", justifyContent: "center" }}
          >
            دخول
          </button>
        </form>

        <p className="muted" style={{ marginTop: "2rem", fontSize: "0.85rem" }}>
          محمي بالموافقة اليدوية. لا يتم تنفيذ أي إجراء خارجي تلقائيًا.
        </p>
      </section>
    </main>
  );
}
