import type { NextConfig } from "next";

const deploymentId = process.env.NEXT_DEPLOYMENT_ID || process.env.RENDER_GIT_COMMIT;

const nextConfig: NextConfig = {
  ...(deploymentId ? { deploymentId } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
