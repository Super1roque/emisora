import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Covers — Tu música, a tu manera',
  description: 'Escucha covers de tus canciones favoritas, a tu propio ritmo.',
  icons: { icon: '/icon.svg' },
  openGraph: {
    title: 'Covers — Tu música, a tu manera',
    description: 'Escucha covers de tus canciones favoritas, a tu propio ritmo.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Covers — Tu música, a tu manera',
    description: 'Escucha covers de tus canciones favoritas, a tu propio ritmo.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
