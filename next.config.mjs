/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM in a few example modules — let Next handle them.
  transpilePackages: ['three'],
};

export default nextConfig;
