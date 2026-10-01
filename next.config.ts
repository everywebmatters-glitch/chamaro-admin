import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export to out/ (admin.chamaro.com); all data comes from the Fastify API in the browser
  output: "export",
  // Emit products/index.html instead of products.html so Apache serves /products/
  trailingSlash: true,
  // The default image loader needs a Node server
  images: { unoptimized: true },
};

export default nextConfig;
