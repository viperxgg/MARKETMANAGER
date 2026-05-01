import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Icons } from "./icons";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/sign-in" });
}

const navItems = [
  { href: "/", label: "مركز القيادة", icon: Icons.analytics },
  { href: "/agency-brain", label: "عقل الوكالة", icon: Icons.brain },
  { href: "/products", label: "المنتجات", icon: Icons.sparkles },
  { href: "/campaigns", label: "الحملات", icon: Icons.briefcase },
  { href: "/leads", label: "العملاء المحتملون", icon: Icons.target },
  { href: "/lead-research", label: "بحث العملاء", icon: Icons.search },
  { href: "/website-analysis", label: "تحليل المواقع", icon: Icons.clipboard },
  { href: "/outreach-studio", label: "استوديو التواصل", icon: Icons.mail },
  { href: "/social-studio", label: "استوديو المحتوى", icon: Icons.megaphone },
  { href: "/approval-center", label: "مركز الموافقات", icon: Icons.approval },
  { href: "/workflows", label: "سير العمل", icon: Icons.experiments },
  { href: "/manual-tracking", label: "التتبع اليدوي", icon: Icons.check },
  { href: "/experiments", label: "التجارب", icon: Icons.experiments },
  { href: "/agency-memory", label: "ذاكرة الوكالة", icon: Icons.brain },
  { href: "/reports", label: "التقارير", icon: Icons.file },
  { href: "/admin/integrations", label: "حالة التكاملات", icon: Icons.settings },
  { href: "/settings", label: "الإعدادات", icon: Icons.settings }
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const operatorEmail = session?.user?.email ?? "";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">وكالة التسويق بالذكاء الاصطناعي</div>
          <div className="brand-subtitle">تشغيل يومي للسوق السويدي</div>
        </div>

        <nav className="nav-list" aria-label="تنقل لوحة التحكم">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link className="nav-link" href={item.href} key={item.href}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {operatorEmail && (
          <form action={signOutAction} className="sidebar-footer">
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.5rem" }}>
              {operatorEmail}
            </div>
            <button className="button secondary" type="submit" style={{ width: "100%" }}>
              تسجيل الخروج
            </button>
          </form>
        )}
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
