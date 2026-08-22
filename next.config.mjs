/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  ...(process.env.NEXT_OUTPUT_EXPORT === '1' ? { output: 'export' } : {}),
}

export default nextConfig
