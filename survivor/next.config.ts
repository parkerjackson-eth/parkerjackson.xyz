import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Castaway photos are supplied as URLs by the site owner, so allow any
    // https host. Swap this for a specific hostname list if you self-host them.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
