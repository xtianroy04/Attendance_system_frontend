import type { Metadata } from 'next';
import { Fraunces, Source_Sans_3 } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import './globals.css';

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
});

const body = Source_Sans_3({
  variable: '--font-body',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Manticao Central Church | Seminarian Attendance',
  description: 'Seminarian attendance system for Manticao Central Church (SDA)',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
