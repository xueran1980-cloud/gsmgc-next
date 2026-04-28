'use client';

import { useState, useCallback } from 'react';
import { Share2, Check } from 'lucide-react';

export default function ShareButton({ productName, url }: { productName: string; url: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: productName, url });
      } catch {
        // User cancelled share dialog
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard API not available
      }
    }
  }, [productName, url]);

  return (
    <button
      onClick={handleShare}
      className="shrink-0 p-2.5 rounded-xl border border-gray-200 text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition mt-1"
      title="Compartir"
      aria-label="Compartir producto"
    >
      {copied ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
    </button>
  );
}
