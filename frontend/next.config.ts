import type { NextConfig } from "next";

// En producción servimos todo bajo un solo dominio: Next hace de proxy de /api/*
// hacia el contenedor del backend (red interna de Docker). En dev no se usa
// porque el front llama directo a NEXT_PUBLIC_API_BASE_URL.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://api:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` },
    ];
  },
};

export default nextConfig;
