import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your Vidhigya account.",
  alternates: {
    canonical: getCanonicalUrl("/reset-password"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
