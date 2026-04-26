import type { MetadataRoute } from "next";
import { getCanonicalUrl } from "@/lib/seo";

const publicRoutes = ["/", "/login", "/register", "/forgot-password", "/reset-password"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: getCanonicalUrl(route),
    lastModified: now,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.6,
  }));
}
