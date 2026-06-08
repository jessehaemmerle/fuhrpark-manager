const configuredOrigins = [
  process.env.NEXT_PUBLIC_APP_URL,
  "localhost:3000",
  "127.0.0.1:3000",
  ...(process.env.NEXT_ALLOWED_ORIGINS ?? "").split(",")
]
  .filter(Boolean)
  .map((origin) => {
    const trimmed = origin.trim().replace(/\/$/, "");

    try {
      return new URL(trimmed).host;
    } catch {
      return trimmed.replace(/^https?:\/\//, "");
    }
  });

const imageRemoteHosts = (process.env.NEXT_IMAGE_REMOTE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: [...new Set(configuredOrigins)]
    }
  },
  images: {
    remotePatterns: imageRemoteHosts.map((hostname) => ({
      protocol: "https",
      hostname
    }))
  }
};

export default nextConfig;
