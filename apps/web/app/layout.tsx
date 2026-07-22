import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import PWAManager from '@/components/shared/PWAManager';

export const metadata: Metadata = {
  title: 'رستق | منصة إدارة المطاعم الذكية',
  description: 'من أرض الخير... لإدارة أذكى. منصة تحليلات ذكية لأصحاب المطاعم والمقاهي في السعودية',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'رستق',
  },
};

export const viewport: Viewport = {
  themeColor: '#1e5740',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <PWAManager />
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
