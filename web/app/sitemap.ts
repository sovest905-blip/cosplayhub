import type { MetadataRoute } from "next";

const BASE_URL = "https://www.cosplayhub.kz";

const STATIC_ROUTES = [
  "",
  "/people",
  "/photographers",
  "/looks",
  "/teams",
  "/shoots",
  "/battles",
  "/workshops",
  "/shops",
  "/jobs",
  "/locations",
  "/rent",
  "/news",
  "/events",
  "/guides",
  "/market",
  "/pro",
  "/legal/terms",
  "/legal/privacy",
  "/legal/offer",
  "/legal/rules",
  "/legal/cookies",
  ];

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
