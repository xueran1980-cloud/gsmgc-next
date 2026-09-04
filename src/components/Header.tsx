'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart, Search, Menu, X, User, Phone,
  ChevronDown, Smartphone, Battery, Cable, Headphones,
  Monitor, Wrench, Package, LayoutGrid,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import CartDrawer from '@/components/CartDrawer';

const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Catálogo', href: '/tienda',
    dropdown: [
      { label: 'Ver todo', href: '/tienda', icon: LayoutGrid, desc: 'Todo el catálogo' },
      { label: 'Pantallas', href: '/tienda?category=34', icon: Monitor, desc: 'LCD y OLED' },
      { label: 'Fundas', href: '/tienda?category=36', icon: Smartphone, desc: 'Silicona, TPU, piel' },
      { label: 'Baterías', href: '/tienda?category=23', icon: Battery, desc: 'Todas las marcas' },
      { label: 'Cables y cargadores', href: '/tienda?category=39', icon: Cable, desc: 'USB-C, Lightning...' },
      { label: 'Audio', href: '/tienda?category=24', icon: Headphones, desc: 'Auriculares y altavoces' },
      { label: 'Herramientas', href: '/tienda?category=29', icon: Wrench, desc: 'Reparación y herramientas' },
      { label: 'Novedades', href: '/tienda?orderby=date&order=desc', icon: Package, desc: 'Últimas llegadas' },
    ],
  },
  { label: 'Nosotros', href: '/sobre-nosotros' },
  { label: 'Contacto', href: '/contacto' },
];

/* Dropdown menu component */
function NavDropdown({ items, onClose }: { items: NonNullable<typeof NAV_LINKS[number]['dropdown']>; onClose: () => void }) {
  if (!items) return null;
  return (
    <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 py-2 animate-[fadeInDown_0.15s_ease]">
      {items.map(({ label, href, icon: Icon, desc }) => (
        <a
          key={href}
          href={href}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition group"
        >
          <div className="w-8 h-8 bg-blue-50 group-hover:bg-[#2563eb] rounded-lg flex items-center justify-center shrink-0 transition">
            <Icon size={15} className="text-[#2563eb] group-hover:text-white transition" />
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-[#2563eb] transition">{label}</div>
            <div className="text-xs text-gray-400">{desc}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function Header() {
  const { totalItems } = useCart();
  const { isLoggedIn, user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const pathname = usePathname();
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close all on route change
  useEffect(() => {
    setActiveDropdown(null);
    setMenuOpen(false);
    setSearchOpen(false);
    // ★ 搜索词保留（2026-09-04 老板需求）：跨路由切换时输入框同步 URL 的激活搜索
    setSearchVal(new URLSearchParams(window.location.search).get('search') || '');
  }, [pathname]);

  // ★ 搜索词保留（2026-09-04 老板需求）：输入框 = 激活搜索的镜像（URL 单一真相源）。
  //   同步触发：挂载（直达 URL/整页导航/刷新）· TiendaClient 本地导航（gsmgc:urlchange
  //   —— history.replaceState 不触发 React 渲染，必须显式通知）· 浏览器后退（popstate）。
  useEffect(() => {
    const sync = () => setSearchVal(new URLSearchParams(window.location.search).get('search') || '');
    sync();
    window.addEventListener('gsmgc:urlchange', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('gsmgc:urlchange', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchVal.trim()) {
      var target = '/tienda?search=' + encodeURIComponent(searchVal.trim());
      var before = window.location.href;
      window.dispatchEvent(new CustomEvent('gsmgc:search', { detail: { url: target } }));
      setTimeout(function() {
        if (window.location.href === before) {
          window.location.assign(target);
        }
      }, 80);
      setSearchOpen(false);
      // ★ 搜索词保留：不再清空输入框（搜索完成后保留本次搜索词，× 可清除）
    }
  }

  // ★ × 清空（2026-09-04 老板需求）：
  //   · 当前处于 /tienda 且有激活 search → 经 gsmgc:search IPC（TiendaClient 唯一
  //     URL 写入口，零 RSC）清除搜索过滤；保留其余参数（category/orderby），page
  //     随搜索失效归 1；80ms assign 兜底与 handleSearch 同构。
  //   · 否则（他页/仅键入未提交）→ 仅清空输入框文本。
  function handleClearSearch() {
    setSearchVal('');
    if (typeof window === 'undefined') return;
    const u = new URL(window.location.href);
    if (u.pathname !== '/tienda' || !u.searchParams.get('search')) return;
    u.searchParams.delete('search');
    u.searchParams.delete('page');
    const target = u.pathname + (u.searchParams.toString() ? '?' + u.searchParams.toString() : '');
    const before = window.location.href;
    window.dispatchEvent(new CustomEvent('gsmgc:search', { detail: { url: target } }));
    setTimeout(function () {
      if (window.location.href === before) {
        window.location.assign(target);
      }
    }, 80);
  }

  function handleMouseEnter(label: string) {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  }

  function handleMouseLeave() {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  }

  function handleDropdownMouseEnter() {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
  }

  return (
    <>
      {/* Top bar */}
      <div className="bg-[#1e3a8a] text-white text-sm">
        <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between">
          <span className="hidden sm:flex items-center gap-1.5">
            <Phone size={13} />
            <a href="tel:+34688560560" className="hover:text-blue-200 transition">688 560 560</a>
          </span>
          <span className="hidden md:block text-xs text-blue-200">
            🇮🇨 Envío en 24h a Canarias · Garantía 6 meses · Solo mayoristas
          </span>
          <span className="flex items-center gap-3">
            {isLoggedIn && user ? (
              <Link
                href="/mi-cuenta"
                className="hover:text-blue-200 transition flex items-center gap-1 text-xs font-semibold"
              >
                <User size={13} /> {(user.firstName as string) || (user as any).first_name || (user as any).displayName || 'Mi cuenta'}
              </Link>
            ) : (
              <>
                <Link
                  href="/mi-cuenta"
                  className="hover:text-blue-200 transition flex items-center gap-1 text-xs"
                >
                  <User size={13} /> Acceso
                </Link>
                <Link
                  href="/mi-cuenta?register=1"
                  className="bg-[#ea580c] hover:bg-orange-500 px-3 py-0.5 rounded text-white text-xs font-bold transition"
                >
                  Solicitar cuenta
                </Link>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Main header */}
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <img
              src="/logo.png"
              alt="GSMGC"
              className="h-10 w-auto"
              width={40}
              height={40}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 ml-4">
            {NAV_LINKS.map((link) => (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => link.dropdown ? handleMouseEnter(link.label) : null}
                onMouseLeave={link.dropdown ? handleMouseLeave : undefined}
              >
                {link.href.startsWith('/tienda') ? (
                <a
                  href={link.href}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    pathname === link.href
                      ? 'text-[#2563eb] bg-blue-50'
                      : 'text-gray-700 hover:text-[#2563eb] hover:bg-blue-50'
                  }`}
                >
                  {link.label}
                  {link.dropdown && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`}
                    />
                  )}
                </a>
                ) : (
                <Link
                  href={link.href}
                  className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition ${
                    pathname === link.href
                      ? 'text-[#2563eb] bg-blue-50'
                      : 'text-gray-700 hover:text-[#2563eb] hover:bg-blue-50'
                  }`}
                >
                  {link.label}
                  {link.dropdown && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${activeDropdown === link.label ? 'rotate-180' : ''}`}
                    />
                  )}
                </Link>
                )}

                {link.dropdown && activeDropdown === link.label && (
                  <div onMouseEnter={handleDropdownMouseEnter} onMouseLeave={handleMouseLeave}>
                    <NavDropdown items={link.dropdown} onClose={() => setActiveDropdown(null)} />
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Search box — desktop */}
          <div className="flex-1 hidden md:block max-w-xs xl:max-w-sm">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Buscar producto, marca, modelo..."
                className={`w-full border border-gray-200 rounded-xl pl-10 ${searchVal ? 'pr-9' : 'pr-4'} py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent bg-gray-50 focus:bg-white transition`}
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {searchVal && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-1 ml-auto lg:ml-0">
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition"
              aria-label="Buscar"
            >
              <Search size={20} />
            </button>

            {/* Account link */}
            <Link
              href="/mi-cuenta"
              className="hidden sm:flex p-2 text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition items-center"
              aria-label="Mi cuenta"
            >
              <User size={20} />
            </Link>

            {/* Cart — solo visible para usuarios autenticados */}
            {isLoggedIn && (
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition"
              aria-label="Carrito"
            >
              <ShoppingCart size={21} />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ea580c] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 rounded-lg transition"
              aria-label="Menú"
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-gray-50">
            <form onSubmit={handleSearch} className="relative mt-2">
              <input
                autoFocus
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Buscar..."
                className={`w-full border border-gray-200 rounded-xl pl-10 ${searchVal ? 'pr-9' : 'pr-4'} py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-gray-50`}
              />
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              {searchVal && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
                >
                  <X size={14} />
                </button>
              )}
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="lg:hidden border-t border-gray-100 bg-white pb-2">
            {NAV_LINKS.map((link) => (
              <div key={link.label}>
                {link.href.startsWith('/tienda') ? (
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#2563eb] hover:bg-blue-50 transition"
                >
                  {link.label}
                </a>
                ) : (
                <Link
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:text-[#2563eb] hover:bg-blue-50 transition"
                >
                  {link.label}
                </Link>
                )}
                {/* Mobile dropdown items */}
                {link.dropdown && (
                  <div className="bg-gray-50 border-t border-b border-gray-100">
                    {link.dropdown.slice(1).map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-7 py-2.5 text-xs text-gray-600 hover:text-[#2563eb] hover:bg-blue-50 transition"
                      >
                        <item.icon size={14} className="text-gray-400" />
                        {item.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="px-4 pt-3 border-t border-gray-100 mt-1">
              <Link
                href="/mi-cuenta"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#2563eb] mb-2"
              >
                <User size={16} /> {isLoggedIn && user ? ((user.firstName as string) || (user as any).first_name || 'Mi cuenta') : 'Mi cuenta'}
              </Link>
              {!isLoggedIn && (
                <Link
                  href="/mi-cuenta?register=1"
                  className="block bg-[#2563eb] text-white text-center font-bold py-2.5 rounded-xl text-sm hover:bg-[#1d4ed8] transition"
                >
                  Solicitar cuenta mayorista
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* CartDrawer — solo visible para usuarios autenticados */}
      {isLoggedIn && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}
    </>
  );
}
