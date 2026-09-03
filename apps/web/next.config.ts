import type { NextConfig } from "next";

// "standalone" emits a self-contained server bundle for the Docker image, but
// Netlify's Next.js runtime expects the default output. The web Dockerfile sets
// DOCKER_BUILD=1 so only that build opts in.
const isDockerBuild = process.env.DOCKER_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isDockerBuild ? { output: "standalone" as const } : {}),
};

export default nextConfig;
