import type { NextConfig } from "next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = { turbopack: { root: process.cwd() } };

// Hosted routing is owned by vercel.json Services. eve 0.18 still emits
// experimentalServices when wrapped during a hosted build. Keep its local proxy.
export default process.env.VERCEL ? nextConfig : withEve(nextConfig);
