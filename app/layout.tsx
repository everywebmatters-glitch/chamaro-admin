import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminShell } from "@/components/layout/AdminShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chamaro Admin",
  description: "Admin panel for managing the Chamaro e-commerce platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
