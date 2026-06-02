/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    const burnSiteUrl = process.env.BURN_SITE_URL;
    if (!burnSiteUrl) return [];

    return [
      {
        source:      '/burn',
        destination: burnSiteUrl,
        permanent:   false,
      },
      {
        source:      '/burn/:path*',
        destination: `${burnSiteUrl}/:path*`,
        permanent:   false,
      },
    ];
  },
};

module.exports = nextConfig;
