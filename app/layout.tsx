import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Leuchtwege – ein ruhiges Drehpuzzle',
  description:
    'Drehe die Wege und verbinde das ganze Netz. Zwölf kleine Rätsel, ohne Zeitdruck.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
