const DEFAULT_SITE_URL = "https://vidhigya.com";

function sanitizeSiteUrl(value?: string) {
  if (!value) {
    return DEFAULT_SITE_URL;
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const resolvedSiteUrl = sanitizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const seoConfig = {
  siteName: "Vidhigya",
  titleTemplate: "%s | Vidhigya",
  defaultTitle: "Vidhigya - Legal Practice Management Platform",
  description:
    "Vidhigya helps lawyers and law firms manage cases, clients, documents, billing, and hearing schedules from one secure platform.",
  siteUrl: resolvedSiteUrl,
  locale: "en_IN",
  keywords: [
    "legal practice management",
    "law firm software",
    "case management software",
    "legal billing software",
    "lawyer productivity tools",
    "legal document management",
    "court hearing calendar",
  ],
};

export function getCanonicalUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, seoConfig.siteUrl).toString();
}
