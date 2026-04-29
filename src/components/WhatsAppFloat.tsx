"use client";

import { useState } from "react";
import { Clock, MessageCircle } from "lucide-react";

function isBusinessHours() {
  const now = new Date();
  const canaryHour = now.getUTCHours() + 1;
  const day = now.getUTCDay();
  return day >= 1 && day <= 5 && canaryHour >= 9 && canaryHour < 18;
}

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(false);
  const withinHours = isBusinessHours();

  return (
    <div
      className="fixed bottom-6 right-6 z-50"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Off-hours tooltip */}
      {!withinHours && showTooltip && (
        <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Clock size={16} className="text-orange-400 shrink-0" />
          <span>Fuera de horario — Te responderemos mañana antes de las 10h</span>
          <div className="absolute -bottom-1.5 right-5 w-3 h-3 bg-gray-900 rotate-45" />
        </div>
      )}

      <a
        href="https://wa.me/34688560560"
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all duration-200 hover:scale-110 ${
          withinHours
            ? "bg-[#25D366] hover:bg-[#20BD5A]"
            : "bg-[#25D366]/70 hover:bg-[#25D366]"
        }`}
        title={withinHours ? "Contactar por WhatsApp" : "Fuera de horario laboral"}
      >
        <MessageCircle size={28} fill="white" color="white" />
      </a>

      {/* Pulse dot when off hours */}
      {!withinHours && (
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full" title="Fuera de horario" />
      )}
    </div>
  );
}
