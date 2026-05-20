import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Covers Radio',
  description: 'Tu emisora de covers en línea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
