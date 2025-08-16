import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-left",
  },
  allowedDevOrigins: [
    "ec2-3-108-36-196.ap-south-1.compute.amazonaws.com",
    "localhost:3888",
    "127.0.0.1:3888",
    "localhost:3000",
    "127.0.0.1:3000"
  ],
};

export default nextConfig;
