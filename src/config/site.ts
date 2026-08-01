export const siteConfig = {
  name: "IsRainy",
  tagline: "Is it raining outside?",
  description:
    "Instantly know whether it's raining outside — one clear answer, one smart insight, nothing else.",
  url: "https://is-rainy.vercel.app",
  locale: "en",
} as const;

export type SiteConfig = typeof siteConfig;
