import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dealer/', '/api/'],
      },
    ],
    sitemap: 'https://www.garagecherries.com/sitemap.xml',
  };
}
