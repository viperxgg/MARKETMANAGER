import { signIn } from "@/auth";

export const dynamic = "force-dynamic";

async function signInWithGoogle(formData: FormData) {
  "use server";
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");
  await signIn("google", { redirectTo: callbackUrl });
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
          هذه لوحة تشغيل خاصة بمالك واحد فقط. الوصول مقيّد ببريد إلكتروني محدّد.
        </p>

        {hasError && (
          <div className="notice warning" style={{ marginBottom: "1.5rem" }}>
            تعذّر تسجيل الدخول. تأكد من استخدام البريد الإلكتروني المسموح به.
          </div>
        )}

        <form action={signInWithGoogle}>
          <input type="hidden" name="callbackUrl" value={callback} />
          <button
            className="button"
            type="submit"
            style={{ width: "100%", justifyContent: "center" }}
          >
            المتابعة باستخدام Google
          </button>
        </form>

        <p className="muted" style={{ marginTop: "2rem", fontSize: "0.85rem" }}>
          محمي بالموافقة اليدوية. لا يتم تنفيذ أي إجراء خارجي تلقائيًا.
        </p>
      </section>
    </main>
  );
}
