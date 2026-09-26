import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Tvispy',
  applicationName: 'Tvispy',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '32x32' },
      { url: '/tvispy-icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: '/apple-touch-icon.png',
  },
  description:
    'Drehe und verschiebe die Wege. Verbinde das ganze Netz, ohne Zeitdruck.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
