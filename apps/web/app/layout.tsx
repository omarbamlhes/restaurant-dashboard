import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'لوحة المطاعم الذكية | Smart Restaurant Dashboard',
  description: 'منصة تحليلات ذكية لأصحاب المطاعم والمقاهي في السعودية',
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
        <Toaster
          position="top-left"
          toastOptions={{
            style: {
              direction: 'rtl',
              fontFamily: 'IBM Plex Sans Arabic, Saudi Riyal, sans-serif',
            },
          }}
        />
      </body>
    </html>
  );
}
