'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Phone, Mail, MapPin, Clock, ShieldCheck, Truck,
  CheckCircle2, MessageCircle, Send, Headphones,
  ChevronRight,
} from 'lucide-react';

/* ───────── PageHeader ───────── */
function PageHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white py-16 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}
      />
      <div className="max-w-7xl mx-auto px-4 relative">
        {Icon && (
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Icon size={24} className="text-white" />
          </div>
        )}
        <h1 className="text-4xl font-black mb-2">{title}</h1>
        {subtitle && <p className="text-blue-100 text-lg">{subtitle}</p>}
      </div>
    </div>
  );
}

const contacts = [
  {
    icon: MessageCircle,
    label: 'WhatsApp (más rápido)',
    value: '688 560 560',
    sub: 'Respuesta en menos de 1 hora',
    href: 'https://wa.me/34688560560?text=Hola%2C%20soy%20distribuidor%20y%20me%20interesa%20vuestr%20cat%C3%A1logo',
    color: 'bg-green-50 border-green-200',
    btnClass: 'bg-green-600 hover:bg-green-700',
    btnLabel: 'Abrir WhatsApp',
  },
  {
    icon: Phone,
    label: 'Teléfono',
    value: '688 560 560',
    sub: 'Lunes a viernes, 10:00 – 14:00',
    href: 'tel:+34688560560',
    color: 'bg-blue-50 border-blue-200',
    btnClass: 'bg-[#2563eb] hover:bg-[#1d4ed8]',
    btnLabel: 'Llamar ahora',
  },
  {
    icon: Mail,
    label: 'Email',
    value: 'info@gsmgc.es',
    sub: 'Respuesta en 24h laborables',
    href: 'mailto:info@gsmgc.es',
    color: 'bg-gray-50 border-gray-200',
    btnClass: 'bg-gray-700 hover:bg-gray-800',
    btnLabel: 'Enviar email',
  },
];

const faqs = [
  { q: '¿Cómo me registro como distribuidor?', a: 'Rellena el formulario de registro en "Mi Cuenta". Tu solicitud será revisada y aprobada en 24h laborables.' },
  { q: '¿Cuál es el pedido mínimo?', a: 'No existe pedido mínimo en unidades, pero sí en importe. Consulta condiciones por WhatsApp.' },
  { q: '¿Hacéis envíos a todas las islas?', a: 'Sí, enviamos a Gran Canaria, Tenerife, Lanzarote, Fuerteventura, La Palma, La Gomera y El Hierro.' },
  { q: '¿Los precios incluyen IGIC?', a: 'Los precios en catálogo son sin IGIC. El IGIC (7%) se añade en la factura final.' },
];

export default function ContactoPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setStatus('sending');

    const subject = encodeURIComponent(form.subject || `Consulta de ${form.name}`);
    const body = encodeURIComponent(
      `Nombre: ${form.name}\nEmail: ${form.email}\nTeléfono: ${form.phone || '-'}\n\n${form.message}`
    );
    window.location.href = `mailto:info@gsmgc.es?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setStatus('sent');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 800);
  }

  return (
    <div>
      <PageHeader
        title="Contacto"
        subtitle="Estamos aquí para ayudarte. Elige cómo contactarnos."
        icon={Headphones}
      />

      <section className="max-w-7xl mx-auto px-4 py-16">
        {/* Contact cards */}
        <div className="grid sm:grid-cols-3 gap-5 mb-16">
          {contacts.map(({ icon: Icon, label, value, sub, href, color, btnClass, btnLabel }) => (
            <div key={label} className={`rounded-2xl border p-6 flex flex-col ${color}`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon size={20} className="text-gray-700" />
                <span className="font-bold text-gray-900 text-sm">{label}</span>
              </div>
              <div className="font-black text-gray-900 text-lg mb-1">{value}</div>
              <div className="text-gray-500 text-xs mb-4 flex-1">{sub}</div>
              <a
                href={href}
                target={href.startsWith('https') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={`text-white text-sm font-bold py-2 px-4 rounded-lg text-center transition ${btnClass}`}
              >
                {btnLabel}
              </a>
            </div>
          ))}
        </div>

        {/* Form + Map / Info */}
        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Escríbenos</h2>
            {status === 'sent' ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                <h3 className="font-black text-gray-900 text-xl mb-2">¡Mensaje enviado!</h3>
                <p className="text-gray-600 mb-4">Te responderemos en menos de 24 horas laborables.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="text-[#2563eb] font-semibold text-sm hover:underline"
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre *</label>
                    <input
                      name="name" value={form.name} onChange={handleChange} required
                      placeholder="Tu nombre o empresa"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teléfono</label>
                    <input
                      name="phone" value={form.phone} onChange={handleChange}
                      placeholder="+34 6XX XXX XXX"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                  <input
                    name="email" value={form.email} onChange={handleChange} required type="email"
                    placeholder="tu@empresa.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Asunto</label>
                  <select
                    name="subject" value={form.subject} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white"
                  >
                    <option value="">Selecciona un tema...</option>
                    <option value="Solicitud de cuenta mayorista">Solicitud de cuenta mayorista</option>
                    <option value="Consulta de producto o precio">Consulta de producto o precio</option>
                    <option value="Pedido o envío">Pedido o envío</option>
                    <option value="Devolución o garantía">Devolución o garantía</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mensaje *</label>
                  <textarea
                    name="message" value={form.message} onChange={handleChange} required rows={5}
                    placeholder="Cuéntanos qué necesitas..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-[#2563eb] text-white font-bold py-3 rounded-xl hover:bg-[#1d4ed8] transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {status === 'sending' ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
                  ) : (
                    <><Send size={16} /> Enviar mensaje</>
                  )}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  * Se abrirá tu cliente de email con el mensaje listo para enviar.
                </p>
              </form>
            )}
          </div>

          {/* Info + FAQ */}
          <div>
            {/* Address */}
            <h2 className="text-2xl font-black text-gray-900 mb-6">Dónde estamos</h2>
            <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-3">
              {[
                { icon: MapPin, text: 'Las Palmas de Gran Canaria, Canarias, España' },
                { icon: Clock, text: 'Lunes a Viernes: 10:00 – 14:00' },
                { icon: Phone, text: '688 560 560' },
                { icon: Mail, text: 'info@gsmgc.es' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <Icon size={16} className="text-[#2563eb] mt-0.5 shrink-0" />
                  <span className="text-sm text-gray-700">{text}</span>
                </div>
              ))}
            </div>

            {/* FAQ */}
            <h2 className="text-xl font-black text-gray-900 mb-4">Preguntas frecuentes</h2>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <details key={q} className="group bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <summary className="px-5 py-4 font-semibold text-sm text-gray-900 cursor-pointer flex items-center justify-between list-none hover:bg-gray-50 transition">
                    {q}
                    <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform shrink-0 ml-2" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                    {a}
                  </div>
                </details>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <a
              href="https://wa.me/34688560560?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20vuestra%20distribuci%C3%B3n%20mayorista"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-3 bg-green-600 text-white font-bold px-6 py-4 rounded-2xl hover:bg-green-700 transition"
            >
              <MessageCircle size={22} />
              <div>
                <div className="text-sm">¿Respuesta rápida?</div>
                <div className="text-lg font-black">Escríbenos por WhatsApp</div>
              </div>
              <ChevronRight size={18} className="ml-auto" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
