import Link from "next/link";

const BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Huawei", "Oppo", "Vivo", "OnePlus",
  "Motorola", "TCL", "ZTE", "Alcatel", "Nokia", "Honor", "Lenovo",
  "Realme", "Google", "Sony", "LG", "Asus", "BlackBerry",
];

export default function BrandsSection() {
  return (
    <section className="py-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-black text-gray-900 mb-6">Marcas</h2>
        <div className="flex flex-wrap gap-3">
          {BRANDS.map(brand => (
            <Link
              key={brand}
              href={`/tienda?search=${encodeURIComponent(brand)}`}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb] hover:bg-blue-50 transition"
            >
              {brand}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
