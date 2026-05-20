import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Covers Radio',
  description: 'Tu emisora de covers en línea',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
