import type { Metadata } from "next";

// The emailed link carries its token in the URL fragment: never send this page's URL to another site.
export const metadata: Metadata = {
  title: "Reset password | Chamaro Admin",
  robots: { index: false },
  referrer: "no-referrer",
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
