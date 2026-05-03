import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: 'https://gsmgc.es/checkout' },
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
