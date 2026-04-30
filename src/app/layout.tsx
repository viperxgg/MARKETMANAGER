import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const arabicFont = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "نظام وكالة التسويق بالذكاء الاصطناعي",
  description: "لوحة تشغيل يومية لحملات التسويق الذكية في السوق السويدي."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={arabicFont.className}>{children}</body>
    </html>
  );
}
