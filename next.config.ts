import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "sharp"],
  poweredByHeader: false,
};

export default nextConfig;
