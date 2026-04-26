import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a secure password reset link for your Vidhigya account.",
  alternates: {
    canonical: getCanonicalUrl("/forgot-password"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
