import Link from "next/link";
import type { ProductCategory } from "@/lib/api";

const CATEGORY_META: Record<string, { color: string; letter: string; bg: string; border: string; text: string }> = {
  "Pantallas":     { color: "from-blue-500 to-blue-600",    letter: "P", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
  "Cables":        { color: "from-green-500 to-green-600",  letter: "C", bg: "bg-green-50", border: "border-green-100", text: "text-green-700" },
  "Baterias":      { color: "from-yellow-500 to-amber-500", letter: "B", bg: "bg-yellow-50", border: "border-yellow-100", text: "text-yellow-700" },
  "Iphone":        { color: "from-gray-700 to-gray-900",    letter: "", bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-700" },
  "Samsung":       { color: "from-blue-600 to-indigo-600",  letter: "", bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700" },
  "Xiaomi":        { color: "from-orange-500 to-orange-600",letter: "", bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700" },
  "Oppo":          { color: "from-teal-500 to-teal-600",    letter: "", bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-700" },
  "Huawei":        { color: "from-red-500 to-red-600",      letter: "", bg: "bg-red-50", border: "border-red-100", text: "text-red-700" },
  "Cargadores":    { color: "from-purple-500 to-purple-600",letter: "C", bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700" },
  "Audio":         { color: "from-pink-500 to-pink-600",    letter: "A", bg: "bg-pink-50", border: "border-pink-100", text: "text-pink-700" },
  "Ipad":          { color: "from-gray-600 to-gray-700",    letter: "", bg: "bg-gray-50", border: "border-gray-100", text: "text-gray-700" },
  "Herramientas":  { color: "from-stone-500 to-stone-600",  letter: "H", bg: "bg-stone-50", border: "border-stone-100", text: "text-stone-700" },
  "Fundas":        { color: "from-indigo-500 to-indigo-600",letter: "F", bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-700" },
  "Protectores":   { color: "from-cyan-500 to-cyan-600",    letter: "P", bg: "bg-cyan-50", border: "border-cyan-100", text: "text-cyan-700" },
  "Accesorios":    { color: "from-violet-500 to-violet-600",letter: "A", bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-700" },
};

const BRAND_LOGOS: Record<string, string> = {
  "Iphone": "Apple", "Samsung": "Samsung", "Xiaomi": "Xiaomi", "Oppo": "OPPO",
  "Huawei": "Huawei", "Ipad": "iPad", "Honor": "HONOR", "Sony": "SONY",
  "Vivo": "vivo", "Motorola": "Moto", "Nokia": "Nokia", "TCL": "TCL",
  "Lenovo": "Lenovo", "ZTE": "ZTE", "LG": "LG", "Alcatel": "Alcatel",
};

const DEFAULT_COLORS = [
  { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", color: "from-blue-500 to-blue-600" },
  { bg: "bg-green-50", border: "border-green-100", text: "text-green-700", color: "from-green-500 to-green-600" },
  { bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700", color: "from-orange-500 to-orange-600" },
  { bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700", color: "from-purple-500 to-purple-600" },
  { bg: "bg-pink-50", border: "border-pink-100", text: "text-pink-700", color: "from-pink-500 to-pink-600" },
  { bg: "bg-cyan-50", border: "border-cyan-100", text: "text-cyan-700", color: "from-cyan-500 to-cyan-600" },
  { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-700", color: "from-indigo-500 to-indigo-600" },
  { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-700", color: "from-teal-500 to-teal-600" },
];

interface CategoryWithCount extends ProductCategory {
  count?: number;
}

function CategoryCard({ cat, index }: { cat: CategoryWithCount; index: number }) {
  const meta = CATEGORY_META[cat.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  const brandLabel = BRAND_LOGOS[cat.name];

  return (
    <Link
      href={`/tienda?category=${cat.id}`}
      className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${meta.bg} ${meta.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
        {brandLabel ? (
          <span className="text-white text-[10px] font-black tracking-tight leading-none text-center px-0.5">
            {brandLabel}
          </span>
        ) : (
          <span className="text-white text-base font-black">
            {meta.letter || cat.name.charAt(0)}
          </span>
        )}
      </div>
      <span className={`text-xs font-bold text-center leading-tight ${meta.text}`}>{cat.name}</span>
      {cat.count !== undefined && (
        <span className={`text-[10px] font-semibold opacity-60 ${meta.text}`}>{cat.count} refs</span>
      )}
    </Link>
  );
}

export default function CategoriesSection({ categories }: { categories: CategoryWithCount[] }) {
  if (!categories || categories.length === 0) return null;

  const visible = categories
    .filter(c => !c.count || c.count > 0)
    .filter(c => c.name !== "Sin categorizar" && c.name !== "Otros")
    .slice(0, 16);

  return (
    <section className="py-14 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Categorías</h2>
            <p className="text-gray-500 text-sm mt-1">Encuentra lo que necesitas rápidamente</p>
          </div>
          <Link
            href="/tienda"
            className="text-sm font-bold text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 transition"
          >
            Ver todo
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {visible.map((cat, i) => (
            <CategoryCard key={cat.id} cat={cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
