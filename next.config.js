/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Set BURN_SITE_URL in Vercel env vars e.g. https://your-burn-site.vercel.app
    const burnSiteUrl = process.env.BURN_SITE_URL;
    if (!burnSiteUrl) return [];

    return [
      {
        source: '/burn',
        destination: burnSiteUrl,
      },
      {
        source: '/burn/:path*',
        destination: `${burnSiteUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
