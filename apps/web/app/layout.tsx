import type { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import PWAManager from '@/components/shared/PWAManager';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_DESC =
  'من أرض الخير... لإدارة أذكى. منصة تحليلات ذكية لأصحاب المطاعم والمقاهي في السعودية';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'رستق | منصة إدارة المطاعم الذكية',
  description: SITE_DESC,
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
  openGraph: {
    title: 'رستق | منصة إدارة المطاعم الذكية',
    description: SITE_DESC,
    url: SITE_URL,
    siteName: 'رستق',
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'رستق | منصة إدارة المطاعم الذكية',
    description: SITE_DESC,
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
