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

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [...new Set(configuredOrigins)]
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**"
      }
    ]
  }
};

export default nextConfig;
