import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: true },
      { source: "/signup", destination: "/sign-up", permanent: true },
      { source: "/onboarding", destination: "/sign-up", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.pravatar.cc" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "t0.gstatic.com" },
      { protocol: "https", hostname: "t1.gstatic.com" },
      { protocol: "https", hostname: "t2.gstatic.com" },
      { protocol: "https", hostname: "t3.gstatic.com" },
      { protocol: "https", hostname: "icons.duckduckgo.com" },
    ],
  },
};

export default config;
