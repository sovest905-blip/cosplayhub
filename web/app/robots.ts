import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
          rules: {
                  userAgent: "*",
                  allow: "/",
                  disallow: ["/cabinet", "/admin-panel", "/messages", "/notifications", "/feed"],
          },
          sitemap: "https://www.cosplayhub.kz/sitemap.xml",
    };
}
