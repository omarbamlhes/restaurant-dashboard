import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'لوحة المطاعم الذكية | Smart Restaurant Dashboard',
  description: 'منصة تحليلات ذكية لأصحاب المطاعم والمقاهي في السعودية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="font-sans antialiased">
        {children}
        <Toaster
          position="top-left"
          toastOptions={{
            style: {
              direction: 'rtl',
              fontFamily: 'IBM Plex Sans Arabic, sans-serif',
            },
          }}
        />
      </body>
    </html>
  );
}
