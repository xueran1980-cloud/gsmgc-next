import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

async function getProductSlug(id: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.gsmgc.es/wp-json/gsmgc/v1/product-by-id?id=${id}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      console.warn(`[getProductSlug] id=${id} status=${res.status}`);
      return null;
    }
    const json = await res.json();
    return json?.data?.slug || null;
  } catch (err) {
    console.warn(`[getProductSlug] id=${id} error=${(err as Error).message}`);
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
