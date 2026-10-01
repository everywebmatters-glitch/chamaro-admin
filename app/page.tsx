import { redirect } from "next/navigation";

// The dashboard lives at /dashboard; AuthProvider sends visitors without a session on to /login.
export default function RootPage() {
  redirect("/dashboard");
}
