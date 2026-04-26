import type { MetadataRoute } from "next";
import { seoConfig } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/admin",
          "/cases",
          "/documents",
          "/tasks",
          "/billing",
          "/calendar",
          "/chat",
          "/reports",
          "/settings",
          "/profile",
          "/notifications",
          "/video-calls",
          "/video-call-room",
          "/practice",
          "/search",
          "/ecourts",
        ],
      },
    ],
    sitemap: `${seoConfig.siteUrl}/sitemap.xml`,
    host: seoConfig.siteUrl,
  };
}
