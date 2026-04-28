import type { MetadataRoute } from 'next';
import { fetchProducts, getCategoriesFromProducts, generateSlug } from '@/lib/api';

// Dynamic rendering: generate sitemap at request time (not build time)
// CF Bot Fight Mode blocks Vercel build IPs, so build-time fetch always fails.
// Runtime fetch works fine (Tienda 3.2MB proves it).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchProducts();
  const baseUrl = 'https://gsmgc.es';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/tienda`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  // Category pages (from products-raw)
  const categories = getCategoriesFromProducts(products);
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${baseUrl}/tienda?category=${cat.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Product pages (SSG)
  const productPages: MetadataRoute.Sitemap = products
    .filter(p => p.status === 'publish')
    .map(p => {
      const slug = generateSlug(p.name);
      return {
        url: slug
          ? `${baseUrl}/producto/${p.id}/${slug}`
          : `${baseUrl}/producto/${p.id}`,
        lastModified: p.date_created ? new Date(p.date_created) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      };
    });

  return [...staticPages, ...categoryPages, ...productPages];
}
