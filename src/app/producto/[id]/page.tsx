import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

async function getProductSlug(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.gsmgc.es/wp-json/wc/store/v1/products/${id}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const product = await res.json();
    return product.slug || null;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductRedirectPage({ params }: Props) {
  const { id } = await params;
  const slug = await getProductSlug(id);
  if (!slug) notFound();
  redirect(`/producto/${id}/${slug}`);
}
