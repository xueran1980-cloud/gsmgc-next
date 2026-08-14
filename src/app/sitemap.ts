import type { MetadataRoute } from 'next';
import { fetchProducts, fetchCategoriesDirect, generateSlug } from '@/lib/api';

// ISR: revalidate every hour — sitemap doesn't need real-time updates
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    fetchProducts(),
    fetchCategoriesDirect(),  // 直调 categories-raw，不再内部调 fetchProducts()
  ]);

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
    // ★ A2: 法律与信息页（已存在并确认 200）
    { url: `${baseUrl}/politica-de-privacidad`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/condiciones-de-venta`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/envios-y-entregas`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/devoluciones`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/contacto`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/sobre-nosotros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Category pages (from fetchCategories)
  const categoryPages: MetadataRoute.Sitemap = categories.map(cat => ({
    url: `${baseUrl}/tienda?category=${cat.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Product pages
  const productPages: MetadataRoute.Sitemap = products
    .filter((p: any) => p.status === 'publish')
    .map((p: any) => {
      const slug = p.slug;
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
