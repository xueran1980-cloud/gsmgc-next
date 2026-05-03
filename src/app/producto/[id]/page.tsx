import { fetchProductById } from "@/lib/api";
import { redirect } from "next/navigation";

export default async function ProductRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProductById(id);
  if (!product) redirect("/tienda");
  redirect(`/producto/${product.id}/${product.slug}`);
}
