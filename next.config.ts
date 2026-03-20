import type { NextConfig } from "next";
// Note: We are using a robust @ducanh2912/next-pwa fork suitable for App Router / Next 14+
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  // Silence the Next 16 error when a plugin adds webpack config
  turbopack: {},
};

export default withPWA(nextConfig);
