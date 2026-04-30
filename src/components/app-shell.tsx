import Link from "next/link";
import { Icons } from "./icons";

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
  { href: "/manual-tracking", label: "التتبع اليدوي", icon: Icons.check },
  { href: "/experiments", label: "التجارب", icon: Icons.experiments },
  { href: "/agency-memory", label: "ذاكرة الوكالة", icon: Icons.brain },
  { href: "/reports", label: "التقارير", icon: Icons.file },
  { href: "/settings", label: "الإعدادات", icon: Icons.settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
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
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
