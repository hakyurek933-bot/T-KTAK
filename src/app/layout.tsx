import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { BottomNav } from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taktik — Yerli kısa video & mesaj",
  description: "Taktik: kısa video paylaş, keşfet ve mesajlaş. Yerli TikTok.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-dvh flex-col overflow-hidden bg-ink text-foreground">
        <TopNav />
        <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        <BottomNav username={user?.username} />
      </body>
    </html>
  );
}
