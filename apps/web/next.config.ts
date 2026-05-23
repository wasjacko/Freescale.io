import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  async redirects() {
    return [
      // Legacy auth slugs
      { source: "/login", destination: "/sign-in", permanent: true },
      { source: "/signup", destination: "/sign-up", permanent: true },
      { source: "/onboarding", destination: "/sign-up", permanent: true },

      // Force the canonical domain. Anyone landing on the auto-generated
      // Vercel preview/staging host (freescale-io.vercel.app) gets 308'd
      // to the production domain (freescale.site). Critical for OAuth:
      // signInWithOAuth's redirectTo must match the host the request
      // came from, and every flow should go through freescale.site.
      {
        source: "/:path*",
        has: [{ type: "host", value: "freescale-io.vercel.app" }],
        destination: "https://freescale.site/:path*",
        permanent: true,
      },
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
      { protocol: "https", hostname: "icon.horse" },
    ],
  },
};

export default config;
