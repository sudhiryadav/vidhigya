import type { Metadata } from "next";
import { getCanonicalUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your Vidhigya account to start managing legal operations.",
  alternates: {
    canonical: getCanonicalUrl("/register"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
