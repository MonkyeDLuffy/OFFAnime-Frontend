import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Only documented image hosts are allowed through the optimizer.
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/file/anilistcdn/**" },
      { protocol: "https", hostname: "artworks.thetvdb.com", pathname: "/banners/**" },
    ],
  },
};

export default nextConfig;
