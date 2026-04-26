import { Inter } from "next/font/google";
import Script from "next/script";
import type { Metadata } from "next";
import "./globals.css";
import { seoConfig } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: seoConfig.defaultTitle,
    template: seoConfig.titleTemplate,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  applicationName: seoConfig.siteName,
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    type: "website",
    url: seoConfig.siteUrl,
    siteName: seoConfig.siteName,
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    locale: seoConfig.locale,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vidhigya legal practice management platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    images: ["/twitter-image"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" />
        {children}
      </body>
    </html>
  );
}
