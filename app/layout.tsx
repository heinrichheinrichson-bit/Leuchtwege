import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Leuchtwege',
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
