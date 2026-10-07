import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { allow: "/", disallow: "/api/", userAgent: "*" },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).href,
  };
}
