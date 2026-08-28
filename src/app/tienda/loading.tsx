export default function TiendaLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ★ B (2026-08-28)：极淡占位 — 无 24 卡骨架 / 无分类骨架 / 无 Cargando 文字 / 无 spinner。
           SSR 渲染 /tienda 期间（<1s）的静默占位：仅 H1 形状淡条，内容就绪后无感替换。 */}
        <div className="h-8 w-64 bg-gray-100 rounded mb-5" />
      </div>
    </div>
  );
}
